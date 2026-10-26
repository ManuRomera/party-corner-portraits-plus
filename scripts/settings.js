/**
 * Party Corner Portraits +
 * Settings registration and configuration normalisation.
 */

import {
  MODULE_ID,
  SETTING_CONFIG,
  SETTING_CLIENT,
  createDefaultConfig,
  createDefaultClientConfig,
  presetBars,
  isKnownPosition,
  isKnownOrientation,
  FRAME_MODES,
  IMAGE_FITS,
  NAME_POSITIONS,
  BACKGROUND_MODES,
  BAR_POSITIONS,
  VISIBILITY_MODES,
  HOTBAR_OVERLAPS,
  IMAGE_SOURCES,
  HOVER_SOURCES,
  HOVER_PLACEMENTS,
  HOVER_PERMISSIONS,
  SHEET_OPENS,
  SCENE_MODES,
  SIZE_MIN,
  SIZE_MAX
} from "./constants.js";
import {
  clamp,
  normalizeColor,
  normalizeCssColor,
  normalizeColorOrNull
} from "./utils.js";
import { refreshDebounced } from "./events.js";

function mergeDefaults(defaults, stored) {
  if (Array.isArray(defaults)) {
    return Array.isArray(stored) ? foundry.utils.deepClone(stored) : foundry.utils.deepClone(defaults);
  }

  const output = { ...defaults };
  if (!stored || typeof stored !== "object" || Array.isArray(stored)) return output;

  for (const [key, value] of Object.entries(stored)) {
    if (value === undefined) continue;
    if (Array.isArray(value)) {
      output[key] = foundry.utils.deepClone(value);
    } else if (
      value &&
      typeof value === "object" &&
      defaults[key] &&
      typeof defaults[key] === "object" &&
      !Array.isArray(defaults[key])
    ) {
      output[key] = mergeDefaults(defaults[key], value);
    } else {
      output[key] = value;
    }
  }

  return output;
}

function sanitizeBar(bar, index) {
  return {
    id: String(bar?.id || `bar-${index + 1}`),
    label: String(bar?.label ?? ""),
    valuePath: String(bar?.valuePath ?? ""),
    maxPath: String(bar?.maxPath ?? ""),
    max: clamp(bar?.max, 1, 1000000, 100),
    color: normalizeCssColor(bar?.color, "#4ade80"),
    showText: bar?.showText !== false,
    showMax: bar?.showMax !== false
  };
}

function sanitizeField(field) {
  return {
    label: String(field?.label ?? ""),
    path: String(field?.path ?? ""),
    suffix: String(field?.suffix ?? "")
  };
}

/** Aspecto visual de un personaje: transparencia, halo, giro, rotación y cuenta atrás. */
export function sanitizeLook(value) {
  const look = value && typeof value === "object" ? value : {};
  const glow = look.glow && typeof look.glow === "object" ? look.glow : null;
  const power = glow ? clamp(glow.power, 0, 100, 0) : 0;
  const countdown = look.countdown && typeof look.countdown === "object" ? look.countdown : null;
  return {
    opacity: look.opacity === null || look.opacity === undefined ? null : clamp(look.opacity, 0.1, 1, null),
    glow:
      glow && power > 0
        ? {
            color: normalizeColor(glow.color, "#7fe3ff"),
            power,
            alpha: clamp(glow.alpha, 0, 100, 85),
            soft: clamp(glow.soft, 0, 100, 60),
            pulse: Boolean(glow.pulse)
          }
        : null,
    flipX: Boolean(look.flipX),
    flipY: Boolean(look.flipY),
    rotation: clamp(look.rotation, -180, 180, 0),
    countdown:
      countdown && Number.isFinite(Number(countdown.turns))
        ? {
            turns: Math.trunc(clamp(countdown.turns, 0, 999, 0)),
            size: clamp(countdown.size, 0.5, 3, 1),
            mode: countdown.mode === "turn" ? "turn" : "round",
            warned: Boolean(countdown.warned)
          }
        : null
  };
}

