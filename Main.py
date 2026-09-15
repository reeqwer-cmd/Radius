import os
import sys

os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-logging --log-level=3 --no-sandbox"

import webview
from database import init_db
from api import Api

# Флаг переключения режима разработки:
# True  -> подключается к живому серверу Vite с Hot Reload (npm run dev)
# False -> загружает автономный скомпилированный билд из frontend/dist
DEBUG_DEV = False

if __name__ == '__main__':
    init_db()
    api = Api()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    if DEBUG_DEV:
        target_url = 'http://localhost:5173'
    else:
        dist_index = os.path.join(base_dir, 'frontend', 'dist', 'index.html')
        target_url = dist_index if os.path.exists(dist_index) else os.path.join(base_dir, 'web', 'index.html')

    window = webview.create_window(
        'Радиан — Рабочее пространство',
        url=target_url,
        js_api=api,
        width=1180,
        height=860,
        min_size=(800, 520),
        background_color='#284139'
    )
    
    webview.start(gui='qt')