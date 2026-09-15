import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MousePointer, Hand, StickyNote, ArrowUpRight, Pen, Eraser, RotateCcw, Bold, Italic, GripVertical, X, ExternalLink, RefreshCw } from 'lucide-react';
import { PyWebViewAPI } from '../types/api';

interface FlipchartViewProps {
  data: any;
  api?: PyWebViewAPI | null;
  onOpenDocument?: (docId: number) => void;
  onChange: (data: any) => void;
}

export const FlipchartView: React.FC<FlipchartViewProps> = ({ data, api, onOpenDocument, onChange }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [viewport, setViewport] = useState(data?.viewport || { x: 0, y: 0, zoom: 1.0 });
  const [elements, setElements] = useState<any[]>(Array.isArray(data?.elements) ? data.elements : []);
  const [connections, setConnections] = useState<any[]>(Array.isArray(data?.connections) ? data.connections : []);
  const [drawings, setDrawings] = useState<any[]>(Array.isArray(data?.drawings) ? data.drawings : []);

  const [tool, setTool] = useState<'select' | 'hand' | 'sticky' | 'connector' | 'pen' | 'eraser'>('select');
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });

  const isDrawingRef = useRef(false);
  const currentStrokeRef = useRef<any>(null);

  const [dragArrow, setDragArrow] = useState<{
    fromId: string;
    currentX: number;
    currentY: number;
  } | null>(null);

  const stateRef = useRef({ viewport, elements, connections, drawings });
  stateRef.current = { viewport, elements, connections, drawings };

  const triggerChange = useCallback((nextElements = elements, nextConns = connections, nextDrawings = drawings, nextVp = viewport) => {
    onChange({
      viewport: nextVp,
      elements: nextElements,
      connections: nextConns,
      drawings: nextDrawings
    });
  }, [elements, connections, drawings, viewport, onChange]);

  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const zoom = stateRef.current.viewport.zoom || 1.0;
    return {
      x: (clientX - rect.left - stateRef.current.viewport.x) / zoom,
      y: (clientY - rect.top - stateRef.current.viewport.y) / zoom
    };
  }, []);

  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !containerRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.translate(stateRef.current.viewport.x, stateRef.current.viewport.y);
    ctx.scale(stateRef.current.viewport.zoom, stateRef.current.viewport.zoom);

    const renderStroke = (stroke: any) => {
      if (!stroke.points || stroke.points.length < 2) return;
      ctx.strokeStyle = stroke.color || '#F8E794';
      ctx.lineWidth = stroke.size || 2.5;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0][0], stroke.points[0][1]);
      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i][0], stroke.points[i][1]);
      }
      ctx.stroke();
    };

    stateRef.current.drawings.forEach(renderStroke);
    if (currentStrokeRef.current) renderStroke(currentStrokeRef.current);

    ctx.restore();
  }, []);

  useEffect(() => {
    redrawCanvas();
  }, [viewport, drawings, redrawCanvas]);

  useEffect(() => {
    const handleResize = () => {
      if (canvasRef.current && containerRef.current) {
        canvasRef.current.width = containerRef.current.clientWidth;
        canvasRef.current.height = containerRef.current.clientHeight;
        redrawCanvas();
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [redrawCanvas]);

  const handleWheel = (e: React.WheelEvent) => {
    if ((e.target as HTMLElement).closest('.contenteditable-text')) return;

    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const currentZoom = viewport.zoom || 1.0;
    const newZoom = Math.min(Math.max(currentZoom * factor, 0.15), 2.5);

    const rect = containerRef.current!.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const nextVp = {
      x: mouseX - (mouseX - viewport.x) * (newZoom / currentZoom),
      y: mouseY - (mouseY - viewport.y) * (newZoom / currentZoom),
      zoom: newZoom
    };
    setViewport(nextVp);
    triggerChange(elements, connections, drawings, nextVp);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.affine-dock, .affine-element')) return;
    const coords = screenToWorld(e.clientX, e.clientY);

    if (tool === 'sticky') {
      const newEl = {
        id: 'el_' + Date.now(),
        type: 'sticky',
        x: Math.round(coords.x - 110),
        y: Math.round(coords.y - 80),
        width: 220,
        height: 160,
        fontSize: 14,
        titleFontSize: 14,
        content: 'Новая заметка'
      };
      const next = [...elements, newEl];
      setElements(next);
      triggerChange(next);
      setTool('select');
      return;
    }

    if (tool === 'pen') {
      isDrawingRef.current = true;
      currentStrokeRef.current = {
        color: '#F8E794',
        size: 3,
        points: [[coords.x, coords.y]]
      };
      return;
    }

    if (tool === 'eraser') {
      const radius = 22 / (viewport.zoom || 1);
      const nextDrawings = drawings.filter(s =>
        !s.points.some(([px, py]: [number, number]) => Math.hypot(px - coords.x, py - coords.y) <= radius)
      );
      setDrawings(nextDrawings);
      triggerChange(elements, connections, nextDrawings);
      return;
    }

    setIsPanning(true);
    setPanStart({ x: e.clientX - viewport.x, y: e.clientY - viewport.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      const nextVp = { ...viewport, x: e.clientX - panStart.x, y: e.clientY - panStart.y };
      setViewport(nextVp);
      return;
    }

    if (isDrawingRef.current && currentStrokeRef.current) {
      const coords = screenToWorld(e.clientX, e.clientY);
      currentStrokeRef.current.points.push([coords.x, coords.y]);
      redrawCanvas();
      return;
    }

    if (dragArrow) {
      const coords = screenToWorld(e.clientX, e.clientY);
      setDragArrow({ ...dragArrow, currentX: coords.x, currentY: coords.y });
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isPanning) {
      setIsPanning(false);
      triggerChange();
    }

    if (isDrawingRef.current && currentStrokeRef.current) {
      isDrawingRef.current = false;
      const next = [...drawings, currentStrokeRef.current];
      setDrawings(next);
      currentStrokeRef.current = null;
      triggerChange(elements, connections, next);
    }

    if (dragArrow) {
      const coords = screenToWorld(e.clientX, e.clientY);
      const target = elements.find(el =>
        coords.x >= el.x && coords.x <= el.x + (el.width || 240) &&
        coords.y >= el.y && coords.y <= el.y + (el.height || 170)
      );

      if (target && target.id !== dragArrow.fromId) {
        const exists = connections.some(c =>
          (c.from === dragArrow.fromId && c.to === target.id) ||
          (c.from === target.id && c.to === dragArrow.fromId)
        );
        if (!exists) {
          const nextConns = [...connections, { from: dragArrow.fromId, to: target.id }];
          setConnections(nextConns);
          triggerChange(elements, nextConns);
        }
      }
      setDragArrow(null);
    }
  };

  const parseBlocksToHtml = (blocks: any[]): string => {
    if (!Array.isArray(blocks)) return '';
    return blocks.map(b => {
      if (!b || !b.data) return '';
      // Чек-листы из EditorJS
      if (b.type === 'checklist' && Array.isArray(b.data.items)) {
        return b.data.items.map((it: any) => {
          const text = typeof it === 'string' ? it : (it.text || it.content || '');
          const checked = typeof it === 'object' ? !!it.checked : false;
          return `<div style="display:flex;align-items:flex-start;gap:6px;margin:3px 0;"><span style="color:var(--accent);font-weight:bold;">${checked ? '☑' : '☐'}</span><span>${text}</span></div>`;
        }).join('');
      }
      // Списки
      if (b.type === 'list' && Array.isArray(b.data.items)) {
        return b.data.items.map((it: any) => {
          const text = typeof it === 'string' ? it : (it.content || it.text || '');
          return `<div style="margin:2px 0;">• ${text}</div>`;
        }).join('');
      }
      return b.data.text ? `<div style="margin:2px 0;">${b.data.text}</div>` : '';
    }).filter(Boolean).join('');
  };

  const handleDropDoc = async (e: React.DragEvent) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/x-radian-doc') || e.dataTransfer.getData('text/plain');
    if (!raw) return;
    try {
      const doc = JSON.parse(raw);
      const coords = screenToWorld(e.clientX, e.clientY);
      let docHtml = '';

      if (api) {
        const loaded = await api.load_document(doc.id);
        if (loaded?.content?.blocks) {
          docHtml = parseBlocksToHtml(loaded.content.blocks);
        }
      }

      const newEl = {
        id: 'doc_' + Date.now(),
        type: 'doc-link',
        docId: doc.id,
        docTitle: doc.title,
        docContent: docHtml,
        x: Math.round(coords.x),
        y: Math.round(coords.y),
        width: 260,
        height: 190,
        fontSize: 13,
        titleFontSize: 14
      };
      const next = [...elements, newEl];
      setElements(next);
      triggerChange(next);
    } catch {}
  };

  const refreshCardFromDoc = async (el: any) => {
    if (!api) return;
    let targetDocId = el.docId;
    if (!targetDocId) {
      const state = await api.get_initial_state();
      if (state.workspace_id) {
        const tree = await api.get_workspace_tree(state.workspace_id);
        const match = tree.documents.find(d => d.title.trim().toLowerCase() === (el.docTitle || '').trim().toLowerCase());
        if (match) targetDocId = match.id;
      }
    }
    if (!targetDocId) {
      alert('Документ не найден в базе.');
      return;
    }

    const loaded = await api.load_document(targetDocId);
    if (loaded) {
      el.docId = targetDocId;
      el.docTitle = loaded.title;
      el.docContent = parseBlocksToHtml(loaded.content?.blocks || []);
      setElements([...elements]);
      triggerChange();
    }
  };

  const handleOpenDocLink = async (el: any) => {
    if (el.docId && onOpenDocument) {
      onOpenDocument(el.docId);
      return;
    }
    if (api && onOpenDocument) {
      const state = await api.get_initial_state();
      if (state.workspace_id) {
        const tree = await api.get_workspace_tree(state.workspace_id);
        const match = tree.documents.find(d => d.title.trim().toLowerCase() === (el.docTitle || '').trim().toLowerCase());
        if (match) {
          el.docId = match.id;
          onOpenDocument(match.id);
          return;
        }
      }
    }
    alert('Документ не найден');
  };

  const startDragCard = (e: React.MouseEvent, el: any) => {
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const initX = el.x;
    const initY = el.y;

    const onMove = (me: MouseEvent) => {
      const zoom = stateRef.current.viewport.zoom || 1.0;
      el.x = Math.round(initX + (me.clientX - startX) / zoom);
      el.y = Math.round(initY + (me.clientY - startY) / zoom);
      setElements([...stateRef.current.elements]);
    };

    const onUp = () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
      triggerChange();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const getLinePoints = (el1: any, el2: any) => {
    const w1 = el1.width || 240;
    const h1 = el1.height || 170;
    const w2 = el2.width || 240;
    const h2 = el2.height || 170;

    const c1 = { x: el1.x + w1 / 2, y: el1.y + h1 / 2 };
    const c2 = { x: el2.x + w2 / 2, y: el2.y + h2 / 2 };

    const intersectRect = (center: { x: number; y: number }, target: { x: number; y: number }, rect: { x: number; y: number; w: number; h: number }) => {
      const dx = target.x - center.x;
      const dy = target.y - center.y;
      if (dx === 0 && dy === 0) return center;

      const halfW = rect.w / 2;
      const halfH = rect.h / 2;

      const scaleX = halfW / Math.abs(dx || 0.0001);
      const scaleY = halfH / Math.abs(dy || 0.0001);
      const scale = Math.min(scaleX, scaleY);

      return {
        x: center.x + dx * scale,
        y: center.y + dy * scale
      };
    };

    const p1 = intersectRect(c1, c2, { x: el1.x, y: el1.y, w: w1, h: h1 });
    const p2 = intersectRect(c2, c1, { x: el2.x, y: el2.y, w: w2, h: h2 });

    return { p1, p2 };
  };

  // Мгновенное сохранение размера шрифта как заголовка, так и текста
  const changeFontSize = (el: any, delta: number, isTitle = false) => {
    const updated = elements.map(item => {
      if (item.id === el.id) {
        if (isTitle) {
          const newSize = Math.min(36, Math.max(10, (item.titleFontSize || 14) + delta));
          return { ...item, titleFontSize: newSize };
        } else {
          const newSize = Math.min(36, Math.max(10, (item.fontSize || 13) + delta));
          return { ...item, fontSize: newSize };
        }
      }
      return item;
    });

    setElements(updated);
    triggerChange(updated);
  };

  return (
    <div
      id="flipchart-container"
      ref={containerRef}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onDragOver={e => e.preventDefault()}
      onDrop={handleDropDoc}
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
        cursor: tool === 'hand' ? (isPanning ? 'grabbing' : 'grab') : (tool === 'pen' ? 'crosshair' : 'default')
      }}
    >
      <div
        className="affine-viewport"
        style={{
          position: 'absolute',
          inset: 0,
          backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          backgroundSize: `${24 * (viewport.zoom || 1)}px ${24 * (viewport.zoom || 1)}px`
        }}
      >
        <div
          className="affine-canvas-layer"
          style={{
            position: 'absolute',
            inset: 0,
            transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
            transformOrigin: '0 0'
          }}
        >
          {/* Слой связей со стрелками */}
          <svg
            className="affine-connections-svg"
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', overflow: 'visible', pointerEvents: 'none', zIndex: 1 }}
          >
            <defs>
              <marker id="fc-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                <path d="M 0 0 L 8 4 L 0 8 z" fill="var(--accent)" />
              </marker>
            </defs>

            {connections.map((c, i) => {
              const fromEl = elements.find(e => e.id === c.from);
              const toEl = elements.find(e => e.id === c.to);
              if (!fromEl || !toEl) return null;

              const { p1, p2 } = getLinePoints(fromEl, toEl);
              const pathD = `M ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`;

              return (
                <g key={i}>
                  <path
                    d={pathD}
                    stroke="transparent"
                    strokeWidth="24"
                    fill="none"
                    style={{ cursor: 'pointer', pointerEvents: 'stroke' }}
                    onClick={() => {
                      const next = connections.filter((_, idx) => idx !== i);
                      setConnections(next);
                      triggerChange(elements, next);
                    }}
                  >
                    <title>Нажмите для удаления стрелки</title>
                  </path>
                  <path
                    d={pathD}
                    stroke="var(--accent)"
                    strokeWidth="2.5"
                    fill="none"
                    markerEnd="url(#fc-arrow)"
                    style={{ pointerEvents: 'none' }}
                  />
                </g>
              );
            })}

            {dragArrow && (() => {
              const fromEl = elements.find(e => e.id === dragArrow.fromId);
              if (!fromEl) return null;
              const w = fromEl.width || 240;
              const h = fromEl.height || 170;
              const center = { x: fromEl.x + w / 2, y: fromEl.y + h / 2 };

              return (
                <line
                  x1={center.x}
                  y1={center.y}
                  x2={dragArrow.currentX}
                  y2={dragArrow.currentY}
                  stroke="var(--accent)"
                  strokeWidth="2.5"
                  strokeDasharray="4"
                  markerEnd="url(#fc-arrow)"
                />
              );
            })()}
          </svg>

          {/* Карточки на холсте */}
          <div className="affine-elements-layer" style={{ position: 'absolute', inset: 0, zIndex: 2 }}>
            {elements.map(el => {
              const isDoc = el.type === 'doc-link' || !!el.docTitle;

              return (
                <div
                  key={el.id}
                  className={`affine-element ${isDoc ? 'card-theme-doc' : 'card-theme-note'}`}
                  style={{
                    position: 'absolute',
                    left: `${el.x}px`,
                    top: `${el.y}px`,
                    width: `${el.width || 240}px`,
                    height: `${el.height || 170}px`,
                    display: 'flex',
                    flexDirection: 'column',
                    borderRadius: '8px',
                    boxShadow: '0 6px 18px rgba(0,0,0,0.3)',
                    overflow: 'visible'
                  }}
                  onMouseDown={e => {
                    if (tool === 'connector') {
                      e.stopPropagation();
                      const coords = screenToWorld(e.clientX, e.clientY);
                      setDragArrow({
                        fromId: el.id,
                        currentX: coords.x,
                        currentY: coords.y
                      });
                    }
                  }}
                >
                  <div className="sticky-format-toolbar">
                    <button className="tb-btn" title="Жирный" onClick={() => document.execCommand('bold')}><Bold size={12} /></button>
                    <button className="tb-btn" title="Курсив" onClick={() => document.execCommand('italic')}><Italic size={12} /></button>
                    <button className="tb-btn" title="Шрифт заголовка -" onClick={() => changeFontSize(el, -1, true)}>A- заг</button>
                    <button className="tb-btn" title="Шрифт заголовка +" onClick={() => changeFontSize(el, 1, true)}>A+ заг</button>
                    <button className="tb-btn" title="Шрифт текста -" onClick={() => changeFontSize(el, -1, false)}>A-</button>
                    <button className="tb-btn" title="Шрифт текста +" onClick={() => changeFontSize(el, 1, false)}>A+</button>
                  </div>

                  <div className="affine-el-header" onMouseDown={e => startDragCard(e, el)}>
                    <div className="header-title-wrap">
                      <span className="el-drag-handle"><GripVertical size={12} /></span>
                      <span className="element-type-badge">{isDoc ? 'ДОКУМЕНТ' : 'ЗАМЕТКА'}</span>
                    </div>

                    <div className="el-controls" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {isDoc && (
                        <>
                          <button
                            className="el-btn"
                            title="Синхронизировать чеклисты и текст из оригинального документа"
                            onClick={e => {
                              e.stopPropagation();
                              refreshCardFromDoc(el);
                            }}
                          >
                            <RefreshCw size={12} />
                          </button>
                          <button
                            className="el-btn"
                            title="Открыть документ"
                            onClick={e => {
                              e.stopPropagation();
                              handleOpenDocLink(el);
                            }}
                          >
                            <ExternalLink size={12} />
                          </button>
                        </>
                      )}

                      <button
                        className="el-btn"
                        title="Удалить карточку"
                        onClick={e => {
                          e.stopPropagation();
                          const next = elements.filter(item => item.id !== el.id);
                          const nextConns = connections.filter(c => c.from !== el.id && c.to !== el.id);
                          setElements(next);
                          setConnections(nextConns);
                          triggerChange(next, nextConns);
                        }}
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>

                  {isDoc && (
                    <div className="doc-link-content" style={{ padding: '6px 10px', borderBottom: '1px solid var(--border-color)' }}>
                      <div
                        className="doc-link-title contenteditable-title"
                        contentEditable
                        suppressContentEditableWarning
                        style={{ fontSize: `${el.titleFontSize || 14}px`, fontWeight: 700 }}
                        onBlur={e => {
                          el.docTitle = e.currentTarget.innerText;
                          triggerChange();
                        }}
                      >
                        {el.docTitle || 'Без названия'}
                      </div>
                    </div>
                  )}

                  <div
                    className="contenteditable-text"
                    contentEditable
                    suppressContentEditableWarning
                    dangerouslySetInnerHTML={{ __html: isDoc ? (el.docContent || '') : (el.content || '') }}
                    style={{
                      flex: 1,
                      padding: '8px 10px',
                      overflowY: 'auto',
                      fontSize: `${el.fontSize || 13}px`,
                      lineHeight: 1.45,
                      userSelect: 'text'
                    }}
                    onBlur={e => {
                      if (isDoc) el.docContent = e.currentTarget.innerHTML;
                      else el.content = e.currentTarget.innerHTML;
                      triggerChange();
                    }}
                  />

                  <div
                    className="conn-port port-right"
                    title="Потяните стрелку к любой другой карточке"
                    onMouseDown={e => {
                      e.stopPropagation();
                      const coords = screenToWorld(e.clientX, e.clientY);
                      setDragArrow({
                        fromId: el.id,
                        currentX: coords.x,
                        currentY: coords.y
                      });
                    }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <canvas
          ref={canvasRef}
          className="affine-draw-canvas"
          style={{ position: 'absolute', inset: 0, zIndex: 3, pointerEvents: 'none' }}
        />
      </div>

      <div className="affine-dock">
        <div className="dock-group">
          <button className={`dock-btn ${tool === 'select' ? 'active' : ''}`} onClick={() => setTool('select')} title="Курсор (V)"><MousePointer size={16} /></button>
          <button className={`dock-btn ${tool === 'hand' ? 'active' : ''}`} onClick={() => setTool('hand')} title="Рука (H)"><Hand size={16} /></button>
        </div>
        <div className="dock-divider" />
        <div className="dock-group">
          <button className={`dock-btn ${tool === 'sticky' ? 'active' : ''}`} onClick={() => setTool('sticky')} title="Заметка (S)"><StickyNote size={16} /></button>
          <button className={`dock-btn ${tool === 'connector' ? 'active' : ''}`} onClick={() => setTool('connector')} title="Стрелка (C)"><ArrowUpRight size={16} /></button>
          <button className={`dock-btn ${tool === 'pen' ? 'active' : ''}`} onClick={() => setTool('pen')} title="Перо (P)"><Pen size={16} /></button>
          <button className={`dock-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => setTool('eraser')} title="Ластик (E)"><Eraser size={16} /></button>
        </div>
        <div className="dock-divider" />
        <div className="dock-group">
          <span className="zoom-indicator">{Math.round((viewport.zoom || 1.0) * 100)}%</span>
          <button className="dock-btn-sm" onClick={() => { setViewport({ x: 0, y: 0, zoom: 1.0 }); triggerChange(); }} title="Сбросить масштаб"><RotateCcw size={13} /></button>
        </div>
      </div>
    </div>
  );
};