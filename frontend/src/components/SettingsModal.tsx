import React, { useState } from 'react';
import { RefreshCw, CheckCircle, DownloadCloud, Check, Sun, Moon } from 'lucide-react';
import { PyWebViewAPI, UpdateInfo } from '../types/api';

interface SettingsModalProps {
  isOpen: boolean;
  currentTheme: string;
  currentFont: string;
  themeMode: 'light' | 'dark';
  modulesState: Record<string, boolean>;
  api: PyWebViewAPI | null;
  onSelectTheme: (themeId: string) => void;
  onSelectFont: (fontName: string) => void;
  onSelectThemeMode: (mode: 'light' | 'dark') => void;
  onToggleModule: (moduleKey: string, enabled: boolean) => void;
  onClose: () => void;
}

interface ThemeItem {
  id: string;
  name: string;
  category: string;
  color: string;
}

const THEMES: ThemeItem[] = [
  { id: 'american_silver', name: 'American Silver', category: 'Сланцевые и пепельные', color: '#CFCFCD' },
  { id: 'arsenic', name: 'Arsenic', category: 'Сланцевые и пепельные', color: '#344040' },
  { id: 'morning_blue', name: 'Morning Blue', category: 'Сланцевые и пепельные', color: '#889893' },
  { id: 'noir_de_vigne', name: 'Noir de Vigne', category: 'Классическая коллекция', color: '#111A19' },
  { id: 'judge_gray', name: 'Judge Gray', category: 'Кофейные оттенки', color: '#523F31' },
  { id: 'roman_coffee', name: 'Roman Coffee', category: 'Кофейные оттенки', color: '#796254' },
  { id: 'stone_hearth', name: 'Stone Hearth & Brandy', category: 'Природные и минеральные', color: '#DCB789' },
  { id: 'spiced_wine', name: 'Cowhide & Spiced Wine', category: 'Кофейные и винные', color: '#743014' },
  { id: 'matcha_eclipse', name: 'Matcha & Eclipse', category: 'Чайные и лесные', color: '#677D6A' },
  { id: 'inkwell_brulee', name: 'Inkwell & Crème Brûlée', category: 'Сланцевые и пепельные', color: '#A27B5B' },
  { id: 'river_amber', name: 'River Styx & Amber', category: 'Тёмные и янтарные', color: '#CA9C68' }
];

