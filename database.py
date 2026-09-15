import sqlite3

DB_NAME = "database.db"

def get_db_connection():
    conn = sqlite3.connect(DB_NAME, timeout=10.0)
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def init_db():
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspaces (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS folders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS documents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL DEFAULT 1,
            folder_id INTEGER DEFAULT NULL,
            title TEXT NOT NULL,
            content TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'document',
            sort_order INTEGER NOT NULL DEFAULT 0,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
            FOREIGN KEY(folder_id) REFERENCES folders(id) ON DELETE SET NULL
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS calendar_notes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            content TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            UNIQUE(workspace_id, date),
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )
    """)

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workspace_kanban (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workspace_id INTEGER NOT NULL UNIQUE,
            content TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("PRAGMA table_info(documents)")
    existing_columns = [row[1] for row in cursor.fetchall()]
    
    if "workspace_id" not in existing_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN workspace_id INTEGER NOT NULL DEFAULT 1")
    if "folder_id" not in existing_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN folder_id INTEGER DEFAULT NULL")
    if "sort_order" not in existing_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0")
    if "type" not in existing_columns:
        cursor.execute("ALTER TABLE documents ADD COLUMN type TEXT NOT NULL DEFAULT 'document'")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)
    cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('theme', 'emerald_green')")

    default_modules = [
        ("module_word_counter", "1"),
        ("module_flipchart", "1"),
        ("module_calendar", "1"),
        ("module_kanban", "1"),
    ]
    for key, val in default_modules:
        cursor.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))

    conn.commit()
    conn.close()