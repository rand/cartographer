# Cartographer: Agent-Ready Planning & Visualization System

## Vision
Cartographer is a local web application that serves as an intelligent command center for project planning, visualization, and decision-making. It enables seamless collaboration between human users and AI agents (primarily Claude Code) to create, navigate, and evolve complex project structures. Think of it as your project's living map—always up-to-date, always navigable, always helpful.

## Core Philosophy
- **Agent-Native**: Every feature is accessible to both humans and AI agents
- **Clarity Over Complexity**: Information architecture that makes sense at a glance
- **Always Current**: Real-time sync with codebase and development activity
- **Opinionated but Flexible**: Smart defaults with deep customization
- **Delightful Interactions**: Smooth, responsive, satisfying to use

## Technical Stack

### Backend
- **Language**: Go 1.21+
- **Core Framework**: Build on top of https://github.com/steveyegge/beads
- **Dependency Management**: Go modules with automatic update checking and optional auto-updates
- **API**: RESTful API + WebSocket for real-time collaboration
- **Storage**: Hybrid approach:
  - SQLite for structured data (fast queries, transactions)
  - JSON files for plans/docs (git-friendly, human-readable)
  - Markdown for documentation
- **Search**: Full-text search with fuzzy matching (bleve or similar)
- **Security**: Local-only binding with optional token-based API access for agents

### Frontend
- **Aesthetic**: Inspired by https://codelift.space - clean, terminal-aesthetic, professional
- **Tech Stack**: 
  - Vanilla JS or lightweight framework (Alpine.js/Preact)
  - Modern CSS with CSS Grid/Flexbox
  - Tailwind CSS for rapid styling (optional)
  - No heavy frameworks - keep it fast
- **Icons**: Lucide or Feather icons (clean, consistent)
- **Animations**: Smooth transitions using CSS transforms and FLIP technique
- **Accessibility**: WCAG 2.1 AA compliant, keyboard-first navigation

### Design System
- **Colors**: Terminal-inspired palette with excellent contrast
  - Primary: Deep blue/purple (links, actions)
  - Success: Muted green
  - Warning: Amber
  - Error: Salmon red
  - Neutral: Grays from charcoal to light gray
- **Typography**: 
  - Monospace for code/data (JetBrains Mono, Fira Code)
  - Sans-serif for UI (Inter, system fonts)
- **Spacing**: 8px base unit, consistent scale
- **Animations**: 200-300ms duration, ease-out timing

## Core Features

### 1. Claude Code Integration
- **Slash Command**: `/cartographer` or `/map` to launch
- **Context Awareness**: 
  - Auto-detect project type and suggest templates
  - Parse existing project structure on first launch
  - Detect git branch and show branch-specific plans
- **Repo/Directory Selector**: 
  - Recent projects quick-access
  - Bookmarked favorites
  - Search across all known projects
- **Bidirectional API**:
  - GraphQL or REST + WebSocket
  - Real-time state synchronization
  - Agent can query, create, update any entity
  - Structured responses with metadata
- **Session Capture**:
  - Stream Claude Code session activity
  - Auto-create tasks from agent actions
  - Link code changes to plan items
  - Preserve full context between sessions
  - Session bookmarks and annotations

### 2. Smart Kanban Boards
- **Multiple Board Views**:
  - Default board (customizable columns)
  - Sprint/iteration boards
  - Personal boards (per user/agent)
  - Epic/milestone boards
- **Enhanced Cards**:
  - Rich text descriptions with markdown
  - Code snippets with syntax highlighting
  - File attachments and links
  - Checklists and subtasks
  - Time estimates vs actuals
  - Priority levels with visual indicators
  - Labels/tags with colors
  - Assignee (human/agent) with avatars
  - Comments and activity feed
  - Related cards and dependencies
  - Quick actions menu
- **Smart Features**:
  - Auto-move based on git commits/PRs
  - AI-suggested task breakdowns
  - Automatic dependency detection
  - Blocked task highlighting
  - WIP limits per column
  - Batch operations
