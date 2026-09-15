import { useEffect, useState, useRef } from 'react';
import { usePyWebView } from './hooks/usePyWebView';
import { Sidebar } from './components/Sidebar';
import { EditorView } from './components/EditorView';
import { FlipchartView } from './components/FlipchartView';
import { SettingsModal } from './components/SettingsModal';
import { WorkspaceTree, LoadedDocument, DocType } from './types/api';

export default function App() {
  const { isReady, api } = usePyWebView();

  const [workspaceId, setWorkspaceId] = useState<number | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>('Загрузка...');
  const [tree, setTree] = useState<WorkspaceTree>({ folders: [], documents: [] });
  const [currentDocId, setCurrentDocId] = useState<number | null>(null);
  const [currentDoc, setCurrentDoc] = useState<LoadedDocument | null>(null);
  const [docTitle, setDocTitle] = useState<string>('');
  const [theme, setTheme] = useState<string>('emerald_green');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [status, setStatus] = useState('Готов');

  const [showWelcome, setShowWelcome] = useState(false);
  const [initialWsName, setInitialWsName] = useState('Основное пространство');

  const saveTimerRef = useRef<any>(null);

  useEffect(() => {
    if (!isReady || !api) return;

    (async () => {
      const savedTheme = await api.get_theme();
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);

      const state = await api.get_initial_state();
      if (!state || !state.has_workspace) {
        setShowWelcome(true);
      } else {
        setWorkspaceId(state.workspace_id!);
        setWorkspaceName(state.workspace_name!);
        await refreshTree(state.workspace_id!);
      }
    })();
  }, [isReady, api]);

  const refreshTree = async (wsId: number) => {
    if (!api) return;
    const treeData = await api.get_workspace_tree(wsId);
    setTree(treeData);

    if (!currentDocId && treeData.documents.length > 0) {
      loadDoc(treeData.documents[0].id);
    }
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

  const handleCreateWorkspace = async () => {
    if (!api) return;
    const res = await api.create_workspace(initialWsName);
    setWorkspaceId(res.workspace_id);
    setWorkspaceName(res.workspace_name);
    setShowWelcome(false);
    await refreshTree(res.workspace_id);
    await loadDoc(res.initial_doc_id);
  };

  const handleExportWorkspace = async () => {
    if (!api || !workspaceId) return;
    const res = await api.export_workspace(workspaceId);
    if (res.status === 'ok') {
      alert('Рабочее пространство успешно экспортировано в файл!');
    } else if (res.status === 'error') {
      alert('Ошибка при экспорте: ' + res.message);
    }
  };

  const handleImportWorkspace = async () => {
    if (!api) return;
    const res = await api.import_workspace();
    if (res.status === 'ok' && res.workspace_id) {
      setWorkspaceId(res.workspace_id);
      setWorkspaceName(res.workspace_name || 'Импортированное пространство');
      await refreshTree(res.workspace_id);
      if (res.initial_doc_id) {
        await loadDoc(res.initial_doc_id);
      }
      alert('Рабочее пространство успешно загружено!');
    } else if (res.status === 'error') {
      alert('Ошибка загрузки файла: ' + res.message);
    }
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
            <button className="btn-save" style={{ width: '100%', padding: '10px' }} onClick={handleCreateWorkspace}>
              Создать рабочее пространство
            </button>
          </div>
        </div>
      )}

      <Sidebar
        tree={tree}
        workspaceName={workspaceName}
        currentDocId={currentDocId}
        onSelectDoc={loadDoc}
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
        onMoveDocToFolder={async (docId, folderId) => {
          if (!api || !workspaceId) return;
          await api.move_document_to_folder(docId, folderId);
          refreshTree(workspaceId);
        }}
        onReorderFolders={async folderIds => {
          if (!api || !workspaceId) return;
          await api.update_folders_order(workspaceId, folderIds);
          refreshTree(workspaceId);
        }}
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
        onSelectTheme={handleApplyTheme}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
}