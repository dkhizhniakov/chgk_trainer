package main

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"chgk_trainer/backend/internal/auth"
	"chgk_trainer/backend/internal/config"
	"chgk_trainer/backend/internal/store/dynamo"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "FATAL: failed to load config: %v\n", err)
		os.Exit(1)
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
		Level: cfg.SlogLevel(),
	}))
	slog.SetDefault(logger)

	slog.Info("starting chgk-api",
		"env", cfg.AppEnv,
		"addr", cfg.HTTPAddr,
		"region", cfg.AWSRegion,
		"profile", cfg.AWSProfile,
		"tablePrefix", cfg.DDBTablePrefix,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Инициализация хранилища DynamoDB
	store, err := dynamo.NewStore(ctx, cfg)
	if err != nil {
		slog.Error("failed to initialize dynamo store", "error", err)
		os.Exit(1)
	}

	// 2. Инициализация валидатора Cognito токенов
	tokenValidator, err := auth.NewTokenValidator(
		ctx,
		cfg.CognitoIssuer(),
		cfg.CognitoClientID,
		cfg.CognitoJWKSURL(),
		cfg.AuthDevBypass,
	)
	if err != nil {
		slog.Error("failed to initialize token validator", "error", err)
		os.Exit(1)
	}

	// 3. Роутер
	r := chi.NewRouter()

	r.Use(middleware.RequestID)
	r.Use(middleware.RealIP)
	r.Use(middleware.Recoverer)
	r.Use(slogLogger(logger))

	// CORS
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.CORSOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-CSRF-Token", "X-Request-Id", "X-Dev-User"},
		ExposedHeaders:   []string{"Link", "X-Request-Id"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	r.Use(tokenValidator.Middleware())

	// Публичный health check
	r.Get("/api/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":    "ok",
			"timestamp": time.Now().UTC().Format(time.RFC3339),
			"env":       cfg.AppEnv,
		})
	})

	// v1 API
	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/me", auth.RequireAuth(func(w http.ResponseWriter, r *http.Request) {
			principal, _ := auth.PrincipalFromContext(r.Context())

			profile, err := store.GetOrCreateProfile(r.Context(), principal.Sub, principal.Email, principal.Roles)
			if err != nil {
				slog.Error("failed to get or create profile", "sub", principal.Sub, "error", err)
				writeProblem(w, http.StatusInternalServerError, "https://chgk-trainer/errors/internal", "Internal Error", "Failed to retrieve user profile")
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(profile)
		}))
	})

	server := &http.Server{
		Addr:         cfg.HTTPAddr,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Graceful shutdown
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, os.Interrupt, syscall.SIGTERM)

	go func() {
		slog.Info("HTTP server listening", "addr", cfg.HTTPAddr)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			slog.Error("HTTP server error", "error", err)
			os.Exit(1)
		}
	}()

	<-sigChan
	slog.Info("shutting down HTTP server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		slog.Error("server forced to shutdown", "error", err)
	}
	slog.Info("server stopped gracefully")
}

func slogLogger(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			ww := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			defer func() {
				logger.Info("http request",
					"method", r.Method,
					"path", r.URL.Path,
					"status", ww.Status(),
					"duration_ms", time.Since(start).Milliseconds(),
					"req_id", middleware.GetReqID(r.Context()),
				)
			}()

			next.ServeHTTP(ww, r)
		})
	}
}

func writeProblem(w http.ResponseWriter, status int, probType, title, detail string) {
	w.Header().Set("Content-Type", "application/problem+json")
	w.WriteHeader(status)
	fmt.Fprintf(w, `{"type":"%s","title":"%s","status":%d,"detail":"%s"}`, probType, title, status, detail)
}
