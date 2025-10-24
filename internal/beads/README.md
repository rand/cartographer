# Beads Integration for Cartographer

This package provides integration between the Beads issue tracking framework and Cartographer's project planning system.

## Overview

The Beads integration allows Cartographer to:
- Read and parse `.beads/issues.jsonl` files from Go projects
- Analyze dependency relationships between beads
- Convert beads to Cartographer tasks
- Detect blocked and ready-to-work issues
- Identify circular dependencies

## Files Created

### Core Implementation

1. **parser.go** (4.5KB)
   - `Parser`: Handles reading JSONL files
   - `ReadBeadsFromProject()`: Main entry point for reading beads
   - `ReadBeadsFromJSONL()`: Read from custom JSONL paths
   - `FindBeadsProjects()`: Search for projects with beads
   - `GetBeadsStatistics()`: Summary statistics for beads

2. **analyzer.go** (9.0KB)
   - `Analyzer`: Analyzes bead relationships and dependencies
   - `DependencyGraph`: Graph structure for dependencies
   - `BuildDependencyGraph()`: Constructs dependency graph
   - `GetBlockedIssues()`: Find issues blocked by dependencies
   - `GetReadyIssues()`: Find issues ready to work on
   - `DetectCircularDependencies()`: Identify dependency cycles
   - `GetDependencyChain()`: Get transitive dependencies

3. **converter.go** (7.7KB)
   - `Converter`: Converts between Beads and Cartographer types
   - `ConvertBeadToTask()`: Convert single bead to task
   - `ConvertBeadsToTasks()`: Convert multiple beads to tasks
   - `ConvertTaskToBead()`: Convert task back to bead (for syncing)
   - Type conversion utilities for status, priority, issue types

4. **beads.go** (6.6KB)
   - Public API with convenience functions
   - `ReadBeadsFromProject()`: Read beads from project
   - `AnalyzeBeadDependencies()`: Analyze dependency map
   - `ConvertBeadToTask()`: Convert bead to task
   - `AnalyzeProject()`: Comprehensive project analysis
   - `ImportBeadsToBoard()`: High-level import function

5. **example_test.go** (7.4KB)
   - Comprehensive integration tests
   - `TestBeadsIntegration`: Full workflow test
   - `TestCircularDependencies`: Cycle detection test
   - Helper functions for creating sample data

## Usage Examples

### Basic: Read Beads from a Project

```go
import "github.com/rand/cartographer/internal/beads"

// Read beads from a project
beadIssues, err := beads.ReadBeadsFromProject("/path/to/project")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Found %d beads\n", len(beadIssues))
```

### Analyze Dependencies

```go
// Analyze dependency relationships
deps, err := beads.AnalyzeBeadDependencies(beadIssues)
if err != nil {
    log.Fatal(err)
}

// Check what each issue depends on
for issueID, relationships := range deps {
    if dependsOn, ok := relationships["depends_on"]; ok && len(dependsOn) > 0 {
        fmt.Printf("%s depends on: %v\n", issueID, dependsOn)
    }
}
```

### Convert Beads to Tasks

```go
// Convert a single bead to a task
task, err := beads.ConvertBeadToTask(beadIssues[0], "project-123", "board-456")
if err != nil {
    log.Fatal(err)
}

// Or convert all beads
tasks, err := beads.ConvertBeadsToTasks(beadIssues, "project-123", "board-456")
if err != nil {
    log.Fatal(err)
}
```

### Comprehensive Project Analysis

```go
// Perform full analysis
result, err := beads.AnalyzeProject("/path/to/project")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Total beads: %d\n", result.TotalBeads)
fmt.Printf("Ready to work: %d\n", len(result.ReadyIssues))
fmt.Printf("Blocked: %d\n", len(result.BlockedIssues))

if len(result.CircularDependencies) > 0 {
    fmt.Printf("Warning: Found %d circular dependency cycles\n", len(result.CircularDependencies))
}

// Access statistics
if stats, ok := result.Statistics["by_status"]; ok {
    fmt.Printf("Status breakdown: %v\n", stats)
}
```

### Import Beads to a Board

```go
// High-level import function
tasks, err := beads.ImportBeadsToBoard("/path/to/project", "project-123", "board-456")
if err != nil {
    log.Fatal(err)
}

fmt.Printf("Imported %d tasks to board\n", len(tasks))
```

