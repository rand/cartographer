package domain

import "time"

// Project represents a project in Cartographer
type Project struct {
	ID          string            `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	Path        string            `json:"path"`
	Type        string            `json:"type"` // web-app, api, library, custom
	CreatedAt   time.Time         `json:"created_at"`
	UpdatedAt   time.Time         `json:"updated_at"`
	Settings    *ProjectSettings  `json:"settings,omitempty"`
	Metadata    *ProjectMetadata  `json:"metadata,omitempty"`
}

// ProjectSettings contains project-specific settings
type ProjectSettings struct {
	DefaultBoard string `json:"default_board,omitempty"`
	Theme        string `json:"theme,omitempty"` // dark, light, system
}

// ProjectMetadata contains project metadata
type ProjectMetadata struct {
	GitRemote       string `json:"git_remote,omitempty"`
	PrimaryLanguage string `json:"primary_language,omitempty"`
	Framework       string `json:"framework,omitempty"`
}

// Board represents a kanban board
type Board struct {
	ID          string        `json:"id"`
	ProjectID   string        `json:"project_id"`
	Name        string        `json:"name"`
	Description string        `json:"description"`
	Columns     []BoardColumn `json:"columns"`
	CreatedAt   time.Time     `json:"created_at"`
	UpdatedAt   time.Time     `json:"updated_at"`
}

// BoardColumn represents a column in a kanban board
type BoardColumn struct {
	ID       string `json:"id"`
	Name     string `json:"name"`
	WIPLimit int    `json:"wip_limit,omitempty"`
	Order    int    `json:"order"`
}

// Task represents a task in Cartographer
type Task struct {
	ID          string         `json:"id"`
	BoardID     string         `json:"board_id"`
	Title       string         `json:"title"`
	Description string         `json:"description"`
	Status      string         `json:"status"`
	Priority    string         `json:"priority"` // low, medium, high, urgent
	Assignee    *Assignee      `json:"assignee,omitempty"`
	Labels      []string       `json:"labels,omitempty"`
	DueDate     *time.Time     `json:"due_date,omitempty"`
	Estimate    *float64       `json:"estimate,omitempty"` // hours
	Actual      *float64       `json:"actual,omitempty"`   // hours
	Dependencies []string      `json:"dependencies,omitempty"`
	Blocks      []string       `json:"blocks,omitempty"`
	Related     []string       `json:"related,omitempty"`
	LinkedItems []LinkedItem   `json:"linked_items,omitempty"`
	Checklist   []ChecklistItem `json:"checklist,omitempty"`
	CreatedAt   time.Time      `json:"created_at"`
	UpdatedAt   time.Time      `json:"updated_at"`
	CreatedBy   *User          `json:"created_by,omitempty"`
	Activity    []ActivityEntry `json:"activity,omitempty"`
}

// Assignee represents who is assigned to a task
type Assignee struct {
	Type string `json:"type"` // human, agent
	ID   string `json:"id"`
	Name string `json:"name"`
}

// LinkedItem represents a link to another entity
type LinkedItem struct {
	Type string `json:"type"` // doc, diagram, bead, file, commit
	ID   string `json:"id"`
	Path string `json:"path,omitempty"`
}

// ChecklistItem represents an item in a task checklist
type ChecklistItem struct {
	ID        string `json:"id"`
	Text      string `json:"text"`
	Completed bool   `json:"completed"`
}

// User represents a user (human or agent)
type User struct {
	Type string `json:"type"` // human, agent
	ID   string `json:"id"`
}

// ActivityEntry represents an activity log entry
type ActivityEntry struct {
	Type      string                 `json:"type"` // created, updated, commented, moved
	User      string                 `json:"user"`
	Timestamp time.Time              `json:"timestamp"`
	Changes   map[string]interface{} `json:"changes,omitempty"`
	Comment   string                 `json:"comment,omitempty"`
}

// Document represents a markdown document
type Document struct {
	ID         string            `json:"id"`
	ProjectID  string            `json:"project_id"`
	Title      string            `json:"title"`
	Content    string            `json:"content"`
	Path       string            `json:"path"`
	Tags       []string          `json:"tags,omitempty"`
	LinkedFrom []string          `json:"linked_from,omitempty"`
	LinksTo    []string          `json:"links_to,omitempty"`
	CreatedAt  time.Time         `json:"created_at"`
	UpdatedAt  time.Time         `json:"updated_at"`
	Versions   []DocumentVersion `json:"versions,omitempty"`
}

// DocumentVersion represents a version of a document
type DocumentVersion struct {
	Version   int       `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	Content   string    `json:"content"`
	ChangedBy string    `json:"changed_by"`
}

// Diagram represents a diagram (Mermaid, railroad, etc.)
type Diagram struct {
	ID        string           `json:"id"`
	ProjectID string           `json:"project_id"`
	Name      string           `json:"name"`
	Type      string           `json:"type"` // mermaid, railroad, custom
	Content   string           `json:"content"`
	CreatedAt time.Time        `json:"created_at"`
	UpdatedAt time.Time        `json:"updated_at"`
	Versions  []DiagramVersion `json:"versions,omitempty"`
}

// DiagramVersion represents a version of a diagram
type DiagramVersion struct {
	Version   int       `json:"version"`
	Timestamp time.Time `json:"timestamp"`
	Content   string    `json:"content"`
}
