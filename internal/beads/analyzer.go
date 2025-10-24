// Package beads provides integration with the Beads issue tracking framework.
package beads

import (
	"fmt"

	"github.com/steveyegge/beads"
)

// DependencyGraph represents the dependency relationships between beads
type DependencyGraph struct {
	// Adjacency list: issue ID -> list of IDs it depends on
	DependsOn map[string][]string

	// Reverse adjacency list: issue ID -> list of IDs that depend on it
	Blocks map[string][]string

	// Related issues (bidirectional)
	Related map[string][]string

	// Parent-child relationships
	ParentChild map[string][]string

	// Discovered-from relationships (for tracking issue origins)
	DiscoveredFrom map[string][]string
}

// NewDependencyGraph creates a new empty dependency graph
func NewDependencyGraph() *DependencyGraph {
	return &DependencyGraph{
		DependsOn:      make(map[string][]string),
		Blocks:         make(map[string][]string),
		Related:        make(map[string][]string),
		ParentChild:    make(map[string][]string),
		DiscoveredFrom: make(map[string][]string),
	}
}

// Analyzer provides methods for analyzing bead relationships and dependencies
type Analyzer struct {
	issues []*beads.Issue
	graph  *DependencyGraph
}

// NewAnalyzer creates a new analyzer for the given set of beads
func NewAnalyzer(issues []*beads.Issue) *Analyzer {
	return &Analyzer{
		issues: issues,
		graph:  NewDependencyGraph(),
	}
}

// BuildDependencyGraph constructs the dependency graph from the beads
// This analyzes all dependency relationships and builds the graph structure
func (a *Analyzer) BuildDependencyGraph() (*DependencyGraph, error) {
	// Create a map for quick issue lookup
	issueMap := make(map[string]*beads.Issue)
	for _, issue := range a.issues {
		issueMap[issue.ID] = issue
	}

	// Process each issue's dependencies
	for _, issue := range a.issues {
		if issue.Dependencies == nil {
			continue
		}

		for _, dep := range issue.Dependencies {
			// Validate that the dependency target exists
			if _, exists := issueMap[dep.DependsOnID]; !exists {
				// Note: We don't error here, just skip invalid dependencies
				// This allows for dependencies on issues not in the current dataset
				continue
			}

			// Add to appropriate graph based on dependency type
			switch dep.Type {
			case beads.DepBlocks:
				// dep.IssueID depends on dep.DependsOnID
				// So dep.DependsOnID blocks dep.IssueID
				a.graph.DependsOn[dep.IssueID] = append(a.graph.DependsOn[dep.IssueID], dep.DependsOnID)
				a.graph.Blocks[dep.DependsOnID] = append(a.graph.Blocks[dep.DependsOnID], dep.IssueID)

			case beads.DepRelated:
				// Bidirectional relationship
				a.graph.Related[dep.IssueID] = append(a.graph.Related[dep.IssueID], dep.DependsOnID)
				a.graph.Related[dep.DependsOnID] = append(a.graph.Related[dep.DependsOnID], dep.IssueID)

			case beads.DepParentChild:
				// dep.DependsOnID is parent of dep.IssueID
				a.graph.ParentChild[dep.DependsOnID] = append(a.graph.ParentChild[dep.DependsOnID], dep.IssueID)

			case beads.DepDiscoveredFrom:
				// dep.IssueID was discovered from dep.DependsOnID
				a.graph.DiscoveredFrom[dep.IssueID] = append(a.graph.DiscoveredFrom[dep.IssueID], dep.DependsOnID)
			}
		}
	}

	a.graph = removeDuplicates(a.graph)
	return a.graph, nil
}

// GetBlockedIssues returns all issues that are blocked by other issues
// An issue is blocked if it has dependencies that are not yet closed
func (a *Analyzer) GetBlockedIssues() ([]BlockedIssueInfo, error) {
	if a.graph == nil {
		if _, err := a.BuildDependencyGraph(); err != nil {
			return nil, err
		}
	}

	// Create a map for quick issue lookup
	issueMap := make(map[string]*beads.Issue)
	for _, issue := range a.issues {
		issueMap[issue.ID] = issue
	}

	var blockedIssues []BlockedIssueInfo

	for issueID, deps := range a.graph.DependsOn {
		issue, exists := issueMap[issueID]
		if !exists || issue.Status == beads.StatusClosed {
			continue
		}

		var blockingIssues []string
		for _, depID := range deps {
			depIssue, exists := issueMap[depID]
			if exists && depIssue.Status != beads.StatusClosed {
				blockingIssues = append(blockingIssues, depID)
			}
		}

		if len(blockingIssues) > 0 {
			blockedIssues = append(blockedIssues, BlockedIssueInfo{
				IssueID:        issueID,
				BlockedBy:      blockingIssues,
				Issue:          issue,
			})
		}
	}

	return blockedIssues, nil
}

