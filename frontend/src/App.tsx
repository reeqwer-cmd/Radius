import { useEffect, useState, useRef } from 'react';
import { usePyWebView } from './hooks/usePyWebView';
import { Sidebar } from './components/Sidebar';
import { EditorView } from './components/EditorView';
import { FlipchartView } from './components/FlipchartView';
import { SettingsModal } from './components/SettingsModal';
import { WorkspaceTree, LoadedDocument, DocType, UpdateInfo, WorkspaceItem, TreeOrderItem } from './types/api';

export default function App() {
  const { isReady, api } = usePyWebView();

  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('Загрузка...');
  const [allWorkspaces, setAllWorkspaces] = useState<WorkspaceItem[]>([]);
  const [tree, setTree] = useState<WorkspaceTree>({ folders: [], documents: [] });
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<LoadedDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [theme, setTheme] = useState<string>('emerald_green');
  const [font, setFont] = useState<string>('Inter');
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
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      const savedFont = await api.get_font();
      setFont(savedFont || 'Inter');
      document.documentElement.style.setProperty('--app-font', savedFont || 'Inter');

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

    if (treeData.documents.length > 0) {
      const currentStillExists = treeData.documents.some(d => d.id === currentDocId);
      if (!currentStillExists) {
        loadDoc(treeData.documents[0].id);
      }
    } else {
      setCurrentDocId(null);
      setCurrentDoc(null);
    }
  };

  const handleSelectWorkspace = async (newWsId: number) => {
    if (!api || newWsId === workspaceId) return;
    await api.set_active_workspace(newWsId);
    const target = allWorkspaces.find(w => w.id === newWsId);
    setWorkspaceId(newWsId);
    setWorkspaceName(target ? target.name : 'Пространство');
    await refreshTree(newWsId);
  };

  const loadDoc = async (id: number) => {
    if (!api) return;
    const data = await api.load_document(id);
    if (data) {
      setCurrentDocId(id);
      setCurrentDoc(data);
      setDocTitle(data.title);
      setStatus(data.type === 'flipchart' ? 'Флипчарт готов' : 'Готов');
    }
  };

  const triggerAutoSave = (updatedContent?: any, newTitle?: string) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    setStatus('Изменения...');

    saveTimerRef.current = setTimeout(async () => {
      if (!api || !currentDocId) return;
      const titleToSave = (newTitle !== undefined ? newTitle : docTitle).trim() || 'Без названия';
      const contentToSave = updatedContent !== undefined ? updatedContent : currentDoc?.content;

      const res = await api.save_document(currentDocId, titleToSave, contentToSave);
      if (res && res.status === 'ok') {
        setStatus(`Сохранено (${res.time?.split(' ')[1]})`);
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

  const handleApplyFont = async (fontName: string) => {
    setFont(fontName);
    document.documentElement.style.setProperty('--app-font', fontName);
    if (api) await api.set_font(fontName);
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
    if (!confirm('Вы уверены, что хотите удалить это рабочее пространство со всеми документами?')) return;
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
    if (res.status === 'ok') {
      alert('Рабочее пространство успешно сохранено на диск!');
    } else if (res.status === 'error') {
      alert('Ошибка при сохранении: ' + res.message);
    }
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
      if (res.initial_doc_id) {
        await loadDoc(res.initial_doc_id);
      }
      alert('Рабочее пространство загружено и установлено как активное!');
    } else if (res.status === 'error') {
      alert('Ошибка загрузки файла: ' + res.message);
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
            <p>Для начала работы создайте первое рабочее пространство.</p>
            <input
              type="text"
              value={initialWsName}
              onChange={e => setInitialWsName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreateWorkspace(); }}
            />
            <button className="btn-save" style={{ width: '100%', padding: '10px' }} onClick={() => handleCreateWorkspace()}>
              Создать рабочее пространство
            </button>
          </div>
        </div>
      )}

      <Sidebar
        tree={tree}
        workspaceName={workspaceName}
        allWorkspaces={allWorkspaces}
        currentWsId={workspaceId}
        currentDocId={currentDocId}
        onSelectDoc={loadDoc}
        onSelectWorkspace={handleSelectWorkspace}
        onCreateWorkspacePrompt={() => {
          const name = prompt('Название нового рабочего пространства:');
          if (name && name.trim()) handleCreateWorkspace(name.trim());
        }}
        onDeleteWorkspacePrompt={handleDeleteWorkspace}
        onCreateFolder={async name => {
          if (!api || !workspaceId) return;
          await api.create_folder(workspaceId, name);
          refreshTree(workspaceId);
        }}
        onCreateDoc={async (title, folderId, type: DocType) => {
          if (!api || !workspaceId) return;
          const newId = await api.create_document(workspaceId, title, folderId, type);
          await refreshTree(workspaceId);
          await loadDoc(newId);
        }}
        onRenameWorkspace={async name => {
          if (!api || !workspaceId) return;
          const updated = await api.rename_workspace(workspaceId, name);
          setWorkspaceName(updated);
          const wsList = await api.get_all_workspaces();
          setAllWorkspaces(wsList);
        }}
        onRenameFolder={async (id, name) => {
          if (!api || !workspaceId) return;
          await api.rename_folder(id, name);
          refreshTree(workspaceId);
        }}
        onDeleteFolder={async id => {
          if (!api || !workspaceId) return;
          await api.delete_folder(id);
          refreshTree(workspaceId);
        }}
        onDeleteDoc={async id => {
          if (!api || !workspaceId) return;
          await api.delete_document(id);
          if (currentDocId === id) {
            setCurrentDocId(null);
            setCurrentDoc(null);
          }
          refreshTree(workspaceId);
        }}
        onReorderTree={handleReorderTree}
        onExportWorkspace={handleExportWorkspace}
        onImportWorkspace={handleImportWorkspace}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

      <div
        id="main-content"
        style={{
          flex: 1,
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          padding: currentDoc?.type === 'flipchart' ? '14px 20px 14px' : '24px 48px 40px',
          overflow: 'hidden',
          boxSizing: 'border-box'
        }}
      >
        <div className="top-nav" style={{ marginBottom: currentDoc?.type === 'flipchart' ? '10px' : '20px' }}>
          <div className="title-input-wrap">
            <input
              type="text"
              className="doc-title-input"
              placeholder="Название документа"
              value={docTitle}
              onChange={e => {
                setDocTitle(e.target.value);
                triggerAutoSave(undefined, e.target.value);
              }}
            />
          </div>
          <div className="top-nav-actions">
            <span id="status" className="status-badge">{status}</span>
            <button className="btn-save" onClick={() => triggerAutoSave()}>Сохранить</button>
          </div>
        </div>

        <div style={{ flex: 1, position: 'relative', overflow: currentDoc?.type === 'flipchart' ? 'hidden' : 'auto', minHeight: 0 }}>
          {currentDoc && currentDoc.type === 'document' && (
            <EditorView
              key={currentDocId}
              data={currentDoc.content}
              onChange={updated => triggerAutoSave(updated)}
            />
          )}

          {currentDoc && currentDoc.type === 'flipchart' && (
            <FlipchartView
              key={currentDocId}
              data={currentDoc.content}
              api={api}
              onOpenDocument={loadDoc}
              onChange={updated => triggerAutoSave(updated)}
            />
          )}
        </div>
      </div>

      <SettingsModal
        isOpen={isSettingsOpen}
        currentTheme={theme}
        currentFont={font}
        api={api}
        onSelectTheme={handleApplyTheme}
        onSelectFont={handleApplyFont}
        onClose={() => setIsSettingsOpen(false)}
      />

      {updateModal.isOpen && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div style={{
            background: 'var(--bg-main)', border: '1px solid var(--border-color)',
            borderRadius: 12, padding: 24, width: 440, maxWidth: '90%',
            boxShadow: '0 12px 36px rgba(0,0,0,0.5)', color: 'var(--text-main)'
          }}>
            <h3 style={{ margin: '0 0 8px 0', fontSize: 18 }}>
              Доступно обновление Радиан v{updateModal.info?.version}
            </h3>
            <p style={{ fontSize: 12, opacity: 0.7, margin: '0 0 16px 0' }}>
              Текущая версия: v{updateModal.info?.current_version}
            </p>

            <div style={{
              background: 'rgba(255,255,255,0.04)', padding: 12, borderRadius: 6,
              fontSize: 13, maxHeight: 150, overflowY: 'auto', marginBottom: 20, whiteSpace: 'pre-wrap'
            }}>
              {updateModal.info?.changelog}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              {!updateModal.isUpdating && (
                <button
                  className="action-btn"
                  style={{ padding: '8px 16px', borderRadius: 6 }}
                  onClick={() => setUpdateModal({ ...updateModal, isOpen: false })}
                >
                  Позже
                </button>
              )}
              <button
                className="btn-save"
                disabled={updateModal.isUpdating}
                style={{ padding: '8px 20px', borderRadius: 6 }}
                onClick={async () => {
                  setUpdateModal(prev => ({ ...prev, isUpdating: true }));
                  if (api && updateModal.info?.download_url) {
                    const res = await api.start_auto_update(updateModal.info.download_url);
                    if (res && res.status === 'error') {
                      alert(res.message);
                      setUpdateModal(prev => ({ ...prev, isUpdating: false }));
                    }
                  }
                }}
              >
                {updateModal.isUpdating ? 'Обновление и перезапуск...' : 'Обновить сейчас'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}