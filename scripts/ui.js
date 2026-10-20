/**
 * Party Corner Portraits +
 * Applies global interface toggles (hotbar / core player list).
 */

import { getConfig } from "./settings.js";

export function applyUiConfig() {
  if (!game?.ready || !document.body) return;

  const config = getConfig();
  const body = document.body;

  body.classList.toggle("pcp-hide-hotbar", Boolean(config.ui.hideHotbar));
  body.classList.toggle(
    "pcp-hide-core-players",
    Boolean(config.players.enabled && config.players.hideCore)
  );
}
