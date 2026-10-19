package auth

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/lestrrat-go/httprc/v3"
	"github.com/lestrrat-go/jwx/v3/jwk"
	"github.com/lestrrat-go/jwx/v3/jwt"
)

type Principal struct {
	Sub   string   `json:"sub"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
}

type contextKey string

const principalKey contextKey = "auth_principal"

func ContextWithPrincipal(ctx context.Context, p *Principal) context.Context {
	return context.WithValue(ctx, principalKey, p)
}

func PrincipalFromContext(ctx context.Context) (*Principal, bool) {
	p, ok := ctx.Value(principalKey).(*Principal)
	return p, ok && p != nil
}

type TokenValidator struct {
	issuer    string
	clientID  string
	keySet    jwk.Set
	devBypass bool
}

func NewTokenValidator(ctx context.Context, issuer, clientID, jwksURL string, devBypass bool) (*TokenValidator, error) {
	c, err := jwk.NewCache(ctx, httprc.NewClient())
	if err != nil {
		return nil, fmt.Errorf("create jwk cache: %w", err)
	}

	if err := c.Register(ctx, jwksURL); err != nil {
		return nil, fmt.Errorf("register jwks cache: %w", err)
	}

	// Делаем первый предзапрос к JWKS
	if _, err := c.Refresh(ctx, jwksURL); err != nil {
		// При локальном старте без сети не валимся
		_ = err
	}

	cachedSet, err := c.CachedSet(jwksURL)
	if err != nil {
		return nil, fmt.Errorf("get cached jwks set: %w", err)
	}

	return &TokenValidator{
		issuer:    issuer,
		clientID:  clientID,
		keySet:    cachedSet,
		devBypass: devBypass,
	}, nil
}

func (v *TokenValidator) ValidateTokenString(_ context.Context, tokenString string) (*Principal, error) {
	token, err := jwt.Parse(
		[]byte(tokenString),
		jwt.WithKeySet(v.keySet),
		jwt.WithValidate(true),
		jwt.WithIssuer(v.issuer),
	)
	if err != nil {
		return nil, fmt.Errorf("verify jwt: %w", err)
	}

	sub, ok := token.Subject()
	if !ok || sub == "" {
		return nil, fmt.Errorf("missing sub in token")
	}

	// Email может быть в custom claims или стандарте (в ID token)
	var email string
	if err := token.Get("email", &email); err != nil || email == "" {
		_ = token.Get("username", &email)
	}

	// Роли (Cognito Groups)
	var roles []string
	_ = token.Get("cognito:groups", &roles)
	if roles == nil {
		roles = []string{}
	}

	return &Principal{
		Sub:   sub,
		Email: email,
		Roles: roles,
	}, nil
}

func (v *TokenValidator) Middleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Dev bypass для локальных тестов (если включен в config)
			if v.devBypass {
				if devUser := r.Header.Get("X-Dev-User"); devUser != "" {
					p := &Principal{
						Sub:   "dev-user-" + devUser,
						Email: devUser + "@local.dev",
						Roles: []string{"admin", "editor"},
					}
					next.ServeHTTP(w, r.WithContext(ContextWithPrincipal(r.Context(), p)))
					return
				}
			}

			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				next.ServeHTTP(w, r)
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				next.ServeHTTP(w, r)
				return
			}

			principal, err := v.ValidateTokenString(r.Context(), parts[1])
			if err != nil {
				// Не прерываем сразу здесь, чтобы публичные эндпоинты могли работать,
				// но если маршрут требует авторизацию, RequireAuth вернет 401.
				next.ServeHTTP(w, r)
				return
			}

			next.ServeHTTP(w, r.WithContext(ContextWithPrincipal(r.Context(), principal)))
		})
	}
}

func RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, ok := PrincipalFromContext(r.Context())
		if !ok || p == nil {
			writeProblem(w, http.StatusUnauthorized, "https://chgk-trainer/errors/unauthorized", "Unauthorized", "Authentication required")
			return
		}
		next(w, r)
	}
}

func RequireRole(role string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		p, ok := PrincipalFromContext(r.Context())
		if !ok || p == nil {
			writeProblem(w, http.StatusUnauthorized, "https://chgk-trainer/errors/unauthorized", "Unauthorized", "Authentication required")
			return
		}

		hasRole := false
		for _, r := range p.Roles {
			if r == role || r == "admin" {
				hasRole = true
				break
			}
		}

		if !hasRole {
			writeProblem(w, http.StatusForbidden, "https://chgk-trainer/errors/forbidden", "Forbidden", fmt.Sprintf("Role '%s' required", role))
			return
		}

		next(w, r)
	}
}

func writeProblem(w http.ResponseWriter, status int, probType, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"type":"%s","title":"%s","status":%d,"detail":"%s"}`, probType, title, status, detail)
}
