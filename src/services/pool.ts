import { logger } from "../logger.js";

export class Pool {
  private active = 0;
  private queue: Array<() => void> = [];

  constructor(private maxConcurrent: number) {}

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquireSlot();
    try {
      return await fn();
    } finally {
      this.releaseSlot();
    }
  }

  get queued(): number {
    return this.queue.length;
  }

  get running(): number {
    return this.active;
  }

  private acquireSlot(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      this.queue.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  private releaseSlot(): void {
    this.active--;
    if (this.queue.length > 0) {
      const next = this.queue.shift()!;
      next();
    }
  }
}
