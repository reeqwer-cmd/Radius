import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, FolderOpen, FileText, Layout, GripVertical, Settings, 
  ChevronDown, ChevronRight, Download, Upload, MoreVertical, Plus, Edit2, X, Presentation
} from 'lucide-react';
import { WorkspaceTree, DocItem, DocType } from '../types/api';

interface SidebarProps {
  tree: WorkspaceTree;
  workspaceName: string;
  currentDocId: number | null;
  onSelectDoc: (id: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onCreateDoc: (title: string, folderId: number | null, type: DocType) => Promise<void>;
  onRenameWorkspace: (name: string) => Promise<void>;
  onRenameFolder: (id: number, name: string) => Promise<void>;
  onDeleteFolder: (id: number) => Promise<void>;
  onDeleteDoc: (id: number) => Promise<void>;
  onMoveDocToFolder: (docId: number, folderId: number | null) => Promise<void>;
  onReorderFolders: (folderIds: number[]) => Promise<void>;
  onExportWorkspace: () => void;
  onImportWorkspace: () => void;
  onOpenSettings: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  tree,
  workspaceName,
  currentDocId,
  onSelectDoc,
  onCreateFolder,
  onCreateDoc,
  onRenameWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onDeleteDoc,
  onMoveDocToFolder,
  onReorderFolders,
  onExportWorkspace,
  onImportWorkspace,
  onOpenSettings
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
  const [isEditingWs, setIsEditingWs] = useState(false);
  const [wsNameInput, setWsNameInput] = useState(workspaceName);
  
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState<number | null>(null);

  const wsMenuRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const [inlineInput, setInlineInput] = useState<{
    visible: boolean;
    type: 'folder' | DocType;
    folderId: number | null;
    value: string;
  }>({ visible: false, type: 'document', folderId: null, value: '' });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsMenuRef.current && !wsMenuRef.current.contains(e.target as Node)) {
        setWsMenuOpen(false);
      }
      if (createMenuRef.current && !createMenuRef.current.contains(e.target as Node)) {
        setCreateMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFolderCollapse = (folderId: number) => {
    setCollapsedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) next.delete(folderId);
      else next.add(folderId);
      return next;
    });
  };

  const handleFinishRenameWs = () => {
    setIsEditingWs(false);
    if (wsNameInput.trim() && wsNameInput !== workspaceName) {
      onRenameWorkspace(wsNameInput.trim());
    }
  };

  const handleConfirmInline = () => {
    if (!inlineInput.visible) return;
    const name = inlineInput.value.trim();
    if (inlineInput.type === 'folder') {
      onCreateFolder(name || 'Новая папка');
    } else {
      onCreateDoc(name || (inlineInput.type === 'flipchart' ? 'Новый флипчарт' : 'Новый документ'), inlineInput.folderId, inlineInput.type);
    }
    setInlineInput({ visible: false, type: 'document', folderId: null, value: '' });
  };

  const handleDocDragStart = (e: React.DragEvent, doc: DocItem) => {
    e.dataTransfer.setData('application/x-radian-doc', JSON.stringify(doc));
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: doc.id, title: doc.title, type: doc.type }));
    e.dataTransfer.effectAllowed = 'copyMove';
  };

  const handleFolderDrop = (e: React.DragEvent, targetFolderId: number | null) => {
    e.preventDefault();
    e.stopPropagation();

    if (draggedFolderId !== null && targetFolderId !== null && draggedFolderId !== targetFolderId) {
      const folderIds = tree.folders.map(f => f.id);
      const fromIdx = folderIds.indexOf(draggedFolderId);
      const toIdx = folderIds.indexOf(targetFolderId);
      if (fromIdx !== -1 && toIdx !== -1) {
        folderIds.splice(fromIdx, 1);
        folderIds.splice(toIdx, 0, draggedFolderId);
        onReorderFolders(folderIds);
      }
      setDraggedFolderId(null);
      return;
    }

    try {
      const raw = e.dataTransfer.getData('application/x-radian-doc') || e.dataTransfer.getData('text/plain');
      if (raw) {
        const item = JSON.parse(raw);
        if (item.id) onMoveDocToFolder(item.id, targetFolderId);
      }
    } catch {}
  };

  return (
    <>
      <button className="btn-toggle-sidebar" onClick={() => setCollapsed(!collapsed)} title="Свернуть / развернуть панель">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <rect x="2" y="2" width="14" height="14" rx="3"></rect>
          <line x1="7" y1="2" x2="7" y2="16"></line>
        </svg>
      </button>

      <div id="sidebar" className={collapsed ? 'collapsed' : ''}>
        <div className="brand-header">
          <span className="brand-title">РАДИАН</span>
        </div>

        {/* Блок текущего рабочего пространства */}
        <div 
          className="workspace-card"
          ref={wsMenuRef}
          style={{
            position: 'relative',
            background: 'rgba(255, 255, 255, 0.04)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '8px 12px',
            marginBottom: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8
          }}
        >
          {isEditingWs ? (
            <input
              type="text"
              className="workspace-edit-input"
              value={wsNameInput}
              autoFocus
              style={{
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderBottom: '1px solid var(--accent)',
                color: 'var(--text-main)',
                fontSize: 14,
                fontWeight: 600,
                outline: 'none',
                padding: '2px 0'
              }}
              onChange={e => setWsNameInput(e.target.value)}
              onBlur={handleFinishRenameWs}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFinishRenameWs();
                if (e.key === 'Escape') setIsEditingWs(false);
              }}
            />
          ) : (
            <div 
              style={{ flex: 1, overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => { setWsNameInput(workspaceName); setIsEditingWs(true); }}
              title="Нажмите, чтобы переименовать"
            >
              <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.6, marginBottom: 2 }}>
                Пространство
              </div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {workspaceName}
              </div>
            </div>
          )}

          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-main)',
              opacity: 0.7,
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4
            }}
            onClick={() => setWsMenuOpen(!wsMenuOpen)}
            title="Опции пространства"
          >
            <MoreVertical size={16} />
          </button>

          {wsMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 6,
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 190,
                zIndex: 100,
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setWsMenuOpen(false);
                  setWsNameInput(workspaceName);
                  setIsEditingWs(true);
                }}
              >
                <Edit2 size={13} />
                <span>Переименовать</span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setWsMenuOpen(false);
                  onExportWorkspace();
                }}
              >
                <Download size={13} />
                <span>Сохранить на диск (.radian)</span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderTop: '1px solid var(--border-color)'
                }}
                onClick={() => {
                  setWsMenuOpen(false);
                  onImportWorkspace();
                }}
              >
                <Upload size={13} />
                <span>Загрузить с диска</span>
              </button>
            </div>
          )}
        </div>

        {/* Панель «Документы» с аккуратным плюсиком */}
        <div
          ref={createMenuRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 6px 8px 6px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 8
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', opacity: 0.6 }}>
            Документы
          </span>

          <button
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-main)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
            onClick={() => setCreateMenuOpen(!createMenuOpen)}
            title="Создать элемент"
          >
            <Plus size={14} />
          </button>

          {createMenuOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                right: 0,
                marginTop: 4,
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                minWidth: 160,
                zIndex: 100,
                padding: '4px 0',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setCreateMenuOpen(false);
                  setInlineInput({ visible: true, type: 'document', folderId: null, value: '' });
                }}
              >
                <FileText size={14} />
                <span>Документ</span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setCreateMenuOpen(false);
                  setInlineInput({ visible: true, type: 'flipchart', folderId: null, value: '' });
                }}
              >
                <Presentation size={14} />
                <span>Флипчарт</span>
              </button>
              <button
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--text-main)',
                  padding: '8px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left',
                  borderTop: '1px solid var(--border-color)'
                }}
                onClick={() => {
                  setCreateMenuOpen(false);
                  setInlineInput({ visible: true, type: 'folder', folderId: null, value: '' });
                }}
              >
                <Folder size={14} />
                <span>Папку</span>
              </button>
            </div>
          )}
        </div>

        {/* Дерево папок и документов */}
        <div id="tree-container">
          {tree.folders.map(folder => {
            const isFoldCollapsed = collapsedFolders.has(folder.id);
            const folderDocs = tree.documents.filter(d => d.folder_id === folder.id);

            return (
              <div
                key={folder.id}
                className="folder-block"
                draggable
                onDragStart={() => setDraggedFolderId(folder.id)}
                onDragEnd={() => setDraggedFolderId(null)}
              >
                <div
                  className="folder-header"
                  onClick={() => toggleFolderCollapse(folder.id)}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleFolderDrop(e, folder.id)}
                >
                  <div className="folder-title-wrap">
                    <span className="doc-drag-handle" style={{ marginRight: 2 }} title="Потяните для изменения порядка"><GripVertical size={11} /></span>
                    <span className="folder-toggle-icon">{isFoldCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</span>
                    <span className="folder-icon-svg">{isFoldCollapsed ? <Folder size={15} /> : <FolderOpen size={15} />}</span>
                    <span className="folder-name">{folder.name}</span>
                  </div>
                  <div className="folder-actions" onClick={e => e.stopPropagation()}>
                    <button 
                      className="action-btn" 
                      title="Добавить документ" 
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setInlineInput({ visible: true, type: 'document', folderId: folder.id, value: '' })}
                    >
                      <Plus size={13} />
                    </button>
                    <button 
                      className="action-btn" 
                      title="Добавить флипчарт" 
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => setInlineInput({ visible: true, type: 'flipchart', folderId: folder.id, value: '' })}
                    >
                      <Presentation size={13} />
                    </button>
                    <button 
                      className="action-btn" 
                      title="Переименовать" 
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        const newN = prompt('Название папки:', folder.name);
                        if (newN && newN.trim()) onRenameFolder(folder.id, newN.trim());
                      }}
                    >
                      <Edit2 size={11} />
                    </button>
                    <button 
                      className="action-btn" 
                      title="Удалить" 
                      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => {
                        if (confirm('Удалить папку? Документы переместятся в корень.')) onDeleteFolder(folder.id);
                      }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                </div>

                {!isFoldCollapsed && (
                  <ul className="folder-docs">
                    {folderDocs.map(doc => (
                      <li
                        key={doc.id}
                        className={`doc-item ${doc.id === currentDocId ? 'active' : ''} ${doc.type === 'flipchart' ? 'doc-item-flipchart' : ''}`}
                        draggable
                        onDragStart={e => handleDocDragStart(e, doc)}
                        onClick={() => onSelectDoc(doc.id)}
                      >
                        <span className="doc-drag-handle"><GripVertical size={12} /></span>
                        <span className="doc-icon-svg">{doc.type === 'flipchart' ? <Layout size={14} /> : <FileText size={14} />}</span>
                        <span className="doc-name">{doc.title}</span>
                        <div className="doc-actions" onClick={e => e.stopPropagation()}>
                          <button className="action-btn" onClick={() => { if (confirm('Удалить документ?')) onDeleteDoc(doc.id); }}><X size={12} /></button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}

          <ul
            className="doc-list-root"
            onDragOver={e => e.preventDefault()}
            onDrop={e => handleFolderDrop(e, null)}
          >
            {tree.documents.filter(d => !d.folder_id).map(doc => (
              <li
                key={doc.id}
                className={`doc-item ${doc.id === currentDocId ? 'active' : ''} ${doc.type === 'flipchart' ? 'doc-item-flipchart' : ''}`}
                draggable
                onDragStart={e => handleDocDragStart(e, doc)}
                onClick={() => onSelectDoc(doc.id)}
              >
                <span className="doc-drag-handle"><GripVertical size={12} /></span>
                <span className="doc-icon-svg">{doc.type === 'flipchart' ? <Layout size={14} /> : <FileText size={14} />}</span>
                <span className="doc-name">{doc.title}</span>
                <div className="doc-actions" onClick={e => e.stopPropagation()}>
                  <button className="action-btn" onClick={() => { if (confirm('Удалить элемент?')) onDeleteDoc(doc.id); }}><X size={12} /></button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {inlineInput.visible && (
          <div className="inline-input-row" style={{ display: 'flex' }}>
            <input
              type="text"
              className="inline-text-input"
              autoFocus
              placeholder="Название..."
              value={inlineInput.value}
              onChange={e => setInlineInput({ ...inlineInput, value: e.target.value })}
              onKeyDown={e => {
                if (e.key === 'Enter') handleConfirmInline();
                if (e.key === 'Escape') setInlineInput({ ...inlineInput, visible: false });
              }}
            />
            <button className="btn-inline-ok" onClick={handleConfirmInline}>Ок</button>
            <button className="btn-inline-cancel" onClick={() => setInlineInput({ ...inlineInput, visible: false })}><X size={12} /></button>
          </div>
        )}

        <div className="sidebar-footer">
          <button className="btn-settings" onClick={onOpenSettings}>
            <Settings size={14} />
            Настройки
          </button>
        </div>
      </div>
    </>
  );
};