- **Views**:
  - Standard kanban
  - Compact list view
  - Calendar view for deadlines
  - Table view with sortable columns
- **Filters & Search**:
  - By assignee, label, status, priority
  - Date ranges
  - Text search across all fields
  - Saved filter presets

### 3. Advanced Diagrams & Visualization

#### Mermaid Integration
- Flowcharts
- Sequence diagrams
- State diagrams
- Class diagrams
- Entity-relationship diagrams
- Gantt charts
- Pie/bar charts
- Git graphs
- User journey maps

#### Railroad Diagrams
- Grammar visualization
- API flow patterns
- State machine transitions

#### Custom Diagrams
- Architecture diagrams with drag-and-drop
- System component maps
- Data flow diagrams

#### Diagram Features
- Live editing with preview
- Version history and diffing
- Export (SVG, PNG, PDF)
- Embed in markdown docs
- Link to code and tasks
- AI-assisted generation from descriptions
- Template library

### 4. Interactive Graph View
- **Node Types**:
  - Tasks/issues
  - Code files/modules
  - Concepts/entities
  - Documents
  - People/agents
  - Beads
  - Milestones
- **Relationship Types**:
  - Dependencies (blocks/blocked by)
  - Related to
  - Implements/defined in
  - Parent/child
  - Custom relations
- **Interactions**:
  - Click to focus and show details
  - Double-click to expand/collapse
  - Drag to reposition (saved layouts)
  - Right-click context menu
  - Shift-click to multi-select
  - Path highlighting between nodes
  - Zoom and pan (with minimap)
- **Filters**:
  - By node type
  - By relationship type
  - By metadata (tags, status, date)
  - Shortest path between nodes
  - Connected components
- **Layouts**:
  - Force-directed
  - Hierarchical
  - Circular
  - Timeline
  - Custom saved layouts
- **Analytics**:
  - Centrality metrics
  - Bottleneck detection
  - Critical path analysis
  - Community detection

### 5. Beads Integration
- **Auto-Discovery**:
  - Scan codebase for beads definitions
  - Parse bead structure and relationships
  - Detect data flow patterns
- **Visualization**:
  - Beads hierarchy view
  - Data flow diagrams
  - State transitions
  - Event chains
- **Linking**:
  - Link tasks to specific beads
  - Show beads affected by code changes
  - Track bead development lifecycle
- **Monitoring**:
  - Sync with codebase changes
  - Show modified/outdated beads
  - Highlight breaking changes
- **Documentation**:
  - Auto-generate bead documentation
  - Link to implementation
  - Usage examples

### 6. Markdown Documentation Hub
- **Editor**:
  - Live preview (split or toggle)
  - Syntax highlighting
  - Autocomplete for links
  - Image paste support
  - Table editor
  - Markdown shortcuts (Cmd+B, etc.)
- **Organization**:
  - Folder structure
  - Tags and categories
  - Table of contents auto-generation
  - Breadcrumb navigation
- **Features**:
  - Internal wiki-style links [[page]]
  - Bidirectional links (backlinks)
  - Transclusion/embedding
  - Mermaid diagram embedding
  - Code snippet embedding with syntax highlighting
  - Task embedding (live status)
- **Integration**:
  - Sync with project docs
  - Link to code files
  - Reference from tasks and diagrams
  - Full-text search
  - Recently viewed docs
- **Templates**:
  - ADR (Architecture Decision Records)
  - RFC/Design docs
  - Meeting notes
  - Postmortems
  - API documentation

### 7. Timeline & Milestone Tracking
- **Timeline View**:
  - Gantt-style timeline
  - Milestone markers
  - Deadline visualization
  - Dependency chains
  - Critical path highlighting
- **Milestones**:
  - Create with date, description, deliverables
  - Link tasks to milestones
  - Progress tracking
  - Burndown charts
- **Calendar Integration**:
  - Monthly/weekly/daily views
  - Due date visualization
  - Sprint/iteration markers
  - Release planning

