package websocket

import (
	"encoding/json"
	"log"
	"sync"
)

// Hub maintains the set of active clients and broadcasts messages to the clients
type Hub struct {
	// Registered clients
	clients map[*Client]bool

	// Inbound messages from clients
	broadcast chan []byte

	// Register requests from clients
	register chan *Client

	// Unregister requests from clients
	unregister chan *Client

	// Mutex for thread-safe client operations
	mu sync.RWMutex

	// Logger for hub operations
	logger *log.Logger

	// Shutdown channel
	shutdown chan struct{}
}

// NewHub creates a new Hub instance
func NewHub(logger *log.Logger) *Hub {
	if logger == nil {
		logger = log.Default()
	}

	return &Hub{
		broadcast:  make(chan []byte, 256),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		clients:    make(map[*Client]bool),
		logger:     logger,
		shutdown:   make(chan struct{}),
	}
}

// Run starts the hub's main event loop
// This should be run in a goroutine
func (h *Hub) Run() {
	h.logger.Println("WebSocket hub starting...")

	for {
		select {
		case client := <-h.register:
			h.mu.Lock()
			h.clients[client] = true
			h.mu.Unlock()
			h.logger.Printf("Client %s registered (total: %d)", client.id, len(h.clients))

		case client := <-h.unregister:
			h.mu.Lock()
			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				close(client.send)
				h.logger.Printf("Client %s unregistered (total: %d)", client.id, len(h.clients))
			}
			h.mu.Unlock()

		case message := <-h.broadcast:
			h.broadcastToAll(message)

		case <-h.shutdown:
			h.logger.Println("WebSocket hub shutting down...")
			h.closeAllClients()
			return
		}
	}
}

// broadcastToAll sends a message to all registered clients
func (h *Hub) broadcastToAll(message []byte) {
	h.mu.RLock()
	defer h.mu.RUnlock()

	for client := range h.clients {
		select {
		case client.send <- message:
		default:
			// Client's send buffer is full, close and unregister
			h.logger.Printf("Client %s send buffer full, closing", client.id)
			close(client.send)
			delete(h.clients, client)
		}
	}
}

// BroadcastMessage broadcasts a message to all clients
func (h *Hub) BroadcastMessage(msg *Message) error {
	data, err := json.Marshal(msg)
	if err != nil {
		h.logger.Printf("error marshaling message: %v", err)
		return err
	}

	select {
	case h.broadcast <- data:
		return nil
	default:
		h.logger.Println("broadcast channel full, message dropped")
		return nil
	}
}

// BroadcastToFiltered broadcasts a message to clients matching filters
func (h *Hub) BroadcastToFiltered(msg *Message, filterKey, filterValue string) error {
	data, err := json.Marshal(msg)
	if err != nil {
		h.logger.Printf("error marshaling message: %v", err)
		return err
	}

	h.mu.RLock()
	defer h.mu.RUnlock()

	count := 0
	for client := range h.clients {
		if value, exists := client.GetFilter(filterKey); exists && value == filterValue {
			select {
			case client.send <- data:
				count++
			default:
				h.logger.Printf("Client %s send buffer full, skipping", client.id)
			}
		}
	}

	h.logger.Printf("Broadcast to %d clients with filter %s=%s", count, filterKey, filterValue)
	return nil
}

// BroadcastTaskCreated broadcasts a task created event
func (h *Hub) BroadcastTaskCreated(taskID, boardID string, task interface{}) error {
	msg, err := NewTaskCreatedMessage(taskID, boardID, task)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// BroadcastTaskUpdated broadcasts a task updated event
func (h *Hub) BroadcastTaskUpdated(taskID, boardID string, changes map[string]interface{}, task interface{}) error {
	msg, err := NewTaskUpdatedMessage(taskID, boardID, changes, task)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// BroadcastTaskDeleted broadcasts a task deleted event
func (h *Hub) BroadcastTaskDeleted(taskID, boardID string) error {
	msg, err := NewTaskDeletedMessage(taskID, boardID)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// BroadcastProjectCreated broadcasts a project created event
func (h *Hub) BroadcastProjectCreated(projectID string, project interface{}) error {
	msg, err := NewProjectCreatedMessage(projectID, project)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// BroadcastProjectUpdated broadcasts a project updated event
func (h *Hub) BroadcastProjectUpdated(projectID string, changes map[string]interface{}, project interface{}) error {
	msg, err := NewProjectUpdatedMessage(projectID, changes, project)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// BroadcastBoardUpdated broadcasts a board updated event
func (h *Hub) BroadcastBoardUpdated(boardID, projectID string, changes map[string]interface{}, board interface{}) error {
	msg, err := NewBoardUpdatedMessage(boardID, projectID, changes, board)
	if err != nil {
		return err
	}
	return h.BroadcastMessage(msg)
}

// RegisterClient registers a new client with the hub
func (h *Hub) RegisterClient(client *Client) {
	h.register <- client
}

// UnregisterClient unregisters a client from the hub
func (h *Hub) UnregisterClient(client *Client) {
	h.unregister <- client
}

// ClientCount returns the current number of connected clients
func (h *Hub) ClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.clients)
}

// Shutdown gracefully shuts down the hub
func (h *Hub) Shutdown() {
	close(h.shutdown)
}

// closeAllClients closes all client connections
func (h *Hub) closeAllClients() {
	h.mu.Lock()
	defer h.mu.Unlock()

	for client := range h.clients {
		close(client.send)
		delete(h.clients, client)
	}
	h.logger.Println("All WebSocket clients closed")
}

// GetClients returns a snapshot of current clients (thread-safe)
func (h *Hub) GetClients() []*Client {
	h.mu.RLock()
	defer h.mu.RUnlock()

	clients := make([]*Client, 0, len(h.clients))
	for client := range h.clients {
		clients = append(clients, client)
	}
	return clients
}
