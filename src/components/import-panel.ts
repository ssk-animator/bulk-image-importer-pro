import { ImageService } from "../services/image-service";

export class ImportPanel {
  private container: HTMLElement;
  private imageService: ImageService;
  private fileInput: HTMLInputElement;
  private folderInput: HTMLInputElement;
  private dropZone: HTMLElement;
  private onImagesLoaded: (() => void) | null = null;

  constructor(
    container: HTMLElement,
    imageService: ImageService
  ) {
    this.container = container;
    this.imageService = imageService;
    this.fileInput = document.createElement("input");
    this.folderInput = document.createElement("input");
    this.dropZone = document.createElement("div");
  }

  setOnImagesLoaded(callback: () => void): void {
    this.onImagesLoaded = callback;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="panel-section import-section">
        <h3 class="panel-heading">
          <span class="heading-icon">📁</span>
          Import Images
        </h3>
        <div class="import-controls">
          <div class="drop-zone" id="import-dropzone" role="button" tabindex="0" aria-label="Drop zone for importing images">
            <div class="drop-zone-icon">
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
            </div>
            <p class="drop-zone-text">Drag and drop images here</p>
            <p class="drop-zone-subtext">or click to select files</p>
            <p class="drop-zone-formats">Supports: JPG, PNG, WEBP, BMP, GIF</p>
          </div>
          <div class="import-buttons">
            <button class="btn btn-primary" id="btn-select-files" aria-label="Select image files">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="18" x2="12" y2="12"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
              Select Files
            </button>
            <button class="btn btn-secondary" id="btn-select-folder" aria-label="Select image folder">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2v10z"/>
              </svg>
              Select Folder
            </button>
          </div>
          <div class="import-stats" id="import-stats" style="display:none;">
            <div class="stat-row">
              <span class="stat-label">Images:</span>
              <span class="stat-value" id="stat-count">0</span>
            </div>
            <div class="stat-row">
              <span class="stat-label">Total Size:</span>
              <span class="stat-value" id="stat-size">0 B</span>
            </div>
          </div>
        </div>
      </div>
    `;

    this.setupFileInputs();
    this.setupDropZone();
    this.bindEvents();
  }

  private setupFileInputs(): void {
    this.fileInput.type = "file";
    this.fileInput.multiple = true;
    this.fileInput.accept = ".jpg,.jpeg,.png,.webp,.bmp,.gif";
    this.fileInput.style.display = "none";
    this.fileInput.setAttribute("aria-label", "Select image files to import");
    this.container.appendChild(this.fileInput);

    this.folderInput.type = "file";
    this.folderInput.setAttribute("webkitdirectory", "");
    this.folderInput.setAttribute("directory", "");
    this.folderInput.multiple = true;
    (this.folderInput as any).allowdirs = true;
    this.folderInput.style.display = "none";
    this.folderInput.setAttribute("aria-label", "Select folder containing images");
    this.container.appendChild(this.folderInput);
  }

  private setupDropZone(): void {
    this.dropZone = this.container.querySelector("#import-dropzone")!;

    this.dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.add("drop-zone-active");
    });

    this.dropZone.addEventListener("dragleave", () => {
      this.dropZone.classList.remove("drop-zone-active");
    });

    this.dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.dropZone.classList.remove("drop-zone-active");
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleFiles(Array.from(files));
      }
    });

    this.dropZone.addEventListener("click", () => {
      this.fileInput.click();
    });

    this.dropZone.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        this.fileInput.click();
      }
    });
  }

  private bindEvents(): void {
    const selectFilesBtn = this.container.querySelector("#btn-select-files");
    const selectFolderBtn = this.container.querySelector("#btn-select-folder");

    selectFilesBtn?.addEventListener("click", () => {
      this.fileInput.click();
    });

    selectFolderBtn?.addEventListener("click", () => {
      this.folderInput.click();
    });

    this.fileInput.addEventListener("change", () => {
      if (this.fileInput.files && this.fileInput.files.length > 0) {
        this.handleFiles(Array.from(this.fileInput.files));
        this.fileInput.value = "";
      }
    });

    this.folderInput.addEventListener("change", () => {
      if (this.folderInput.files && this.folderInput.files.length > 0) {
        this.handleFiles(Array.from(this.folderInput.files));
        this.folderInput.value = "";
      }
    });

    document.addEventListener("paste", (e) => {
      const items = e.clipboardData?.items;
      if (items) {
        const imageFiles: File[] = [];
        for (const item of Array.from(items)) {
          if (item.type.startsWith("image/")) {
            const file = item.getAsFile();
            if (file) imageFiles.push(file);
          }
        }
        if (imageFiles.length > 0) {
          this.handleFiles(imageFiles);
        }
      }
    });
  }

  private async handleFiles(files: File[]): Promise<void> {
    const validFiles = files.filter((f) => f.type.startsWith("image/") || /\.(jpg|jpeg|png|webp|bmp|gif)$/i.test(f.name));
    if (validFiles.length === 0) {
      this.showToast("No valid image files found", "error");
      return;
    }

    this.showLoading(true);

    try {
      await this.imageService.loadImages(validFiles, (loaded, total, currentFile) => {
        this.updateLoadingStatus(`Loading: ${currentFile} (${loaded}/${total})`);
      });
      this.updateStats();
      this.onImagesLoaded?.();
      this.showToast(`${validFiles.length} images loaded successfully`, "success");
    } catch (err) {
      this.showToast("Failed to load images", "error");
      console.error(err);
    } finally {
      this.showLoading(false);
    }
  }

  private updateStats(): void {
    const statsEl = this.container.querySelector("#import-stats") as HTMLElement;
    const countEl = this.container.querySelector("#stat-count");
    const sizeEl = this.container.querySelector("#stat-size");

    if (statsEl) statsEl.style.display = "flex";
    if (countEl) countEl.textContent = String(this.imageService.totalCount);
    if (sizeEl) sizeEl.textContent = this.imageService.totalSizeFormatted;
  }

  private showLoading(show: boolean): void {
    const dropZone = this.container.querySelector(".drop-zone");
    if (dropZone) {
      dropZone.classList.toggle("loading", show);
      if (show) {
        const loadingEl = document.createElement("div");
        loadingEl.className = "loading-spinner";
        loadingEl.id = "import-loading-spinner";
        loadingEl.innerHTML = `
          <div class="spinner"></div>
          <span class="loading-text" id="loading-status">Loading images...</span>
        `;
        dropZone.appendChild(loadingEl);
      } else {
        const spinner = this.container.querySelector("#import-loading-spinner");
        spinner?.remove();
      }
    }
  }

  private updateLoadingStatus(text: string): void {
    const statusEl = this.container.querySelector("#loading-status");
    if (statusEl) statusEl.textContent = text;
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
