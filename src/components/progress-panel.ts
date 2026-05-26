import { ProgressService, ProgressState } from "../services/progress-service";

export class ProgressPanel {
  private container: HTMLElement;
  private progressService: ProgressService;

  constructor(container: HTMLElement, progressService: ProgressService) {
    this.container = container;
    this.progressService = progressService;
  }

  render(): void {
    this.container.innerHTML = `
      <div class="panel-section progress-section" id="progress-section" style="display:none;">
        <h3 class="panel-heading">
          <span class="heading-icon">⚡</span>
          Import Progress
        </h3>
        <div class="progress-container">
          <div class="progress-header">
            <span class="progress-title" id="progress-title">Importing images...</span>
            <span class="progress-percentage" id="progress-percentage">0%</span>
          </div>
          <div class="progress-bar-container" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100" id="progress-bar">
            <div class="progress-bar-fill" id="progress-bar-fill" style="width: 0%;"></div>
          </div>
          <div class="progress-details">
            <div class="progress-row">
              <span class="progress-label">Images:</span>
              <span class="progress-value" id="progress-count">0 / 0</span>
            </div>
            <div class="progress-row">
              <span class="progress-label">Current:</span>
              <span class="progress-value" id="progress-current">-</span>
            </div>
            <div class="progress-row">
              <span class="progress-label">Elapsed:</span>
              <span class="progress-value" id="progress-elapsed">0s</span>
            </div>
            <div class="progress-row">
              <span class="progress-label">Remaining:</span>
              <span class="progress-value" id="progress-remaining">-</span>
            </div>
          </div>
          <div class="progress-errors" id="progress-errors" style="display:none;">
            <h4 class="errors-title">Errors</h4>
            <div class="errors-list" id="errors-list"></div>
          </div>
          <div class="progress-actions" id="progress-actions">
            <button class="btn btn-secondary" id="btn-pause-resume" aria-label="Pause import">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"/>
                <rect x="14" y="4" width="4" height="16"/>
              </svg>
              Pause
            </button>
            <button class="btn btn-danger" id="btn-cancel" aria-label="Cancel import">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
              Cancel
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
    this.progressService.onProgress((state) => this.onProgressUpdate(state));
  }

  private bindEvents(): void {
    this.container.querySelector("#btn-pause-resume")?.addEventListener("click", () => {
      if (this.progressService.isPaused) {
        this.progressService.resume();
      } else {
        this.progressService.pause();
      }
    });

    this.container.querySelector("#btn-cancel")?.addEventListener("click", () => {
      this.progressService.cancel();
    });
  }

  private onProgressUpdate(state: ProgressState): void {
    const section = this.container.querySelector("#progress-section") as HTMLElement;

    if (state.status === "idle") {
      section.style.display = "none";
      return;
    }

    if (state.status === "running" || state.status === "paused" || state.status === "cancelled") {
      section.style.display = "block";
    }

    if (state.status === "completed") {
      section.style.display = "block";
      setTimeout(() => {
        section.style.display = "none";
      }, 5000);
    }

    const barFill = this.container.querySelector("#progress-bar-fill") as HTMLElement;
    const barContainer = this.container.querySelector("#progress-bar") as HTMLElement;
    const percentageEl = this.container.querySelector("#progress-percentage");
    const countEl = this.container.querySelector("#progress-count");
    const currentEl = this.container.querySelector("#progress-current");
    const elapsedEl = this.container.querySelector("#progress-elapsed");
    const remainingEl = this.container.querySelector("#progress-remaining");
    const titleEl = this.container.querySelector("#progress-title");
    const pauseBtn = this.container.querySelector("#btn-pause-resume");
    const errorsEl = this.container.querySelector("#progress-errors") as HTMLElement;
    const errorsList = this.container.querySelector("#errors-list");

    if (barFill) barFill.style.width = `${state.percentage}%`;
    if (barContainer) barContainer.setAttribute("aria-valuenow", String(state.percentage));
    if (percentageEl) percentageEl.textContent = `${state.percentage}%`;
    if (countEl) countEl.textContent = `${state.completed} / ${state.total}`;
    if (currentEl) currentEl.textContent = state.currentFile || "-";
    if (elapsedEl) elapsedEl.textContent = this.progressService.formatTime(state.elapsedMs);
    if (remainingEl) {
      remainingEl.textContent = state.status === "completed"
        ? "Complete"
        : state.estimatedRemainingMs > 0
          ? this.progressService.formatTime(state.estimatedRemainingMs)
          : "-";
    }

    if (titleEl) {
      switch (state.status) {
        case "running": titleEl.textContent = "Importing images..."; break;
        case "paused": titleEl.textContent = "Import paused"; break;
        case "cancelled": titleEl.textContent = "Import cancelled"; break;
        case "completed": titleEl.textContent = "Import complete!"; break;
        case "error": titleEl.textContent = "Import error"; break;
      }
    }

    if (pauseBtn) {
      if (state.status === "paused") {
        pauseBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
          Resume
        `;
      } else {
        pauseBtn.innerHTML = `
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <rect x="6" y="4" width="4" height="16"/>
            <rect x="14" y="4" width="4" height="16"/>
          </svg>
          Pause
        `;
      }
    }

    if (errorsEl && errorsList) {
      if (state.errors.length > 0) {
        errorsEl.style.display = "block";
        errorsList.innerHTML = state.errors
          .slice(-5)
          .map((e) => `<div class="error-item">${e.filename}: ${e.error}</div>`)
          .join("");
      }
    }

    if (state.status === "completed" || state.status === "cancelled" || state.status === "error") {
      const actions = this.container.querySelector("#progress-actions") as HTMLElement;
      if (actions) actions.style.display = "none";
    } else {
      const actions = this.container.querySelector("#progress-actions") as HTMLElement;
      if (actions) actions.style.display = "flex";
    }
  }

  hide(): void {
    const section = this.container.querySelector("#progress-section") as HTMLElement;
    if (section) section.style.display = "none";
  }

  show(): void {
    const section = this.container.querySelector("#progress-section") as HTMLElement;
    if (section) section.style.display = "block";
  }
}
