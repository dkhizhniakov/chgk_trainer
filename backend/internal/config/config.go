package config

import (
	"fmt"
	"log/slog"

	"github.com/caarlos0/env/v11"
	"github.com/joho/godotenv"
)

type Config struct {
	AppEnv            string   `env:"APP_ENV" envDefault:"local"`
	HTTPAddr          string   `env:"HTTP_ADDR" envDefault:":8080"`
	AWSRegion         string   `env:"AWS_REGION" envDefault:"eu-central-1"`
	AWSProfile        string   `env:"AWS_PROFILE"`
	DDBTablePrefix    string   `env:"DDB_TABLE_PREFIX" envDefault:"chgk-dev"`
	MediaBucket       string   `env:"MEDIA_BUCKET"`
	CognitoUserPoolID string   `env:"COGNITO_USER_POOL_ID,required"`
	CognitoClientID   string   `env:"COGNITO_CLIENT_ID"`
	AuthDevBypass     bool     `env:"AUTH_DEV_BYPASS" envDefault:"false"`
	LogLevel          string   `env:"LOG_LEVEL" envDefault:"info"`
	CORSOrigins       []string `env:"CORS_ORIGINS" envSeparator:"," envDefault:"http://localhost:5173,http://127.0.0.1:5173"`
}

func Load() (*Config, error) {
	// Игнорируем ошибку, если локальных файлов нет (например, в ECS)
	_ = godotenv.Load(".env.local", ".env")

	cfg := &Config{}
	if err := env.Parse(cfg); err != nil {
		return nil, fmt.Errorf("parse config: %w", err)
	}

	if cfg.AuthDevBypass && cfg.AppEnv != "local" {
		return nil, fmt.Errorf("AUTH_DEV_BYPASS разрешён только при APP_ENV=local")
	}

	return cfg, nil
}

func (c *Config) SlogLevel() slog.Level {
	switch c.LogLevel {
	case "debug":
		return slog.LevelDebug
	case "warn":
		return slog.LevelWarn
	case "error":
		return slog.LevelError
	default:
		return slog.LevelInfo
	}
}

func (c *Config) UserDataTableName() string {
	return fmt.Sprintf("%s-userdata", c.DDBTablePrefix)
}

func (c *Config) ContentTableName() string {
	return fmt.Sprintf("%s-content", c.DDBTablePrefix)
}

func (c *Config) KnowledgeTableName() string {
	return fmt.Sprintf("%s-knowledge", c.DDBTablePrefix)
}

func (c *Config) CognitoIssuer() string {
	return fmt.Sprintf("https://cognito-idp.%s.amazonaws.com/%s", c.AWSRegion, c.CognitoUserPoolID)
}

func (c *Config) CognitoJWKSURL() string {
	return fmt.Sprintf("%s/.well-known/jwks.json", c.CognitoIssuer())
}