### 8. Intelligent Inbox & Quick Capture
- **Quick Capture**:
  - Global keyboard shortcut (Cmd+Shift+N)
  - Quick-add task with natural language
  - Voice notes (transcribed via API)
  - Screenshot capture with annotations
  - Clipboard monitoring (optional)
- **Inbox**:
  - Unsorted items
  - Processing queue
  - AI-suggested categorization
  - Batch processing actions
  - Convert to tasks/docs/ideas
- **Templates**:
  - Bug report
  - Feature request
  - Research spike
  - Technical debt
  - Question/investigation

### 9. AI-Assisted Features
- **Smart Suggestions**:
  - Task breakdown recommendations
  - Dependency detection
  - Time estimation based on similar tasks
  - Priority suggestions
  - Label/tag suggestions
- **Pattern Recognition**:
  - Recurring blockers
  - Bottleneck identification
  - Under-specified tasks
  - Orphaned items
- **Auto-Generation**:
  - Meeting notes → action items
  - Code changes → changelog entries
  - Issues → tasks with subtasks
  - Natural language → diagrams
- **Insights**:
  - Progress summaries
  - Risk detection
  - Work distribution analysis
  - Velocity tracking
- **Coaching Mode**:
  - Planning guidance
  - Decision frameworks
  - Best practice suggestions
  - Anti-pattern warnings

### 10. Command Palette
- **Universal Search**: Cmd+K or Ctrl+K
- **Actions**:
  - Create new (task, doc, board, diagram)
  - Navigate to (project, board, doc)
  - Execute commands (filter, export, analyze)
  - Recent items
  - Keyboard shortcuts reference
- **Features**:
  - Fuzzy search
  - Keyboard navigation
  - Action preview
  - Contextual results
  - Learning from usage patterns

### 11. Customization & Preferences
- **Workspace Settings**:
  - Theme (dark/light/system)
  - Accent colors
  - Font sizes
  - Density (compact/comfortable/spacious)
- **Board Customization**:
  - Column names and order
  - Card fields
  - Automation rules
  - Default filters
- **View Preferences**:
  - Default views per feature
  - Layout preferences
  - Hidden/shown elements
- **Keyboard Shortcuts**:
  - Customizable hotkeys
  - Vim-style navigation (optional)
  - Quick actions

### 12. Analytics & Insights Dashboard
- **Metrics**:
  - Velocity (tasks completed over time)
  - Cycle time (idea to done)
  - Lead time (request to delivery)
  - Work in progress
  - Task age distribution
  - Burndown/burnup charts
- **Trends**:
  - Progress over time
  - Bottleneck analysis
  - Priority distribution
  - Tag/label frequency
- **Visualizations**:
  - Charts and graphs
  - Heatmaps (activity, completion)
  - Flow diagrams
  - Export as images/PDFs

### 13. Integration Ecosystem
- **Git Integration**:
  - Show branches in context
  - Link commits to tasks
  - PR status indicators
  - Commit message suggestions
  - Branch-specific plans
- **Testing Integration**:
  - Show test coverage per task
  - Link failing tests to tasks
  - Test run history
- **CI/CD Integration**:
  - Build status indicators
  - Deployment tracking
  - Release notes generation
- **External Tools** (optional):
  - GitHub/GitLab issues sync
  - Jira import/export
  - Slack notifications
  - Linear integration

### 14. Export & Import
- **Export Formats**:
  - JSON (full data dump)
  - Markdown (reports, docs)
  - CSV (tasks, metrics)
  - PDF (reports with visualizations)
  - SVG/PNG (diagrams)
- **Import Sources**:
  - JSON (Cartographer backup)
  - CSV (tasks from spreadsheets)
  - GitHub/GitLab issues
  - Jira XML
  - Markdown files
- **Backup**:
  - Automatic periodic backups
  - Git-based versioning
  - Point-in-time restoration

## Architecture

