window.plugins.register({
    id: 'word_counter',
    name: 'Счетчик слов и знаков',
    description: 'Отображает компактную статистику объема текста в правом нижнем углу экрана',
    isCore: false,

    mount() {
        let badge = document.getElementById('wordCounterBadge');
        if (!badge) {
            badge = document.createElement('div');
            badge.id = 'wordCounterBadge';
            badge.style.cssText = 'position: fixed; bottom: 12px; right: 24px; font-size: 11px; color: var(--text-muted); pointer-events: none; z-index: 100;';
            document.body.appendChild(badge);
        }
        badge.style.display = 'block';
        this.update();
    },

    unmount() {
        const badge = document.getElementById('wordCounterBadge');
        if (badge) badge.style.display = 'none';
    },

    update() {
        const badge = document.getElementById('wordCounterBadge');
        if (!badge || !window.editor || badge.style.display === 'none') return;

        window.editor.save().then(data => {
            const text = (data.blocks || []).map(b => (b.data && b.data.text) ? b.data.text : '').join(' ');
            const cleanText = text.replace(/<[^>]*>/g, '').trim();
            const words = cleanText ? cleanText.split(/\s+/).length : 0;
            badge.innerText = `Слов: ${words} | Знаков: ${cleanText.length}`;
        }).catch(() => {});
    }
});
