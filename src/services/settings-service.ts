import { UserSettings, DEFAULT_SETTINGS, ThemeMode } from "../models/settings";
import { LayoutConfig } from "../models/layout-config";

const SETTINGS_KEY = "BulkImageImporterPro_Settings";
const PRESETS_KEY = "BulkImageImporterPro_Presets";

function getStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    console.warn("localStorage not available, using in-memory storage");
    return null;
  }
}

export class SettingsService {
  private _settings: UserSettings;
  private _presets: Map<string, LayoutConfig> = new Map();
  private _listeners: Array<() => void> = [];

  constructor() {
    this._settings = this.loadSettings();
    this.loadPresets();
  }

  get settings(): Readonly<UserSettings> {
    return { ...this._settings };
  }

  onChange(callback: () => void): () => void {
    this._listeners.push(callback);
    return () => {
      const idx = this._listeners.indexOf(callback);
      if (idx >= 0) this._listeners.splice(idx, 1);
    };
  }

  private notify(): void {
    for (const listener of this._listeners) {
      try { listener(); } catch { /* ignore */ }
    }
  }

  private loadSettings(): UserSettings {
    const storage = getStorage();
    if (!storage) return { ...DEFAULT_SETTINGS };

    try {
      const raw = storage.getItem(SETTINGS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {
      console.warn("Failed to load settings, using defaults");
    }
    return { ...DEFAULT_SETTINGS };
  }

  saveSettings(): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      storage.setItem(SETTINGS_KEY, JSON.stringify(this._settings));
    } catch {
      console.warn("Failed to save settings");
    }
    this.notify();
  }

  updateSettings(partial: Partial<UserSettings>): void {
    Object.assign(this._settings, partial);
    this.saveSettings();
  }

  setTheme(theme: ThemeMode): void {
    this._settings.theme = theme;
    this.applyTheme();
    this.saveSettings();
  }

  applyTheme(): void {
    const root = document.documentElement;
    const theme = this._settings.theme;

    if (theme === "dark") {
      root.setAttribute("data-theme", "dark");
    } else if (theme === "light") {
      root.setAttribute("data-theme", "light");
    } else {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      root.setAttribute("data-theme", prefersDark ? "dark" : "light");
    }
  }

  addRecentFile(path: string): void {
    const files = this._settings.recentFiles;
    const idx = files.indexOf(path);
    if (idx >= 0) files.splice(idx, 1);
    files.unshift(path);
    if (files.length > 20) files.pop();
    this.saveSettings();
  }

  getRecentFiles(): string[] {
    return [...this._settings.recentFiles];
  }

  clearRecentFiles(): void {
    this._settings.recentFiles = [];
    this.saveSettings();
  }

  private loadPresets(): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      const raw = storage.getItem(PRESETS_KEY);
      if (raw) {
        const presets = JSON.parse(raw) as Array<{ name: string; config: Partial<LayoutConfig> }>;
        for (const preset of presets) {
          this._presets.set(preset.name, LayoutConfig.createPreset(preset.name, preset.config));
        }
      }
    } catch {
      console.warn("Failed to load presets");
    }
  }

  private savePresets(): void {
    const storage = getStorage();
    if (!storage) return;

    try {
      const presets = Array.from(this._presets.entries()).map(([name, config]) => ({
        name,
        config,
      }));
      storage.setItem(PRESETS_KEY, JSON.stringify(presets));
    } catch {
      console.warn("Failed to save presets");
    }
  }

  getPresets(): Array<{ name: string; config: LayoutConfig }> {
    return Array.from(this._presets.entries()).map(([name, config]) => ({ name, config }));
  }

  getPreset(name: string): LayoutConfig | undefined {
    return this._presets.get(name);
  }

  savePreset(name: string, config: LayoutConfig): void {
    this._presets.set(name, config);
    const presetNames = Array.from(this._presets.keys());
    this._settings.savedPresets = presetNames;
    this.savePresets();
    this.saveSettings();
  }

  deletePreset(name: string): void {
    this._presets.delete(name);
    this._settings.savedPresets = Array.from(this._presets.keys());
    this.savePresets();
    this.saveSettings();
  }

  resetToDefaults(): void {
    this._settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.applyTheme();
  }
}
