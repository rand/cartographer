package rest

import (
	"encoding/json"
	"log"
	"net/http"
	"strings"

	"github.com/rand/cartographer/internal/api/websocket"
	"github.com/rand/cartographer/internal/domain"
	"github.com/rand/cartographer/internal/storage"
)

// APIHandler handles REST API requests
type APIHandler struct {
	projects *storage.ProjectRepository
	boards   *storage.BoardRepository
	tasks    *storage.TaskRepository
	wsHub    *websocket.Hub
	logger   *log.Logger
}

// NewAPIHandler creates a new API handler
func NewAPIHandler(
	projects *storage.ProjectRepository,
	boards *storage.BoardRepository,
	tasks *storage.TaskRepository,
	wsHub *websocket.Hub,
	logger *log.Logger,
) *APIHandler {
	return &APIHandler{
		projects: projects,
		boards:   boards,
		tasks:    tasks,
		wsHub:    wsHub,
		logger:   logger,
	}
}

// Register registers all API routes
func (h *APIHandler) Register(mux *http.ServeMux) {
	// Projects
	mux.HandleFunc("/api/projects", h.handleProjects)
	mux.HandleFunc("/api/projects/", h.handleProject)

	// Boards
	mux.HandleFunc("/api/boards", h.handleBoards)
	mux.HandleFunc("/api/boards/", h.handleBoard)

	// Tasks
	mux.HandleFunc("/api/tasks", h.handleTasks)
	mux.HandleFunc("/api/tasks/", h.handleTask)
}

// Projects handlers

