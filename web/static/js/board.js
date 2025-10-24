// Kanban Board with Drag-and-Drop
// Uses native HTML5 Drag and Drop API

// API Client
const API = {
	baseURL: '',

	async fetch(endpoint, options = {}) {
		const url = `${this.baseURL}${endpoint}`;
		const response = await fetch(url, {
			headers: {
				'Content-Type': 'application/json',
				...options.headers
			},
			...options
		});

		if (!response.ok) {
			const error = await response.text();
			throw new Error(`API Error: ${response.statusText} - ${error}`);
		}

		if (response.status === 204) {
			return null;
		}

		return response.json();
	},

	async getProjects() {
		return this.fetch('/api/projects');
	},

	async getBoards(projectId) {
		return this.fetch(`/api/boards?project_id=${projectId}`);
	},

	async getBoard(boardId) {
		return this.fetch(`/api/boards/${boardId}`);
	},

	async createBoard(board) {
		return this.fetch('/api/boards', {
			method: 'POST',
			body: JSON.stringify(board)
		});
	},

	async getTasks(boardId) {
		return this.fetch(`/api/tasks?board_id=${boardId}`);
	},

	async createTask(task) {
		return this.fetch('/api/tasks', {
			method: 'POST',
			body: JSON.stringify(task)
		});
	},

	async updateTask(taskId, task) {
		return this.fetch(`/api/tasks/${taskId}`, {
			method: 'PUT',
			body: JSON.stringify(task)
		});
	},

	async deleteTask(taskId) {
		return this.fetch(`/api/tasks/${taskId}`, {
			method: 'DELETE'
		});
	}
};

// WebSocket Manager
class WebSocketManager {
	constructor() {
		this.ws = null;
		this.reconnectAttempts = 0;
		this.maxReconnectAttempts = 5;
		this.reconnectDelay = 1000;
		this.listeners = new Map();
	}

	connect() {
		const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsURL = `${protocol}//${window.location.host}/ws`;

		this.ws = new WebSocket(wsURL);

		this.ws.onopen = () => {
			console.log('WebSocket connected');
			this.reconnectAttempts = 0;
			this.updateConnectionStatus(true);
		};

		this.ws.onmessage = (event) => {
			try {
				const message = JSON.parse(event.data);
				this.handleMessage(message);
			} catch (error) {
				console.error('Failed to parse WebSocket message:', error);
			}
		};

		this.ws.onerror = (error) => {
			console.error('WebSocket error:', error);
			this.updateConnectionStatus(false);
		};

		this.ws.onclose = () => {
			console.log('WebSocket disconnected');
			this.updateConnectionStatus(false);
			this.attemptReconnect();
		};
	}

	attemptReconnect() {
		if (this.reconnectAttempts < this.maxReconnectAttempts) {
			this.reconnectAttempts++;
			const delay = this.reconnectDelay * this.reconnectAttempts;
			console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
			setTimeout(() => this.connect(), delay);
		} else {
			console.error('Max reconnection attempts reached');
		}
	}

	handleMessage(message) {
		const listeners = this.listeners.get(message.type) || [];
		listeners.forEach(listener => listener(message));
	}

	on(type, listener) {
		if (!this.listeners.has(type)) {
			this.listeners.set(type, []);
		}
		this.listeners.get(type).push(listener);
	}

	off(type, listener) {
		const listeners = this.listeners.get(type);
		if (listeners) {
			const index = listeners.indexOf(listener);
			if (index !== -1) {
				listeners.splice(index, 1);
			}
		}
	}

	updateConnectionStatus(connected) {
		const statusDot = document.getElementById('statusDot');
		const statusText = document.getElementById('statusText');

		if (connected) {
			statusDot.className = 'status-dot status-ok';
			statusText.textContent = 'Connected';
		} else {
			statusDot.className = 'status-dot status-error';
			statusText.textContent = 'Disconnected';
		}
	}
}

