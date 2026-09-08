import os
import sys

os.environ["QTWEBENGINE_CHROMIUM_FLAGS"] = "--disable-logging --log-level=3 --no-sandbox"

import webview
from database import init_db
from api import Api

if __name__ == '__main__':
    init_db()
    api = Api()
    
    base_dir = os.path.dirname(os.path.abspath(__file__))
    html_file = os.path.join(base_dir, 'web', 'index.html')

    window = webview.create_window(
        'Радиан — Рабочее пространство',
        url=html_file,
        js_api=api,
        width=1180,
        height=860,
        min_size=(800, 520),
        background_color='#284139'
    )
    
    webview.start(gui='qt')