### Directory Structure
```
cartographer/
├── cmd/
│   └── cartographer/
│       └── main.go              # Entry point
├── internal/
│   ├── api/
│   │   ├── rest/                # REST handlers
│   │   ├── websocket/           # WebSocket handlers
│   │   └── graphql/             # GraphQL schema (optional)
│   ├── beads/
│   │   ├── parser.go            # Beads parsing
│   │   ├── analyzer.go          # Beads analysis
│   │   └── visualizer.go        # Beads visualization data
│   ├── storage/
│   │   ├── sqlite.go            # SQLite operations
│   │   ├── files.go             # File-based storage
│   │   └── search.go            # Full-text search
│   ├── domain/
│   │   ├── tasks.go             # Task domain logic
│   │   ├── boards.go            # Board logic
│   │   ├── docs.go              # Documentation logic
│   │   ├── diagrams.go          # Diagram logic
│   │   └── graph.go             # Graph operations
│   ├── ai/
│   │   ├── suggestions.go       # AI suggestions
│   │   ├── patterns.go          # Pattern recognition
│   │   └── coaching.go          # Coaching mode
│   ├── claude/
│   │   ├── integration.go       # Claude Code integration
│   │   ├── sessions.go          # Session tracking
│   │   └── commands.go          # Command handlers
│   ├── analytics/
│   │   ├── metrics.go           # Metrics calculation
│   │   └── insights.go          # Insight generation
│   └── deps/
│       └── updater.go           # Dependency update checker
├── web/
│   ├── static/
│   │   ├── css/
│   │   │   ├── main.css         # Main styles
│   │   │   ├── components.css   # Component styles
│   │   │   └── themes.css       # Theme definitions
│   │   ├── js/
│   │   │   ├── main.js          # Entry point
│   │   │   ├── api.js           # API client
│   │   │   ├── components/      # UI components
│   │   │   ├── views/           # View controllers
│   │   │   └── utils/           # Utilities
│   │   ├── assets/
│   │   │   ├── icons/           # Icon sprites
│   │   │   └── images/          # Images
│   │   └── index.html           # Main HTML
│   └── templates/               # Server-side templates
├── .claude/
│   ├── commands/
│   │   ├── cartographer.sh      # Slash command
│   │   └── map.sh               # Alias
│   └── context/                 # Claude context files
├── data/                        # Data directory (gitignored)
│   ├── cartographer.db          # SQLite database
│   ├── plans/                   # Plan JSON files
│   ├── docs/                    # Markdown docs
│   └── backups/                 # Automatic backups
├── templates/                   # Project templates
│   ├── web-app/
│   ├── api-service/
│   ├── library/
│   └── custom/
├── docs/
│   ├── README.md                # User guide
│   ├── API.md                   # API documentation
│   ├── ARCHITECTURE.md          # System architecture
│   └── CONTRIBUTING.md          # Development guide
├── scripts/
│   ├── install.sh               # Installation script
│   ├── update.sh                # Update script
│   └── backup.sh                # Backup script
├── go.mod
├── go.sum
└── README.md
```

### API Design

#### REST Endpoints
```
# Projects
GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PUT    /api/projects/:id
DELETE /api/projects/:id

# Boards
GET    /api/projects/:id/boards
POST   /api/projects/:id/boards
GET    /api/boards/:id
PUT    /api/boards/:id
DELETE /api/boards/:id

# Tasks
GET    /api/boards/:id/tasks
POST   /api/boards/:id/tasks
GET    /api/tasks/:id
PUT    /api/tasks/:id
PATCH  /api/tasks/:id/move
DELETE /api/tasks/:id
POST   /api/tasks/batch

# Docs
GET    /api/projects/:id/docs
POST   /api/projects/:id/docs
GET    /api/docs/:id
PUT    /api/docs/:id
DELETE /api/docs/:id

# Diagrams
GET    /api/projects/:id/diagrams
POST   /api/projects/:id/diagrams
GET    /api/diagrams/:id
PUT    /api/diagrams/:id
DELETE /api/diagrams/:id

# Graph
GET    /api/projects/:id/graph
GET    /api/graph/path/:from/:to

# Beads
GET    /api/projects/:id/beads
GET    /api/beads/:id

# Search
GET    /api/search?q=:query
GET    /api/search/tasks?q=:query
GET    /api/search/docs?q=:query

# Analytics
GET    /api/projects/:id/analytics
GET    /api/projects/:id/insights

# AI
POST   /api/ai/suggest
POST   /api/ai/generate
POST   /api/ai/analyze

# Claude Integration
POST   /api/claude/session/start
POST   /api/claude/session/:id/event
GET    /api/claude/session/:id/history

# Inbox
GET    /api/inbox
POST   /api/inbox
POST   /api/inbox/:id/process
```

