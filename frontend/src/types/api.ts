export type DocType = 'document' | 'flipchart' | 'kanban';

export interface FolderItem {
  id: number;
  name: string;
  sort_order: number;
}

export interface DocItem {
  id: number;
  folder_id: number | null;
  title: string;
  sort_order: number;
  type: DocType;
}

export interface WorkspaceItem {
  id: number;
  name: string;
}

export interface WorkspaceTree {
  folders: FolderItem[];
  documents: DocItem[];
}

export interface InitialState {
  has_workspace: boolean;
  workspace_id?: number;
  workspace_name?: string;
}

export interface CreateWorkspaceResponse {
  workspace_id: number;
  workspace_name: string;
  initial_doc_id: number;
}

export interface SaveDocResponse {
  status: 'ok' | 'error';
  time?: string;
  message?: string;
}

export interface LoadedDocument {
  title: string;
  content: any;
  type: DocType;
}

export interface UpdateInfo {
  has_update: boolean;
  version?: string;
  current_version?: string;
  changelog?: string;
  download_url?: string;
  error?: string;
}

export interface TreeOrderItem {
  type: 'folder' | 'doc';
  id: number;
  folder_id?: number | null;
  sort_order: number;
}

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  priority?: 'low' | 'medium' | 'high' | 'urgent';
}

export interface KanbanColumn {
  id: string;
  title: string;
  cards: KanbanCard[];
}

export interface KanbanBoardData {
  columns: KanbanColumn[];
}

export interface PyWebViewAPI {
  get_theme(): Promise<string>;
  set_theme(themeName: string): Promise<boolean>;
  get_font(): Promise<string>;
  set_font(fontName: string): Promise<boolean>;
  get_modules_state(): Promise<Record<string, boolean>>;
  toggle_module(moduleKey: string, enabled: boolean): Promise<boolean>;
  check_update(): Promise<UpdateInfo>;
  start_auto_update(downloadUrl: string): Promise<{ status: string; message?: string }>;
  get_initial_state(): Promise<InitialState>;
  set_active_workspace(wsId: number): Promise<boolean>;
  get_all_workspaces(): Promise<WorkspaceItem[]>;
  create_workspace(name: string): Promise<CreateWorkspaceResponse>;
  rename_workspace(wsId: number, newName: string): Promise<string>;
  delete_workspace(wsId: number): Promise<boolean>;
  export_workspace(wsId: number): Promise<{ status: string; path?: string; message?: string }>;
  import_workspace(): Promise<{ status: string; workspace_id?: number; workspace_name?: string; initial_doc_id?: number; message?: string }>;
  get_workspace_tree(wsId: number): Promise<WorkspaceTree>;
  create_folder(wsId: number, name: string): Promise<number>;
  rename_folder(folderId: number, newName: string): Promise<string>;
  delete_folder(folderId: number): Promise<boolean>;
  create_document(wsId: number, title: string, folderId?: number | null, docType?: DocType): Promise<number>;
  create_flipchart(wsId: number, title?: string, folderId?: number | null): Promise<number>;
  create_kanban(wsId: number, title?: string, folderId?: number | null): Promise<number>;
  load_document(docId: number): Promise<LoadedDocument | null>;
  save_document(docId: number, title: string, data: any): Promise<SaveDocResponse>;
  reorder_tree_items(wsId: number, items: TreeOrderItem[]): Promise<boolean>;
  delete_document(docId: number): Promise<boolean>;
  get_calendar_note(wsId: number, dateStr: string): Promise<any>;
  save_calendar_note(wsId: number, dateStr: string, content: any): Promise<SaveDocResponse>;
  get_calendar_notes_month(wsId: number, yearMonth: string): Promise<Record<string, boolean>>;
  get_workspace_kanban(wsId: number): Promise<KanbanBoardData>;
  save_workspace_kanban(wsId: number, data: KanbanBoardData): Promise<SaveDocResponse>;
}

declare global {
  interface Window {
    pywebview?: {
      api: PyWebViewAPI;
    };
  }
}