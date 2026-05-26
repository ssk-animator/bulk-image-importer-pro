export type ImageFormat = "jpg" | "jpeg" | "png" | "webp" | "bmp" | "gif";

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageMetaData {
  filename: string;
  extension: string;
  resolution: string;
  fileSize: number;
  fileSizeFormatted: string;
  dateCreated: Date | null;
  dateModified: Date | null;
  dimensions: ImageDimensions | null;
  exif: Record<string, string>;
}

export interface ImageItem {
  id: string;
  file: File;
  dataUrl: string;
  thumbnailUrl: string;
  metaData: ImageMetaData;
  selected: boolean;
  sortOrder: number;
  imported: boolean;
  importError: string | null;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function getImageExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  const valid: string[] = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];
  return valid.includes(ext) ? ext : "";
}

export function isImageFile(file: File): boolean {
  const ext = getImageExtension(file.name);
  return ext !== "" || file.type.startsWith("image/");
}

export function generateId(): string {
  return `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}
