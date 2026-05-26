export type LayoutMode =
  | "row"
  | "column"
  | "grid"
  | "contact-sheet"
  | "masonry"
  | "cell-anchored";

export type SortField = "filename" | "date" | "size" | "resolution" | "custom";
export type SortDirection = "asc" | "desc";

export interface ImageSizeOptions {
  width: number | null;
  height: number | null;
  maxWidth: number | null;
  maxHeight: number | null;
  lockAspectRatio: boolean;
  cropToFit: boolean;
  fitWidth: boolean;
  fitHeight: boolean;
  useOriginalSize: boolean;
  smartResize: boolean;
}

export interface SpacingOptions {
  horizontal: number;
  vertical: number;
  padding: number;
  margins: number;
}

export interface GridOptions {
  columns: number;
  rows: number | null;
}

export interface CellAnchorOptions {
  startCell: string;
}

export interface FilenameDisplayOptions {
  show: boolean;
  position: "below" | "above" | "right" | "left";
  fontSize: number;
  fontColor: string;
}

export interface MetadataDisplayOptions {
  showFilename: boolean;
  showExtension: boolean;
  showResolution: boolean;
  showFileSize: boolean;
  showDateCreated: boolean;
  showDateModified: boolean;
  showExif: boolean;
}

export interface SortOptions {
  field: SortField;
  direction: SortDirection;
}

export interface ImportPreset {
  name: string;
  layoutMode: LayoutMode;
  imageSize: ImageSizeOptions;
  spacing: SpacingOptions;
  grid: GridOptions;
  cellAnchor: CellAnchorOptions;
  filenameDisplay: FilenameDisplayOptions;
  metadataDisplay: MetadataDisplayOptions;
  sort: SortOptions;
}

export class LayoutConfig {
  mode: LayoutMode = "grid";
  imageSize: ImageSizeOptions = {
    width: null,
    height: null,
    maxWidth: 400,
    maxHeight: 400,
    lockAspectRatio: true,
    cropToFit: false,
    fitWidth: false,
    fitHeight: false,
    useOriginalSize: false,
    smartResize: true,
  };
  spacing: SpacingOptions = {
    horizontal: 10,
    vertical: 10,
    padding: 5,
    margins: 5,
  };
  grid: GridOptions = {
    columns: 4,
    rows: null,
  };
  cellAnchor: CellAnchorOptions = {
    startCell: "A1",
  };
  filenameDisplay: FilenameDisplayOptions = {
    show: false,
    position: "below",
    fontSize: 10,
    fontColor: "#333333",
  };
  metadataDisplay: MetadataDisplayOptions = {
    showFilename: true,
    showExtension: false,
    showResolution: false,
    showFileSize: false,
    showDateCreated: false,
    showDateModified: false,
    showExif: false,
  };
  sort: SortOptions = {
    field: "filename",
    direction: "asc",
  };
  batchSize: number = 2;
  thumbnailWidth: number = 120;
  thumbnailHeight: number = 120;

  static createPreset(_name: string, overrides: Partial<LayoutConfig>): LayoutConfig {
    const config = new LayoutConfig();
    if (overrides.mode !== undefined) config.mode = overrides.mode;
    if (overrides.imageSize) Object.assign(config.imageSize, overrides.imageSize);
    if (overrides.spacing) Object.assign(config.spacing, overrides.spacing);
    if (overrides.grid) Object.assign(config.grid, overrides.grid);
    if (overrides.cellAnchor) Object.assign(config.cellAnchor, overrides.cellAnchor);
    if (overrides.filenameDisplay) Object.assign(config.filenameDisplay, overrides.filenameDisplay);
    if (overrides.metadataDisplay) Object.assign(config.metadataDisplay, overrides.metadataDisplay);
    if (overrides.sort) Object.assign(config.sort, overrides.sort);
    if (overrides.batchSize !== undefined) config.batchSize = overrides.batchSize;
    return config;
  }
}
