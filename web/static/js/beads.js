// Beads Issues Viewer

class BeadsViewer {
    constructor() {
        this.issues = [];
        this.filteredIssues = [];
        this.searchFilter = '';
        this.statusFilter = '';
        this.typeFilter = '';
        this.priorityFilter = '';

        this.container = document.getElementById('issuesContainer');
        this.statsContainer = document.getElementById('beadsStats');
        this.searchInput = document.getElementById('searchInput');
        this.statusFilterSelect = document.getElementById('statusFilter');
        this.typeFilterSelect = document.getElementById('typeFilter');
        this.priorityFilterSelect = document.getElementById('priorityFilter');
        this.modal = document.getElementById('issueModal');
        this.modalBackdrop = document.getElementById('modalBackdrop');
        this.closeModalBtn = document.getElementById('closeModal');

        this.init();
    }

    init() {
        this.attachEventListeners();
        this.loadIssues();
    }

    attachEventListeners() {
        // Search
        this.searchInput.addEventListener('input', (e) => {
            this.searchFilter = e.target.value.toLowerCase();
            this.applyFilters();
        });

        // Filters
        this.statusFilterSelect.addEventListener('change', (e) => {
            this.statusFilter = e.target.value;
            this.applyFilters();
        });

        this.typeFilterSelect.addEventListener('change', (e) => {
            this.typeFilter = e.target.value;
            this.applyFilters();
        });

        this.priorityFilterSelect.addEventListener('change', (e) => {
            this.priorityFilter = e.target.value;
            this.applyFilters();
        });

        // Modal
        this.closeModalBtn.addEventListener('click', () => this.closeModal());
        this.modalBackdrop.addEventListener('click', () => this.closeModal());
    }

    async loadIssues() {
        try {
            const response = await fetch('/api/beads/issues');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this.issues = await response.json();
            this.applyFilters();
            this.updateStats();
        } catch (error) {
            console.error('Error loading issues:', error);
            this.showError('Failed to load issues. Make sure the .beads/issues.jsonl file exists.');
        }
    }

    applyFilters() {
        this.filteredIssues = this.issues.filter(issue => {
            // Search filter
            if (this.searchFilter) {
                const searchableText = `${issue.id} ${issue.title} ${issue.description || ''}`.toLowerCase();
                if (!searchableText.includes(this.searchFilter)) {
                    return false;
                }
            }

            // Status filter
            if (this.statusFilter && issue.status !== this.statusFilter) {
                return false;
            }

            // Type filter
            if (this.typeFilter && issue.issue_type !== this.typeFilter) {
                return false;
            }

            // Priority filter
            if (this.priorityFilter !== '' && issue.priority !== parseInt(this.priorityFilter)) {
                return false;
            }

            return true;
        });

        this.render();
    }

