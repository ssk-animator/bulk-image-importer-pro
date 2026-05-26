import { ImageService } from "../services/image-service";
import { ImageItem } from "../models/image-info";
import { SortField, SortDirection } from "../models/layout-config";

export class PreviewPanel {
  private container: HTMLElement;
  private imageService: ImageService;
  private searchQuery: string = "";
  private currentSortField: SortField = "filename";
  private currentSortDirection: SortDirection = "asc";
  private onSelectionChanged: (() => void) | null = null;
  private onReorder: ((fromIndex: number, toIndex: number) => void) | null = null;

  constructor(
    container: HTMLElement,
    imageService: ImageService
  ) {
    this.container = container;
    this.imageService = imageService;
  }

  setOnSelectionChanged(callback: () => void): void {
    this.onSelectionChanged = callback;
  }

  setOnReorder(callback: (fromIndex: number, toIndex: number) => void): void {
    this.onReorder = callback;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="panel-section preview-section">
        <h3 class="panel-heading">
          <span class="heading-icon">🖼️</span>
          Image Preview
        </h3>
        <div class="preview-toolbar">
          <div class="search-box">
            <svg class="search-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input type="text" id="preview-search" class="search-input" placeholder="Search images..." aria-label="Search images">
          </div>
          <div class="preview-actions">
            <button class="btn btn-sm btn-outline" id="btn-select-all" aria-label="Select all images">Select All</button>
            <button class="btn btn-sm btn-outline" id="btn-deselect-all" aria-label="Deselect all images">Deselect</button>
            <button class="btn btn-sm btn-danger" id="btn-delete-selected" aria-label="Delete selected images">Delete Selected</button>
          </div>
        </div>
        <div class="preview-sort">
          <label for="sort-field" class="sort-label">Sort by:</label>
          <select id="sort-field" class="sort-select" aria-label="Sort field">
            <option value="filename">Filename</option>
            <option value="size">Size</option>
            <option value="resolution">Resolution</option>
            <option value="date">Date</option>
            <option value="custom">Custom</option>
          </select>
          <button class="btn btn-sm btn-icon" id="btn-sort-direction" aria-label="Toggle sort direction">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <polyline points="19 12 12 19 5 12"/>
            </svg>
          </button>
        </div>
        <div class="preview-grid" id="preview-grid" role="list" aria-label="Image preview list">
          <div class="preview-empty">
            <p>No images loaded</p>
            <p class="text-muted">Import images to see previews</p>
          </div>
        </div>
        <div class="preview-footer">
          <span class="preview-count" id="preview-count">0 images</span>
          <span class="preview-selected" id="preview-selected">0 selected</span>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.container.querySelector("#preview-search")?.addEventListener("input", (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.refresh();
    });

    this.container.querySelector("#btn-select-all")?.addEventListener("click", () => {
      this.imageService.selectAll();
      this.onSelectionChanged?.();
      this.refresh();
    });

    this.container.querySelector("#btn-deselect-all")?.addEventListener("click", () => {
      this.imageService.deselectAll();
      this.onSelectionChanged?.();
      this.refresh();
    });

    this.container.querySelector("#btn-delete-selected")?.addEventListener("click", () => {
      if (this.imageService.selectedCount === 0) return;
      this.imageService.removeSelected();
      this.onSelectionChanged?.();
      this.refresh();
    });

    this.container.querySelector("#sort-field")?.addEventListener("change", (e) => {
      this.currentSortField = (e.target as HTMLSelectElement).value as SortField;
      this.imageService.sort(this.currentSortField, this.currentSortDirection);
      this.refresh();
    });

    this.container.querySelector("#btn-sort-direction")?.addEventListener("click", () => {
      this.currentSortDirection = this.currentSortDirection === "asc" ? "desc" : "asc";
      this.imageService.sort(this.currentSortField, this.currentSortDirection);
      this.refresh();
    });
  }