// Kanban Board Manager
class KanbanBoard {
	constructor(boardId, projectId = null) {
		this.boardId = boardId;
		this.projectId = projectId;
		this.board = null;
		this.boards = [];
		this.tasks = [];
		this.columns = [];
		this.draggedCard = null;
		this.draggedTask = null;

		// Filter state
		this.filters = {
			search: '',
			priorities: new Set()
		};

		this.wsManager = new WebSocketManager();
		this.setupWebSocket();
	}

	setupWebSocket() {
		this.wsManager.connect();

		// Listen for task updates
		this.wsManager.on('task.created', (message) => {
			if (message.data.board_id === this.boardId) {
				this.tasks.push(message.data);
				this.render();
			}
		});

		this.wsManager.on('task.updated', (message) => {
			if (message.data.board_id === this.boardId) {
				const index = this.tasks.findIndex(t => t.id === message.data.id);
				if (index !== -1) {
					this.tasks[index] = message.data;
					this.render();
				}
			}
		});

		this.wsManager.on('task.deleted', (message) => {
			const index = this.tasks.findIndex(t => t.id === message.task_id);
			if (index !== -1) {
				this.tasks.splice(index, 1);
				this.render();
			}
		});
	}

	async init() {
		try {
			// Load board and tasks
			this.board = await API.getBoard(this.boardId);
			this.tasks = await API.getTasks(this.boardId);
			this.columns = this.board.columns || [];

			// Get project ID from board
			this.projectId = this.board.project_id;

			// Load all boards for this project
			this.boards = await API.getBoards(this.projectId);

			// Update header
			document.getElementById('boardTitle').textContent = this.board.name;
			document.getElementById('boardDescription').textContent = this.board.description || '';

			// Render board selector
			this.renderBoardSelector();

			// Render board
			this.render();

			// Setup event listeners
			this.setupEventListeners();
		} catch (error) {
			console.error('Failed to load board:', error);
			this.showError('Failed to load board');
		}
	}

	renderBoardSelector() {
		const boardSelectorList = document.getElementById('boardSelectorList');
		if (!boardSelectorList) return;

		boardSelectorList.innerHTML = this.boards.map(board => {
			const isActive = board.id === this.boardId;
			return `
				<button class="board-selector-item ${isActive ? 'active' : ''}" data-board-id="${board.id}">
					<div class="board-selector-item-title">${this.escapeHtml(board.name)}</div>
					${board.description ? `<div class="board-selector-item-desc">${this.escapeHtml(board.description)}</div>` : ''}
				</button>
			`;
		}).join('');

		// Add click handlers for board selection
		boardSelectorList.querySelectorAll('.board-selector-item').forEach(item => {
			item.addEventListener('click', (e) => {
				const boardId = e.currentTarget.dataset.boardId;
				if (boardId !== this.boardId) {
					this.switchBoard(boardId);
				}
				this.closeBoardSelector();
			});
		});
	}

	async switchBoard(boardId) {
		try {
			// Update URL
			const url = new URL(window.location);
			url.searchParams.set('id', boardId);
			window.history.pushState({}, '', url);

			// Update board ID
			this.boardId = boardId;

			// Reload board data
			this.board = await API.getBoard(this.boardId);
			this.tasks = await API.getTasks(this.boardId);
			this.columns = this.board.columns || [];

			// Update UI
			document.getElementById('boardTitle').textContent = this.board.name;
			document.getElementById('boardDescription').textContent = this.board.description || '';

			// Re-render
			this.renderBoardSelector();
			this.render();
		} catch (error) {
			console.error('Failed to switch board:', error);
			this.showError('Failed to switch board');
		}
	}

	toggleBoardSelector() {
		const dropdown = document.getElementById('boardSelectorDropdown');
		const isVisible = dropdown.style.display !== 'none';
		dropdown.style.display = isVisible ? 'none' : 'block';
	}

	closeBoardSelector() {
		const dropdown = document.getElementById('boardSelectorDropdown');
		dropdown.style.display = 'none';
	}

