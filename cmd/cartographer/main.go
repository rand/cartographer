package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/rand/cartographer/internal/api/rest"
	"github.com/rand/cartographer/internal/api/websocket"
	"github.com/rand/cartographer/internal/beads"
	"github.com/rand/cartographer/internal/storage"
)

const (
	defaultPort    = "8080"
	defaultHost    = "127.0.0.1" // localhost only for security
	defaultDataDir = "./data"
)

// App holds application state
type App struct {
	db     *storage.DB
	wsHub  *websocket.Hub
	logger *log.Logger
}

func main() {
	// Setup logger
	logger := log.New(os.Stdout, "[cartographer] ", log.LstdFlags|log.Lshortfile)

	// Get configuration from environment
	port := os.Getenv("PORT")
	if port == "" {
		port = defaultPort
	}

	dataDir := os.Getenv("DATA_DIR")
	if dataDir == "" {
		dataDir = defaultDataDir
	}

	// Initialize database
	logger.Println("Initializing database...")
	db, err := storage.New(dataDir)
	if err != nil {
		logger.Fatalf("Failed to initialize database: %v", err)
	}
	defer db.Close()
	logger.Printf("Database initialized at %s", db.Path())

	// Initialize repositories
	logger.Println("Initializing repositories...")
	projectRepo := storage.NewProjectRepository(db)
	boardRepo := storage.NewBoardRepository(db)
	taskRepo := storage.NewTaskRepository(db)
	documentRepo := storage.NewDocumentRepository(db)

	// Initialize Beads parser
	logger.Println("Initializing Beads parser...")
	beadsParser := beads.NewParser(".")

	// Initialize WebSocket hub
	logger.Println("Starting WebSocket hub...")
	wsHub := websocket.NewHub(logger)
	go wsHub.Run()

	// Create application state
	app := &App{
		db:     db,
		wsHub:  wsHub,
		logger: logger,
	}

	// Create HTTP server
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", app.handleHealth)

	// WebSocket endpoint
	wsHandler := websocket.NewHandler(wsHub, logger)
	mux.HandleFunc("/ws", wsHandler.HandleWebSocket)

	// REST API endpoints
	apiHandler := rest.NewAPIHandler(projectRepo, boardRepo, taskRepo, documentRepo, beadsParser, wsHub, logger)
	apiHandler.Register(mux)

	// Static files - serve from web/static
	fs := http.FileServer(http.Dir("web/static"))
	mux.Handle("/static/", http.StripPrefix("/static/", fs))

	// Main index page
	mux.HandleFunc("/", app.handleIndex)

	addr := fmt.Sprintf("%s:%s", defaultHost, port)

	// Wrap with middleware (CORS and logging)
	handler := rest.LoggingMiddleware(logger)(rest.CORSMiddleware(mux))

	server := &http.Server{
		Addr:         addr,
		Handler:      handler,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// Start server in goroutine
	go func() {
		logger.Printf("Starting Cartographer on http://%s", addr)
		logger.Printf("Health check available at http://%s/health", addr)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatalf("Server failed to start: %v", err)
		}
	}()

	// Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit

	logger.Println("Shutting down server...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := server.Shutdown(ctx); err != nil {
		logger.Fatalf("Server forced to shutdown: %v", err)
	}

	logger.Println("Server stopped")
}

// handleHealth returns server health status
func (app *App) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Check database connection
	dbStatus := "ok"
	if err := app.db.Ping(); err != nil {
		dbStatus = "error"
		app.logger.Printf("Database ping failed: %v", err)
	}

	status := "ok"
	statusCode := http.StatusOK

	if dbStatus != "ok" {
		status = "degraded"
		statusCode = http.StatusServiceUnavailable
	}

	w.WriteHeader(statusCode)
	fmt.Fprintf(w, `{"status":"%s","service":"cartographer","database":"%s","timestamp":"%s"}`,
		status, dbStatus, time.Now().Format(time.RFC3339))
}

// handleIndex serves the main HTML page
func (app *App) handleIndex(w http.ResponseWriter, r *http.Request) {
	// Only serve index.html for root path
	if r.URL.Path != "/" {
		http.NotFound(w, r)
		return
	}

	http.ServeFile(w, r, "web/static/index.html")
}
