// Markdown Editor with Live Preview

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

	async getDocuments(projectId) {
		return this.fetch(`/api/documents?project_id=${projectId}`);
	},

	async getDocument(docId) {
		return this.fetch(`/api/documents/${docId}`);
	},

	async createDocument(doc) {
		return this.fetch('/api/documents', {
			method: 'POST',
			body: JSON.stringify(doc)
		});
	},

	async updateDocument(docId, doc) {
		return this.fetch(`/api/documents/${docId}`, {
			method: 'PUT',
			body: JSON.stringify(doc)
		});
	}
};

// Markdown Editor Manager
class MarkdownEditor {
	constructor(projectId) {
		this.projectId = projectId;
		this.currentDoc = null;
		this.isDirty = false;
		this.autoSaveTimer = null;
		this.documents = [];
		this.searchFilter = '';

		// Elements
		this.titleInput = document.getElementById('docTitle');
		this.editor = document.getElementById('markdownEditor');
		this.preview = document.getElementById('markdownPreview');
		this.saveBtn = document.getElementById('saveBtn');
		this.newDocBtn = document.getElementById('newDocBtn');
		this.docPath = document.getElementById('docPath');
		this.docUpdated = document.getElementById('docUpdated');
		this.fileBrowser = document.getElementById('fileBrowser');
		this.fileBrowserTree = document.getElementById('fileBrowserTree');
		this.fileBrowserSearch = document.getElementById('fileBrowserSearch');
		this.toggleSidebarBtn = document.getElementById('toggleSidebarBtn');

		this.setupEventListeners();
		this.init();
	}

	setupEventListeners() {
		// Title input
		this.titleInput.addEventListener('input', () => {
			this.markDirty();
		});

		// Editor input with live preview
		this.editor.addEventListener('input', () => {
			this.updatePreview();
			this.markDirty();
			this.scheduleAutoSave();
		});

		// Save button
		this.saveBtn.addEventListener('click', () => {
			this.save();
		});

		// New document button
		this.newDocBtn.addEventListener('click', () => {
			this.newDocument();
		});

		// File browser search
		this.fileBrowserSearch.addEventListener('input', (e) => {
			this.searchFilter = e.target.value.toLowerCase();
			this.renderFileBrowser();
		});

		// Toggle sidebar button
		this.toggleSidebarBtn.addEventListener('click', () => {
			this.fileBrowser.classList.toggle('collapsed');
		});

		// Keyboard shortcuts
		document.addEventListener('keydown', (e) => {
			// Cmd/Ctrl + S to save
			if ((e.metaKey || e.ctrlKey) && e.key === 's') {
				e.preventDefault();
				this.save();
			}
		});
	}

	async init() {
		// Load all documents for file browser
		try {
			this.documents = await API.getDocuments(this.projectId);
			this.renderFileBrowser();
		} catch (error) {
			console.error('Failed to load documents:', error);
		}

		// Get document ID from URL
		const urlParams = new URLSearchParams(window.location.search);
		const docId = urlParams.get('id');

		if (docId) {
			await this.loadDocument(docId);
		} else {
			this.newDocument();
		}

		// Initialize marked.js with options
		marked.setOptions({
			breaks: true,
			gfm: true,
			headerIds: true
		});

		this.updatePreview();
	}

	async loadDocument(docId) {
		try {
			this.currentDoc = await API.getDocument(docId);
			this.titleInput.value = this.currentDoc.title;
			this.editor.value = this.currentDoc.content || '';
			this.updateMeta();
			this.updatePreview();
			this.isDirty = false;
			this.saveBtn.disabled = true;
		} catch (error) {
			console.error('Failed to load document:', error);
			alert('Failed to load document');
		}
	}

