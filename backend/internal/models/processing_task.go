package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ProcessingTaskType defines the type of processing task
type ProcessingTaskType string

// ProcessingTaskStatus defines the status of processing task
type ProcessingTaskStatus string

const (
	// Task types
	ProcessingTaskTypeTextEmbedding  ProcessingTaskType = "text-embedding"
	ProcessingTaskTypeImageEmbedding ProcessingTaskType = "image-embedding"
	ProcessingTaskTypeSummarization  ProcessingTaskType = "summarization"
)

const (
	// Task statuses
	ProcessingTaskStatusPending    ProcessingTaskStatus = "pending"
	ProcessingTaskStatusProcessing ProcessingTaskStatus = "processing"
	ProcessingTaskStatusCompleted  ProcessingTaskStatus = "completed"
	ProcessingTaskStatusFailed     ProcessingTaskStatus = "failed"
)

// ProcessingTask represents a specific processing task for a document
type ProcessingTask struct {
	ID         uuid.UUID            `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID uuid.UUID            `json:"documentID" gorm:"type:uuid;not null;index"`
	TaskType   ProcessingTaskType   `json:"taskType" gorm:"not null;index"`
	Status     ProcessingTaskStatus `json:"status" gorm:"default:'pending';index"`

	// Processing details
	StartedAt    *time.Time `json:"startedAt,omitempty"`
	CompletedAt  *time.Time `json:"completedAt,omitempty"`
	ErrorMessage string     `json:"errorMessage,omitempty" gorm:"type:text"`

	// Processing metadata
	Progress int    `json:"progress" gorm:"default:0"` // 0-100 percentage
	WorkerID string `json:"workerID,omitempty"`        // Which worker is processing

	// Relations
	Document Document `json:"document,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// Timestamps
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func (pt *ProcessingTask) BeforeCreate(tx *gorm.DB) error {
	if pt.ID == uuid.Nil {
		pt.ID = uuid.New()
	}
	return nil
}

// IsCompleted checks if the task is completed
func (pt *ProcessingTask) IsCompleted() bool {
	return pt.Status == ProcessingTaskStatusCompleted || pt.Status == ProcessingTaskStatusFailed
}

// IsInProgress checks if the task is currently being processed
func (pt *ProcessingTask) IsInProgress() bool {
	return pt.Status == ProcessingTaskStatusProcessing
}

// IsPending checks if the task is waiting to be processed
func (pt *ProcessingTask) IsPending() bool {
	return pt.Status == ProcessingTaskStatusPending
}
