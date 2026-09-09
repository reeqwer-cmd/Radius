const ICONS = {
    folderClosed: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"/></svg>`,
    folderOpen: `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m6 14 1.45-2.9A2 2 0 0 1 9.24 10H20a2 2 0 0 1 1.94 2.5l-1.55 6a2 2 0 0 1-1.94 1.5H4a2 2 0 0 1-2-2V5c0-1.1.9-2 2-2h3.93a2 2 0 0 1 1.66.9l.82 1.2a2 2 0 0 0 1.66.9H18a2 2 0 0 1 2 2v2"/></svg>`,
    doc: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>`,
    flipchart: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="12" rx="2"/><path d="M8 21h8"/><path d="M12 15v6"/><path d="M7 8h10"/><path d="M7 11h5"/></svg>`
};

const ListPlugin = window.EditorjsList || window.List;
let editor = null;
let currentWsId = null;
let currentDocId = null;
let currentDocType = 'document';
let activeFlipchartInstance = null;
let autoSaveTimer = null;
let isEditorLoading = false;
let draggedDocId = null;

const collapsedFolders = new Set();
let inlineCreateType = 'doc';
let inlineTargetFolderId = null;

const ruI18n = {
    messages: {
        ui: {
            blockTunes: {
                toggler: { "Click to tune": "Нажмите для настройки", "or drag to move": "или перетащите" },
                "Convert to": "Преобразовать в"
            },
            inlineToolbar: { converter: { "Convert to": "Преобразовать в" } },
            toolbar: { toolbox: { "Add": "Добавить", "Filter": "Поиск блока" } },
            popover: { "Filter": "Поиск...", "Nothing found": "Ничего не найдено", "Convert to": "Преобразовать в" }
        },
        toolNames: {
            "Text": "Параграф", "Heading": "Заголовок", "List": "Список",
            "Unordered List": "Маркированный список", "Ordered List": "Нумерованный список",
            "Checklist": "Чек-лист"
        },
        tools: {
            header: { "Heading 1": "Заголовок 1", "Heading 2": "Заголовок 2", "Heading 3": "Заголовок 3" }
        },
        blockTunes: {
            delete: { "Delete": "Удалить" },
            moveUp: { "Move up": "Переместить вверх" },
            moveDown: { "Move down": "Переместить вниз" },
            "Convert to": "Преобразовать в"
        }
    }
};

window.plugins.register({
    id: 'core_editor',
    name: 'Блочный редактор Editor.js',
    description: 'Обязательное ядро редактирования текстовых блоков и заметок',
    isCore: true,
    mount() {},
    unmount() {}
});

window.plugins.register({
    id: 'core_workspaces',
    name: 'Дерево документов и папок',
    description: 'Обязательное ядро организации рабочего пространства и сортировки',
    isCore: true,
    mount() {},
    unmount() {}
});

window.addEventListener('pywebviewready', async () => {
    try {
        const savedTheme = await pywebview.api.get_theme();
        applyTheme(savedTheme);

        await window.plugins.initAll();

        const state = await pywebview.api.get_initial_state();
        if (!state || !state.has_workspace) {
            const welcome = document.getElementById('welcome-screen');
            if (welcome) welcome.style.display = 'flex';
            const wsInput = document.getElementById('initialWsInput');
            if (wsInput) wsInput.focus();
        } else {
            currentWsId = state.workspace_id;
            const wsNameEl = document.getElementById('currentWorkspaceName');
            if (wsNameEl) wsNameEl.innerText = state.workspace_name;
            await reloadTree();
        }
    } catch (err) {
        console.error("Ошибка инициализации интерфейса:", err);
    }
});

async function submitInitialWorkspace() {
    const input = document.getElementById('initialWsInput');
    const name = input ? input.value.trim() : "Основное пространство";
    const res = await pywebview.api.create_workspace(name);
    
    currentWsId = res.workspace_id;
    currentDocId = res.initial_doc_id;
    const wsNameEl = document.getElementById('currentWorkspaceName');
    if (wsNameEl) wsNameEl.innerText = res.workspace_name;
    const welcome = document.getElementById('welcome-screen');
    if (welcome) welcome.style.display = 'none';
    
    await reloadTree();
    await openDoc(res.initial_doc_id);
}

