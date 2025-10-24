// Package beads provides integration with the Beads issue tracking framework.
package beads

import (
	"fmt"
	"time"

	"github.com/rand/cartographer/internal/domain"
	"github.com/steveyegge/beads"
)

// Converter handles conversion between Beads types and Cartographer domain types
type Converter struct {
	// ProjectID is the Cartographer project ID to associate converted tasks with
	ProjectID string

	// BoardID is the Cartographer board ID to associate converted tasks with
	BoardID string
}

// NewConverter creates a new converter for the given project and board
func NewConverter(projectID, boardID string) *Converter {
	return &Converter{
		ProjectID: projectID,
		BoardID:   boardID,
	}
}

// ConvertBeadToTask converts a Beads issue to a Cartographer task
// This maps the Beads issue structure to our domain model
func (c *Converter) ConvertBeadToTask(bead *beads.Issue) (*domain.Task, error) {
	if bead == nil {
		return nil, fmt.Errorf("cannot convert nil bead")
	}

	// Validate the bead first
	if err := bead.Validate(); err != nil {
		return nil, fmt.Errorf("invalid bead: %w", err)
	}

	task := &domain.Task{
		ID:          bead.ID,
		BoardID:     c.BoardID,
		Title:       bead.Title,
		Description: buildDescription(bead),
		Status:      convertStatus(bead.Status),
		Priority:    convertPriority(bead.Priority),
		Labels:      bead.Labels,
		CreatedAt:   bead.CreatedAt,
		UpdatedAt:   bead.UpdatedAt,
	}

	// Convert assignee if present
	if bead.Assignee != "" {
		task.Assignee = &domain.Assignee{
			Type: "human", // Default to human, could be enhanced
			ID:   bead.Assignee,
			Name: bead.Assignee,
		}
	}

	// Convert estimate (beads uses minutes, we use hours)
	if bead.EstimatedMinutes != nil {
		hours := float64(*bead.EstimatedMinutes) / 60.0
		task.Estimate = &hours
	}

	// Convert dependencies
	if bead.Dependencies != nil {
		task.Dependencies = extractDependencies(bead.Dependencies, beads.DepBlocks)
		task.Related = extractDependencies(bead.Dependencies, beads.DepRelated)
		// Blocks is the reverse - we'll compute this separately if needed
	}

	// Add bead as a linked item
	task.LinkedItems = []domain.LinkedItem{
		{
			Type: "bead",
			ID:   bead.ID,
			Path: ".beads/issues.jsonl",
		},
	}

	// Convert comments to activity entries
	if bead.Comments != nil {
		task.Activity = convertComments(bead.Comments)
	}

	// Add created by information if available
	if len(bead.Comments) > 0 {
		// Use first comment author as creator if available
		firstComment := bead.Comments[0]
		task.CreatedBy = &domain.User{
			Type: "human",
			ID:   firstComment.Author,
		}
	}

	return task, nil
}

// ConvertBeadsToTasks converts multiple beads to tasks
func (c *Converter) ConvertBeadsToTasks(beads []*beads.Issue) ([]*domain.Task, error) {
	tasks := make([]*domain.Task, 0, len(beads))

	for _, bead := range beads {
		task, err := c.ConvertBeadToTask(bead)
		if err != nil {
			return nil, fmt.Errorf("error converting bead %s: %w", bead.ID, err)
		}
		tasks = append(tasks, task)
	}

	return tasks, nil
}

// buildDescription constructs a comprehensive description from bead fields
func buildDescription(bead *beads.Issue) string {
	desc := bead.Description

	// Add design section if present
	if bead.Design != "" {
		desc += "\n\n## Design\n\n" + bead.Design
	}

	// Add acceptance criteria if present
	if bead.AcceptanceCriteria != "" {
		desc += "\n\n## Acceptance Criteria\n\n" + bead.AcceptanceCriteria
	}

	// Add notes if present
	if bead.Notes != "" {
		desc += "\n\n## Notes\n\n" + bead.Notes
	}

	// Add external reference if present
	if bead.ExternalRef != nil {
		desc += fmt.Sprintf("\n\n**External Reference:** %s", *bead.ExternalRef)
	}

	// Add compaction info if compacted
	if bead.CompactionLevel > 0 {
		desc += fmt.Sprintf("\n\n---\n*Compacted %d times", bead.CompactionLevel)
		if bead.OriginalSize > 0 {
			desc += fmt.Sprintf(", original size: %d bytes", bead.OriginalSize)
		}
		desc += "*"
	}

	return desc
}

