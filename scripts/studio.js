/**
 * Party Corner Portraits +
 * Estudio de retratos: panel en vivo para tamaño, transparencia, halo, giro, rotación, encuadre,
 * presets, copiar/pegar, deshacer, focus/spotlight y cuenta atrás. Inspirado en MR Token Stage.
 * Arrastrar un control cambia los retratos al instante; se guarda al soltar.
 */

import { DEFAULT_GLOW, SIZE_MAX, SIZE_MIN } from "./constants.js";
import {
  getClientConfig,
  getConfig,
  mutateClientConfig,
  mutateConfig,
  sanitizeLook
} from "./settings.js";
import { clampSize, getActorConfig, localize } from "./utils.js";
import { refreshAll } from "./events.js";
import { WithMemory } from "./memory.js";
import { addA11yButton } from "./a11y.js";
import { applyLook, focusState, setFocus } from "./look.js";
import { isVideo, portraitSource } from "./media.js";
import { hideHover, refreshHoverPreview, showHover } from "./hover.js";
import { openFramingApp } from "./framing-app.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const UNDO_LIMIT = 30;
const undoStack = [];
let clipboard = null;
let studio = null;
let target = "portrait"; // «portrait» (barra) o «hover» (imagen ampliada)
let previewing = false;

const HOVER_KEYS = {
  size: "hoverSize",
  opacity: "hoverOpacity",
  glow: "hoverGlow",
  flipX: "hoverFlipX",
  flipY: "hoverFlipY",
  rotation: "hoverRotation"
};

/** Nombre real del dato según lo que se esté editando. */
const K = name => (target === "hover" ? HOVER_KEYS[name] : name);
const mapKeys = patch => Object.fromEntries(Object.entries(patch).map(([key, value]) => [K(key), value]));
const baseSize = config => (target === "hover" ? config.hover.size : config.bar.size);
const clampSizeFor = (value, fallback) =>
  target === "hover" ? Math.round(Math.min(1200, Math.max(120, Number(value) || fallback))) : clampSize(value, fallback);

const BUILTIN = [
  {
    id: "ghost",
    key: "PCP.Studio.PresetGhost",
    icon: "fa-ghost",
    look: { opacity: 0.45, glow: { color: "#7fe3ff", power: 55, alpha: 80, soft: 80, pulse: true } }
  },
  {
    id: "boss",
    key: "PCP.Studio.PresetBoss",
    icon: "fa-skull",
    factor: 1.5,
    look: { glow: { color: "#ff4a2a", power: 70, alpha: 90, soft: 55, pulse: true } }
  }
];

/* ------------------------------------------------------------------ estado */

const barIds = () => getConfig().order.filter(id => game.actors?.get(id));

function selection() {
  const ids = new Set(barIds());
  return [...(studio?.selected ?? [])].filter(id => ids.has(id));
}

function snapshot() {
  undoStack.push(foundry.utils.deepClone(getConfig().actors));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
}

/** Aplica un cambio a varios personajes y lo guarda (con deshacer). */
async function commit(ids, change, { record = true } = {}) {
  if (!ids.length) return;
  if (record) snapshot();
  await mutateConfig(config => {
    for (const id of ids) {
      const current = getActorConfig(config, id);
      const patch = typeof change === "function" ? change(current, config) : change;
      config.actors[id] = { ...current, ...patch };
    }
  });
  refreshAll();
}

/** Vista previa inmediata, sin guardar: sobre las tarjetas de la barra o sobre la imagen ampliada. */
function preview(ids, patch) {
  const config = getConfig();
  if (target === "hover") {
    if (ids[0]) refreshHoverPreview(ids[0], mapKeys(patch));
    return;
  }
  for (const id of ids) {
    const card = document.querySelector(`#pcp-party-hud .pcp-card[data-actor-id="${id}"]`);
    if (!card) continue;
    const merged = { ...getActorConfig(config, id), ...patch };
    applyLook(card, merged, config.appearance.opacity);
    if (patch.size !== undefined) {
      const size = clampSize((merged.size ?? config.bar.size) * getClientConfig().scale, config.bar.size);
      card.style.setProperty("--pcp-card-size", `${size}px`);
    }
  }
}

const lookOf = actorConfig => ({
  size: actorConfig[K("size")],
  opacity: actorConfig[K("opacity")],
  glow: actorConfig[K("glow")],
  flipX: actorConfig[K("flipX")],
  flipY: actorConfig[K("flipY")],
  rotation: actorConfig[K("rotation")]
});

/* ------------------------------------------------------------- operaciones */

export async function setSize(px, ids = selection()) {
  await commit(ids, { [K("size")]: clampSizeFor(px, baseSize(getConfig())) });
}

