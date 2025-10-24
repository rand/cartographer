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

		// Elements
		this.titleInput = document.getElementById('docTitle');
		this.editor = document.getElementById('markdownEditor');
		this.preview = document.getElementById('markdownPreview');
		this.saveBtn = document.getElementById('saveBtn');
		this.newDocBtn = document.getElementById('newDocBtn');
		this.docPath = document.getElementById('docPath');
		this.docUpdated = document.getElementById('docUpdated');

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
	}

	updatePreview() {
		const markdown = this.editor.value;
		if (!markdown) {
			this.preview.innerHTML = '<p class="preview-placeholder">Preview will appear here...</p>';
			return;
		}

		try {
			const html = marked.parse(markdown);
			this.preview.innerHTML = html;
		} catch (error) {
			console.error('Markdown parse error:', error);
			this.preview.innerHTML = '<p class="preview-placeholder">Error parsing markdown</p>';
		}
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
			if (this.currentDoc.id) {
				// Update existing document
				this.currentDoc.title = title;
				this.currentDoc.content = content;
				this.currentDoc.path = `/${this.slugify(title)}.md`;

				await API.updateDocument(this.currentDoc.id, this.currentDoc);
			} else {
				// Create new document
				this.currentDoc.title = title;
				this.currentDoc.content = content;
				this.currentDoc.path = `/${this.slugify(title)}.md`;

				const created = await API.createDocument(this.currentDoc);
				this.currentDoc = created;

				// Update URL with new document ID
				window.history.pushState({}, '', `/static/docs.html?id=${created.id}`);
			}

			this.isDirty = false;
			this.saveBtn.disabled = true;
			this.updateMeta();
		} catch (error) {
			console.error('Failed to save document:', error);
			alert('Failed to save document');
		}
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
}

// Initialize editor
const urlParams = new URLSearchParams(window.location.search);
const projectId = urlParams.get('project_id') || '453adcfa-94e5-46ec-a91e-154aa14251b3'; // Default project

const editor = new MarkdownEditor(projectId);