function sanitizeActor(actorId, actor, index) {
  const value = actor && typeof actor === "object" ? actor : {};
  const bars = {};
  if (value.bars && typeof value.bars === "object") {
    for (const [barId, bar] of Object.entries(value.bars)) {
      bars[barId] = {
        valuePath: String(bar?.valuePath ?? ""),
        maxPath: String(bar?.maxPath ?? ""),
        max: clamp(bar?.max, 1, 1000000, 100)
      };
    }
  }

  return {
    x: clamp(value.x, 0, 100, 50),
    y: clamp(value.y, 0, 100, 50),
    zoom: clamp(value.zoom, 1, 4, 1),
    sortOrder: Math.trunc(clamp(value.sortOrder, -9999, 9999, index)),
    size: value.size === null || value.size === undefined || value.size === "" ? null : clamp(value.size, SIZE_MIN, SIZE_MAX, null),
    fit: IMAGE_FITS.includes(value.fit) ? value.fit : null,
    frame: FRAME_MODES.includes(value.frame) ? value.frame : null,
    borderColor: normalizeColorOrNull(value.borderColor),
    namePosition: NAME_POSITIONS.includes(value.namePosition) ? value.namePosition : null,
    playerLabel: String(value.playerLabel ?? ""),
    media: String(value.media ?? "").trim(),
    ...sanitizeLook(value),
    ...(() => {
      const h = sanitizeLook({
        opacity: value.hoverOpacity,
        glow: value.hoverGlow,
        flipX: value.hoverFlipX,
        flipY: value.hoverFlipY,
        rotation: value.hoverRotation
      });
      return {
        hoverSize: value.hoverSize === null || value.hoverSize === undefined ? null : clamp(value.hoverSize, 120, 1200, null),
        hoverOpacity: h.opacity,
        hoverGlow: h.glow,
        hoverFlipX: h.flipX,
        hoverFlipY: h.flipY,
        hoverRotation: h.rotation
      };
    })(),
    hoverSource: [...HOVER_SOURCES, "custom"].includes(value.hoverSource) ? value.hoverSource : null,
    hoverMedia: String(value.hoverMedia ?? "").trim(),
    hidden: Boolean(value.hidden),
    pinned: Boolean(value.pinned),
    tilt: clamp(value.tilt, -180, 180, 0),
    // Retrato suelto: centro en fracción de pantalla; null = dentro de la barra.
    float:
      value.float && typeof value.float === "object"
        ? { x: clamp(value.float.x, 0, 1, 0.5), y: clamp(value.float.y, 0, 1, 0.5) }
        : null,
    // Versión 1.2.0: un archivo propio sin origen elegido era «archivo propio».
    source:
      value.source === undefined
        ? String(value.media ?? "").trim() ? "custom" : null
        : IMAGE_SOURCES.includes(value.source) ? value.source : null,
    bars
  };
}

