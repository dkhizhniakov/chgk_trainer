package dynamo

import (
	"context"
	"fmt"

	"chgk_trainer/backend/internal/config"

	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
)

type Store struct {
	Client   *dynamodb.Client
	UserData string
	Content  string
	Knowledge string
}

func NewStore(ctx context.Context, cfg *config.Config) (*Store, error) {
	opts := []func(*awsconfig.LoadOptions) error{
		awsconfig.WithRegion(cfg.AWSRegion),
	}

	if cfg.AWSProfile != "" {
		opts = append(opts, awsconfig.WithSharedConfigProfile(cfg.AWSProfile))
	}

	awsCfg, err := awsconfig.LoadDefaultConfig(ctx, opts...)
	if err != nil {
		return nil, fmt.Errorf("load aws config: %w", err)
	}

	client := dynamodb.NewFromConfig(awsCfg)

	return &Store{
		Client:    client,
		UserData:  cfg.UserDataTableName(),
		Content:   cfg.ContentTableName(),
		Knowledge: cfg.KnowledgeTableName(),
	}, nil
}
