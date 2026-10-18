import React, { useState, useEffect, useRef } from 'react';
import { RefreshCw, CheckCircle, DownloadCloud, Check, Sun, Moon, Sparkles, Layout, Upload, Trash2, FileCode, Info } from 'lucide-react';
import { PyWebViewAPI, UpdateInfo } from '../types/api';

export type UiStyleType = 'gnome' | 'liquid_glass';

export interface CustomThemeData {
  id: string;
  name: string;
  category?: string;
  color: string;
  ui_style?: UiStyleType;
  mode?: 'light' | 'dark';
  variables: Record<string, string>;
}

interface SettingsModalProps {
  isOpen: boolean;
  currentTheme: string;
  currentFont: string;
  themeMode: 'light' | 'dark';
  uiStyle: UiStyleType;
  modulesState: Record<string, boolean>;
  api: PyWebViewAPI | null;
  initialTab?: 'themes' | 'modules' | 'fonts' | 'updates' | 'about';
  onSelectTheme: (themeId: string) => void;
  onSelectFont: (fontName: string) => void;
  onSelectThemeMode: (mode: 'light' | 'dark') => void;
  onSelectUiStyle: (style: UiStyleType) => void;
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

export const BUILTIN_CUSTOM_PRESETS: CustomThemeData[] = [
  {
    id: 'gnome_adwaita_dark',
    name: 'GNOME Adwaita Dark',
    category: 'Интеграция GNOME / GTK4',
    color: '#3584e4',
    ui_style: 'gnome',
    mode: 'dark',
    variables: {
      '--bg-body': '#1e1e1e',
      '--bg-sidebar': '#242424',
      '--bg-card': '#303030',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--text-main': '#ffffff',
      '--text-muted': '#9a9996',
      '--accent': '#3584e4',
      '--accent-hover': '#62a0ea',
      '--accent-text': '#ffffff',
      '--item-active': 'rgba(255, 255, 255, 0.12)',
      '--item-hover': 'rgba(255, 255, 255, 0.06)',
      '--popover-bg': '#303030',
      '--bg-canvas': '#1a1a1a'
    }
  },
  {
    id: 'gnome_adwaita_light',
    name: 'GNOME Adwaita Light',
    category: 'Интеграция GNOME / GTK4',
    color: '#1c71d8',
    ui_style: 'gnome',
    mode: 'light',
    variables: {
      '--bg-body': '#fafafa',
      '--bg-sidebar': '#ebebeb',
      '--bg-card': '#ffffff',
      '--border-color': 'rgba(0, 0, 0, 0.1)',
      '--text-main': '#2e3436',
      '--text-muted': '#5e5c64',
      '--accent': '#1c71d8',
      '--accent-hover': '#3584e4',
      '--accent-text': '#ffffff',
      '--item-active': 'rgba(0, 0, 0, 0.08)',
      '--item-hover': 'rgba(0, 0, 0, 0.04)',
      '--popover-bg': '#ffffff',
      '--bg-canvas': '#f2f2f2'
    }
  },
  {
    id: 'gnome_ubuntu_yaru',
    name: 'Ubuntu Yaru Dark',
    category: 'Интеграция GNOME / Linux',
    color: '#E95420',
    ui_style: 'gnome',
    mode: 'dark',
    variables: {
      '--bg-body': '#222222',
      '--bg-sidebar': '#2c2c2c',
      '--bg-card': '#333333',
      '--border-color': 'rgba(255, 255, 255, 0.1)',
      '--text-main': '#f7f7f7',
      '--text-muted': '#aea79f',
      '--accent': '#E95420',
      '--accent-hover': '#f07746',
      '--accent-text': '#ffffff',
      '--item-active': 'rgba(233, 84, 32, 0.22)',
      '--item-hover': 'rgba(255, 255, 255, 0.06)',
      '--popover-bg': '#333333',
      '--bg-canvas': '#1d1d1d'
    }
  },
  {
    id: 'catppuccin_mocha',
    name: 'Catppuccin Mocha',
    category: 'Сообщество / GNOME Gradience',
    color: '#cba6f7',
    ui_style: 'gnome',
    mode: 'dark',
    variables: {
      '--bg-body': '#1e1e2e',
      '--bg-sidebar': '#181825',
      '--bg-card': '#313244',
      '--border-color': 'rgba(205, 214, 244, 0.12)',
      '--text-main': '#cdd6f4',
      '--text-muted': '#a6adc8',
      '--accent': '#cba6f7',
      '--accent-hover': '#b4befe',
      '--accent-text': '#11111b',
      '--item-active': 'rgba(203, 166, 247, 0.2)',
      '--item-hover': 'rgba(205, 214, 244, 0.06)',
      '--popover-bg': '#313244',
      '--bg-canvas': '#11111b'
    }
  },
  {
    id: 'nord_polar',
    name: 'Nord Polar Night',
    category: 'Сообщество / GNOME Gradience',
    color: '#88c0d0',
    ui_style: 'gnome',
    mode: 'dark',
    variables: {
      '--bg-body': '#2e3440',
      '--bg-sidebar': '#242933',
      '--bg-card': '#3b4252',
      '--border-color': 'rgba(216, 222, 233, 0.12)',
      '--text-main': '#eceff4',
      '--text-muted': '#d8dee9',
      '--accent': '#88c0d0',
      '--accent-hover': '#81a1c1',
      '--accent-text': '#2e3440',
      '--item-active': 'rgba(136, 192, 208, 0.2)',
      '--item-hover': 'rgba(236, 239, 244, 0.06)',
      '--popover-bg': '#3b4252',
      '--bg-canvas': '#292e39'
    }
  }
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

export const STORAGE_KEYS = {
  UI_STYLE: 'radian_ui_style',
  THEME_ID: 'radian_theme_id',
  THEME_MODE: 'radian_theme_mode',
  FONT_FAMILY: 'radian_font_family',
  CUSTOM_THEMES: 'radian_custom_themes',
  ACTIVE_CUSTOM_THEME: 'radian_active_custom_theme'
};

export const applyCustomThemeVariables = (variables: Record<string, string> | null) => {
  const root = document.documentElement;
  const cssVarKeys = [
    '--bg-body', '--bg-sidebar', '--bg-card', '--border-color',
    '--text-main', '--text-muted', '--accent', '--accent-hover',
    '--accent-text', '--item-active', '--item-hover', '--popover-bg', '--bg-canvas'
  ];
  if (!variables) {
    cssVarKeys.forEach(k => root.style.removeProperty(k));
  } else {
    Object.entries(variables).forEach(([k, v]) => {
      root.style.setProperty(k, v);
    });
  }
};

export const restoreSavedAppearance = () => {
  const savedStyleRaw = localStorage.getItem(STORAGE_KEYS.UI_STYLE);
  const savedStyle: UiStyleType = savedStyleRaw === 'liquid_glass' ? 'liquid_glass' : 'gnome';
  const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME_ID) || 'stone_hearth';
  const savedMode = (localStorage.getItem(STORAGE_KEYS.THEME_MODE) as 'light' | 'dark') || 'dark';
  const savedFont = localStorage.getItem(STORAGE_KEYS.FONT_FAMILY) || 'Inter';
  const activeCustomId = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOM_THEME);