function startRenameWorkspace() {
    const container = document.getElementById('workspaceNameContainer');
    const nameSpan = document.getElementById('currentWorkspaceName');
    const currentName = nameSpan ? nameSpan.innerText : "Рабочее пространство";
    
    container.onclick = null;
    container.innerHTML = `<input type="text" id="wsRenameInput" class="workspace-edit-input" value="${currentName}">`;
    const input = document.getElementById('wsRenameInput');
    input.focus();
    input.select();

    const finish = async () => {
        const newName = input.value.trim() || currentName;
        const updated = await pywebview.api.rename_workspace(currentWsId, newName);
        container.innerHTML = `
            <span id="currentWorkspaceName" class="workspace-name">${updated}</span>
            <span class="edit-icon">✎</span>
        `;
        container.onclick = startRenameWorkspace;
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') finish();
        if (e.key === 'Escape') {
            container.innerHTML = `
                <span id="currentWorkspaceName" class="workspace-name">${currentName}</span>
                <span class="edit-icon">✎</span>
            `;
            container.onclick = startRenameWorkspace;
        }
    };
    input.onblur = finish;
}

function toggleCreateMenu(event) {
    event.stopPropagation();
    const menu = document.getElementById('createMenu');
    if (menu) menu.classList.toggle('open');
}

function handleCreateSelect(type) {
    const menu = document.getElementById('createMenu');
    if (menu) menu.classList.remove('open');
    showInlineInput(type, null);
}

function showInlineInput(type, folderId = null) {
    inlineCreateType = type;
    inlineTargetFolderId = folderId;
    const row = document.getElementById('inlineInputRow');
    const input = document.getElementById('inlineTextInput');
    if (row && input) {
        if (type === 'folder') {
            input.placeholder = 'Название папки...';
        } else if (type === 'flipchart') {
            input.placeholder = 'Название флипчарта...';
        } else {
            input.placeholder = 'Название документа...';
        }
        row.style.display = 'flex';
        input.value = '';
        input.focus();
    }
}

function hideInlineInput() {
    const row = document.getElementById('inlineInputRow');
    if (row) row.style.display = 'none';
}

function handleInlineInputKey(e) {
    if (e.key === 'Enter') confirmInlineCreate();
    if (e.key === 'Escape') hideInlineInput();
}

async function confirmInlineCreate() {
    const input = document.getElementById('inlineTextInput');
    const name = input ? input.value.trim() : "";
    hideInlineInput();
    
    if (inlineCreateType === 'folder') {
        await pywebview.api.create_folder(currentWsId, name || "Новая папка");
        await reloadTree();
    } else if (inlineCreateType === 'flipchart') {
        const newId = await pywebview.api.create_flipchart(currentWsId, name || "Новый флипчарт", inlineTargetFolderId);
        await reloadTree();
        await openDoc(newId);
    } else {
        const newId = await pywebview.api.create_document(currentWsId, name || "Новый документ", inlineTargetFolderId, "document");
        await reloadTree();
        await openDoc(newId);
    }
}

