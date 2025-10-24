package websocket

import (
	"encoding/json"
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	// Time allowed to write a message to the peer
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer
	pongWait = 60 * time.Second

	// Send pings to peer with this period (must be less than pongWait)
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer
	maxMessageSize = 512 * 1024 // 512 KB
)

// Client represents a WebSocket client connection
type Client struct {
	// Hub this client belongs to
	hub *Hub

	// WebSocket connection
	conn *websocket.Conn

	// Buffered channel of outbound messages
	send chan []byte

	// Client ID for tracking
	id string

	// Optional filters for this client (e.g., specific project IDs)
	filters map[string]string
}

// NewClient creates a new WebSocket client
func NewClient(hub *Hub, conn *websocket.Conn, id string) *Client {
	return &Client{
		hub:     hub,
		conn:    conn,
		send:    make(chan []byte, 256),
		id:      id,
		filters: make(map[string]string),
	}
}

// SetFilter sets a filter for this client (e.g., project_id)
func (c *Client) SetFilter(key, value string) {
	c.filters[key] = value
}

// GetFilter gets a filter value for this client
func (c *Client) GetFilter(key string) (string, bool) {
	value, exists := c.filters[key]
	return value, exists
}

// ReadPump pumps messages from the WebSocket connection to the hub
//
// The application runs ReadPump in a per-connection goroutine. The application
// ensures that there is at most one reader on a connection by executing all
// reads from this goroutine.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("websocket error: %v", err)
			}
			break
		}

		// Handle incoming messages (e.g., client subscriptions, filters)
		c.handleIncomingMessage(message)
	}
}

// WritePump pumps messages from the hub to the WebSocket connection
//
// A goroutine running WritePump is started for each connection. The
// application ensures that there is at most one writer to a connection by
// executing all writes from this goroutine.
func (c *Client) WritePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// Hub closed the channel
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued messages to the current WebSocket message
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write([]byte{'\n'})
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

// handleIncomingMessage handles messages received from the client
func (c *Client) handleIncomingMessage(data []byte) {
	var msg Message
	if err := json.Unmarshal(data, &msg); err != nil {
		log.Printf("error unmarshaling message: %v", err)
		c.sendError("INVALID_MESSAGE", "Invalid message format", err.Error())
		return
	}

	switch msg.Type {
	case MessageTypePing:
		// Respond to ping with pong
		c.sendPong()

	case MessageTypePong:
		// Pong received, update read deadline
		c.conn.SetReadDeadline(time.Now().Add(pongWait))

	default:
		// For now, we don't handle other incoming message types
		// This could be extended to support client-initiated actions
		log.Printf("unhandled message type: %s", msg.Type)
	}
}

// sendError sends an error message to the client
func (c *Client) sendError(code, message, details string) {
	errMsg := NewErrorMessage(code, message, details)
	data, err := json.Marshal(errMsg)
	if err != nil {
		log.Printf("error marshaling error message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		// Channel is full, skip this message
		log.Printf("client %s send channel full, dropping error message", c.id)
	}
}

// sendPong sends a pong message to the client
func (c *Client) sendPong() {
	pongMsg := &Message{
		Type:      MessageTypePong,
		Timestamp: time.Now(),
	}

	data, err := json.Marshal(pongMsg)
	if err != nil {
		log.Printf("error marshaling pong message: %v", err)
		return
	}

	select {
	case c.send <- data:
	default:
		// Channel is full, skip this message
		log.Printf("client %s send channel full, dropping pong message", c.id)
	}
}

// Send sends a message to the client
func (c *Client) Send(message []byte) {
	select {
	case c.send <- message:
	default:
		// Channel is full, drop this message and close the connection
		log.Printf("client %s send channel full, closing connection", c.id)
		close(c.send)
		c.hub.unregister <- c
	}
}
