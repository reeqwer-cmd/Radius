import React, { useState } from 'react';
import { RefreshCw, CheckCircle, AlertCircle, DownloadCloud, Check } from 'lucide-react';
import { PyWebViewAPI, UpdateInfo } from '../types/api';

interface SettingsModalProps {
  isOpen: boolean;
  currentTheme: string;
  currentFont: string;
  modulesState: Record<string, boolean>;
  api: PyWebViewAPI | null;
  onSelectTheme: (themeId: string) => void;
  onSelectFont: (fontName: string) => void;
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
  { id: 'burgundy_olive', name: 'Burgundy & Olive', category: 'Винные и природные', color: '#570F1D' },
  { id: 'plum_lavender', name: 'Deep Plum & Lavender', category: 'Винные и природные', color: '#5E3A5C' },
  { id: 'sunset_mulberry', name: 'Sunset Mulberry', category: 'Винные и природные', color: '#8F3858' },
  { id: 'pastel_iris', name: 'Pastel Iris & Sky', category: 'Пастельные оттенки', color: '#838BCC' },
  { id: 'nordic_pastel', name: 'Nordic Pastel Slate', category: 'Пастельные оттенки', color: '#657166' },
  { id: 'emerald_green', name: 'Emerald Green', category: 'Классическая коллекция', color: '#284139' },
  { id: 'wasabi', name: 'Wasabi', category: 'Классическая коллекция', color: '#809076' },
  { id: 'creased_khaki', name: 'Creased Khaki', category: 'Классическая коллекция', color: '#F8E794' },
  { id: 'egyptian_earth', name: 'Egyptian Earth', category: 'Классическая коллекция', color: '#B86830' },
  { id: 'noir_de_vigne', name: 'Noir de Vigne', category: 'Классическая коллекция', color: '#111A19' },
  { id: 'arsenic', name: 'Arsenic', category: 'Сланцевые и пепельные', color: '#344040' },
  { id: 'morning_blue', name: 'Morning Blue', category: 'Сланцевые и пепельные', color: '#889893' },
  { id: 'american_silver', name: 'American Silver', category: 'Сланцевые и пепельные', color: '#CFCFCD' },
  { id: 'liver_chestnut', name: 'Liver Chestnut', category: 'Сланцевые и пепельные', color: '#55453A' },
  { id: 'bistre', name: 'Bistre', category: 'Сланцевые и пепельные', color: '#362419' },
  { id: 'oil', name: 'Oil', category: 'Кофейные оттенки', color: '#2D1E17' },
  { id: 'judge_gray', name: 'Judge Gray', category: 'Кофейные оттенки', color: '#523F31' },
  { id: 'roman_coffee', name: 'Roman Coffee', category: 'Кофейные оттенки', color: '#796254' },
  { id: 'pale_oyster', name: 'Pale Oyster', category: 'Кофейные оттенки', color: '#9D8A7C' }
];

const FONTS = [
  { id: 'Inter', name: 'Inter', desc: 'Чистый интерфейсный гротеск' },
  { id: 'Playfair Display', name: 'Playfair Display', desc: 'Классическая элегантная антиква' },
  { id: 'EB Garamond', name: 'EB Garamond', desc: 'Традиционный книжный шрифт' },
  { id: 'Alumni Sans', name: 'Alumni Sans', desc: 'Узкий стильный современный шрифт' }
];

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentTheme,
  currentFont,
  modulesState,
  api,
  onSelectTheme,
  onSelectFont,
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
            <button className={`settings-tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>Модули</button>
            <button className={`settings-tab-btn ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>Темы оформления</button>
            <button className={`settings-tab-btn ${activeTab === 'fonts' ? 'active' : ''}`} onClick={() => setActiveTab('fonts')}>Шрифты</button>
            <button className={`settings-tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>Обновление</button>
          </div>

          <div className="settings-body">
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
              </div>
            )}

            {activeTab === 'themes' && (
              <div className="settings-tab-pane active">
                <div className="settings-section-title">ВЫБЕРИТЕ ЦВЕТОВУЮ ПАЛИТРУ</div>
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