### Advanced: Custom Analysis

```go
// Create custom analyzer
analyzer := beads.NewAnalyzer(beadIssues)

// Build dependency graph
graph, err := analyzer.BuildDependencyGraph()
if err != nil {
    log.Fatal(err)
}

// Find what issues are blocked
blockedIssues, err := analyzer.GetBlockedIssues()
if err != nil {
    log.Fatal(err)
}

for _, blocked := range blockedIssues {
    fmt.Printf("%s is blocked by: %v\n", blocked.IssueID, blocked.BlockedBy)
}

// Get dependency chain for specific issue
chain, err := analyzer.GetDependencyChain("bd-5")
if err != nil {
    log.Fatal(err)
}
fmt.Printf("Full dependency chain: %v\n", chain)
```

## Type Conversions

### Status Mapping

| Beads Status      | Cartographer Status |
|-------------------|---------------------|
| `open`            | `todo`              |
| `in_progress`     | `in_progress`       |
| `blocked`         | `blocked`           |
| `closed`          | `done`              |

### Priority Mapping

| Beads Priority    | Cartographer Priority |
|-------------------|-----------------------|
| 0-1               | `low`                 |
| 2                 | `medium`              |
| 3                 | `high`                |
| 4                 | `urgent`              |

### Issue Type Mapping

| Beads Type        | Task Label Hint       |
|-------------------|-----------------------|
| `bug`             | `bug`, `fix`          |
| `feature`         | `feature`, `enhancement` |
| `task`            | (default)             |
| `epic`            | `epic`                |
| `chore`           | `chore`, `maintenance`|

## Dependency Types

The analyzer handles four types of dependencies from Beads:

1. **blocks**: Issue A blocks Issue B (B depends on A)
2. **related**: Bidirectional relationship between issues
3. **parent-child**: Hierarchical relationship (epics, sub-tasks)
4. **discovered-from**: Tracks issue origins

## Data Structures

### DependencyGraph

```go
type DependencyGraph struct {
    DependsOn      map[string][]string  // issue -> dependencies
    Blocks         map[string][]string  // issue -> blocked issues
    Related        map[string][]string  // issue -> related issues
    ParentChild    map[string][]string  // parent -> children
    DiscoveredFrom map[string][]string  // issue -> origins
}
```

### BlockedIssueInfo

```go
type BlockedIssueInfo struct {
    IssueID   string
    BlockedBy []string
    Issue     *beads.Issue
}
```

### AnalysisResult

```go
type AnalysisResult struct {
    TotalBeads           int
    Graph                *DependencyGraph
    BlockedIssues        []BlockedIssueInfo
    ReadyIssues          []*beads.Issue
    CircularDependencies [][]string
    Statistics           map[string]interface{}
}
```

## Testing

Run tests with:

```bash
go test -v ./internal/beads/...
```

The test suite includes:
- Reading and parsing JSONL files
- Dependency analysis
- Type conversions
- Blocked/ready issue detection
- Circular dependency detection
- Full integration workflow

All tests pass successfully.

## Dependencies

- `github.com/steveyegge/beads v0.15.0` - Official Beads package
- Uses public API only (no internal package dependencies)

## Integration with Cartographer

The beads package integrates with Cartographer's domain models:

- `internal/domain.Task` - Cartographer's task model
- `internal/domain.Board` - Cartographer's board model
- `internal/domain.Project` - Cartographer's project model

Beads are converted to tasks with:
- Linked items pointing back to the original bead
- Activity entries from bead comments
- Proper status and priority mapping
- Dependencies and relationships preserved

## Future Enhancements

Potential improvements:
1. Bidirectional sync (write changes back to beads)
2. Real-time monitoring of `.beads/issues.jsonl` changes
3. Advanced circular dependency resolution
4. Integration with Cartographer's storage layer
5. WebSocket updates when beads change
6. Visual dependency graph rendering

## Notes

- The package uses the public Beads API (`github.com/steveyegge/beads`)
- All issue types from Beads are supported
- Circular dependency detection has limitations (noted in tests)
- Conversion preserves all metadata where possible
- Estimate conversion: Beads minutes → Cartographer hours
