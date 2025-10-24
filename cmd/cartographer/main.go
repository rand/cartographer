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

	// Create application state
	app := &App{
		db:     db,
		logger: logger,
	}

	// Create HTTP server
	mux := http.NewServeMux()

	// Health check endpoint
	mux.HandleFunc("/health", app.handleHealth)

	// Static files
	mux.HandleFunc("/", handleIndex)

	addr := fmt.Sprintf("%s:%s", defaultHost, port)
	server := &http.Server{
		Addr:         addr,
		Handler:      mux,
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
func handleIndex(w http.ResponseWriter, r *http.Request) {
	// For now, serve a simple HTML page
	// Later this will serve from web/static/index.html
	w.Header().Set("Content-Type", "text/html; charset=utf-8")
	fmt.Fprint(w, `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Cartographer - Project Planning & Visualization</title>
	<style>
		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}
		body {
			font-family: system-ui, -apple-system, sans-serif;
			background: #0a0a0a;
			color: #e0e0e0;
			display: flex;
			align-items: center;
			justify-content: center;
			min-height: 100vh;
			padding: 2rem;
		}
		.container {
			text-align: center;
			max-width: 600px;
		}
		h1 {
			font-size: 3rem;
			margin-bottom: 1rem;
			background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
			-webkit-background-clip: text;
			-webkit-text-fill-color: transparent;
			background-clip: text;
		}
		p {
			font-size: 1.125rem;
			color: #a0a0a0;
			line-height: 1.6;
		}
		.status {
			margin-top: 2rem;
			padding: 1rem;
			background: #1a1a1a;
			border: 1px solid #333;
			border-radius: 8px;
		}
		.status-dot {
			display: inline-block;
			width: 8px;
			height: 8px;
			background: #10b981;
			border-radius: 50%;
			margin-right: 0.5rem;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>Cartographer</h1>
		<p>Agent-Ready Planning & Visualization System</p>
		<div class="status">
			<span class="status-dot"></span>
			<span>System Online</span>
		</div>
	</div>
</body>
</html>`)
}
