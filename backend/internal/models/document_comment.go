package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// CommentType defines the type of comment
type CommentType string

const (
	CommentTypeGeneral    CommentType = "general"    // General comment on document
	CommentTypeAnnotation CommentType = "annotation" // Annotation at specific position
	CommentTypeReply      CommentType = "reply"      // Reply to another comment
)

// DocumentComment represents a comment or annotation on a document
type DocumentComment struct {
	ID          uuid.UUID   `json:"id" gorm:"type:uuid;primary_key"`
	DocumentID  uuid.UUID   `json:"documentID" gorm:"type:uuid;not null;index"`
	UserID      uuid.UUID   `json:"userID" gorm:"type:uuid;not null"`
	Content     string      `json:"content" gorm:"type:text;not null"`
	CommentType CommentType `json:"commentType" gorm:"default:'general'"`

	// For replies to other comments
	ParentCommentID *uuid.UUID       `json:"parentCommentID,omitempty" gorm:"type:uuid;index"`
	ParentComment   *DocumentComment `json:"parentComment,omitempty" gorm:"foreignKey:ParentCommentID"`

	// For annotations - position information
	Position *CommentPosition `json:"position,omitempty" gorm:"embedded;embeddedPrefix:pos_"`

	// Status management
	IsResolved bool       `json:"isResolved" gorm:"default:false"`
	ResolvedBy *uuid.UUID `json:"resolvedBy,omitempty" gorm:"type:uuid"`
	ResolvedAt *time.Time `json:"resolvedAt,omitempty"`

	// Metadata
	IsEdited bool       `json:"isEdited" gorm:"default:false"`
	EditedAt *time.Time `json:"editedAt,omitempty"`

	// Relations
	Document Document          `json:"document,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	User     User              `json:"user,omitempty" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`
	Replies  []DocumentComment `json:"replies,omitempty" gorm:"foreignKey:ParentCommentID"`

	// Timestamps
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

// CommentPosition represents the position of an annotation within a document
type CommentPosition struct {
	// For PDF documents
	Page   *int     `json:"page,omitempty"`   // Page number (1-based)
	X      *float64 `json:"x,omitempty"`      // X coordinate (percentage)
	Y      *float64 `json:"y,omitempty"`      // Y coordinate (percentage)
	Width  *float64 `json:"width,omitempty"`  // Width of annotation area
	Height *float64 `json:"height,omitempty"` // Height of annotation area

	// For text-based documents
	TextStart *int `json:"textStart,omitempty"` // Start character position
	TextEnd   *int `json:"textEnd,omitempty"`   // End character position

	// For general positioning
	QuotedText *string `json:"quotedText,omitempty"` // Text that was selected/quoted
}

func (dc *DocumentComment) BeforeCreate(tx *gorm.DB) error {
	if dc.ID == uuid.Nil {
		dc.ID = uuid.New()
	}
	return nil
}

// IsReply returns true if this comment is a reply to another comment
func (dc *DocumentComment) IsReply() bool {
	return dc.ParentCommentID != nil
}

// IsAnnotation returns true if this comment is an annotation with position
func (dc *DocumentComment) IsAnnotation() bool {
	return dc.CommentType == CommentTypeAnnotation && dc.Position != nil
}

// CanEdit returns true if the given user can edit this comment
func (dc *DocumentComment) CanEdit(userID uuid.UUID) bool {
	return dc.UserID == userID
}

// CanDelete returns true if the given user can delete this comment
func (dc *DocumentComment) CanDelete(userID uuid.UUID) bool {
	return dc.UserID == userID
}

// CanResolve returns true if the given user can resolve this comment
func (dc *DocumentComment) CanResolve(userID uuid.UUID, documentOwnerID uuid.UUID) bool {
	// Comment author or document owner can resolve
	return dc.UserID == userID || documentOwnerID == userID
}

// MarkAsEdited marks the comment as edited
func (dc *DocumentComment) MarkAsEdited() {
	dc.IsEdited = true
	now := time.Now()
	dc.EditedAt = &now
}

// Resolve marks the comment as resolved
func (dc *DocumentComment) Resolve(resolvedBy uuid.UUID) {
	dc.IsResolved = true
	dc.ResolvedBy = &resolvedBy
	now := time.Now()
	dc.ResolvedAt = &now
}

// Unresolve marks the comment as unresolved
func (dc *DocumentComment) Unresolve() {
	dc.IsResolved = false
	dc.ResolvedBy = nil
	dc.ResolvedAt = nil
}