#### WebSocket Events
```javascript
// Client → Server
{
  "type": "subscribe",
  "resource": "project:123",
  "events": ["task.*", "board.*"]
}

// Server → Client
{
  "type": "task.created",
  "data": { /* task object */ },
  "timestamp": "2025-10-23T10:30:00Z"
}

{
  "type": "task.updated",
  "data": { /* task object */ },
  "changes": ["status", "assignee"],
  "timestamp": "2025-10-23T10:30:01Z"
}
```

## User Experience Details

### First-Run Experience
1. Welcome screen with quick tour
2. Create first project or import existing
3. Auto-scan codebase and suggest structure
4. Offer templates based on detected project type
5. Create sample tasks to demonstrate features
6. Show keyboard shortcuts cheatsheet

### Empty States
- Beautiful, encouraging illustrations
- Clear call-to-action buttons
- Helpful tips and suggestions
- Example templates/content
- Quick-start guides

### Loading States
- Skeleton screens for fast perceived performance
- Progressive loading (show partial data)
- Loading indicators with context
- Optimistic UI updates

### Error States
- Friendly, helpful error messages
- Suggest solutions or alternatives
- Option to retry or undo
- Contact/feedback mechanism
- Error tracking (local logs)

### Keyboard Navigation
- Vim-style navigation (optional)
- Tab/Shift+Tab for form fields
- Arrow keys in lists
- Escape to close/cancel
- Enter to confirm/open
- Space to select/toggle
- / to focus search
- ? to show shortcuts

### Responsive Breakpoints
- Desktop: 1024px+ (full features)
- Tablet: 768px-1023px (adapted layouts)
- Mobile: <768px (view-only, essential features)

### Animations
- Smooth transitions between views (300ms)
- Card drag-and-drop with physics
- Graph node animations (spring physics)
- Subtle hover effects (100ms)
- Page transitions (fade/slide)
- Loading spinners
- Success/error toasts (auto-dismiss)

### Accessibility
- Semantic HTML5
- ARIA labels and roles
- Focus indicators
- Screen reader support
- Keyboard navigation
- Color contrast (WCAG AA)
- Reduced motion support
- Font size scaling

### Performance Targets
- First contentful paint: <1s
- Time to interactive: <2s
- Smooth 60fps animations
- <100ms API response times
- Instant local search
- Virtual scrolling for large lists
- Lazy loading for images/diagrams

## Implementation Phases

### Phase 1: Foundation (Week 1-2)
**Goal**: Basic functional prototype

1. **Backend Scaffolding**
   - Go project structure
   - Basic HTTP server
   - SQLite setup
   - File-based storage
   - Beads dependency integration

2. **Core Domain Models**
   - Projects
   - Tasks
   - Boards
   - Basic CRUD operations

3. **Simple Web UI**
   - Basic HTML/CSS/JS setup
   - Single-page app shell
   - Navigation structure
   - Design system basics

4. **Claude Code Integration**
   - Slash command setup
   - Basic API for task creation
   - Project context detection

**Deliverable**: Create and view tasks in a basic kanban board via web UI and Claude Code.

### Phase 2: Enhanced Features (Week 3-4)
**Goal**: Rich, usable interface

1. **Advanced Kanban**
   - Drag-and-drop
   - Card details panel
   - Filters and search
   - Multiple boards

2. **Markdown Documentation**
   - Editor with preview
   - File browser
   - Internal linking
   - Search

3. **Beads Visualization**
   - Parser implementation
   - Basic visualization
   - Task linking

4. **Graph View (Basic)**
   - Task dependencies
   - Simple force-directed layout
   - Click to focus

