import json
import os
from datetime import datetime
from database import get_db_connection
import webview


class Api:
    def get_theme(self):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT value FROM settings WHERE key = 'theme'")
            row = cursor.fetchone()
            return row[0] if row else "emerald_green"
        finally:
            conn.close()

    def set_theme(self, theme_name):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("INSERT OR REPLACE INTO settings (key, value) VALUES ('theme', ?)", (theme_name,))
            return True
        finally:
            conn.close()

    # --- УПРАВЛЕНИЕ МОДУЛЯМИ ---
    def get_modules_state(self):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM settings WHERE key LIKE 'module_%'")
            rows = cursor.fetchall()
            return {r[0]: bool(int(r[1])) for r in rows}
        finally:
            conn.close()

    def toggle_module(self, module_key, enabled):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute(
                    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
                    (module_key, "1" if enabled else "0")
                )
            return True
        finally:
            conn.close()

    # --- РАБОЧИЕ ПРОСТРАНСТВА ---
    def get_initial_state(self):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT id, name FROM workspaces ORDER BY id ASC LIMIT 1")
            workspace = cursor.fetchone()
            if not workspace:
                return {"has_workspace": False}
            return {
                "has_workspace": True,
                "workspace_id": workspace[0],
                "workspace_name": workspace[1]
            }
        finally:
            conn.close()

    def create_workspace(self, name):
        name = name.strip() or "Основное пространство"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", (name, now))
                ws_id = cursor.lastrowid
                
                default_content = {
                    "blocks": [
                        {"type": "header", "data": {"text": "Начало работы", "level": 2}},
                        {"type": "paragraph", "data": {"text": "Это ваш первый документ в созданном рабочем пространстве."}}
                    ]
                }
                
                cursor.execute(
                    "INSERT INTO documents (workspace_id, folder_id, title, content, type, sort_order, updated_at) "
                    "VALUES (?, NULL, ?, ?, 'document', 0, ?)",
                    (ws_id, "Главная страница", json.dumps(default_content, ensure_ascii=False), now)
                )
                doc_id = cursor.lastrowid
            return {"workspace_id": ws_id, "workspace_name": name, "initial_doc_id": doc_id}
        finally:
            conn.close()

    def rename_workspace(self, ws_id, new_name):
        new_name = new_name.strip() or "Рабочее пространство"
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE workspaces SET name = ? WHERE id = ?", (new_name, ws_id))
            return new_name
        finally:
            conn.close()

    # --- ЭКСПОРТ И ИМПОРТ РАБОЧИХ ПРОСТРАНСТВ НА ДИСК ---
    def export_workspace(self, ws_id):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT name FROM workspaces WHERE id = ?", (ws_id,))
            ws_row = cursor.fetchone()
            if not ws_row:
                return {"status": "error", "message": "Пространство не найдено"}
            ws_name = ws_row[0]

            cursor.execute("SELECT id, name, sort_order FROM folders WHERE workspace_id = ? ORDER BY sort_order ASC, id ASC", (ws_id,))
            folders = [{"id": r[0], "name": r[1], "sort_order": r[2]} for r in cursor.fetchall()]

            cursor.execute(
                "SELECT folder_id, title, content, type, sort_order FROM documents WHERE workspace_id = ? ORDER BY sort_order ASC, id ASC",
                (ws_id,)
            )
            documents = []
            for r in cursor.fetchall():
                try:
                    c = json.loads(r[2]) if r[2] else {}
                except Exception:
                    c = {}
                documents.append({
                    "folder_id": r[0],
                    "title": r[1],
                    "content": c,
                    "type": r[3],
                    "sort_order": r[4]
                })

            export_data = {
                "format": "radian_workspace",
                "version": 1,
                "exported_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "workspace": {"name": ws_name},
                "folders": folders,
                "documents": documents
            }

            safe_name = "".join(c for c in ws_name if c.isalnum() or c in (' ', '_', '-')).strip()
            save_path = webview.windows[0].create_file_dialog(
                webview.SAVE_DIALOG,
                save_filename=f"{safe_name or 'workspace'}.radian",
                file_types=('Radian Files (*.radian)', 'JSON Files (*.json)', 'All Files (*.*)')
            )

            if not save_path:
                return {"status": "cancelled"}

            target_path = save_path if isinstance(save_path, str) else save_path[0]
            with open(target_path, 'w', encoding='utf-8') as f:
                json.dump(export_data, f, ensure_ascii=False, indent=2)

            return {"status": "ok", "path": target_path}
        except Exception as e:
            return {"status": "error", "message": str(e)}
        finally:
            conn.close()

    def import_workspace(self):
        try:
            file_types = ('Radian Files (*.radian;*.json)', 'All Files (*.*)')
            chosen_files = webview.windows[0].create_file_dialog(
                webview.OPEN_DIALOG,
                allow_multiple=False,
                file_types=file_types
            )

            if not chosen_files:
                return {"status": "cancelled"}

            file_path = chosen_files[0]
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)

            if not isinstance(data, dict) or "folders" not in data or "documents" not in data:
                return {"status": "error", "message": "Неверный формат файла рабочего пространства"}

            ws_title = data.get("workspace", {}).get("name", "Импортированное пространство")
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            conn = get_db_connection()
            try:
                with conn:
                    cursor = conn.cursor()
                    cursor.execute("INSERT INTO workspaces (name, created_at) VALUES (?, ?)", (ws_title, now))
                    new_ws_id = cursor.lastrowid

                    old_to_new_folder_id = {}
                    for f in data.get("folders", []):
                        cursor.execute(
                            "INSERT INTO folders (workspace_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)",
                            (new_ws_id, f.get("name", "Папка"), f.get("sort_order", 0), now)
                        )
                        old_to_new_folder_id[f.get("id")] = cursor.lastrowid

                    initial_doc_id = None
                    for doc in data.get("documents", []):
                        old_folder_id = doc.get("folder_id")
                        new_folder_id = old_to_new_folder_id.get(old_folder_id) if old_folder_id else None
                        content_str = json.dumps(doc.get("content", {}), ensure_ascii=False)

                        cursor.execute(
                            "INSERT INTO documents (workspace_id, folder_id, title, content, type, sort_order, updated_at) "
                            "VALUES (?, ?, ?, ?, ?, ?, ?)",
                            (
                                new_ws_id,
                                new_folder_id,
                                doc.get("title", "Без названия"),
                                content_str,
                                doc.get("type", "document"),
                                doc.get("sort_order", 0),
                                now
                            )
                        )
                        if initial_doc_id is None:
                            initial_doc_id = cursor.lastrowid

                    return {
                        "status": "ok",
                        "workspace_id": new_ws_id,
                        "workspace_name": ws_title,
                        "initial_doc_id": initial_doc_id
                    }
            finally:
                conn.close()

        except Exception as e:
            return {"status": "error", "message": str(e)}

    # --- ПАПКИ И ДОКУМЕНТЫ / ФЛИПЧАРТЫ ---
    def get_workspace_tree(self, ws_id):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT id, name, sort_order FROM folders WHERE workspace_id = ? ORDER BY sort_order ASC, id ASC",
                (ws_id,)
            )
            folders = [{"id": r[0], "name": r[1], "sort_order": r[2]} for r in cursor.fetchall()]

            cursor.execute(
                "SELECT id, folder_id, title, sort_order, COALESCE(type, 'document') "
                "FROM documents WHERE workspace_id = ? ORDER BY sort_order ASC, id ASC",
                (ws_id,)
            )
            docs = [
                {
                    "id": r[0],
                    "folder_id": r[1],
                    "title": r[2],
                    "sort_order": r[3],
                    "type": r[4]
                }
                for r in cursor.fetchall()
            ]

            return {"folders": folders, "documents": docs}
        finally:
            conn.close()

    def create_folder(self, ws_id, name):
        name = name.strip() or "Новая папка"
        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM folders WHERE workspace_id = ?", (ws_id,))
                next_order = cursor.fetchone()[0]
                cursor.execute(
                    "INSERT INTO folders (workspace_id, name, sort_order, created_at) VALUES (?, ?, ?, ?)",
                    (ws_id, name, next_order, now)
                )
                new_id = cursor.lastrowid
            return new_id
        finally:
            conn.close()

    def rename_folder(self, folder_id, new_name):
        new_name = new_name.strip() or "Папка"
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE folders SET name = ? WHERE id = ?", (new_name, folder_id))
            return new_name
        finally:
            conn.close()

    def delete_folder(self, folder_id):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE documents SET folder_id = NULL WHERE folder_id = ?", (folder_id,))
                cursor.execute("DELETE FROM folders WHERE id = ?", (folder_id,))
            return True
        finally:
            conn.close()

    def update_folders_order(self, ws_id, ordered_folder_ids):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                for index, folder_id in enumerate(ordered_folder_ids):
                    cursor.execute(
                        "UPDATE folders SET sort_order = ? WHERE id = ? AND workspace_id = ?",
                        (index, folder_id, ws_id)
                    )
            return True
        finally:
            conn.close()

    def create_document(self, ws_id, title, folder_id=None, doc_type="document"):
        title = title.strip() or ("Новый флипчарт" if doc_type == "flipchart" else "Новый документ")
        
        if doc_type == "flipchart":
            initial_content = {
                "viewport": {"x": 0, "y": 0, "zoom": 1.0},
                "elements": [],
                "connections": [],
                "drawings": []
            }
        else:
            initial_content = {
                "blocks": [
                    {"type": "header", "data": {"text": title, "level": 2}},
                    {"type": "paragraph", "data": {"text": ""}}
                ]
            }

        now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute(
                    "SELECT COALESCE(MAX(sort_order), -1) + 1 FROM documents "
                    "WHERE workspace_id = ? AND (folder_id IS ? OR folder_id = ?)",
                    (ws_id, folder_id, folder_id)
                )
                next_order = cursor.fetchone()[0]
                
                cursor.execute(
                    "INSERT INTO documents (workspace_id, folder_id, title, content, type, sort_order, updated_at) "
                    "VALUES (?, ?, ?, ?, ?, ?, ?)",
                    (ws_id, folder_id, title, json.dumps(initial_content, ensure_ascii=False), doc_type, next_order, now)
                )
                new_id = cursor.lastrowid
            return new_id
        finally:
            conn.close()

    def create_flipchart(self, ws_id, title="Новый флипчарт", folder_id=None):
        return self.create_document(ws_id, title, folder_id=folder_id, doc_type="flipchart")

    def load_document(self, doc_id):
        conn = get_db_connection()
        try:
            cursor = conn.cursor()
            cursor.execute("SELECT title, content, COALESCE(type, 'document') FROM documents WHERE id = ?", (doc_id,))
            row = cursor.fetchone()
            if row:
                try:
                    content_data = json.loads(row[1]) if row[1] else {}
                except Exception:
                    content_data = {}
                return {
                    "title": row[0],
                    "content": content_data,
                    "type": row[2]
                }
            return None
        finally:
            conn.close()

    def save_document(self, doc_id, title, data):
        try:
            title = title.strip() or "Без названия"
            json_str = json.dumps(data, ensure_ascii=False)
            now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            conn = get_db_connection()
            try:
                with conn:
                    cursor = conn.cursor()
                    cursor.execute(
                        "UPDATE documents SET title = ?, content = ?, updated_at = ? WHERE id = ?",
                        (title, json_str, now, doc_id)
                    )
                return {"status": "ok", "time": now}
            finally:
                conn.close()
        except Exception as e:
            return {"status": "error", "message": str(e)}

    def move_document_to_folder(self, doc_id, folder_id):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("UPDATE documents SET folder_id = ? WHERE id = ?", (folder_id, doc_id))
            return True
        finally:
            conn.close()

    def update_documents_order(self, ws_id, ordered_items):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                for index, item in enumerate(ordered_items):
                    cursor.execute(
                        "UPDATE documents SET sort_order = ?, folder_id = ? WHERE id = ? AND workspace_id = ?",
                        (index, item.get("folder_id"), item.get("id"), ws_id)
                    )
            return True
        finally:
            conn.close()

    def delete_document(self, doc_id):
        conn = get_db_connection()
        try:
            with conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM documents WHERE id = ?", (doc_id,))
            return True
        finally:
            conn.close()