  refresh(): void {
    const grid = this.container.querySelector("#preview-grid");
    if (!grid) return;

    let images = this.searchQuery
      ? this.imageService.search(this.searchQuery)
      : [...this.imageService.images];

    this.imageService.sort(this.currentSortField, this.currentSortDirection);

    if (images.length === 0) {
      grid.innerHTML = `
        <div class="preview-empty">
          <p>${this.searchQuery ? "No images match your search" : "No images loaded"}</p>
          <p class="text-muted">${this.searchQuery ? "Try a different search term" : "Import images to see previews"}</p>
        </div>
      `;
    } else {
      grid.innerHTML = images
        .map(
          (img) => `
          <div class="preview-item ${img.selected ? "selected" : ""}" 
               data-id="${img.id}" 
               draggable="true"
               role="listitem"
               tabindex="0"
               aria-label="${img.metaData.filename}">
            <div class="preview-thumbnail">
              <img src="${img.thumbnailUrl}" alt="${img.metaData.filename}" loading="lazy"/>
              <div class="preview-check">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="${img.selected ? "currentColor" : "none"}" stroke="currentColor" stroke-width="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
                  <polyline points="22 4 12 14.01 9 11.01"/>
                </svg>
              </div>
            </div>
            <div class="preview-info">
              <span class="preview-filename" title="${img.metaData.filename}">${img.metaData.filename}</span>
              <span class="preview-details">${img.metaData.resolution} · ${img.metaData.fileSizeFormatted}</span>
            </div>
          </div>
        `
        )
        .join("");

      this.setupDragDrop(images);
      this.setupItemEvents();
    }

    this.updateCounts();
  }

  private setupDragDrop(images: ImageItem[]): void {
    const items = this.grid?.querySelectorAll(".preview-item");
    if (!items) return;
    items.forEach((item) => {
      item.addEventListener("dragstart", (e: Event) => {
        const de = e as DragEvent;
        de.dataTransfer?.setData("text/plain", (item as HTMLElement).dataset.id || "");
        item.classList.add("dragging");
      });

      item.addEventListener("dragend", () => {
        item.classList.remove("dragging");
        this.grid?.querySelectorAll(".preview-item").forEach((el) => el.classList.remove("drag-over"));
      });

      item.addEventListener("dragover", (e: Event) => {
        e.preventDefault();
        item.classList.add("drag-over");
      });

      item.addEventListener("dragleave", () => {
        item.classList.remove("drag-over");
      });

      item.addEventListener("drop", (e: Event) => {
        e.preventDefault();
        item.classList.remove("drag-over");
        const de = e as DragEvent;
        const fromId = de.dataTransfer?.getData("text/plain");
        const toId = (item as HTMLElement).dataset.id;
        if (fromId && toId && fromId !== toId) {
          const fromIndex = images.findIndex((img) => img.id === fromId);
          const toIndex = images.findIndex((img) => img.id === toId);
          if (fromIndex >= 0 && toIndex >= 0) {
            this.onReorder?.(fromIndex, toIndex);
            this.refresh();
          }
        }
      });
    });
  }

  private setupItemEvents(): void {
    this.grid?.querySelectorAll(".preview-item").forEach((item: Element) => {
      const clickHandler = () => {
        const id = (item as HTMLElement).dataset.id;
        if (id) {
          this.imageService.toggleSelection(id);
          this.onSelectionChanged?.();
          item.classList.toggle("selected");
          this.updateCounts();
        }
      };

      item.addEventListener("click", clickHandler);
      item.addEventListener("keydown", (e: Event) => {
        const ke = e as KeyboardEvent;
        if (ke.key === "Enter" || ke.key === " ") {
          e.preventDefault();
          clickHandler();
        }
      });
    });
  }

  private updateCounts(): void {
    const countEl = this.container.querySelector("#preview-count");
    const selectedEl = this.container.querySelector("#preview-selected");
    if (countEl) countEl.textContent = `${this.imageService.totalCount} images`;
    if (selectedEl) selectedEl.textContent = `${this.imageService.selectedCount} selected`;
  }

  private get grid(): HTMLElement | null {
    return this.container.querySelector("#preview-grid");
  }

  updateFromService(): void {
    this.refresh();
  }
}