// convertStatus maps Beads status to Cartographer status
func convertStatus(beadStatus beads.Status) string {
	switch beadStatus {
	case beads.StatusOpen:
		return "todo"
	case beads.StatusInProgress:
		return "in_progress"
	case beads.StatusBlocked:
		return "blocked"
	case beads.StatusClosed:
		return "done"
	default:
		return "todo"
	}
}

// convertPriority maps Beads priority (0-4) to Cartographer priority
// Beads: 0=lowest, 4=highest
// Cartographer: low, medium, high, urgent
func convertPriority(beadPriority int) string {
	switch beadPriority {
	case 0, 1:
		return "low"
	case 2:
		return "medium"
	case 3:
		return "high"
	case 4:
		return "urgent"
	default:
		return "medium"
	}
}

// extractDependencies extracts dependency IDs of a specific type
func extractDependencies(deps []*beads.Dependency, depType beads.DependencyType) []string {
	var result []string
	for _, dep := range deps {
		if dep.Type == depType {
			result = append(result, dep.DependsOnID)
		}
	}
	return result
}

// convertComments converts beads comments to activity entries
func convertComments(comments []*beads.Comment) []domain.ActivityEntry {
	activities := make([]domain.ActivityEntry, 0, len(comments))

	for _, comment := range comments {
		activities = append(activities, domain.ActivityEntry{
			Type:      "commented",
			User:      comment.Author,
			Timestamp: comment.CreatedAt,
			Comment:   comment.Text,
		})
	}

	return activities
}

// ConvertTaskToBead converts a Cartographer task back to a Beads issue
// This is useful for syncing changes back to beads
func ConvertTaskToBead(task *domain.Task) (*beads.Issue, error) {
	if task == nil {
		return nil, fmt.Errorf("cannot convert nil task")
	}

	bead := &beads.Issue{
		ID:          task.ID,
		Title:       task.Title,
		Description: task.Description,
		Status:      convertStatusToBead(task.Status),
		Priority:    convertPriorityToBead(task.Priority),
		Labels:      task.Labels,
		CreatedAt:   task.CreatedAt,
		UpdatedAt:   task.UpdatedAt,
	}

	// Convert assignee
	if task.Assignee != nil {
		bead.Assignee = task.Assignee.ID
	}

	// Convert estimate (we use hours, beads uses minutes)
	if task.Estimate != nil {
		minutes := int(*task.Estimate * 60.0)
		bead.EstimatedMinutes = &minutes
	}

	// Set issue type based on labels or default to task
	bead.IssueType = determineIssueType(task)

	// Convert dependencies
	if len(task.Dependencies) > 0 {
		bead.Dependencies = make([]*beads.Dependency, 0)
		for _, depID := range task.Dependencies {
			bead.Dependencies = append(bead.Dependencies, &beads.Dependency{
				IssueID:     task.ID,
				DependsOnID: depID,
				Type:        beads.DepBlocks,
				CreatedAt:   time.Now(),
				CreatedBy:   "cartographer",
			})
		}
	}

	return bead, nil
}

// convertStatusToBead maps Cartographer status back to Beads status
func convertStatusToBead(status string) beads.Status {
	switch status {
	case "todo", "backlog":
		return beads.StatusOpen
	case "in_progress", "doing":
		return beads.StatusInProgress
	case "blocked":
		return beads.StatusBlocked
	case "done", "completed":
		return beads.StatusClosed
	default:
		return beads.StatusOpen
	}
}

// convertPriorityToBead maps Cartographer priority back to Beads priority
func convertPriorityToBead(priority string) int {
	switch priority {
	case "low":
		return 1
	case "medium":
		return 2
	case "high":
		return 3
	case "urgent":
		return 4
	default:
		return 2
	}
}

// determineIssueType determines the Beads issue type from task labels/properties
func determineIssueType(task *domain.Task) beads.IssueType {
	// Check labels for hints
	for _, label := range task.Labels {
		switch label {
		case "bug", "fix":
			return beads.TypeBug
		case "feature", "enhancement":
			return beads.TypeFeature
		case "epic":
			return beads.TypeEpic
		case "chore", "maintenance":
			return beads.TypeChore
		}
	}

	// Default to task
	return beads.TypeTask
}
