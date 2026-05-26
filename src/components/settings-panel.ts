import { SettingsService } from "../services/settings-service";
import { ThemeMode } from "../models/settings";

export class SettingsPanel {
  private container: HTMLElement;
  private settingsService: SettingsService;

  constructor(container: HTMLElement, settingsService: SettingsService) {
    this.container = container;
    this.settingsService = settingsService;
  }

  render(): void {
    const s = this.settingsService.settings;

    this.container.innerHTML = `
      <div class="panel-section settings-section">
        <h3 class="panel-heading">
          <span class="heading-icon">⚙️</span>
          Settings
        </h3>

        <div class="settings-group">
          <label class="option-label">Theme</label>
          <div class="theme-buttons">
            <button class="theme-btn ${s.theme === "light" ? "active" : ""}" data-theme="light" aria-label="Light theme">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="5"/>
                <line x1="12" y1="1" x2="12" y2="3"/>
                <line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/>
                <line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
              Light
            </button>
            <button class="theme-btn ${s.theme === "dark" ? "active" : ""}" data-theme="dark" aria-label="Dark theme">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
              </svg>
              Dark
            </button>
            <button class="theme-btn ${s.theme === "system" ? "active" : ""}" data-theme="system" aria-label="System theme">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <line x1="8" y1="21" x2="16" y2="21"/>
                <line x1="12" y1="17" x2="12" y2="21"/>
              </svg>
              System
            </button>
          </div>
        </div>

        <div class="settings-group">
          <label class="option-label">Default Import Settings</label>
          <div class="option-row">
            <div class="option-field">
              <label for="settings-max-width">Default Max Width</label>
              <input type="number" id="settings-max-width" value="${s.defaultMaxWidth}" min="50" max="2000" aria-label="Default max width">
            </div>
            <div class="option-field">
              <label for="settings-max-height">Default Max Height</label>
              <input type="number" id="settings-max-height" value="${s.defaultMaxHeight}" min="50" max="2000" aria-label="Default max height">
            </div>
          </div>
          <div class="option-row">
            <div class="option-field">
              <label for="settings-spacing">Default Spacing</label>
              <input type="number" id="settings-spacing" value="${s.defaultSpacingHorizontal}" min="0" max="200" aria-label="Default horizontal spacing">
            </div>
            <div class="option-field">
              <label for="settings-columns">Default Grid Columns</label>
              <input type="number" id="settings-columns" value="${s.defaultGridColumns}" min="1" max="20" aria-label="Default grid columns">
            </div>
          </div>
          <div class="option-row">
            <div class="option-field">
              <label for="settings-batch-size">Default Batch Size</label>
              <input type="number" id="settings-batch-size" value="${s.defaultBatchSize}" min="1" max="100" aria-label="Default batch size">
            </div>
            <div class="option-field">
              <label for="settings-start-cell">Default Start Cell</label>
              <input type="text" id="settings-start-cell" value="${s.defaultStartCell}" placeholder="A1" aria-label="Default start cell">
            </div>
          </div>
        </div>

        <div class="settings-group">
          <label class="option-label">Options</label>
          <div class="checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" id="settings-thumbnails" ${s.showThumbnailPreviews ? "checked" : ""}>
              Show Thumbnail Previews
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="settings-auto-fit" ${s.autoFitCells ? "checked" : ""}>
              Auto-Fit Cells After Import
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="settings-aspect" ${s.preserveAspectRatio ? "checked" : ""}>
              Preserve Aspect Ratio
            </label>
            <label class="checkbox-label">
              <input type="checkbox" id="settings-progress" ${s.showProgressPanel ? "checked" : ""}>
              Show Progress Panel
            </label>
            <label class="checkbox-label" style="border-color: var(--accent-warning); padding: 4px 8px; border-radius: var(--radius-sm);">
              <input type="checkbox" id="settings-cell-images" ${s.useLocalImageCellValue ? "checked" : ""}>
              <strong>Enable True Place In Cell</strong>
            </label>
          </div>
        </div>

        <div class="settings-group">
          <label class="option-label">Saved Presets</label>
          <div class="presets-container" id="presets-container">
            ${this.renderPresets()}
          </div>
        </div>

        <div class="settings-group">
          <label class="option-label">Recent Files</label>
          <div class="recent-files" id="recent-files">
            ${this.renderRecentFiles()}
          </div>
          <button class="btn btn-sm btn-outline" id="btn-clear-recent" aria-label="Clear recent files">Clear Recent Files</button>
        </div>

        <div class="settings-actions">
          <button class="btn btn-outline" id="btn-reset-settings" aria-label="Reset all settings to defaults">Reset to Defaults</button>
          <button class="btn btn-primary" id="btn-save-settings" aria-label="Save settings">Save Settings</button>
        </div>

        <div class="settings-group about-creator">
          <label class="option-label">About the Creator</label>
          <div style="padding: 8px 0;">
            <div style="font-weight: 600; font-size: var(--font-size-md); margin-bottom: 2px;">Sahil G Kamble (SSK)</div>
            <div class="text-muted" style="font-size: var(--font-size-xs); margin-bottom: 12px;">Creator & Developer</div>

            <div class="about-link">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 7l-10 7L2 7"/></svg>
              <span>ssk9096461158@gmail.com</span>
            </div>
            <a class="about-link" href="https://www.youtube.com/@sskanimator6521" target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" style="flex-shrink:0;"><path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6a3 3 0 00-2.1 2.1C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 002.1-2.1c.5-1.9.5-5.8.5-5.8s0-3.9-.5-5.8zM9.5 15.5V8.5l6.3 3.5-6.3 3.5z"/></svg>
              <span>YouTube Channel</span>
            </a>
            <a class="about-link" href="https://www.instagram.com/ssk.animations?igsh=MTR1aGhmOTEwaHp5MA==" target="_blank" rel="noopener noreferrer">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="flex-shrink:0;"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/><circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none"/></svg>
              <span>Instagram</span>
            </a>
          </div>
          <div class="text-muted" style="font-size: var(--font-size-xs); text-align: center; padding-top: 8px; border-top: 1px solid var(--border-color); margin-top: 4px;">
            Bulk Image Importer Pro &copy; 2026 | Created by SSK
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderPresets(): string {
    const presets = this.settingsService.getPresets();
    if (presets.length === 0) {
      return '<p class="text-muted">No presets saved yet</p>';
    }
    return presets
      .map(
        (entry) => `
        <div class="preset-item">
          <span class="preset-name">${entry.name}</span>
          <span class="preset-mode">${entry.config.mode}</span>
          <button class="btn btn-sm btn-danger preset-delete" data-preset="${entry.name}" aria-label="Delete preset ${entry.name}">&times;</button>
        </div>
      `
      )
      .join("");
  }

  private renderRecentFiles(): string {
    const files = this.settingsService.getRecentFiles();
    if (files.length === 0) {
      return '<p class="text-muted">No recent files</p>';
    }
    return files
      .slice(0, 10)
      .map((f) => `<div class="recent-file-item">${f}</div>`)
      .join("");
  }

  private bindEvents(): void {
    this.container.querySelectorAll(".theme-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const theme = (btn as HTMLElement).dataset.theme as ThemeMode;
        this.settingsService.setTheme(theme);
        this.container.querySelectorAll(".theme-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
      });
    });

    const saveBtn = this.container.querySelector("#btn-save-settings");
    saveBtn?.addEventListener("click", () => {
      this.saveCurrentSettings();
    });

    const resetBtn = this.container.querySelector("#btn-reset-settings");
    resetBtn?.addEventListener("click", () => {
      this.settingsService.resetToDefaults();
      this.render();
      this.showToast("Settings reset to defaults", "info");
    });

    const clearRecentBtn = this.container.querySelector("#btn-clear-recent");
    clearRecentBtn?.addEventListener("click", () => {
      this.settingsService.clearRecentFiles();
      this.render();
    });

    this.container.querySelectorAll(".preset-delete").forEach((btn) => {
      btn.addEventListener("click", () => {
        const name = (btn as HTMLElement).dataset.preset;
        if (name) {
          this.settingsService.deletePreset(name);
          this.render();
        }
      });
    });

  }

  private saveCurrentSettings(): void {
    const getVal = (id: string): string =>
      (this.container.querySelector(`#${id}`) as HTMLInputElement)?.value || "";
    const getChecked = (id: string): boolean =>
      (this.container.querySelector(`#${id}`) as HTMLInputElement)?.checked || false;

    this.settingsService.updateSettings({
      defaultMaxWidth: parseInt(getVal("settings-max-width")) || 400,
      defaultMaxHeight: parseInt(getVal("settings-max-height")) || 400,
      defaultSpacingHorizontal: parseInt(getVal("settings-spacing")) || 10,
      defaultGridColumns: parseInt(getVal("settings-columns")) || 4,
      defaultBatchSize: parseInt(getVal("settings-batch-size")) || 10,
      defaultStartCell: getVal("settings-start-cell") || "A1",
      showThumbnailPreviews: getChecked("settings-thumbnails"),
      autoFitCells: getChecked("settings-auto-fit"),
      preserveAspectRatio: getChecked("settings-aspect"),
      showProgressPanel: getChecked("settings-progress"),
      useLocalImageCellValue: getChecked("settings-cell-images"),
    });

    this.showToast("Settings saved", "success");
  }

  private showToast(message: string, type: "success" | "error" | "info"): void {
    const existing = this.container.querySelector(".toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute("role", "alert");
    this.container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }
}
