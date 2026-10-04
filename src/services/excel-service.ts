import { PlacedImage } from "../utils/image-utils";
import { clearAllImagesOnSheet } from "../utils/excel-utils";
import { ProgressService } from "./progress-service";

export type ImageInsertCallback = (completed: number, total: number, currentFile: string) => void;
export type ImageErrorCallback = (index: number, filename: string, error: string) => void;

export const SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

// Conservative ceiling for one Excel batch request (base64 characters).
// Bounds Base64 payload so a single request stays well under Excel API limits.
// An image that alone exceeds the ceiling is processed individually.
export const MAX_BATCH_PAYLOAD_CHARS = 4600000; // ~3.5 MB of binary payload

export interface ImportBenchmark {
  images: number;
  success: number;
  failed: number;
  totalMs: number;
  avgMsPerImage: number;
  batches: number;
  largestBatchPayloadChars: number;
}

function getFormatFromDataUrl(dataUrl: string): string {
  const match = dataUrl.match(/^data:image\/(\w+);base64,/);
  return match ? match[1].toLowerCase() : "png";
}

function stripBase64Prefix(dataUrl: string): string {
  return dataUrl.replace(/^data:image\/\w+;base64,/, "");
}

function convertToPngBase64(dataUrl: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Failed to get canvas context"));
        return;
      }
      ctx.drawImage(img, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => reject(new Error("Failed to decode image for conversion"));
    img.src = dataUrl;
  });
}

export class ExcelService {
  private _worksheet: Excel.Worksheet | null = null;

  get worksheet(): Excel.Worksheet | null {
    return this._worksheet;
  }