	showCreateBoardModal() {
		const modal = document.getElementById('taskModal');
		const modalTitle = document.getElementById('modalTitle');
		const modalBody = document.getElementById('modalBody');

		modalTitle.textContent = 'Create New Board';
		modalBody.innerHTML = `
			<form id="createBoardForm" style="display: flex; flex-direction: column; gap: var(--space-3);">
				<div>
					<label for="boardName" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Board Name *</label>
					<input type="text" id="boardName" required
						style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
				</div>
				<div>
					<label for="boardDescription" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Description</label>
					<textarea id="boardDescription" rows="3"
						style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base); resize: vertical;"></textarea>
				</div>
				<div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--color-border-subtle);">
					<button type="button" class="btn btn-secondary" id="cancelBoardBtn">Cancel</button>
					<button type="submit" class="btn btn-primary">Create Board</button>
				</div>
			</form>
		`;

		modal.style.display = 'flex';

		// Handle form submission
		document.getElementById('createBoardForm').addEventListener('submit', async (e) => {
			e.preventDefault();
			await this.createBoard();
		});

		// Handle cancel
		document.getElementById('cancelBoardBtn').addEventListener('click', () => {
			modal.style.display = 'none';
		});

		// Close modal overlay
		document.getElementById('modalOverlay').addEventListener('click', () => {
			modal.style.display = 'none';
		});
	}

	async createBoard() {
		const name = document.getElementById('boardName').value;
		const description = document.getElementById('boardDescription').value;

		try {
			const newBoard = await API.createBoard({
				project_id: this.projectId,
				name,
				description,
				columns: [
					{ id: 'todo', name: 'To Do', order: 0 },
					{ id: 'inprogress', name: 'In Progress', order: 1 },
					{ id: 'done', name: 'Done', order: 2 }
				]
			});

			// Reload boards list
			this.boards = await API.getBoards(this.projectId);
			this.renderBoardSelector();

			// Switch to new board
			await this.switchBoard(newBoard.id);

			// Close modal
			document.getElementById('taskModal').style.display = 'none';
		} catch (error) {
			console.error('Failed to create board:', error);
			this.showError('Failed to create board');
		}
	}

	updateClearFiltersButton() {
		const clearFiltersBtn = document.getElementById('clearFiltersBtn');
		const hasActiveFilters = this.filters.priorities.size > 0;
		clearFiltersBtn.style.display = hasActiveFilters ? 'flex' : 'none';
	}

	getFilteredTasks() {
		return this.tasks.filter(task => {
			// Search filter
			if (this.filters.search) {
				const searchLower = this.filters.search;
				const titleMatch = (task.title || '').toLowerCase().includes(searchLower);
				const descMatch = (task.description || '').toLowerCase().includes(searchLower);
				if (!titleMatch && !descMatch) {
					return false;
				}
			}

			// Priority filter
			if (this.filters.priorities.size > 0) {
				const taskPriority = task.priority || 'medium';
				if (!this.filters.priorities.has(taskPriority)) {
					return false;
				}
			}

			return true;
		});
	}

	render() {
		const boardEl = document.getElementById('kanbanBoard');
		const emptyState = document.getElementById('emptyState');

		if (this.tasks.length === 0 && this.columns.length === 0) {
			emptyState.style.display = 'flex';
			boardEl.innerHTML = '';
			return;
		}

		emptyState.style.display = 'none';
		boardEl.innerHTML = this.columns.map(column => this.renderColumn(column)).join('');

		// Setup drag and drop
		this.setupDragAndDrop();
	}

	renderColumn(column) {
		const filteredTasks = this.getFilteredTasks();
		const tasks = filteredTasks.filter(t => t.status === column.id);

		return `
			<div class="kanban-column" data-column-id="${column.id}">
				<div class="column-header">
					<div style="display: flex; align-items: center; gap: var(--space-2);">
						<h3 class="column-title">${this.escapeHtml(column.name)}</h3>
						<span class="column-count">${tasks.length}</span>
					</div>
					<div class="column-actions">
						<button class="btn-icon" aria-label="Column options">
							<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="1"></circle>
								<circle cx="12" cy="5" r="1"></circle>
								<circle cx="12" cy="19" r="1"></circle>
							</svg>
						</button>
					</div>
				</div>
				<div class="column-body" data-column-id="${column.id}">
					${tasks.map(task => this.renderCard(task)).join('')}
				</div>
				<div class="column-footer">
					<button class="add-card-btn" data-column-id="${column.id}">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<line x1="12" y1="5" x2="12" y2="19"></line>
							<line x1="5" y1="12" x2="19" y2="12"></line>
						</svg>
						Add Card
					</button>
				</div>
			</div>
		`;
	}

