package websocket

import (
	"log"
	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
)

var (
	// Upgrader configures the WebSocket upgrade
	upgrader = websocket.Upgrader{
		ReadBufferSize:  1024,
		WriteBufferSize: 1024,
		// CheckOrigin allows connections from any origin
		// In production, you should restrict this to your domain
		CheckOrigin: func(r *http.Request) bool {
			// For development, allow all origins
			// TODO: In production, check r.Header.Get("Origin") against allowed domains
			return true
		},
	}
)

// Handler handles WebSocket connection requests
type Handler struct {
	hub    *Hub
	logger *log.Logger
}

// NewHandler creates a new WebSocket handler
func NewHandler(hub *Hub, logger *log.Logger) *Handler {
	if logger == nil {
		logger = log.Default()
	}

	return &Handler{
		hub:    hub,
		logger: logger,
	}
}

// ServeHTTP handles the HTTP request and upgrades to WebSocket
func (h *Handler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Only accept GET requests
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Upgrade HTTP connection to WebSocket
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		h.logger.Printf("WebSocket upgrade error: %v", err)
		return
	}

	// Generate unique client ID
	clientID := uuid.New().String()

	// Create new client
	client := NewClient(h.hub, conn, clientID)

	// Extract optional filters from query parameters
	// Example: /ws?project_id=abc123
	query := r.URL.Query()
	if projectID := query.Get("project_id"); projectID != "" {
		client.SetFilter("project_id", projectID)
		h.logger.Printf("Client %s subscribed to project %s", clientID, projectID)
	}
	if boardID := query.Get("board_id"); boardID != "" {
		client.SetFilter("board_id", boardID)
		h.logger.Printf("Client %s subscribed to board %s", clientID, boardID)
	}

	// Register client with hub
	h.hub.RegisterClient(client)

	// Start client goroutines
	// WritePump sends messages to the client
	go client.WritePump()

	// ReadPump receives messages from the client
	// This is blocking, so we run it in the current goroutine
	client.ReadPump()
}

// HandleWebSocket is a convenience wrapper for http.HandleFunc
func (h *Handler) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	h.ServeHTTP(w, r)
}

// SetCheckOrigin sets a custom origin checker for the WebSocket upgrader
// This allows you to configure CORS for WebSocket connections
func SetCheckOrigin(fn func(*http.Request) bool) {
	upgrader.CheckOrigin = fn
}

// SetBufferSizes sets custom buffer sizes for WebSocket connections
func SetBufferSizes(readBuffer, writeBuffer int) {
	upgrader.ReadBufferSize = readBuffer
	upgrader.WriteBufferSize = writeBuffer
}