  async useActiveWorksheet(): Promise<Excel.Worksheet> {
    return Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      sheet.load("name");
      await context.sync();
      this._worksheet = sheet;
      return sheet;
    });
  }

  async insertImages(
    placedImages: PlacedImage[],
    batchSize: number,
    progressService: ProgressService,
    useCellImages: boolean = false
  ): Promise<{ success: number; failed: number; skipped: number }> {
    if (useCellImages) {
      return this.insertImagesAsCellImages(placedImages, batchSize, progressService);
    }
    return this.insertImagesAsShapes(placedImages, batchSize, progressService);
  }

  private async insertImagesAsShapes(
    placedImages: PlacedImage[],
    batchSize: number,
    progressService: ProgressService
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const startTime = Date.now();
    const batches = this.buildBatches(
      placedImages.map((p) => ({ placed: p, base64: stripBase64Prefix(p.item.dataUrl) })),
      Math.max(1, batchSize)
    );
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    let largestPayload = 0;

    for (const batch of batches) {
      if (progressService.isCancelled) break;
      if (progressService.isPaused) {
        await this.waitWhilePaused(progressService);
        if (progressService.isCancelled) break;
      }
      largestPayload = Math.max(largestPayload, batch.payloadChars);
      try {
        const ok = await this.insertShapeBatch(batch.items);
        successCount += ok;
        failedCount += batch.items.length - ok;
      } catch (err) {
        // Batch failed: retry each image individually so one bad payload
        // does not fail its healthy neighbours.
        for (const item of batch.items) {
          if (progressService.isCancelled) break;
          try {
            successCount += await this.insertShapeBatch([item]);
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error inserting image";
            console.error(`Failed to insert ${item.placed.item.metaData.filename}:`, msg);
            failedCount++;
            progressService.addError(
              successCount + failedCount + skippedCount,
              item.placed.item.metaData.filename,
              msg
            );
          }
        }
      }
      const totalProcessed = successCount + failedCount + skippedCount;
      progressService.updateProgress(
        totalProcessed,
        batch.items[batch.items.length - 1].placed.item.metaData.filename
      );
    }

    this.logBenchmark("shapes", placedImages.length, successCount, failedCount,
      Date.now() - startTime, batches.length, largestPayload);
    return { success: successCount, failed: failedCount, skipped: skippedCount };
  }

  // One Excel.run for a whole batch: add all shapes + load all cell geometry,
  // sync once, compute + set all geometry, sync once. Returns images placed.
  private async insertShapeBatch(
    items: Array<{ placed: PlacedImage; base64: string }>
  ): Promise<number> {
    if (items.length === 0) return 0;
    await Excel.run(async (context) => {
      const sheet = context.workbook.worksheets.getActiveWorksheet();
      const shapes = sheet.shapes;
      const created: Excel.Shape[] = [];
      const cells: Excel.Range[] = [];
      for (const item of items) {
        const shape = shapes.addImage(item.base64);
        shape.placement = Excel.Placement.twoCell;
        created.push(shape);
        const cell = sheet.getCell(item.placed.offsetRow, item.placed.offsetCol);
        cell.load("left,top,width,height");
        cells.push(cell);
      }
      await context.sync();
      for (let i = 0; i < items.length; i++) {
        const placed = items[i].placed;
        const cell = cells[i] as any;
        const cellWidth = cell.width as number;
        const cellHeight = cell.height as number;
        const fitScale = Math.min(cellWidth / placed.width, cellHeight / placed.height);
        created[i].left = (cell.left as number) + (cellWidth - placed.width * fitScale) / 2;
        created[i].top = (cell.top as number) + (cellHeight - placed.height * fitScale) / 2;
        created[i].width = placed.width * fitScale;
        created[i].height = placed.height * fitScale;
      }
      await context.sync();
    });
    return items.length;
  }

  private async insertImagesAsCellImages(
    placedImages: PlacedImage[],
    batchSize: number,
    progressService: ProgressService
  ): Promise<{ success: number; failed: number; skipped: number }> {
    const startTime = Date.now();
    // PNG conversion is canvas work outside Excel.run; do it up front so the
    // batch phase contains only Excel operations.
    const prepared: Array<{ placed: PlacedImage; base64: string }> = [];
    let failedCount = 0;
    for (const placed of placedImages) {
      if (progressService.isCancelled) break;
      try {
        let rawData = placed.item.dataUrl;
        if (getFormatFromDataUrl(rawData) !== "png") {
          rawData = await convertToPngBase64(rawData);
        }
        prepared.push({ placed, base64: stripBase64Prefix(rawData) });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error converting image";
        console.error(`Failed to prepare cell image ${placed.item.metaData.filename}:`, msg);
        failedCount++;
        progressService.addError(placedImages.indexOf(placed), placed.item.metaData.filename, msg);
      }
    }
    const batches = this.buildBatches(prepared, Math.max(1, batchSize));
    let successCount = 0;
    let skippedCount = 0;
    let largestPayload = 0;

    for (const batch of batches) {
      if (progressService.isCancelled) break;
      if (progressService.isPaused) {
        await this.waitWhilePaused(progressService);
        if (progressService.isCancelled) break;
      }
      largestPayload = Math.max(largestPayload, batch.payloadChars);
      try {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getActiveWorksheet();
          for (const item of batch.items) {
            const cell = sheet.getCell(item.placed.offsetRow, item.placed.offsetCol);
            (cell as any).valuesAsJson = [[{
              type: "LocalImage",
              image: { type: "PNG", data: item.base64 },
              altText: item.placed.item.metaData.filename,
            }]];
          }
          await context.sync();
        });
        successCount += batch.items.length;
      } catch (err) {
        for (const item of batch.items) {
          if (progressService.isCancelled) break;
          try {
            await Excel.run(async (context) => {
              const sheet = context.workbook.worksheets.getActiveWorksheet();
              const cell = sheet.getCell(item.placed.offsetRow, item.placed.offsetCol);
              (cell as any).valuesAsJson = [[{
                type: "LocalImage",
                image: { type: "PNG", data: item.base64 },
                altText: item.placed.item.metaData.filename,
              }]];
              await context.sync();
            });
            successCount++;
          } catch (e) {
            const msg = e instanceof Error ? e.message : "Unknown error inserting cell image";
            console.error(`Failed to insert cell image ${item.placed.item.metaData.filename}:`, msg);
            failedCount++;
            progressService.addError(
              successCount + failedCount + skippedCount,
              item.placed.item.metaData.filename,
              msg
            );
          }
        }
      }
      const totalProcessed = successCount + failedCount + skippedCount;
      progressService.updateProgress(
        totalProcessed,
        batch.items[batch.items.length - 1].placed.item.metaData.filename
      );
    }

    this.logBenchmark("cell-images", placedImages.length, successCount, failedCount,
      Date.now() - startTime, batches.length, largestPayload);
    return { success: successCount, failed: failedCount, skipped: skippedCount };
  }

  // Split items into batches bounded by item count AND Base64 payload size.
  // An item larger than the ceiling gets its own batch rather than failing.
  private buildBatches<T extends { base64: string }>(
    items: T[],
    batchSize: number
  ): Array<{ items: T[]; payloadChars: number }> {
    const batches: Array<{ items: T[]; payloadChars: number }> = [];
    let current: T[] = [];
    let currentChars = 0;
    const flush = () => {
      if (current.length > 0) {
        batches.push({ items: current, payloadChars: currentChars });
        current = [];
        currentChars = 0;
      }
    };
    for (const item of items) {
      const size = item.base64.length;
      if (size >= MAX_BATCH_PAYLOAD_CHARS) {
        flush();
        batches.push({ items: [item], payloadChars: size });
        continue;
      }
      if (current.length >= batchSize || currentChars + size > MAX_BATCH_PAYLOAD_CHARS) {
        flush();
      }
      current.push(item);
      currentChars += size;
    }
    flush();
    return batches;
  }

  // Developer benchmark log (console only, never production UI).
  private logBenchmark(
    mode: string,
    images: number,
    success: number,
    failed: number,
    totalMs: number,
    batches: number,
    largestPayload: number
  ): void {
    const avg = images > 0 ? Math.round((totalMs / images) * 10) / 10 : 0;
    console.info(
      `[BulkImageImporter] Import benchmark (${mode}) — ` +
      `Images: ${images}, Success: ${success}, Failures: ${failed}, ` +
      `Total: ${(totalMs / 1000).toFixed(1)}s, Average: ${avg}ms/image, ` +
      `Batches: ${batches}, Largest batch payload: ${(largestPayload / 1048576).toFixed(2)} MB base64`
    );
  }

  private waitWhilePaused(progressService: ProgressService): Promise<void> {
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (!progressService.isPaused) {
          clearInterval(check);
          resolve();
        }
      }, 200);
    });
  }

  async clearImages(): Promise<void> {
    if (!this._worksheet) return;
    await clearAllImagesOnSheet(this._worksheet);
  }

  async clearAllImages(): Promise<number> {
    return Excel.run(async (context) => {
      const sheets = context.workbook.worksheets;
      sheets.load("items");
      await context.sync();

      let count = 0;
      for (const sheet of sheets.items) {
        const shapes = sheet.shapes;
        shapes.load("items,type");
        await context.sync();
        const imageShapes = shapes.items.filter((s) => s.type === Excel.ShapeType.image);
        for (const shape of imageShapes) {
          shape.delete();
          count++;
        }
      }
      await context.sync();
      return count;
    });
  }

  async resizeAllImages(width: number, height: number, preserveAspect: boolean = true): Promise<void> {
    return Excel.run(async (context) => {
      if (!this._worksheet) {
        this._worksheet = context.workbook.worksheets.getActiveWorksheet();
        this._worksheet.load("name");
        await context.sync();
      }

      const shapes = this._worksheet.shapes;
      shapes.load("items,type,width,height");
      await context.sync();

      for (const shape of shapes.items) {
        if (shape.type === Excel.ShapeType.image) {
          if (preserveAspect) {
            const currentRatio = shape.width / shape.height;
            const newRatio = width / height;
            if (currentRatio > newRatio) {
              shape.width = width;
              shape.height = width / currentRatio;
            } else {
              shape.height = height;
              shape.width = height * currentRatio;
            }
          } else {
            shape.width = width;
            shape.height = height;
          }
        }
      }

      await context.sync();
    });
  }

  async deleteSelectedShapes(shapeNames: string[]): Promise<void> {
    return Excel.run(async (context) => {
      if (!this._worksheet) {
        this._worksheet = context.workbook.worksheets.getActiveWorksheet();
        this._worksheet.load("name");
        await context.sync();
      }
      const shapes = this._worksheet.shapes;

      for (const name of shapeNames) {
        try {
          const shape = shapes.getItem(name);
          shape.delete();
        } catch {
          console.warn(`Shape not found: ${name}`);
        }
      }

      await context.sync();
    });
  }

  async getExcelVersion(): Promise<string> {
    return Excel.run(async (context) => {
      const app = context.workbook.application;
      app.load("platform");
      await context.sync();
      return (app as any).platform || "Unknown";
    });
  }

  isOnline(): boolean {
    return (typeof Office !== "undefined" && Office.context?.requirements?.isSetSupported("ExcelApi", 1.1)) || false;
  }
}