const FONTS = [
  { id: 'Inter', name: 'Inter', desc: 'Чистый современный гротеск' },
  { id: 'Fira Sans', name: 'Fira Sans', desc: 'Четкий технический гротеск' },
  { id: 'PT Sans', name: 'PT Sans', desc: 'Универсальный нейтральный шрифт' },
  { id: 'IBM Plex Serif', name: 'IBM Plex Serif', desc: 'Строгая деловая антиква' },
  { id: 'PT Serif', name: 'PT Serif', desc: 'Классическая книжная антиква' },
  { id: 'Tinos', name: 'Tinos', desc: 'Элегантная академическая антиква' },
  { id: 'Charis SIL', name: 'Charis SIL', desc: 'Печатная романская типографика' },
  { id: 'Liter', name: 'Liter', desc: 'Винтажный печатный шрифт' },
  { id: 'Playfair Display', name: 'Playfair Display', desc: 'Премиальная контрастная антиква' },
  { id: 'EB Garamond', name: 'EB Garamond', desc: 'Традиционная ренессансная антиква' },
  { id: 'Alumni Sans', name: 'Alumni Sans', desc: 'Узкий стильный современный шрифт' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentTheme,
  currentFont,
  themeMode,
  modulesState,
  api,
  onSelectTheme,
  onSelectFont,
  onSelectThemeMode,
  onToggleModule,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'themes' | 'fonts' | 'updates'>('themes');
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCheckUpdate = async () => {
    if (!api) return;
    setChecking(true);
    setStatusMessage(null);
    setUpdateResult(null);

    try {
      const res = await api.check_update();
      setUpdateResult(res);
      if (!res.has_update) {
        setStatusMessage(`У вас установлена последняя версия v${res.current_version}`);
      }
    } catch (e: any) {
      setStatusMessage('Ошибка проверки: ' + e.message);
    } finally {
      setChecking(false);
    }
  };

  const handleInstallUpdate = async () => {
    if (!api || !updateResult?.download_url) return;
    setUpdating(true);
    const res = await api.start_auto_update(updateResult.download_url);
    if (res && res.status === 'error') {
      alert(res.message);
      setUpdating(false);
    }
  };

  return (
    <div id="settingsOverlay" className="active" onClick={onClose}>
      <div className="settings-window" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-window-title">НАСТРОЙКИ</span>
          <button className="settings-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-layout">
          <div className="settings-sidebar">
            <button className={`settings-tab-btn ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>Темы оформления</button>
            <button className={`settings-tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>Модули</button>
            <button className={`settings-tab-btn ${activeTab === 'fonts' ? 'active' : ''}`} onClick={() => setActiveTab('fonts')}>Шрифты</button>
            <button className={`settings-tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>Обновление</button>
          </div>

          <div className="settings-body">
            {activeTab === 'themes' && (
              <div className="settings-tab-pane active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div className="settings-section-title" style={{ margin: 0 }}>РЕЖИМ И ПАЛИТРА</div>

                  <div style={{ display: 'flex', gap: 6, background: 'var(--bg-body)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                    <button
                      type="button"
                      onClick={() => onSelectThemeMode('light')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: themeMode === 'light' ? 'var(--accent)' : 'transparent',
                        color: themeMode === 'light' ? 'var(--accent-text)' : 'var(--text-muted)'
                      }}
                    >
                      <Sun size={13} /> День
                    </button>
                    <button
                      type="button"
                      onClick={() => onSelectThemeMode('dark')}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        border: 'none',
                        padding: '6px 12px',
                        borderRadius: 6,
                        fontSize: 12,
                        fontWeight: 700,
                        cursor: 'pointer',
                        background: themeMode === 'dark' ? 'var(--accent)' : 'transparent',
                        color: themeMode === 'dark' ? 'var(--accent-text)' : 'var(--text-muted)'
                      }}
                    >
                      <Moon size={13} /> Ночь
                    </button>
                  </div>
                </div>

                <div className="themes-grid">
                  {THEMES.map(t => {
                    const isSelected = currentTheme === t.id;
                    return (
                      <div key={t.id} className={`theme-card ${isSelected ? 'selected' : ''}`} onClick={() => onSelectTheme(t.id)}>
                        <div className="theme-color-preview" style={{ backgroundColor: t.color }}></div>
                        <div className="theme-card-info">
                          <div className="theme-card-name">{t.name}</div>
                          <div className="theme-card-group">{t.category}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'modules' && (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">УПРАВЛЕНИЕ МОДУЛЯМИ</div>
                
                <div className="module-card">
                  <div className="module-info">
                    <div className="module-header-line">
                      <span className="module-name">Заметки и документы</span>
                      <span className="module-badge core">Базовый</span>
                    </div>
                    <div className="module-desc">Основной редактор документов с форматированием.</div>
                  </div>
                </div>

                <div className="module-card">
                  <div className="module-info">
                    <div className="module-header-line">
                      <span className="module-name">Флипчарты (Edgeless Canvas)</span>
                      <span className="module-badge core">Базовый</span>
                    </div>
                    <div className="module-desc">Интерактивный холст для визуализации связей и стикеров.</div>
                  </div>
                </div>

                <div className="module-card">
                  <div className="module-info">
                    <div className="module-header-line">
                      <span className="module-name">Календарь заметок</span>
                      <span className="module-badge optional">Модуль</span>
                    </div>
                    <div className="module-desc">Ежедневный органайзер для записей по датам.</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={modulesState['module_calendar'] ?? true}
                      onChange={e => onToggleModule('module_calendar', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>

                <div className="module-card">
                  <div className="module-info">
                    <div className="module-header-line">
                      <span className="module-name">Канбан проекта</span>
                      <span className="module-badge optional">Модуль</span>
                    </div>
                    <div className="module-desc">Сквозная доска задач для текущего рабочего пространства.</div>
                  </div>
                  <label className="switch">
                    <input
                      type="checkbox"
                      checked={modulesState['module_kanban'] ?? true}
                      onChange={e => onToggleModule('module_kanban', e.target.checked)}
                    />
                    <span className="slider"></span>
                  </label>
                </div>
              </div>
            )}

            {activeTab === 'fonts' && (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">ВЫБОР ШРИФТА</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {FONTS.map(f => {
                    const isSelected = currentFont === f.id;
                    return (
                      <div
                        key={f.id}
                        onClick={() => onSelectFont(f.id)}
                        className={`module-card ${isSelected ? 'selected' : ''}`}
                        style={{ cursor: 'pointer', borderColor: isSelected ? 'var(--accent)' : 'var(--border-color)', backgroundColor: isSelected ? 'var(--item-active)' : 'var(--bg-body)' }}
                      >
                        <div>
                          <div style={{ fontFamily: f.id, fontSize: 16, fontWeight: 700, color: 'var(--text-main)', marginBottom: 2 }}>{f.name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{f.desc}</div>
                        </div>
                        {isSelected && <Check size={18} style={{ color: 'var(--accent)' }} />}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'updates' && (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">ОБНОВЛЕНИЕ РАДИАН</div>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '4px 0 20px 0', lineHeight: 1.5 }}>Проверка доступных релизов на GitHub.</p>

                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 20 }}>
                  <button className="btn-create-main" disabled={checking || updating} onClick={handleCheckUpdate} style={{ width: 'auto', padding: '8px 16px', display: 'inline-flex', gap: 8 }}>
                    <RefreshCw size={14} className={checking ? 'animate-spin' : ''} />
                    <span>{checking ? 'Проверка...' : 'Проверить обновления'}</span>
                  </button>
                  {statusMessage && <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--accent)', fontWeight: 600 }}><CheckCircle size={16} /><span>{statusMessage}</span></div>}
                </div>

                {updateResult?.has_update && (
                  <div style={{ padding: 16, borderRadius: 8, backgroundColor: 'var(--bg-body)', border: '1px solid var(--accent)' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--accent)', marginBottom: 6 }}>Доступна новая версия v{updateResult.version}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 14, maxHeight: 120, overflowY: 'auto', whiteSpace: 'pre-wrap' }}>{updateResult.changelog}</div>
                    <button className="btn-save" disabled={updating} onClick={handleInstallUpdate} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 18px' }}>
                      <DownloadCloud size={16} />
                      <span>{updating ? 'Скачивание...' : 'Обновить сейчас'}</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};