export function normalizeConfig(raw) {
  const merged = mergeDefaults(createDefaultConfig(), raw || {});

  merged.initialized = Boolean(merged.initialized);
  merged.migrated = Boolean(merged.migrated);

  merged.bar = merged.bar || {};
  merged.bar.position = isKnownPosition(merged.bar.position) ? merged.bar.position : "bottom-left";
  merged.bar.orientation = isKnownOrientation(merged.bar.orientation) ? merged.bar.orientation : "horizontal";
  merged.bar.offsetX = clamp(merged.bar.offsetX, 0, 2000, 16);
  merged.bar.offsetY = clamp(merged.bar.offsetY, 0, 2000, 16);
  // Un hueco negativo solapa los retratos como cartas apiladas.
  merged.bar.gap = clamp(merged.bar.gap, -120, 40, 8);
  merged.bar.size = clamp(merged.bar.size, SIZE_MIN, SIZE_MAX, 86);
  merged.bar.free = {
    enabled: Boolean(merged.bar.free?.enabled),
    x: clamp(merged.bar.free?.x, 0, 10000, 40),
    y: clamp(merged.bar.free?.y, 0, 10000, 40)
  };

  merged.appearance = merged.appearance || {};
  merged.appearance.borderColor = normalizeColor(merged.appearance.borderColor);
  merged.appearance.borderWidth = clamp(merged.appearance.borderWidth, 0, 10, 2);
  merged.appearance.radius = clamp(merged.appearance.radius, 0, 60, 9);
  merged.appearance.shadow = merged.appearance.shadow !== false;
  merged.appearance.frame = FRAME_MODES.includes(merged.appearance.frame) ? merged.appearance.frame : "full";
  merged.appearance.source = ["portrait", "token"].includes(merged.appearance.source) ? merged.appearance.source : "portrait";
  merged.appearance.imageFit = IMAGE_FITS.includes(merged.appearance.imageFit) ? merged.appearance.imageFit : "cover";
  merged.appearance.namePosition = NAME_POSITIONS.includes(merged.appearance.namePosition) ? merged.appearance.namePosition : "overlay";
  merged.appearance.nameColor = normalizeColor(merged.appearance.nameColor, "#ffffff");
  merged.appearance.background = BACKGROUND_MODES.includes(merged.appearance.background) ? merged.appearance.background : "dark";
  merged.appearance.grayscale = Boolean(merged.appearance.grayscale);
  merged.appearance.opacity = clamp(merged.appearance.opacity, 0.1, 1, 1);
  merged.appearance.hoverScale = clamp(merged.appearance.hoverScale, 1, 1.5, 1.04);

  merged.data = merged.data || {};
  merged.data.showCharacterName = merged.data.showCharacterName !== false;
  merged.data.showPlayerName = merged.data.showPlayerName !== false;
  merged.data.showPlayerStatus = merged.data.showPlayerStatus !== false;
  merged.data.barPosition = BAR_POSITIONS.includes(merged.data.barPosition) ? merged.data.barPosition : "overlay";
  merged.data.barHeight = clamp(merged.data.barHeight, 2, 24, 6);
  merged.data.showBars = merged.data.showBars !== false;
  merged.data.fields = (Array.isArray(merged.data.fields) ? merged.data.fields : []).map(sanitizeField);
  merged.data.bars = (Array.isArray(merged.data.bars) ? merged.data.bars : []).map(sanitizeBar);

  merged.hover = merged.hover || {};
  merged.hover.enabled = merged.hover.enabled !== false;
  merged.hover.delay = clamp(merged.hover.delay, 0, 3000, 350);
  merged.hover.source = HOVER_SOURCES.includes(merged.hover.source) ? merged.hover.source : "token";
  merged.hover.size = clamp(merged.hover.size, 120, 1200, 420);
  // «Junto al retrato» (1.4) cambió de sitio con cada personaje: ahora la posición es fija.
  merged.hover.placement = HOVER_PLACEMENTS.includes(merged.hover.placement) ? merged.hover.placement : "free";
  merged.hover.pos = {
    x: clamp(merged.hover.pos?.x, 0, 1, 0.5),
    y: clamp(merged.hover.pos?.y, 0, 1, 0.4)
  };
  merged.hover.permission = HOVER_PERMISSIONS.includes(merged.hover.permission) ? merged.hover.permission : "none";
  merged.hover.caption = merged.hover.caption !== false;
  merged.hover.box = merged.hover.box === true;
  merged.hover.sharp = merged.hover.sharp === true;
  merged.hover.sharedSeconds = clamp(merged.hover.sharedSeconds, 1, 60, 6);

  merged.players = merged.players || {};
  merged.players.enabled = merged.players.enabled === true;
  merged.players.hideCore = merged.players.hideCore !== false;
  merged.players.position = isKnownPosition(merged.players.position) ? merged.players.position : "top-left";
  merged.players.offsetX = clamp(merged.players.offsetX, 0, 2000, 16);
  merged.players.offsetY = clamp(merged.players.offsetY, 0, 2000, 16);
  merged.players.showGM = merged.players.showGM !== false;
  merged.players.showCharacter = merged.players.showCharacter !== false;
  merged.players.showStatus = merged.players.showStatus !== false;
  merged.players.compact = merged.players.compact !== false;
  merged.players.title = String(merged.players.title ?? "");

  merged.ui = merged.ui || {};
  // Versiones anteriores guardaban dos booleanos (hideHotbar / hidePlayers).
  const legacy = raw?.ui ?? {};
  const mode = (value, old) => (VISIBILITY_MODES.includes(value) ? value : old ? "hide" : "show");
  merged.ui = {
    hotbar: mode(raw?.ui?.hotbar, legacy.hideHotbar),
    players: mode(raw?.ui?.players, legacy.hidePlayers),
    openSheet: SHEET_OPENS.includes(raw?.ui?.openSheet) ? raw.ui.openSheet : "click",
    hotbarOverlap: HOTBAR_OVERLAPS.includes(raw?.ui?.hotbarOverlap) ? raw.ui.hotbarOverlap : "shift"
  };

  const actors = merged.actors && typeof merged.actors === "object" ? merged.actors : {};
  merged.actors = {};
  for (const [actorId, actor] of Object.entries(actors)) {
    merged.actors[actorId] = sanitizeActor(actorId, actor, Object.keys(merged.actors).length);
  }

  merged.scene = {
    mode: SCENE_MODES.includes(merged.scene?.mode) ? merged.scene.mode : "all",
    auto: merged.scene?.auto === true
  };
  merged.hiddenScenes = [...new Set((Array.isArray(merged.hiddenScenes) ? merged.hiddenScenes : []).filter(id => typeof id === "string" && id))];

  const order = Array.isArray(merged.order) ? merged.order : [];
  merged.order = [...new Set(order.filter(id => typeof id === "string" && id))];

  return merged;
}

