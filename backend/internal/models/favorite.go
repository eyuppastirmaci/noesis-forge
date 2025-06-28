package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type Favorite struct {
	ID         uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	UserID     uuid.UUID `json:"userID" gorm:"type:uuid;not null;index:idx_user_document,unique"`
	DocumentID uuid.UUID `json:"documentID" gorm:"type:uuid;not null;index:idx_user_document,unique"`
	CreatedAt  time.Time `json:"createdAt"`

	// Relations
	User     User     `json:"user,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Document Document `json:"document,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
}

func (f *Favorite) BeforeCreate(tx *gorm.DB) error {
	if f.ID == uuid.Nil {
		f.ID = uuid.New()
	}
	return nil
}

// Add unique constraint to prevent duplicate favorites
func (Favorite) TableName() string {
	return "favorites"
}
