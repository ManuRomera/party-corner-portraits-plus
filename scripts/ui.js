/**
 * Party Corner Portraits +
 * Visibilidad de la interfaz de Foundry: la barra de macros y la lista de jugadores
 * pueden quedarse visibles, ocultarse del todo o aparecer al acercar el cursor.
 */

import { getConfig } from "./settings.js";

const MARGIN = 28;
const TARGETS = [
  { id: "hotbar", key: "hotbar" },
  { id: "players", key: "players" }
];

let listening = false;

function apply(target, mode) {
  const body = document.body;
  body.classList.toggle(`pcp-hide-${target.id}`, mode === "hide");
  body.classList.toggle(`pcp-auto-${target.id}`, mode === "hover");
  if (mode !== "hover") body.classList.remove(`pcp-peek-${target.id}`);
}

/** Muestra el elemento mientras el cursor esté sobre él o cerca de donde está. */
function peek(event) {
  const body = document.body;
  for (const { id } of TARGETS) {
    if (!body.classList.contains(`pcp-auto-${id}`)) continue;
    const element = document.getElementById(id);
    if (!element) continue;
    const rect = element.getBoundingClientRect();
    const margin = body.classList.contains(`pcp-peek-${id}`) ? MARGIN * 1.6 : MARGIN;
    const near =
      event.clientX >= rect.left - margin &&
      event.clientX <= rect.right + margin &&
      event.clientY >= rect.top - margin &&
      event.clientY <= rect.bottom + margin;
    body.classList.toggle(`pcp-peek-${id}`, near || element.contains(document.activeElement));
  }
}

export function applyUiConfig() {
  if (!game?.ready || !document.body) return;

  const config = getConfig();
  const replaced = config.players.enabled && config.players.hideCore;
  apply(TARGETS[0], config.ui.hotbar);
  apply(TARGETS[1], replaced ? "hide" : config.ui.players);

  if (!listening) {
    listening = true;
    for (const name of ["pointermove", "dragover"]) document.addEventListener(name, peek, { passive: true });
    document.addEventListener("focusin", () => peek({ clientX: -1e4, clientY: -1e4 }));
    document.addEventListener("pointerleave", () => {
      for (const { id } of TARGETS) document.body.classList.remove(`pcp-peek-${id}`);
    });
  }
}
