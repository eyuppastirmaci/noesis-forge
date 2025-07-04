package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// DocumentRevision keeps a lightweight audit record for every time a document is updated.
type DocumentRevision struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID    uuid.UUID `json:"documentID" gorm:"type:uuid;not null;index"`
	Version       int       `json:"version" gorm:"not null"`
	ChangedBy     uuid.UUID `json:"changedBy" gorm:"type:uuid;not null"`
	ChangeSummary string    `json:"changeSummary" gorm:"type:text"`
	CreatedAt     time.Time `json:"createdAt"`
}

func (dr *DocumentRevision) BeforeCreate(tx *gorm.DB) error {
	if dr.ID == uuid.Nil {
		dr.ID = uuid.New()
	}
	return nil
}