export async function scaleBy(factor, ids = selection()) {
  await commit(ids, (current, config) => ({
    [K("size")]: clampSizeFor((current[K("size")] ?? baseSize(config)) * factor, baseSize(config))
  }));
}

export async function equalize(px, ids = barIds()) {
  await setSize(px, ids);
}

export async function setOpacity(value, ids = selection()) {
  await commit(ids, { [K("opacity")]: value >= 1 ? null : Math.max(0.1, value) });
}

export async function setGlow(glow, ids = selection()) {
  await commit(ids, current => ({
    [K("glow")]: sanitizeLook({ glow: glow ? { ...DEFAULT_GLOW, ...current[K("glow")], ...glow } : null }).glow
  }));
}

export async function toggleFlip(axis, ids = selection()) {
  const key = K(axis === "y" ? "flipY" : "flipX");
  const first = getActorConfig(getConfig(), ids[0] ?? "");
  await commit(ids, { [key]: !first[key] });
}

export async function setRotation(deg, ids = selection()) {
  await commit(ids, { [K("rotation")]: Math.max(-180, Math.min(180, Number(deg) || 0)) });
}

export async function resetFraming(ids = selection()) {
  await commit(ids, { x: 50, y: 50, zoom: 1, rotation: 0 });
}

export async function applyLookTo(look, ids = selection(), factor = null) {
  await commit(ids, (current, config) => {
    const clean = sanitizeLook({ ...lookOf(current), ...look });
    const patch = mapKeys({
      opacity: clean.opacity,
      glow: clean.glow,
      flipX: clean.flipX,
      flipY: clean.flipY,
      rotation: clean.rotation
    });
    if (look.size !== undefined) patch[K("size")] = look.size;
    if (factor) patch[K("size")] = clampSizeFor((current[K("size")] ?? baseSize(config)) * factor, baseSize(config));
    return patch;
  });
}

export async function applyPreset(id, ids = selection()) {
  const builtin = BUILTIN.find(p => p.id === id);
  if (builtin) return applyLookTo({ opacity: null, ...builtin.look }, ids, builtin.factor);
  const custom = getClientConfig().presets.find(p => p.id === id);
  if (custom) return applyLookTo({ ...custom.look, size: target === "hover" ? undefined : custom.size }, ids);
}

export async function restoreOriginal(ids = selection()) {
  const reset = mapKeys({ size: null, opacity: null, glow: null, flipX: false, flipY: false, rotation: 0 });
  await commit(ids, target === "hover" ? reset : { ...reset, countdown: null, tilt: 0 });
}

export async function undo() {
  const previous = undoStack.pop();
  if (!previous) {
    ui.notifications.info(localize("PCP.Studio.NoUndo"));
    return;
  }
  await mutateConfig(config => {
    config.actors = previous;
  });
  refreshAll();
}

export async function setCountdown({ turns, size = 1, mode = "round" }, ids = selection()) {
  await commit(ids, { countdown: { turns, size, mode, warned: false } });
}

export async function stepCountdown(delta, ids = selection()) {
  await commit(ids, current =>
    current.countdown ? { countdown: { ...current.countdown, turns: Math.max(0, current.countdown.turns + delta) } } : {}
  );
}

export async function clearCountdown(ids = selection()) {
  await commit(ids, { countdown: null });
}

async function savePreset(ids) {
  const first = ids[0];
  if (!first) return;
  const name = await DialogV2.prompt({
    window: { title: localize("PCP.Studio.SavePreset") },
    content: `<div class="pcp-dialog-content"><input type="text" name="name" placeholder="${localize("PCP.Studio.PresetName")}" autofocus></div>`,
    ok: { label: localize("PCP.Common.Save"), icon: "fa-solid fa-floppy-disk", callback: (e, button) => button.form.elements.name.value }
  }).catch(() => null);
  const trimmed = String(name ?? "").trim();
  if (!trimmed) return;
  const current = getActorConfig(getConfig(), first);
  await mutateClientConfig(client => {
    client.presets = [
      ...client.presets,
      { id: foundry.utils.randomID(), name: trimmed, size: target === "hover" ? null : current.size, look: sanitizeLook(lookOf(current)) }
    ];
  });
  studio?.render();
}

/* ------------------------------------------------------------------ ventana */

export class StudioApp extends WithMemory(HandlebarsApplicationMixin(ApplicationV2)) {
  static MEMORY_ID = "studio";

  static DEFAULT_OPTIONS = {
    id: "pcp-plus-studio",
    classes: ["pcp-plus-window", "pcp-studio-app", "themed", "theme-dark"],
    position: { width: 420, height: 720 },
    window: { title: "PCP.Studio.Title", icon: "fa-solid fa-wand-magic-sparkles", resizable: true }
  };

  static PARTS = {
    main: { template: "modules/party-corner-portraits-plus/templates/studio.html" }
  };

