/**
 * Minimal logging utility.
 *
 * In development builds everything passes through to the console. In
 * production builds, log/warn are silenced; error always passes through so
 * crash-adjacent context is never lost.
 *
 * Use this instead of calling console.* directly.
 */
export const logger = {
  log: (...args: unknown[]): void => {
    if (__DEV__) console.log(...args);
  },
  warn: (...args: unknown[]): void => {
    if (__DEV__) console.warn(...args);
  },
  error: (...args: unknown[]): void => {
    console.error(...args);
  },
};
