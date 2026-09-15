export type DocType = 'document' | 'flipchart';

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

export interface PyWebViewAPI {
  get_theme(): Promise<string>;
  set_theme(themeName: string): Promise<boolean>;
  get_modules_state(): Promise<Record<string, boolean>>;
  toggle_module(moduleKey: string, enabled: boolean): Promise<boolean>;
  get_initial_state(): Promise<InitialState>;
  create_workspace(name: string): Promise<CreateWorkspaceResponse>;
  rename_workspace(wsId: number, newName: string): Promise<string>;
  export_workspace(wsId: number): Promise<{ status: string; path?: string; message?: string }>;
  import_workspace(): Promise<{ status: string; workspace_id?: number; workspace_name?: string; initial_doc_id?: number; message?: string }>;
  get_workspace_tree(wsId: number): Promise<WorkspaceTree>;
  create_folder(wsId: number, name: string): Promise<number>;
  rename_folder(folderId: number, newName: string): Promise<string>;
  delete_folder(folderId: number): Promise<boolean>;
  update_folders_order(wsId: number, orderedFolderIds: number[]): Promise<boolean>;
  create_document(wsId: number, title: string, folderId?: number | null, docType?: DocType): Promise<number>;
  create_flipchart(wsId: number, title?: string, folderId?: number | null): Promise<number>;
  load_document(docId: number): Promise<LoadedDocument | null>;
  save_document(docId: number, title: string, data: any): Promise<SaveDocResponse>;
  move_document_to_folder(docId: number, folderId: number | null): Promise<boolean>;
  update_documents_order(wsId: number, orderedItems: Array<{ id: number; folder_id: number | null }>): Promise<boolean>;
  delete_document(docId: number): Promise<boolean>;
}

declare global {
  interface Window {
    pywebview?: {
      api: PyWebViewAPI;
    };
  }
}