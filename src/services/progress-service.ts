export type ProgressStatus = "idle" | "running" | "paused" | "completed" | "cancelled" | "error";

export interface ProgressState {
  status: ProgressStatus;
  total: number;
  completed: number;
  currentFile: string;
  percentage: number;
  elapsedMs: number;
  estimatedRemainingMs: number;
  errors: Array<{ index: number; filename: string; error: string }>;
}

export type ProgressCallback = (state: ProgressState) => void;

export class ProgressService {
  private _state: ProgressState;
  private _startTime: number = 0;
  private _pauseTime: number = 0;
  private _totalPausedMs: number = 0;
  private _listeners: Set<ProgressCallback> = new Set();
  private _intervalId: number | null = null;
  private _cancelRequested: boolean = false;

  constructor() {
    this._state = this.createIdleState();
  }

  private createIdleState(): ProgressState {
    return {
      status: "idle",
      total: 0,
      completed: 0,
      currentFile: "",
      percentage: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      errors: [],
    };
  }

  get state(): Readonly<ProgressState> {
    return { ...this._state };
  }

  get cancelToken(): { cancelled: boolean } {
    return { cancelled: this._cancelRequested };
  }

  onProgress(callback: ProgressCallback): () => void {
    this._listeners.add(callback);
    return () => this._listeners.delete(callback);
  }

  private emit(): void {
    for (const listener of this._listeners) {
      try {
        listener({ ...this._state });
      } catch {
        console.warn("Progress listener error");
      }
    }
  }

  start(total: number): void {
    this._cancelRequested = false;
    this._totalPausedMs = 0;
    this._startTime = Date.now();
    this._state = {
      status: "running",
      total,
      completed: 0,
      currentFile: "",
      percentage: 0,
      elapsedMs: 0,
      estimatedRemainingMs: 0,
      errors: [],
    };

    this._intervalId = window.setInterval(() => this.tick(), 100);
    this.emit();
  }

  private tick(): void {
    if (this._state.status !== "running") return;

    const now = Date.now();
    const elapsed = now - this._startTime - this._totalPausedMs;
    this._state.elapsedMs = elapsed;

    if (this._state.completed > 0) {
      const rate = this._state.completed / (elapsed || 1);
      const remaining = this._state.total - this._state.completed;
      this._state.estimatedRemainingMs = rate > 0 ? remaining / rate : 0;
    }

    this.emit();
  }

  updateProgress(completed: number, currentFile: string): void {
    this._state.completed = completed;
    this._state.currentFile = currentFile;
    this._state.percentage = this._state.total > 0
      ? Math.round((completed / this._state.total) * 100)
      : 0;
    this.emit();
  }

  addError(index: number, filename: string, error: string): void {
    this._state.errors.push({ index, filename, error });
    this.emit();
  }

  pause(): void {
    if (this._state.status !== "running") return;
    this._state.status = "paused";
    this._pauseTime = Date.now();
    this.emit();
  }

  resume(): void {
    if (this._state.status !== "paused") return;
    this._state.status = "running";
    this._totalPausedMs += Date.now() - this._pauseTime;
    this.emit();
  }

  cancel(): void {
    this._cancelRequested = true;
    this._state.status = "cancelled";
    this.cleanup();
    this.emit();
  }

  complete(): void {
    this._state.status = "completed";
    this._state.completed = this._state.total;
    this._state.percentage = 100;
    this.cleanup();
    this.emit();
  }

  fail(error: string): void {
    this._state.status = "error";
    this.addError(-1, "", error);
    this.cleanup();
    this.emit();
  }

  reset(): void {
    this._cancelRequested = false;
    this._totalPausedMs = 0;
    this._state = this.createIdleState();
    this.cleanup();
    this.emit();
  }

  get isPaused(): boolean {
    return this._state.status === "paused";
  }

  get isRunning(): boolean {
    return this._state.status === "running";
  }

  get isCancelled(): boolean {
    return this._state.status === "cancelled";
  }

  private cleanup(): void {
    if (this._intervalId !== null) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  formatTime(ms: number): string {
    if (ms <= 0) return "0s";
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
    }
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  }
}
