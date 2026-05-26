import { ImageService } from "./services/image-service";
import { SettingsService } from "./services/settings-service";
import { LayoutService } from "./services/layout-service";
import { ProgressService } from "./services/progress-service";
import { ExcelService } from "./services/excel-service";
import { ImportPanel } from "./components/import-panel";
import { PreviewPanel } from "./components/preview-panel";
import { LayoutPanel } from "./components/layout-panel";
import { ProgressPanel } from "./components/progress-panel";
import { SettingsPanel } from "./components/settings-panel";
import { ExportPanel } from "./components/export-panel";
import { PlacedImage } from "./utils/image-utils";

let imageService: ImageService;
let settingsService: SettingsService;
let layoutService: LayoutService;
let progressService: ProgressService;
let excelService: ExcelService;

let importPanel: ImportPanel;
let previewPanel: PreviewPanel;
let layoutPanel: LayoutPanel;
let progressPanel: ProgressPanel;
let settingsPanel: SettingsPanel;
let exportPanel: ExportPanel;

async function init(): Promise<void> {
  try {
    await Office.onReady();

    imageService = new ImageService();
    settingsService = new SettingsService();
    layoutService = new LayoutService();
    progressService = new ProgressService();
    excelService = new ExcelService();

    settingsService.applyTheme();

    if (settingsService.settings.defaultMaxWidth) {
      layoutService.setMaxImageSize(
        settingsService.settings.defaultMaxWidth,
        settingsService.settings.defaultMaxHeight
      );
    }
    if (settingsService.settings.defaultSpacingHorizontal) {
      layoutService.setSpacing(
        settingsService.settings.defaultSpacingHorizontal,
        settingsService.settings.defaultSpacingVertical
      );
    }
    if (settingsService.settings.defaultGridColumns) {
      layoutService.setGridColumns(settingsService.settings.defaultGridColumns);
    }
    if (settingsService.settings.defaultBatchSize) {
      layoutService.setBatchSize(settingsService.settings.defaultBatchSize);
    }
    if (settingsService.settings.defaultStartCell) {
      layoutService.setStartCell(settingsService.settings.defaultStartCell);
    }

    if (typeof Office.actions?.associate === "function") {
      Office.actions.associate("showTaskpane", () => {
        Office.addin?.showAsTaskpane?.();
      });
    }

    initUI();

    watchSystemTheme();
  } catch (err) {
    console.error("Initialization failed:", err);
    document.body.innerHTML = `
      <div style="padding:20px;color:#d13438;">
        <h2>Initialization Error</h2>
        <p>${err instanceof Error ? err.message : "Unknown error during initialization"}</p>
        <p>Please close and reopen the taskpane.</p>
      </div>
    `;
  }
}

function initUI(): void {
  importPanel = new ImportPanel(
    document.getElementById("import-panel")!,
    imageService
  );
  importPanel.render();
  importPanel.setOnImagesLoaded(() => {
    previewPanel.refresh();
    layoutPanel.updateImportButton();
    switchTab("preview");
  });

  previewPanel = new PreviewPanel(
    document.getElementById("preview-panel")!,
    imageService
  );
  previewPanel.render();
  previewPanel.setOnSelectionChanged(() => {
    layoutPanel.updateImportButton();
    layoutPanel.updateLayoutPreview();
  });
  previewPanel.setOnReorder((fromIndex, toIndex) => {
    imageService.moveImage(fromIndex, toIndex);
  });

  layoutPanel = new LayoutPanel(
    document.getElementById("layout-panel")!,
    layoutService,
    imageService
  );
  layoutPanel.render();
  layoutPanel.setOnStartImport(async () => {
    await executeImport();
  });
  layoutPanel.setOnLayoutChange(() => {
    layoutPanel.updateLayoutPreview();
  });

  progressPanel = new ProgressPanel(
    document.getElementById("progress-panel")!,
    progressService
  );
  progressPanel.render();

  settingsPanel = new SettingsPanel(
    document.getElementById("settings-panel")!,
    settingsService
  );
  settingsPanel.render();

  exportPanel = new ExportPanel(
    document.getElementById("export-panel")!,
    layoutService,
    settingsService
  );
  exportPanel.render();

  setupTabNavigation();
}

