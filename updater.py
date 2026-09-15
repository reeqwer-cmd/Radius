import os
import sys
import json
import urllib.request
import tempfile
import subprocess

APP_VERSION = "1.0.2"
GITHUB_REPO = "reeqwer-cmd/Radius"
GITHUB_TOKEN = "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"

def get_executable_path():
    """Возвращает путь к реальному .exe файлу (даже при запуске через PyInstaller)."""
    if getattr(sys, 'frozen', False):
        return sys.executable
    return os.path.abspath(sys.argv[0])

def check_for_updates():
    """Проверяет наличие новых релизов на GitHub через Fine-grained токен."""
    url = f"https://api.github.com/repos/{GITHUB_REPO}/releases/latest"
    headers = {
        "User-Agent": "Radius-App",
        "Accept": "application/vnd.github.v3+json",
        "Authorization": f"Bearer {GITHUB_TOKEN}"
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as resp:
            if resp.status != 200:
                return {"has_update": False, "current_version": APP_VERSION}
            data = json.loads(resp.read().decode('utf-8'))

        tag_name = data.get("tag_name", "").lstrip("v").strip()
        if not tag_name:
            return {"has_update": False, "current_version": APP_VERSION}

        # Сравниваем версии числами (например, 1.0.1 > 1.0.0)
        curr_parts = [int(p) for p in APP_VERSION.split(".") if p.isdigit()]
        remote_parts = [int(p) for p in tag_name.split(".") if p.isdigit()]

        if remote_parts > curr_parts:
            download_url = None
            for asset in data.get("assets", []):
                if asset.get("name", "").lower().endswith(".exe"):
                    # Для приватных репозиториев используем прямой asset API URL
                    download_url = asset.get("url")
                    break

            return {
                "has_update": True,
                "version": tag_name,
                "current_version": APP_VERSION,
                "changelog": data.get("body", "Улучшения и исправления ошибок."),
                "download_url": download_url
            }
        return {"has_update": False, "current_version": APP_VERSION}
    except Exception as e:
        return {"has_update": False, "error": str(e), "current_version": APP_VERSION}

def download_and_install_update(asset_api_url):
    """Скачивает бинарник из приватного релиза и выполняет горячую замену exe."""
    if not asset_api_url:
        return {"status": "error", "message": "Файл обновления не найден в релизе"}

    target_exe = get_executable_path()
    if not getattr(sys, 'frozen', False):
        return {"status": "error", "message": "Автообновление доступно только при запуске скомпилированного .exe"}

    temp_dir = tempfile.gettempdir()
    new_exe_path = os.path.join(temp_dir, "Radius_latest.exe")

    # Для выгрузки бинарника из приватного API нужен заголовок application/octet-stream
    req = urllib.request.Request(
        asset_api_url,
        headers={
            "User-Agent": "Radius-App",
            "Accept": "application/octet-stream",
            "Authorization": f"Bearer {GITHUB_TOKEN}"
        }
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

    pid = os.getpid()
    bat_path = os.path.join(temp_dir, "radius_patcher.bat")
    bat_script = f"""@echo off
chcp 65001 > nul
:wait_loop
tasklist /fi "PID eq {pid}" | findstr /i "{pid}" > nul
if not errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto wait_loop
)

move /y "{new_exe_path}" "{target_exe}" > nul
start "" "{target_exe}"
del "%~f0"
exit
"""
    with open(bat_path, "w", encoding="utf-8") as f:
        f.write(bat_script)

    subprocess.Popen(
        ["cmd.exe", "/c", bat_path],
        creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0,
        close_fds=True
    )
    sys.exit(0)