**Deliverable**: Full-featured kanban with docs and basic beads integration.

### Phase 3: Intelligence & Visualization (Week 5-6)
**Goal**: Smart, insightful tool

1. **Diagrams**
   - Mermaid integration
   - Editor with preview
   - Version history
   - Railroad diagrams

2. **Enhanced Graph View**
   - Multiple node types
   - Advanced layouts
   - Filtering and analytics
   - Path finding

3. **AI Features**
   - Task suggestions
   - Pattern recognition
   - Smart categorization
   - Insight generation

4. **Timeline & Milestones**
   - Gantt view
   - Milestone tracking
   - Deadline visualization

**Deliverable**: Intelligent planning tool with rich visualizations.

### Phase 4: Polish & Integration (Week 7-8)
**Goal**: Production-ready, delightful to use

1. **UX Refinement**
   - Animations and transitions
   - Empty states
   - Error handling
   - Keyboard shortcuts
   - Command palette

2. **Advanced Integration**
   - Git integration
   - Session streaming
   - Real-time collaboration (WebSocket)
   - Import/export

3. **Analytics Dashboard**
   - Metrics calculation
   - Charts and graphs
   - Insights panel
   - Progress tracking

4. **Performance & Polish**
   - Optimization
   - Testing
   - Documentation
   - Templates

**Deliverable**: Complete, polished Cartographer ready for daily use.

## Technical Requirements

### Backend Standards
- **Error Handling**: Consistent error types, meaningful messages
- **Logging**: Structured logging (zerolog or similar)
- **Testing**: Unit tests for domain logic, integration tests for APIs
- **Validation**: Input validation on all endpoints
- **Transactions**: Use DB transactions for multi-step operations
- **Idempotency**: Safe to retry operations
- **Rate Limiting**: Prevent abuse (even locally)

### Frontend Standards
- **Code Style**: ESLint + Prettier
- **State Management**: Simple, predictable (event-driven or reactive)
- **Error Boundaries**: Graceful degradation
- **Testing**: Unit tests for utilities, integration tests for workflows
- **Bundle Size**: Keep under 500KB total
- **Progressive Enhancement**: Core features work without JS

### API Standards
- **RESTful**: Consistent resource naming
- **HTTP Methods**: Proper use of GET/POST/PUT/PATCH/DELETE
- **Status Codes**: Meaningful HTTP status codes
- **JSON**: Consistent JSON structure
- **Versioning**: API versioning strategy (header or URL)
- **CORS**: Properly configured for local-only access
- **Rate Limiting**: Header-based communication

### Security Standards
- **Localhost Only**: Bind to 127.0.0.1
- **No External Calls**: All data stays local
- **CSRF Protection**: Token-based protection
- **Input Sanitization**: Prevent XSS and injection
- **Content Security Policy**: Strict CSP headers
- **Secure Defaults**: Security by default, not opt-in

## Data Models

### Core Entities

#### Project
```json
{
  "id": "uuid",
  "name": "string",
  "description": "string",
  "path": "/absolute/path/to/repo",
  "type": "web-app|api|library|custom",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "settings": {
    "default_board": "uuid",
    "theme": "dark|light|system"
  },
  "metadata": {
    "git_remote": "string",
    "primary_language": "string",
    "framework": "string"
  }
}
```

#### Task
```json
{
  "id": "uuid",
  "board_id": "uuid",
  "title": "string",
  "description": "markdown",
  "status": "string",
  "priority": "low|medium|high|urgent",
  "assignee": {
    "type": "human|agent",
    "id": "string",
    "name": "string"
  },
  "labels": ["string"],
  "due_date": "timestamp",
  "estimate": "number (hours)",
  "actual": "number (hours)",
  "dependencies": ["task_uuid"],
  "blocks": ["task_uuid"],
  "related": ["task_uuid"],
  "linked_items": [
    {
      "type": "doc|diagram|bead|file|commit",
      "id": "string",
      "path": "string"
    }
  ],
  "checklist": [
    {
      "id": "uuid",
      "text": "string",
      "completed": "boolean"
    }
  ],
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "created_by": {
    "type": "human|agent",
    "id": "string"
  },
  "activity": [
    {
      "type": "created|updated|commented|moved",
      "user": "string",
      "timestamp": "timestamp",
      "changes": "object",
      "comment": "string"
    }
  ]
}
```

