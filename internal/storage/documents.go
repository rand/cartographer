package storage

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/rand/cartographer/internal/domain"
)

// DocumentRepository handles document CRUD operations
type DocumentRepository struct {
	db *DB
}

// NewDocumentRepository creates a new document repository
func NewDocumentRepository(db *DB) *DocumentRepository {
	return &DocumentRepository{db: db}
}

// Create creates a new document
func (r *DocumentRepository) Create(doc *domain.Document) error {
	if doc.ID == "" {
		doc.ID = uuid.New().String()
	}

	now := time.Now()
	doc.CreatedAt = now
	doc.UpdatedAt = now

	tags, err := json.Marshal(doc.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	linkedFrom, err := json.Marshal(doc.LinkedFrom)
	if err != nil {
		return fmt.Errorf("failed to marshal linked_from: %w", err)
	}

	linksTo, err := json.Marshal(doc.LinksTo)
	if err != nil {
		return fmt.Errorf("failed to marshal links_to: %w", err)
	}

	versions, err := json.Marshal(doc.Versions)
	if err != nil {
		return fmt.Errorf("failed to marshal versions: %w", err)
	}

	query := `
		INSERT INTO documents (id, project_id, title, content, path, tags, linked_from, links_to, created_at, updated_at, versions)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	`

	_, err = r.db.Conn().Exec(query,
		doc.ID,
		doc.ProjectID,
		doc.Title,
		doc.Content,
		doc.Path,
		string(tags),
		string(linkedFrom),
		string(linksTo),
		doc.CreatedAt,
		doc.UpdatedAt,
		string(versions),
	)

	return err
}

// GetByID retrieves a document by ID
func (r *DocumentRepository) GetByID(id string) (*domain.Document, error) {
	query := `
		SELECT id, project_id, title, content, path, tags, linked_from, links_to, created_at, updated_at, versions
		FROM documents
		WHERE id = ?
	`

	doc := &domain.Document{}
	var tagsJSON, linkedFromJSON, linksToJSON, versionsJSON string

	err := r.db.Conn().QueryRow(query, id).Scan(
		&doc.ID,
		&doc.ProjectID,
		&doc.Title,
		&doc.Content,
		&doc.Path,
		&tagsJSON,
		&linkedFromJSON,
		&linksToJSON,
		&doc.CreatedAt,
		&doc.UpdatedAt,
		&versionsJSON,
	)

	if err == sql.ErrNoRows {
		return nil, fmt.Errorf("document not found")
	}
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal([]byte(tagsJSON), &doc.Tags); err != nil {
		doc.Tags = []string{}
	}
	if err := json.Unmarshal([]byte(linkedFromJSON), &doc.LinkedFrom); err != nil {
		doc.LinkedFrom = []string{}
	}
	if err := json.Unmarshal([]byte(linksToJSON), &doc.LinksTo); err != nil {
		doc.LinksTo = []string{}
	}
	if err := json.Unmarshal([]byte(versionsJSON), &doc.Versions); err != nil {
		doc.Versions = []domain.DocumentVersion{}
	}

	return doc, nil
}

// ListByProject retrieves all documents for a project
func (r *DocumentRepository) ListByProject(projectID string) ([]*domain.Document, error) {
	query := `
		SELECT id, project_id, title, content, path, tags, linked_from, links_to, created_at, updated_at, versions
		FROM documents
		WHERE project_id = ?
		ORDER BY updated_at DESC
	`

	rows, err := r.db.Conn().Query(query, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var documents []*domain.Document
	for rows.Next() {
		doc := &domain.Document{}
		var tagsJSON, linkedFromJSON, linksToJSON, versionsJSON string

		err := rows.Scan(
			&doc.ID,
			&doc.ProjectID,
			&doc.Title,
			&doc.Content,
			&doc.Path,
			&tagsJSON,
			&linkedFromJSON,
			&linksToJSON,
			&doc.CreatedAt,
			&doc.UpdatedAt,
			&versionsJSON,
		)
		if err != nil {
			return nil, err
		}

		if err := json.Unmarshal([]byte(tagsJSON), &doc.Tags); err != nil {
			doc.Tags = []string{}
		}
		if err := json.Unmarshal([]byte(linkedFromJSON), &doc.LinkedFrom); err != nil {
			doc.LinkedFrom = []string{}
		}
		if err := json.Unmarshal([]byte(linksToJSON), &doc.LinksTo); err != nil {
			doc.LinksTo = []string{}
		}
		if err := json.Unmarshal([]byte(versionsJSON), &doc.Versions); err != nil {
			doc.Versions = []domain.DocumentVersion{}
		}

		documents = append(documents, doc)
	}

	return documents, rows.Err()
}

// Update updates an existing document
func (r *DocumentRepository) Update(doc *domain.Document) error {
	tags, err := json.Marshal(doc.Tags)
	if err != nil {
		return fmt.Errorf("failed to marshal tags: %w", err)
	}

	linkedFrom, err := json.Marshal(doc.LinkedFrom)
	if err != nil {
		return fmt.Errorf("failed to marshal linked_from: %w", err)
	}

	linksTo, err := json.Marshal(doc.LinksTo)
	if err != nil {
		return fmt.Errorf("failed to marshal links_to: %w", err)
	}

	versions, err := json.Marshal(doc.Versions)
	if err != nil {
		return fmt.Errorf("failed to marshal versions: %w", err)
	}

	query := `
		UPDATE documents
		SET title = ?, content = ?, path = ?, tags = ?, linked_from = ?, links_to = ?, versions = ?
		WHERE id = ?
	`

	_, err = r.db.Conn().Exec(query,
		doc.Title,
		doc.Content,
		doc.Path,
		string(tags),
		string(linkedFrom),
		string(linksTo),
		string(versions),
		doc.ID,
	)

	return err
}

// Delete deletes a document
func (r *DocumentRepository) Delete(id string) error {
	query := `DELETE FROM documents WHERE id = ?`
	_, err := r.db.Conn().Exec(query, id)
	return err
}
