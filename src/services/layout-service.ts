import { ImageItem } from "../models/image-info";
import { LayoutConfig, LayoutMode, SortField, SortDirection } from "../models/layout-config";
import { LayoutResult, calculateLayout } from "../utils/image-utils";

export class LayoutService {
  private _currentConfig: LayoutConfig;

  constructor() {
    this._currentConfig = new LayoutConfig();
  }

  get config(): LayoutConfig {
    return this._currentConfig;
  }

  setMode(mode: LayoutMode): void {
    this._currentConfig.mode = mode;
  }

  setGridColumns(columns: number): void {
    this._currentConfig.grid.columns = Math.max(1, Math.min(20, columns));
  }

  setGridRows(rows: number | null): void {
    this._currentConfig.grid.rows = rows;
  }

  setSpacing(horizontal: number, vertical: number): void {
    this._currentConfig.spacing.horizontal = Math.max(0, horizontal);
    this._currentConfig.spacing.vertical = Math.max(0, vertical);
  }

  setStartCell(cellRef: string): void {
    this._currentConfig.cellAnchor.startCell = cellRef;
  }

  setImageSize(width: number | null, height: number | null): void {
    this._currentConfig.imageSize.width = width;
    this._currentConfig.imageSize.height = height;
  }

  setMaxImageSize(maxWidth: number, maxHeight: number): void {
    this._currentConfig.imageSize.maxWidth = maxWidth;
    this._currentConfig.imageSize.maxHeight = maxHeight;
  }

  setLockAspectRatio(lock: boolean): void {
    this._currentConfig.imageSize.lockAspectRatio = lock;
  }

  setSort(field: SortField, direction: SortDirection): void {
    this._currentConfig.sort.field = field;
    this._currentConfig.sort.direction = direction;
  }

  setBatchSize(size: number): void {
    this._currentConfig.batchSize = Math.max(1, Math.min(100, size));
  }

  setFilenameDisplay(show: boolean, position: "below" | "above" | "right" | "left"): void {
    this._currentConfig.filenameDisplay.show = show;
    this._currentConfig.filenameDisplay.position = position;
  }

  applyConfig(config: Partial<LayoutConfig>): void {
    Object.assign(this._currentConfig, config);
  }

  loadPreset(config: LayoutConfig): void {
    this._currentConfig = { ...config };
  }

  calculate(images: ImageItem[]): LayoutResult {
    return calculateLayout(images, this._currentConfig);
  }

  getLayoutSummary(images: ImageItem[]): string {
    const result = this.calculate(images);
    return [
      `Layout: ${this._currentConfig.mode}`,
      `Images: ${images.length}`,
      `Dimensions: ${Math.round(result.totalWidth)} × ${Math.round(result.totalHeight)} px`,
      `Start cell: ${this._currentConfig.cellAnchor.startCell}`,
    ].join("\n");
  }

  getLayoutDescription(mode: LayoutMode): string {
    const descriptions: Record<LayoutMode, string> = {
      "row": "Images arranged horizontally in a single row",
      "column": "Images arranged vertically in a single column",
      "grid": "Images arranged in a grid with configurable columns and rows",
      "contact-sheet": "Professional contact sheet with thumbnails and metadata",
      "masonry": "Pinterest-style masonry layout with optimal spacing",
      "cell-anchored": "Images anchored to cells that move and resize with them",
    };
    return descriptions[mode] || "Unknown layout mode";
  }
}
