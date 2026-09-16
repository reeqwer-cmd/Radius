import React, { useState, useRef, useEffect } from 'react';
import { 
  Folder, FolderOpen, FileText, Layout, GripVertical, Settings, 
  ChevronDown, ChevronRight, Download, Upload, MoreVertical, Plus, Edit2, X, Presentation,
  Check, Trash2, Calendar as CalendarIcon, Columns3, Sun, Moon
} from 'lucide-react';
import { WorkspaceTree, DocItem, DocType, WorkspaceItem, FolderItem, TreeOrderItem } from '../types/api';

interface SidebarProps {
  tree: WorkspaceTree;
  workspaceName: string;
  allWorkspaces: WorkspaceItem[];
  currentWsId: number | null;
  currentDocId: number | null;
  activeView: 'editor' | 'calendar' | 'project_kanban';
  modulesState: Record<string, boolean>;
  themeMode: 'light' | 'dark';
  onToggleThemeMode: () => void;
  onSelectDoc: (id: number) => void;
  onSelectCalendar: () => void;
  onSelectProjectKanban: () => void;
  onSelectWorkspace: (wsId: number) => Promise<void>;
  onCreateWorkspacePrompt: () => void;
  onDeleteWorkspacePrompt: (wsId: number) => void;
  onCreateFolder: (name: string) => Promise<void>;
  onCreateDoc: (title: string, folderId: number | null, type: DocType) => Promise<void>;
  onRenameWorkspace: (name: string) => Promise<void>;
  onRenameFolder: (id: number, name: string) => Promise<void>;
  onDeleteFolder: (id: number) => Promise<void>;
  onDeleteDoc: (id: number) => Promise<void>;
  onReorderTree: (items: TreeOrderItem[]) => Promise<void>;
  onExportWorkspace: () => void;
  onImportWorkspace: () => void;
  onOpenSettings: () => void;
}

type RootItem = 
  | { kind: 'folder'; item: FolderItem }
  | { kind: 'doc'; item: DocItem };

