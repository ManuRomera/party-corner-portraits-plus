/**
 * Party Corner Portraits +
 * Shared constants and default data model.
 */

export const MODULE_ID = "party-corner-portraits-plus";
export const SETTING_CONFIG = "config";
export const SETTING_CLIENT = "client";

export const SIZE_MIN = 32;
export const SIZE_MAX = 320;
export const SIZE_PRESETS = [48, 64, 80, 86, 96, 120, 160, 200];

export const POSITIONS = ["top-left", "top-right", "bottom-left", "bottom-right"];
export const ORIENTATIONS = ["horizontal", "vertical"];
export const FRAME_MODES = ["full", "minimal", "none"];
export const IMAGE_FITS = ["cover", "contain"];
export const NAME_POSITIONS = ["overlay", "below", "hidden"];
export const BACKGROUND_MODES = ["dark", "transparent", "none"];
export const VISIBILITY_MODES = ["show", "hide", "hover"];
export const HOTBAR_OVERLAPS = ["shift", "front"];
export const BAR_POSITIONS = ["overlay", "below"];

export const DEFAULT_ACTOR = {
  x: 50,
  y: 50,
  zoom: 1,
  sortOrder: 0,
  size: null,
  fit: null,
  frame: null,
  borderColor: null,
  namePosition: null,
  playerLabel: "",
  media: "",
  bars: {}
};

/**
 * Automatic bar presets for a few popular systems. They are only used the
 * first time the module starts (or when the user explicitly restores the
 * preset), so a wrong guess is harmless.
 */
export const SYSTEM_BAR_PRESETS = {
  dnd5e: {
    label: "HP",
    valuePath: "system.attributes.hp.value",
    maxPath: "system.attributes.hp.max",
    color: "#4ade80"
  },
  pf2e: {
    label: "HP",
    valuePath: "system.attributes.hp.value",
    maxPath: "system.attributes.hp.max",
    color: "#4ade80"
  },
  coc7: {
    label: "HP",
    valuePath: "system.attributes.hp.value",
    maxPath: "system.attributes.hp.max",
    color: "#ef4444"
  },
  alien: {
    label: "Health",
    valuePath: "system.health.value",
    maxPath: "system.health.max",
    color: "#ef4444"
  },
  wod5e: {
    label: "Health",
    valuePath: "system.health.value",
    maxPath: "system.health.max",
    color: "#ef4444"
  },
  "cyberpunk-red-core": {
    label: "HP",
    valuePath: "system.derivedStats.hp.value",
    maxPath: "system.derivedStats.hp.max",
    color: "#ef4444"
  },
  swade: {
    label: "Wounds",
    valuePath: "system.wounds.value",
    maxPath: "system.wounds.max",
    color: "#f59e0b"
  },
  "fate-core-official": {
    label: "Stress",
    valuePath: "system.health.value",
    maxPath: "system.health.max",
    color: "#38bdf8"
  }
};

export function createDefaultConfig() {
  return {
    initialized: false,
    migrated: false,
    bar: {
      position: "bottom-left",
      orientation: "horizontal",
      offsetX: 16,
      offsetY: 16,
      gap: 8,
      size: 86,
      free: { enabled: false, x: 40, y: 40 }
    },
    appearance: {
      borderColor: "#dccdaf",
      borderWidth: 2,
      radius: 9,
      shadow: true,
      frame: "full",
      imageFit: "cover",
      namePosition: "overlay",
      nameColor: "#ffffff",
      background: "dark",
      grayscale: false,
      opacity: 1,
      hoverScale: 1.04
    },
    data: {
      showCharacterName: true,
      showPlayerName: true,
      showPlayerStatus: true,
      fields: [],
      bars: [],
      barPosition: "overlay",
      barHeight: 6
    },
    players: {
      enabled: false,
      hideCore: true,
      position: "top-left",
      offsetX: 16,
      offsetY: 16,
      showGM: true,
      showCharacter: true,
      showStatus: true,
      compact: true,
      title: ""
    },
    ui: {
      hotbar: "show",
      hotbarOverlap: "shift",
      players: "show"
    },
    order: [],
    actors: {}
  };
}

export function createDefaultClientConfig() {
  return {
    hidden: false,
    scale: 1,
    hideNames: false,
    hideBars: false,
    a11y: { text: 100, contrast: false, legible: false, motion: false }
  };
}

export function presetBars() {
  const preset = SYSTEM_BAR_PRESETS[game.system?.id];
  if (!preset) return [];
  return [
    {
      id: "hp",
      label: preset.label,
      valuePath: preset.valuePath,
      maxPath: preset.maxPath,
      max: 100,
      color: preset.color,
      showText: true,
      showMax: true
    }
  ];
}

export function isKnownPosition(value) {
  return POSITIONS.includes(value);
}

export function isKnownOrientation(value) {
  return ORIENTATIONS.includes(value);
}
