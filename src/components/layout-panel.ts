import { LayoutService } from "../services/layout-service";
import { LayoutMode } from "../models/layout-config";
import { ImageService } from "../services/image-service";
import { LayoutResult } from "../utils/image-utils";

export class LayoutPanel {
  private container: HTMLElement;
  private layoutService: LayoutService;
  private imageService: ImageService;
  private onStartImport: (() => void) | null = null;
  private onLayoutChange: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    layoutService: LayoutService,
    imageService: ImageService
  ) {
    this.container = container;
    this.layoutService = layoutService;
    this.imageService = imageService;
  }

  setOnStartImport(callback: () => void): void {
    this.onStartImport = callback;
  }

  setOnLayoutChange(callback: () => void): void {
    this.onLayoutChange = callback;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="panel-section layout-section">
        <h3 class="panel-heading">
          <span class="heading-icon">🎨</span>
          Layout Controls
        </h3>

        <div class="layout-modes">
          <div class="mode-grid">
            ${this.renderModeButton("row", "Row", "Arrange images horizontally")}
            ${this.renderModeButton("column", "Column", "Arrange images vertically")}
            ${this.renderModeButton("grid", "Grid", "Grid arrangement")}
            ${this.renderModeButton("contact-sheet", "Contact", "Professional catalog")}
            ${this.renderModeButton("masonry", "Masonry", "Pinterest style")}
            ${this.renderModeButton("cell-anchored", "Anchored", "Attach to cells")}
          </div>
        </div>

        <div class="layout-options" id="layout-options">
          ${this.renderGridOptions()}
          ${this.renderSpacingOptions()}
          ${this.renderImageSizeOptions()}
          ${this.renderSortOptions()}
        </div>

        <div class="layout-preview" id="layout-preview">
          <div class="preview-placeholder">
            <p>Configure layout and select images to see preview</p>
          </div>
        </div>

        <div class="layout-summary" id="layout-summary"></div>

        <button class="btn btn-primary btn-block" id="btn-start-import" aria-label="Start importing images">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Import ${this.imageService.selectedCount > 0 ? `(${this.imageService.selectedCount} images)` : ""}
        </button>
      </div>
    `;

    this.bindEvents();
    this.updateLayoutPreview();
  }

  private renderModeButton(mode: LayoutMode, label: string, tip: string): string {
    const current = this.layoutService.config.mode;
    const isActive = current === mode;
    return `
      <button class="mode-btn ${isActive ? "active" : ""}" 
              data-mode="${mode}" 
              title="${tip}"
              aria-label="${label} layout mode"
              aria-pressed="${isActive}">
        <span class="mode-icon">${this.getModeIcon(mode)}</span>
        <span class="mode-label">${label}</span>
      </button>
    `;
  }

  private getModeIcon(mode: LayoutMode): string {
    const icons: Record<LayoutMode, string> = {
      "row": "⇄",
      "column": "⇅",
      "grid": "⊞",
      "contact-sheet": "📋",
      "masonry": "🔲",
      "cell-anchored": "📎",
    };
    return icons[mode];
  }

  private renderGridOptions(): string {
    return `
      <div class="option-group" id="grid-options">
        <label class="option-label">Grid Settings</label>
        <div class="option-row">
          <div class="option-field">
            <label for="grid-columns">Columns</label>
            <input type="number" id="grid-columns" value="${this.layoutService.config.grid.columns}" min="1" max="20" aria-label="Number of grid columns">
          </div>
          <div class="option-field">
            <label for="batch-size">Batch Size</label>
            <input type="number" id="batch-size" value="${this.layoutService.config.batchSize}" min="1" max="100" aria-label="Batch processing size">
          </div>
        </div>
      </div>
    `;
  }

  private renderSpacingOptions(): string {
    return `
      <div class="option-group">
        <label class="option-label">Spacing</label>
        <div class="option-row">
          <div class="option-field">
            <label for="spacing-h">Horizontal (px)</label>
            <input type="number" id="spacing-h" value="${this.layoutService.config.spacing.horizontal}" min="0" max="200" aria-label="Horizontal spacing">
          </div>
          <div class="option-field">
            <label for="spacing-v">Vertical (px)</label>
            <input type="number" id="spacing-v" value="${this.layoutService.config.spacing.vertical}" min="0" max="200" aria-label="Vertical spacing">
          </div>
        </div>
        <div class="option-row">
          <div class="option-field">
            <label for="start-cell">Start Cell</label>
            <input type="text" id="start-cell" value="${this.layoutService.config.cellAnchor.startCell}" placeholder="A1" aria-label="Start cell reference">
          </div>
        </div>
      </div>
    `;
  }

  private renderImageSizeOptions(): string {
    return `
      <div class="option-group">
        <label class="option-label">Image Size</label>
        <div class="option-row">
          <div class="option-field">
            <label for="max-width">Max Width (px)</label>
            <input type="number" id="max-width" value="${this.layoutService.config.imageSize.maxWidth || 400}" min="50" max="2000" aria-label="Maximum image width">
          </div>
          <div class="option-field">
            <label for="max-height">Max Height (px)</label>
            <input type="number" id="max-height" value="${this.layoutService.config.imageSize.maxHeight || 400}" min="50" max="2000" aria-label="Maximum image height">
          </div>
        </div>
        <div class="option-row">
          <label class="checkbox-label">
            <input type="checkbox" id="lock-aspect" ${this.layoutService.config.imageSize.lockAspectRatio ? "checked" : ""}>
            Lock Aspect Ratio
          </label>
          <label class="checkbox-label">
            <input type="checkbox" id="smart-resize" ${this.layoutService.config.imageSize.smartResize ? "checked" : ""}>
            Smart Resize
          </label>
        </div>
      </div>
    `;
  }

  private renderSortOptions(): string {
    return `
      <div class="option-group">
        <label class="option-label">Sort Options</label>
        <div class="option-row">
          <div class="option-field">
            <label for="sort-field-ctrl">Sort By</label>
            <select id="sort-field-ctrl" aria-label="Sort field">
              <option value="filename" ${this.layoutService.config.sort.field === "filename" ? "selected" : ""}>Filename</option>
              <option value="size" ${this.layoutService.config.sort.field === "size" ? "selected" : ""}>Size</option>
              <option value="resolution" ${this.layoutService.config.sort.field === "resolution" ? "selected" : ""}>Resolution</option>
              <option value="date" ${this.layoutService.config.sort.field === "date" ? "selected" : ""}>Date</option>
              <option value="custom" ${this.layoutService.config.sort.field === "custom" ? "selected" : ""}>Custom</option>
            </select>
          </div>
          <div class="option-field">
            <label>Direction</label>
            <div class="direction-buttons">
              <button class="btn btn-sm ${this.layoutService.config.sort.direction === "asc" ? "btn-primary" : "btn-outline"}" id="sort-asc" aria-label="Sort ascending">A→Z</button>
              <button class="btn btn-sm ${this.layoutService.config.sort.direction === "desc" ? "btn-primary" : "btn-outline"}" id="sort-desc" aria-label="Sort descending">Z→A</button>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents(): void {
    this.container.querySelectorAll(".mode-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        const mode = (btn as HTMLElement).dataset.mode as LayoutMode;
        this.layoutService.setMode(mode);
        this.container.querySelectorAll(".mode-btn").forEach((b) => {
          b.classList.remove("active");
          b.setAttribute("aria-pressed", "false");
        });
        btn.classList.add("active");
        btn.setAttribute("aria-pressed", "true");
        this.onLayoutChange?.();
        this.updateLayoutPreview();
      });
    });

    this.container.querySelector("#grid-columns")?.addEventListener("change", (e) => {
      this.layoutService.setGridColumns(parseInt((e.target as HTMLInputElement).value) || 4);
      this.onLayoutChange?.();
      this.updateLayoutPreview();
    });

    this.container.querySelector("#batch-size")?.addEventListener("change", (e) => {
      this.layoutService.setBatchSize(parseInt((e.target as HTMLInputElement).value) || 10);
    });

    this.container.querySelector("#spacing-h")?.addEventListener("change", (e) => {
      const h = parseInt((e.target as HTMLInputElement).value) || 10;
      const v = parseInt((this.container.querySelector("#spacing-v") as HTMLInputElement).value) || 10;
      this.layoutService.setSpacing(h, v);
      this.onLayoutChange?.();
      this.updateLayoutPreview();
    });

    this.container.querySelector("#spacing-v")?.addEventListener("change", (e) => {
      const h = parseInt((this.container.querySelector("#spacing-h") as HTMLInputElement).value) || 10;
      const v = parseInt((e.target as HTMLInputElement).value) || 10;
      this.layoutService.setSpacing(h, v);
      this.onLayoutChange?.();
      this.updateLayoutPreview();
    });

    this.container.querySelector("#start-cell")?.addEventListener("change", (e) => {
      this.layoutService.setStartCell((e.target as HTMLInputElement).value || "A1");
    });

    this.container.querySelector("#max-width")?.addEventListener("change", (e) => {
      const w = parseInt((e.target as HTMLInputElement).value) || 400;
      const h = parseInt((this.container.querySelector("#max-height") as HTMLInputElement).value) || 400;
      this.layoutService.setMaxImageSize(w, h);
      this.onLayoutChange?.();
      this.updateLayoutPreview();
    });

    this.container.querySelector("#max-height")?.addEventListener("change", (e) => {
      const w = parseInt((this.container.querySelector("#max-width") as HTMLInputElement).value) || 400;
      const h = parseInt((e.target as HTMLInputElement).value) || 400;
      this.layoutService.setMaxImageSize(w, h);
      this.onLayoutChange?.();
      this.updateLayoutPreview();
    });

    this.container.querySelector("#lock-aspect")?.addEventListener("change", (e) => {
      this.layoutService.setLockAspectRatio((e.target as HTMLInputElement).checked);
    });

    this.container.querySelector("#smart-resize")?.addEventListener("change", () => {
      this.layoutService.config.imageSize.smartResize = (this.container.querySelector("#smart-resize") as HTMLInputElement).checked;
    });

    this.container.querySelector("#sort-field-ctrl")?.addEventListener("change", (e) => {
      const field = (e.target as HTMLSelectElement).value as any;
      this.layoutService.setSort(field, this.layoutService.config.sort.direction);
      this.imageService.sort(field, this.layoutService.config.sort.direction);
      this.updateLayoutPreview();
    });

    this.container.querySelector("#sort-asc")?.addEventListener("click", () => {
      this.layoutService.setSort(this.layoutService.config.sort.field, "asc");
      (this.container.querySelector("#sort-asc") as HTMLButtonElement)?.classList.add("btn-primary");
      (this.container.querySelector("#sort-asc") as HTMLButtonElement)?.classList.remove("btn-outline");
      (this.container.querySelector("#sort-desc") as HTMLButtonElement)?.classList.remove("btn-primary");
      (this.container.querySelector("#sort-desc") as HTMLButtonElement)?.classList.add("btn-outline");
      this.updateLayoutPreview();
    });

    this.container.querySelector("#sort-desc")?.addEventListener("click", () => {
      this.layoutService.setSort(this.layoutService.config.sort.field, "desc");
      (this.container.querySelector("#sort-desc") as HTMLButtonElement)?.classList.add("btn-primary");
      (this.container.querySelector("#sort-desc") as HTMLButtonElement)?.classList.remove("btn-outline");
      (this.container.querySelector("#sort-asc") as HTMLButtonElement)?.classList.remove("btn-primary");
      (this.container.querySelector("#sort-asc") as HTMLButtonElement)?.classList.add("btn-outline");
      this.updateLayoutPreview();
    });

    this.container.querySelector("#btn-start-import")?.addEventListener("click", () => {
      if (this.imageService.selectedCount === 0) {
        this.showToast("No images selected for import", "error");
        return;
      }
      this.onStartImport?.();
    });
  }

  updateLayoutPreview(): void {
    const previewEl = this.container.querySelector("#layout-preview");
    const summaryEl = this.container.querySelector("#layout-summary");
    const images = this.imageService.selectedImages;

    if (!previewEl) return;

    if (images.length === 0) {
      previewEl.innerHTML = `
        <div class="preview-placeholder">
          <p>Select images to preview layout</p>
        </div>
      `;
      if (summaryEl) summaryEl.textContent = "";
      return;
    }

    const result = this.layoutService.calculate(images);

    previewEl.innerHTML = `
      <div class="layout-visualization">
        <canvas id="layout-canvas" width="${Math.min(result.totalWidth + 20, 600)}" height="${Math.min(result.totalHeight + 20, 400)}"></canvas>
      </div>
    `;

    if (summaryEl) {
      summaryEl.innerHTML = `
        <div class="summary-grid">
          <div class="summary-item">
            <span class="summary-label">Mode</span>
            <span class="summary-value">${this.layoutService.config.mode}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Images</span>
            <span class="summary-value">${images.length}</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Width</span>
            <span class="summary-value">${Math.round(result.totalWidth)}px</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Height</span>
            <span class="summary-value">${Math.round(result.totalHeight)}px</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Batch</span>
            <span class="summary-value">${this.layoutService.config.batchSize}/batch</span>
          </div>
          <div class="summary-item">
            <span class="summary-label">Batches</span>
            <span class="summary-value">${Math.ceil(images.length / this.layoutService.config.batchSize)}</span>
          </div>
        </div>
      `;
    }

    this.renderLayoutCanvas(result);
  }

  private renderLayoutCanvas(result: LayoutResult): void {
    const canvas = this.container.querySelector("#layout-canvas") as HTMLCanvasElement;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || canvas.width;
    const displayHeight = canvas.clientHeight || canvas.height;

    canvas.width = displayWidth * dpr;
    canvas.height = displayHeight * dpr;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, displayWidth, displayHeight);

    const cellSize = 40;
    const cols = Math.max(...result.images.map((p) => p.offsetCol + 1), 4);
    const rows = Math.max(...result.images.map((p) => p.offsetRow + 1), 4);
    const totalW = cols * cellSize;
    const totalH = rows * cellSize;
    const scaleX = (displayWidth - 20) / (totalW || 1);
    const scaleY = (displayHeight - 20) / (totalH || 1);
    const scale = Math.min(scaleX, scaleY, 1);
    const offsetX = (displayWidth - totalW * scale) / 2;
    const offsetY = (displayHeight - totalH * scale) / 2;

    ctx.fillStyle = "rgba(0, 0, 0, 0.03)";
    ctx.fillRect(0, 0, displayWidth, displayHeight);

    const colors = [
      "#0078D4", "#107C10", "#D13438", "#FF8C00",
      "#8661C5", "#00B7C3", "#E3008C", "#498205",
    ];

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        ctx.strokeStyle = "rgba(0,0,0,0.08)";
        ctx.lineWidth = 0.5;
        ctx.strokeRect(
          offsetX + c * cellSize * scale,
          offsetY + r * cellSize * scale,
          cellSize * scale,
          cellSize * scale
        );
      }
    }

    result.images.forEach((placed, index) => {
      const x = offsetX + placed.offsetCol * cellSize * scale + 2;
      const y = offsetY + placed.offsetRow * cellSize * scale + 2;
      const w = Math.max(cellSize * scale - 4, 4);
      const h = Math.max(cellSize * scale - 4, 4);

      ctx.fillStyle = colors[index % colors.length];
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = "rgba(255,255,255,0.5)";
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);

      if (w > 16 && h > 16) {
        ctx.fillStyle = "rgba(255,255,255,0.9)";
        ctx.font = `${Math.min(10, w * 0.5)}px sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(`${index + 1}`, x + w / 2, y + h / 2);
      }
    });
  }

  showToast(message: string, type: "success" | "error" | "info"): void {
    const existing = this.container.querySelector(".toast");
    existing?.remove();

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    toast.setAttribute("role", "alert");
    this.container.appendChild(toast);

    setTimeout(() => toast.remove(), 3000);
  }

  updateImportButton(): void {
    const btn = this.container.querySelector("#btn-start-import");
    if (btn) {
      btn.textContent = `Import ${this.imageService.selectedCount > 0 ? `(${this.imageService.selectedCount} images)` : ""}`;
    }
  }
}
