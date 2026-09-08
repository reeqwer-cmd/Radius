const SettingsModal = {
    isOpen: false,
    currentTab: 'modules',

    themes: [
        { id: 'emerald_green', name: 'Emerald Green', color: '#284139', group: 'Классическая коллекция' },
        { id: 'wasabi', name: 'Wasabi', color: '#809076', group: 'Классическая коллекция' },
        { id: 'creased_khaki', name: 'Creased Khaki', color: '#F8E794', group: 'Классическая коллекция' },
        { id: 'egyptian_earth', name: 'Egyptian Earth', color: '#B86830', group: 'Классическая коллекция' },
        { id: 'noir_de_vigne', name: 'Noir de Vigne', color: '#111A19', group: 'Классическая коллекция' },
        { id: 'arsenic', name: 'Arsenic', color: '#354242', group: 'Сланцевые и пепельные' },
        { id: 'morning_blue', name: 'Morning Blue', color: '#889893', group: 'Сланцевые и пепельные' },
        { id: 'american_silver', name: 'American Silver', color: '#CFCFCD', group: 'Сланцевые и пепельные' },
        { id: 'liver_chestnut', name: 'Liver Chestnut', color: '#55453A', group: 'Сланцевые и пепельные' },
        { id: 'bistre', name: 'Bistre', color: '#362419', group: 'Сланцевые и пепельные' },
        { id: 'oil', name: 'Oil', color: '#2D1E17', group: 'Кофейные оттенки' },
        { id: 'judge_gray', name: 'Judge Gray', color: '#523F31', group: 'Кофейные оттенки' },
        { id: 'roman_coffee', name: 'Roman Coffee', color: '#796254', group: 'Кофейные оттенки' },
        { id: 'pale_oyster', name: 'Pale Oyster', color: '#9D8A7C', group: 'Кофейные оттенки' }
    ],

    open() {
        this.isOpen = true;
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) overlay.classList.add('active');
        this.switchTab(this.currentTab);
    },

    close() {
        this.isOpen = false;
        const overlay = document.getElementById('settingsOverlay');
        if (overlay) overlay.classList.remove('active');
    },

    switchTab(tabName) {
        this.currentTab = tabName;

        // Переключение подсветки сегментированных кнопок
        const tabButtons = document.querySelectorAll('.settings-tab-btn');
        tabButtons.forEach(btn => {
            const isTarget = btn.getAttribute('onclick') && btn.getAttribute('onclick').includes(tabName);
            btn.classList.toggle('active', Boolean(isTarget));
        });

        // Строгое разделение показа контейнеров
        const tabModules = document.getElementById('tabContentModules');
        const tabThemes = document.getElementById('tabContentThemes');

        if (tabModules) tabModules.classList.toggle('active', tabName === 'modules');
        if (tabThemes) tabThemes.classList.toggle('active', tabName === 'themes');

        if (tabName === 'modules') {
            this.renderModulesTab();
        } else if (tabName === 'themes') {
            this.renderThemesTab();
        }
    },

    renderModulesTab() {
        const list = document.getElementById('settingsModulesList');
        if (!list) return;
        list.innerHTML = '';

        const plugins = window.plugins.getAllPlugins();
        plugins.forEach(p => {
            const item = document.createElement('div');
            item.className = 'module-card';
            item.innerHTML = `
                <div class="module-info">
                    <div class="module-header-line">
                        <span class="module-name">${p.name}</span>
                        <span class="module-badge ${p.isCore ? 'core' : 'optional'}">
                            ${p.isCore ? 'Обязательный' : 'Дополнительный'}
                        </span>
                    </div>
                    <div class="module-desc">${p.description}</div>
                </div>
                <div class="module-action">
                    ${p.isCore 
                        ? '<span style="font-size: 11px; opacity: 0.5; letter-spacing: 0.3px;">Всегда активен</span>' 
                        : `
                            <label class="switch">
                                <input type="checkbox" ${p.enabled ? 'checked' : ''} onchange="window.plugins.setEnabled('${p.id}', this.checked)">
                                <span class="slider"></span>
                            </label>
                          `
                    }
                </div>
            `;
            list.appendChild(item);
        });
    },

    async renderThemesTab() {
        const grid = document.getElementById('settingsThemesList');
        if (!grid) return;
        grid.innerHTML = '';

        const currentTheme = await pywebview.api.get_theme();

        this.themes.forEach(t => {
            const card = document.createElement('div');
            card.className = `theme-card ${t.id === currentTheme ? 'selected' : ''}`;
            card.onclick = async () => {
                applyTheme(t.id);
                await pywebview.api.set_theme(t.id);
                this.renderThemesTab();
            };

            card.innerHTML = `
                <div class="theme-color-preview" style="background-color: ${t.color};"></div>
                <div class="theme-card-info">
                    <div class="theme-card-name">${t.name}</div>
                    <div class="theme-card-group">${t.group}</div>
                </div>
            `;
            grid.appendChild(card);
        });
    }
};

window.SettingsModal = SettingsModal;