func (h *APIHandler) handleProjects(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		h.listProjects(w, r)
	case http.MethodPost:
		h.createProject(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) handleProject(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/projects/")
	if id == "" {
		http.Error(w, "Project ID required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getProject(w, r, id)
	case http.MethodPut:
		h.updateProject(w, r, id)
	case http.MethodDelete:
		h.deleteProject(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) listProjects(w http.ResponseWriter, r *http.Request) {
	projects, err := h.projects.List()
	if err != nil {
		h.logger.Printf("Error listing projects: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, projects)
}

func (h *APIHandler) getProject(w http.ResponseWriter, r *http.Request, id string) {
	project, err := h.projects.GetByID(id)
	if err != nil {
		h.logger.Printf("Error getting project: %v", err)
		http.Error(w, "Project not found", http.StatusNotFound)
		return
	}

	h.respondJSON(w, project)
}

func (h *APIHandler) createProject(w http.ResponseWriter, r *http.Request) {
	var project domain.Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.projects.Create(&project); err != nil {
		h.logger.Printf("Error creating project: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast project creation via WebSocket
	if h.wsHub != nil {
		h.wsHub.BroadcastProjectCreated(project.ID, &project)
	}

	w.WriteHeader(http.StatusCreated)
	h.respondJSON(w, project)
}

func (h *APIHandler) updateProject(w http.ResponseWriter, r *http.Request, id string) {
	var project domain.Project
	if err := json.NewDecoder(r.Body).Decode(&project); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	project.ID = id
	if err := h.projects.Update(&project); err != nil {
		h.logger.Printf("Error updating project: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast project update via WebSocket
	if h.wsHub != nil {
		changes := map[string]interface{}{
			"name":        project.Name,
			"description": project.Description,
		}
		h.wsHub.BroadcastProjectUpdated(project.ID, changes, &project)
	}

	h.respondJSON(w, project)
}

func (h *APIHandler) deleteProject(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.projects.Delete(id); err != nil {
		h.logger.Printf("Error deleting project: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Boards handlers

func (h *APIHandler) handleBoards(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		projectID := r.URL.Query().Get("project_id")
		if projectID == "" {
			http.Error(w, "project_id parameter required", http.StatusBadRequest)
			return
		}
		h.listBoards(w, r, projectID)
	case http.MethodPost:
		h.createBoard(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) handleBoard(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/boards/")
	if id == "" {
		http.Error(w, "Board ID required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getBoard(w, r, id)
	case http.MethodPut:
		h.updateBoard(w, r, id)
	case http.MethodDelete:
		h.deleteBoard(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) listBoards(w http.ResponseWriter, r *http.Request, projectID string) {
	boards, err := h.boards.ListByProject(projectID)
	if err != nil {
		h.logger.Printf("Error listing boards: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, boards)
}

func (h *APIHandler) getBoard(w http.ResponseWriter, r *http.Request, id string) {
	board, err := h.boards.GetByID(id)
	if err != nil {
		h.logger.Printf("Error getting board: %v", err)
		http.Error(w, "Board not found", http.StatusNotFound)
		return
	}

	h.respondJSON(w, board)
}

func (h *APIHandler) createBoard(w http.ResponseWriter, r *http.Request) {
	var board domain.Board
	if err := json.NewDecoder(r.Body).Decode(&board); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.boards.Create(&board); err != nil {
		h.logger.Printf("Error creating board: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusCreated)
	h.respondJSON(w, board)
}

func (h *APIHandler) updateBoard(w http.ResponseWriter, r *http.Request, id string) {
	var board domain.Board
	if err := json.NewDecoder(r.Body).Decode(&board); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	board.ID = id
	if err := h.boards.Update(&board); err != nil {
		h.logger.Printf("Error updating board: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast board update via WebSocket
	if h.wsHub != nil {
		changes := map[string]interface{}{
			"name":        board.Name,
			"description": board.Description,
			"columns":     board.Columns,
		}
		h.wsHub.BroadcastBoardUpdated(board.ID, board.ProjectID, changes, &board)
	}

	h.respondJSON(w, board)
}

func (h *APIHandler) deleteBoard(w http.ResponseWriter, r *http.Request, id string) {
	if err := h.boards.Delete(id); err != nil {
		h.logger.Printf("Error deleting board: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Tasks handlers

func (h *APIHandler) handleTasks(w http.ResponseWriter, r *http.Request) {
	switch r.Method {
	case http.MethodGet:
		boardID := r.URL.Query().Get("board_id")
		if boardID == "" {
			http.Error(w, "board_id parameter required", http.StatusBadRequest)
			return
		}
		h.listTasks(w, r, boardID)
	case http.MethodPost:
		h.createTask(w, r)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) handleTask(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/api/tasks/")
	if id == "" {
		http.Error(w, "Task ID required", http.StatusBadRequest)
		return
	}

	switch r.Method {
	case http.MethodGet:
		h.getTask(w, r, id)
	case http.MethodPut:
		h.updateTask(w, r, id)
	case http.MethodDelete:
		h.deleteTask(w, r, id)
	default:
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
	}
}

func (h *APIHandler) listTasks(w http.ResponseWriter, r *http.Request, boardID string) {
	tasks, err := h.tasks.ListByBoard(boardID)
	if err != nil {
		h.logger.Printf("Error listing tasks: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	h.respondJSON(w, tasks)
}

func (h *APIHandler) getTask(w http.ResponseWriter, r *http.Request, id string) {
	task, err := h.tasks.GetByID(id)
	if err != nil {
		h.logger.Printf("Error getting task: %v", err)
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	h.respondJSON(w, task)
}

func (h *APIHandler) createTask(w http.ResponseWriter, r *http.Request) {
	var task domain.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	if err := h.tasks.Create(&task); err != nil {
		h.logger.Printf("Error creating task: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast task creation via WebSocket
	if h.wsHub != nil {
		h.wsHub.BroadcastTaskCreated(task.ID, task.BoardID, &task)
	}

	w.WriteHeader(http.StatusCreated)
	h.respondJSON(w, task)
}

func (h *APIHandler) updateTask(w http.ResponseWriter, r *http.Request, id string) {
	var task domain.Task
	if err := json.NewDecoder(r.Body).Decode(&task); err != nil {
		http.Error(w, "Invalid request body", http.StatusBadRequest)
		return
	}

	task.ID = id
	if err := h.tasks.Update(&task); err != nil {
		h.logger.Printf("Error updating task: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast task update via WebSocket
	if h.wsHub != nil {
		changes := map[string]interface{}{
			"title":       task.Title,
			"description": task.Description,
			"status":      task.Status,
			"priority":    task.Priority,
		}
		h.wsHub.BroadcastTaskUpdated(task.ID, task.BoardID, changes, &task)
	}

	h.respondJSON(w, task)
}

func (h *APIHandler) deleteTask(w http.ResponseWriter, r *http.Request, id string) {
	// Get task to find board_id for WebSocket broadcast
	task, err := h.tasks.GetByID(id)
	if err != nil {
		h.logger.Printf("Error getting task for deletion: %v", err)
		http.Error(w, "Task not found", http.StatusNotFound)
		return
	}

	if err := h.tasks.Delete(id); err != nil {
		h.logger.Printf("Error deleting task: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	// Broadcast task deletion via WebSocket
	if h.wsHub != nil {
		h.wsHub.BroadcastTaskDeleted(task.ID, task.BoardID)
	}

	w.WriteHeader(http.StatusNoContent)
}

// Helper methods

func (h *APIHandler) respondJSON(w http.ResponseWriter, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(data); err != nil {
		h.logger.Printf("Error encoding JSON response: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
	}
}

// CORS middleware (for development)
func CORSMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}

// LoggingMiddleware logs all requests
func LoggingMiddleware(logger *log.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			logger.Printf("%s %s from %s", r.Method, r.URL.Path, r.RemoteAddr)
			next.ServeHTTP(w, r)
		})
	}
}
