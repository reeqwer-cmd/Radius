import React, { useState } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  currentTheme: string;
  onSelectTheme: (themeId: string) => void;
  onClose: () => void;
}

const THEMES = [
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
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentTheme,
  onSelectTheme,
  onClose
}) => {
  const [tab, setTab] = useState<'modules' | 'themes'>('themes');

  if (!isOpen) return null;

  return (
    <div id="settingsOverlay" className="active" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="settings-window">
        <div className="settings-header">
          <span className="settings-window-title">Настройки</span>
          <button className="settings-close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="settings-layout">
          <div className="settings-sidebar">
            <button className={`settings-tab-btn ${tab === 'modules' ? 'active' : ''}`} onClick={() => setTab('modules')}>Модули</button>
            <button className={`settings-tab-btn ${tab === 'themes' ? 'active' : ''}`} onClick={() => setTab('themes')}>Темы оформления</button>
          </div>
          <div className="settings-body">
            {tab === 'modules' ? (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">Управление модулями</div>
                <div className="module-card">
                  <div className="module-info">
                    <div className="module-header-line">
                      <span className="module-name">Блочный редактор Editor.js</span>
                      <span className="module-badge core">Обязательный</span>
                    </div>
                    <div className="module-desc">Обязательное ядро редактирования текстовых блоков и заметок</div>
                  </div>
                  <div className="module-action">
                    <span style={{ fontSize: '11px', opacity: 0.5 }}>Всегда активен</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">Выберите цветовую палитру</div>
                <div className="themes-grid">
                  {THEMES.map(t => (
                    <div
                      key={t.id}
                      className={`theme-card ${t.id === currentTheme ? 'selected' : ''}`}
                      onClick={() => onSelectTheme(t.id)}
                    >
                      <div className="theme-color-preview" style={{ backgroundColor: t.color }} />
                      <div className="theme-card-info">
                        <div className="theme-card-name">{t.name}</div>
                        <div className="theme-card-group">{t.group}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};