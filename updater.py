import os
import sys
import json
import urllib.request
import tempfile
import subprocess
import time

APP_VERSION = "1.0.8"
GITHUB_REPO = "reeqwer-cmd/Radius"

def get_executable_path():
    """Возвращает путь к реальному запущенному .exe файлу."""
    if getattr(sys, 'frozen', False):
        return sys.executable
    return os.path.abspath(sys.argv[0])

def check_for_updates():
    """Проверяет наличие новых релизов на GitHub."""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/releases"
    headers = {
        "User-Agent": "Radius-App",
        "Accept": "application/vnd.github.v3+json"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status != 200:
                return {"has_update": False, "current_version": APP_VERSION}
            releases = json.loads(resp.read().decode('utf-8'))

        if not releases or not isinstance(releases, list):
            return {"has_update": False, "current_version": APP_VERSION}

        latest_release = next((r for r in releases if not r.get("draft", False)), None)
        if not latest_release:
            return {"has_update": False, "current_version": APP_VERSION}

        tag_name = latest_release.get("tag_name", "").lstrip("v").strip()
        if not tag_name:
            return {"has_update": False, "current_version": APP_VERSION}

        curr_parts = [int(p) for p in APP_VERSION.split(".") if p.isdigit()]
        remote_parts = [int(p) for p in tag_name.split(".") if p.isdigit()]

        if remote_parts > curr_parts:
            download_url = None
            assets = latest_release.get("assets", [])

            for asset in assets:
                name = asset.get("name", "").lower()
                if name.endswith(".exe"):
                    download_url = asset.get("browser_download_url")
                    break

            if download_url:
                return {
                    "has_update": True,
                    "version": tag_name,
                    "current_version": APP_VERSION,
                    "changelog": latest_release.get("body", "Улучшения и исправления ошибок."),
                    "download_url": download_url
                }

        return {"has_update": False, "current_version": APP_VERSION, "version": tag_name}
    except Exception as e:
        return {"has_update": False, "error": str(e), "current_version": APP_VERSION}

def download_and_install_update(download_url):
    """Скачивает новый бинарник, завершает текущий процесс и производит замену."""
    if not download_url:
        return {"status": "error", "message": "Файл обновления не найден в релизе"}

    target_exe = get_executable_path()
    if not getattr(sys, 'frozen', False):
        return {"status": "error", "message": "Автообновление доступно только при запуске скомпилированного .exe"}

    temp_dir = tempfile.gettempdir()
    new_exe_path = os.path.join(temp_dir, "Radian_update.exe")

    req = urllib.request.Request(
        download_url,
        headers={"User-Agent": "Radius-App"}
    )

    try:
        with urllib.request.urlopen(req, timeout=120) as response, open(new_exe_path, 'wb') as out_file:
            while True:
                chunk = response.read(64 * 1024)
                if not chunk:
                    break
                out_file.write(chunk)
    except Exception as e:
        return {"status": "error", "message": f"Не удалось загрузить обновление: {e}"}

    bat_path = os.path.join(temp_dir, "radian_patcher.bat")

    # Патчер без зависающих пайпов и с циклом ожидания разблокировки файла
    bat_script = f"""@echo off
chcp 65001 > nul
timeout /t 1 /nobreak > nul

:move_loop
move /y "{new_exe_path}" "{target_exe}" > nul 2>&1
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto move_loop
)

start "" "{target_exe}"
del "%~f0"
exit
"""
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_script)

    # Флаг CREATE_NO_WINDOW подавляет черное окно консоли
    creation_flags = subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0

    subprocess.Popen(
        ["cmd.exe", "/c", bat_path],
        creationflags=creation_flags,
        close_fds=True
    )

    try:
        import webview
        for win in webview.windows:
            win.destroy()
    except Exception:
        pass

    time.sleep(0.2)
    os._exit(0)