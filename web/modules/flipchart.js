class Flipchart {
    constructor(containerId, options = {}) {
        this.container = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
        this.docId = options.docId;
        this.onChange = options.onChange || (() => {});

        const initial = options.data || {};
        this.viewport = initial.viewport || { x: 0, y: 0, zoom: 1.0 };
        this.elements = initial.elements || [];
        this.connections = initial.connections || [];
        this.drawings = initial.drawings || [];

        this.currentTool = 'select'; // 'select' | 'hand' | 'sticky' | 'pen' | 'connector' | 'eraser'
        this.currentColor = '#eab308';
        this.isPanning = false;
        this.panStart = { x: 0, y: 0 };

        // Состояние рисования
        this.isDrawing = false;
        this.currentStroke = null;

        // Состояние протягивания стрелки в реальном времени
        this.isDraggingArrow = false;
        this.arrowStart = null; // { elementId, point: 'top'|'bottom'|'left'|'right' }
        this.tempArrowEnd = { x: 0, y: 0 };

        this.initDOM();
        this.resizeCanvas();
        this.restoreState();
        this.initEvents();
    }

    initDOM() {
        this.container.innerHTML = `
            <div class="affine-viewport" style="position:relative; width:100%; height:100%; overflow:hidden; user-select:none;">
                <div class="affine-canvas-layer" style="position:absolute; inset:0; transform-origin: 0 0;">
                    <!-- SVG слой стрелок -->
                    <svg class="affine-connections-svg" style="position:absolute; inset:0; width:100%; height:100%; overflow:visible; pointer-events:none; z-index:2;">
                        <defs>
                            <marker id="fc-arrow" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                                <path d="M 0 0 L 8 4 L 0 8 z" fill="#52a787" />
                            </marker>
                            <marker id="fc-arrow-temp" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto">
                                <path d="M 0 0 L 8 4 L 0 8 z" fill="#eab308" />
                            </marker>
                        </defs>
                        <g id="permanent-arrows"></g>
                        <path id="temp-arrow" d="" stroke="#eab308" stroke-width="2" stroke-dasharray="4" fill="none" marker-end="url(#fc-arrow-temp)" style="display:none;"></path>
                    </svg>
                    <!-- Холст элементов -->
                    <div class="affine-elements-layer" style="position:absolute; inset:0; z-index:3;"></div>
                </div>

                <!-- Холст рисования пером поверх всего -->
                <canvas class="affine-draw-canvas" style="position:absolute; inset:0; z-index:4; pointer-events:none;"></canvas>

                <!-- Панель инструментов -->
                <div class="affine-dock">
                    <div class="dock-group">
                        <button class="dock-btn active" data-tool="select" title="Курсор (V)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m3 3 7 18 3-7 7-3L3 3z"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="hand" title="Рука / Панорама (H)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 11V6a2 2 0 0 0-4 0v5"/><path d="M14 10V4a2 2 0 0 0-4 0v7"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 0 1 4 4v4a8 8 0 0 1-16 0v-2"/></svg>
                        </button>
                    </div>
                    <div class="dock-divider"></div>
                    <div class="dock-group">
                        <button class="dock-btn" data-tool="sticky" title="Добавить наклейку (S)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 12h8"/><path d="M8 16h5"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="connector" title="Стрелка между наклейками (C)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="5" y1="19" x2="19" y2="5"/><polyline points="10 5 19 5 19 14"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="pen" title="Перо (P)">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/></svg>
                        </button>
                        <button class="dock-btn" data-tool="eraser" title="Очистить рисунки">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>
                        </button>
                    </div>
                    <div class="dock-divider"></div>
                    <div class="dock-group colors-group">
                        <span class="color-dot active" data-color="#eab308" style="background:#eab308;" title="Желтый"></span>
                        <span class="color-dot" data-color="#3b82f6" style="background:#3b82f6;" title="Синий"></span>
                        <span class="color-dot" data-color="#10b981" style="background:#10b981;" title="Зеленый"></span>
                        <span class="color-dot" data-color="#ec4899" style="background:#ec4899;" title="Розовый"></span>
                        <span class="color-dot" data-color="#ffffff" style="background:#ffffff;" title="Белый"></span>
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
        const rect = this.viewportEl.getBoundingClientRect();
        this.drawCanvas.width = rect.width || window.innerWidth;
        this.drawCanvas.height = rect.height || window.innerHeight;
        this.redrawDrawings();
    }

    applyTransform() {
        this.canvasLayer.style.transform = `translate(${this.viewport.x}px, ${this.viewport.y}px) scale(${this.viewport.zoom})`;
        const zoomEl = this.container.querySelector('#fc-zoom-val');
        if (zoomEl) zoomEl.innerText = `${Math.round(this.viewport.zoom * 100)}%`;
        this.redrawDrawings();
    }

    restoreState() {
        this.elementsLayer.innerHTML = '';
        this.elements.forEach(item => this.mountElement(item));
        this.renderConnections();
        this.redrawDrawings();
    }

    initEvents() {
        window.addEventListener('resize', () => this.resizeCanvas());

        // Переключение тулбара
        this.container.querySelectorAll('.dock-btn[data-tool]').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const tool = btn.dataset.tool;
                if (tool === 'eraser') {
                    if (confirm("Очистить все рукописные рисунки на холсте?")) {
                        this.drawings = [];
                        this.redrawDrawings();
                        this.triggerChange();
                    }
                    return;
                }
                this.setTool(tool);
            };
        });

        // Выбор цвета
        this.container.querySelectorAll('.color-dot').forEach(dot => {
            dot.onclick = (e) => {
                e.stopPropagation();
                this.container.querySelectorAll('.color-dot').forEach(d => d.classList.remove('active'));
                dot.classList.add('active');
                this.currentColor = dot.dataset.color;
            };
        });

        // Сброс масштаба
        this.container.querySelector('#fc-reset-zoom').onclick = (e) => {
            e.stopPropagation();
            this.viewport = { x: 0, y: 0, zoom: 1.0 };
            this.applyTransform();
            this.triggerChange();
        };

        // Клик по полю холста
        this.viewportEl.addEventListener('mousedown', (e) => {
            if (e.target.closest('.affine-dock') || e.target.closest('.affine-element')) return;

            const coords = this.screenToWorld(e.clientX, e.clientY);

            if (this.currentTool === 'sticky') {
                this.addElement({
                    x: Math.round(coords.x - 90),
                    y: Math.round(coords.y - 60),
                    width: 180,
                    height: 120,
                    color: this.currentColor,
                    content: ''
                });
                this.setTool('select');
                return;
            }

            if (this.currentTool === 'pen') {
                this.isDrawing = true;
                this.currentStroke = {
                    color: this.currentColor,
                    size: 3,
                    points: [[coords.x, coords.y]]
                };
                return;
            }

            // Перемещение фона (панорамирование)
            if (this.currentTool === 'hand' || e.button === 1 || this.currentTool === 'select') {
                this.isPanning = true;
                this.panStart = { x: e.clientX - this.viewport.x, y: e.clientY - this.viewport.y };
                this.viewportEl.style.cursor = 'grabbing';
            }
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

            // Протягивание временной стрелки
            if (this.isDraggingArrow && this.arrowStart) {
                const coords = this.screenToWorld(e.clientX, e.clientY);
                this.tempArrowEnd = coords;
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

            if (this.isDraggingArrow) {
                this.isDraggingArrow = false;
                this.tempArrowEl.style.display = 'none';

                // Проверяем, попали ли на целевой элемент
                const targetEl = document.elementFromPoint(e.clientX, e.clientY);
                const dropCard = targetEl ? targetEl.closest('.affine-element') : null;
                if (dropCard && dropCard.id !== this.arrowStart.elementId) {
                    this.connections.push({ from: this.arrowStart.elementId, to: dropCard.id });
                    this.renderConnections();
                    this.triggerChange();
                }
                this.arrowStart = null;
            }
        });

        // Зум колесиком
        this.viewportEl.addEventListener('wheel', (e) => {
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 0.9;
            const newZoom = Math.min(Math.max(this.viewport.zoom * factor, 0.2), 2.5);

            const rect = this.viewportEl.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.viewport.x = mouseX - (mouseX - this.viewport.x) * (newZoom / this.viewport.zoom);
            this.viewport.y = mouseY - (mouseY - this.viewport.y) * (newZoom / this.viewport.zoom);
            this.viewport.zoom = newZoom;

            this.applyTransform();
            this.triggerChange();
        }, { passive: false });

        // Хоткеи
        window.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            const k = e.key.toLowerCase();
            if (k === 'v') this.setTool('select');
            if (k === 'h') this.setTool('hand');
            if (k === 's') this.setTool('sticky');
            if (k === 'p') this.setTool('pen');
            if (k === 'c') this.setTool('connector');
        });
    }

    setTool(tool) {
        this.currentTool = tool;
        this.container.querySelectorAll('.dock-btn[data-tool]').forEach(b => {
            b.classList.toggle('active', b.dataset.tool === tool);
        });

        this.elementsLayer.classList.toggle('mode-connector', tool === 'connector');

        if (tool === 'pen') {
            this.viewportEl.style.cursor = 'crosshair';
            this.drawCanvas.style.pointerEvents = 'auto';
        } else if (tool === 'hand') {
            this.viewportEl.style.cursor = 'grab';
            this.drawCanvas.style.pointerEvents = 'none';
        } else if (tool === 'sticky') {
            this.viewportEl.style.cursor = 'copy';
            this.drawCanvas.style.pointerEvents = 'none';
        } else {
            this.viewportEl.style.cursor = 'default';
            this.drawCanvas.style.pointerEvents = 'none';
        }
    }

    screenToWorld(clientX, clientY) {
        const rect = this.viewportEl.getBoundingClientRect();
        return {
            x: (clientX - rect.left - this.viewport.x) / this.viewport.zoom,
            y: (clientY - rect.top - this.viewport.y) / this.viewport.zoom
        };
    }

    addElement(data) {
        const id = 'el_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
        const elementObj = { id, ...data };
        this.elements.push(elementObj);
        this.mountElement(elementObj);
        this.triggerChange();
        return elementObj;
    }

    mountElement(data) {
        const el = document.createElement('div');
        el.className = 'affine-element is-sticky';
        el.id = data.id;
        el.style.left = `${data.x}px`;
        el.style.top = `${data.y}px`;
        el.style.width = `${data.width || 180}px`;
        el.style.height = `${data.height || 120}px`;
        el.style.backgroundColor = data.color || '#eab308';

        el.innerHTML = `
            <div class="affine-el-header">
                <span class="el-drag-handle" title="Перетащить">⠿</span>
                <div class="el-controls">
                    <button class="el-btn btn-del" title="Удалить наклейку">×</button>
                </div>
            </div>
            <textarea class="sticky-text" placeholder="Текст наклейки...">${data.content || ''}</textarea>
            <div class="resize-handle"></div>

            <!-- Точки для протягивания стрелок -->
            <div class="conn-port port-top" data-port="top"></div>
            <div class="conn-port port-bottom" data-port="bottom"></div>
            <div class="conn-port port-left" data-port="left"></div>
            <div class="conn-port port-right" data-port="right"></div>
        `;

        this.elementsLayer.appendChild(el);
        this.initElementInteractions(el, data);
    }

    initElementInteractions(el, data) {
        const header = el.querySelector('.affine-el-header');
        const resizeHandle = el.querySelector('.resize-handle');
        const textarea = el.querySelector('textarea');

        // 1. Перемещение наклейки
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        header.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'BUTTON') return;
            isDragging = true;
            dragOffset = {
                x: (e.clientX / this.viewport.zoom) - data.x,
                y: (e.clientY / this.viewport.zoom) - data.y
            };
            el.classList.add('dragging');
        });

        window.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            data.x = Math.round((e.clientX / this.viewport.zoom) - dragOffset.x);
            data.y = Math.round((e.clientY / this.viewport.zoom) - dragOffset.y);
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

        // 2. Порты стрелок (тянем стрелку из точки)
        el.querySelectorAll('.conn-port').forEach(port => {
            port.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                this.isDraggingArrow = true;
                this.arrowStart = { elementId: data.id, port: port.dataset.port };
                this.tempArrowEnd = this.screenToWorld(e.clientX, e.clientY);
                this.renderTempArrow();
            });
        });

        // 3. Изменение размера
        if (resizeHandle) {
            let isResizing = false;
            let startW, startH, startX, startY;

            resizeHandle.addEventListener('mousedown', (e) => {
                e.stopPropagation();
                isResizing = true;
                startW = el.offsetWidth;
                startH = el.offsetHeight;
                startX = e.clientX;
                startY = e.clientY;
            });

            window.addEventListener('mousemove', (e) => {
                if (!isResizing) return;
                const dw = (e.clientX - startX) / this.viewport.zoom;
                const dh = (e.clientY - startY) / this.viewport.zoom;
                data.width = Math.max(startW + dw, 120);
                data.height = Math.max(startH + dh, 80);
                el.style.width = `${data.width}px`;
                el.style.height = `${data.height}px`;
                this.renderConnections();
            });

            window.addEventListener('mouseup', () => {
                if (isResizing) {
                    isResizing = false;
                    this.triggerChange();
                }
            });
        }

        // 4. Текст
        textarea.oninput = () => {
            data.content = textarea.value;
            this.triggerChange();
        };

        // 5. Удаление
        el.querySelector('.btn-del').onclick = (e) => {
            e.stopPropagation();
            this.elements = this.elements.filter(item => item.id !== data.id);
            this.connections = this.connections.filter(c => c.from !== data.id && c.to !== data.id);
            el.remove();
            this.renderConnections();
            this.triggerChange();
        };
    }

    renderTempArrow() {
        const fromEl = this.elements.find(e => e.id === this.arrowStart.elementId);
        if (!fromEl) return;

        const startX = fromEl.x + (fromEl.width / 2);
        const startY = fromEl.y + (fromEl.height / 2);
        const endX = this.tempArrowEnd.x;
        const endY = this.tempArrowEnd.y;

        const dx = Math.max(Math.abs(endX - startX) * 0.4, 30);
        const d = `M ${startX} ${startY} C ${startX + dx} ${startY}, ${endX - dx} ${endY}, ${endX} ${endY}`;

        this.tempArrowEl.setAttribute('d', d);
        this.tempArrowEl.style.display = 'block';
    }

    renderConnections() {
        this.svgArrowsGroup.innerHTML = '';

        // Очищаем «битые» соединения (если элемент удален)
        this.connections = this.connections.filter(conn => {
            const hasFrom = this.elements.some(e => e.id === conn.from);
            const hasTo = this.elements.some(e => e.id === conn.to);
            return hasFrom && hasTo;
        });

        this.connections.forEach(conn => {
            const fromEl = this.elements.find(e => e.id === conn.from);
            const toEl = this.elements.find(e => e.id === conn.to);
            if (!fromEl || !toEl) return;

            // Центры наклеек для аккуратных стрелок
            const x1 = fromEl.x + fromEl.width;
            const y1 = fromEl.y + (fromEl.height / 2);
            const x2 = toEl.x;
            const y2 = toEl.y + (toEl.height / 2);

            const dx = Math.max(Math.abs(x2 - x1) * 0.45, 40);
            const d = `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`;

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('d', d);
            path.setAttribute('stroke', '#52a787');
            path.setAttribute('stroke-width', '2.5');
            path.setAttribute('fill', 'none');
            path.setAttribute('marker-end', 'url(#fc-arrow)');
            this.svgArrowsGroup.appendChild(path);
        });
    }

    redrawDrawings() {
        this.ctx.clearRect(0, 0, this.drawCanvas.width, this.drawCanvas.height);
        this.ctx.save();
        this.ctx.translate(this.viewport.x, this.viewport.y);
        this.ctx.scale(this.viewport.zoom, this.viewport.zoom);

        const allStrokes = [...this.drawings];
        if (this.currentStroke) allStrokes.push(this.currentStroke);

        allStrokes.forEach(stroke => {
            if (!stroke.points || stroke.points.length < 2) return;
            this.ctx.strokeStyle = stroke.color || '#ffffff';
            this.ctx.lineWidth = stroke.size || 3;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';

            this.ctx.beginPath();
            this.ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
            for (let i = 1; i < stroke.points.length; i++) {
                this.ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
            }
            this.ctx.stroke();
        });

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