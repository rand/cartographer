# Cartographer

> Agent-Ready Planning & Visualization System

Cartographer is a local web application that serves as an intelligent command center for project planning, visualization, and decision-making. It enables seamless collaboration between human users and AI agents (primarily Claude Code) to create, navigate, and evolve complex project structures.

## Quick Start

```bash
# Run the server
go run cmd/cartographer/main.go

# Visit http://localhost:8080
# Health check: http://localhost:8080/health
```

**Available Pages:**
- **Home**: http://localhost:8080 - Projects overview
- **Board**: http://localhost:8080/static/board.html - Interactive kanban board with drag-and-drop
- **Docs**: http://localhost:8080/static/docs.html - Markdown documentation hub
- **Beads**: http://localhost:8080/static/beads.html - Beads issue visualization
- **Graph**: http://localhost:8080/static/graph.html - Dependency graph with multiple layouts

## Architecture

- **Backend**: Go 1.21+ with clean architecture
- **Frontend**: Vanilla JS with terminal-aesthetic design
- **Database**: SQLite for structured data, JSON files for plans
- **Integration**: Built on [Beads framework](https://github.com/steveyegge/beads)
- **Real-time**: WebSocket for live collaboration

## Project Structure

```
cartographer/
├── cmd/cartographer/       # Entry point
├── internal/               # Internal packages
│   ├── api/                # REST + WebSocket + GraphQL
│   ├── beads/              # Beads integration
│   ├── storage/            # SQLite + file storage + search
│   ├── domain/             # Business logic (tasks, boards, docs, diagrams, graph)
│   ├── ai/                 # AI-assisted features
│   ├── claude/             # Claude Code integration
│   ├── analytics/          # Metrics and insights
│   └── deps/               # Dependency management
├── web/                    # Frontend assets
│   ├── static/             # CSS, JS, assets
│   └── templates/          # Server-side templates
├── data/                   # Runtime data (gitignored)
├── templates/              # Project templates
├── docs/                   # Documentation
└── scripts/                # Utility scripts
```

## Current Features

### ✅ Phase 1: Foundation (Complete)
- [x] Go project structure with clean architecture
- [x] HTTP server with health check endpoint
- [x] SQLite database with WAL mode
- [x] Terminal-aesthetic HTML/CSS/JS UI
- [x] Domain models (Project, Task, Board, Document)
- [x] REST API endpoints (GET/POST/PUT/DELETE)
- [x] Beads framework integration and parser
- [x] WebSocket real-time updates
- [x] Claude Code `/cartographer` slash command

### ✅ Phase 2: Enhanced Features (Complete)

**Kanban Boards:**
- [x] HTML5 drag-and-drop for tasks
- [x] Card details panel with full task information
- [x] Filters (status, priority, labels) and search
- [x] Multiple boards per project
- [x] Priority indicators and status badges
- [x] Task estimates and metadata

**Markdown Documentation:**
- [x] Live preview markdown editor
- [x] File browser for document navigation
- [x] Internal wiki-style linking `[[page]]`
- [x] Full-text search across documents
- [x] Syntax highlighting for code blocks

**Beads Visualization:**
- [x] Enhanced parser for advanced Beads features
- [x] Interactive issue browser with statistics
- [x] Task linking from Beads issues
- [x] Filters by status, type, priority
- [x] Search across all issues

**Dependency Graph:**
- [x] Interactive graph visualization
- [x] Hierarchical layout (dependency-based)
- [x] Circular layout
- [x] Force-directed layout (physics simulation)
- [x] Click-to-focus with zoom and pan
- [x] Connection highlighting
- [x] Filter controls (show closed, show orphans)
- [x] Node details panel

### 🚧 Phase 3: Intelligence & Visualization (Planned)
- Mermaid diagram integration
- Advanced graph analytics
- AI-assisted features
- Timeline and milestones

### 📋 Phase 4: Polish & Integration (Planned)
- Enhanced animations and transitions
- Git integration
- Analytics dashboard
- Performance optimization

## Development

```bash
# Install dependencies
go mod tidy

# Run tests
go test ./...

# Build binary
go build -o cartographer cmd/cartographer/main.go

# Run binary
./cartographer
```

## API Endpoints

Cartographer provides a comprehensive REST API:

**Projects & Boards:**
- `GET/POST /api/projects` - List or create projects
- `GET/PUT/DELETE /api/projects/:id` - Project operations
- `GET/POST /api/boards` - List or create boards
- `GET/PUT/DELETE /api/boards/:id` - Board operations

**Tasks:**
- `GET/POST /api/tasks` - List or create tasks
- `GET/PUT/DELETE /api/tasks/:id` - Task operations

**Documents:**
- `GET/POST /api/documents` - List or create documents
- `GET/PUT/DELETE /api/documents/:id` - Document operations
- `GET /api/documents/search?q=:query` - Search documents

**Beads:**
- `GET /api/beads/issues` - List all beads issues
- `GET /api/beads/issues/:id` - Get single issue
- `GET /api/beads/graph` - Get dependency graph
- `GET /api/beads/stats` - Get statistics

**WebSocket:**
- `GET /ws` - Real-time updates (projects, boards, tasks)

## Claude Code Integration

Cartographer includes a `/cartographer` slash command for Claude Code:

```bash
# In Claude Code
/cartographer
```

This launches the Cartographer interface with automatic project context detection.

## Design Principles

1. **Clarity First** - Information architecture that makes sense at a glance
2. **Agent-Native** - Every feature accessible to both humans and AI agents
3. **Always Current** - Real-time sync with codebase and development activity
4. **Delightful Interactions** - Smooth, responsive, satisfying to use
5. **Local First** - Your data, your machine, your control

## Inspiration

- **Aesthetic**: [codelift.space](https://codelift.space) - clean, terminal-inspired
- **Framework**: [Beads](https://github.com/steveyegge/beads) - graph-based issue tracking
- **Design Systems**: shadcn/ui, daisyUI, HeroUI for component patterns

## License

MIT

## Status

✅ **Phase 1 Complete** - Foundation with full MVP functionality
✅ **Phase 2 Complete** - Enhanced features with kanban, docs, beads, and graph visualization
🚧 **Phase 3 Next** - Intelligence & advanced visualization features

**26 tasks completed** across Phase 1 and Phase 2.

Built with ❤️ for seamless human-AI collaboration.
