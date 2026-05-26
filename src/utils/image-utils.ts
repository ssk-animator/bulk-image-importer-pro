import { ImageItem, ImageDimensions } from "../models/image-info";
import { LayoutConfig, ImageSizeOptions } from "../models/layout-config";

export interface PlacedImage {
  item: ImageItem;
  offsetRow: number;
  offsetCol: number;
  width: number;
  height: number;
}

export interface LayoutResult {
  images: PlacedImage[];
  totalWidth: number;
  totalHeight: number;
}

export function calculateImageSize(
  originalDimensions: ImageDimensions | null,
  options: ImageSizeOptions,
  defaultWidth: number = 200,
  defaultHeight: number = 200
): { width: number; height: number } {
  if (options.useOriginalSize && originalDimensions) {
    return { width: originalDimensions.width, height: originalDimensions.height };
  }

  if (!originalDimensions) {
    return { width: defaultWidth, height: defaultHeight };
  }

  let width = options.width ?? defaultWidth;
  let height = options.height ?? defaultHeight;

  if (options.fitWidth) {
    const ratio = width / originalDimensions.width;
    height = originalDimensions.height * ratio;
    if (options.lockAspectRatio) {
      return { width, height: Math.round(height) };
    }
  }

  if (options.fitHeight) {
    const ratio = height / originalDimensions.height;
    width = originalDimensions.width * ratio;
    if (options.lockAspectRatio) {
      return { width: Math.round(width), height };
    }
  }

  if (options.lockAspectRatio) {
    const ratio = Math.min(
      width / originalDimensions.width,
      height / originalDimensions.height
    );
    width = originalDimensions.width * ratio;
    height = originalDimensions.height * ratio;
  }

  if (options.maxWidth && width > options.maxWidth) {
    const ratio = options.maxWidth / width;
    width = options.maxWidth;
    height *= ratio;
  }

  if (options.maxHeight && height > options.maxHeight) {
    const ratio = options.maxHeight / height;
    height = options.maxHeight;
    width *= ratio;
  }

  if (options.smartResize && originalDimensions) {
    if (width > originalDimensions.width) {
      width = originalDimensions.width;
      if (options.lockAspectRatio) {
        height = originalDimensions.height;
      }
    }
    if (height > originalDimensions.height) {
      height = originalDimensions.height;
      if (options.lockAspectRatio) {
        width = originalDimensions.width;
      }
    }
  }

  return { width: Math.round(width), height: Math.round(height) };
}

export function calculateRowLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const size = calculateImageSize(item.metaData.dimensions, config.imageSize);
    placed.push({
      item,
      offsetRow: 0,
      offsetCol: i,
      width: size.width,
      height: size.height,
    });
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateColumnLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const size = calculateImageSize(item.metaData.dimensions, config.imageSize);
    placed.push({
      item,
      offsetRow: i,
      offsetCol: 0,
      width: size.width,
      height: size.height,
    });
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateGridLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];
  const cols = config.grid.columns;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const sizes = calculateImageSize(item.metaData.dimensions, config.imageSize, 200, 150);
    const col = i % cols;
    const row = Math.floor(i / cols);

    placed.push({
      item,
      offsetRow: row,
      offsetCol: col,
      width: sizes.width,
      height: sizes.height,
    });
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateContactSheetLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];
  const cols = config.grid.columns || 4;
  const thumbnailSize = 150;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const col = i % cols;
    const row = Math.floor(i / cols);

    placed.push({
      item,
      offsetRow: row,
      offsetCol: col,
      width: thumbnailSize,
      height: thumbnailSize,
    });
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateMasonryLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];
  const cols = config.grid.columns || 4;
  const colHeights = new Array(cols).fill(0);

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const sizes = calculateImageSize(item.metaData.dimensions, config.imageSize, 200, 150);

    const shortestCol = colHeights.indexOf(Math.min(...colHeights));

    placed.push({
      item,
      offsetRow: colHeights[shortestCol],
      offsetCol: shortestCol,
      width: sizes.width,
      height: sizes.height,
    });

    colHeights[shortestCol] += sizes.height;
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateCellAnchoredLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  const placed: PlacedImage[] = [];
  const cols = config.grid.columns;

  for (let i = 0; i < images.length; i++) {
    const item = images[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const sizes = calculateImageSize(item.metaData.dimensions, config.imageSize, 200, 150);

    placed.push({
      item,
      offsetRow: row,
      offsetCol: col,
      width: sizes.width,
      height: sizes.height,
    });
  }

  return {
    images: placed,
    totalWidth: 0,
    totalHeight: 0,
  };
}

export function calculateLayout(
  images: ImageItem[],
  config: LayoutConfig
): LayoutResult {
  switch (config.mode) {
    case "row":
      return calculateRowLayout(images, config);
    case "column":
      return calculateColumnLayout(images, config);
    case "grid":
      return calculateGridLayout(images, config);
    case "contact-sheet":
      return calculateContactSheetLayout(images, config);
    case "masonry":
      return calculateMasonryLayout(images, config);
    case "cell-anchored":
      return calculateCellAnchoredLayout(images, config);
    default:
      return calculateGridLayout(images, config);
  }
}
