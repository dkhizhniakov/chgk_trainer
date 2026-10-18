package dynamo

import (
	"context"
	"fmt"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

type UserSettings struct {
	DefaultTimerSec        int  `dynamodbav:"defaultTimerSec" json:"defaultTimerSec"`
	AutoAddMissedToReview  bool `dynamodbav:"autoAddMissedToReview" json:"autoAddMissedToReview"`
}

type UserProfile struct {
	PK        string       `dynamodbav:"PK" json:"-"`
	SK        string       `dynamodbav:"SK" json:"-"`
	Type      string       `dynamodbav:"type" json:"-"`
	Sub       string       `dynamodbav:"sub" json:"sub"`
	Email     string       `dynamodbav:"email" json:"email"`
	Roles     []string     `dynamodbav:"roles" json:"roles"`
	Settings  UserSettings `dynamodbav:"settings" json:"settings"`
	CreatedAt string       `dynamodbav:"createdAt" json:"createdAt"`
	UpdatedAt string       `dynamodbav:"updatedAt" json:"updatedAt"`
	Version   int          `dynamodbav:"version" json:"version"`
}

func (s *Store) GetOrCreateProfile(ctx context.Context, sub, email string, roles []string) (*UserProfile, error) {
	pk := fmt.Sprintf("USER#%s", sub)
	sk := "PROFILE"

	// 1. Попытка получить существующий профиль
	out, err := s.Client.GetItem(ctx, &dynamodb.GetItemInput{
		TableName: aws.String(s.UserData),
		Key: map[string]types.AttributeValue{
			"PK": &types.AttributeValueMemberS{Value: pk},
			"SK": &types.AttributeValueMemberS{Value: sk},
		},
	})
	if err != nil {
		return nil, fmt.Errorf("get profile: %w", err)
	}

	if len(out.Item) > 0 {
		var profile UserProfile
		if err := attributevalue.UnmarshalMap(out.Item, &profile); err != nil {
			return nil, fmt.Errorf("unmarshal profile: %w", err)
		}
		// Обновляем email или роли, если они изменились в Cognito
		return &profile, nil
	}

	// 2. Если нет, создаём новый профиль
	now := time.Now().UTC().Format(time.RFC3339)
	newProfile := UserProfile{
		PK:        pk,
		SK:        sk,
		Type:      "Profile",
		Sub:       sub,
		Email:     email,
		Roles:     roles,
		Settings:  UserSettings{DefaultTimerSec: 60, AutoAddMissedToReview: true},
		CreatedAt: now,
		UpdatedAt: now,
		Version:   1,
	}

	item, err := attributevalue.MarshalMap(newProfile)
	if err != nil {
		return nil, fmt.Errorf("marshal new profile: %w", err)
	}

	_, err = s.Client.PutItem(ctx, &dynamodb.PutItemInput{
		TableName:           aws.String(s.UserData),
		Item:                item,
		ConditionExpression: aws.String("attribute_not_exists(PK)"),
	})
	if err != nil {
		// Если произошла гонка и профиль успел создаться, повторно читаем
		var condErr *types.ConditionalCheckFailedException
		if isConditionalCheckFailed(err, &condErr) {
			return s.GetOrCreateProfile(ctx, sub, email, roles)
		}
		return nil, fmt.Errorf("put profile: %w", err)
	}

	return &newProfile, nil
}

func isConditionalCheckFailed(err error, target **types.ConditionalCheckFailedException) bool {
	// Простая проверка типа ошибки
	return err != nil && fmt.Sprintf("%T", err) == "*types.ConditionalCheckFailedException"
}
