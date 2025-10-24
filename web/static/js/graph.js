// Dependency Graph Visualization

class DependencyGraph {
    constructor() {
        this.issues = [];
        this.graph = null;
        this.nodes = [];
        this.edges = [];
        this.selectedNode = null;
        this.showClosed = false;
        this.showOrphans = true;
        this.layoutType = 'hierarchical';

        // SVG elements
        this.svg = document.getElementById('graphSvg');
        this.graphContent = document.getElementById('graphContent');
        this.nodesGroup = document.getElementById('nodes');
        this.edgesGroup = document.getElementById('edges');

        // UI elements
        this.loadingEl = document.getElementById('graphLoading');
        this.nodeDetailsEl = document.getElementById('nodeDetails');
        this.nodeDetailsTitleEl = document.getElementById('nodeDetailsTitle');
        this.nodeDetailsBodyEl = document.getElementById('nodeDetailsBody');

        this.init();
    }

    async init() {
        this.attachEventListeners();
        await this.loadData();
        this.render();
    }

    attachEventListeners() {
        // Controls
        document.getElementById('showClosed').addEventListener('change', (e) => {
            this.showClosed = e.target.checked;
            this.render();
        });

        document.getElementById('showOrphans').addEventListener('change', (e) => {
            this.showOrphans = e.target.checked;
            this.render();
        });

        document.getElementById('layoutType').addEventListener('change', (e) => {
            this.layoutType = e.target.value;
            this.render();
        });

        document.getElementById('resetZoom').addEventListener('click', () => {
            this.resetView();
        });

        document.getElementById('closeDetails').addEventListener('click', () => {
            this.hideDetails();
        });

        // SVG pan and zoom (basic)
        this.setupPanZoom();
    }

    async loadData() {
        try {
            const [issuesResponse, graphResponse] = await Promise.all([
                fetch('/api/beads/issues'),
                fetch('/api/beads/graph')
            ]);

            if (!issuesResponse.ok || !graphResponse.ok) {
                throw new Error('Failed to load data');
            }

            this.issues = await issuesResponse.json();
            this.graph = await graphResponse.json();

            this.loadingEl.classList.add('hidden');
        } catch (error) {
            console.error('Error loading graph data:', error);
            this.showError('Failed to load dependency graph');
        }
    }

    render() {
        // Filter issues
        const filteredIssues = this.getFilteredIssues();

        // Build node and edge data
        this.buildGraphData(filteredIssues);

        // Layout nodes
        this.layoutNodes();

        // Render edges and nodes
        this.renderEdges();
        this.renderNodes();
    }

    getFilteredIssues() {
        let filtered = this.issues;

        // Filter closed issues
        if (!this.showClosed) {
            filtered = filtered.filter(issue => issue.status !== 'closed');
        }

        // Filter orphans (nodes with no connections)
        if (!this.showOrphans) {
            const connectedIds = new Set();

            // Add all nodes that have connections
            Object.keys(this.graph.DependsOn || {}).forEach(id => {
                connectedIds.add(id);
                this.graph.DependsOn[id].forEach(depId => connectedIds.add(depId));
            });
            Object.keys(this.graph.Blocks || {}).forEach(id => {
                connectedIds.add(id);
                this.graph.Blocks[id].forEach(blockId => connectedIds.add(blockId));
            });
            Object.keys(this.graph.Related || {}).forEach(id => {
                connectedIds.add(id);
                this.graph.Related[id].forEach(relId => connectedIds.add(relId));
            });

            filtered = filtered.filter(issue => connectedIds.has(issue.id));
        }

        return filtered;
    }