#### Board
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "string",
  "description": "string",
  "columns": [
    {
      "id": "uuid",
      "name": "string",
      "wip_limit": "number",
      "order": "number"
    }
  ],
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

#### Document
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "title": "string",
  "content": "markdown",
  "path": "/docs/path/file.md",
  "tags": ["string"],
  "linked_from": ["doc_uuid"],
  "links_to": ["doc_uuid"],
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "versions": [
    {
      "version": "number",
      "timestamp": "timestamp",
      "content": "markdown",
      "changed_by": "string"
    }
  ]
}
```

#### Diagram
```json
{
  "id": "uuid",
  "project_id": "uuid",
  "name": "string",
  "type": "mermaid|railroad|custom",
  "content": "string (diagram source)",
  "created_at": "timestamp",
  "updated_at": "timestamp",
  "versions": [
    {
      "version": "number",
      "timestamp": "timestamp",
      "content": "string"
    }
  ]
}
```

## Testing Strategy

### Backend Testing
- Unit tests for domain logic (>80% coverage)
- Integration tests for API endpoints
- Beads parsing tests with fixtures
- Database tests with test DB
- WebSocket connection tests

### Frontend Testing
- Component unit tests
- Integration tests for key workflows
- End-to-end tests (Playwright)
- Accessibility tests
- Performance tests (Lighthouse)

### Agent Testing
- API contract tests
- Claude Code integration tests
- Session replay tests
- Error scenario tests

## Documentation

### User Documentation
1. **README.md**: Quick start, features overview, installation
2. **User Guide**: Comprehensive feature documentation with screenshots
3. **Keyboard Shortcuts**: Printable reference
4. **Video Tutorials**: Short screencasts for key features
5. **FAQ**: Common questions and troubleshooting

### Developer Documentation
1. **ARCHITECTURE.md**: System design, decisions, patterns
2. **API.md**: Complete API reference with examples
3. **CONTRIBUTING.md**: How to contribute, coding standards
4. **BEADS.md**: How beads integration works
5. **CLAUDE.md**: How to use with Claude Code

### Agent Documentation
1. **API Reference**: Machine-readable schema (OpenAPI)
2. **Usage Examples**: Common workflows in Claude Code
3. **Data Models**: JSON schemas for all entities
4. **Best Practices**: How agents should use Cartographer

## Success Metrics

### For Humans
- Time from idea to task: <30 seconds
- Time to find information: <10 seconds
- Daily active use: 5+ times per day
- User satisfaction: "delightful to use"
- Onboarding time: <5 minutes

### For Agents
- API response time: <100ms p95
- Task creation success rate: >99%
- Context retrieval accuracy: >95%
- Integration reliability: >99.9% uptime

### For Projects
- Planning time reduction: 50%+
- Decision-making speed: 2x faster
- Context switching time: -60%
- Team alignment: improved clarity
- Project success rate: measurable increase

## Deployment & Distribution

### Installation
```bash
# Build from source
git clone https://github.com/yourusername/cartographer
cd cartographer
go build -o cartographer cmd/cartographer/main.go

# Install to PATH
sudo mv cartographer /usr/local/bin/

