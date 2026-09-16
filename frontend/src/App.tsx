import { useEffect, useState, useRef } from 'react';
import { usePyWebView } from './hooks/usePyWebView';
import { Sidebar } from './components/Sidebar';
import { EditorView } from './components/EditorView';
import { FlipchartView } from './components/FlipchartView';
import { CalendarView } from './components/CalendarView';
import { KanbanView } from './components/KanbanView';
import { SettingsModal } from './components/SettingsModal';
import { WorkspaceTree, LoadedDocument, DocType, UpdateInfo, WorkspaceItem, TreeOrderItem, KanbanBoardData } from './types/api';

export default function App() {
  const { isReady, api } = usePyWebView();

  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('Загрузка...');
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceItem[]>([]);
  const [tree, setTree] = useState<WorkspaceTree>({ folders: [], documents: [] });
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<LoadedDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  
  // Цветовая палитра и режим День/Ночь
  const [theme, setTheme] = useState<string>('american_silver');
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const [font, setFont] = useState<string>('Inter');
  const [modulesState, setModulesState] = useState<Record<string, boolean>>({});
  const [activeView, setActiveView] = useState<'editor' | 'calendar' | 'project_kanban'>('editor');
  const [projectKanbanData, setProjectKanbanData] = useState<KanbanBoardData | null>(null);

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [status, setStatus] = useState('Готов');

  const [showWelcome, setShowWelcome] = useState(false);
  const [initialWsName, setInitialWsName] = useState('Основное пространство');

  const [updateModal, setUpdateModal] = useState<{
    isOpen: boolean;
    info: UpdateInfo | null;
    isUpdating: boolean;
  }>({ isOpen: false, info: null, isUpdating: false });

  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isReady || !api) return;

    (async () => {
      const savedTheme = await api.get_theme();
      const finalTheme = savedTheme || 'american_silver';
      setTheme(finalTheme);
      document.documentElement.setAttribute('data-theme', finalTheme);

      const savedMode = await api.get_theme_mode();
      const finalMode = (savedMode === 'dark' || savedMode === 'light') ? savedMode : 'light';
      setThemeMode(finalMode);
      document.documentElement.setAttribute('data-mode', finalMode);

      const savedFont = await api.get_font();
      setFont(savedFont || 'Inter');
      document.documentElement.style.setProperty('--app-font', savedFont || 'Inter');

      const modules = await api.get_modules_state();
      setModulesState(modules || {});

      const wsList = await api.get_all_workspaces();
      setAllWorkspaces(wsList);

      const state = await api.get_initial_state();
      if (!state || !state.has_workspace) {
        setShowWelcome(true);
      } else {
        setWorkspaceId(state.workspace_id!);
        setWorkspaceName(state.workspace_name!);
        await refreshTree(state.workspace_id!);
      }

      try {
        const update = await api.check_update();
        if (update && update.has_update && update.download_url) {
          setUpdateModal({ isOpen: true, info: update, isUpdating: false });
        }
      } catch {}
    })();
  }, [isReady, api]);

  const refreshTree = async (wsId: number) => {
    if (!api) return;
    const treeData = await api.get_workspace_tree(wsId);
    setTree(treeData);

    if (treeData.documents.length > 0 && currentDocId === null && activeView === 'editor') {
      loadDoc(treeData.documents[0].id);
    }
  };

  const handleSelectWorkspace = async (newWsId: number) => {
    if (!api || newWsId === workspaceId) return;
    await api.set_active_workspace(newWsId);
    const target = allWorkspaces.find(w => w.id === newWsId);
    setWorkspaceId(newWsId);
    setWorkspaceName(target ? target.name : 'Пространство');
    await refreshTree(newWsId);
    if (activeView === 'project_kanban') {
      loadProjectKanban(newWsId);
    }
  };

  const loadDoc = async (id: number) => {
    if (!api) return;
    const data = await api.load_document(id);
    if (data) {
      setActiveView('editor');
      setCurrentDocId(id);
      setCurrentDoc(data);
      setDocTitle(data.title);
      const badgeText = data.type === 'flipchart' ? 'Флипчарт готов' : (data.type === 'kanban' ? 'Канбан готов' : 'Готов');
      setStatus(badgeText);
    }
  };

  const loadProjectKanban = async (wsId: number) => {
    if (!api) return;
    setActiveView('project_kanban');
    setCurrentDocId(null);
    setStatus('Готов');
    const data = await api.get_workspace_kanban(wsId);
    setProjectKanbanData(data);
  };

  const handleSaveProjectKanban = (updatedData: KanbanBoardData) => {
    setProjectKanbanData(updatedData);
    setStatus('Изменения...');

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      if (!api || !workspaceId) return;
      const res = await api.save_workspace_kanban(workspaceId, updatedData);
      if (res && res.status === 'ok') {
        setStatus(`Сохранено (${res.time?.split(' ')[1] || ''})`);
      } else {
        setStatus('Ошибка сохранения');
      }
    }, 1000);
  };

  const triggerAutoSave = (updatedContent?: any, newTitle?: string) => {
    if (activeView !== 'editor') return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatus('Изменения...');

    saveTimerRef.current = setTimeout(async () => {
      if (!api || !currentDocId) return;
      const titleToSave = (newTitle !== undefined ? newTitle : docTitle).trim() || 'Без названия';
      const contentToSave = updatedContent !== undefined ? updatedContent : currentDoc?.content;

      const res = await api.save_document(currentDocId, titleToSave, contentToSave);
      if (res && res.status === 'ok') {
        setStatus(`Сохранено (${res.time?.split(' ')[1] || ''})`);
        setTree(prev => ({
          ...prev,
          documents: prev.documents.map(d => d.id === currentDocId ? { ...d, title: titleToSave } : d)
        }));
      }
    }, 1200);
  };

  const handleApplyTheme = async (themeId: string) => {
    setTheme(themeId);
    document.documentElement.setAttribute('data-theme', themeId);
    if (api) await api.set_theme(themeId);
  };

  const handleApplyThemeMode = async (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    document.documentElement.setAttribute('data-mode', mode);
    if (api) await api.set_theme_mode(mode);
  };

  const handleToggleThemeMode = async () => {
    const nextMode = themeMode === 'light' ? 'dark' : 'light';
    await handleApplyThemeMode(nextMode);
  };

  const handleApplyFont = async (fontName: string) => {
    setFont(fontName);
    document.documentElement.style.setProperty('--app-font', fontName);
    if (api) await api.set_font(fontName);
  };

  const handleToggleModule = async (moduleKey: string, enabled: boolean) => {
    setModulesState(prev => ({ ...prev, [moduleKey]: enabled }));
    if (api) await api.toggle_module(moduleKey, enabled);
  };

  const handleCreateWorkspace = async (name?: string) => {
    if (!api) return;
    const wsName = name || initialWsName;
    const res = await api.create_workspace(wsName);
    setWorkspaceId(res.workspace_id);
    setWorkspaceName(res.workspace_name);
    setShowWelcome(false);

    const wsList = await api.get_all_workspaces();
    setAllWorkspaces(wsList);

    await refreshTree(res.workspace_id);
    await loadDoc(res.initial_doc_id);
  };

  const handleDeleteWorkspace = async (wsId: number) => {
    if (!api) return;
    if (!confirm('Вы уверены, что хотите удалить это рабочее пространство?')) return;
    await api.delete_workspace(wsId);

    const wsList = await api.get_all_workspaces();
    setAllWorkspaces(wsList);

    if (wsList.length > 0) {
      await handleSelectWorkspace(wsList[0].id);
    } else {
      setShowWelcome(true);
    }
  };

  const handleExportWorkspace = async () => {
    if (!api || !workspaceId) return;
    const res = await api.export_workspace(workspaceId);
    if (res.status === 'ok') alert('Рабочее пространство сохранено!');
    else if (res.status === 'error') alert('Ошибка: ' + res.message);
  };

  const handleImportWorkspace = async () => {
    if (!api) return;
    const res = await api.import_workspace();
    if (res.status === 'ok' && res.workspace_id) {
      setWorkspaceId(res.workspace_id);
      setWorkspaceName(res.workspace_name || 'Импортированное пространство');
      const wsList = await api.get_all_workspaces();
      setAllWorkspaces(wsList);
      await refreshTree(res.workspace_id);
      if (res.initial_doc_id) await loadDoc(res.initial_doc_id);
      alert('Пространство успешно загружено!');
    } else if (res.status === 'error') {
      alert('Ошибка: ' + res.message);
    }
  };

  const handleReorderTree = async (items: TreeOrderItem[]) => {
    if (!api || !workspaceId) return;
    await api.reorder_tree_items(workspaceId, items);
    await refreshTree(workspaceId);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative' }}>
      {showWelcome && (
        <div id="welcome-screen" style={{ display: 'flex' }}>
          <div className="welcome-card">
            <h2>Добро пожаловать в Радиан</h2>
            <p>Создайте первое рабочее пространство.</p>
            <input type="text" value={initialWsName} onChange={e => setInitialWsName(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); }} />
            <button className="btn-save" style={{ width: '100%', padding: '10px' }} onClick={() => handleCreateWorkspace()}>Создать пространство</button>
          </div>
        </div>
      )}

      <Sidebar
        tree={tree}
        workspaceName={workspaceName}
        allWorkspaces={allWorkspaces}
        currentWsId={workspaceId}
        currentDocId={currentDocId}
        activeView={activeView}
        modulesState={modulesState}
        themeMode={themeMode}
        onToggleThemeMode={handleToggleThemeMode}
        onSelectDoc={loadDoc}
        onSelectCalendar={() => setActiveView('calendar')}
        onSelectProjectKanban={() => { if (workspaceId) loadProjectKanban(workspaceId); }}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspacePrompt={() => { const name = prompt('Название пространства:'); if (name && name.trim()) handleCreateWorkspace(name.trim()); }}
        onDeleteWorkspacePrompt={handleDeleteWorkspace}
        onCreateFolder={async name => { if (!api || !workspaceId) return; await api.create_folder(workspaceId, name); refreshTree(workspaceId); }}
        onCreateDoc={async (title, folderId, type: DocType) => { if (!api || !workspaceId) return; const newId = await api.create_document(workspaceId, title, folderId, type); await refreshTree(workspaceId); await loadDoc(newId); }}
        onRenameWorkspace={async name => { if (!api || !workspaceId) return; const updated = await api.rename_workspace(workspaceId, name); setWorkspaceName(updated); setAllWorkspaces(await api.get_all_workspaces()); }}
        onRenameFolder={async (id, name) => { if (!api || !workspaceId) return; await api.rename_folder(id, name); refreshTree(workspaceId); }}
        onDeleteFolder={async id => { if (!api || !workspaceId) return; await api.delete_folder(id); refreshTree(workspaceId); }}
        onDeleteDoc={async id => { if (!api || !workspaceId) return; await api.delete_document(id); if (currentDocId === id) { setCurrentDocId(null); setCurrentDoc(null); } refreshTree(workspaceId); }}
        onReorderTree={handleReorderTree}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div id="main-content" style={{ flex: 1, height: '100vh', display: 'flex', flexDirection: 'column', padding: activeView === 'calendar' ? '24px 32px' : (currentDoc?.type === 'flipchart' || currentDoc?.type === 'kanban' || activeView === 'project_kanban' ? '14px 20px' : '24px 48px 40px'), overflow: 'hidden', boxSizing: 'border-box' }}>
        {activeView === 'editor' && (
          <div className="top-nav" style={{ marginBottom: currentDoc?.type === 'flipchart' || currentDoc?.type === 'kanban' ? '10px' : '20px' }}>
            <div className="title-input-wrap">
              <input type="text" className="doc-title-input" placeholder="Название документа" value={docTitle} onChange={e => { setDocTitle(e.target.value); triggerAutoSave(undefined, e.target.value); }} />
            </div>
            <div className="top-nav-actions">
              <span id="status" className="status-badge">{status}</span>
              <button className="btn-save" onClick={() => triggerAutoSave()}>Сохранить</button>
            </div>
          </div>
        )}

        {activeView === 'project_kanban' && (
          <div className="top-nav" style={{ marginBottom: 10 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--accent)' }}>
              Канбан проекта: {workspaceName}
            </div>
            <div className="top-nav-actions">
              <span id="status" className="status-badge">{status}</span>
            </div>
          </div>
        )}

        <div style={{ flex: 1, position: 'relative', overflow: activeView === 'calendar' || currentDoc?.type === 'flipchart' || currentDoc?.type === 'kanban' || activeView === 'project_kanban' ? 'hidden' : 'auto', minHeight: 0 }}>
          {activeView === 'calendar' && <CalendarView workspaceId={workspaceId} api={api} />}

          {activeView === 'project_kanban' && (
            <KanbanView
              key={`proj_${workspaceId}`}
              data={projectKanbanData}
              onChange={handleSaveProjectKanban}
            />
          )}

          {activeView === 'editor' && currentDoc && currentDoc.type === 'document' && (
            <EditorView key={currentDocId} data={currentDoc.content} onChange={updated => triggerAutoSave(updated)} />
          )}

          {activeView === 'editor' && currentDoc && currentDoc.type === 'flipchart' && (
            <FlipchartView key={currentDocId} data={currentDoc.content} api={api} onOpenDocument={loadDoc} onChange={updated => triggerAutoSave(updated)} />
          )}

          {activeView === 'editor' && currentDoc && currentDoc.type === 'kanban' && (
            <KanbanView
              key={currentDocId}
              data={currentDoc.content}
              onChange={updated => triggerAutoSave(updated)}
            />
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        currentTheme={theme}
        currentFont={font}
        themeMode={themeMode}
        modulesState={modulesState}
        api={api}
        onSelectTheme={handleApplyTheme}
        onSelectFont={handleApplyFont}
        onSelectThemeMode={handleApplyThemeMode}
        onToggleModule={handleToggleModule}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}