function setupTabNavigation(): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const tabName = btn.dataset.tab;
      if (tabName) switchTab(tabName);
    });

    btn.addEventListener("keydown", (e) => {
      const buttons = Array.from(tabButtons);
      const currentIndex = buttons.indexOf(btn);

      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % buttons.length;
        buttons[nextIndex].focus();
        buttons[nextIndex].click();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + buttons.length) % buttons.length;
        buttons[prevIndex].focus();
        buttons[prevIndex].click();
      } else if (e.key === "Home") {
        e.preventDefault();
        buttons[0].focus();
        buttons[0].click();
      } else if (e.key === "End") {
        e.preventDefault();
        buttons[buttons.length - 1].focus();
        buttons[buttons.length - 1].click();
      }
    });
  });
}

function switchTab(tabName: string): void {
  const tabButtons = document.querySelectorAll<HTMLButtonElement>(".tab-btn");
  const tabPanels = document.querySelectorAll<HTMLElement>(".tab-panel");

  tabButtons.forEach((btn) => {
    const isActive = btn.dataset.tab === tabName;
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-selected", String(isActive));
    btn.tabIndex = isActive ? 0 : -1;
  });

  tabPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === `tab-${tabName}`);
  });

  if (tabName === "preview") {
    previewPanel.refresh();
  }
  if (tabName === "layout") {
    layoutPanel.updateLayoutPreview();
    layoutPanel.updateImportButton();
  }
}

async function executeImport(): Promise<void> {
  const images = imageService.selectedImages;

  if (images.length === 0) {
    layoutPanel.showToast("No images selected", "error");
    return;
  }

  const config = layoutService.config;
  const result = layoutService.calculate(images);

  if (result.images.length === 0) {
    layoutPanel.showToast("No images to import", "error");
    return;
  }

  progressService.start(result.images.length);
  progressPanel.show();

  try {
    // Get selected cell as anchor
    const anchorCell = await Excel.run(async (context) => {
      const range = context.workbook.getSelectedRange();
      range.load("rowIndex,columnIndex");
      await context.sync();
      return { row: range.rowIndex, col: range.columnIndex };
    });

    await excelService.useActiveWorksheet();

    // Apply anchor cell offset to all placed images
    const cellPlacedImages: PlacedImage[] = result.images.map((placed) => ({
      ...placed,
      offsetRow: placed.offsetRow + anchorCell.row,
      offsetCol: placed.offsetCol + anchorCell.col,
    }));

    const insertResult = await excelService.insertImages(
      cellPlacedImages,
      config.batchSize,
      progressService,
      settingsService.settings.useLocalImageCellValue
    );

    if (!progressService.isCancelled) {
      progressService.complete();

      const ids = result.images.map((p) => p.item.id);
      imageService.markImported(ids);

      if (settingsService.settings.showThumbnailPreviews) {
        settingsService.addRecentFile(
          `Imported ${insertResult.success} images at ${new Date().toLocaleTimeString()}`
        );
      }

      const failPart = insertResult.failed > 0 ? ` | Failed: ${insertResult.failed}` : "";
      const skipPart = insertResult.skipped > 0 ? ` | Skipped: ${insertResult.skipped}` : "";
      if (insertResult.failed > 0) {
        layoutPanel.showToast(
          `Imported: ${insertResult.success}${failPart}${skipPart}`,
          "info"
        );
      } else {
        layoutPanel.showToast(`Successfully imported ${insertResult.success} images`, "success");
      }
    } else {
      layoutPanel.showToast("Import cancelled", "info");
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Import failed";
    progressService.fail(msg);
    layoutPanel.showToast(msg, "error");
    console.error("Import error:", err);
  }
}

function watchSystemTheme(): void {
  const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
  mediaQuery.addEventListener("change", () => {
    if (settingsService.settings.theme === "system") {
      settingsService.applyTheme();
    }
  });
}

init().catch(console.error);