async function reloadTree() {
    if (!currentWsId) return;
    const data = await pywebview.api.get_workspace_tree(currentWsId);
    const container = document.getElementById('tree-container');
    if (!container) return;
    container.innerHTML = '';

    const folders = data.folders || [];
    const docs = data.documents || [];

    folders.forEach(folder => {
        const folderBlock = document.createElement('div');
        folderBlock.className = 'folder-block';
        folderBlock.dataset.folderId = folder.id;

        const isCollapsed = collapsedFolders.has(folder.id);
        const folderIcon = isCollapsed ? ICONS.folderClosed : ICONS.folderOpen;

        folderBlock.innerHTML = `
            <div class="folder-header" onclick="toggleFolder(${folder.id})">
                <div class="folder-title-wrap">
                    <span class="folder-toggle-icon">${isCollapsed ? '▸' : '▾'}</span>
                    <span class="folder-icon-svg">${folderIcon}</span>
                    <span class="folder-name">${folder.name}</span>
                </div>
                <div class="folder-actions" onclick="event.stopPropagation()">
                    <button class="action-btn" title="Добавить документ" onclick="showInlineInput('doc', ${folder.id})">+</button>
                    <button class="action-btn" title="Добавить флипчарт" onclick="showInlineInput('flipchart', ${folder.id})">🎨</button>
                    <button class="action-btn" title="Переименовать" onclick="startRenameFolder(event, ${folder.id}, '${folder.name.replace(/'/g, "\\'")}')">✎</button>
                    <button class="action-btn" title="Удалить папку" onclick="deleteFolder(event, ${folder.id})">×</button>
                </div>
            </div>
            <ul class="folder-docs ${isCollapsed ? 'collapsed' : ''}" data-folder-id="${folder.id}"></ul>
        `;

        const header = folderBlock.querySelector('.folder-header');
        header.addEventListener('dragover', (e) => {
            e.preventDefault();
            header.classList.add('drag-over');
        });
        header.addEventListener('dragleave', () => header.classList.remove('drag-over'));
        header.addEventListener('drop', async (e) => {
            e.preventDefault();
            header.classList.remove('drag-over');
            if (draggedDocId) {
                await pywebview.api.move_document_to_folder(draggedDocId, folder.id);
                collapsedFolders.delete(folder.id);
                await reloadTree();
            }
        });

        const folderDocsUl = folderBlock.querySelector('.folder-docs');
        const folderDocs = docs.filter(d => d.folder_id === folder.id);
        folderDocs.forEach(d => {
            folderDocsUl.appendChild(createDocElement(d, folder.id));
        });

        container.appendChild(folderBlock);
    });

    const rootDocsUl = document.createElement('ul');
    rootDocsUl.className = 'doc-list-root';
    rootDocsUl.dataset.folderId = "root";

    const rootDocs = docs.filter(d => d.folder_id === null || d.folder_id === undefined);
    rootDocs.forEach(d => {
        rootDocsUl.appendChild(createDocElement(d, null));
    });

    rootDocsUl.addEventListener('dragover', (e) => e.preventDefault());
    rootDocsUl.addEventListener('drop', async (e) => {
        if (e.target === rootDocsUl && draggedDocId) {
            e.preventDefault();
            await pywebview.api.move_document_to_folder(draggedDocId, null);
            await reloadTree();
        }
    });

    container.appendChild(rootDocsUl);

    if (!currentDocId && docs.length > 0) {
        await openDoc(docs[0].id);
    }
}

function toggleFolder(folderId) {
    if (collapsedFolders.has(folderId)) {
        collapsedFolders.delete(folderId);
    } else {
        collapsedFolders.add(folderId);
    }
    reloadTree();
}

function startRenameFolder(e, folderId, currentName) {
    e.stopPropagation();
    const newName = prompt("Введите название папки:", currentName);
    if (newName && newName.trim() && newName.trim() !== currentName) {
        pywebview.api.rename_folder(folderId, newName.trim()).then(() => reloadTree());
    }
}

async function deleteFolder(e, folderId) {
    e.stopPropagation();
    if (confirm("Удалить эту папку? Документы из нее переместятся в общий список.")) {
        await pywebview.api.delete_folder(folderId);
        await reloadTree();
    }
}

