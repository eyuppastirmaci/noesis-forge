package services

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/eyuppastirmaci/noesis-forge/internal/models"
	"github.com/eyuppastirmaci/noesis-forge/internal/websocket"
)

type ProcessingTaskService struct {
	db              *gorm.DB
	websocketServer *websocket.Server
}

func NewProcessingTaskService(db *gorm.DB, websocketServer *websocket.Server) *ProcessingTaskService {
	return &ProcessingTaskService{
		db:              db,
		websocketServer: websocketServer,
	}
}

// CreateProcessingTasks creates all required processing tasks for a document
func (s *ProcessingTaskService) CreateProcessingTasks(documentID uuid.UUID) error {
	tasks := []models.ProcessingTask{
		{
			DocumentID: documentID,
			TaskType:   models.ProcessingTaskTypeTextEmbedding,
			Status:     models.ProcessingTaskStatusPending,
		},
		{
			DocumentID: documentID,
			TaskType:   models.ProcessingTaskTypeImageEmbedding,
			Status:     models.ProcessingTaskStatusPending,
		},
		{
			DocumentID: documentID,
			TaskType:   models.ProcessingTaskTypeSummarization,
			Status:     models.ProcessingTaskStatusPending,
		},
	}

	return s.db.Create(&tasks).Error
}

// UpdateTaskStatus updates the status of a specific processing task
func (s *ProcessingTaskService) UpdateTaskStatus(documentID uuid.UUID, taskType models.ProcessingTaskType, status models.ProcessingTaskStatus, errorMessage string) error {
	updates := map[string]interface{}{
		"status":     status,
		"updated_at": time.Now(),
	}

	switch status {
	case models.ProcessingTaskStatusProcessing:
		updates["started_at"] = time.Now()
		updates["progress"] = 0
	case models.ProcessingTaskStatusCompleted:
		updates["completed_at"] = time.Now()
		updates["progress"] = 100
		updates["error_message"] = "" // Clear any previous errors
	case models.ProcessingTaskStatusFailed:
		updates["completed_at"] = time.Now()
		updates["error_message"] = errorMessage
	}

	err := s.db.Model(&models.ProcessingTask{}).
		Where("document_id = ? AND task_type = ?", documentID, taskType).
		Updates(updates).Error

	if err != nil {
		return err
	}

	// Broadcast WebSocket update
	s.broadcastProcessingUpdate(documentID, taskType, status, updates)

	return nil
}

// GetDocumentProcessingTasks gets all processing tasks for a document
func (s *ProcessingTaskService) GetDocumentProcessingTasks(documentID uuid.UUID) ([]models.ProcessingTask, error) {
	var tasks []models.ProcessingTask
	err := s.db.Where("document_id = ?", documentID).
		Order("created_at ASC").
		Find(&tasks).Error
	return tasks, err
}

// GetUserProcessingTasks gets all active processing tasks for a user's documents
func (s *ProcessingTaskService) GetUserProcessingTasks(userID uuid.UUID) ([]models.ProcessingTask, error) {
	var tasks []models.ProcessingTask
	err := s.db.Preload("Document").
		Joins("INNER JOIN documents ON documents.id = processing_tasks.document_id").
		Where("documents.user_id = ? AND processing_tasks.status IN ?",
			userID,
			[]models.ProcessingTaskStatus{
				models.ProcessingTaskStatusPending,
				models.ProcessingTaskStatusProcessing,
			}).
		Order("processing_tasks.created_at ASC").
		Find(&tasks).Error
	return tasks, err
}

