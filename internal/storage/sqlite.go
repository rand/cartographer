package storage

import (
	"database/sql"
	"fmt"
	"os"
	"path/filepath"

	_ "github.com/mattn/go-sqlite3"
)

// DB wraps the SQLite database connection
type DB struct {
	conn *sql.DB
	path string
}

// New creates a new SQLite database connection
func New(dataDir string) (*DB, error) {
	// Ensure data directory exists
	if err := os.MkdirAll(dataDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create data directory: %w", err)
	}

	dbPath := filepath.Join(dataDir, "cartographer.db")

	// Open SQLite database
	conn, err := sql.Open("sqlite3", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	// Set pragmas for performance and safety
	pragmas := []string{
		"PRAGMA foreign_keys = ON",
		"PRAGMA journal_mode = WAL",
		"PRAGMA synchronous = NORMAL",
		"PRAGMA cache_size = -64000", // 64MB cache
		"PRAGMA temp_store = MEMORY",
		"PRAGMA busy_timeout = 5000",
	}

	for _, pragma := range pragmas {
		if _, err := conn.Exec(pragma); err != nil {
			conn.Close()
			return nil, fmt.Errorf("failed to set pragma: %w", err)
		}
	}

	db := &DB{
		conn: conn,
		path: dbPath,
	}

	// Initialize schema
	if err := db.initSchema(); err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to initialize schema: %w", err)
	}

	return db, nil
}

// Close closes the database connection
func (db *DB) Close() error {
	if db.conn != nil {
		return db.conn.Close()
	}
	return nil
}

// Conn returns the underlying database connection
func (db *DB) Conn() *sql.DB {
	return db.conn
}

// Path returns the database file path
func (db *DB) Path() string {
	return db.path
}

// initSchema creates the database schema
func (db *DB) initSchema() error {
	schema := `
	-- Projects table
	CREATE TABLE IF NOT EXISTS projects (
		id TEXT PRIMARY KEY,
		name TEXT NOT NULL,
		description TEXT,
		path TEXT NOT NULL,
		type TEXT NOT NULL DEFAULT 'custom',
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		settings TEXT, -- JSON
		metadata TEXT  -- JSON
	);

	CREATE INDEX IF NOT EXISTS idx_projects_path ON projects(path);
	CREATE INDEX IF NOT EXISTS idx_projects_type ON projects(type);
	CREATE INDEX IF NOT EXISTS idx_projects_updated_at ON projects(updated_at DESC);

	-- Boards table
	CREATE TABLE IF NOT EXISTS boards (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		name TEXT NOT NULL,
		description TEXT,
		columns TEXT, -- JSON array of columns
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_boards_project_id ON boards(project_id);
	CREATE INDEX IF NOT EXISTS idx_boards_updated_at ON boards(updated_at DESC);

	-- Tasks table
	CREATE TABLE IF NOT EXISTS tasks (
		id TEXT PRIMARY KEY,
		board_id TEXT NOT NULL,
		title TEXT NOT NULL,
		description TEXT,
		status TEXT NOT NULL DEFAULT 'open',
		priority TEXT NOT NULL DEFAULT 'medium',
		assignee TEXT, -- JSON
		labels TEXT,   -- JSON array
		due_date DATETIME,
		estimate REAL,
		actual REAL,
		dependencies TEXT, -- JSON array of task IDs
		blocks TEXT,       -- JSON array of task IDs
		related TEXT,      -- JSON array of task IDs
		linked_items TEXT, -- JSON array
		checklist TEXT,    -- JSON array
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		created_by TEXT,   -- JSON
		activity TEXT,     -- JSON array
		FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_tasks_board_id ON tasks(board_id);
	CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
	CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
	CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
	CREATE INDEX IF NOT EXISTS idx_tasks_updated_at ON tasks(updated_at DESC);

	-- Documents table
	CREATE TABLE IF NOT EXISTS documents (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		title TEXT NOT NULL,
		content TEXT,
		path TEXT NOT NULL,
		tags TEXT, -- JSON array
		linked_from TEXT, -- JSON array of doc IDs
		links_to TEXT,    -- JSON array of doc IDs
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		versions TEXT, -- JSON array
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
	CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(path);
	CREATE INDEX IF NOT EXISTS idx_documents_updated_at ON documents(updated_at DESC);
	CREATE INDEX IF NOT EXISTS idx_documents_title ON documents(title);

	-- Diagrams table
	CREATE TABLE IF NOT EXISTS diagrams (
		id TEXT PRIMARY KEY,
		project_id TEXT NOT NULL,
		name TEXT NOT NULL,
		type TEXT NOT NULL,
		content TEXT NOT NULL,
		created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
		versions TEXT, -- JSON array
		FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
	);

	CREATE INDEX IF NOT EXISTS idx_diagrams_project_id ON diagrams(project_id);
	CREATE INDEX IF NOT EXISTS idx_diagrams_type ON diagrams(type);
	CREATE INDEX IF NOT EXISTS idx_diagrams_updated_at ON diagrams(updated_at DESC);

	-- Update triggers for updated_at
	CREATE TRIGGER IF NOT EXISTS update_projects_timestamp
	AFTER UPDATE ON projects
	BEGIN
		UPDATE projects SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;

	CREATE TRIGGER IF NOT EXISTS update_boards_timestamp
	AFTER UPDATE ON boards
	BEGIN
		UPDATE boards SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;

	CREATE TRIGGER IF NOT EXISTS update_tasks_timestamp
	AFTER UPDATE ON tasks
	BEGIN
		UPDATE tasks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;

	CREATE TRIGGER IF NOT EXISTS update_documents_timestamp
	AFTER UPDATE ON documents
	BEGIN
		UPDATE documents SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;

	CREATE TRIGGER IF NOT EXISTS update_diagrams_timestamp
	AFTER UPDATE ON diagrams
	BEGIN
		UPDATE diagrams SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
	END;
	`

	_, err := db.conn.Exec(schema)
	return err
}

// Ping checks if the database connection is alive
func (db *DB) Ping() error {
	return db.conn.Ping()
}