function createDocElement(doc, folderId) {
    const li = document.createElement('li');
    li.className = `doc-item ${doc.id === currentDocId ? 'active' : ''} ${doc.type === 'flipchart' ? 'doc-item-flipchart' : ''}`;
    li.setAttribute('draggable', 'true');
    li.dataset.id = doc.id;
    li.dataset.type = doc.type || 'document';
    li.dataset.folderId = folderId || "root";

    const iconSvg = doc.type === 'flipchart' ? ICONS.flipchart : ICONS.doc;

    li.innerHTML = `
        <span class="doc-drag-handle" title="Перетащить">⠿</span>
        <span class="doc-icon-svg">${iconSvg}</span>
        <span class="doc-name">${doc.title}</span>
        <div class="doc-actions">
            <button class="action-btn" title="Удалить" onclick="deleteDoc(event, ${doc.id})">×</button>
        </div>
    `;

    li.querySelector('.doc-name').addEventListener('click', () => openDoc(doc.id));

    li.addEventListener('dragstart', (e) => {
        draggedDocId = doc.id;
        li.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
    });

    li.addEventListener('dragend', () => {
        li.classList.remove('dragging');
        document.querySelectorAll('.doc-item').forEach(el => el.classList.remove('drag-over-top', 'drag-over-bottom'));
        draggedDocId = null;
    });

    li.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedDocId === doc.id) return;
        const rect = li.getBoundingClientRect();
        const midY = rect.top + rect.height / 2;
        li.classList.remove('drag-over-top', 'drag-over-bottom');
        if (e.clientY < midY) {
            li.classList.add('drag-over-top');
        } else {
            li.classList.add('drag-over-bottom');
        }
    });

    li.addEventListener('dragleave', () => {
        li.classList.remove('drag-over-top', 'drag-over-bottom');
    });

    li.addEventListener('drop', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!draggedDocId || draggedDocId === doc.id) return;

        const rect = li.getBoundingClientRect();
        const placeBefore = e.clientY < (rect.top + rect.height / 2);
        li.classList.remove('drag-over-top', 'drag-over-bottom');

        const parentUl = li.parentElement;
        const draggedLi = document.querySelector(`.doc-item[data-id="${draggedDocId}"]`);

        if (draggedLi) {
            if (placeBefore) {
                parentUl.insertBefore(draggedLi, li);
            } else {
                parentUl.insertBefore(draggedLi, li.nextSibling);
            }
        }

        const allItems = [];
        document.querySelectorAll('.doc-item').forEach(item => {
            const fId = item.parentElement.dataset.folderId;
            allItems.push({
                id: parseInt(item.dataset.id),
                folder_id: (fId === "root" || !fId) ? null : parseInt(fId)
            });
        });

        await pywebview.api.update_documents_order(currentWsId, allItems);
        await reloadTree();
    });

    return li;
}

async function openDoc(docId) {
    if (isEditorLoading) return;
    isEditorLoading = true;
    currentDocId = docId;

    try {
        clearTimeout(autoSaveTimer);

        const docData = await pywebview.api.load_document(docId);
        if (!docData) return;

        currentDocType = docData.type || 'document';

        const titleInput = document.getElementById('docTitleInput');
        if (titleInput) titleInput.value = docData.title;
        highlightActiveDoc();

        const editorContainer = document.getElementById('editorjs');
        const flipchartContainer = document.getElementById('flipchart-container');
        const mainContent = document.getElementById('main-content');

        // Очищаем предыдущий инстанс флипчарта
        if (activeFlipchartInstance && typeof activeFlipchartInstance.destroy === 'function') {
            activeFlipchartInstance.destroy();
            activeFlipchartInstance = null;
        }

        // Очищаем предыдущий инстанс EditorJS
        if (editor) {
            if (typeof editor.destroy === 'function') {
                try { await editor.destroy(); } catch (e) {}
            }
            editor = null;
        }

        if (currentDocType === 'flipchart') {
            if (editorContainer) {
                editorContainer.style.display = 'none';
                editorContainer.innerHTML = '';
            }
            if (flipchartContainer) {
                flipchartContainer.style.display = 'block';
                flipchartContainer.innerHTML = '';
            }
            if (mainContent) {
                mainContent.style.overflow = 'hidden';
                mainContent.style.padding = '16px 24px 20px';
            }

            if (window.Flipchart) {
                activeFlipchartInstance = new window.Flipchart('flipchart-container', {
                    docId: docId,
                    title: docData.title,
                    data: docData.content || {},
                    onChange: (chartData) => {
                        clearTimeout(autoSaveTimer);
                        const statusEl = document.getElementById('status');
                        if (statusEl) statusEl.innerText = 'Изменения...';
                        autoSaveTimer = setTimeout(() => {
                            saveCurrentDoc(true, chartData);
                        }, 1200);
                    }
                });
            }

            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerText = 'Флипчарт готов';
        } else {
            if (flipchartContainer) {
                flipchartContainer.style.display = 'none';
                flipchartContainer.innerHTML = '';
            }
            if (editorContainer) {
                editorContainer.style.display = 'block';
                editorContainer.innerHTML = '';
            }
            if (mainContent) {
                mainContent.style.overflowY = 'auto';
                mainContent.style.padding = '24px 48px 80px';
            }

            editor = new EditorJS({
                holder: 'editorjs',
                placeholder: 'Нажмите Tab для выбора блока или начните ввод...',
                i18n: ruI18n,
                minHeight: 50,
                tools: {
                    header: Header,
                    list: ListPlugin,
                    checklist: Checklist
                },
                data: docData.content || {},
                onChange: () => {
                    clearTimeout(autoSaveTimer);
                    const statusEl = document.getElementById('status');
                    if (statusEl) statusEl.innerText = 'Изменения...';
                    
                    const wordCounter = window.plugins.plugins.get('word_counter');
                    if (wordCounter && wordCounter.update) wordCounter.update();

                    autoSaveTimer = setTimeout(() => {
                        saveCurrentDoc(true);
                    }, 1500);
                }
            });

            const statusEl = document.getElementById('status');
            if (statusEl) statusEl.innerText = 'Готов';
            
            setTimeout(() => {
                const wordCounter = window.plugins.plugins.get('word_counter');
                if (wordCounter && wordCounter.update) wordCounter.update();
            }, 300);
        }

    } finally {
        isEditorLoading = false;
    }
}

