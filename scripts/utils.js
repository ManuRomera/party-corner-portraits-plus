/**
 * Party Corner Portraits +
 * Small helpers shared by every module.
 */

import { DEFAULT_ACTOR, IMAGE_FITS, NAME_POSITIONS, FRAME_MODES, SIZE_MAX, SIZE_MIN } from "./constants.js";

export function clamp(value, min, max, fallback) {
  if (value === null || value === undefined || value === "") return fallback;
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(max, Math.max(min, number));
}

export function clampSize(value, fallback = 86) {
  return clamp(value, SIZE_MIN, SIZE_MAX, fallback);
}

export function normalizeColor(value, fallback = "#dccdaf") {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : fallback;
}

export function normalizeColorOrNull(value) {
  const color = String(value ?? "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : null;
}

export function normalizeCssColor(value, fallback = "#4ade80") {
  const color = String(value ?? "").trim();
  if (!color) return fallback;
  return color;
}

export function isChecked(value) {
  return value === true || value === "true" || value === "on" || value === 1;
}

/**
 * Resolve a path inside an Actor. A leading "system." is optional, so users
 * can type "attributes.hp.value" instead of the full path.
 */
export function resolvePath(root, path) {
  const raw = String(path ?? "").trim();
  if (!raw) return undefined;

  const candidates = [raw];
  if (!/^(system|actor|flags|items|token)\./.test(raw)) candidates.push(`system.${raw}`);
  if (raw.startsWith("actor.")) candidates.push(raw.slice("actor.".length));

  for (const candidate of candidates) {
    const value = foundry.utils.getProperty(root, candidate);
    if (value !== undefined) return value;
  }
  return undefined;
}

export function resolveBarConfig(actorConfig, bar) {
  const override = actorConfig?.bars?.[bar.id] ?? {};
  return {
    valuePath: String(override.valuePath || bar.valuePath || "").trim(),
    maxPath: String(override.maxPath || bar.maxPath || "").trim(),
    max: override.max ?? bar.max
  };
}

export function numericValue(value) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const normalized = value.trim().replace(",", ".");
    if (!normalized) return null;
    const number = Number(normalized);
    return Number.isFinite(number) ? number : null;
  }
  return null;
}

export function formatNumber(value) {
  if (typeof value === "number") {
    if (Number.isInteger(value)) return String(value);
    return String(Math.round(value * 10) / 10);
  }
  return String(value ?? "");
}

export function formatFieldValue(value) {
  if (value === undefined || value === null) return "";
  if (typeof value === "boolean") return value ? "✓" : "✗";
  if (typeof value === "object") {
    if (Array.isArray(value)) return String(value.length);
    if ("value" in value) return formatFieldValue(value.value);
    if ("max" in value) return formatFieldValue(value.max);
    return "";
  }
  return String(value);
}

export function collectPaths(root, prefix = "", { maxDepth = 6, limit = 500 } = {}) {
  const paths = new Set();

  function walk(value, path, depth) {
    if (paths.size >= limit || depth > maxDepth || !value || typeof value !== "object") return;
    if (Array.isArray(value)) return;

    for (const [key, child] of Object.entries(value)) {
      if (key.startsWith("_")) continue;
      if (paths.size >= limit) break;
      const childPath = path ? `${path}.${key}` : key;
      if (child && typeof child === "object") {
        if (!Array.isArray(child)) walk(child, childPath, depth + 1);
      } else if (typeof child === "number" || typeof child === "string" || typeof child === "boolean") {
        if (typeof child === "string" && child.length > 80) continue;
        paths.add(childPath);
      }
    }
  }

  walk(root, prefix, 0);
  return [...paths];
}

export function getActorBarValues(actor, bar, actorConfig) {
  const resolved = resolveBarConfig(actorConfig, bar);
  const rawValue = resolvePath(actor, resolved.valuePath);
  if (rawValue === undefined || rawValue === null || rawValue === "") return null;

  const value = numericValue(rawValue);
  let max = numericValue(resolvePath(actor, resolved.maxPath));
  if (max === null || max <= 0) max = numericValue(resolved.max);
  if (max === null || max <= 0) max = 100;

  if (value === null) {
    // Non numeric values are still useful as a text readout.
    return {
      valueText: formatFieldValue(rawValue),
      maxText: formatNumber(max),
      percent: null,
      color: bar.color,
      hasBar: false
    };
  }

  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const color = bar.color === "auto" ? autoBarColor(percent) : normalizeCssColor(bar.color);

  return {
    valueText: formatNumber(value),
    maxText: formatNumber(max),
    percent,
    color,
    hasBar: true
  };
}

export function autoBarColor(percent) {
  const hue = Math.round((percent / 100) * 120);
  return `hsl(${hue} 72% 46%)`;
}

export function actorOwners(actor) {
  const users = game.users?.contents ?? [];
  let owners = users.filter(user => !user.isGM && actor.testUserPermission(user, "OWNER"));
  if (!owners.length) {
    owners = users.filter(user => !user.isGM && user.character?.id === actor.id);
  }
  return owners;
}

export function getActorPlayerLabel(actor, actorConfig) {
  const override = String(actorConfig?.playerLabel ?? "").trim();
  if (override) return override;
  return actorOwners(actor)
    .map(user => user.name)
    .join(", ");
}

export function isAnyOwnerActive(actor) {
  return actorOwners(actor).some(user => user.active);
}

export function getActorConfig(config, actorId) {
  return foundry.utils.mergeObject(foundry.utils.deepClone(DEFAULT_ACTOR), config?.actors?.[actorId] ?? {}, {
    inplace: false,
    insertKeys: true,
    insertValues: true,
    overwrite: true
  });
}

export function getActorFit(config, actorConfig) {
  const fit = actorConfig?.fit ?? config?.appearance?.imageFit ?? "cover";
  return IMAGE_FITS.includes(fit) ? fit : "cover";
}

export function getActorFrame(config, actorConfig) {
  const frame = actorConfig?.frame ?? config?.appearance?.frame ?? "full";
  return FRAME_MODES.includes(frame) ? frame : "full";
}

export function getActorNamePosition(config, actorConfig) {
  const position = actorConfig?.namePosition ?? config?.appearance?.namePosition ?? "overlay";
  return NAME_POSITIONS.includes(position) ? position : "overlay";
}

export function getActorBorderColor(config, actorConfig) {
  return actorConfig?.borderColor ?? config?.appearance?.borderColor ?? "#dccdaf";
}

export function escapeHTML(value) {
  return foundry.utils.escapeHTML(String(value ?? ""));
}

export function colorToCss(color) {
  if (!color) return "#999999";
  if (typeof color === "string") return color;
  return color.css ?? String(color);
}

export function deepClone(value) {
  return foundry.utils.deepClone(value);
}

export function sortActorsByOrder(config) {
  const order = Array.isArray(config?.order) ? config.order : [];
  return order.map(id => game.actors?.get(id)).filter(Boolean);
}

export function localize(key, data) {
  return game.i18n.format(key, data);
}

export function positionLabelKey(position) {
  switch (position) {
    case "top-left":
      return "PCP.Position.TopLeft";
    case "top-right":
      return "PCP.Position.TopRight";
    case "bottom-right":
      return "PCP.Position.BottomRight";
    default:
      return "PCP.Position.BottomLeft";
  }
}
