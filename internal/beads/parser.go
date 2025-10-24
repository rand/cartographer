// Package beads provides integration with the Beads issue tracking framework.
// It parses .beads/issues.jsonl files and converts beads to Cartographer domain models.
package beads

import (
	"bufio"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"

	"github.com/steveyegge/beads"
)

// Parser handles reading and parsing beads from project directories
type Parser struct {
	projectPath string
}

// NewParser creates a new beads parser for the given project path
func NewParser(projectPath string) *Parser {
	return &Parser{
		projectPath: projectPath,
	}
}

// ReadBeadsFromProject reads beads from the .beads/issues.jsonl file in a project
// Returns a slice of beads and any error encountered
func (p *Parser) ReadBeadsFromProject() ([]*beads.Issue, error) {
	// Construct path to .beads/issues.jsonl
	jsonlPath := filepath.Join(p.projectPath, ".beads", "issues.jsonl")

	// Check if file exists
	if _, err := os.Stat(jsonlPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("beads file not found at %s", jsonlPath)
	}

	// Open the JSONL file
	file, err := os.Open(jsonlPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open beads file: %w", err)
	}
	defer file.Close()

	// Parse JSONL file line by line
	var issues []*beads.Issue
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		// Skip empty lines
		if line == "" {
			continue
		}

		// Parse JSON line
		var issue beads.Issue
		if err := json.Unmarshal([]byte(line), &issue); err != nil {
			return nil, fmt.Errorf("error parsing line %d: %w", lineNum, err)
		}

		// Validate the issue
		if err := issue.Validate(); err != nil {
			return nil, fmt.Errorf("invalid issue on line %d: %w", lineNum, err)
		}

		issues = append(issues, &issue)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading beads file: %w", err)
	}

	return issues, nil
}

// ReadBeadsFromJSONL reads beads from a specific JSONL file path
// This is useful for reading beads from non-standard locations
func ReadBeadsFromJSONL(jsonlPath string) ([]*beads.Issue, error) {
	// Check if file exists
	if _, err := os.Stat(jsonlPath); os.IsNotExist(err) {
		return nil, fmt.Errorf("JSONL file not found at %s", jsonlPath)
	}

	// Open the JSONL file
	file, err := os.Open(jsonlPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open JSONL file: %w", err)
	}
	defer file.Close()

	// Parse JSONL file line by line
	var issues []*beads.Issue
	scanner := bufio.NewScanner(file)
	lineNum := 0

	for scanner.Scan() {
		lineNum++
		line := scanner.Text()

		// Skip empty lines
		if line == "" {
			continue
		}

		// Parse JSON line
		var issue beads.Issue
		if err := json.Unmarshal([]byte(line), &issue); err != nil {
			return nil, fmt.Errorf("error parsing line %d: %w", lineNum, err)
		}

		// Validate the issue
		if err := issue.Validate(); err != nil {
			return nil, fmt.Errorf("invalid issue on line %d: %w", lineNum, err)
		}

		issues = append(issues, &issue)
	}

	if err := scanner.Err(); err != nil {
		return nil, fmt.Errorf("error reading JSONL file: %w", err)
	}

	return issues, nil
}

// FindBeadsProjects searches for projects with .beads directories
// Returns a slice of absolute paths to directories containing .beads/issues.jsonl
func FindBeadsProjects(rootPath string) ([]string, error) {
	var projects []string

	err := filepath.Walk(rootPath, func(path string, info os.FileInfo, err error) error {
		if err != nil {
			return err
		}

		// Check if this is a .beads directory
		if info.IsDir() && info.Name() == ".beads" {
			// Check if issues.jsonl exists
			jsonlPath := filepath.Join(path, "issues.jsonl")
			if _, err := os.Stat(jsonlPath); err == nil {
				// Add the parent directory (project root)
				projectPath := filepath.Dir(path)
				projects = append(projects, projectPath)
			}
		}

		return nil
	})

	if err != nil {
		return nil, fmt.Errorf("error searching for beads projects: %w", err)
	}

	return projects, nil
}

// GetBeadsStatistics returns summary statistics for a set of beads
func GetBeadsStatistics(issues []*beads.Issue) map[string]interface{} {
	stats := make(map[string]interface{})

	// Count by status
	statusCounts := make(map[beads.Status]int)
	typeCounts := make(map[beads.IssueType]int)
	priorityCounts := make(map[int]int)
	labelCounts := make(map[string]int)

	for _, issue := range issues {
		statusCounts[issue.Status]++
		typeCounts[issue.IssueType]++
		priorityCounts[issue.Priority]++

		// Count labels
		if issue.Labels != nil {
			for _, label := range issue.Labels {
				labelCounts[label]++
			}
		}
	}

	stats["total"] = len(issues)
	stats["by_status"] = statusCounts
	stats["by_type"] = typeCounts
	stats["by_priority"] = priorityCounts
	stats["by_label"] = labelCounts

	return stats
}
