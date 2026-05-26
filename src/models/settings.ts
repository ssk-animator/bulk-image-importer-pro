export type ThemeMode = "light" | "dark" | "system";

export interface UserSettings {
  theme: ThemeMode;
  defaultImageWidth: number | null;
  defaultImageHeight: number | null;
  defaultMaxWidth: number;
  defaultMaxHeight: number;
  defaultSpacingHorizontal: number;
  defaultSpacingVertical: number;
  defaultGridColumns: number;
  defaultLayoutMode: string;
  defaultBatchSize: number;
  defaultStartCell: string;
  showThumbnailPreviews: boolean;
  autoFitCells: boolean;
  preserveAspectRatio: boolean;
  showProgressPanel: boolean;
  useLocalImageCellValue: boolean;
  enableDarkMode: boolean;
  recentFiles: string[];
  savedPresets: string[];
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: "system",
  defaultImageWidth: null,
  defaultImageHeight: null,
  defaultMaxWidth: 400,
  defaultMaxHeight: 400,
  defaultSpacingHorizontal: 10,
  defaultSpacingVertical: 10,
  defaultGridColumns: 4,
  defaultLayoutMode: "grid",
  defaultBatchSize: 10,
  defaultStartCell: "A1",
  showThumbnailPreviews: true,
  autoFitCells: true,
  preserveAspectRatio: true,
  showProgressPanel: true,
  useLocalImageCellValue: true,
  enableDarkMode: false,
  recentFiles: [],
  savedPresets: [],
};
