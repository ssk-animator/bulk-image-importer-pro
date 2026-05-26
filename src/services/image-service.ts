import { ImageItem, ImageMetaData, isImageFile, generateId, formatFileSize, getImageExtension, ImageDimensions } from "../models/image-info";
import { LayoutConfig, SortField, SortDirection } from "../models/layout-config";
import { LayoutResult, calculateLayout } from "../utils/image-utils";
import { readFileAsDataUrl, generateThumbnail } from "../utils/file-utils";

export type ImageLoadProgressCallback = (loaded: number, total: number, currentFile: string) => void;

export class ImageService {
  private _images: ImageItem[] = [];
  private _selectedIds: Set<string> = new Set();

  get images(): ReadonlyArray<ImageItem> {
    return [...this._images];
  }

  get selectedImages(): ImageItem[] {
    return this._images.filter((img) => img.selected);
  }

  get totalCount(): number {
    return this._images.length;
  }

  get selectedCount(): number {
    return this.selectedImages.length;
  }

  get totalSize(): number {
    return this._images.reduce((sum, img) => sum + img.metaData.fileSize, 0);
  }

  get totalSizeFormatted(): string {
    return formatFileSize(this.totalSize);
  }

  getImage(id: string): ImageItem | undefined {
    return this._images.find((img) => img.id === id);
  }

  async loadImages(
    files: File[],
    onProgress?: ImageLoadProgressCallback
  ): Promise<ImageItem[]> {
    const validFiles = Array.from(files).filter(isImageFile);
    const newImages: ImageItem[] = [];

    for (let i = 0; i < validFiles.length; i++) {
      try {
        const file = validFiles[i];
        onProgress?.(i + 1, validFiles.length, file.name);

        const dataUrl = await readFileAsDataUrl(file);
        const dimensions = await this.getImageDimensions(file);
        const thumbnailUrl = await generateThumbnail(dataUrl, 200, 200);

        const metaData: ImageMetaData = {
          filename: file.name,
          extension: getImageExtension(file.name).toUpperCase(),
          resolution: dimensions ? `${dimensions.width} × ${dimensions.height}` : "Unknown",
          fileSize: file.size,
          fileSizeFormatted: formatFileSize(file.size),
          dateCreated: null,
          dateModified: new Date(file.lastModified),
          dimensions,
          exif: {},
        };

        newImages.push({
          id: generateId(),
          file,
          dataUrl,
          thumbnailUrl,
          metaData,
          selected: true,
          sortOrder: this._images.length + i,
          imported: false,
          importError: null,
        });
      } catch (err) {
        console.warn(`Failed to load ${validFiles[i].name}:`, err);
      }
    }

    this._images.push(...newImages);
    this._selectedIds = new Set(this._images.filter((img) => img.selected).map((img) => img.id));
    return newImages;
  }

  private getImageDimensions(file: File): Promise<ImageDimensions | null> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  }

  async loadFolder(files: File[]): Promise<ImageItem[]> {
    const imageFiles = Array.from(files).filter(isImageFile);
    return this.loadImages(imageFiles);
  }

  removeImages(ids: string[]): void {
    const idSet = new Set(ids);
    this._images = this._images.filter((img) => !idSet.has(img.id));
    for (const id of ids) {
      this._selectedIds.delete(id);
    }
  }

  removeSelected(): void {
    this.removeImages(this._images.filter((img) => img.selected).map((img) => img.id));
  }

  removeAll(): void {
    this._images = [];
    this._selectedIds.clear();
  }

  toggleSelection(id: string): void {
    const img = this._images.find((i) => i.id === id);
    if (img) {
      img.selected = !img.selected;
      if (img.selected) {
        this._selectedIds.add(id);
      } else {
        this._selectedIds.delete(id);
      }
    }
  }

  selectAll(): void {
    for (const img of this._images) {
      img.selected = true;
    }
    this._selectedIds = new Set(this._images.map((img) => img.id));
  }

  deselectAll(): void {
    for (const img of this._images) {
      img.selected = false;
    }
    this._selectedIds.clear();
  }

  sort(field: SortField, direction: SortDirection): void {
    this._images.sort((a, b) => {
      let comparison = 0;
      switch (field) {
        case "filename":
          comparison = a.metaData.filename.localeCompare(
            b.metaData.filename,
            undefined,
            { numeric: true, sensitivity: "base" }
          );
          break;
        case "size":
          comparison = a.metaData.fileSize - b.metaData.fileSize;
          break;
        case "resolution":
          comparison = this.compareResolution(a.metaData, b.metaData);
          break;
        case "date":
          comparison = this.compareDates(a.metaData, b.metaData);
          break;
        case "custom":
          comparison = a.sortOrder - b.sortOrder;
          break;
      }
      return direction === "asc" ? comparison : -comparison;
    });

    this._images.forEach((img, index) => {
      img.sortOrder = index;
    });
  }

  private compareResolution(a: ImageMetaData, b: ImageMetaData): number {
    const aPixels = a.dimensions ? a.dimensions.width * a.dimensions.height : 0;
    const bPixels = b.dimensions ? b.dimensions.width * b.dimensions.height : 0;
    return aPixels - bPixels;
  }

  private compareDates(a: ImageMetaData, b: ImageMetaData): number {
    const aTime = a.dateModified?.getTime() || 0;
    const bTime = b.dateModified?.getTime() || 0;
    return aTime - bTime;
  }

  moveImage(fromIndex: number, toIndex: number): void {
    if (
      fromIndex < 0 || fromIndex >= this._images.length ||
      toIndex < 0 || toIndex >= this._images.length
    ) return;

    const [moved] = this._images.splice(fromIndex, 1);
    this._images.splice(toIndex, 0, moved);
    this._images.forEach((img, index) => {
      img.sortOrder = index;
    });
  }

  search(query: string): ImageItem[] {
    const q = query.toLowerCase().trim();
    if (!q) return [...this._images];
    return this._images.filter((img) =>
      img.metaData.filename.toLowerCase().includes(q) ||
      img.metaData.extension.toLowerCase().includes(q) ||
      img.metaData.resolution.toLowerCase().includes(q)
    );
  }

  getImagesForImport(config: LayoutConfig): ImageItem[] {
    this.sort(config.sort.field, config.sort.direction);
    return this.selectedImages;
  }

  calculateLayout(images: ImageItem[], config: LayoutConfig): LayoutResult {
    return calculateLayout(images, config);
  }

  markImported(ids: string[]): void {
    const idSet = new Set(ids);
    for (const img of this._images) {
      if (idSet.has(img.id)) {
        img.imported = true;
      }
    }
  }

  getImportErrors(): Array<{ id: string; filename: string; error: string }> {
    return this._images
      .filter((img) => img.importError)
      .map((img) => ({ id: img.id, filename: img.metaData.filename, error: img.importError! }));
  }
}