    buildGraphData(issues) {
        // Create issue map for quick lookup
        const issueMap = new Map();
        issues.forEach(issue => issueMap.set(issue.id, issue));

        // Build nodes
        this.nodes = issues.map(issue => ({
            id: issue.id,
            issue: issue,
            x: 0,
            y: 0,
            radius: issue.issue_type === 'epic' ? 30 : 20
        }));

        // Build edges
        this.edges = [];

        // Dependencies (depends on)
        if (this.graph.DependsOn) {
            Object.entries(this.graph.DependsOn).forEach(([fromId, toIds]) => {
                if (!issueMap.has(fromId)) return;
                toIds.forEach(toId => {
                    if (!issueMap.has(toId)) return;
                    this.edges.push({
                        from: fromId,
                        to: toId,
                        type: 'depends-on'
                    });
                });
            });
        }

        // Blocks relationships
        if (this.graph.Blocks) {
            Object.entries(this.graph.Blocks).forEach(([fromId, toIds]) => {
                if (!issueMap.has(fromId)) return;
                toIds.forEach(toId => {
                    if (!issueMap.has(toId)) return;
                    this.edges.push({
                        from: fromId,
                        to: toId,
                        type: 'blocks'
                    });
                });
            });
        }

        // Related relationships (bidirectional, only add once)
        const addedRelated = new Set();
        if (this.graph.Related) {
            Object.entries(this.graph.Related).forEach(([fromId, toIds]) => {
                if (!issueMap.has(fromId)) return;
                toIds.forEach(toId => {
                    if (!issueMap.has(toId)) return;
                    const key = [fromId, toId].sort().join('-');
                    if (!addedRelated.has(key)) {
                        addedRelated.add(key);
                        this.edges.push({
                            from: fromId,
                            to: toId,
                            type: 'related'
                        });
                    }
                });
            });
        }
    }

    layoutNodes() {
        if (this.nodes.length === 0) return;

        if (this.layoutType === 'hierarchical') {
            this.layoutHierarchical();
        } else if (this.layoutType === 'circular') {
            this.layoutCircular();
        } else if (this.layoutType === 'force') {
            this.layoutForceDirected();
        }
    }

    layoutHierarchical() {
        // Simple hierarchical layout based on dependency depth
        const depths = new Map();
        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

        // Calculate depth for each node (max depth of dependencies + 1)
        const calculateDepth = (nodeId, visited = new Set()) => {
            if (depths.has(nodeId)) return depths.get(nodeId);
            if (visited.has(nodeId)) return 0; // Cycle detection

            visited.add(nodeId);

            const deps = this.graph.DependsOn?.[nodeId] || [];
            const maxDepth = deps.length > 0
                ? Math.max(...deps.map(depId => calculateDepth(depId, visited)))
                : 0;

            const depth = maxDepth + 1;
            depths.set(nodeId, depth);
            return depth;
        };

        // Calculate depths
        this.nodes.forEach(node => calculateDepth(node.id));

        // Group nodes by depth
        const layers = new Map();
        this.nodes.forEach(node => {
            const depth = depths.get(node.id) || 0;
            if (!layers.has(depth)) layers.set(depth, []);
            layers.get(depth).push(node);
        });

        // Layout nodes
        const svgRect = this.svg.getBoundingClientRect();
        const width = svgRect.width;
        const height = svgRect.height;
        const layerCount = layers.size;
        const horizontalSpacing = width / (layerCount + 1);

        let layerIndex = 0;
        layers.forEach((nodesInLayer, depth) => {
            const verticalSpacing = height / (nodesInLayer.length + 1);
            nodesInLayer.forEach((node, index) => {
                node.x = horizontalSpacing * (layerIndex + 1);
                node.y = verticalSpacing * (index + 1);
            });
            layerIndex++;
        });
    }

    layoutCircular() {
        const svgRect = this.svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;
        const radius = Math.min(centerX, centerY) * 0.7;

        this.nodes.forEach((node, index) => {
            const angle = (2 * Math.PI * index) / this.nodes.length;
            node.x = centerX + radius * Math.cos(angle);
            node.y = centerY + radius * Math.sin(angle);
        });
    }

