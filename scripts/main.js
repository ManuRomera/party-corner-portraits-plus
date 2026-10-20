/**
 * Party Corner Portraits +
 * Entry point: hooks, refresh wiring and menu events.
 */

import { MODULE_ID } from "./constants.js";
import { registerSettings, ensureInitialized } from "./settings.js";
import { renderHud } from "./hud.js";
import { renderPlayerList } from "./players.js";
import { applyUiConfig } from "./ui.js";
import { PartyPortraitsConfig, openConfigApp } from "./config-app.js";
import { openActorMenu, openHudMenu, openUserMenu } from "./actions.js";
import { onRefresh, refreshAll, refreshDebounced } from "./events.js";
import { closeMenus } from "./menu.js";

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
  registerSettings(PartyPortraitsConfig);
  wireMenuEvents();
});

Hooks.once("ready", async () => {
  try {
    await ensureInitialized();
  } catch (error) {
    console.error("Party Corner Portraits + | initialisation failed", error);
  }

  onRefresh(renderHud);
  onRefresh(renderPlayerList);
  onRefresh(applyUiConfig);

  refreshAll();

  game.partyCornerPortraitsPlus = {
    openConfig: openConfigApp,
    refresh: refreshAll,
    closeMenus
  };
});

Hooks.on("updateSetting", setting => {
  const key = settingKey(setting);
  if (key.startsWith(MODULE_ID)) refreshDebounced(30);
});

Hooks.on("updateActor", () => refreshDebounced(120));
Hooks.on("createActor", () => refreshDebounced(120));
Hooks.on("deleteActor", () => refreshDebounced(120));

Hooks.on("updateUser", () => refreshDebounced(80));
Hooks.on("userConnected", () => refreshDebounced(80));
Hooks.on("createUser", () => refreshDebounced(80));
Hooks.on("deleteUser", () => refreshDebounced(80));

Hooks.on("canvasReady", () => {
  applyUiConfig();
  renderHud();
});

Hooks.on("closeSettingsConfig", () => refreshAll());