    updateStats() {
        const stats = {
            total: this.issues.length,
            open: this.issues.filter(i => i.status === 'open').length,
            in_progress: this.issues.filter(i => i.status === 'in_progress').length,
            closed: this.issues.filter(i => i.status === 'closed').length
        };

        this.statsContainer.innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${stats.total}</div>
                <div class="stat-label">Total</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.open}</div>
                <div class="stat-label">Open</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.in_progress}</div>
                <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${stats.closed}</div>
                <div class="stat-label">Closed</div>
            </div>
        `;
    }

    render() {
        if (this.filteredIssues.length === 0) {
            if (this.issues.length === 0) {
                this.container.innerHTML = `
                    <div class="issues-empty">
                        <p>No beads issues found. Initialize beads in your project to get started.</p>
                    </div>
                `;
            } else {
                this.container.innerHTML = `
                    <div class="issues-empty">
                        <p>No issues match the current filters.</p>
                    </div>
                `;
            }
            return;
        }

        // Sort by status (open/in_progress first), then priority, then ID
        const sortedIssues = [...this.filteredIssues].sort((a, b) => {
            // Status priority: open > in_progress > closed
            const statusOrder = { 'open': 0, 'in_progress': 1, 'closed': 2 };
            const statusDiff = statusOrder[a.status] - statusOrder[b.status];
            if (statusDiff !== 0) return statusDiff;

            // Then by priority (lower number = higher priority)
            const priorityDiff = a.priority - b.priority;
            if (priorityDiff !== 0) return priorityDiff;

            // Finally by ID
            return a.id.localeCompare(b.id);
        });

        this.container.innerHTML = sortedIssues.map(issue => this.renderIssueCard(issue)).join('');

        // Attach click handlers
        this.container.querySelectorAll('.issue-card').forEach((card, index) => {
            card.addEventListener('click', () => this.showIssueDetails(sortedIssues[index]));
        });
    }

    renderIssueCard(issue) {
        const createdDate = new Date(issue.created_at).toLocaleDateString();
        const updatedDate = new Date(issue.updated_at).toLocaleDateString();

        return `
            <div class="issue-card" data-issue-id="${issue.id}">
                <div class="issue-card-header">
                    <span class="issue-id">${issue.id}</span>
                    <h3 class="issue-title">${this.escapeHtml(issue.title)}</h3>
                </div>
                <div class="issue-meta">
                    <span class="issue-badge status-${issue.status}">${issue.status.replace('_', ' ')}</span>
                    <span class="issue-badge type-${issue.issue_type}">${issue.issue_type}</span>
                    <span class="issue-priority">Priority ${issue.priority}</span>
                </div>
                ${issue.description ? `<div class="issue-description">${this.escapeHtml(issue.description)}</div>` : ''}
                <div class="issue-dates">
                    <span>Created: ${createdDate}</span>
                    <span>Updated: ${updatedDate}</span>
                    ${issue.closed_at ? `<span>Closed: ${new Date(issue.closed_at).toLocaleDateString()}</span>` : ''}
                </div>
            </div>
        `;
    }

    async showIssueDetails(issue) {
        const modalBody = document.getElementById('modalBody');
        const modalTitle = document.getElementById('modalTitle');

        modalTitle.textContent = issue.title;

        let detailsHTML = `
            <div class="detail-section">
                <div class="detail-label">Issue ID</div>
                <div class="detail-value"><code>${issue.id}</code></div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="issue-badge status-${issue.status}">${issue.status.replace('_', ' ')}</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Type</div>
                <div class="detail-value">
                    <span class="issue-badge type-${issue.issue_type}">${issue.issue_type}</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Priority</div>
                <div class="detail-value">Priority ${issue.priority}</div>
            </div>

            ${issue.description ? `
                <div class="detail-section">
                    <div class="detail-label">Description</div>
                    <div class="detail-value">${this.escapeHtml(issue.description)}</div>
                </div>
            ` : ''}

            ${issue.assignee ? `
                <div class="detail-section">
                    <div class="detail-label">Assignee</div>
                    <div class="detail-value">${this.escapeHtml(issue.assignee)}</div>
                </div>
            ` : ''}

            ${issue.labels && issue.labels.length > 0 ? `
                <div class="detail-section">
                    <div class="detail-label">Labels</div>
                    <div class="detail-value">
                        ${issue.labels.map(label => `<span class="issue-badge">${this.escapeHtml(label)}</span>`).join(' ')}
                    </div>
                </div>
            ` : ''}

            <div class="detail-section">
                <div class="detail-label">Created</div>
                <div class="detail-value">${new Date(issue.created_at).toLocaleString()}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Last Updated</div>
                <div class="detail-value">${new Date(issue.updated_at).toLocaleString()}</div>
            </div>

            ${issue.closed_at ? `
                <div class="detail-section">
                    <div class="detail-label">Closed</div>
                    <div class="detail-value">${new Date(issue.closed_at).toLocaleString()}</div>
                </div>
            ` : ''}
        `;

        // Load dependency information
        try {
            const graphResponse = await fetch('/api/beads/graph');
            if (graphResponse.ok) {
                const graph = await graphResponse.json();

                // Dependencies (this issue depends on)
                if (graph.DependsOn && graph.DependsOn[issue.id]) {
                    detailsHTML += `
                        <div class="detail-section">
                            <div class="detail-label">Depends On</div>
                            <ul class="detail-list">
                                ${graph.DependsOn[issue.id].map(depId => `<li>${depId}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                // Blockers (this issue blocks)
                if (graph.Blocks && graph.Blocks[issue.id]) {
                    detailsHTML += `
                        <div class="detail-section">
                            <div class="detail-label">Blocks</div>
                            <ul class="detail-list">
                                ${graph.Blocks[issue.id].map(blockId => `<li>${blockId}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                // Related issues
                if (graph.Related && graph.Related[issue.id]) {
                    detailsHTML += `
                        <div class="detail-section">
                            <div class="detail-label">Related Issues</div>
                            <ul class="detail-list">
                                ${graph.Related[issue.id].map(relId => `<li>${relId}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }

                // Child issues
                if (graph.ParentChild && graph.ParentChild[issue.id]) {
                    detailsHTML += `
                        <div class="detail-section">
                            <div class="detail-label">Child Issues</div>
                            <ul class="detail-list">
                                ${graph.ParentChild[issue.id].map(childId => `<li>${childId}</li>`).join('')}
                            </ul>
                        </div>
                    `;
                }
            }
        } catch (error) {
            console.error('Error loading dependency graph:', error);
        }

        modalBody.innerHTML = detailsHTML;

        // Add action buttons to footer
        const modalFooter = document.getElementById('modalFooter');
        modalFooter.innerHTML = `
            <button class="btn btn-primary" id="createTaskBtn" data-issue-id="${issue.id}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
                    <path d="M12 5v14M5 12h14"></path>
                </svg>
                Create Task from Issue
            </button>
        `;

        // Attach create task handler
        document.getElementById('createTaskBtn').addEventListener('click', () => {
            this.createTaskFromIssue(issue);
        });

        this.openModal();
    }

    async createTaskFromIssue(issue) {
        try {
            // First, get list of available boards
            const boardsResponse = await fetch('/api/boards');
            if (!boardsResponse.ok) {
                throw new Error('Failed to fetch boards');
            }
            const boards = await boardsResponse.json();

            if (!boards || boards.length === 0) {
                alert('No boards available. Please create a project and board first.');
                return;
            }

            // For now, use the first available board
            // In a future enhancement, we could show a board selector
            const board = boards[0];

            // Map beads priority to task priority
            const priorityMap = {
                0: 'urgent',
                1: 'high',
                2: 'medium',
                3: 'low'
            };

            // Create task with linked beads issue
            const taskData = {
                board_id: board.id,
                title: issue.title,
                description: issue.description || `Linked from beads issue ${issue.id}`,
                status: issue.status === 'closed' ? 'Done' : (issue.status === 'in_progress' ? 'In Progress' : 'To Do'),
                priority: priorityMap[issue.priority] || 'medium',
                labels: issue.labels || [],
                linked_items: [
                    {
                        type: 'bead',
                        id: issue.id
                    }
                ]
            };

            const response = await fetch('/api/tasks', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(taskData)
            });

            if (!response.ok) {
                throw new Error(`Failed to create task: ${response.statusText}`);
            }

            const createdTask = await response.json();

            // Show success message
            const modalFooter = document.getElementById('modalFooter');
            modalFooter.innerHTML = `
                <div class="success-message" style="flex: 1; color: var(--color-success); font-size: var(--font-size-sm);">
                    ✓ Task created successfully on board "${this.escapeHtml(board.name)}"
                </div>
                <a href="/static/board.html?id=${board.id}" class="btn btn-primary" target="_blank">
                    View Board
                </a>
            `;
        } catch (error) {
            console.error('Error creating task from issue:', error);
            alert('Failed to create task. Error: ' + error.message);
        }
    }

    openModal() {
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    closeModal() {
        this.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    showError(message) {
        this.container.innerHTML = `
            <div class="issues-error">
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new BeadsViewer();
});