export function normalizeClientConfig(raw) {
  const merged = mergeDefaults(createDefaultClientConfig(), raw || {});
  return {
    hidden: Boolean(merged.hidden),
    scale: clamp(merged.scale, 0.5, 2, 1),
    hideNames: Boolean(merged.hideNames),
    hideBars: Boolean(merged.hideBars),
    hoverOff: Boolean(merged.hoverOff),
    presets: (Array.isArray(merged.presets) ? merged.presets : [])
      .filter(preset => preset && typeof preset === "object" && String(preset.name ?? "").trim())
      .slice(0, 24)
      .map(preset => ({
        id: String(preset.id || foundry.utils.randomID()),
        name: String(preset.name).trim().slice(0, 40),
        size: preset.size === null || preset.size === undefined ? null : clamp(preset.size, SIZE_MIN, SIZE_MAX, null),
        look: sanitizeLook(preset.look)
      })),
    a11y: {
      text: clamp(merged.a11y?.text, 85, 160, 100),
      contrast: Boolean(merged.a11y?.contrast),
      legible: Boolean(merged.a11y?.legible),
      motion: Boolean(merged.a11y?.motion)
    }
  };
}

export function getConfig() {
  const stored = game.settings.get(MODULE_ID, SETTING_CONFIG) || {};
  const config = normalizeConfig(stored);

  // Seed a helpful bar for known systems on first run, without persisting it
  // until ensureInitialized() has stored the flag.
  if (!stored.initialized && !config.data.bars.length) {
    config.data.bars = presetBars();
  }

  return config;
}

export function saveConfig(config) {
  return game.settings.set(MODULE_ID, SETTING_CONFIG, normalizeConfig(config));
}

export async function mutateConfig(mutator) {
  const config = getConfig();
  await mutator(config);
  return saveConfig(config);
}

export function getClientConfig() {
  try {
    return normalizeClientConfig(game.settings.get(MODULE_ID, SETTING_CLIENT));
  } catch {
    return normalizeClientConfig(createDefaultClientConfig());
  }
}

export function saveClientConfig(config) {
  return game.settings.set(MODULE_ID, SETTING_CLIENT, normalizeClientConfig(config));
}

export async function mutateClientConfig(mutator) {
  const config = getClientConfig();
  await mutator(config);
  return saveClientConfig(config);
}

export async function ensureInitialized() {
  if (!game.user?.isGM) return;

  const raw = game.settings.get(MODULE_ID, SETTING_CONFIG) || {};
  if (raw.initialized && !raw.migrated) {
    // 1.1.1: la lista de jugadores original se queda en su sitio salvo que se pida lo contrario.
    const config = normalizeConfig(raw);
    config.migrated = true;
    config.players.enabled = false;
    await game.settings.set(MODULE_ID, SETTING_CONFIG, config);
    return;
  }
  if (raw.initialized) return;

  const config = normalizeConfig(raw);
  config.initialized = true;
  config.migrated = true;
  if (!config.data.bars.length) config.data.bars = presetBars();
  if (!config.order.length) {
    // On first run, pre-select player-owned actors so the bar is not empty.
    const owned = game.actors.contents.filter(actor => {
      if (actor.type !== "character") return false;
      return game.users.some(user => !user.isGM && actor.testUserPermission(user, "OWNER"));
    });
    config.order = owned.map(actor => actor.id);
    for (const actor of owned) {
      if (!config.actors[actor.id]) {
        config.actors[actor.id] = sanitizeActor(actor.id, {}, config.order.indexOf(actor.id));
      }
    }
    // If there are no player-owned actors yet, show nothing instead of every NPC.
  }

  await game.settings.set(MODULE_ID, SETTING_CONFIG, config);
}

export function registerSettings(ConfigApplication, ResetApplication) {
  game.settings.register(MODULE_ID, SETTING_CONFIG, {
    name: "PCP.Settings.Config.Name",
    hint: "PCP.Settings.Config.Hint",
    scope: "world",
    config: false,
    type: Object,
    default: createDefaultConfig(),
    onChange: () => refreshDebounced(30)
  });

  game.settings.register(MODULE_ID, SETTING_CLIENT, {
    name: "PCP.Settings.Client.Name",
    hint: "PCP.Settings.Client.Hint",
    scope: "client",
    config: false,
    type: Object,
    default: createDefaultClientConfig(),
    onChange: () => refreshDebounced(30)
  });

  game.settings.registerMenu(MODULE_ID, "configuration", {
    name: game.i18n.localize("PCP.Settings.Menu.Name"),
    label: game.i18n.localize("PCP.Settings.Menu.Label"),
    hint: game.i18n.localize("PCP.Settings.Menu.Hint"),
    icon: "fa-solid fa-users-viewfinder",
    type: ConfigApplication,
    restricted: true
  });

  game.settings.registerMenu(MODULE_ID, "reset", {
    name: game.i18n.localize("PCP.Reset.MenuName"),
    label: game.i18n.localize("PCP.Reset.MenuLabel"),
    hint: game.i18n.localize("PCP.Reset.MenuHint"),
    icon: "fa-solid fa-rotate-left",
    type: ResetApplication,
    restricted: true
  });
}

