/**
 * DEV-only console wrapper.
 *
 * Replaces direct `console.log` / `console.info` / `console.debug` calls so
 * non-essential diagnostics stay out of production bundles' runtime output.
 * `console.warn` / `console.error` should keep using the native API since they
 * still surface in production for genuine problems.
 */
const isDev = import.meta.env.DEV;

export const devLog = {
  log: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.log(...args);
    }
  },
  info: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.info(...args);
    }
  },
  debug: (...args: unknown[]): void => {
    if (isDev) {
      // eslint-disable-next-line no-console
      console.debug(...args);
    }
  },
};