  document.documentElement.setAttribute('data-ui-style', savedStyle);
  document.documentElement.setAttribute('data-theme', savedTheme);
  document.documentElement.setAttribute('data-mode', savedMode);
  document.documentElement.style.setProperty('--font-main', `'${savedFont}', sans-serif`);

  if (activeCustomId) {
    try {
      const userThemes: CustomThemeData[] = JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES) || '[]');
      const all = [...BUILTIN_CUSTOM_PRESETS, ...userThemes];
      const found = all.find(t => t.id === activeCustomId);
      if (found) {
        applyCustomThemeVariables(found.variables);
      }
    } catch (e) {
      console.error('Ошибка восстановления пользовательской темы:', e);
    }
  } else {
    applyCustomThemeVariables(null);
  }

  return { savedStyle, savedTheme, savedMode, savedFont };
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  currentTheme,
  currentFont,
  themeMode,
  uiStyle,
  modulesState,
  api,
  initialTab = 'themes',
  onSelectTheme,
  onSelectFont,
  onSelectThemeMode,
  onSelectUiStyle,
  onToggleModule,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'modules' | 'themes' | 'fonts' | 'updates' | 'about'>(initialTab);
  const [checking, setChecking] = useState(false);
  const [updateResult, setUpdateResult] = useState<UpdateInfo | null>(null);
  const [updating, setUpdating] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const [customThemes, setCustomThemes] = useState<CustomThemeData[]>([]);
  const [activeCustomId, setActiveCustomId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab, isOpen]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.CUSTOM_THEMES);
      if (saved) setCustomThemes(JSON.parse(saved));
      const activeCustom = localStorage.getItem(STORAGE_KEYS.ACTIVE_CUSTOM_THEME);
      if (activeCustom) setActiveCustomId(activeCustom);
    } catch (e) {
      console.error(e);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChangeUiStyle = (style: UiStyleType) => {
    localStorage.setItem(STORAGE_KEYS.UI_STYLE, style);
    document.documentElement.setAttribute('data-ui-style', style);
    onSelectUiStyle(style);
  };

  const handleChangeThemeMode = (mode: 'light' | 'dark') => {
    localStorage.setItem(STORAGE_KEYS.THEME_MODE, mode);
    document.documentElement.setAttribute('data-mode', mode);
    onSelectThemeMode(mode);
  };

  const handleChangeFont = (fontId: string) => {
    localStorage.setItem(STORAGE_KEYS.FONT_FAMILY, fontId);
    document.documentElement.style.setProperty('--font-main', `'${fontId}', sans-serif`);
    onSelectFont(fontId);
  };

  const handleSelectStandardTheme = (themeId: string) => {
    setActiveCustomId(null);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_CUSTOM_THEME);
    localStorage.setItem(STORAGE_KEYS.THEME_ID, themeId);
    applyCustomThemeVariables(null);
    document.documentElement.setAttribute('data-theme', themeId);
    onSelectTheme(themeId);
  };

  const handleSelectCustomTheme = (theme: CustomThemeData) => {
    setActiveCustomId(theme.id);
    localStorage.setItem(STORAGE_KEYS.ACTIVE_CUSTOM_THEME, theme.id);
    applyCustomThemeVariables(theme.variables);
    if (theme.ui_style) handleChangeUiStyle(theme.ui_style);
    if (theme.mode) handleChangeThemeMode(theme.mode);
  };

  const handleImportThemeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      try {
        if (file.name.endsWith('.css')) {
          const extractColor = (key: string, fallback: string) => {
            const match = content.match(new RegExp(`@define-color\\s+${key}\\s+([^;]+);`));
            return match ? match[1].trim() : fallback;
          };
          const bgBody = extractColor('window_bg_color', '#1e1e1e');
          const accent = extractColor('accent_bg_color', '#3584e4');
          const newTheme: CustomThemeData = {
            id: `gtk_${Date.now()}`,
            name: file.name.replace('.css', ''),
            category: 'Импорт GTK / GNOME CSS',
            color: accent,
            ui_style: 'gnome',
            mode: 'dark',
            variables: {
              '--bg-body': bgBody,
              '--bg-sidebar': extractColor('sidebar_bg_color', bgBody),
              '--bg-card': extractColor('card_bg_color', '#303030'),
              '--border-color': 'rgba(128, 128, 128, 0.18)',
              '--text-main': extractColor('window_fg_color', '#ffffff'),
              '--text-muted': extractColor('view_fg_color', '#9a9996'),
              '--accent': accent,
              '--accent-hover': accent,
              '--accent-text': extractColor('accent_fg_color', '#ffffff'),
              '--item-active': 'rgba(128, 128, 128, 0.18)',
              '--item-hover': 'rgba(128, 128, 128, 0.08)',
              '--popover-bg': extractColor('popover_bg_color', '#303030'),
              '--bg-canvas': extractColor('view_bg_color', bgBody)
            }
          };
          const updated = [...customThemes, newTheme];
          setCustomThemes(updated);
          localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(updated));
          handleSelectCustomTheme(newTheme);
          return;
        }

        const parsed = JSON.parse(content);
        let newTheme: CustomThemeData;

        if (parsed.variables && parsed.variables.window_bg_color) {
          const v = parsed.variables;
          newTheme = {
            id: `gradience_${Date.now()}`,
            name: parsed.name || file.name.replace('.json', ''),
            category: 'Импорт GNOME Gradience',
            color: v.accent_bg_color || '#3584e4',
            ui_style: 'gnome',
            mode: 'dark',
            variables: {
              '--bg-body': v.window_bg_color || '#1e1e1e',
              '--bg-sidebar': v.sidebar_bg_color || v.headerbar_bg_color || '#242424',
              '--bg-card': v.card_bg_color || '#303030',
              '--border-color': 'rgba(128, 128, 128, 0.18)',
              '--text-main': v.window_fg_color || '#ffffff',
              '--text-muted': v.view_fg_color || '#9a9996',
              '--accent': v.accent_bg_color || '#3584e4',
              '--accent-hover': v.accent_color || v.accent_bg_color || '#62a0ea',
              '--accent-text': v.accent_fg_color || '#ffffff',
              '--item-active': 'rgba(128, 128, 128, 0.18)',
              '--item-hover': 'rgba(128, 128, 128, 0.08)',
              '--popover-bg': v.popover_bg_color || '#303030',
              '--bg-canvas': v.view_bg_color || v.window_bg_color || '#1a1a1a'
            }
          };
        } else if (parsed.name && parsed.variables) {
          newTheme = {
            id: parsed.id || `custom_${Date.now()}`,
            name: parsed.name,
            category: parsed.category || 'Пользовательская тема',
            color: parsed.color || parsed.variables['--accent'] || '#3584e4',
            ui_style: parsed.ui_style === 'liquid_glass' ? 'liquid_glass' : 'gnome',
            mode: parsed.mode,
            variables: parsed.variables
          };
        } else {
          alert('Некорректный формат файла темы.');
          return;
        }

        const updated = [...customThemes.filter(t => t.id !== newTheme.id), newTheme];
        setCustomThemes(updated);
        localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(updated));
        handleSelectCustomTheme(newTheme);
      } catch (err) {
        alert('Ошибка чтения файла темы.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDeleteCustomTheme = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = customThemes.filter(t => t.id !== id);
    setCustomThemes(updated);
    localStorage.setItem(STORAGE_KEYS.CUSTOM_THEMES, JSON.stringify(updated));
    if (activeCustomId === id) {
      handleSelectStandardTheme(currentTheme);
    }
  };

  const handleDownloadTemplate = () => {
    const template: CustomThemeData = BUILTIN_CUSTOM_PRESETS[0];
    const blob = new Blob([JSON.stringify(template, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'radian-gnome-theme.json';
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const allIntegratedThemes = [...BUILTIN_CUSTOM_PRESETS, ...customThemes];

  return (
    <div id="settingsOverlay" className="active" onClick={onClose}>
      <div className="settings-window" onClick={e => e.stopPropagation()}>
        <div className="settings-header">
          <span className="settings-window-title">НАСТРОЙКИ И СИСТЕМА</span>
          <button className="settings-close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-layout">
          <div className="settings-sidebar">
            <button className={`settings-tab-btn ${activeTab === 'themes' ? 'active' : ''}`} onClick={() => setActiveTab('themes')}>Темы оформления</button>
            <button className={`settings-tab-btn ${activeTab === 'modules' ? 'active' : ''}`} onClick={() => setActiveTab('modules')}>Модули</button>
            <button className={`settings-tab-btn ${activeTab === 'fonts' ? 'active' : ''}`} onClick={() => setActiveTab('fonts')}>Шрифты</button>
            <button className={`settings-tab-btn ${activeTab === 'updates' ? 'active' : ''}`} onClick={() => setActiveTab('updates')}>Обновление</button>
            <button className={`settings-tab-btn ${activeTab === 'about' ? 'active' : ''}`} onClick={() => setActiveTab('about')}>О программе</button>
          </div>

          <div className="settings-body">
            {activeTab === 'themes' && (
              <div className="settings-tab-pane active">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
                  <div className="settings-section-title" style={{ margin: 0 }}>АРХИТЕКТУРА И РЕЖИМ</div>

                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', gap: 3, background: 'var(--bg-body)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => handleChangeUiStyle('gnome')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: uiStyle === 'gnome' ? 'var(--accent)' : 'transparent',
                          color: uiStyle === 'gnome' ? 'var(--accent-text)' : 'var(--text-muted)'
                        }}
                      >
                        <Layout size={12} /> GNOME
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeUiStyle('liquid_glass')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          border: 'none',
                          padding: '6px 12px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: uiStyle === 'liquid_glass' ? 'var(--accent)' : 'transparent',
                          color: uiStyle === 'liquid_glass' ? 'var(--accent-text)' : 'var(--text-muted)'
                        }}
                      >
                        <Sparkles size={12} /> Liquid Glass
                      </button>
                    </div>

                    <div style={{ display: 'flex', gap: 3, background: 'var(--bg-body)', padding: 3, borderRadius: 8, border: '1px solid var(--border-color)' }}>
                      <button
                        type="button"
                        onClick={() => handleChangeThemeMode('light')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: themeMode === 'light' ? 'var(--accent)' : 'transparent',
                          color: themeMode === 'light' ? 'var(--accent-text)' : 'var(--text-muted)'
                        }}
                      >
                        <Sun size={12} /> День
                      </button>
                      <button
                        type="button"
                        onClick={() => handleChangeThemeMode('dark')}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 5,
                          border: 'none',
                          padding: '6px 10px',
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 700,
                          cursor: 'pointer',
                          background: themeMode === 'dark' ? 'var(--accent)' : 'transparent',
                          color: themeMode === 'dark' ? 'var(--accent-text)' : 'var(--text-muted)'
                        }}
                      >
                        <Moon size={12} /> Ночь
                      </button>
                    </div>
                  </div>
                </div>

                <div className="settings-section-title" style={{ marginTop: 8, marginBottom: 10 }}>БАЗОВЫЕ ЦВЕТОВЫЕ ПАЛИТРЫ</div>
                <div className="themes-grid">
                  {THEMES.map(t => {
                    const isSelected = !activeCustomId && currentTheme === t.id;
                    return (
                      <div key={t.id} className={`theme-card ${isSelected ? 'selected' : ''}`} onClick={() => handleSelectStandardTheme(t.id)}>
                        <div className="theme-color-preview" style={{ backgroundColor: t.color }}></div>
                        <div className="theme-card-info">
                          <div className="theme-card-name">{t.name}</div>
                          <div className="theme-card-group">{t.category}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 24, marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                  <div className="settings-section-title" style={{ margin: 0 }}>ИНТЕГРАЦИЯ ТЕМ (GNOME / GRADIENCE / JSON / CSS)</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,.css"
                      style={{ display: 'none' }}
                      onChange={handleImportThemeFile}
                    />
                    <button
                      type="button"
                      onClick={handleDownloadTemplate}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 600,
                        borderRadius: 6,
                        border: '1px solid var(--border-color)',
                        background: 'var(--bg-body)',
                        color: 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      <FileCode size={12} /> Шаблон JSON
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 5,
                        padding: '5px 10px',
                        fontSize: 11,
                        fontWeight: 700,
                        borderRadius: 6,
                        border: 'none',
                        background: 'var(--accent)',
                        color: 'var(--accent-text)',
                        cursor: 'pointer'
                      }}
                    >
                      <Upload size={12} /> Импортировать (.json / gtk.css)
                    </button>
                  </div>
                </div>

                <div className="themes-grid">
                  {allIntegratedThemes.map(t => {
                    const isSelected = activeCustomId === t.id;
                    const isUserUploaded = !BUILTIN_CUSTOM_PRESETS.some(p => p.id === t.id);
                    return (
                      <div key={t.id} className={`theme-card ${isSelected ? 'selected' : ''}`} onClick={() => handleSelectCustomTheme(t)} style={{ position: 'relative' }}>
                        <div className="theme-color-preview" style={{ backgroundColor: t.color }}></div>
                        <div className="theme-card-info" style={{ flex: 1 }}>
                          <div className="theme-card-name">{t.name}</div>
                          <div className="theme-card-group">{t.category || 'Интегрированная тема'}</div>
                        </div>
                        {isUserUploaded && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCustomTheme(t.id, e)}
                            title="Удалить тему"
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              padding: 4
                            }}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
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
                        onClick={() => handleChangeFont(f.id)}
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

            {activeTab === 'about' && (
              <div className="settings-tab-pane active" style={{ textAlign: 'center', padding: '30px 20px' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--accent)', marginBottom: 6 }}>РАДИАН</div>
                <div style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>Рабочее пространство (версия v1.0.10)</div>
                
                <div style={{ 
                  background: 'var(--bg-body)', 
                  border: '1px solid var(--border-color)', 
                  borderRadius: 12, 
                  padding: 22, 
                  display: 'inline-block',
                  textAlign: 'left',
                  maxWidth: 400,
                  width: '100%',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)'
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-main)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Info size={16} style={{ color: 'var(--accent)' }} /> Информация об авторе:
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)', marginBottom: 8 }}>
                    <strong>Разработчик:</strong> Скороходов Артем Иванович
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-main)' }}>
                    <strong>Почта:</strong> <a href="mailto:reeqwer@gmail.com" style={{ color: 'var(--accent)', textDecoration: 'none', fontWeight: 600 }}>reeqwer@gmail.com</a>
                  </div>
                </div>

                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 28, lineHeight: 1.5, maxWidth: 380, marginLeft: 'auto', marginRight: 'auto' }}>
                  Все права защищены. Программное обеспечение защищено авторским правом. Предназначено для профессионального использования и тестирования.
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};