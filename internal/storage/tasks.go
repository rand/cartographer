package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rand/cartographer/internal/domain"
)

// TaskRepository handles task CRUD operations
type TaskRepository struct {
	db *DB
}

// NewTaskRepository creates a new task repository
func NewTaskRepository(db *DB) *TaskRepository {
	return &TaskRepository{db: db}
}

// Create creates a new task
func (r *TaskRepository) Create(task *domain.Task) error {
	if task.ID == "" {
		task.ID = uuid.New().String()
	}

	now := time.Now()
	task.CreatedAt = now
	task.UpdatedAt = now

	// Marshal JSON fields
	assignee, _ := json.Marshal(task.Assignee)
	labels, _ := json.Marshal(task.Labels)
	dependencies, _ := json.Marshal(task.Dependencies)
	blocks, _ := json.Marshal(task.Blocks)
	related, _ := json.Marshal(task.Related)
	linkedItems, _ := json.Marshal(task.LinkedItems)
	checklist, _ := json.Marshal(task.Checklist)
	createdBy, _ := json.Marshal(task.CreatedBy)
	activity, _ := json.Marshal(task.Activity)

	query := `
		INSERT INTO tasks (
			id, board_id, title, description, status, priority,
			assignee, labels, due_date, estimate, actual,
			dependencies, blocks, related, linked_items, checklist,
			created_at, updated_at, created_by, activity
		)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err := r.db.Conn().Exec(query,
		task.ID, task.BoardID, task.Title, task.Description, task.Status, task.Priority,
		string(assignee), string(labels), task.DueDate, task.Estimate, task.Actual,
		string(dependencies), string(blocks), string(related), string(linkedItems), string(checklist),
		task.CreatedAt, task.UpdatedAt, string(createdBy), string(activity),
	)

	return err
}

// GetByID retrieves a task by ID
func (r *TaskRepository) GetByID(id string) (*domain.Task, error) {
	query := `
		SELECT id, board_id, title, description, status, priority,
			   assignee, labels, due_date, estimate, actual,
			   dependencies, blocks, related, linked_items, checklist,
			   created_at, updated_at, created_by, activity
		FROM tasks
		WHERE id = ?
	`

	task := &domain.Task{}
	var assigneeJSON, labelsJSON, dependenciesJSON, blocksJSON, relatedJSON,
		linkedItemsJSON, checklistJSON, createdByJSON, activityJSON sql.NullString
	var dueDate sql.NullTime
	var estimate, actual sql.NullFloat64

	err := r.db.Conn().QueryRow(query, id).Scan(
		&task.ID, &task.BoardID, &task.Title, &task.Description, &task.Status, &task.Priority,
		&assigneeJSON, &labelsJSON, &dueDate, &estimate, &actual,
		&dependenciesJSON, &blocksJSON, &relatedJSON, &linkedItemsJSON, &checklistJSON,
		&task.CreatedAt, &task.UpdatedAt, &createdByJSON, &activityJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("task not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal JSON fields
	if assigneeJSON.Valid {
		json.Unmarshal([]byte(assigneeJSON.String), &task.Assignee)
	}
	if labelsJSON.Valid {
		json.Unmarshal([]byte(labelsJSON.String), &task.Labels)
	}
	if dueDate.Valid {
		task.DueDate = &dueDate.Time
	}
	if estimate.Valid {
		task.Estimate = &estimate.Float64
	}
	if actual.Valid {
		task.Actual = &actual.Float64
	}
	if dependenciesJSON.Valid {
		json.Unmarshal([]byte(dependenciesJSON.String), &task.Dependencies)
	}
	if blocksJSON.Valid {
		json.Unmarshal([]byte(blocksJSON.String), &task.Blocks)
	}
	if relatedJSON.Valid {
		json.Unmarshal([]byte(relatedJSON.String), &task.Related)
	}
	if linkedItemsJSON.Valid {
		json.Unmarshal([]byte(linkedItemsJSON.String), &task.LinkedItems)
	}
	if checklistJSON.Valid {
		json.Unmarshal([]byte(checklistJSON.String), &task.Checklist)
	}
	if createdByJSON.Valid {
		json.Unmarshal([]byte(createdByJSON.String), &task.CreatedBy)
	}
	if activityJSON.Valid {
		json.Unmarshal([]byte(activityJSON.String), &task.Activity)
	}

	return task, nil
}

// ListByBoard retrieves all tasks for a board
func (r *TaskRepository) ListByBoard(boardID string) ([]*domain.Task, error) {
	query := `
		SELECT id, board_id, title, description, status, priority,
			   assignee, labels, due_date, estimate, actual,
			   dependencies, blocks, related, linked_items, checklist,
			   created_at, updated_at, created_by, activity
		FROM tasks
		WHERE board_id = ?
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Conn().Query(query, boardID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var tasks []*domain.Task
	for rows.Next() {
		task := &domain.Task{}
		var assigneeJSON, labelsJSON, dependenciesJSON, blocksJSON, relatedJSON,
			linkedItemsJSON, checklistJSON, createdByJSON, activityJSON sql.NullString
		var dueDate sql.NullTime
		var estimate, actual sql.NullFloat64

		err := rows.Scan(
			&task.ID, &task.BoardID, &task.Title, &task.Description, &task.Status, &task.Priority,
			&assigneeJSON, &labelsJSON, &dueDate, &estimate, &actual,
			&dependenciesJSON, &blocksJSON, &relatedJSON, &linkedItemsJSON, &checklistJSON,
			&task.CreatedAt, &task.UpdatedAt, &createdByJSON, &activityJSON,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON fields
		if assigneeJSON.Valid {
			json.Unmarshal([]byte(assigneeJSON.String), &task.Assignee)
		}
		if labelsJSON.Valid {
			json.Unmarshal([]byte(labelsJSON.String), &task.Labels)
		}
		if dueDate.Valid {
			task.DueDate = &dueDate.Time
		}
		if estimate.Valid {
			task.Estimate = &estimate.Float64
		}
		if actual.Valid {
			task.Actual = &actual.Float64
		}
		if dependenciesJSON.Valid {
			json.Unmarshal([]byte(dependenciesJSON.String), &task.Dependencies)
		}
		if blocksJSON.Valid {
			json.Unmarshal([]byte(blocksJSON.String), &task.Blocks)
		}
		if relatedJSON.Valid {
			json.Unmarshal([]byte(relatedJSON.String), &task.Related)
		}
		if linkedItemsJSON.Valid {
			json.Unmarshal([]byte(linkedItemsJSON.String), &task.LinkedItems)
		}
		if checklistJSON.Valid {
			json.Unmarshal([]byte(checklistJSON.String), &task.Checklist)
		}
		if createdByJSON.Valid {
			json.Unmarshal([]byte(createdByJSON.String), &task.CreatedBy)
		}
		if activityJSON.Valid {
			json.Unmarshal([]byte(activityJSON.String), &task.Activity)
		}

		tasks = append(tasks, task)
	}

	return tasks, rows.Err()
}

// Update updates an existing task
func (r *TaskRepository) Update(task *domain.Task) error {
	task.UpdatedAt = time.Now()

	// Marshal JSON fields
	assignee, _ := json.Marshal(task.Assignee)
	labels, _ := json.Marshal(task.Labels)
	dependencies, _ := json.Marshal(task.Dependencies)
	blocks, _ := json.Marshal(task.Blocks)
	related, _ := json.Marshal(task.Related)
	linkedItems, _ := json.Marshal(task.LinkedItems)
	checklist, _ := json.Marshal(task.Checklist)
	createdBy, _ := json.Marshal(task.CreatedBy)
	activity, _ := json.Marshal(task.Activity)

	query := `
		UPDATE tasks
		SET title = ?, description = ?, status = ?, priority = ?,
			assignee = ?, labels = ?, due_date = ?, estimate = ?, actual = ?,
			dependencies = ?, blocks = ?, related = ?, linked_items = ?, checklist = ?,
			created_by = ?, activity = ?
		WHERE id = ?
	`

	result, err := r.db.Conn().Exec(query,
		task.Title, task.Description, task.Status, task.Priority,
		string(assignee), string(labels), task.DueDate, task.Estimate, task.Actual,
		string(dependencies), string(blocks), string(related), string(linkedItems), string(checklist),
		string(createdBy), string(activity),
		task.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("task not found: %s", task.ID)
	}

	return nil
}

// Delete deletes a task by ID
func (r *TaskRepository) Delete(id string) error {
	query := `DELETE FROM tasks WHERE id = ?`

	result, err := r.db.Conn().Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("task not found: %s", id)
	}

	return nil
}
