import os

def update_file(path, old_str, new_str):
    if not os.path.exists(path):
        print(f"  [!] Файл не найден: {path}")
        return
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    if old_str in content:
        new_content = content.replace(old_str, new_str)
        with open(path, "w", encoding="utf-8") as f:
            f.write(new_content)
        print(f"  [+] Обновлено в: {path}")
    else:
        print(f"  [-] Строка не найдена в: {path}")

def main():
    print("=== Переименование проекта в 'Радиан' ===")

    # 1. Main.py
    update_file("Main.py", "Юнивектор — Рабочее пространство", "Радиан — Рабочее пространство")

    # 2. web/index.html
    update_file("web/index.html", "Юнивектор — Рабочее пространство", "Радиан — Рабочее пространство")
    update_file("web/index.html", "Добро пожаловать в Юнивектор", "Добро пожаловать в Радиан")
    update_file("web/index.html", "Юнивектор", "Радиан")

    # 3. api.py (если есть дефолтные упоминания или в комментариях)
    update_file("api.py", "Юнивектор", "Радиан")

    print("\n[OK] Все упоминания успешно заменены на 'Радиан'.")

if __name__ == "__main__":
    main()