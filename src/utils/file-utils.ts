import { ImageItem, ImageMetaData, isImageFile, generateId, formatFileSize, getImageExtension, ImageDimensions } from "../models/image-info";

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.onabort = () => reject(new Error(`File read aborted: ${file.name}`));
    reader.readAsDataURL(file);
  });
}

export function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
    reader.readAsArrayBuffer(file);
  });
}

export function getImageDimensionsFromFile(file: File): Promise<ImageDimensions> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Failed to load image: ${file.name}`));
    };
    img.src = url;
  });
}

export async function processFiles(
  files: File[],
  onProgress?: (processed: number, total: number) => void
): Promise<ImageItem[]> {
  const validFiles = Array.from(files).filter(isImageFile);
  const items: ImageItem[] = [];

  for (let i = 0; i < validFiles.length; i++) {
    try {
      const file = validFiles[i];
      const dataUrl = await readFileAsDataUrl(file);
      const dimensions = await getImageDimensionsFromFile(file);
      const thumbnailUrl = await generateThumbnail(file, 200, 200);

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

      items.push({
        id: generateId(),
        file,
        dataUrl,
        thumbnailUrl,
        metaData,
        selected: true,
        sortOrder: i,
        imported: false,
        importError: null,
      });

      onProgress?.(i + 1, validFiles.length);
    } catch (err) {
      console.warn(`Skipping file ${validFiles[i].name}:`, err);
    }
  }

  return items;
}

export async function processFolder(files: File[]): Promise<File[]> {
  return Array.from(files).filter(isImageFile);
}

export async function generateThumbnail(
  dataUrlOrFile: string | File,
  maxWidth: number,
  maxHeight: number
): Promise<string> {
  let source: string;
  if (dataUrlOrFile instanceof File) {
    source = await readFileAsDataUrl(dataUrlOrFile);
  } else {
    source = dataUrlOrFile;
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Canvas context not available"));
        return;
      }

      let { width, height } = img;
      const ratio = Math.min(maxWidth / width, maxHeight / height, 1);
      width = Math.round(width * ratio);
      height = Math.round(height * ratio);

      canvas.width = width;
      canvas.height = height;
      ctx.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    img.onerror = () => reject(new Error("Thumbnail generation failed"));
    img.src = source;
  });
}

export function getFilesFromDataTransfer(
  items: DataTransferItemList
): File[] {
  const files: File[] = [];
  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.kind === "file") {
      const file = item.getAsFile();
      if (file) files.push(file);
    }
    if (item.kind === "string" && item.type === "text/plain") {
      item.getAsString(() => {});
    }
  }
  return files;
}

export function getFilesFromClipboard(
  clipboardItems: ClipboardItems
): File[] {
  const files: File[] = [];
  for (const item of clipboardItems) {
    for (const type of item.types) {
      if (type.startsWith("image/")) {
        item.getType(type).then((blob) => {
          const file = new File([blob], `clipboard_image.${type.split("/")[1]}`, { type });
          files.push(file);
        }).catch(console.error);
      }
    }
  }
  return files;
}
