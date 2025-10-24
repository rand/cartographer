package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rand/cartographer/internal/domain"
)

// BoardRepository handles board CRUD operations
type BoardRepository struct {
	db *DB
}

// NewBoardRepository creates a new board repository
func NewBoardRepository(db *DB) *BoardRepository {
	return &BoardRepository{db: db}
}

// Create creates a new board
func (r *BoardRepository) Create(board *domain.Board) error {
	if board.ID == "" {
		board.ID = uuid.New().String()
	}

	now := time.Now()
	board.CreatedAt = now
	board.UpdatedAt = now

	columns, err := json.Marshal(board.Columns)
	if err != nil {
		return fmt.Errorf("failed to marshal columns: %w", err)
	}

	query := `
		INSERT INTO boards (id, project_id, name, description, columns, created_at, updated_at)
		VALUES (?, ?, ?, ?, ?, ?, ?)
	`

	_, err = r.db.Conn().Exec(query,
		board.ID,
		board.ProjectID,
		board.Name,
		board.Description,
		string(columns),
		board.CreatedAt,
		board.UpdatedAt,
	)

	return err
}

// GetByID retrieves a board by ID
func (r *BoardRepository) GetByID(id string) (*domain.Board, error) {
	query := `
		SELECT id, project_id, name, description, columns, created_at, updated_at
		FROM boards
		WHERE id = ?
	`

	board := &domain.Board{}
	var columnsJSON string

	err := r.db.Conn().QueryRow(query, id).Scan(
		&board.ID,
		&board.ProjectID,
		&board.Name,
		&board.Description,
		&columnsJSON,
		&board.CreatedAt,
		&board.UpdatedAt,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("board not found: %s", id)
	}
	if err != nil {
		return nil, err
	}

	// Unmarshal columns
	if columnsJSON != "" {
		if err := json.Unmarshal([]byte(columnsJSON), &board.Columns); err != nil {
			return nil, fmt.Errorf("failed to unmarshal columns: %w", err)
		}
	}

	return board, nil
}

// ListByProject retrieves all boards for a project
func (r *BoardRepository) ListByProject(projectID string) ([]*domain.Board, error) {
	query := `
		SELECT id, project_id, name, description, columns, created_at, updated_at
		FROM boards
		WHERE project_id = ?
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Conn().Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var boards []*domain.Board
	for rows.Next() {
		board := &domain.Board{}
		var columnsJSON string

		err := rows.Scan(
			&board.ID,
			&board.ProjectID,
			&board.Name,
			&board.Description,
			&columnsJSON,
			&board.CreatedAt,
			&board.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}

		// Unmarshal columns
		if columnsJSON != "" {
			if err := json.Unmarshal([]byte(columnsJSON), &board.Columns); err != nil {
				return nil, fmt.Errorf("failed to unmarshal columns: %w", err)
			}
		}

		boards = append(boards, board)
	}

	return boards, rows.Err()
}

// Update updates an existing board
func (r *BoardRepository) Update(board *domain.Board) error {
	board.UpdatedAt = time.Now()

	columns, err := json.Marshal(board.Columns)
	if err != nil {
		return fmt.Errorf("failed to marshal columns: %w", err)
	}

	query := `
		UPDATE boards
		SET name = ?, description = ?, columns = ?
		WHERE id = ?
	`

	result, err := r.db.Conn().Exec(query,
		board.Name,
		board.Description,
		string(columns),
		board.ID,
	)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("board not found: %s", board.ID)
	}

	return nil
}

// Delete deletes a board by ID
func (r *BoardRepository) Delete(id string) error {
	query := `DELETE FROM boards WHERE id = ?`

	result, err := r.db.Conn().Exec(query, id)
	if err != nil {
		return err
	}

	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows == 0 {
		return fmt.Errorf("board not found: %s", id)
	}

	return nil
}