	newDocument() {
		this.currentDoc = {
			id: null,
			project_id: this.projectId,
			title: '',
			content: '',
			path: '/',
			tags: [],
			linked_from: [],
			links_to: []
		};
		this.titleInput.value = '';
		this.editor.value = '';
		this.updateMeta();
		this.updatePreview();
		this.isDirty = false;
		this.saveBtn.disabled = true;

		// Update URL
		window.history.pushState({}, '', '/static/docs.html');

		// Refresh file browser to clear active state
		this.renderFileBrowser();
	}

	updatePreview() {
		const markdown = this.editor.value;
		if (!markdown) {
			this.preview.innerHTML = '<p class="preview-placeholder">Preview will appear here...</p>';
			return;
		}

		try {
			// Process wiki-style links before markdown parsing
			const processedMarkdown = this.processWikiLinks(markdown);
			const html = marked.parse(processedMarkdown);
			this.preview.innerHTML = html;

			// Add click handlers for internal links
			this.attachInternalLinkHandlers();
		} catch (error) {
			console.error('Markdown parse error:', error);
			this.preview.innerHTML = '<p class="preview-placeholder">Error parsing markdown</p>';
		}
	}

	processWikiLinks(markdown) {
		// Replace [[Document Title]] with markdown links
		// Pattern: [[title]] or [[title|display text]]
		return markdown.replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (match, target, displayText) => {
			const display = displayText || target;
			const doc = this.findDocumentByTitle(target.trim());

			if (doc) {
				// Found document - create internal link
				return `[${display}](#doc:${doc.id} "${doc.title}")`;
			} else {
				// Document not found - create placeholder link
				return `[${display}](#doc:not-found:${encodeURIComponent(target.trim())} "${target} (not found)")`;
			}
		});
	}

	findDocumentByTitle(title) {
		const titleLower = title.toLowerCase();
		return this.documents.find(doc =>
			(doc.title || '').toLowerCase() === titleLower ||
			(doc.path || '').toLowerCase().includes(titleLower)
		);
	}

	attachInternalLinkHandlers() {
		const links = this.preview.querySelectorAll('a[href^="#doc:"]');
		links.forEach(link => {
			link.addEventListener('click', async (e) => {
				e.preventDefault();
				const href = link.getAttribute('href');

				// Extract document ID from href
				const match = href.match(/#doc:([^:]+)(?::(.+))?/);
				if (match) {
					const docId = match[1];

					if (docId === 'not-found') {
						const targetTitle = decodeURIComponent(match[2] || '');
						alert(`Document "${targetTitle}" not found. Create it first.`);
						return;
					}

					// Load the linked document
					await this.loadDocument(docId);
					window.history.pushState({}, '', `/static/docs.html?id=${docId}`);
					this.renderFileBrowser();
				}
			});

			// Style internal links differently
			link.classList.add('internal-link');
		});

		// Style broken links
		const brokenLinks = this.preview.querySelectorAll('a[href^="#doc:not-found"]');
		brokenLinks.forEach(link => {
			link.classList.add('broken-link');
		});
	}

	markDirty() {
		this.isDirty = true;
		this.saveBtn.disabled = false;
	}

	scheduleAutoSave() {
		// Clear existing timer
		if (this.autoSaveTimer) {
			clearTimeout(this.autoSaveTimer);
		}

		// Schedule auto-save after 2 seconds of inactivity
		this.autoSaveTimer = setTimeout(() => {
			if (this.isDirty && this.currentDoc && this.currentDoc.id) {
				this.save();
			}
		}, 2000);
	}

	async save() {
		if (!this.isDirty) return;

		const title = this.titleInput.value.trim() || 'Untitled Document';
		const content = this.editor.value;

		try {
			// Extract links from content
			const linksTo = this.extractLinks(content);

			if (this.currentDoc.id) {
				// Update existing document
				this.currentDoc.title = title;
				this.currentDoc.content = content;
				this.currentDoc.path = `/${this.slugify(title)}.md`;
				this.currentDoc.links_to = linksTo;

				await API.updateDocument(this.currentDoc.id, this.currentDoc);

				// Update in documents list
				const index = this.documents.findIndex(d => d.id === this.currentDoc.id);
				if (index !== -1) {
					this.documents[index] = this.currentDoc;
				}
			} else {
				// Create new document
				this.currentDoc.title = title;
				this.currentDoc.content = content;
				this.currentDoc.path = `/${this.slugify(title)}.md`;
				this.currentDoc.links_to = linksTo;

				const created = await API.createDocument(this.currentDoc);
				this.currentDoc = created;

				// Add to documents list
				this.documents.push(created);

				// Update URL with new document ID
				window.history.pushState({}, '', `/static/docs.html?id=${created.id}`);
			}

			this.isDirty = false;
			this.saveBtn.disabled = true;
			this.updateMeta();

			// Refresh file browser to show updated document
			this.renderFileBrowser();
		} catch (error) {
			console.error('Failed to save document:', error);
			alert('Failed to save document');
		}
	}

	extractLinks(content) {
		const links = [];
		const wikiLinkPattern = /\[\[([^\]|]+)(?:\|[^\]]+)?\]\]/g;
		let match;

		while ((match = wikiLinkPattern.exec(content)) !== null) {
			const targetTitle = match[1].trim();
			const doc = this.findDocumentByTitle(targetTitle);
			if (doc && !links.includes(doc.id)) {
				links.push(doc.id);
			}
		}

		return links;
	}

	updateMeta() {
		if (this.currentDoc) {
			this.docPath.textContent = this.currentDoc.path || '';

			if (this.currentDoc.updated_at) {
				const date = new Date(this.currentDoc.updated_at);
				this.docUpdated.textContent = `Updated ${date.toLocaleString()}`;
			} else {
				this.docUpdated.textContent = 'Not saved yet';
			}
		}
	}

	slugify(text) {
		return text
			.toLowerCase()
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '');
	}

	// File Browser Methods
	renderFileBrowser() {
		const filtered = this.getFilteredDocuments();

		if (filtered.length === 0) {
			this.fileBrowserTree.innerHTML = `
				<div class="file-browser-empty">
					<p>${this.searchFilter ? 'No matching documents' : 'No documents yet'}</p>
				</div>
			`;
			return;
		}

		// Build folder structure
		const tree = this.buildFolderTree(filtered);
		this.fileBrowserTree.innerHTML = this.renderTree(tree);

		// Add click listeners
		this.attachFileBrowserListeners();
	}

	getFilteredDocuments() {
		if (!this.searchFilter) {
			return this.documents;
		}

		return this.documents.filter(doc => {
			const titleMatch = (doc.title || '').toLowerCase().includes(this.searchFilter);
			const pathMatch = (doc.path || '').toLowerCase().includes(this.searchFilter);
			const contentMatch = (doc.content || '').toLowerCase().includes(this.searchFilter);
			const tagsMatch = (doc.tags || []).some(tag =>
				tag.toLowerCase().includes(this.searchFilter)
			);
			return titleMatch || pathMatch || contentMatch || tagsMatch;
		});
	}

	buildFolderTree(docs) {
		const tree = {
			name: 'root',
			children: {},
			docs: []
		};

		docs.forEach(doc => {
			const path = doc.path || '/untitled.md';
			const parts = path.split('/').filter(p => p);

			if (parts.length === 1) {
				// Root level document
				tree.docs.push(doc);
			} else {
				// Document in folder
				const folderName = parts[0];
				if (!tree.children[folderName]) {
					tree.children[folderName] = {
						name: folderName,
						children: {},
						docs: []
					};
				}
				tree.children[folderName].docs.push(doc);
			}
		});

		return tree;
	}

	renderTree(node, level = 0) {
		let html = '';

		// Render folders
		const folders = Object.keys(node.children).sort();
		folders.forEach(folderName => {
			const folder = node.children[folderName];
			html += `
				<div class="file-browser-folder" data-folder="${folderName}">
					<div class="file-browser-folder-header">
						<svg class="file-browser-folder-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<polyline points="9 18 15 12 9 6"></polyline>
						</svg>
						<span class="file-browser-folder-name">${folderName}</span>
					</div>
					<div class="file-browser-folder-content">
						${this.renderDocuments(folder.docs)}
					</div>
				</div>
			`;
		});

		// Render root level documents
		html += this.renderDocuments(node.docs);

		return html;
	}

	renderDocuments(docs) {
		if (!docs || docs.length === 0) return '';

		return docs
			.sort((a, b) => {
				const aTime = new Date(a.updated_at || a.created_at);
				const bTime = new Date(b.updated_at || b.created_at);
				return bTime - aTime;
			})
			.map(doc => {
				const isActive = this.currentDoc && this.currentDoc.id === doc.id;
				const updatedDate = new Date(doc.updated_at || doc.created_at);
				const timeAgo = this.getTimeAgo(updatedDate);

				// Get search snippet if searching content
				const snippet = this.searchFilter ? this.getSearchSnippet(doc) : '';
				const snippetHtml = snippet ? `<div class="file-browser-item-snippet">${snippet}</div>` : '';

				return `
					<div class="file-browser-item ${isActive ? 'active' : ''}" data-doc-id="${doc.id}">
						<svg class="file-browser-item-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
							<polyline points="14 2 14 8 20 8"></polyline>
							<line x1="16" y1="13" x2="8" y2="13"></line>
							<line x1="16" y1="17" x2="8" y2="17"></line>
							<polyline points="10 9 9 9 8 9"></polyline>
						</svg>
						<div class="file-browser-item-content">
							<div class="file-browser-item-name">${doc.title || 'Untitled'}</div>
							<div class="file-browser-item-meta">${timeAgo}</div>
							${snippetHtml}
						</div>
					</div>
				`;
			})
			.join('');
	}

	getSearchSnippet(doc) {
		const content = doc.content || '';
		const contentLower = content.toLowerCase();
		const filterLower = this.searchFilter.toLowerCase();

		// Check if content contains the search term
		const index = contentLower.indexOf(filterLower);
		if (index === -1) {
			return ''; // No match in content
		}

		// Extract snippet around the match
		const snippetRadius = 60; // Characters before/after match
		const start = Math.max(0, index - snippetRadius);
		const end = Math.min(content.length, index + filterLower.length + snippetRadius);

		let snippet = content.substring(start, end);

		// Add ellipsis if truncated
		if (start > 0) snippet = '...' + snippet;
		if (end < content.length) snippet = snippet + '...';

		// Highlight the search term
		const regex = new RegExp(`(${this.escapeRegex(this.searchFilter)})`, 'gi');
		snippet = this.escapeHtml(snippet).replace(regex, '<mark>$1</mark>');

		return snippet;
	}

	escapeHtml(text) {
		const div = document.createElement('div');
		div.textContent = text;
		return div.innerHTML;
	}

	escapeRegex(text) {
		return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	}

	getTimeAgo(date) {
		const now = new Date();
		const diffMs = now - date;
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return 'Just now';
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 7) return `${diffDays}d ago`;
		return date.toLocaleDateString();
	}

	attachFileBrowserListeners() {
		// Document click handlers
		const items = this.fileBrowserTree.querySelectorAll('.file-browser-item');
		items.forEach(item => {
			item.addEventListener('click', async () => {
				const docId = item.dataset.docId;
				await this.loadDocument(docId);

				// Update URL
				window.history.pushState({}, '', `/static/docs.html?id=${docId}`);

				// Update UI
				this.renderFileBrowser();
			});
		});

		// Folder toggle handlers
		const folders = this.fileBrowserTree.querySelectorAll('.file-browser-folder-header');
		folders.forEach(header => {
			header.addEventListener('click', () => {
				const folder = header.parentElement;
				folder.classList.toggle('collapsed');
			});
		});
	}
}

// Initialize editor
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('project_id') || '453adcfa-94e5-46ec-a91e-154aa14251b3'; // Default project

const editor = new MarkdownEditor(projectId);
