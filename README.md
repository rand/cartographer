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

## Features (Planned)

### Phase 1: Foundation (Current)
- [x] Basic Go project structure
- [x] HTTP server with health check
- [ ] SQLite database setup
- [ ] Basic HTML UI
- [ ] Domain models (Project, Task, Board)
- [ ] REST API endpoints
- [ ] Beads integration
- [ ] WebSocket real-time updates
- [ ] Claude Code slash command

### Phase 2: Enhanced Features
- Kanban boards with drag-and-drop
- Markdown documentation hub
- Basic graph view
- Beads visualization

### Phase 3: Intelligence & Visualization
- Mermaid diagram integration
- Advanced graph analytics
- AI-assisted features
- Timeline and milestones

### Phase 4: Polish & Integration
- Animations and transitions
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

🚧 **In Development** - Phase 1: Foundation (Week 1-2)

Built with ❤️ for seamless human-AI collaboration.
