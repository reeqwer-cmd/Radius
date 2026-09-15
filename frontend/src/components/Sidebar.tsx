import React, { useState } from 'react';
import { Folder, FolderOpen, FileText, Layout, GripVertical, Settings, ChevronDown, ChevronRight } from 'lucide-react';
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
  onOpenSettings
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
  const [isEditingWs, setIsEditingWs] = useState(false);
  const [wsNameInput, setWsNameInput] = useState(workspaceName);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);
  const [draggedFolderId, setDraggedFolderId] = useState<number | null>(null);

  const [inlineInput, setInlineInput] = useState<{
    visible: boolean;
    type: 'folder' | DocType;
    folderId: number | null;
    value: string;
  }>({ visible: false, type: 'document', folderId: null, value: '' });

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

    // Если перетаскивали папку для смены порядка
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

    // Если перетаскивали документ
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
          <span className="brand-title">Радиан</span>
        </div>

        <div className="workspace-block">
          {isEditingWs ? (
            <input
              type="text"
              className="workspace-edit-input"
              value={wsNameInput}
              autoFocus
              onChange={e => setWsNameInput(e.target.value)}
              onBlur={handleFinishRenameWs}
              onKeyDown={e => {
                if (e.key === 'Enter') handleFinishRenameWs();
                if (e.key === 'Escape') setIsEditingWs(false);
              }}
            />
          ) : (
            <div className="workspace-name-wrap" onClick={() => { setWsNameInput(workspaceName); setIsEditingWs(true); }}>
              <span className="workspace-name">{workspaceName}</span>
              <span className="edit-icon">✎</span>
            </div>
          )}
        </div>

        <div className="create-menu-wrapper">
          <button className="btn-create-main" onClick={() => setCreateMenuOpen(!createMenuOpen)}>
            <span>Создать</span>
            <span style={{ fontSize: '8px', opacity: 0.7 }}>▼</span>
          </button>
          {createMenuOpen && (
            <ul className="create-dropdown open">
              <li className="create-dropdown-item" onClick={() => { setCreateMenuOpen(false); setInlineInput({ visible: true, type: 'document', folderId: null, value: '' }); }}>Документ</li>
              <li className="create-dropdown-item" onClick={() => { setCreateMenuOpen(false); setInlineInput({ visible: true, type: 'flipchart', folderId: null, value: '' }); }}>Флипчарт</li>
              <li className="create-dropdown-item" onClick={() => { setCreateMenuOpen(false); setInlineInput({ visible: true, type: 'folder', folderId: null, value: '' }); }}>Папка</li>
            </ul>
          )}
        </div>

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
                    <button className="action-btn" title="Добавить документ" onClick={() => setInlineInput({ visible: true, type: 'document', folderId: folder.id, value: '' })}>+</button>
                    <button className="action-btn" title="Добавить флипчарт" onClick={() => setInlineInput({ visible: true, type: 'flipchart', folderId: folder.id, value: '' })}>🎨</button>
                    <button className="action-btn" title="Переименовать" onClick={() => {
                      const newN = prompt('Название папки:', folder.name);
                      if (newN && newN.trim()) onRenameFolder(folder.id, newN.trim());
                    }}>✎</button>
                    <button className="action-btn" title="Удалить" onClick={() => {
                      if (confirm('Удалить папку? Документы переместятся в корень.')) onDeleteFolder(folder.id);
                    }}>&times;</button>
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
                          <button className="action-btn" onClick={() => { if (confirm('Удалить документ?')) onDeleteDoc(doc.id); }}>&times;</button>
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
                  <button className="action-btn" onClick={() => { if (confirm('Удалить элемент?')) onDeleteDoc(doc.id); }}>&times;</button>
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
            <button className="btn-inline-cancel" onClick={() => setInlineInput({ ...inlineInput, visible: false })}>&times;</button>
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