// GetUserProcessingHistory gets all processing tasks (including completed) for a user's documents with pagination
func (s *ProcessingTaskService) GetUserProcessingHistory(userID uuid.UUID, limit int, offset int) ([]models.ProcessingTask, int64, error) {
	var tasks []models.ProcessingTask
	var totalCount int64

	// Get total count of UNIQUE DOCUMENTS (not tasks) for this user
	countErr := s.db.Raw(`
		SELECT COUNT(DISTINCT processing_tasks.document_id) 
		FROM processing_tasks 
		INNER JOIN documents ON documents.id = processing_tasks.document_id 
		WHERE documents.user_id = ?
	`, userID).Scan(&totalCount).Error

	if countErr != nil {
		return nil, 0, countErr
	}

	// Get paginated tasks with all statuses, ordered by most recent first
	err := s.db.Preload("Document").
		Joins("INNER JOIN documents ON documents.id = processing_tasks.document_id").
		Where("documents.user_id = ?", userID).
		Order("processing_tasks.created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&tasks).Error

	return tasks, totalCount, err
}

// GetProcessingProgress calculates overall processing progress for a document
func (s *ProcessingTaskService) GetProcessingProgress(documentID uuid.UUID) (map[string]interface{}, error) {
	var tasks []models.ProcessingTask
	err := s.db.Where("document_id = ?", documentID).Find(&tasks).Error
	if err != nil {
		return nil, err
	}

	if len(tasks) == 0 {
		return map[string]interface{}{
			"total_tasks":     0,
			"completed_tasks": 0,
			"progress":        0,
			"is_completed":    false,
		}, nil
	}

	completedTasks := 0
	totalProgress := 0
	allCompleted := true

	taskDetails := make(map[string]interface{})

	for _, task := range tasks {
		totalProgress += task.Progress

		taskDetails[string(task.TaskType)] = map[string]interface{}{
			"status":    task.Status,
			"progress":  task.Progress,
			"error":     task.ErrorMessage,
			"started":   task.StartedAt,
			"completed": task.CompletedAt,
		}

		if task.Status == models.ProcessingTaskStatusCompleted {
			completedTasks++
		} else {
			allCompleted = false
		}
	}

	return map[string]interface{}{
		"total_tasks":     len(tasks),
		"completed_tasks": completedTasks,
		"progress":        totalProgress / len(tasks), // Average progress
		"is_completed":    allCompleted,
		"task_details":    taskDetails,
	}, nil
}

// SetTaskProgress updates the progress of a processing task
func (s *ProcessingTaskService) SetTaskProgress(documentID uuid.UUID, taskType models.ProcessingTaskType, progress int, workerID string) error {
	if progress < 0 {
		progress = 0
	}
	if progress > 100 {
		progress = 100
	}

	updates := map[string]interface{}{
		"progress":   progress,
		"worker_id":  workerID,
		"updated_at": time.Now(),
	}

	// If this is the first progress update, mark as processing
	if progress > 0 {
		updates["status"] = models.ProcessingTaskStatusProcessing
		updates["started_at"] = time.Now()
	}

	err := s.db.Model(&models.ProcessingTask{}).
		Where("document_id = ? AND task_type = ?", documentID, taskType).
		Updates(updates).Error

	if err != nil {
		return err
	}

	// Broadcast WebSocket update with progress
	s.broadcastProcessingUpdate(documentID, taskType, models.ProcessingTaskStatusProcessing, updates)

	return nil
}

// CleanupCompletedTasks removes old completed/failed tasks (optional cleanup)
func (s *ProcessingTaskService) CleanupCompletedTasks(olderThan time.Duration) error {
	cutoff := time.Now().Add(-olderThan)

	return s.db.Where("status IN ? AND completed_at < ?",
		[]models.ProcessingTaskStatus{
			models.ProcessingTaskStatusCompleted,
			models.ProcessingTaskStatusFailed,
		},
		cutoff).Delete(&models.ProcessingTask{}).Error
}

// broadcastProcessingUpdate sends processing task updates via WebSocket
func (s *ProcessingTaskService) broadcastProcessingUpdate(documentID uuid.UUID, taskType models.ProcessingTaskType, status models.ProcessingTaskStatus, updates map[string]interface{}) {
	if s.websocketServer == nil {
		return // WebSocket server not available
	}

	// Create update payload
	updateData := map[string]interface{}{
		"document_id": documentID.String(),
		"task_type":   string(taskType),
		"status":      string(status),
		"timestamp":   time.Now(),
	}

	// Add relevant update fields
	if progress, ok := updates["progress"]; ok {
		updateData["progress"] = progress
	}
	if errorMessage, ok := updates["error_message"]; ok && errorMessage != "" {
		updateData["error"] = errorMessage
	}
	if startedAt, ok := updates["started_at"]; ok {
		updateData["started_at"] = startedAt
	}
	if completedAt, ok := updates["completed_at"]; ok {
		updateData["completed_at"] = completedAt
	}

	// Broadcast to all clients subscribed to processing updates
	s.websocketServer.BroadcastProcessingUpdate(updateData)
}
