import { PlacedImage } from "../utils/image-utils";
import { clearAllImagesOnSheet } from "../utils/excel-utils";
import { ProgressService } from "./progress-service";

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type ImageInsertCallback = (completed: number, total: number, currentFile: string) => void;
export type ImageErrorCallback = (index: number, filename: string, error: string) => void;

export const SUPPORTED_FORMATS = ["jpg", "jpeg", "png", "webp", "bmp", "gif"];

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
    _batchSize: number,
    progressService: ProgressService
  ): Promise<{ success: number; failed: number; skipped: number }> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const IMPORT_DELAY_MS = 250;

    for (const placed of placedImages) {
      if (progressService.isCancelled) break;

      if (progressService.isPaused) {
        await this.waitWhilePaused(progressService);
        if (progressService.isCancelled) break;
      }

      const targetRow = placed.offsetRow;
      const targetCol = placed.offsetCol;

      try {
        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getActiveWorksheet();
          const shapes = sheet.shapes;

          const base64Data = stripBase64Prefix(placed.item.dataUrl);

          const shape = shapes.addImage(base64Data);
          shape.placement = Excel.Placement.twoCell;

          const cell = sheet.getCell(targetRow, targetCol);
          cell.load("left,top,width,height");
          await context.sync();
          if (progressService.isCancelled) return;

          const cellLeft = (cell as any).left;
          const cellTop = (cell as any).top;
          const cellWidth = (cell as any).width;
          const cellHeight = (cell as any).height;

          const fitScale = Math.min(
            cellWidth / placed.width,
            cellHeight / placed.height
          );

          const imgWidth = placed.width * fitScale;
          const imgHeight = placed.height * fitScale;

          shape.left = cellLeft + (cellWidth - imgWidth) / 2;
          shape.top = cellTop + (cellHeight - imgHeight) / 2;
          shape.width = imgWidth;
          shape.height = imgHeight;

          await context.sync();
        });

        if (progressService.isCancelled) break;

        successCount++;
        const totalProcessed = successCount + failedCount + skippedCount;
        progressService.updateProgress(totalProcessed, placed.item.metaData.filename);

        if (IMPORT_DELAY_MS > 0) {
          if (progressService.isCancelled) break;
          await sleep(IMPORT_DELAY_MS);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error inserting image";
        console.error(`Failed to insert ${placed.item.metaData.filename}:`, msg);
        failedCount++;
        progressService.addError(
          successCount + failedCount + skippedCount,
          placed.item.metaData.filename,
          msg
        );
      }
    }

    return { success: successCount, failed: failedCount, skipped: skippedCount };
  }

  private async insertImagesAsCellImages(
    placedImages: PlacedImage[],
    _batchSize: number,
    progressService: ProgressService
  ): Promise<{ success: number; failed: number; skipped: number }> {
    let successCount = 0;
    let failedCount = 0;
    let skippedCount = 0;
    const IMPORT_DELAY_MS = 250;

    for (const placed of placedImages) {
      if (progressService.isCancelled) break;

      if (progressService.isPaused) {
        await this.waitWhilePaused(progressService);
        if (progressService.isCancelled) break;
      }

      const targetRow = placed.offsetRow;
      const targetCol = placed.offsetCol;
      const filename = placed.item.metaData.filename;

      try {
        let rawData = placed.item.dataUrl;
        const fmt = getFormatFromDataUrl(rawData);

        if (fmt !== "png") {
          const pngDataUrl = await convertToPngBase64(rawData);
          rawData = pngDataUrl;
        }

        const base64 = stripBase64Prefix(rawData);
        const imageType = "PNG";

        await Excel.run(async (context) => {
          const sheet = context.workbook.worksheets.getActiveWorksheet();
          const cell = sheet.getCell(targetRow, targetCol);

          (cell as any).valuesAsJson = [[{
            type: "LocalImage",
            image: {
              type: imageType,
              data: base64,
            },
            altText: filename,
          }]];

          await context.sync();
        });

        if (progressService.isCancelled) break;

        successCount++;
        const totalProcessed = successCount + failedCount + skippedCount;
        progressService.updateProgress(totalProcessed, filename);

        if (IMPORT_DELAY_MS > 0) {
          if (progressService.isCancelled) break;
          await sleep(IMPORT_DELAY_MS);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error inserting cell image";
        console.error(`Failed to insert cell image ${filename}:`, msg);
        failedCount++;
        progressService.addError(
          successCount + failedCount + skippedCount,
          filename,
          msg
        );
      }
    }

    return { success: successCount, failed: failedCount, skipped: skippedCount };
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
