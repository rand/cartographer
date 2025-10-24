// Package beads provides integration with the Beads issue tracking framework.
//
// This package allows Cartographer to read and analyze beads from .beads/issues.jsonl files,
// convert them to Cartographer domain models, and analyze their dependency relationships.
//
// Main functions:
//   - ReadBeadsFromProject: Read beads from a project's .beads directory
//   - AnalyzeBeadDependencies: Analyze dependency relationships between beads
//   - ConvertBeadToTask: Convert a single bead to a Cartographer task
//   - ConvertBeadsToTasks: Convert multiple beads to tasks
package beads

import (
	"fmt"

	"github.com/rand/cartographer/internal/domain"
	"github.com/steveyegge/beads"
)

// ReadBeadsFromProject reads beads from a project's .beads/issues.jsonl file
// This is the main entry point for loading beads from a Go project
//
// Example:
//
//	beads, err := beads.ReadBeadsFromProject("/path/to/project")
//	if err != nil {
//	    log.Fatal(err)
//	}
func ReadBeadsFromProject(projectPath string) ([]*beads.Issue, error) {
	parser := NewParser(projectPath)
	return parser.ReadBeadsFromProject()
}

// AnalyzeBeadDependencies analyzes the dependency relationships between beads
// Returns a map of dependency types to lists of related issue IDs
//
// The returned map contains:
//   - "depends_on": Issues that this issue depends on
//   - "blocks": Issues that are blocked by this issue
//   - "related": Issues that are related to this issue
//   - "parent_child": Parent-child relationships
//
// Example:
//
//	deps, err := beads.AnalyzeBeadDependencies(beads)
//	if err != nil {
//	    log.Fatal(err)
//	}
//	for issueID, relationships := range deps {
//	    fmt.Printf("%s has dependencies: %v\n", issueID, relationships)
//	}
func AnalyzeBeadDependencies(beads []*beads.Issue) (map[string]map[string][]string, error) {
	analyzer := NewAnalyzer(beads)
	graph, err := analyzer.BuildDependencyGraph()
	if err != nil {
		return nil, err
	}

	// Build a comprehensive result map
	result := make(map[string]map[string][]string)

	// Collect all unique issue IDs
	issueIDs := make(map[string]bool)
	for _, issue := range beads {
		issueIDs[issue.ID] = true
	}

	// Build result for each issue
	for issueID := range issueIDs {
		result[issueID] = make(map[string][]string)

		if deps, ok := graph.DependsOn[issueID]; ok {
			result[issueID]["depends_on"] = deps
		}

		if blocks, ok := graph.Blocks[issueID]; ok {
			result[issueID]["blocks"] = blocks
		}

		if related, ok := graph.Related[issueID]; ok {
			result[issueID]["related"] = related
		}

		if children, ok := graph.ParentChild[issueID]; ok {
			result[issueID]["children"] = children
		}

		if discoveredFrom, ok := graph.DiscoveredFrom[issueID]; ok {
			result[issueID]["discovered_from"] = discoveredFrom
		}
	}

	return result, nil
}

// ConvertBeadToTask converts a single bead to a Cartographer task
// Requires projectID and boardID to associate the task with a board
//
// Example:
//
//	task, err := beads.ConvertBeadToTask(bead, "project-123", "board-456")
//	if err != nil {
//	    log.Fatal(err)
//	}
func ConvertBeadToTask(bead *beads.Issue, projectID, boardID string) (*domain.Task, error) {
	converter := NewConverter(projectID, boardID)
	return converter.ConvertBeadToTask(bead)
}

// ConvertBeadsToTasks converts multiple beads to Cartographer tasks
// Requires projectID and boardID to associate the tasks with a board
//
// Example:
//
//	tasks, err := beads.ConvertBeadsToTasks(beads, "project-123", "board-456")
//	if err != nil {
//	    log.Fatal(err)
//	}
func ConvertBeadsToTasks(beads []*beads.Issue, projectID, boardID string) ([]*domain.Task, error) {
	converter := NewConverter(projectID, boardID)
	return converter.ConvertBeadsToTasks(beads)
}

// AnalysisResult provides comprehensive analysis of beads including dependencies
type AnalysisResult struct {
	// Total number of beads analyzed
	TotalBeads int

	// Dependency graph
	Graph *DependencyGraph

	// Issues that are blocked by other issues
	BlockedIssues []BlockedIssueInfo

	// Issues that are ready to work on (no open blockers)
	ReadyIssues []*beads.Issue

	// Circular dependencies detected (if any)
	CircularDependencies [][]string

	// Statistics by status, type, priority
	Statistics map[string]interface{}
}

// AnalyzeProject performs a comprehensive analysis of a project's beads
// This is a convenience function that combines reading, parsing, and analysis
//
// Example:
//
//	result, err := beads.AnalyzeProject("/path/to/project")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Printf("Found %d beads\n", result.TotalBeads)
//	fmt.Printf("Ready to work: %d beads\n", len(result.ReadyIssues))
//	fmt.Printf("Blocked: %d beads\n", len(result.BlockedIssues))
func AnalyzeProject(projectPath string) (*AnalysisResult, error) {
	// Read beads
	beads, err := ReadBeadsFromProject(projectPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read beads: %w", err)
	}

	// Create analyzer
	analyzer := NewAnalyzer(beads)

	// Build dependency graph
	graph, err := analyzer.BuildDependencyGraph()
	if err != nil {
		return nil, fmt.Errorf("failed to build dependency graph: %w", err)
	}

	// Get blocked issues
	blockedIssues, err := analyzer.GetBlockedIssues()
	if err != nil {
		return nil, fmt.Errorf("failed to get blocked issues: %w", err)
	}

	// Get ready issues
	readyIssues, err := analyzer.GetReadyIssues()
	if err != nil {
		return nil, fmt.Errorf("failed to get ready issues: %w", err)
	}

	// Detect circular dependencies
	cycles, err := analyzer.DetectCircularDependencies()
	if err != nil {
		return nil, fmt.Errorf("failed to detect circular dependencies: %w", err)
	}

	// Get statistics
	stats := GetBeadsStatistics(beads)

	return &AnalysisResult{
		TotalBeads:           len(beads),
		Graph:                graph,
		BlockedIssues:        blockedIssues,
		ReadyIssues:          readyIssues,
		CircularDependencies: cycles,
		Statistics:           stats,
	}, nil
}

// ImportBeadsToBoard imports beads from a project into a Cartographer board
// This is a high-level convenience function for the common use case
//
// Example:
//
//	tasks, err := beads.ImportBeadsToBoard("/path/to/project", "project-123", "board-456")
//	if err != nil {
//	    log.Fatal(err)
//	}
//	fmt.Printf("Imported %d tasks\n", len(tasks))
func ImportBeadsToBoard(projectPath, projectID, boardID string) ([]*domain.Task, error) {
	// Read beads
	beads, err := ReadBeadsFromProject(projectPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read beads: %w", err)
	}

	// Convert to tasks
	tasks, err := ConvertBeadsToTasks(beads, projectID, boardID)
	if err != nil {
		return nil, fmt.Errorf("failed to convert beads to tasks: %w", err)
	}

	return tasks, nil
}
