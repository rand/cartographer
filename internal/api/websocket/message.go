package websocket

import (
	"encoding/json"
	"time"
)

// MessageType represents the type of WebSocket message
type MessageType string

const (
	// Task events
	MessageTypeTaskCreated MessageType = "task.created"
	MessageTypeTaskUpdated MessageType = "task.updated"
	MessageTypeTaskDeleted MessageType = "task.deleted"

	// Project events
	MessageTypeProjectCreated MessageType = "project.created"
	MessageTypeProjectUpdated MessageType = "project.updated"

	// Board events
	MessageTypeBoardUpdated MessageType = "board.updated"

	// Connection events
	MessageTypePing MessageType = "ping"
	MessageTypePong MessageType = "pong"
	MessageTypeError MessageType = "error"
)

// Message represents a WebSocket message envelope
type Message struct {
	Type      MessageType     `json:"type"`
	Timestamp time.Time       `json:"timestamp"`
	Data      json.RawMessage `json:"data,omitempty"`
	Error     string          `json:"error,omitempty"`
}

// TaskEvent represents task-related events
type TaskEvent struct {
	TaskID    string                 `json:"task_id"`
	BoardID   string                 `json:"board_id"`
	Action    string                 `json:"action"` // created, updated, deleted, moved
	Changes   map[string]interface{} `json:"changes,omitempty"`
	Task      interface{}            `json:"task,omitempty"` // Full task object for created/updated
}

// ProjectEvent represents project-related events
type ProjectEvent struct {
	ProjectID string                 `json:"project_id"`
	Action    string                 `json:"action"` // created, updated
	Changes   map[string]interface{} `json:"changes,omitempty"`
	Project   interface{}            `json:"project,omitempty"` // Full project object
}

// BoardEvent represents board-related events
type BoardEvent struct {
	BoardID   string                 `json:"board_id"`
	ProjectID string                 `json:"project_id"`
	Action    string                 `json:"action"` // updated, reordered
	Changes   map[string]interface{} `json:"changes,omitempty"`
	Board     interface{}            `json:"board,omitempty"` // Full board object
}

// ErrorEvent represents error messages
type ErrorEvent struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details string `json:"details,omitempty"`
}

// NewMessage creates a new message with the given type and data
func NewMessage(msgType MessageType, data interface{}) (*Message, error) {
	var rawData json.RawMessage
	var err error

	if data != nil {
		rawData, err = json.Marshal(data)
		if err != nil {
			return nil, err
		}
	}

	return &Message{
		Type:      msgType,
		Timestamp: time.Now(),
		Data:      rawData,
	}, nil
}

// NewErrorMessage creates a new error message
func NewErrorMessage(code, message, details string) *Message {
	errEvent := ErrorEvent{
		Code:    code,
		Message: message,
		Details: details,
	}

	data, _ := json.Marshal(errEvent)

	return &Message{
		Type:      MessageTypeError,
		Timestamp: time.Now(),
		Data:      data,
	}
}

// NewTaskCreatedMessage creates a task created message
func NewTaskCreatedMessage(taskID, boardID string, task interface{}) (*Message, error) {
	event := TaskEvent{
		TaskID:  taskID,
		BoardID: boardID,
		Action:  "created",
		Task:    task,
	}
	return NewMessage(MessageTypeTaskCreated, event)
}

// NewTaskUpdatedMessage creates a task updated message
func NewTaskUpdatedMessage(taskID, boardID string, changes map[string]interface{}, task interface{}) (*Message, error) {
	event := TaskEvent{
		TaskID:  taskID,
		BoardID: boardID,
		Action:  "updated",
		Changes: changes,
		Task:    task,
	}
	return NewMessage(MessageTypeTaskUpdated, event)
}

// NewTaskDeletedMessage creates a task deleted message
func NewTaskDeletedMessage(taskID, boardID string) (*Message, error) {
	event := TaskEvent{
		TaskID:  taskID,
		BoardID: boardID,
		Action:  "deleted",
	}
	return NewMessage(MessageTypeTaskDeleted, event)
}

// NewProjectCreatedMessage creates a project created message
func NewProjectCreatedMessage(projectID string, project interface{}) (*Message, error) {
	event := ProjectEvent{
		ProjectID: projectID,
		Action:    "created",
		Project:   project,
	}
	return NewMessage(MessageTypeProjectCreated, event)
}

// NewProjectUpdatedMessage creates a project updated message
func NewProjectUpdatedMessage(projectID string, changes map[string]interface{}, project interface{}) (*Message, error) {
	event := ProjectEvent{
		ProjectID: projectID,
		Action:    "updated",
		Changes:   changes,
		Project:   project,
	}
	return NewMessage(MessageTypeProjectUpdated, event)
}

// NewBoardUpdatedMessage creates a board updated message
func NewBoardUpdatedMessage(boardID, projectID string, changes map[string]interface{}, board interface{}) (*Message, error) {
	event := BoardEvent{
		BoardID:   boardID,
		ProjectID: projectID,
		Action:    "updated",
		Changes:   changes,
		Board:     board,
	}
	return NewMessage(MessageTypeBoardUpdated, event)
}