  constructor(options = {}) {
    super({
      ...options,
      position: { width: 420, height: Math.min(760, window.innerHeight - 60), ...options.position }
    });
    this.selected = new Set();
    studio = this;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();
    const ids = selection();
    const first = ids.length ? getActorConfig(config, ids[0]) : getActorConfig(config, "");
    const hoverMode = target === "hover";
    const glow = first[K("glow")] ?? { ...DEFAULT_GLOW, power: 0 };
    const client = getClientConfig();

    const chips = barIds().map(id => {
      const actor = game.actors.get(id);
      const src = portraitSource(actor, getActorConfig(config, id), config);
      return { id, name: actor.name, img: isVideo(src) ? "" : src, video: isVideo(src), on: this.selected.has(id) };
    });

    return {
      ...context,
      chips,
      hasSelection: ids.length > 0,
      count: ids.length,
      isHover: hoverMode,
      targetPortrait: !hoverMode,
      size: Math.round(first[K("size")] ?? baseSize(config)),
      sizeMin: hoverMode ? 120 : SIZE_MIN,
      sizeMax: hoverMode ? 1200 : SIZE_MAX,
      sizeStep: hoverMode ? 10 : 1,
      globalSize: baseSize(config),
      opacity: Math.round((first[K("opacity")] ?? 1) * 100),
      glow,
      glowColor: glow.color,
      flipX: first[K("flipX")],
      flipY: first[K("flipY")],
      rotation: first[K("rotation")],
      tilt: first.tilt ?? 0,
      countdown: first.countdown ?? { turns: 3, size: 1, mode: "round" },
      hasCountdown: Boolean(first.countdown),
      modeRound: (first.countdown?.mode ?? "round") === "round",
      modeTurn: first.countdown?.mode === "turn",
      builtin: BUILTIN.map(p => ({ id: p.id, label: localize(p.key), icon: p.icon })),
      presets: client.presets,
      hasClipboard: Boolean(clipboard),
      canUndo: undoStack.length > 0,
      focusOn: focusState.ids.size > 0,
      firstName: ids.length ? game.actors.get(ids[0])?.name : "",
      spotOn: focusState.spot && focusState.ids.size > 0
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    addA11yButton(this);
    this.#syncHoverPreview();
    const root = this.element;
    // Valores actuales del primer personaje en los desplegables de marco e imagen.
    const firstId = selection()[0];
    if (firstId) {
      const current = getActorConfig(getConfig(), firstId);
      for (const select of root.querySelectorAll("select[data-prop]")) select.value = current[select.dataset.prop] ?? "";
    }
    if (root.dataset.bound) return;
    root.dataset.bound = "1";

    // Selección de personajes
    root.addEventListener("click", async event => {
      const chip = event.target.closest("[data-chip]");
      if (chip) {
        const id = chip.dataset.chip;
        if (this.selected.has(id)) this.selected.delete(id);
        else this.selected.add(id);
        this.render();
        return;
      }
      const button = event.target.closest("[data-act]");
      if (!button || button.disabled) return;
      await this.#act(button.dataset.act, button);
    });

    // Controles deslizantes y numéricos: vista previa al arrastrar, guardado al soltar.
    root.addEventListener("input", event => {
      const input = event.target.closest("[data-live]");
      if (!input) return;
      const ids = selection();
      const value = Number(input.value);
      const out = input.parentElement.querySelector("output");
      if (out) out.value = `${value}${input.dataset.unit ?? ""}`;
      if (input.dataset.live === "size") preview(ids, { size: clampSizeFor(value, baseSize(getConfig())) });
      else if (input.dataset.live === "opacity") preview(ids, { opacity: value >= 100 ? null : value / 100 });
      else if (input.dataset.live === "rotation") preview(ids, { rotation: value });
      else if (input.dataset.live === "tilt") preview(ids, { tilt: value });
      else if (input.dataset.live.startsWith("glow") || input.dataset.live === "pulse") {
        preview(ids, { glow: this.#glowFrom(root, getActorConfig(getConfig(), ids[0] ?? "")) });
      }
    });

    root.addEventListener("change", async event => {
      const prop = event.target.closest("select[data-prop]");
      if (prop) return commit(selection(), { [prop.dataset.prop]: prop.value || null });
      const input = event.target.closest("[data-live]");
      if (!input) return;
      const ids = selection();
      const value = Number(input.value);
      switch (input.dataset.live) {
        case "size": await setSize(value, ids); break;
        case "opacity": await setOpacity(value / 100, ids); break;
        case "rotation": await setRotation(value, ids); break;
        case "tilt": await commit(ids, { tilt: Math.max(-180, Math.min(180, value)) }); break;
        case "pulse": case "glowColor": case "glowPower": case "glowAlpha": case "glowSoft":
          await setGlow(this.#glowFrom(root, getActorConfig(getConfig(), ids[0] ?? "")), ids);
          break;
      }
    });
  }

  /** En modo «imagen ampliada» se deja a la vista la del primer personaje elegido mientras se ajusta. */
  #syncHoverPreview() {
    const first = selection()[0];
    if (target === "hover" && first) {
      previewing = true;
      showHover(first, { persist: true });
    } else if (previewing) {
      previewing = false;
      hideHover({ force: true });
    }
  }

  #glowFrom(root, current) {
    const value = name => root.querySelector(`[data-live="${name}"]`);
    const power = Number(value("glowPower").value);
    if (power <= 0) return null;
    return {
      ...DEFAULT_GLOW,
      ...current[K("glow")],
      color: value("glowColor").value,
      power,
      alpha: Number(value("glowAlpha").value),
      soft: Number(value("glowSoft").value),
      pulse: value("pulse").checked
    };
  }

  async #act(act, button) {
    const ids = selection();
    const config = getConfig();
    const first = getActorConfig(config, ids[0] ?? "");
    const root = this.element;
    const read = name => Number(root.querySelector(`[data-live="${name}"]`)?.value);

    switch (act) {
      case "halo-color": {
        const current = getActorConfig(config, ids[0] ?? "")[K("glow")];
        return setGlow({ color: button.dataset.color, power: current?.power > 0 ? current.power : 55 }, ids);
      }
      case "target":
        target = button.dataset.target;
        return this.render();
      case "all": this.selected = new Set(barIds()); return this.render();
      case "none": this.selected = new Set(); return this.render();
      case "invert": this.selected = new Set(barIds().filter(id => !this.selected.has(id))); return this.render();
      case "size-down": return scaleBy(0.9, ids);
      case "size-up": return scaleBy(1.1, ids);
      case "size-factor": return commit(ids, { [K("size")]: clampSizeFor(baseSize(config) * Number(button.dataset.factor), baseSize(config)) });
      case "size-global": return commit(ids, { [K("size")]: null });
      case "equalize": return equalize(read("size") || baseSize(config));
      case "opacity-reset": return setOpacity(1, ids);
      case "glow-off": return setGlow(null, ids);
      case "flip-x": return toggleFlip("x", ids);
      case "flip-y": return toggleFlip("y", ids);
      case "rotation-reset": return setRotation(0, ids);
      case "framing-reset": return resetFraming(ids);
      case "framing-open": return ids[0] && openFramingApp(ids[0]);
      case "preset": return applyPreset(button.dataset.preset, ids);
      case "preset-save": return savePreset(ids);
      case "preset-delete":
        await mutateClientConfig(client => {
          client.presets = client.presets.filter(p => p.id !== button.dataset.preset);
        });
        return this.render();
      case "copy":
        clipboard = foundry.utils.deepClone(lookOf(first));
        ui.notifications.info(localize("PCP.Studio.Copied"));
        return this.render();
      case "paste":
        if (!clipboard) return ui.notifications.warn(localize("PCP.Studio.NoClipboard"));
        return applyLookTo(clipboard, ids);
      case "undo": return undo();
      case "original": return restoreOriginal(ids);
      case "focus": setFocus(ids, false); return this.render();
      case "spotlight": setFocus(ids, true); return this.render();
      case "focus-clear": setFocus([], false); return this.render();
      case "countdown-set":
        return setCountdown(
          { turns: read("cdTurns"), size: read("cdSize"), mode: root.querySelector('[data-live="cdMode"]').value },
          ids
        );
      case "countdown-minus": return stepCountdown(-1, ids);
      case "countdown-plus": return stepCountdown(1, ids);
      case "countdown-clear": return clearCountdown(ids);
    }
  }

  async close(options) {
    if (previewing) {
      previewing = false;
      hideHover({ force: true });
    }
    if (studio === this) studio = null;
    return super.close(options);
  }
}

export function openStudio(actorIds = null, mode = "portrait") {
  if (!game.user.isGM) {
    ui.notifications.warn(localize("PCP.Studio.GMOnly"));
    return null;
  }
  target = mode === "hover" ? "hover" : "portrait";
  const existing = foundry.applications.instances.get(StudioApp.DEFAULT_OPTIONS.id);
  const app = existing?.rendered ? existing : new StudioApp();
  studio = app;
  if (actorIds) app.selected = new Set(actorIds);
  if (existing?.rendered) {
    app.render();
    app.bringToFront();
  } else {
    app.render(true);
  }
  return app;
}

/** Mantiene el estudio al día cuando cambia la configuración por otra vía (menús, deshacer…). */
export function refreshStudio() {
  if (studio?.rendered) studio.render();
}
