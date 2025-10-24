package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rand/cartographer/internal/domain"
)

// ProjectRepository handles project CRUD operations
type ProjectRepository struct {
	db *DB
}

// NewProjectRepository creates a new project repository
func NewProjectRepository(db *DB) *ProjectRepository {
	return &ProjectRepository{db: db}
}

// Create creates a new project
func (r *ProjectRepository) Create(project *domain.Project) error {
	if project.ID == "" {
		project.ID = uuid.New().String()
	}

	now := time.Now()
	project.CreatedAt = now
	project.UpdatedAt = now

	settings, err := json.Marshal(project.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	metadata, err := json.Marshal(project.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		INSERT INTO projects (id, name, description, path, type, created_at, updated_at, settings, metadata)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = r.db.Conn().Exec(query,
		project.ID,
		project.Name,
		project.Description,
		project.Path,
		project.Type,
		project.CreatedAt,
		project.UpdatedAt,
		string(settings),
		string(metadata),
	)

	return err
}

// GetByID retrieves a project by ID
func (r *ProjectRepository) GetByID(id string) (*domain.Project, error) {
	query := `
		SELECT id, name, description, path, type, created_at, updated_at, settings, metadata
		FROM projects
		WHERE id = ?
	`

	project := &domain.Project{}
	var settingsJSON, metadataJSON string

	err := r.db.Conn().QueryRow(query, id).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Path,
		&project.Type,
		&project.CreatedAt,
		&project.UpdatedAt,
		&settingsJSON,
		&metadataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("project not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal JSON fields
	if settingsJSON != "" {
		var settings domain.ProjectSettings
		if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
			return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
		}
		project.Settings = &settings
	}

	if metadataJSON != "" {
		var metadata domain.ProjectMetadata
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
		project.Metadata = &metadata
	}

	return project, nil
}

// GetByPath retrieves a project by its path
func (r *ProjectRepository) GetByPath(path string) (*domain.Project, error) {
	query := `
		SELECT id, name, description, path, type, created_at, updated_at, settings, metadata
		FROM projects
		WHERE path = ?
	`

	project := &domain.Project{}
	var settingsJSON, metadataJSON string

	err := r.db.Conn().QueryRow(query, path).Scan(
		&project.ID,
		&project.Name,
		&project.Description,
		&project.Path,
		&project.Type,
		&project.CreatedAt,
		&project.UpdatedAt,
		&settingsJSON,
		&metadataJSON,
	)

	if err == sql.ErrNoRows {
		return nil, nil // Not found, but not an error
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal JSON fields
	if settingsJSON != "" {
		var settings domain.ProjectSettings
		if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
			return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
		}
		project.Settings = &settings
	}

	if metadataJSON != "" {
		var metadata domain.ProjectMetadata
		if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
			return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
		}
		project.Metadata = &metadata
	}

	return project, nil
}

// List retrieves all projects
func (r *ProjectRepository) List() ([]*domain.Project, error) {
	query := `
		SELECT id, name, description, path, type, created_at, updated_at, settings, metadata
		FROM projects
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Conn().Query(query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var projects []*domain.Project
	for rows.Next() {
		project := &domain.Project{}
		var settingsJSON, metadataJSON string

		err := rows.Scan(
			&project.ID,
			&project.Name,
			&project.Description,
			&project.Path,
			&project.Type,
			&project.CreatedAt,
			&project.UpdatedAt,
			&settingsJSON,
			&metadataJSON,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal JSON fields
		if settingsJSON != "" {
			var settings domain.ProjectSettings
			if err := json.Unmarshal([]byte(settingsJSON), &settings); err != nil {
				return nil, fmt.Errorf("failed to unmarshal settings: %w", err)
			}
			project.Settings = &settings
		}

		if metadataJSON != "" {
			var metadata domain.ProjectMetadata
			if err := json.Unmarshal([]byte(metadataJSON), &metadata); err != nil {
				return nil, fmt.Errorf("failed to unmarshal metadata: %w", err)
			}
			project.Metadata = &metadata
		}

		projects = append(projects, project)
	}

	return projects, rows.Err()
}

// Update updates an existing project
func (r *ProjectRepository) Update(project *domain.Project) error {
	project.UpdatedAt = time.Now()

	settings, err := json.Marshal(project.Settings)
	if err != nil {
		return fmt.Errorf("failed to marshal settings: %w", err)
	}

	metadata, err := json.Marshal(project.Metadata)
	if err != nil {
		return fmt.Errorf("failed to marshal metadata: %w", err)
	}

	query := `
		UPDATE projects
		SET name = ?, description = ?, path = ?, type = ?, settings = ?, metadata = ?
		WHERE id = ?
	`

	result, err := r.db.Conn().Exec(query,
		project.Name,
		project.Description,
		project.Path,
		project.Type,
		string(settings),
		string(metadata),
		project.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("project not found: %s", project.ID)
	}

	return nil
}

// Delete deletes a project by ID
func (r *ProjectRepository) Delete(id string) error {
	query := `DELETE FROM projects WHERE id = ?`

	result, err := r.db.Conn().Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("project not found: %s", id)
	}

	return nil
}
