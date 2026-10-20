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
    bars
  };
}

export function normalizeConfig(raw) {
  const merged = mergeDefaults(createDefaultConfig(), raw || {});

  merged.initialized = Boolean(merged.initialized);

  merged.bar = merged.bar || {};
  merged.bar.position = isKnownPosition(merged.bar.position) ? merged.bar.position : "bottom-left";
  merged.bar.orientation = isKnownOrientation(merged.bar.orientation) ? merged.bar.orientation : "horizontal";
  merged.bar.offsetX = clamp(merged.bar.offsetX, 0, 2000, 16);
  merged.bar.offsetY = clamp(merged.bar.offsetY, 0, 2000, 16);
  merged.bar.gap = clamp(merged.bar.gap, 0, 40, 8);
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
  merged.data.fields = (Array.isArray(merged.data.fields) ? merged.data.fields : []).map(sanitizeField);
  merged.data.bars = (Array.isArray(merged.data.bars) ? merged.data.bars : []).map(sanitizeBar);

  merged.players = merged.players || {};
  merged.players.enabled = merged.players.enabled !== false;
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
  merged.ui.hideHotbar = Boolean(merged.ui.hideHotbar);

  const actors = merged.actors && typeof merged.actors === "object" ? merged.actors : {};
  merged.actors = {};
  for (const [actorId, actor] of Object.entries(actors)) {
    merged.actors[actorId] = sanitizeActor(actorId, actor, Object.keys(merged.actors).length);
  }

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
  if (raw.initialized) return;

  const config = normalizeConfig(raw);
  config.initialized = true;
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

export function registerSettings(ConfigApplication) {
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
}

