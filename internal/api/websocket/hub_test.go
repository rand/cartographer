package websocket

import (
	"log"
	"os"
	"testing"
	"time"
)

func TestNewHub(t *testing.T) {
	logger := log.New(os.Stdout, "[test] ", log.LstdFlags)
	hub := NewHub(logger)

	if hub == nil {
		t.Fatal("NewHub returned nil")
	}

	if hub.clients == nil {
		t.Error("clients map not initialized")
	}

	if hub.broadcast == nil {
		t.Error("broadcast channel not initialized")
	}

	if hub.register == nil {
		t.Error("register channel not initialized")
	}

	if hub.unregister == nil {
		t.Error("unregister channel not initialized")
	}
}

func TestHubRun(t *testing.T) {
	logger := log.New(os.Stdout, "[test] ", log.LstdFlags)
	hub := NewHub(logger)

	// Start hub
	go hub.Run()

	// Give it time to start
	time.Sleep(100 * time.Millisecond)

	// Check initial client count
	if count := hub.ClientCount(); count != 0 {
		t.Errorf("Expected 0 clients, got %d", count)
	}

	// Shutdown
	hub.Shutdown()

	// Give it time to shut down
	time.Sleep(100 * time.Millisecond)
}

func TestHubBroadcast(t *testing.T) {
	logger := log.New(os.Stdout, "[test] ", log.LstdFlags)
	hub := NewHub(logger)

	go hub.Run()
	defer hub.Shutdown()

	// Test broadcasting a task created message
	task := map[string]interface{}{
		"id":    "task-1",
		"title": "Test Task",
	}

	err := hub.BroadcastTaskCreated("task-1", "board-1", task)
	if err != nil {
		t.Errorf("BroadcastTaskCreated failed: %v", err)
	}

	// Test broadcasting a task updated message
	changes := map[string]interface{}{
		"status": "done",
	}

	err = hub.BroadcastTaskUpdated("task-1", "board-1", changes, task)
	if err != nil {
		t.Errorf("BroadcastTaskUpdated failed: %v", err)
	}

	// Test broadcasting a task deleted message
	err = hub.BroadcastTaskDeleted("task-1", "board-1")
	if err != nil {
		t.Errorf("BroadcastTaskDeleted failed: %v", err)
	}
}

func TestMessageTypes(t *testing.T) {
	// Test task created message
	msg, err := NewTaskCreatedMessage("task-1", "board-1", map[string]interface{}{"title": "Test"})
	if err != nil {
		t.Errorf("NewTaskCreatedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeTaskCreated {
		t.Errorf("Expected type %s, got %s", MessageTypeTaskCreated, msg.Type)
	}

	// Test task updated message
	msg, err = NewTaskUpdatedMessage("task-1", "board-1", map[string]interface{}{"status": "done"}, nil)
	if err != nil {
		t.Errorf("NewTaskUpdatedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeTaskUpdated {
		t.Errorf("Expected type %s, got %s", MessageTypeTaskUpdated, msg.Type)
	}

	// Test task deleted message
	msg, err = NewTaskDeletedMessage("task-1", "board-1")
	if err != nil {
		t.Errorf("NewTaskDeletedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeTaskDeleted {
		t.Errorf("Expected type %s, got %s", MessageTypeTaskDeleted, msg.Type)
	}

	// Test project created message
	msg, err = NewProjectCreatedMessage("proj-1", map[string]interface{}{"name": "Test Project"})
	if err != nil {
		t.Errorf("NewProjectCreatedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeProjectCreated {
		t.Errorf("Expected type %s, got %s", MessageTypeProjectCreated, msg.Type)
	}

	// Test project updated message
	msg, err = NewProjectUpdatedMessage("proj-1", map[string]interface{}{"name": "Updated"}, nil)
	if err != nil {
		t.Errorf("NewProjectUpdatedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeProjectUpdated {
		t.Errorf("Expected type %s, got %s", MessageTypeProjectUpdated, msg.Type)
	}

	// Test board updated message
	msg, err = NewBoardUpdatedMessage("board-1", "proj-1", map[string]interface{}{"columns": []string{"todo"}}, nil)
	if err != nil {
		t.Errorf("NewBoardUpdatedMessage failed: %v", err)
	}
	if msg.Type != MessageTypeBoardUpdated {
		t.Errorf("Expected type %s, got %s", MessageTypeBoardUpdated, msg.Type)
	}

	// Test error message
	errMsg := NewErrorMessage("TEST_ERROR", "Test error message", "Details here")
	if errMsg.Type != MessageTypeError {
		t.Errorf("Expected type %s, got %s", MessageTypeError, errMsg.Type)
	}
}
