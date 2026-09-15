import React, { useState, useEffect } from 'react';
import { Plus, X, GripVertical, Trash2, Edit2, Check } from 'lucide-react';
import { KanbanBoardData, KanbanCard, KanbanColumn } from '../types/api';

interface KanbanViewProps {
  data: KanbanBoardData | any;
  onChange: (updated: KanbanBoardData) => void;
}

const DEFAULT_BOARD: KanbanBoardData = {
  columns: [
    { id: 'col-todo', title: 'К выполнению', cards: [] },
    { id: 'col-in-progress', title: 'В работе', cards: [] },
    { id: 'col-done', title: 'Готово', cards: [] }
  ]
};

const PRIORITY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  low: { label: 'Низкий', color: '#4caf50', bg: 'rgba(76, 175, 80, 0.15)' },
  medium: { label: 'Средний', color: '#ff9800', bg: 'rgba(255, 152, 0, 0.15)' },
  high: { label: 'Высокий', color: '#f44336', bg: 'rgba(244, 67, 54, 0.15)' },
  urgent: { label: 'Срочно', color: '#e91e63', bg: 'rgba(233, 30, 99, 0.2)' }
};

export const KanbanView: React.FC<KanbanViewProps> = ({ data, onChange }) => {
  const [board, setBoard] = useState<KanbanBoardData>(() => {
    if (data && Array.isArray(data.columns)) return data;
    return DEFAULT_BOARD;
  });

  const [draggedCard, setDraggedCard] = useState<{ cardId: string; sourceColId: string } | null>(null);
  const [draggedColId, setDraggedColId] = useState<string | null>(null);
  const [newColTitle, setNewColTitle] = useState('');
  const [isAddingCol, setIsAddingCol] = useState(false);

  const [editingColId, setEditingColId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const [activeCardModal, setActiveCardModal] = useState<{
    isOpen: boolean;
    colId: string;
    card: KanbanCard;
    isNew: boolean;
  } | null>(null);

  useEffect(() => {
    if (data && Array.isArray(data.columns)) {
      setBoard(data);
    }
  }, [data]);

  const updateBoard = (newBoard: KanbanBoardData) => {
    setBoard(newBoard);
    onChange(newBoard);
  };

  const handleAddColumn = () => {
    if (!newColTitle.trim()) return;
    const newCol: KanbanColumn = {
      id: `col-${Date.now()}`,
      title: newColTitle.trim(),
      cards: []
    };
    updateBoard({
      ...board,
      columns: [...board.columns, newCol]
    });
    setNewColTitle('');
    setIsAddingCol(false);
  };

  const handleDeleteColumn = (colId: string) => {
    if (!confirm('Удалить эту колонку вместе со всеми карточками?')) return;
    updateBoard({
      ...board,
      columns: board.columns.filter(c => c.id !== colId)
    });
  };

  const startRenamingColumn = (col: KanbanColumn) => {
    setEditingColId(col.id);
    setEditingTitle(col.title);
  };

  const finishRenamingColumn = () => {
    if (!editingColId) return;
    const trimmed = editingTitle.trim();
    if (trimmed) {
      updateBoard({
        ...board,
        columns: board.columns.map(c => c.id === editingColId ? { ...c, title: trimmed } : c)
      });
    }
    setEditingColId(null);
    setEditingTitle('');
  };

  const handleColumnDragStart = (e: React.DragEvent, colId: string) => {
    if (editingColId === colId) {
      e.preventDefault();
      return;
    }
    e.stopPropagation();
    setDraggedColId(colId);
    e.dataTransfer.setData('text/plain', `col:${colId}`);
  };

  const handleColumnDrop = (e: React.DragEvent, targetColId: string) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedColId && draggedColId !== targetColId) {
      const cols = [...board.columns];
      const fromIdx = cols.findIndex(c => c.id === draggedColId);
      const toIdx = cols.findIndex(c => c.id === targetColId);

      if (fromIdx >= 0 && toIdx >= 0) {
        const [moved] = cols.splice(fromIdx, 1);
        cols.splice(toIdx, 0, moved);
        updateBoard({ ...board, columns: cols });
      }
      setDraggedColId(null);
      return;
    }

    if (draggedCard) {
      const { cardId, sourceColId } = draggedCard;
      const sourceCol = board.columns.find(c => c.id === sourceColId);
      if (!sourceCol) return;
      const cardObj = sourceCol.cards.find(c => c.id === cardId);
      if (!cardObj) return;

      const newColumns = board.columns.map(col => {
        if (col.id === sourceColId && col.id === targetColId) return col;
        if (col.id === sourceColId) {
          return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
        }
        if (col.id === targetColId) {
          return { ...col, cards: [...col.cards, cardObj] };
        }
        return col;
      });

      updateBoard({ ...board, columns: newColumns });
      setDraggedCard(null);
    }
  };

  const openAddCard = (colId: string) => {
    setActiveCardModal({
      isOpen: true,
      colId,
      isNew: true,
      card: {
        id: `card-${Date.now()}`,
        title: '',
        description: '',
        priority: 'medium'
      }
    });
  };

  const openEditCard = (colId: string, card: KanbanCard) => {
    setActiveCardModal({
      isOpen: true,
      colId,
      isNew: false,
      card: { ...card }
    });
  };

  const handleSaveCardModal = () => {
    if (!activeCardModal || !activeCardModal.card.title.trim()) return;
    const { colId, card, isNew } = activeCardModal;

    const newColumns = board.columns.map(col => {
      if (col.id !== colId) return col;
      if (isNew) {
        return { ...col, cards: [...col.cards, card] };
      }
      return {
        ...col,
        cards: col.cards.map(c => c.id === card.id ? card : c)
      };
    });

    updateBoard({ ...board, columns: newColumns });
    setActiveCardModal(null);
  };

  const handleDeleteCard = (colId: string, cardId: string) => {
    const newColumns = board.columns.map(col => {
      if (col.id !== colId) return col;
      return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
    });
    updateBoard({ ...board, columns: newColumns });
  };

  const handleCardDragStart = (e: React.DragEvent, cardId: string, sourceColId: string) => {
    e.stopPropagation();
    setDraggedCard({ cardId, sourceColId });
  };

  const handleDropOnCard = (e: React.DragEvent, targetColId: string, targetCardId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedColId) return;
    if (!draggedCard) return;

    const { cardId, sourceColId } = draggedCard;
    if (cardId === targetCardId) return;

    const sourceCol = board.columns.find(c => c.id === sourceColId);
    if (!sourceCol) return;
    const cardObj = sourceCol.cards.find(c => c.id === cardId);
    if (!cardObj) return;

    const newColumns = board.columns.map(col => {
      if (col.id === sourceColId && sourceColId === targetColId) {
        const without = col.cards.filter(c => c.id !== cardId);
        const idx = without.findIndex(c => c.id === targetCardId);
        without.splice(idx >= 0 ? idx : without.length, 0, cardObj);
        return { ...col, cards: without };
      }
      if (col.id === sourceColId) {
        return { ...col, cards: col.cards.filter(c => c.id !== cardId) };
      }
      if (col.id === targetColId) {
        const idx = col.cards.findIndex(c => c.id === targetCardId);
        const copy = [...col.cards];
        copy.splice(idx >= 0 ? idx : copy.length, 0, cardObj);
        return { ...col, cards: copy };
      }
      return col;
    });

    updateBoard({ ...board, columns: newColumns });
    setDraggedCard(null);
  };

  return (
    <div
      className="kanban-board-container"
      style={{
        display: 'flex',
        width: '100%',
        height: '100%',
        overflowX: 'auto',
        gap: 12,
        padding: '2px 0 6px 0',
        alignItems: 'flex-start',
        boxSizing: 'border-box'
      }}
    >
      <style>{`
        .kanban-board-container::-webkit-scrollbar {
          height: 6px;
        }
        .kanban-board-container::-webkit-scrollbar-track {
          background: transparent;
        }
        .kanban-board-container::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 3px;
        }
        .kanban-col-cards::-webkit-scrollbar {
          width: 4px;
        }
        .kanban-col-cards::-webkit-scrollbar-thumb {
          background: var(--border-color);
          border-radius: 2px;
        }
      `}</style>

      {board.columns.map(column => {
        const isEditingThisCol = editingColId === column.id;

        return (
          <div
            key={column.id}
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleColumnDrop(e, column.id)}
            style={{
              flex: '1 1 0',
              minWidth: 190,
              maxHeight: '100%',
              backgroundColor: 'var(--bg-card)',
              border: '1px solid var(--border-color)',
              borderRadius: 10,
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              overflow: 'hidden',
              opacity: draggedColId === column.id ? 0.45 : 1,
              transition: 'opacity 0.15s, flex 0.15s'
            }}
          >
            {/* Шапка колонки */}
            <div
              draggable={!isEditingThisCol}
              onDragStart={e => handleColumnDragStart(e, column.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '8px 10px',
                borderBottom: '1px solid var(--border-color)',
                cursor: isEditingThisCol ? 'default' : 'grab',
                userSelect: 'none',
                minHeight: 42,
                boxSizing: 'border-box',
                flexShrink: 0
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1, minWidth: 0, marginRight: 4 }}>
                <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />

                {isEditingThisCol ? (
                  <input
                    type="text"
                    autoFocus
                    value={editingTitle}
                    onChange={e => setEditingTitle(e.target.value)}
                    onBlur={finishRenamingColumn}
                    onKeyDown={e => {
                      if (e.key === 'Enter') finishRenamingColumn();
                      if (e.key === 'Escape') setEditingColId(null);
                    }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      background: 'var(--bg-body)',
                      border: '1px solid var(--accent)',
                      borderRadius: 4,
                      padding: '2px 6px',
                      width: '100%',
                      outline: 'none'
                    }}
                  />
                ) : (
                  <span
                    onDoubleClick={() => startRenamingColumn(column)}
                    title="Двойной клик для переименования"
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--text-main)',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      cursor: 'pointer'
                    }}
                  >
                    {column.title}
                  </span>
                )}

                <span style={{ fontSize: 11, background: 'var(--item-active)', padding: '1px 6px', borderRadius: 10, color: 'var(--text-muted)', flexShrink: 0 }}>
                  {column.cards.length}
                </span>
              </div>

              <div style={{ display: 'flex', gap: 2, flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                {isEditingThisCol ? (
                  <button className="action-btn" title="Сохранить" onClick={finishRenamingColumn}>
                    <Check size={13} style={{ color: 'var(--accent)' }} />
                  </button>
                ) : (
                  <button className="action-btn" title="Переименовать" onClick={() => startRenamingColumn(column)}>
                    <Edit2 size={12} />
                  </button>
                )}
                <button className="action-btn" title="Удалить колонку" onClick={() => handleDeleteColumn(column.id)}>
                  <Trash2 size={12} />
                </button>
              </div>
            </div>

            {/* Карточки колонки */}
            <div
              className="kanban-col-cards"
              style={{
                flex: '0 1 auto',
                overflowY: 'auto',
                padding: column.cards.length > 0 ? '8px' : '4px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                minHeight: column.cards.length === 0 ? 12 : 0
              }}
            >
              {column.cards.map(card => {
                const priorityInfo = PRIORITY_CONFIG[card.priority || 'medium'];
                return (
                  <div
                    key={card.id}
                    draggable
                    onDragStart={e => handleCardDragStart(e, card.id, column.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDropOnCard(e, column.id, card.id)}
                    onClick={() => openEditCard(column.id, card)}
                    style={{
                      backgroundColor: 'var(--bg-body)',
                      border: '1px solid var(--border-color)',
                      borderRadius: 8,
                      padding: '8px 10px',
                      cursor: 'grab',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4,
                      position: 'relative'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '1px 5px',
                        borderRadius: 4,
                        color: priorityInfo.color,
                        backgroundColor: priorityInfo.bg
                      }}>
                        {priorityInfo.label}
                      </span>
                      <button
                        className="action-btn"
                        style={{ opacity: 0.5 }}
                        onClick={e => {
                          e.stopPropagation();
                          handleDeleteCard(column.id, card.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>

                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)', lineHeight: 1.35, wordBreak: 'break-word' }}>
                      {card.title}
                    </div>

                    {card.description && (
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.35, maxHeight: 38, overflow: 'hidden', textOverflow: 'ellipsis', wordBreak: 'break-word' }}>
                        {card.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              onClick={() => openAddCard(column.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                borderTop: '1px solid var(--border-color)',
                color: 'var(--accent)',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              <Plus size={14} /> Добавить карточку
            </button>
          </div>
        );
      })}

      {/* Добавление новой колонки */}
      {isAddingCol ? (
        <div style={{
          flex: '0 0 240px',
          minWidth: 220,
          backgroundColor: 'var(--bg-card)',
          border: '1px solid var(--border-color)',
          borderRadius: 10,
          padding: 10,
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          alignSelf: 'flex-start'
        }}>
          <input
            type="text"
            className="inline-text-input"
            autoFocus
            placeholder="Название колонки..."
            value={newColTitle}
            onChange={e => setNewColTitle(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleAddColumn();
              if (e.key === 'Escape') setIsAddingCol(false);
            }}
          />
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-save" style={{ flex: 1, padding: '6px' }} onClick={handleAddColumn}>Создать</button>
            <button className="dock-btn-sm" onClick={() => setIsAddingCol(false)}><X size={14} /></button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setIsAddingCol(true)}
          style={{
            flex: '0 0 auto',
            height: 38,
            padding: '0 12px',
            borderRadius: 8,
            border: '1px dashed var(--border-color)',
            background: 'transparent',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            alignSelf: 'flex-start'
          }}
        >
          <Plus size={14} /> Добавить колонку
        </button>
      )}

      {/* Модальное окно редактирования карточки */}
      {activeCardModal && (
        <div id="settingsOverlay" className="active" onClick={() => setActiveCardModal(null)}>
          <div
            className="settings-window"
            onClick={e => e.stopPropagation()}
            style={{ width: 440, height: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)' }}>
                {activeCardModal.isNew ? 'Новая карточка задачи' : 'Редактировать задачу'}
              </span>
              <button className="settings-close-btn" onClick={() => setActiveCardModal(null)}>&times;</button>
            </div>

            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Заголовок</label>
              <input
                type="text"
                autoFocus
                className="doc-title-input"
                style={{ width: '100%', fontSize: 14, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)' }}
                value={activeCardModal.card.title}
                onChange={e => setActiveCardModal({
                  ...activeCardModal,
                  card: { ...activeCardModal.card, title: e.target.value }
                })}
              />
            </div>

            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Приоритет</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {(['low', 'medium', 'high', 'urgent'] as const).map(p => {
                  const isSel = activeCardModal.card.priority === p;
                  const info = PRIORITY_CONFIG[p];
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setActiveCardModal({
                        ...activeCardModal,
                        card: { ...activeCardModal.card, priority: p }
                      })}
                      style={{
                        flex: 1,
                        padding: '6px 0',
                        fontSize: 11,
                        borderRadius: 6,
                        border: isSel ? `2px solid ${info.color}` : '1px solid var(--border-color)',
                        background: isSel ? info.bg : 'transparent',
                        color: isSel ? info.color : 'var(--text-muted)',
                        fontWeight: isSel ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {info.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label style={{ fontSize: 11, textTransform: 'uppercase', color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>Описание / Детали</label>
              <textarea
                rows={4}
                style={{ width: '100%', fontSize: 13, padding: 10, borderRadius: 6, border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-main)', resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                placeholder="Добавьте подробности..."
                value={activeCardModal.card.description || ''}
                onChange={e => setActiveCardModal({
                  ...activeCardModal,
                  card: { ...activeCardModal.card, description: e.target.value }
                })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 6 }}>
              <button className="dock-btn-sm" onClick={() => setActiveCardModal(null)}>Отмена</button>
              <button className="btn-save" onClick={handleSaveCardModal}>Сохранить</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};