export const Sidebar: React.FC<SidebarProps> = ({
  tree,
  workspaceName,
  allWorkspaces,
  currentWsId,
  currentDocId,
  activeView,
  modulesState,
  themeMode,
  onToggleThemeMode,
  onSelectDoc,
  onSelectCalendar,
  onSelectProjectKanban,
  onSelectWorkspace,
  onCreateWorkspacePrompt,
  onDeleteWorkspacePrompt,
  onCreateFolder,
  onCreateDoc,
  onRenameWorkspace,
  onRenameFolder,
  onDeleteFolder,
  onDeleteDoc,
  onReorderTree,
  onExportWorkspace,
  onImportWorkspace,
  onOpenSettings
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [collapsedFolders, setCollapsedFolders] = useState<Set<number>>(new Set());
  const [isEditingWs, setIsEditingWs] = useState(false);
  const [wsNameInput, setWsNameInput] = useState(workspaceName);
  
  const [wsDropdownOpen, setWsDropdownOpen] = useState(false);
  const [wsMenuOpen, setWsMenuOpen] = useState(false);
  const [createMenuOpen, setCreateMenuOpen] = useState(false);

  const [draggedEntity, setDraggedEntity] = useState<
    { type: 'folder'; id: number } | { type: 'doc'; id: number; fromFolderId: number | null } | null
  >(null);

  const wsCardRef = useRef<HTMLDivElement>(null);
  const createMenuRef = useRef<HTMLDivElement>(null);

  const [inlineInput, setInlineInput] = useState<{
    visible: boolean;
    type: 'folder' | DocType;
    folderId: number | null;
    value: string;
  }>({ visible: false, type: 'document', folderId: null, value: '' });

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wsCardRef.current && !wsCardRef.current.contains(e.target as Node)) {
        setWsDropdownOpen(false);
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
      const defaultTitle = inlineInput.type === 'flipchart' 
        ? 'Новый флипчарт' 
        : (inlineInput.type === 'kanban' ? 'Новый канбан' : 'Новый документ');
      onCreateDoc(name || defaultTitle, inlineInput.folderId, inlineInput.type);
    }
    setInlineInput({ visible: false, type: 'document', folderId: null, value: '' });
  };

  const rootItems: RootItem[] = [
    ...tree.folders.map(f => ({ kind: 'folder' as const, item: f })),
    ...tree.documents.filter(d => d.folder_id === null).map(d => ({ kind: 'doc' as const, item: d }))
  ].sort((a, b) => (a.item.sort_order ?? 0) - (b.item.sort_order ?? 0));

  const handleDropOnRootItem = (e: React.DragEvent, targetItem: RootItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEntity) return;

    const currentRoots = [...rootItems].filter(r => {
      if (draggedEntity.type === 'folder') {
        return !(r.kind === 'folder' && r.item.id === draggedEntity.id);
      } else {
        return !(r.kind === 'doc' && r.item.id === draggedEntity.id);
      }
    });

    const targetIdx = currentRoots.findIndex(r => {
      if (targetItem.kind === 'folder') {
        return r.kind === 'folder' && r.item.id === targetItem.item.id;
      }
      return r.kind === 'doc' && r.item.id === targetItem.item.id;
    });

    const insertAt = targetIdx >= 0 ? targetIdx : currentRoots.length;

    let inserted: RootItem;
    if (draggedEntity.type === 'folder') {
      const f = tree.folders.find(x => x.id === draggedEntity.id)!;
      inserted = { kind: 'folder', item: f };
    } else {
      const d = tree.documents.find(x => x.id === draggedEntity.id)!;
      inserted = { kind: 'doc', item: { ...d, folder_id: null } };
    }

    currentRoots.splice(insertAt, 0, inserted);

    const updates: TreeOrderItem[] = currentRoots.map((r, index) => ({
      type: r.kind,
      id: r.item.id,
      folder_id: r.kind === 'doc' ? null : undefined,
      sort_order: index
    }));

    onReorderTree(updates);
    setDraggedEntity(null);
  };

  const handleDropOnFolderDoc = (e: React.DragEvent, targetDoc: DocItem) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEntity || draggedEntity.type !== 'doc') return;
    if (draggedEntity.id === targetDoc.id) return;

    const folderId = targetDoc.folder_id;
    const siblings = tree.documents
      .filter(d => d.folder_id === folderId && d.id !== draggedEntity.id)
      .sort((a, b) => a.sort_order - b.sort_order);

    const targetIdx = siblings.findIndex(d => d.id === targetDoc.id);
    const insertAt = targetIdx >= 0 ? targetIdx : siblings.length;

    const draggedDocObj = tree.documents.find(d => d.id === draggedEntity.id)!;
    siblings.splice(insertAt, 0, { ...draggedDocObj, folder_id: folderId });

    const updates: TreeOrderItem[] = siblings.map((d, index) => ({
      type: 'doc',
      id: d.id,
      folder_id: folderId,
      sort_order: index
    }));

    onReorderTree(updates);
    setDraggedEntity(null);
  };

  const handleDropIntoFolder = (e: React.DragEvent, targetFolderId: number) => {
    e.preventDefault();
    e.stopPropagation();

    if (!draggedEntity) return;

    if (draggedEntity.type === 'doc') {
      const siblings = tree.documents
        .filter(d => d.folder_id === targetFolderId && d.id !== draggedEntity.id)
        .sort((a, b) => a.sort_order - b.sort_order);

      const draggedDocObj = tree.documents.find(d => d.id === draggedEntity.id)!;
      siblings.push({ ...draggedDocObj, folder_id: targetFolderId });

      const updates: TreeOrderItem[] = siblings.map((d, index) => ({
        type: 'doc',
        id: d.id,
        folder_id: targetFolderId,
        sort_order: index
      }));

      onReorderTree(updates);
      setDraggedEntity(null);
      return;
    }

    if (draggedEntity.type === 'folder' && draggedEntity.id !== targetFolderId) {
      const targetFolder = tree.folders.find(f => f.id === targetFolderId);
      if (targetFolder) {
        handleDropOnRootItem(e, { kind: 'folder', item: targetFolder });
      }
    }
  };

  const isCalendarEnabled = modulesState['module_calendar'] !== false;
  const isKanbanEnabled = modulesState['module_kanban'] !== false;

  const renderDocIcon = (type: DocType) => {
    if (type === 'flipchart') return <Layout size={14} />;
    if (type === 'kanban') return <Columns3 size={14} />;
    return <FileText size={14} />;
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

        {/* Блок пространства */}
        <div 
          className="workspace-card"
          ref={wsCardRef}
          style={{
            position: 'relative',
            background: 'var(--bg-card)',
            border: '1px solid var(--border-color)',
            borderRadius: 8,
            padding: '8px 10px',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 6
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
                fontSize: 13,
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
              style={{ flex: 1, overflow: 'hidden', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}
              onClick={() => setWsDropdownOpen(!wsDropdownOpen)}
              title="Нажмите, чтобы переключить пространство"
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 1 }}>
                  Пространство
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-main)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {workspaceName}
                </div>
              </div>
              <ChevronDown size={14} style={{ opacity: 0.6, transform: wsDropdownOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </div>
          )}

          <button
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              borderRadius: 4
            }}
            onClick={() => setWsMenuOpen(!wsMenuOpen)}
            title="Действия с пространством"
          >
            <MoreVertical size={15} />
          </button>

          {wsDropdownOpen && (
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                right: 0,
                marginTop: 6,
                background: 'var(--bg-sidebar)',
                border: '1px solid var(--border-color)',
                borderRadius: 8,
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                maxHeight: 240,
                overflowY: 'auto',
                zIndex: 110,
                padding: '4px 0'
              }}
            >
              <div style={{ fontSize: 10, padding: '4px 10px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                Ваши пространства:
              </div>

              {allWorkspaces.map(ws => (
                <div
                  key={ws.id}
                  style={{
                    padding: '7px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: ws.id === currentWsId ? 'var(--item-active)' : 'transparent',
                    fontSize: 12
                  }}
                  onClick={() => {
                    setWsDropdownOpen(false);
                    onSelectWorkspace(ws.id);
                  }}
                >
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, fontWeight: ws.id === currentWsId ? 700 : 400 }}>
                    {ws.name}
                  </span>
                  {ws.id === currentWsId && <Check size={13} style={{ color: 'var(--accent)', marginLeft: 6 }} />}
                  {allWorkspaces.length > 1 && (
                    <button
                      className="action-btn"
                      style={{ marginLeft: 6, opacity: 0.5 }}
                      title="Удалить пространство"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteWorkspacePrompt(ws.id);
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              ))}

              <div style={{ borderTop: '1px solid var(--border-color)', margin: '4px 0' }}></div>
              <button
                style={{
                  width: '100%',
                  background: 'none',
                  border: 'none',
                  color: 'var(--accent)',
                  padding: '7px 10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 12,
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
                onClick={() => {
                  setWsDropdownOpen(false);
                  onCreateWorkspacePrompt();
                }}
              >
                <Plus size={13} />
                <span>Создать новое...</span>
              </button>
            </div>
          )}

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
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                minWidth: 190,
                zIndex: 110,
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

        {/* Сквозные подключаемые модули */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: 12 }}>
          {isCalendarEnabled && (
            <div
              className={`doc-item ${activeView === 'calendar' ? 'active' : ''}`}
              onClick={onSelectCalendar}
              style={{
                cursor: 'pointer',
                fontWeight: activeView === 'calendar' ? 700 : 500
              }}
            >
              <span className="doc-icon-svg">
                <CalendarIcon size={14} />
              </span>
              <span className="doc-name">Календарь заметок</span>
            </div>
          )}

          {isKanbanEnabled && (
            <div
              className={`doc-item ${activeView === 'project_kanban' ? 'active' : ''}`}
              onClick={onSelectProjectKanban}
              style={{
                cursor: 'pointer',
                fontWeight: activeView === 'project_kanban' ? 700 : 500
              }}
            >
              <span className="doc-icon-svg">
                <Columns3 size={14} />
              </span>
              <span className="doc-name">Канбан проекта</span>
            </div>
          )}
        </div>

        {/* Заголовок документов */}
        <div
          ref={createMenuRef}
          style={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '4px 4px 8px 4px',
            borderBottom: '1px solid var(--border-color)',
            marginBottom: 8
          }}
        >
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
            Документы
          </span>

          <button
            style={{
              width: 22,
              height: 22,
              borderRadius: 4,
              border: '1px solid var(--border-color)',
              background: 'transparent',
              color: 'var(--text-muted)',
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
                boxShadow: '0 8px 24px rgba(0,0,0,0.2)',
                minWidth: 170,
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
                  textAlign: 'left'
                }}
                onClick={() => {
                  setCreateMenuOpen(false);
                  setInlineInput({ visible: true, type: 'kanban', folderId: null, value: '' });
                }}
              >
                <Columns3 size={14} />
                <span>Канбан задачи</span>
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

        {/* Дерево элементов */}
        <div 
          id="tree-container"
          onDragOver={e => e.preventDefault()}
          onDrop={e => {
            if (rootItems.length > 0) {
              handleDropOnRootItem(e, rootItems[rootItems.length - 1]);
            }
          }}
        >
          {rootItems.map(rootNode => {
            if (rootNode.kind === 'folder') {
              const folder = rootNode.item;
              const isFoldCollapsed = collapsedFolders.has(folder.id);
              const folderDocs = tree.documents
                .filter(d => d.folder_id === folder.id)
                .sort((a, b) => a.sort_order - b.sort_order);

              return (
                <div
                  key={`folder_${folder.id}`}
                  className="folder-block"
                  draggable
                  onDragStart={() => setDraggedEntity({ type: 'folder', id: folder.id })}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropOnRootItem(e, rootNode)}
                >
                  <div
                    className="folder-header"
                    onClick={() => toggleFolderCollapse(folder.id)}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => handleDropIntoFolder(e, folder.id)}
                  >
                    <div className="folder-title-wrap">
                      <span className="doc-drag-handle" title="Потяните для перемещения"><GripVertical size={11} /></span>
                      <span className="folder-toggle-icon">{isFoldCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}</span>
                      <span className="folder-icon-svg">{isFoldCollapsed ? <Folder size={15} /> : <FolderOpen size={15} />}</span>
                      <span className="folder-name">{folder.name}</span>
                    </div>

                    <div className="folder-actions" onClick={e => e.stopPropagation()}>
                      <button 
                        className="action-btn" 
                        title="Добавить документ" 
                        onClick={() => setInlineInput({ visible: true, type: 'document', folderId: folder.id, value: '' })}
                      >
                        <Plus size={13} />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Добавить флипчарт" 
                        onClick={() => setInlineInput({ visible: true, type: 'flipchart', folderId: folder.id, value: '' })}
                      >
                        <Presentation size={13} />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Добавить канбан" 
                        onClick={() => setInlineInput({ visible: true, type: 'kanban', folderId: folder.id, value: '' })}
                      >
                        <Columns3 size={13} />
                      </button>
                      <button 
                        className="action-btn" 
                        title="Переименовать" 
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
                        onClick={() => {
                          if (confirm('Удалить папку? Документы переместятся в корень.')) onDeleteFolder(folder.id);
                        }}
                      >
                        <X size={12} />
                      </button>
                    </div>
                  </div>

                  {!isFoldCollapsed && (
                    <ul 
                      className="folder-docs"
                      onDragOver={e => e.preventDefault()}
                      onDrop={e => handleDropIntoFolder(e, folder.id)}
                    >
                      {folderDocs.map(doc => (
                        <li
                          key={`doc_${doc.id}`}
                          className={`doc-item ${activeView === 'editor' && doc.id === currentDocId ? 'active' : ''}`}
                          draggable
                          onDragStart={e => {
                            e.stopPropagation();
                            setDraggedEntity({ type: 'doc', id: doc.id, fromFolderId: folder.id });
                            e.dataTransfer.setData('application/x-radian-doc', JSON.stringify({ id: doc.id, title: doc.title }));
                          }}
                          onDragOver={e => e.preventDefault()}
                          onDrop={e => handleDropOnFolderDoc(e, doc)}
                          onClick={() => onSelectDoc(doc.id)}
                        >
                          <span className="doc-drag-handle"><GripVertical size={12} /></span>
                          <span className="doc-icon-svg">{renderDocIcon(doc.type)}</span>
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
            } else {
              const doc = rootNode.item;
              return (
                <div
                  key={`root_doc_${doc.id}`}
                  className={`doc-item ${activeView === 'editor' && doc.id === currentDocId ? 'active' : ''}`}
                  draggable
                  onDragStart={e => {
                    setDraggedEntity({ type: 'doc', id: doc.id, fromFolderId: null });
                    e.dataTransfer.setData('application/x-radian-doc', JSON.stringify({ id: doc.id, title: doc.title }));
                  }}
                  onDragOver={e => e.preventDefault()}
                  onDrop={e => handleDropOnRootItem(e, rootNode)}
                  onClick={() => onSelectDoc(doc.id)}
                  style={{ marginBottom: 2 }}
                >
                  <span className="doc-drag-handle"><GripVertical size={12} /></span>
                  <span className="doc-icon-svg">{renderDocIcon(doc.type)}</span>
                  <span className="doc-name">{doc.title}</span>
                  <div className="doc-actions" onClick={e => e.stopPropagation()}>
                    <button className="action-btn" onClick={() => { if (confirm('Удалить элемент?')) onDeleteDoc(doc.id); }}><X size={12} /></button>
                  </div>
                </div>
              );
            }
          })}
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

        {/* Футер сайдбара: Настройки + Быстрый переключатель День/Ночь */}
        <div className="sidebar-footer">
          <button className="btn-settings" onClick={onOpenSettings}>
            <Settings size={14} />
            <span>Настройки</span>
          </button>
          <button 
            className="btn-theme-mode" 
            onClick={onToggleThemeMode} 
            title={themeMode === 'light' ? 'Переключить в режим Ночь (Тёмный)' : 'Переключить в режим День (Светлый)'}
          >
            {themeMode === 'light' ? <Moon size={15} /> : <Sun size={15} />}
          </button>
        </div>
      </div>
    </>
  );
};