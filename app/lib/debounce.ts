export interface DebouncedTask<T> {
  schedule(value: T, task: (value: T) => void): void;
  cancel(): void;
}

export function createDebouncedTask<T>(delayMs: number): DebouncedTask<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  return {
    schedule(value, task) {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        timeout = undefined;
        task(value);
      }, delayMs);
    },
    cancel() {
      if (!timeout) return;
      clearTimeout(timeout);
      timeout = undefined;
    }
  };
}
