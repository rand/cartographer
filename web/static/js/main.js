// Cartographer - Main JavaScript

(function() {
	'use strict';

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
				throw new Error(`API Error: ${response.statusText}`);
			}

			return response.json();
		},

		async getHealth() {
			return this.fetch('/health');
		},

		async getProjects() {
			return this.fetch('/api/projects');
		},

		async getStats() {
			// Placeholder - will be implemented with real API
			return {
				tasksCompleted: 0,
				activeBoards: 0,
				totalDocs: 0,
				graphNodes: 0
			};
		}
	};

	// State Management
	const State = {
		projects: [],
		stats: {
			tasksCompleted: 0,
			activeBoards: 0,
			totalDocs: 0,
			graphNodes: 0
		}
	};

	// UI Updates
	const UI = {
		updateStats(stats) {
			const elements = {
				tasksCompleted: document.getElementById('tasks-completed'),
				activeBoards: document.getElementById('active-boards'),
				totalDocs: document.getElementById('total-docs'),
				graphNodes: document.getElementById('graph-nodes')
			};

			Object.keys(elements).forEach(key => {
				if (elements[key]) {
					this.animateValue(elements[key], 0, stats[key], 1000);
				}
			});
		},

		animateValue(element, start, end, duration) {
			const range = end - start;
			const startTime = performance.now();

			function update(currentTime) {
				const elapsed = currentTime - startTime;
				const progress = Math.min(elapsed / duration, 1);

				const easeOutQuart = 1 - Math.pow(1 - progress, 4);
				const current = Math.floor(start + (range * easeOutQuart));

				element.textContent = current.toLocaleString();

				if (progress < 1) {
					requestAnimationFrame(update);
				}
			}

			requestAnimationFrame(update);
		},

		renderProjects(projects) {
			const container = document.getElementById('projects-list');
			if (!container) return;

			if (projects.length === 0) {
				// Empty state is already in HTML
				return;
			}

			container.innerHTML = projects.map(project => `
				<article class="project-card" data-id="${project.id}">
					<div class="project-header">
						<h4 class="project-title">${this.escapeHtml(project.name)}</h4>
						<span class="project-type">${this.escapeHtml(project.type)}</span>
					</div>
					${project.description ? `
						<p class="project-description">${this.escapeHtml(project.description)}</p>
					` : ''}
					<div class="project-meta">
						<span class="project-meta-item">
							<svg width="14" height="14" viewBox="0 0 14 14" fill="none">
								<path d="M7 1L2 4V10L7 13L12 10V4L7 1Z" stroke="currentColor" stroke-width="1.5"/>
							</svg>
							${project.taskCount || 0} tasks
						</span>
						<span class="project-meta-item">
							${new Date(project.updatedAt).toLocaleDateString()}
						</span>
					</div>
				</article>
			`).join('');
		},

		escapeHtml(text) {
			const div = document.createElement('div');
			div.textContent = text;
			return div.innerHTML;
		},

		showError(message) {
			console.error('Error:', message);
			// TODO: Implement toast notification system
		},

		showLoading(show) {
			// TODO: Implement loading indicator
			console.log('Loading:', show);
		}
	};

	// Event Handlers
	const Events = {
		init() {
			// Keyboard shortcuts
			document.addEventListener('keydown', this.handleKeyboard.bind(this));

			// Click handlers
			document.addEventListener('click', this.handleClick.bind(this));
		},

		handleKeyboard(event) {
			// Cmd+K or Ctrl+K for search
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				this.openSearch();
			}

			// Escape to close modals
			if (event.key === 'Escape') {
				this.closeModals();
			}
		},

		handleClick(event) {
			const target = event.target;

			// Handle button clicks
			if (target.matches('.btn-primary') || target.closest('.btn-primary')) {
				const button = target.matches('.btn-primary') ? target : target.closest('.btn-primary');
				const text = button.textContent.trim();

				if (text.includes('New Project') || text.includes('Create Project')) {
					this.createProject();
				}
			}

			if (target.matches('.btn-secondary') || target.closest('.btn-secondary')) {
				const button = target.matches('.btn-secondary') ? target : target.closest('.btn-secondary');
				const text = button.textContent.trim();

				if (text.includes('Import Project')) {
					this.importProject();
				}
			}
		},

		openSearch() {
			console.log('Open search (Cmd+K)');
			// TODO: Implement search modal
		},

		closeModals() {
			console.log('Close modals (Escape)');
			// TODO: Close any open modals
		},

		createProject() {
			console.log('Create new project');
			// TODO: Implement project creation dialog
		},

		importProject() {
			console.log('Import project');
			// TODO: Implement project import dialog
		}
	};

	// App Initialization
	const App = {
		async init() {
			try {
				// Check health
				const health = await API.getHealth();
				console.log('System health:', health);

				// Load initial data
				await this.loadData();

				// Initialize event handlers
				Events.init();

				console.log('Cartographer initialized');
			} catch (error) {
				console.error('Failed to initialize app:', error);
				UI.showError('Failed to connect to server');
			}
		},

		async loadData() {
			try {
				UI.showLoading(true);

				// Load stats
				const stats = await API.getStats();
				State.stats = stats;
				UI.updateStats(stats);

				// Load projects (will fail until API is implemented, that's ok)
				try {
					const projects = await API.getProjects();
					State.projects = projects;
					UI.renderProjects(projects);
				} catch (error) {
					console.log('Projects API not yet implemented');
				}

				UI.showLoading(false);
			} catch (error) {
				console.error('Failed to load data:', error);
				UI.showLoading(false);
			}
		}
	};

	// Initialize when DOM is ready
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => App.init());
	} else {
		App.init();
	}

	// Expose API for debugging in development
	if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
		window.CartographerDebug = { API, State, UI, Events };
	}
})();