	renderCard(task) {
		const priorityClass = `priority-${task.priority || 'medium'}`;
		const shortId = task.id.substring(0, 8);

		return `
			<div class="kanban-card"
				data-task-id="${task.id}"
				draggable="true">
				<div class="card-header">
					<div class="card-title">${this.escapeHtml(task.title)}</div>
					<div class="card-id">#${shortId}</div>
				</div>
				${task.description ? `
					<div class="card-description">${this.escapeHtml(task.description)}</div>
				` : ''}
				${task.labels && task.labels.length > 0 ? `
					<div class="card-labels">
						${task.labels.map(label => `
							<span class="card-label">${this.escapeHtml(label)}</span>
						`).join('')}
					</div>
				` : ''}
				${task.linked_items && task.linked_items.some(item => item.type === 'bead') ? `
					<div class="card-beads-link">
						<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-right: 4px;">
							<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
							<path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
						</svg>
						Linked to ${task.linked_items.filter(item => item.type === 'bead').map(item => item.id).join(', ')}
					</div>
				` : ''}
				<div class="card-meta">
					<div class="card-meta-item ${priorityClass}">
						<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="12" y1="16" x2="12" y2="12"></line>
							<line x1="12" y1="8" x2="12.01" y2="8"></line>
						</svg>
						${task.priority || 'medium'}
					</div>
					${task.estimate ? `
						<div class="card-meta-item">
							<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
								<circle cx="12" cy="12" r="10"></circle>
								<polyline points="12 6 12 12 16 14"></polyline>
							</svg>
							${task.estimate}h
						</div>
					` : ''}
				</div>
			</div>
		`;
	}

	setupDragAndDrop() {
		// Setup draggable cards
		document.querySelectorAll('.kanban-card').forEach(card => {
			card.addEventListener('dragstart', this.handleDragStart.bind(this));
			card.addEventListener('dragend', this.handleDragEnd.bind(this));
		});

		// Setup drop zones (column bodies)
		document.querySelectorAll('.column-body').forEach(column => {
			column.addEventListener('dragover', this.handleDragOver.bind(this));
			column.addEventListener('drop', this.handleDrop.bind(this));
			column.addEventListener('dragleave', this.handleDragLeave.bind(this));
		});
	}

	handleDragStart(e) {
		this.draggedCard = e.target;
		const taskId = e.target.dataset.taskId;
		this.draggedTask = this.tasks.find(t => t.id === taskId);

		e.dataTransfer.effectAllowed = 'move';
		e.dataTransfer.setData('text/html', e.target.innerHTML);

		// Add dragging class
		setTimeout(() => {
			e.target.classList.add('dragging');
		}, 0);
	}

	handleDragEnd(e) {
		e.target.classList.remove('dragging');

		// Remove all drag-over classes
		document.querySelectorAll('.column-body').forEach(col => {
			col.classList.remove('drag-over');
		});
	}

	handleDragOver(e) {
		if (e.preventDefault) {
			e.preventDefault();
		}

		e.dataTransfer.dropEffect = 'move';
		e.currentTarget.classList.add('drag-over');

		return false;
	}

	handleDragLeave(e) {
		e.currentTarget.classList.remove('drag-over');
	}