    layoutForceDirected() {
        const svgRect = this.svg.getBoundingClientRect();
        const width = svgRect.width;
        const height = svgRect.height;

        // Initialize nodes at random positions if not already positioned
        this.nodes.forEach(node => {
            if (!node.x || !node.y || node.x === 0 || node.y === 0) {
                node.x = Math.random() * width * 0.8 + width * 0.1;
                node.y = Math.random() * height * 0.8 + height * 0.1;
            }
            node.vx = 0;
            node.vy = 0;
        });

        // Build edge map for faster lookup
        const edgeMap = new Map();
        this.edges.forEach(edge => {
            if (!edgeMap.has(edge.from)) edgeMap.set(edge.from, []);
            if (!edgeMap.has(edge.to)) edgeMap.set(edge.to, []);
            edgeMap.get(edge.from).push(edge.to);
            edgeMap.get(edge.to).push(edge.from);
        });

        // Simulation parameters
        const params = {
            repulsionStrength: 5000,
            attractionStrength: 0.01,
            damping: 0.8,
            centeringStrength: 0.01,
            minDistance: 50,
            iterations: 300,
            iterationDelay: 10
        };

        let iteration = 0;

        const simulate = () => {
            if (iteration >= params.iterations) {
                return;
            }

            // Apply repulsive forces between all nodes
            for (let i = 0; i < this.nodes.length; i++) {
                for (let j = i + 1; j < this.nodes.length; j++) {
                    const node1 = this.nodes[i];
                    const node2 = this.nodes[j];

                    const dx = node2.x - node1.x;
                    const dy = node2.y - node1.y;
                    const distanceSquared = dx * dx + dy * dy;
                    const distance = Math.sqrt(distanceSquared);

                    if (distance < params.minDistance) {
                        continue;
                    }

                    // Coulomb's law: F = k / d^2
                    const force = params.repulsionStrength / distanceSquared;
                    const fx = (dx / distance) * force;
                    const fy = (dy / distance) * force;

                    node1.vx -= fx;
                    node1.vy -= fy;
                    node2.vx += fx;
                    node2.vy += fy;
                }
            }

            // Apply attractive forces along edges
            this.edges.forEach(edge => {
                const node1 = this.nodes.find(n => n.id === edge.from);
                const node2 = this.nodes.find(n => n.id === edge.to);

                if (!node1 || !node2) return;

                const dx = node2.x - node1.x;
                const dy = node2.y - node1.y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                // Hooke's law: F = k * d
                const force = params.attractionStrength * distance;
                const fx = (dx / distance) * force;
                const fy = (dy / distance) * force;

                node1.vx += fx;
                node1.vy += fy;
                node2.vx -= fx;
                node2.vy -= fy;
            });

            // Apply centering force
            const centerX = width / 2;
            const centerY = height / 2;
            this.nodes.forEach(node => {
                const dx = centerX - node.x;
                const dy = centerY - node.y;
                node.vx += dx * params.centeringStrength;
                node.vy += dy * params.centeringStrength;
            });

            // Update positions and apply damping
            this.nodes.forEach(node => {
                node.vx *= params.damping;
                node.vy *= params.damping;

                node.x += node.vx;
                node.y += node.vy;

                // Keep nodes within bounds
                const margin = 50;
                node.x = Math.max(margin, Math.min(width - margin, node.x));
                node.y = Math.max(margin, Math.min(height - margin, node.y));
            });

            // Render current state
            this.renderEdges();
            this.renderNodes();

            iteration++;

            // Continue simulation
            if (iteration < params.iterations) {
                setTimeout(simulate, params.iterationDelay);
            }
        };

        // Start simulation
        simulate();
    }

    renderEdges() {
        const nodeMap = new Map(this.nodes.map(n => [n.id, n]));

        this.edgesGroup.innerHTML = this.edges.map(edge => {
            const fromNode = nodeMap.get(edge.from);
            const toNode = nodeMap.get(edge.to);
            if (!fromNode || !toNode) return '';

            // Calculate edge path (with offset for node radius)
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const offsetFrom = fromNode.radius + 5;
            const offsetTo = toNode.radius + 10;

            const x1 = fromNode.x + (dx / dist) * offsetFrom;
            const y1 = fromNode.y + (dy / dist) * offsetFrom;
            const x2 = toNode.x - (dx / dist) * offsetTo;
            const y2 = toNode.y - (dy / dist) * offsetTo;

            const markerEnd = edge.type === 'blocks' ? 'url(#arrowhead-blocks)'
                : edge.type === 'related' ? 'url(#arrowhead-related)'
                : 'url(#arrowhead)';

            return `<line class="graph-edge ${edge.type}"
                x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}"
                marker-end="${markerEnd}"
                data-from="${edge.from}" data-to="${edge.to}" />`;
        }).join('');
    }