# Or use go install
go install github.com/yourusername/cartographer@latest
```

### Configuration
- Config file: `~/.cartographer/config.json`
- Data directory: `~/.cartographer/data/`
- Port: 8080 (configurable)
- Host: 127.0.0.1 (locked)

### Updates
- Auto-check for updates on launch
- Optional auto-update
- Manual update via `cartographer update`
- Backup before update

### Claude Code Setup
```bash
# Add to Claude Code commands
mkdir -p ~/.claude/commands/
cat > ~/.claude/commands/cartographer.sh << 'EOF'
#!/bin/bash
cartographer serve --project="$PWD"
EOF
chmod +x ~/.claude/commands/cartographer.sh
```

## Future Enhancements (Post-MVP)

### Advanced Features
- Multi-project workspaces
- Team collaboration (multiplayer)
- Mobile companion app
- Plugin system for extensibility
- Custom automation rules
- Advanced AI coaching
- Voice commands
- AR/VR visualization (experimental)

### Integrations
- VS Code extension
- JetBrains plugin
- GitHub Actions
- Notion sync
- Obsidian integration
- Figma design import

### Intelligence
- Predictive analytics
- Risk forecasting
- Resource optimization
- Auto-scheduling
- Smart notifications
- Learning from patterns

## Design Principles

1. **Clarity First**: If it's confusing, it's wrong
2. **Speed Matters**: Every interaction should feel instant
3. **Progressive Disclosure**: Show complexity only when needed
4. **Keyboard Love**: Every action accessible via keyboard
5. **Agent-Ready**: APIs as important as UI
6. **Local First**: Your data, your machine, your control
7. **Delightful Details**: Sweat the small stuff
8. **Learning System**: Gets better the more you use it
9. **Opinionated Flexibility**: Strong defaults, deep customization
10. **Build to Last**: Architecture for the long term

## Getting Started (Implementation Order)

### Step 1: Scaffold (Day 1)
1. Create Go project structure
2. Set up basic HTTP server with health check endpoint
3. Initialize SQLite database with projects and tasks tables
4. Create basic HTML page that loads from Go server
5. Test that you can run `go run cmd/cartographer/main.go` and see a page at `localhost:8080`

### Step 2: Core Backend (Days 2-3)
1. Implement CRUD operations for projects and tasks
2. Create REST API endpoints for tasks and projects
3. Add basic beads integration (read and parse beads from a Go project)
4. Set up file-based storage for JSON plans
5. Create WebSocket endpoint for real-time updates

### Step 3: Basic UI (Days 4-5)
1. Create kanban board HTML structure
2. Style board with CSS (use codelift.space as inspiration)
3. Implement JavaScript to fetch and display tasks
4. Add drag-and-drop for tasks between columns
5. Create task detail modal with edit functionality

### Step 4: Claude Code Integration (Day 6-7)
1. Create `/cartographer` slash command script
2. Implement API endpoints for agent task creation
3. Add project detection from current directory
4. Test creating tasks via Claude Code commands
5. Add session logging

### Step 5: Essential Features (Days 8-10)
1. Add markdown editor for documentation
2. Implement basic graph view with dependencies
3. Add search across tasks and docs
4. Create command palette (Cmd+K)
5. Implement keyboard shortcuts

### Step 6: Polish (Days 11-14)
1. Add animations and transitions
2. Implement empty states and error handling
3. Create user preferences system
4. Add dark/light theme toggle
5. Write documentation
6. Create example templates
7. Add analytics dashboard
8. Comprehensive testing

## Notes for Claude Code

- **Start Simple**: Build the MVP first, then enhance
- **Test Early**: Ensure each component works before moving on
- **Keep It Fast**: Performance matters - profile and optimize
- **Think Agent-First**: Every feature should be API-accessible
- **Beautiful Defaults**: Make it look great out of the box
- **Documentation**: Comment code clearly, write docs as you build
- **Error Messages**: Make them helpful and actionable
- **Commit Often**: Small, focused commits with clear messages

## Inspiration & References

- **Aesthetic**: https://codelift.space (clean, terminal-inspired)
- **Beads Framework**: https://github.com/steveyegge/beads
- **Graph Visualization**: Obsidian graph view, Roam Research
- **Kanban**: Linear, Height, Monday.com (but simpler, faster)
- **Diagramming**: Mermaid.js, Excalidraw, tldraw
- **Command Palette**: Raycast, Linear, VS Code
- **Local-First**: Notion, Obsidian, Logseq

---

**Remember**: Cartographer should feel like an extension of your mind - helping you think clearly, plan effectively, and navigate complexity with confidence. Build something you'd love to use every day.