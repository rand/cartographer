# WebSocket Implementation for Cartographer

This package provides real-time WebSocket support for the Cartographer project planning tool.

## Architecture

### Components

1. **Hub** (`hub.go`): Central message broker managing all client connections
   - Maintains registry of active clients
   - Broadcasts messages to all or filtered clients
   - Thread-safe with mutex protection
   - Pub/sub pattern for real-time updates

2. **Client** (`client.go`): Individual WebSocket connection handler
   - Manages read/write pumps for each connection
   - Handles ping/pong heartbeats
   - Supports client-specific filters (e.g., project_id, board_id)
   - Graceful disconnect handling

3. **Handler** (`handler.go`): HTTP to WebSocket upgrade handler
   - Upgrades HTTP connections to WebSocket
   - Creates and registers new clients
   - Supports query parameter filters

4. **Message** (`message.go`): Message types and constructors
   - Structured message envelope with timestamp
   - Event types for tasks, projects, and boards
   - Helper functions for creating typed messages

## Message Types

### Task Events
- `task.created` - New task created
- `task.updated` - Task modified
- `task.deleted` - Task removed

### Project Events
- `project.created` - New project created
- `project.updated` - Project modified

### Board Events
- `board.updated` - Board modified or reordered

### Connection Events
- `ping` - Client heartbeat
- `pong` - Server heartbeat response
- `error` - Error message

## Integration Example

```go
package main

import (
    "log"
    "net/http"

    "github.com/rand/cartographer/internal/api/websocket"
)

func main() {
    logger := log.Default()

    // Create and start hub
    hub := websocket.NewHub(logger)
    go hub.Run()

    // Create WebSocket handler
    wsHandler := websocket.NewHandler(hub, logger)

    // Register WebSocket endpoint
    http.HandleFunc("/ws", wsHandler.HandleWebSocket)

    // Example: Broadcast task creation
    task := map[string]interface{}{
        "id": "task-123",
        "title": "Implement WebSocket",
        "status": "done",
    }
    hub.BroadcastTaskCreated("task-123", "board-456", task)

    // Example: Shutdown gracefully
    defer hub.Shutdown()

    http.ListenAndServe(":8080", nil)
}
```

## Client Usage (JavaScript)

```javascript
// Connect to WebSocket
const ws = new WebSocket('ws://localhost:8080/ws?project_id=abc123');

// Handle connection open
ws.onopen = () => {
    console.log('Connected to Cartographer');
};

// Handle incoming messages
ws.onmessage = (event) => {
    const message = JSON.parse(event.data);

    switch (message.type) {
        case 'task.created':
            console.log('New task:', message.data);
            break;
        case 'task.updated':
            console.log('Task updated:', message.data);
            break;
        case 'task.deleted':
            console.log('Task deleted:', message.data);
            break;
        case 'project.updated':
            console.log('Project updated:', message.data);
            break;
        case 'board.updated':
            console.log('Board updated:', message.data);
            break;
        case 'error':
            console.error('Error:', message.error);
            break;
    }
};

// Handle errors
ws.onerror = (error) => {
    console.error('WebSocket error:', error);
};

// Handle close
ws.onclose = () => {
    console.log('Disconnected from Cartographer');
};

// Send ping
setInterval(() => {
    ws.send(JSON.stringify({ type: 'ping', timestamp: new Date() }));
}, 30000);
```

## Features

### Concurrency Safety
- Mutex-protected client registry
- Thread-safe broadcast operations
- Buffered channels prevent blocking

### Connection Management
- Automatic ping/pong heartbeats (60s timeout)
- Graceful disconnect handling
- Client send buffer management (256 messages)

### Filtering
- Subscribe to specific projects: `/ws?project_id=abc123`
- Subscribe to specific boards: `/ws?board_id=xyz789`
- Broadcast to all or filtered clients

### Error Handling
- Unexpected close detection
- Send buffer overflow handling
- Message serialization error handling
- Automatic client cleanup on errors

## Configuration

### Buffer Sizes
```go
websocket.SetBufferSizes(2048, 2048) // Read, Write buffers
```

### Origin Checking (Production)
```go
websocket.SetCheckOrigin(func(r *http.Request) bool {
    origin := r.Header.Get("Origin")
    return origin == "https://yourdomain.com"
})
```

### Timeouts
Constants in `client.go`:
- `writeWait`: 10 seconds
- `pongWait`: 60 seconds
- `pingPeriod`: 54 seconds
- `maxMessageSize`: 512 KB

## Testing

### Manual Testing with wscat
```bash
# Install wscat
npm install -g wscat

# Connect to WebSocket
wscat -c ws://localhost:8080/ws

# Send ping
> {"type":"ping","timestamp":"2025-10-23T17:00:00Z"}

# Receive messages
< {"type":"task.created","timestamp":"2025-10-23T17:00:01Z","data":{...}}
```

### Load Testing
```go
// Example load test
func TestLoadTest(t *testing.T) {
    hub := NewHub(log.Default())
    go hub.Run()

    // Simulate 1000 concurrent clients
    for i := 0; i < 1000; i++ {
        go func() {
            // Connect and read messages
        }()
    }

    // Broadcast 10000 messages
    for i := 0; i < 10000; i++ {
        hub.BroadcastTaskCreated(fmt.Sprintf("task-%d", i), "board-1", nil)
    }

    time.Sleep(5 * time.Second)
    hub.Shutdown()
}
```

## Performance Considerations

1. **Buffered Channels**: 256 message buffer per client
2. **Broadcast Channel**: 256 message buffer for hub
3. **Mutex Granularity**: Fine-grained locks minimize contention
4. **Goroutine Per Client**: Efficient for moderate client counts (<10k)
5. **Message Batching**: WritePump batches queued messages

## Security

1. **Origin Validation**: Configure `CheckOrigin` for production
2. **Message Size Limit**: 512 KB maximum
3. **Rate Limiting**: Consider adding per-client rate limits
4. **Authentication**: Add token validation in handler
5. **Localhost Only**: Default server binds to 127.0.0.1

## Future Enhancements

- [ ] Client authentication with JWT
- [ ] Rate limiting per client
- [ ] Message persistence/replay for reconnects
- [ ] Client presence tracking
- [ ] Room-based subscriptions
- [ ] Compression for large messages
- [ ] Metrics and monitoring
- [ ] Circuit breaker for broadcast failures