// GetReadyIssues returns all issues that are ready to work on
// An issue is ready if it's open/in_progress and has no open blockers
func (a *Analyzer) GetReadyIssues() ([]*beads.Issue, error) {
	if a.graph == nil {
		if _, err := a.BuildDependencyGraph(); err != nil {
			return nil, err
		}
	}

	blockedIssues, err := a.GetBlockedIssues()
	if err != nil {
		return nil, err
	}

	// Create a set of blocked issue IDs for quick lookup
	blockedSet := make(map[string]bool)
	for _, blocked := range blockedIssues {
		blockedSet[blocked.IssueID] = true
	}

	// Find ready issues
	var readyIssues []*beads.Issue
	for _, issue := range a.issues {
		// Skip closed issues
		if issue.Status == beads.StatusClosed {
			continue
		}

		// Skip blocked issues
		if blockedSet[issue.ID] {
			continue
		}

		readyIssues = append(readyIssues, issue)
	}

	return readyIssues, nil
}

// DetectCircularDependencies detects circular dependencies in the dependency graph
// Returns a list of cycles found, where each cycle is a list of issue IDs
func (a *Analyzer) DetectCircularDependencies() ([][]string, error) {
	if a.graph == nil {
		if _, err := a.BuildDependencyGraph(); err != nil {
			return nil, err
		}
	}

	var cycles [][]string
	visited := make(map[string]bool)
	recStack := make(map[string]bool)
	path := []string{}

	var dfs func(issueID string) bool
	dfs = func(issueID string) bool {
		visited[issueID] = true
		recStack[issueID] = true
		path = append(path, issueID)

		// Check all dependencies
		for _, depID := range a.graph.DependsOn[issueID] {
			if !visited[depID] {
				if dfs(depID) {
					return true
				}
			} else if recStack[depID] {
				// Found a cycle
				cycleStart := -1
				for i, id := range path {
					if id == depID {
						cycleStart = i
						break
					}
				}
				if cycleStart >= 0 {
					cycle := make([]string, len(path)-cycleStart)
					copy(cycle, path[cycleStart:])
					cycles = append(cycles, cycle)
				}
			}
		}

		recStack[issueID] = false
		path = path[:len(path)-1]
		return false
	}

	// Run DFS from each unvisited node
	for _, issue := range a.issues {
		if !visited[issue.ID] {
			dfs(issue.ID)
		}
	}

	return cycles, nil
}

// GetDependencyChain returns the full dependency chain for a given issue
// This includes all transitive dependencies
func (a *Analyzer) GetDependencyChain(issueID string) ([]string, error) {
	if a.graph == nil {
		if _, err := a.BuildDependencyGraph(); err != nil {
			return nil, err
		}
	}

	visited := make(map[string]bool)
	var chain []string

	var traverse func(id string)
	traverse = func(id string) {
		if visited[id] {
			return
		}
		visited[id] = true
		chain = append(chain, id)

		// Traverse dependencies
		for _, depID := range a.graph.DependsOn[id] {
			traverse(depID)
		}
	}

	traverse(issueID)
	return chain, nil
}

// BlockedIssueInfo contains information about a blocked issue
type BlockedIssueInfo struct {
	IssueID   string
	BlockedBy []string
	Issue     *beads.Issue
}

// removeDuplicates removes duplicate entries from all graph adjacency lists
func removeDuplicates(graph *DependencyGraph) *DependencyGraph {
	dedup := func(slice []string) []string {
		seen := make(map[string]bool)
		result := []string{}
		for _, v := range slice {
			if !seen[v] {
				seen[v] = true
				result = append(result, v)
			}
		}
		return result
	}

	for k, v := range graph.DependsOn {
		graph.DependsOn[k] = dedup(v)
	}
	for k, v := range graph.Blocks {
		graph.Blocks[k] = dedup(v)
	}
	for k, v := range graph.Related {
		graph.Related[k] = dedup(v)
	}
	for k, v := range graph.ParentChild {
		graph.ParentChild[k] = dedup(v)
	}
	for k, v := range graph.DiscoveredFrom {
		graph.DiscoveredFrom[k] = dedup(v)
	}

	return graph
}

// PrintDependencyGraph returns a human-readable representation of the dependency graph
func (a *Analyzer) PrintDependencyGraph() string {
	if a.graph == nil {
		return "No dependency graph built yet"
	}

	output := "Dependency Graph:\n"
	output += "================\n\n"

	if len(a.graph.DependsOn) > 0 {
		output += "Dependencies (A depends on B):\n"
		for issueID, deps := range a.graph.DependsOn {
			output += fmt.Sprintf("  %s -> %v\n", issueID, deps)
		}
		output += "\n"
	}

	if len(a.graph.Blocks) > 0 {
		output += "Blocking (A blocks B):\n"
		for issueID, blocks := range a.graph.Blocks {
			output += fmt.Sprintf("  %s blocks %v\n", issueID, blocks)
		}
		output += "\n"
	}

	if len(a.graph.Related) > 0 {
		output += "Related Issues:\n"
		for issueID, related := range a.graph.Related {
			output += fmt.Sprintf("  %s <-> %v\n", issueID, related)
		}
		output += "\n"
	}

	if len(a.graph.ParentChild) > 0 {
		output += "Parent-Child (Parent -> Children):\n"
		for parentID, children := range a.graph.ParentChild {
			output += fmt.Sprintf("  %s -> %v\n", parentID, children)
		}
		output += "\n"
	}

	return output
}
