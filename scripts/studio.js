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
import { openFramingApp } from "./framing-app.js";

const { ApplicationV2, HandlebarsApplicationMixin, DialogV2 } = foundry.applications.api;

const UNDO_LIMIT = 30;
const undoStack = [];
let clipboard = null;
let studio = null;

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

/** Vista previa inmediata sobre las tarjetas de la barra, sin guardar. */
function preview(ids, patchFor) {
  const config = getConfig();
  for (const id of ids) {
    const card = document.querySelector(`#pcp-party-hud .pcp-card[data-actor-id="${id}"]`);
    if (!card) continue;
    const merged = { ...getActorConfig(config, id), ...patchFor(getActorConfig(config, id)) };
    applyLook(card, merged, config.appearance.opacity);
    if (merged.size !== undefined) {
      const size = clampSize((merged.size ?? config.bar.size) * getClientConfig().scale, config.bar.size);
      card.style.setProperty("--pcp-card-size", `${size}px`);
    }
  }
}

const lookOf = actorConfig => ({
  size: actorConfig.size,
  opacity: actorConfig.opacity,
  glow: actorConfig.glow,
  flipX: actorConfig.flipX,
  flipY: actorConfig.flipY,
  rotation: actorConfig.rotation
});

/* ------------------------------------------------------------- operaciones */

export async function setSize(px, ids = selection()) {
  await commit(ids, { size: clampSize(px, getConfig().bar.size) });
}

export async function scaleBy(factor, ids = selection()) {
  await commit(ids, (current, config) => ({
    size: clampSize((current.size ?? config.bar.size) * factor, config.bar.size)
  }));
}

export async function equalize(px, ids = barIds()) {
  await setSize(px, ids);
}

export async function setOpacity(value, ids = selection()) {
  await commit(ids, { opacity: value >= 1 ? null : Math.max(0.1, value) });
}

export async function setGlow(glow, ids = selection()) {
  await commit(ids, current => ({
    glow: sanitizeLook({ glow: glow ? { ...DEFAULT_GLOW, ...current.glow, ...glow } : null }).glow
  }));
}

export async function toggleFlip(axis, ids = selection()) {
  const key = axis === "y" ? "flipY" : "flipX";
  const first = getActorConfig(getConfig(), ids[0] ?? "");
  await commit(ids, { [key]: !first[key] });
}

export async function setRotation(deg, ids = selection()) {
  await commit(ids, { rotation: Math.max(-180, Math.min(180, Number(deg) || 0)) });
}

export async function resetFraming(ids = selection()) {
  await commit(ids, { x: 50, y: 50, zoom: 1, rotation: 0 });
}

export async function applyLookTo(look, ids = selection(), factor = null) {
  await commit(ids, (current, config) => {
    const clean = sanitizeLook({ ...lookOf(current), ...look });
    const patch = { opacity: clean.opacity, glow: clean.glow, flipX: clean.flipX, flipY: clean.flipY, rotation: clean.rotation };
    if (look.size !== undefined) patch.size = look.size;
    if (factor) patch.size = clampSize((current.size ?? config.bar.size) * factor, config.bar.size);
    return patch;
  });
}

export async function applyPreset(id, ids = selection()) {
  const builtin = BUILTIN.find(p => p.id === id);
  if (builtin) return applyLookTo({ opacity: null, ...builtin.look }, ids, builtin.factor);
  const custom = getClientConfig().presets.find(p => p.id === id);
  if (custom) return applyLookTo({ ...custom.look, size: custom.size }, ids);
}

export async function restoreOriginal(ids = selection()) {
  await commit(ids, { size: null, opacity: null, glow: null, flipX: false, flipY: false, rotation: 0, countdown: null });
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
      { id: foundry.utils.randomID(), name: trimmed, size: current.size, look: sanitizeLook(current) }
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
    const glow = first.glow ?? { ...DEFAULT_GLOW, power: 0 };
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
      size: Math.round(first.size ?? config.bar.size),
      sizeMin: SIZE_MIN,
      sizeMax: SIZE_MAX,
      globalSize: config.bar.size,
      opacity: Math.round((first.opacity ?? 1) * 100),
      glow,
      glowColor: glow.color,
      flipX: first.flipX,
      flipY: first.flipY,
      rotation: first.rotation,
      countdown: first.countdown ?? { turns: 3, size: 1, mode: "round" },
      hasCountdown: Boolean(first.countdown),
      modeRound: (first.countdown?.mode ?? "round") === "round",
      modeTurn: first.countdown?.mode === "turn",
      builtin: BUILTIN.map(p => ({ id: p.id, label: localize(p.key), icon: p.icon })),
      presets: client.presets,
      hasClipboard: Boolean(clipboard),
      canUndo: undoStack.length > 0,
      focusOn: focusState.ids.size > 0,
      spotOn: focusState.spot && focusState.ids.size > 0
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    addA11yButton(this);
    const root = this.element;
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
      if (input.dataset.live === "size") preview(ids, () => ({ size: clampSize(value) }));
      else if (input.dataset.live === "opacity") preview(ids, () => ({ opacity: value >= 100 ? null : value / 100 }));
      else if (input.dataset.live === "rotation") preview(ids, () => ({ rotation: value }));
      else if (input.dataset.live.startsWith("glow")) preview(ids, current => ({ glow: this.#glowFrom(root, current) }));
    });

    root.addEventListener("change", async event => {
      const input = event.target.closest("[data-live]");
      if (!input) return;
      const ids = selection();
      const value = Number(input.value);
      switch (input.dataset.live) {
        case "size": await setSize(value, ids); break;
        case "opacity": await setOpacity(value / 100, ids); break;
        case "rotation": await setRotation(value, ids); break;
        case "pulse": case "glowColor": case "glowPower": case "glowAlpha": case "glowSoft":
          await setGlow(this.#glowFrom(root, getActorConfig(getConfig(), ids[0] ?? "")), ids);
          break;
      }
    });
  }

  #glowFrom(root, current) {
    const value = name => root.querySelector(`[data-live="${name}"]`);
    const power = Number(value("glowPower").value);
    if (power <= 0) return null;
    return {
      ...DEFAULT_GLOW,
      ...current.glow,
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
      case "all": this.selected = new Set(barIds()); return this.render();
      case "none": this.selected = new Set(); return this.render();
      case "invert": this.selected = new Set(barIds().filter(id => !this.selected.has(id))); return this.render();
      case "size-down": return scaleBy(0.9, ids);
      case "size-up": return scaleBy(1.1, ids);
      case "size-factor": return commit(ids, { size: clampSize(config.bar.size * Number(button.dataset.factor), config.bar.size) });
      case "size-global": return commit(ids, { size: null });
      case "equalize": return equalize(read("size") || config.bar.size);
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
    if (studio === this) studio = null;
    return super.close(options);
  }
}

export function openStudio(actorIds = null) {
  if (!game.user.isGM) {
    ui.notifications.warn(localize("PCP.Studio.GMOnly"));
    return null;
  }
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