function highlightActiveDoc() {
    document.querySelectorAll('.doc-item').forEach(item => {
        if (parseInt(item.dataset.id) === currentDocId) {
            item.classList.add('active');
        } else {
            item.classList.remove('active');
        }
    });
}

function handleTitleChange() {
    clearTimeout(autoSaveTimer);
    const statusEl = document.getElementById('status');
    if (statusEl) statusEl.innerText = 'Изменения...';
    autoSaveTimer = setTimeout(() => {
        saveCurrentDoc(true);
    }, 1000);
}

async function saveCurrentDoc(isAuto = false, explicitData = null) {
    if (!currentDocId) return;
    const statusLabel = document.getElementById('status');
    if (!isAuto && statusLabel) statusLabel.innerText = "Сохранение...";

    try {
        let outputData = explicitData;

        if (!outputData) {
            if (currentDocType === 'flipchart') {
                outputData = activeFlipchartInstance ? activeFlipchartInstance.getData() : {};
            } else if (editor) {
                outputData = await editor.save();
            }
        }

        const titleInput = document.getElementById('docTitleInput');
        const title = (titleInput && titleInput.value.trim()) ? titleInput.value.trim() : "Без названия";
        const res = await pywebview.api.save_document(currentDocId, title, outputData);
        
        if (res && res.status === 'ok') {
            if (statusLabel) statusLabel.innerText = `Сохранено (${res.time.split(' ')[1]})`;
            const activeDoc = document.querySelector(`.doc-item[data-id="${currentDocId}"] .doc-name`);
            if (activeDoc) activeDoc.innerText = title;
        }
    } catch (err) {
        if (statusLabel) statusLabel.innerText = "Ошибка сохранения";
        console.error("Ошибка при сохранении документа:", err);
    }
}

async function deleteDoc(e, docId) {
    e.stopPropagation();
    if (confirm("Удалить этот элемент?")) {
        await pywebview.api.delete_document(docId);
        if (currentDocId === docId) currentDocId = null;
        await reloadTree();
    }
}

window.addEventListener('click', () => {
    const createMenu = document.getElementById('createMenu');
    if (createMenu) createMenu.classList.remove('open');
});

function applyTheme(themeName) {
    document.documentElement.setAttribute('data-theme', themeName);
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('collapsed');
}