    renderNodes() {
        this.nodesGroup.innerHTML = this.nodes.map(node => {
            const issue = node.issue;
            const shortId = issue.id.split('-').pop();

            return `
                <g class="graph-node" data-node-id="${node.id}" transform="translate(${node.x}, ${node.y})">
                    <circle class="node-circle status-${issue.status} ${issue.issue_type === 'epic' ? 'type-epic' : ''}"
                        r="${node.radius}" />
                    <text class="node-text" y="4">${shortId}</text>
                    <text class="node-label" y="${node.radius + 15}">${this.escapeHtml(this.truncate(issue.title, 20))}</text>
                </g>
            `;
        }).join('');

        // Attach click handlers
        this.nodesGroup.querySelectorAll('.graph-node').forEach(nodeEl => {
            nodeEl.addEventListener('click', (e) => {
                const nodeId = nodeEl.dataset.nodeId;
                this.selectNode(nodeId);
            });
        });
    }

    selectNode(nodeId) {
        // Update selected state
        if (this.selectedNode) {
            const prevNode = this.nodesGroup.querySelector(`[data-node-id="${this.selectedNode}"]`);
            if (prevNode) prevNode.classList.remove('selected');
        }

        this.selectedNode = nodeId;
        const nodeEl = this.nodesGroup.querySelector(`[data-node-id="${nodeId}"]`);
        if (nodeEl) nodeEl.classList.add('selected');

        // Find the node
        const node = this.nodes.find(n => n.id === nodeId);
        if (node) {
            // Center and zoom on the node
            this.focusOnNode(node);

            // Highlight connected edges and nodes
            this.highlightConnections(nodeId);

            // Show details
            this.showDetails(node.issue);
        }
    }

    focusOnNode(node) {
        const svgRect = this.svg.getBoundingClientRect();
        const centerX = svgRect.width / 2;
        const centerY = svgRect.height / 2;

        // Calculate transform to center the node
        const targetX = centerX - node.x * 1.5;
        const targetY = centerY - node.y * 1.5;

        // Animate transform
        this.animateTransform(
            this.currentTransform.x,
            this.currentTransform.y,
            this.currentTransform.scale,
            targetX,
            targetY,
            1.5,
            300
        );
    }

    highlightConnections(nodeId) {
        // Remove previous highlights
        this.edgesGroup.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        this.nodesGroup.querySelectorAll('.connected').forEach(el => {
            el.classList.remove('connected');
        });

        // Find connected node IDs
        const connectedIds = new Set();
        this.edges.forEach(edge => {
            if (edge.from === nodeId) {
                connectedIds.add(edge.to);
                // Highlight edge
                const edgeEl = this.edgesGroup.querySelector(
                    `[data-from="${edge.from}"][data-to="${edge.to}"]`
                );
                if (edgeEl) edgeEl.classList.add('highlighted');
            } else if (edge.to === nodeId) {
                connectedIds.add(edge.from);
                // Highlight edge
                const edgeEl = this.edgesGroup.querySelector(
                    `[data-from="${edge.from}"][data-to="${edge.to}"]`
                );
                if (edgeEl) edgeEl.classList.add('highlighted');
            }
        });

        // Highlight connected nodes
        connectedIds.forEach(id => {
            const nodeEl = this.nodesGroup.querySelector(`[data-node-id="${id}"]`);
            if (nodeEl) nodeEl.classList.add('connected');
        });
    }

    animateTransform(fromX, fromY, fromScale, toX, toY, toScale, duration) {
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const eased = 1 - Math.pow(1 - progress, 3);

            // Interpolate values
            this.currentTransform.x = fromX + (toX - fromX) * eased;
            this.currentTransform.y = fromY + (toY - fromY) * eased;
            this.currentTransform.scale = fromScale + (toScale - fromScale) * eased;

            this.applyTransform(this.currentTransform);

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }

