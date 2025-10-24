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
	constructor(boardId) {
		this.boardId = boardId;
		this.board = null;
		this.tasks = [];
		this.columns = [];
		this.draggedCard = null;
		this.draggedTask = null;

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

			// Update header
			document.getElementById('boardTitle').textContent = this.board.name;
			document.getElementById('boardDescription').textContent = this.board.description || '';

			// Render board
			this.render();

			// Setup event listeners
			this.setupEventListeners();
		} catch (error) {
			console.error('Failed to load board:', error);
			this.showError('Failed to load board');
		}
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
		const tasks = this.tasks.filter(t => t.status === column.id);

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

		modalTitle.textContent = 'Task Details';
		modalBody.innerHTML = `
			<div style="display: flex; flex-direction: column; gap: var(--space-4);">
				<div>
					<div style="font-size: var(--font-size-xs); color: var(--color-text-tertiary); margin-bottom: var(--space-1);">ID: ${task.id}</div>
					<h3 style="font-size: var(--font-size-xl); font-weight: 700;">${this.escapeHtml(task.title)}</h3>
				</div>
				${task.description ? `
					<div>
						<div style="font-weight: 600; margin-bottom: var(--space-1);">Description</div>
						<div style="color: var(--color-text-secondary);">${this.escapeHtml(task.description)}</div>
					</div>
				` : ''}
				<div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3);">
					<div>
						<div style="font-weight: 600; margin-bottom: var(--space-1);">Status</div>
						<div style="color: var(--color-text-secondary);">${task.status}</div>
					</div>
					<div>
						<div style="font-weight: 600; margin-bottom: var(--space-1);">Priority</div>
						<div class="priority-${task.priority || 'medium'}">${task.priority || 'medium'}</div>
					</div>
					${task.estimate ? `
						<div>
							<div style="font-weight: 600; margin-bottom: var(--space-1);">Estimate</div>
							<div style="color: var(--color-text-secondary);">${task.estimate} hours</div>
						</div>
					` : ''}
				</div>
			</div>
		`;

		modal.style.display = 'flex';

		document.getElementById('closeModalBtn').addEventListener('click', () => {
			modal.style.display = 'none';
		});

		document.getElementById('modalOverlay').addEventListener('click', () => {
			modal.style.display = 'none';
		});
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
