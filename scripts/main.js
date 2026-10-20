/**
 * Party Corner Portraits +
 * Entry point: hooks, refresh wiring and menu events.
 */

import { MODULE_ID } from "./constants.js";
import { registerSettings, ensureInitialized } from "./settings.js";
import { renderHud } from "./hud.js";
import { renderPlayerList } from "./players.js";
import { applyUiConfig, placeHotbar } from "./ui.js";
import { PartyPortraitsConfig, openConfigApp } from "./config-app.js";
import { openActorMenu, openHudMenu, openUserMenu } from "./actions.js";
import { onRefresh, refreshAll, refreshDebounced } from "./events.js";
import { closeMenus } from "./menu.js";
import { applyA11y } from "./a11y.js";
import { registerHoverSocket } from "./hover.js";
import { registerCountdown } from "./countdown.js";
import { ResetApp, confirmReset } from "./reset.js";
import * as studio from "./studio.js";
import { getConfig } from "./settings.js";

function wireMenuEvents() {
  window.addEventListener("pcp:actor-menu", event => {
    const detail = event.detail ?? {};
    openActorMenu(detail.actorId, detail);
  });

  window.addEventListener("pcp:hud-menu", event => {
    const detail = event.detail ?? {};
    openHudMenu(detail);
  });

  window.addEventListener("pcp:user-menu", event => {
    const detail = event.detail ?? {};
    openUserMenu(detail.userId, detail);
  });
}

function settingKey(setting) {
  if (!setting) return "";
  if (typeof setting.id === "string" && setting.id.includes(".")) return setting.id;
  if (setting.namespace) return `${setting.namespace}.${setting.key ?? ""}`;
  const key = String(setting.key ?? "");
  if (key === "config" || key === "client") return `${MODULE_ID}.${key}`;
  return key;
}

Hooks.once("init", () => {
  registerSettings(PartyPortraitsConfig, ResetApp);
  wireMenuEvents();
});

Hooks.once("ready", async () => {
  try {
    await ensureInitialized();
  } catch (error) {
    console.error("Party Corner Portraits + | initialisation failed", error);
  }

  registerHoverSocket();
  registerCountdown();
  // Primero las clases de la interfaz: el resto mide dónde está el panel original.
  onRefresh(applyUiConfig);
  onRefresh(applyA11y);
  onRefresh(renderPlayerList);
  onRefresh(renderHud);
  onRefresh(placeHotbar);
  onRefresh(studio.refreshStudio);

  refreshAll();
  // La interfaz de Foundry termina de colocarse después de «ready», y la lista de jugadores original
  // cambia de ancho cuando llegan los datos de latencia: se vuelve a colocar todo cuando cambian.
  window.setTimeout(refreshAll, 600);
  if (window.ResizeObserver) {
    const watcher = new ResizeObserver(() => refreshDebounced(80));
    for (const id of ["players", "scene-controls", "sidebar", "hotbar"]) {
      const element = document.getElementById(id);
      if (element) watcher.observe(element);
    }
  }

  game.partyCornerPortraitsPlus = {
    openConfig: openConfigApp,
    refresh: refreshAll,
    closeMenus,
    studio: studio.openStudio,
    reset: confirmReset,
    // API para macros: actúan sobre los ids indicados (por defecto, la selección del estudio)
    size: studio.setSize,
    scale: studio.scaleBy,
    equalize: studio.equalize,
    opacity: studio.setOpacity,
    glow: studio.setGlow,
    flip: studio.toggleFlip,
    rotate: studio.setRotation,
    countdown: studio.setCountdown,
    countdownStep: studio.stepCountdown,
    preset: studio.applyPreset,
    original: studio.restoreOriginal,
    undo: studio.undo
  };
});

Hooks.on("updateSetting", setting => {
  const key = settingKey(setting);
  if (key.startsWith(MODULE_ID)) refreshDebounced(30);
});

// Solo repinta si el cambio toca a un personaje de la barra (o aparece uno nuevo).
function inBar(actor) {
  return Boolean(actor && getConfig().order.includes(actor.id));
}
Hooks.on("updateActor", actor => inBar(actor) && refreshDebounced(120));
Hooks.on("createActor", () => refreshDebounced(120));
Hooks.on("deleteActor", () => refreshDebounced(120));

// Los valores derivados (CA, PG máximos…) cambian también al tocar objetos y efectos.
for (const hook of ["createItem", "updateItem", "deleteItem", "createActiveEffect", "updateActiveEffect", "deleteActiveEffect"]) {
  Hooks.on(hook, doc => {
    const actor = doc.parent?.documentName === "Actor" ? doc.parent : doc.parent?.parent;
    if (inBar(actor)) refreshDebounced(160);
  });
}

let resizeTimer = null;
window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(() => game?.ready && refreshAll(), 150);
});

Hooks.on("updateUser", () => refreshDebounced(80));
Hooks.on("userConnected", () => refreshDebounced(80));
Hooks.on("createUser", () => refreshDebounced(80));
Hooks.on("deleteUser", () => refreshDebounced(80));

Hooks.on("canvasReady", () => {
  applyUiConfig();
  renderHud();
});

Hooks.on("closeSettingsConfig", () => refreshAll());