    showDetails(issue) {
        this.nodeDetailsTitleEl.textContent = issue.title;

        let html = `
            <div class="detail-section">
                <div class="detail-label">ID</div>
                <div class="detail-value"><code>${issue.id}</code></div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Status</div>
                <div class="detail-value">
                    <span class="detail-badge status-${issue.status}">${issue.status.replace('_', ' ')}</span>
                </div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Type</div>
                <div class="detail-value">${issue.issue_type}</div>
            </div>

            <div class="detail-section">
                <div class="detail-label">Priority</div>
                <div class="detail-value">Priority ${issue.priority}</div>
            </div>
        `;

        if (issue.description) {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Description</div>
                    <div class="detail-value">${this.escapeHtml(issue.description)}</div>
                </div>
            `;
        }

        // Show dependencies
        if (this.graph.DependsOn && this.graph.DependsOn[issue.id]) {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Depends On</div>
                    <ul class="detail-list">
                        ${this.graph.DependsOn[issue.id].map(depId =>
                            `<li data-node-id="${depId}">${depId}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        if (this.graph.Blocks && this.graph.Blocks[issue.id]) {
            html += `
                <div class="detail-section">
                    <div class="detail-label">Blocks</div>
                    <ul class="detail-list">
                        ${this.graph.Blocks[issue.id].map(blockId =>
                            `<li data-node-id="${blockId}">${blockId}</li>`
                        ).join('')}
                    </ul>
                </div>
            `;
        }

        this.nodeDetailsBodyEl.innerHTML = html;

        // Attach click handlers to dependency lists
        this.nodeDetailsBodyEl.querySelectorAll('.detail-list li').forEach(li => {
            li.addEventListener('click', () => {
                const nodeId = li.dataset.nodeId;
                this.selectNode(nodeId);
            });
        });

        this.nodeDetailsEl.classList.add('active');
    }

    hideDetails() {
        this.nodeDetailsEl.classList.remove('active');
        if (this.selectedNode) {
            const nodeEl = this.nodesGroup.querySelector(`[data-node-id="${this.selectedNode}"]`);
            if (nodeEl) nodeEl.classList.remove('selected');
            this.selectedNode = null;
        }

        // Clear all highlights
        this.edgesGroup.querySelectorAll('.highlighted').forEach(el => {
            el.classList.remove('highlighted');
        });
        this.nodesGroup.querySelectorAll('.connected').forEach(el => {
            el.classList.remove('connected');
        });
    }

    setupPanZoom() {
        let isPanning = false;
        let startX, startY;
        let currentTransform = { x: 0, y: 0, scale: 1 };

        this.svg.addEventListener('mousedown', (e) => {
            if (e.target.closest('.graph-node')) return;
            isPanning = true;
            startX = e.clientX - currentTransform.x;
            startY = e.clientY - currentTransform.y;
            this.svg.style.cursor = 'grabbing';
        });

        this.svg.addEventListener('mousemove', (e) => {
            if (!isPanning) return;
            currentTransform.x = e.clientX - startX;
            currentTransform.y = e.clientY - startY;
            this.applyTransform(currentTransform);
        });

        this.svg.addEventListener('mouseup', () => {
            isPanning = false;
            this.svg.style.cursor = 'default';
        });

        this.svg.addEventListener('mouseleave', () => {
            isPanning = false;
            this.svg.style.cursor = 'default';
        });

        // Store transform for reset
        this.currentTransform = currentTransform;
    }

    applyTransform(transform) {
        this.graphContent.setAttribute('transform',
            `translate(${transform.x}, ${transform.y}) scale(${transform.scale})`);
    }

    resetView() {
        this.currentTransform.x = 0;
        this.currentTransform.y = 0;
        this.currentTransform.scale = 1;
        this.applyTransform(this.currentTransform);
    }

    showError(message) {
        this.loadingEl.innerHTML = `
            <div style="color: var(--color-error); text-align: center;">
                <p>${this.escapeHtml(message)}</p>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize graph when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new DependencyGraph();
});
