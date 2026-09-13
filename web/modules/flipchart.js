class Flipchart {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        this.docId = options.docId;
        this.onChange = options.onChange || (() => {});

        const initial = options.data || {};
        this.viewport = initial.viewport || { x: 0, y: 0, zoom: 1.0 };
        this.elements = Array.isArray(initial.elements) ? initial.elements : [];
        this.connections = Array.isArray(initial.connections) ? initial.connections : [];
        this.drawings = Array.isArray(initial.drawings) ? initial.drawings : [];

        this.elements.forEach(el => {
            if (el.width > 280) el.width = el.type === 'doc-link' ? 220 : 200;
            if (el.height > 220) el.height = el.type === 'doc-link' ? 170 : 140;
            if (!el.fontSize) el.fontSize = 15;
            if (!el.titleFontSize) el.titleFontSize = 15;
        });

        this.baseFontSize = 15;
        this.currentTool = 'select';
        this.currentColor = 'var(--accent)';
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        this.isDrawing = false;
        this.isErasing = false;
        this.currentStroke = null;

        this.isDraggingArrow = false;
        this.arrowStart = null;
        this.tempArrowEnd = { x: 0, y: 0 };

        this.initDOM();
        this.resizeCanvas();
        this.restoreState();
        this.initEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="affine-viewport" style="position:relative; width:100%; height:100%; overflow:hidden; user-select:none;">
                <div class="affine-canvas-layer" style="position:absolute; inset:0; transform-origin:0 0;">
                    <svg class="affine-connections-svg" style="position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; z-index:2;">
                        <defs>
                            <marker id="fc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
                            </marker>
                            <marker id="fc-arrow-temp" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
                            </marker>
                        </defs>
                        <g id="permanent-arrows" style="pointer-events:stroke;"></g>
                        <path id="temp-arrow" d="" stroke="var(--accent)" stroke-width="2.5" stroke-dasharray="4" fill="none" marker-end="url(#fc-arrow-temp)" style="display:none;"></path>
                    </svg>
                    <div class="affine-elements-layer" style="position:absolute; inset:0; z-index:3;"></div>
                </div>

                <canvas class="affine-draw-canvas" style="position:absolute; inset:0; z-index:4; pointer-events:none;"></canvas>

                <div class="affine-dock">
                    <div class="dock-group">
                        <button class="dock-btn active" data-tool="select" title="Курсор (V)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7 18 3-7 7-3L3 3z"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="hand" title="Рука (H)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v7"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 4v4a8 8 0 0 1-16 0v-2"/></svg>
                        </button>
                    </div>
                    <div class="dock-divider"></div>
                    <div class="dock-group">
                        <button class="dock-btn" data-tool="sticky" title="Заметка (S)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="connector" title="Стрелка (C)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="pen" title="Перо (P)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="eraser" title="Ластик (E)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                        </button>
                    </div>
                    <div class="dock-divider"></div>
                    <div class="dock-group colors-group">
                        <span class="color-dot active" data-color="var(--accent)" style="background:var(--accent);" title="Цвет темы"></span>
                        <span class="color-dot" data-color="#eab308" style="background:#eab308;" title="Желтый"></span>
                        <span class="color-dot" data-color="#3b82f6" style="background:#3b82f6;" title="Синий"></span>
                        <span class="color-dot" data-color="#10b981" style="background:#10b981;" title="Зеленый"></span>
                        <span class="color-dot" data-color="#ec4899" style="background:#ec4899;" title="Розовый"></span>
                    </div>
                    <div class="dock-divider"></div>
                    <div class="dock-group">
                        <span class="zoom-indicator" id="fc-zoom-val">100%</span>
                        <button class="dock-btn-sm" id="fc-reset-zoom" title="Сбросить масштаб">↺</button>
                    </div>
                </div>
            </div>
        `;

        this.viewportEl = this.container.querySelector('.affine-viewport');
        this.canvasLayer = this.container.querySelector('.affine-canvas-layer');
        this.elementsLayer = this.container.querySelector('.affine-elements-layer');
        this.svgArrowsGroup = this.container.querySelector('#permanent-arrows');
        this.tempArrowEl = this.container.querySelector('#temp-arrow');
        this.drawCanvas = this.container.querySelector('.affine-draw-canvas');
        this.ctx = this.drawCanvas.getContext('2d');

        this.applyTransform();
    }

    resizeCanvas() {
        if (!this.viewportEl || !this.drawCanvas) return;
        const rect = this.viewportEl.getBoundingClientRect();
        this.drawCanvas.width = rect.width || window.innerWidth;
        this.drawCanvas.height = rect.height || window.innerHeight;
        this.redrawDrawings();
    }

    applyTransform() {
        if (!this.canvasLayer) return;
        const zoom = Math.max(0.15, this.viewport.zoom || 1.0);
        this.canvasLayer.style.transform = `translate(${this.viewport.x || 0}px, ${this.viewport.y || 0}px) scale(${zoom})`;

        const zoomEl = this.container.querySelector('#fc-zoom-val');
        if (zoomEl) zoomEl.innerText = `${Math.round(zoom * 100)}%`;
        this.redrawDrawings();
    }

    restoreState() {
        if (!this.elementsLayer) return;
        this.elementsLayer.innerHTML = '';
        this.elements.forEach(item => this.mountElement(item));
        this.renderConnections();
        this.redrawDrawings();
    }

    initEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        this.container.querySelectorAll('.dock-btn[data-tool]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                this.setTool(btn.dataset.tool);
            };
        });

        this.container.querySelectorAll('.color-dot').forEach(dot => {
            dot.onclick = (e) => {
                e.stopPropagation();
                this.container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.currentColor = dot.dataset.color;
            };
        });

        const resetBtn = this.container.querySelector('#fc-reset-zoom');
        if (resetBtn) {
            resetBtn.onclick = (e) => {
                e.stopPropagation();
                this.viewport = { x: 0, y: 0, zoom: 1.0 };
                this.applyTransform();
                this.triggerChange();
            };
        }

        this.viewportEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.affine-dock') || e.target.closest('.affine-element')) return;

            const coords = this.screenToWorld(e.clientX, e.clientY);

            if (this.currentTool === 'sticky') {
                this.addElement({
                    x: Math.round(coords.x - 100),
                    y: Math.round(coords.y - 70),
                    width: 200,
                    height: 140,
                    fontSize: 15,
                    type: 'sticky',
                    content: ''
                });
                this.setTool('select');
                return;
            }

            if (this.currentTool === 'pen') {
                this.isDrawing = true;
                const strokeColor = this.currentColor.startsWith('var') ? '#F8E794' : this.currentColor;
                this.currentStroke = {
                    color: strokeColor,
                    size: 3,
                    points: [[coords.x, coords.y]]
                };
                return;
            }

            if (this.currentTool === 'eraser') {
                this.isErasing = true;
                this.eraseAt(coords.x, coords.y);
                return;
            }

            this.isPanning = true;
            this.panStart = { x: e.clientX - this.viewport.x, y: e.clientY - this.viewport.y };
            this.viewportEl.style.cursor = 'grabbing';
        });

        window.addEventListener('mousemove', (e) => {
            if (this.isPanning) {
                this.viewport.x = e.clientX - this.panStart.x;
                this.viewport.y = e.clientY - this.panStart.y;
                this.applyTransform();
                return;
            }

            if (this.isDrawing && this.currentStroke) {
                const coords = this.screenToWorld(e.clientX, e.clientY);
                this.currentStroke.points.push([coords.x, coords.y]);
                this.redrawDrawings();
                return;
            }

            if (this.isErasing) {
                const coords = this.screenToWorld(e.clientX, e.clientY);
                this.eraseAt(coords.x, coords.y);
                return;
            }

            if (this.isDraggingArrow && this.arrowStart) {
                this.tempArrowEnd = this.screenToWorld(e.clientX, e.clientY);
                this.renderTempArrow();
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (this.isPanning) {
                this.isPanning = false;
                this.viewportEl.style.cursor = this.currentTool === 'hand' ? 'grab' : 'default';
                this.triggerChange();
            }

            if (this.isDrawing && this.currentStroke) {
                this.isDrawing = false;
                if (this.currentStroke.points.length > 1) {
                    this.drawings.push(this.currentStroke);
                    this.triggerChange();
                }
                this.currentStroke = null;
            }

            if (this.isErasing) {
                this.isErasing = false;
            }

            if (this.isDraggingArrow) {
                this.isDraggingArrow = false;
                if (this.tempArrowEl) this.tempArrowEl.style.display = 'none';

                let target = document.elementFromPoint(e.clientX, e.clientY);
                let dropCard = target ? target.closest('.affine-element') : null;

                if (!dropCard) {
                    const worldPos = this.screenToWorld(e.clientX, e.clientY);
                    dropCard = this.elements.find(el => {
                        return worldPos.x >= el.x && worldPos.x <= (el.x + el.width) &&
                               worldPos.y >= el.y && worldPos.y <= (el.y + el.height);
                    });
                }

                const targetId = dropCard ? (dropCard.id || dropCard.dataset?.id) : null;
                if (targetId && targetId !== this.arrowStart.elementId) {
                    const exists = this.connections.some(c => c.from === this.arrowStart.elementId && c.to === targetId);
                    if (!exists) {
                        this.connections.push({ from: this.arrowStart.elementId, to: targetId });
                        this.renderConnections();
                        this.triggerChange();
                    }
                }
                this.arrowStart = null;
            }
        });

        this.viewportEl.addEventListener('wheel', (e) => {
            const scrollable = e.target.closest('.sticky-text, .doc-link-text');
            if (scrollable && scrollable.scrollHeight > scrollable.clientHeight) {
                const atTop = scrollable.scrollTop === 0 && e.deltaY < 0;
                const atBottom = Math.abs(scrollable.scrollHeight - scrollable.clientHeight - scrollable.scrollTop) <= 2 && e.deltaY > 0;
                if (!atTop && !atBottom) return;
            }

            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const currentZoom = this.viewport.zoom || 1.0;
            const newZoom = Math.min(Math.max(currentZoom * factor, 0.15), 2.5);

            const rect = this.viewportEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.viewport.x = mouseX - (mouseX - this.viewport.x) * (newZoom / currentZoom);
            this.viewport.y = mouseY - (mouseY - this.viewport.y) * (newZoom / currentZoom);
            this.viewport.zoom = newZoom;

            this.applyTransform();
            this.triggerChange();
        }, { passive: false });

        this.viewportEl.addEventListener('dragover', (e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
            this.viewportEl.classList.add('drag-over');
        });

        this.viewportEl.addEventListener('dragleave', () => {
            this.viewportEl.classList.remove('drag-over');
        });

        this.viewportEl.addEventListener('drop', async (e) => {
            e.preventDefault();
            this.viewportEl.classList.remove('drag-over');
            const data = e.dataTransfer.getData('application/x-doc-item') || e.dataTransfer.getData('text/plain');
            if (!data) return;
            try {
                const docData = JSON.parse(data);
                const coords = this.screenToWorld(e.clientX, e.clientY);
                let docContent = '';
                try {
                    const fullDoc = await pywebview.api.load_document(docData.id);
                    if (fullDoc && fullDoc.content && fullDoc.content.blocks) {
                        docContent = fullDoc.content.blocks
                            .map(b => (b.data && b.data.text) ? b.data.text : '')
                            .filter(t => t)
                            .join('\n');
                    }
                } catch (err) {}
                this.addDocLink(docData.id, docData.title, coords.x, coords.y, docContent);
            } catch (err) {}
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.container.querySelectorAll('.dock-btn[data-tool]').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === tool);
        });

        this.elementsLayer.classList.toggle('mode-connector', tool === 'connector');
        this.viewportEl.style.cursor = tool === 'pen' ? 'crosshair' : (tool === 'eraser' ? 'cell' : (tool === 'hand' ? 'grab' : 'default'));
    }

    eraseAt(x, y) {
        const radius = 22 / (this.viewport.zoom || 1);
        const count = this.drawings.length;
        this.drawings = this.drawings.filter(stroke => {
            if (!stroke.points) return false;
            return !stroke.points.some(([px, py]) => Math.hypot(px - x, py - y) <= radius);
        });
        if (this.drawings.length !== count) {
            this.redrawDrawings();
            this.triggerChange();
        }
    }

    screenToWorld(clientX, clientY) {
        const rect = this.viewportEl.getBoundingClientRect();
        const zoom = this.viewport.zoom || 1.0;
        return {
            x: (clientX - rect.left - this.viewport.x) / zoom,
            y: (clientY - rect.top - this.viewport.y) / zoom
        };
    }

    addElement(data) {
        const id = 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        data.fontSize = data.fontSize || 15;
        data.width = data.width || 200;
        data.height = data.height || 140;

        const elementObj = { id, ...data };
        this.elements.push(elementObj);
        this.mountElement(elementObj);
        this.triggerChange();
        return elementObj;
    }

    mountElement(data) {
        const el = document.createElement('div');
        const isDoc = data.type === 'doc-link';
        el.className = `affine-element ${isDoc ? 'card-theme-doc' : 'card-theme-note'}`;
        el.id = data.id;
        el.tabIndex = 0;
        el.style.left = `${data.x}px`;
        el.style.top = `${data.y}px`;
        el.style.width = `${data.width || (isDoc ? 220 : 200)}px`;
        el.style.height = `${data.height || (isDoc ? 170 : 140)}px`;

        const fontSize = data.fontSize || 15;
        const titleFontSize = data.titleFontSize || 15;

        if (isDoc) {
            el.dataset.docId = data.docId;
            el.innerHTML = `
                <div class="sticky-format-toolbar">
                    <button class="tb-btn btn-bold" title="Жирный"><b>B</b></button>
                    <button class="tb-btn btn-italic" title="Курсив"><i>I</i></button>
                    <button class="tb-btn btn-dec" title="Уменьшить шрифт">A−</button>
                    <button class="tb-btn btn-inc" title="Увеличить шрифт">A+</button>
                </div>
                <div class="affine-el-header">
                    <div class="header-title-wrap">
                        <span class="el-drag-handle" title="Перетащить">⠿</span>
                        <span class="element-type-badge doc-badge">ДОКУМЕНТ</span>
                    </div>
                    <div class="el-controls">
                        <button class="el-btn btn-del" title="Удалить">×</button>
                    </div>
                </div>
                <div class="doc-link-content">
                    <div class="doc-link-title contenteditable-title" contenteditable="true" style="font-size:${titleFontSize}px;">${data.docTitle || 'Документ'}</div>
                </div>
                <div class="doc-link-text contenteditable-text" contenteditable="true" style="font-size:${fontSize}px;">${data.docContent || ''}</div>
                <div class="resize-handle"></div>
                <div class="conn-port port-top" data-port="top"></div>
                <div class="conn-port port-bottom" data-port="bottom"></div>
                <div class="conn-port port-left" data-port="left"></div>
                <div class="conn-port port-right" data-port="right"></div>
            `;
        } else {
            el.innerHTML = `
                <div class="sticky-format-toolbar">
                    <button class="tb-btn btn-bold" title="Жирный"><b>B</b></button>
                    <button class="tb-btn btn-italic" title="Курсив"><i>I</i></button>
                    <button class="tb-btn btn-dec" title="Уменьшить шрифт">A−</button>
                    <button class="tb-btn btn-inc" title="Увеличить шрифт">A+</button>
                </div>
                <div class="affine-el-header">
                    <div class="header-title-wrap">
                        <span class="el-drag-handle" title="Перетащить">⠿</span>
                        <span class="element-type-badge note-badge">ЗАМЕТКА</span>
                    </div>
                    <div class="el-controls">
                        <button class="el-btn btn-del" title="Удалить">×</button>
                    </div>
                </div>
                <div class="sticky-text contenteditable-text" contenteditable="true" style="font-size:${fontSize}px;">${data.content || ''}</div>
                <div class="resize-handle"></div>
                <div class="conn-port port-top" data-port="top"></div>
                <div class="conn-port port-bottom" data-port="bottom"></div>
                <div class="conn-port port-left" data-port="left"></div>
                <div class="conn-port port-right" data-port="right"></div>
            `;
        }

        this.elementsLayer.appendChild(el);
        this.initElementInteractions(el, data);
    }

    addDocLink(docId, docTitle, x, y, docContent = '') {
        const elementObj = {
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
            type: 'doc-link',
            docId: docId,
            docTitle: docTitle,
            docContent: docContent,
            x: Math.round(x),
            y: Math.round(y),
            width: 220,
            height: 170,
            fontSize: 15,
            titleFontSize: 15,
            content: docTitle
        };
        this.elements.push(elementObj);
        this.mountElement(elementObj);
        this.triggerChange();
        return elementObj;
    }

    initElementInteractions(el, data) {
        const header = el.querySelector('.affine-el-header');
        const resizeHandle = el.querySelector('.resize-handle');
        const editorText = el.querySelector('.contenteditable-text');
        const editorTitle = el.querySelector('.contenteditable-title');

        let lastFocusedEditable = editorText;

        [editorText, editorTitle].forEach(field => {
            if (field) {
                field.addEventListener('focus', () => { lastFocusedEditable = field; });
                field.addEventListener('click', () => { lastFocusedEditable = field; });
            }
        });

        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            if (e.target.closest('button')) return;
            isDragging = true;
            const zoom = this.viewport.zoom || 1.0;
            dragOffset = {
                x: (e.clientX / zoom) - data.x,
                y: (e.clientY / zoom) - data.y
            };
            el.classList.add('dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const zoom = this.viewport.zoom || 1.0;
            data.x = Math.round((e.clientX / zoom) - dragOffset.x);
            data.y = Math.round((e.clientY / zoom) - dragOffset.y);
            el.style.left = `${data.x}px`;
            el.style.top = `${data.y}px`;
            this.renderConnections();
        });

        window.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                el.classList.remove('dragging');
                this.triggerChange();
            }
        });

        el.querySelectorAll('.conn-port').forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.isDraggingArrow = true;
                this.arrowStart = { elementId: data.id, port: port.dataset.port };
                this.tempArrowEnd = this.screenToWorld(e.clientX, e.clientY);
                this.renderTempArrow();
            });
        });

        if (resizeHandle) {
            let startW, startH, startX, startY;

            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                let isResizing = true;
                startW = el.offsetWidth;
                startH = el.offsetHeight;
                startX = e.clientX;
                startY = e.clientY;

                const onMove = (me) => {
                    if (!isResizing) return;
                    const zoom = this.viewport.zoom || 1.0;
                    data.width = Math.max(startW + (me.clientX - startX) / zoom, 180);
                    data.height = Math.max(startH + (me.clientY - startY) / zoom, 110);
                    el.style.width = `${data.width}px`;
                    el.style.height = `${data.height}px`;
                    this.renderConnections();
                };

                const onUp = () => {
                    isResizing = false;
                    window.removeEventListener('mousemove', onMove);
                    window.removeEventListener('mouseup', onUp);
                    this.triggerChange();
                };

                window.addEventListener('mousemove', onMove);
                window.addEventListener('mouseup', onUp);
            });
        }

        if (editorTitle) {
            editorTitle.addEventListener('input', () => {
                data.docTitle = editorTitle.innerText.trim();
                this.triggerChange();
            });
        }

        if (editorText) {
            editorText.addEventListener('input', () => {
                this.syncTextData(data, editorText);
            });
        }

        const toolbar = el.querySelector('.sticky-format-toolbar');
        if (toolbar) {
            toolbar.addEventListener('mousedown', e => {
                e.preventDefault();
                e.stopPropagation();
            });

            const boldBtn = toolbar.querySelector('.btn-bold');
            if (boldBtn) {
                boldBtn.onclick = () => {
                    const targetField = lastFocusedEditable || editorText;
                    if (targetField) targetField.focus();
                    document.execCommand('bold');
                    if (targetField === editorTitle) {
                        data.docTitle = editorTitle.innerText.trim();
                        this.triggerChange();
                    } else {
                        this.syncTextData(data, editorText);
                    }
                };
            }

            const italicBtn = toolbar.querySelector('.btn-italic');
            if (italicBtn) {
                italicBtn.onclick = () => {
                    const targetField = lastFocusedEditable || editorText;
                    if (targetField) targetField.focus();
                    document.execCommand('italic');
                    if (targetField === editorTitle) {
                        data.docTitle = editorTitle.innerText.trim();
                        this.triggerChange();
                    } else {
                        this.syncTextData(data, editorText);
                    }
                };
            }

            const incBtn = toolbar.querySelector('.btn-inc');
            if (incBtn) {
                incBtn.onclick = () => {
                    const targetField = lastFocusedEditable || editorText;
                    this.applyFontSizeDelta(+2, targetField, data, targetField === editorTitle);
                };
            }

            const decBtn = toolbar.querySelector('.btn-dec');
            if (decBtn) {
                decBtn.onclick = () => {
                    const targetField = lastFocusedEditable || editorText;
                    this.applyFontSizeDelta(-2, targetField, data, targetField === editorTitle);
                };
            }
        }

        el.querySelector('.btn-del').onclick = (e) => {
            e.stopPropagation();
            this.elements = this.elements.filter(item => item.id !== data.id);
            this.connections = this.connections.filter(c => c.from !== data.id && c.to !== data.id);
            el.remove();
            this.renderConnections();
            this.triggerChange();
        };
    }

    applyFontSizeDelta(delta, editorEl, data, isTitle = false) {
        if (!editorEl) return;
        const sel = window.getSelection();
        const hasSelection = sel && sel.rangeCount > 0 && !sel.getRangeAt(0).collapsed && editorEl.contains(sel.getRangeAt(0).commonAncestorContainer);

        if (hasSelection) {
            const range = sel.getRangeAt(0);
            let container = range.commonAncestorContainer;
            if (container.nodeType === 3) container = container.parentElement;
            let targetSpan = container.closest('span[style*="font-size"]');
            let currentSize = targetSpan ? (parseFloat(targetSpan.style.fontSize) || 15) : (parseFloat(window.getComputedStyle(container).fontSize) || 15);
            const newSize = Math.min(64, Math.max(10, Math.round(currentSize + delta)));

            const span = document.createElement('span');
            span.style.fontSize = `${newSize}px`;
            const frag = range.extractContents();
            span.appendChild(frag);
            range.insertNode(span);
            sel.removeAllRanges();
            const newRange = document.createRange();
            newRange.selectNodeContents(span);
            sel.addRange(newRange);
        } else {
            let current = parseFloat(editorEl.style.fontSize) || parseFloat(window.getComputedStyle(editorEl).fontSize) || 15;
            let next = Math.min(64, Math.max(10, Math.round(current + delta)));
            editorEl.style.fontSize = `${next}px`;
            if (isTitle) {
                data.titleFontSize = next;
            } else {
                data.fontSize = next;
            }
            editorEl.querySelectorAll('span[style*="font-size"]').forEach(s => s.style.fontSize = '');
        }

        if (isTitle) {
            data.docTitle = editorEl.innerText.trim();
            this.triggerChange();
        } else {
            this.syncTextData(data, editorEl);
        }
    }

    syncTextData(data, editorText) {
        if (!editorText) return;
        if (data.type === 'doc-link') {
            data.docContent = editorText.innerHTML;
        } else {
            data.content = editorText.innerHTML;
        }
        this.triggerChange();
    }

    renderTempArrow() {
        const fromEl = this.elements.find(e => e.id === this.arrowStart.elementId);
        if (!fromEl || !this.tempArrowEl) return;
        const startX = fromEl.x + (fromEl.width / 2);
        const startY = fromEl.y + (fromEl.height / 2);
        const endX = this.tempArrowEnd.x;
        const endY = this.tempArrowEnd.y;
        const dx = Math.max(Math.abs(endX - startX) * 0.4, 20);
        this.tempArrowEl.setAttribute('d', `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`);
        this.tempArrowEl.style.display = 'block';
    }

    renderConnections() {
        if (!this.svgArrowsGroup) return;
        this.svgArrowsGroup.innerHTML = '';
        this.connections = this.connections.filter(conn => {
            return this.elements.some(e => e.id === conn.from) && this.elements.some(e => e.id === conn.to);
        });

        this.connections.forEach((conn, index) => {
            const fromEl = this.elements.find(e => e.id === conn.from);
            const toEl = this.elements.find(e => e.id === conn.to);
            if (!fromEl || !toEl) return;

            const x1 = fromEl.x + fromEl.width;
            const y1 = fromEl.y + (fromEl.height / 2);
            const x2 = toEl.x;
            const y2 = toEl.y + (toEl.height / 2);
            const dx = Math.max(Math.abs(x2 - x1) * 0.45, 25);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

            const hitPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            hitPath.setAttribute('d', d);
            hitPath.setAttribute('stroke', 'transparent');
            hitPath.setAttribute('stroke-width', '16');
            hitPath.setAttribute('fill', 'none');
            hitPath.style.cursor = 'pointer';
            hitPath.style.pointerEvents = 'stroke';

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', 'var(--accent)');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#fc-arrow)');
            path.style.pointerEvents = 'none';

            hitPath.addEventListener('mouseenter', () => {
                path.setAttribute('stroke', '#e06c75');
                path.setAttribute('stroke-width', '3.5');
            });
            hitPath.addEventListener('mouseleave', () => {
                path.setAttribute('stroke', 'var(--accent)');
                path.setAttribute('stroke-width', '2');
            });

            hitPath.addEventListener('click', (e) => {
                e.stopPropagation();
                this.connections.splice(index, 1);
                this.renderConnections();
                this.triggerChange();
            });

            g.appendChild(hitPath);
            g.appendChild(path);
            this.svgArrowsGroup.appendChild(g);
        });
    }

    redrawDrawings() {
        if (!this.ctx || !this.drawCanvas) return;
        this.ctx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        this.ctx.save();
        const zoom = this.viewport.zoom || 1.0;
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(zoom, zoom);

        this.drawings.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return;
            this.ctx.strokeStyle = stroke.color || '#F8E794';
            this.ctx.lineWidth = stroke.size || 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
            }
            this.ctx.stroke();
        });

        if (this.currentStroke && this.currentStroke.points.length > 1) {
            this.ctx.strokeStyle = this.currentStroke.color || '#F8E794';
            this.ctx.lineWidth = this.currentStroke.size || 2.5;
            this.ctx.lineCap = 'round';
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentStroke.points[0][0], this.currentStroke.points[0][1]);
            for (let i = 1; i < this.currentStroke.points.length; i++) {
                this.ctx.lineTo(this.currentStroke.points[i][0], this.currentStroke.points[i][1]);
            }
            this.ctx.stroke();
        }

        this.ctx.restore();
    }

    getData() {
        return {
            viewport: this.viewport,
            elements: this.elements,
            connections: this.connections,
            drawings: this.drawings
        };
    }

    triggerChange() {
        this.onChange(this.getData());
    }

    destroy() {
        if (this.container) this.container.innerHTML = '';
    }
}

window.Flipchart = Flipchart;