	async handleDrop(e) {
		if (e.stopPropagation) {
			e.stopPropagation();
		}

		e.currentTarget.classList.remove('drag-over');

		const newColumnId = e.currentTarget.dataset.columnId;
		const oldColumnId = this.draggedTask.status;

		if (newColumnId !== oldColumnId) {
			// Update task status
			try {
				const updatedTask = {
					...this.draggedTask,
					status: newColumnId
				};

				await API.updateTask(this.draggedTask.id, updatedTask);

				// Update local state
				const index = this.tasks.findIndex(t => t.id === this.draggedTask.id);
				if (index !== -1) {
					this.tasks[index].status = newColumnId;
					this.render();
				}
			} catch (error) {
				console.error('Failed to update task:', error);
				this.showError('Failed to update task');
			}
		}

		return false;
	}

	setupEventListeners() {
		// Board selector
		const boardSelectorBtn = document.getElementById('boardSelectorBtn');
		const createBoardBtn = document.getElementById('createBoardBtn');

		boardSelectorBtn.addEventListener('click', (e) => {
			e.stopPropagation();
			this.toggleBoardSelector();
		});

		createBoardBtn.addEventListener('click', () => {
			this.closeBoardSelector();
			this.showCreateBoardModal();
		});

		// Close dropdown when clicking outside
		document.addEventListener('click', (e) => {
			const boardSelector = document.getElementById('boardSelector');
			if (!boardSelector.contains(e.target)) {
				this.closeBoardSelector();
			}
		});

		// Search input
		const searchInput = document.getElementById('searchInput');
		const clearSearchBtn = document.getElementById('clearSearchBtn');

		searchInput.addEventListener('input', (e) => {
			this.filters.search = e.target.value.toLowerCase();
			clearSearchBtn.style.display = this.filters.search ? 'flex' : 'none';
			this.render();
		});

		clearSearchBtn.addEventListener('click', () => {
			searchInput.value = '';
			this.filters.search = '';
			clearSearchBtn.style.display = 'none';
			this.render();
		});

		// Priority filter buttons
		document.querySelectorAll('.filter-btn[data-filter="priority"]').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const value = e.currentTarget.dataset.value;
				const btn = e.currentTarget;

				if (this.filters.priorities.has(value)) {
					this.filters.priorities.delete(value);
					btn.classList.remove('active');
				} else {
					this.filters.priorities.add(value);
					btn.classList.add('active');
				}

				this.updateClearFiltersButton();
				this.render();
			});
		});

		// Clear filters button
		const clearFiltersBtn = document.getElementById('clearFiltersBtn');
		clearFiltersBtn.addEventListener('click', () => {
			this.filters.priorities.clear();
			document.querySelectorAll('.filter-btn').forEach(btn => {
				btn.classList.remove('active');
			});
			this.updateClearFiltersButton();
			this.render();
		});

		// New task button
		document.getElementById('newTaskBtn').addEventListener('click', () => {
			this.showCreateTaskModal();
		});

		document.getElementById('emptyNewTaskBtn')?.addEventListener('click', () => {
			this.showCreateTaskModal();
		});

		// Add card buttons
		document.querySelectorAll('.add-card-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const columnId = e.currentTarget.dataset.columnId;
				this.showCreateTaskModal(columnId);
			});
		});

		// Card click - show details
		document.querySelectorAll('.kanban-card').forEach(card => {
			card.addEventListener('click', (e) => {
				// Don't trigger during drag
				if (!e.target.classList.contains('dragging')) {
					const taskId = e.currentTarget.dataset.taskId;
					this.showTaskDetails(taskId);
				}
			});
		});
	}

	showCreateTaskModal(columnId = null) {
		const modal = document.getElementById('taskModal');
		const modalTitle = document.getElementById('modalTitle');
		const modalBody = document.getElementById('modalBody');

		const statusColumn = columnId || (this.columns[0]?.id || 'todo');

		modalTitle.textContent = 'Create New Task';
		modalBody.innerHTML = `
			<form id="taskForm" style="display: flex; flex-direction: column; gap: var(--space-3);">
				<div>
					<label for="taskTitle" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Title *</label>
					<input type="text" id="taskTitle" required
						style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
				</div>
				<div>
					<label for="taskDescription" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Description</label>
					<textarea id="taskDescription" rows="4"
						style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base); resize: vertical;"></textarea>
				</div>
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
					<div>
						<label for="taskPriority" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Priority</label>
						<select id="taskPriority"
							style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
							<option value="low">Low</option>
							<option value="medium" selected>Medium</option>
							<option value="high">High</option>
							<option value="urgent">Urgent</option>
						</select>
					</div>
					<div>
						<label for="taskEstimate" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Estimate (hours)</label>
						<input type="number" id="taskEstimate" min="0" step="0.5"
							style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
					</div>
				</div>
				<div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-2);">
					<button type="button" class="btn btn-secondary" id="cancelTaskBtn">Cancel</button>
					<button type="submit" class="btn btn-primary">Create Task</button>
				</div>
			</form>
		`;

		modal.style.display = 'flex';

		// Focus title input
		setTimeout(() => document.getElementById('taskTitle').focus(), 100);

		// Handle form submission
		document.getElementById('taskForm').addEventListener('submit', async (e) => {
			e.preventDefault();

			const task = {
				board_id: this.boardId,
				title: document.getElementById('taskTitle').value,
				description: document.getElementById('taskDescription').value,
				status: statusColumn,
				priority: document.getElementById('taskPriority').value,
			};

			const estimate = parseFloat(document.getElementById('taskEstimate').value);
			if (estimate) {
				task.estimate = estimate;
			}

			try {
				await API.createTask(task);
				modal.style.display = 'none';
			} catch (error) {
				console.error('Failed to create task:', error);
				this.showError('Failed to create task');
			}
		});

		// Handle cancel
		document.getElementById('cancelTaskBtn').addEventListener('click', () => {
			modal.style.display = 'none';
		});

		// Handle modal close
		document.getElementById('closeModalBtn').addEventListener('click', () => {
			modal.style.display = 'none';
		});

		document.getElementById('modalOverlay').addEventListener('click', () => {
			modal.style.display = 'none';
		});
	}

	showTaskDetails(taskId) {
		const task = this.tasks.find(t => t.id === taskId);
		if (!task) return;

		const modal = document.getElementById('taskModal');
		const modalTitle = document.getElementById('modalTitle');
		const modalBody = document.getElementById('modalBody');

		const formatDate = (date) => {
			if (!date) return 'N/A';
			return new Date(date).toLocaleString();
		};

		const renderViewMode = () => {
			modalTitle.textContent = 'Task Details';
			modalBody.innerHTML = `
				<div style="display: flex; flex-direction: column; gap: var(--space-4);">
					<!-- Header with actions -->
					<div style="display: flex; justify-content: space-between; align-items: flex-start; gap: var(--space-3);">
						<div style="flex: 1;">
							<div style="font-family: var(--font-mono); font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">#${task.id.substring(0, 8)}</div>
							<h3 style="font-size: var(--font-size-2xl); font-weight: 700; line-height: 1.3;">${this.escapeHtml(task.title)}</h3>
						</div>
						<div style="display: flex; gap: var(--space-2);">
							<button class="btn btn-secondary" id="editTaskBtn">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
									<path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
								</svg>
								Edit
							</button>
							<button class="btn btn-secondary" style="color: var(--color-error); border-color: var(--color-error);" id="deleteTaskBtn">
								<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									<polyline points="3 6 5 6 21 6"></polyline>
									<path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
								</svg>
								Delete
							</button>
						</div>
					</div>

					<!-- Description -->
					${task.description ? `
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-sm); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Description</div>
							<div style="color: var(--color-text-secondary); line-height: 1.6; white-space: pre-wrap;">${this.escapeHtml(task.description)}</div>
						</div>
					` : '<div style="color: var(--color-text-tertiary); font-style: italic;">No description</div>'}

					<!-- Metadata Grid -->
					<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-3); padding: var(--space-3); background: var(--color-bg-tertiary); border-radius: var(--radius-md);">
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Status</div>
							<div style="font-weight: 600; text-transform: capitalize;">${this.escapeHtml(task.status)}</div>
						</div>
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Priority</div>
							<div class="priority-${task.priority || 'medium'}" style="font-weight: 600; text-transform: capitalize;">${task.priority || 'medium'}</div>
						</div>
						${task.estimate ? `
							<div>
								<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Estimate</div>
								<div style="font-family: var(--font-mono); font-weight: 600;">${task.estimate}h</div>
							</div>
						` : ''}
						${task.actual ? `
							<div>
								<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Actual</div>
								<div style="font-family: var(--font-mono); font-weight: 600;">${task.actual}h</div>
							</div>
						` : ''}
					</div>

					<!-- Labels -->
					${task.labels && task.labels.length > 0 ? `
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-sm); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-2);">Labels</div>
							<div style="display: flex; flex-wrap: wrap; gap: var(--space-1);">
								${task.labels.map(label => `
									<span style="padding: 4px var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); font-size: var(--font-size-sm); font-weight: 500;">
										${this.escapeHtml(label)}
									</span>
								`).join('')}
							</div>
						</div>
					` : ''}

					<!-- Timestamps -->
					<div style="padding-top: var(--space-3); border-top: 1px solid var(--color-border-subtle); display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Created</div>
							<div style="font-family: var(--font-mono); font-size: var(--font-size-sm); color: var(--color-text-secondary);">${formatDate(task.created_at)}</div>
						</div>
						<div>
							<div style="font-weight: 600; font-size: var(--font-size-xs); text-transform: uppercase; letter-spacing: 0.05em; color: var(--color-text-tertiary); margin-bottom: var(--space-1);">Updated</div>
							<div style="font-family: var(--font-mono); font-size: var(--font-size-sm); color: var(--color-text-secondary);">${formatDate(task.updated_at)}</div>
						</div>
					</div>
				</div>
			`;

			// Edit button handler
			document.getElementById('editTaskBtn').addEventListener('click', () => {
				renderEditMode();
			});

			// Delete button handler
			document.getElementById('deleteTaskBtn').addEventListener('click', async () => {
				if (confirm(`Are you sure you want to delete "${task.title}"? This cannot be undone.`)) {
					try {
						await API.deleteTask(task.id);
						modal.style.display = 'none';
						// Task will be removed by WebSocket update
					} catch (error) {
						console.error('Failed to delete task:', error);
						this.showError('Failed to delete task');
					}
				}
			});
		};

		const renderEditMode = () => {
			modalTitle.textContent = 'Edit Task';
			modalBody.innerHTML = `
				<form id="editTaskForm" style="display: flex; flex-direction: column; gap: var(--space-3);">
					<div>
						<label for="editTaskTitle" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Title *</label>
						<input type="text" id="editTaskTitle" required value="${this.escapeHtml(task.title)}"
							style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
					</div>
					<div>
						<label for="editTaskDescription" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Description</label>
						<textarea id="editTaskDescription" rows="6"
							style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base); resize: vertical;">${task.description || ''}</textarea>
					</div>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
						<div>
							<label for="editTaskStatus" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Status</label>
							<select id="editTaskStatus"
								style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
								${this.columns.map(col => `
									<option value="${col.id}" ${task.status === col.id ? 'selected' : ''}>${col.name}</option>
								`).join('')}
							</select>
						</div>
						<div>
							<label for="editTaskPriority" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Priority</label>
							<select id="editTaskPriority"
								style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
								<option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
								<option value="medium" ${(task.priority === 'medium' || !task.priority) ? 'selected' : ''}>Medium</option>
								<option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
								<option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>Urgent</option>
							</select>
						</div>
					</div>
					<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-2);">
						<div>
							<label for="editTaskEstimate" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Estimate (hours)</label>
							<input type="number" id="editTaskEstimate" min="0" step="0.5" value="${task.estimate || ''}"
								style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
						</div>
						<div>
							<label for="editTaskActual" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Actual (hours)</label>
							<input type="number" id="editTaskActual" min="0" step="0.5" value="${task.actual || ''}"
								style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
						</div>
					</div>
					<div>
						<label for="editTaskLabels" style="display: block; margin-bottom: var(--space-1); font-weight: 600;">Labels (comma-separated)</label>
						<input type="text" id="editTaskLabels" value="${(task.labels || []).join(', ')}" placeholder="bug, feature, urgent"
							style="width: 100%; padding: var(--space-2); background: var(--color-bg-tertiary); border: 1px solid var(--color-border-default); border-radius: var(--radius-md); color: var(--color-text-primary); font-family: var(--font-sans); font-size: var(--font-size-base);">
					</div>
					<div style="display: flex; gap: var(--space-2); justify-content: flex-end; margin-top: var(--space-2); padding-top: var(--space-3); border-top: 1px solid var(--color-border-subtle);">
						<button type="button" class="btn btn-secondary" id="cancelEditBtn">Cancel</button>
						<button type="submit" class="btn btn-primary">Save Changes</button>
					</div>
				</form>
			`;

			// Focus title input
			setTimeout(() => document.getElementById('editTaskTitle').focus(), 100);

			// Handle form submission
			document.getElementById('editTaskForm').addEventListener('submit', async (e) => {
				e.preventDefault();

				const updatedTask = {
					...task,
					title: document.getElementById('editTaskTitle').value,
					description: document.getElementById('editTaskDescription').value,
					status: document.getElementById('editTaskStatus').value,
					priority: document.getElementById('editTaskPriority').value,
				};

				const estimate = parseFloat(document.getElementById('editTaskEstimate').value);
				if (estimate) {
					updatedTask.estimate = estimate;
				} else {
					delete updatedTask.estimate;
				}

				const actual = parseFloat(document.getElementById('editTaskActual').value);
				if (actual) {
					updatedTask.actual = actual;
				} else {
					delete updatedTask.actual;
				}

				const labelsInput = document.getElementById('editTaskLabels').value.trim();
				if (labelsInput) {
					updatedTask.labels = labelsInput.split(',').map(l => l.trim()).filter(l => l);
				} else {
					updatedTask.labels = [];
				}

				try {
					await API.updateTask(task.id, updatedTask);
					// Update will be reflected by WebSocket
					modal.style.display = 'none';
				} catch (error) {
					console.error('Failed to update task:', error);
					this.showError('Failed to update task');
				}
			});

			// Handle cancel
			document.getElementById('cancelEditBtn').addEventListener('click', () => {
				renderViewMode();
			});
		};

		// Start in view mode
		renderViewMode();
		modal.style.display = 'flex';

		// Handle modal close
		const closeHandler = () => {
			modal.style.display = 'none';
		};

		document.getElementById('closeModalBtn').addEventListener('click', closeHandler);
		document.getElementById('modalOverlay').addEventListener('click', closeHandler);

		// Handle escape key
		const escapeHandler = (e) => {
			if (e.key === 'Escape') {
				modal.style.display = 'none';
				document.removeEventListener('keydown', escapeHandler);
			}
		};
		document.addEventListener('keydown', escapeHandler);
	}

	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	showError(message) {
		// Simple error display - could be enhanced with a toast notification
		alert(message);
	}
}

// Initialize board on page load
document.addEventListener('DOMContentLoaded', async () => {
	try {
		// Get board ID from URL or use first board
		const urlParams = new URLSearchParams(window.location.search);
		let boardId = urlParams.get('id');

		if (!boardId) {
			// Load first project and first board
			const projects = await API.getProjects();
			if (projects.length === 0) {
				throw new Error('No projects found');
			}

			const boards = await API.getBoards(projects[0].id);
			if (boards.length === 0) {
				throw new Error('No boards found');
			}

			boardId = boards[0].id;
		}

		const kanban = new KanbanBoard(boardId);
		await kanban.init();

		// Make globally accessible for debugging
		window.kanban = kanban;
	} catch (error) {
		console.error('Failed to initialize board:', error);
		document.getElementById('boardTitle').textContent = 'Error loading board';
		document.getElementById('boardDescription').textContent = error.message;
	}
});
