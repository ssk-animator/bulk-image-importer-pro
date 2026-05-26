import { LayoutService } from "../services/layout-service";
import { SettingsService } from "../services/settings-service";


export class ExportPanel {
  private container: HTMLElement;
  private layoutService: LayoutService;
  private settingsService: SettingsService;

  constructor(
    container: HTMLElement,
    layoutService: LayoutService,
    settingsService: SettingsService
  ) {
    this.container = container;
    this.layoutService = layoutService;
    this.settingsService = settingsService;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="panel-section export-section">
        <h3 class="panel-heading">
          <span class="heading-icon">💾</span>
          Export / Import
        </h3>

        <div class="export-group">
          <label class="option-label">Save Current Layout as Preset</label>
          <div class="option-row">
            <div class="option-field">
              <input type="text" id="preset-name" placeholder="My Preset" aria-label="Preset name">
            </div>
            <button class="btn btn-primary" id="btn-save-preset" aria-label="Save current layout as preset">Save</button>
          </div>
        </div>

        <div class="export-group">
          <label class="option-label">Export Layout Configuration</label>
          <p class="text-muted">Export your current layout settings as a JSON file.</p>
          <button class="btn btn-secondary btn-block" id="btn-export-config" aria-label="Export layout configuration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            Export Config
          </button>
        </div>

        <div class="export-group">
          <label class="option-label">Import Layout Configuration</label>
          <p class="text-muted">Import a previously exported layout configuration.</p>
          <button class="btn btn-secondary btn-block" id="btn-import-config" aria-label="Import layout configuration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import Config
          </button>
          <input type="file" id="config-file-input" accept=".json" style="display:none" aria-label="Select config file">
        </div>

        <div class="export-group">
          <label class="option-label">Saved Presets</label>
          <div class="presets-list" id="export-presets-list">
            ${this.renderPresetList()}
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private renderPresetList(): string {
    const presets = this.settingsService.getPresets();
    if (presets.length === 0) {
      return '<p class="text-muted">No saved presets</p>';
    }
    return presets
      .map(
        (entry) => `
        <div class="export-preset-item">
          <div class="preset-info">
            <strong>${entry.name}</strong>
            <span class="preset-meta">Mode: ${entry.config.mode} · ${entry.config.grid.columns} columns · ${entry.config.batchSize}/batch</span>
          </div>
          <div class="preset-actions">
            <button class="btn btn-sm btn-primary preset-load" data-preset="${entry.name}" aria-label="Load preset ${entry.name}">Load</button>
            <button class="btn btn-sm btn-danger preset-delete" data-preset="${entry.name}" aria-label="Delete preset ${entry.name}">&times;</button>
          </div>
        </div>
      `
      )
      .join("");
  }

  private bindEvents(): void {
    const savePresetBtn = this.container.querySelector("#btn-save-preset");
    savePresetBtn?.addEventListener("click", () => {
      const nameInput = this.container.querySelector("#preset-name") as HTMLInputElement;
      const name = nameInput?.value?.trim();
      if (!name) {
        this.showToast("Please enter a preset name", "error");
        return;
      }
      this.settingsService.savePreset(name, { ...this.layoutService.config });
      this.showToast(`Preset "${name}" saved`, "success");
      this.render();
    });

    const exportBtn = this.container.querySelector("#btn-export-config");
    exportBtn?.addEventListener("click", () => {
      this.exportConfig();
    });

    const importBtn = this.container.querySelector("#btn-import-config");
    const fileInput = this.container.querySelector("#config-file-input") as HTMLInputElement;
    importBtn?.addEventListener("click", () => {
      fileInput?.click();
    });
    fileInput?.addEventListener("change", () => {
      if (fileInput.files && fileInput.files[0]) {
        this.importConfig(fileInput.files[0]);
        fileInput.value = "";
      }
    });

    this.container.addEventListener("click", (e) => {
      const target = e.target as HTMLElement;
      const loadBtn = target.closest(".preset-load");
      if (loadBtn) {
        const presetName = (loadBtn as HTMLElement).dataset.preset;
        if (presetName) {
          const preset = this.settingsService.getPreset(presetName);
          if (preset) {
            this.layoutService.loadPreset(preset);
            this.showToast(`Preset "${presetName}" loaded`, "success");
          }
        }
      }

      const deleteBtn = target.closest(".preset-delete");
      if (deleteBtn) {
        const presetName = (deleteBtn as HTMLElement).dataset.preset;
        if (presetName) {
          this.settingsService.deletePreset(presetName);
          this.render();
        }
      }
    });
  }

  private exportConfig(): void {
    const config = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      layoutConfig: this.layoutService.config,
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bulk-image-importer-layout-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);

    this.showToast("Layout configuration exported", "success");
  }

  private async importConfig(file: File): Promise<void> {
    try {
      const text = await file.text();
      const config = JSON.parse(text);

      if (!config.layoutConfig) {
        this.showToast("Invalid configuration file", "error");
        return;
      }

      this.layoutService.applyConfig(config.layoutConfig);
      this.showToast("Configuration imported successfully", "success");
    } catch (err) {
      this.showToast("Failed to import configuration", "error");
      console.error(err);
    }
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
