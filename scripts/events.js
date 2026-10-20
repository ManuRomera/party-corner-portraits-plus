/**
 * Party Corner Portraits +
 * Tiny refresh bus used to keep modules decoupled.
 */

const handlers = new Set();
let scheduled = false;

export function onRefresh(handler) {
  handlers.add(handler);
  return () => handlers.delete(handler);
}

export function refreshAll() {
  for (const handler of handlers) {
    try {
      handler();
    } catch (error) {
      console.error("Party Corner Portraits + | refresh handler failed", error);
    }
  }
}

export function refreshDebounced(delay = 80) {
  if (scheduled) return;
  scheduled = true;
  window.setTimeout(() => {
    scheduled = false;
    refreshAll();
  }, delay);
}

export function dispatchMenuEvent(name, detail) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}
