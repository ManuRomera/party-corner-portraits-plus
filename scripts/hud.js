/**
 * Party Corner Portraits +
 * Main HUD (party corner) renderer.
 */

import { getConfig, getClientConfig, mutateConfig } from "./settings.js";
import {
  clamp,
  clampSize,
  getActorBorderColor,
  getActorConfig,
  getActorFit,
  getActorFrame,
  getActorNamePosition,
  getActorPlayerLabel,
  getActorBarValues,
  isAnyOwnerActive,
  resolvePath,
  formatFieldValue,
  localize,
  normalizeColor
} from "./utils.js";
import { dispatchMenuEvent, refreshAll } from "./events.js";
import { avoidCoreUi } from "./layout.js";
import { applyFocus, applyLook, buildCountdown } from "./look.js";
import { attachHover, hideHover } from "./hover.js";
import { closeMenus } from "./menu.js";
import { ownerKey, visiblePortraits } from "./scene.js";
import { MODULE_ID } from "./constants.js";
import { hideTools, setTilt, showTools } from "./tools.js";
import { applyFraming, createPortraitElement, portraitSource } from "./media.js";

let moveMode = false;
let suppressClick = false;
let escapeListener = null;

export function isMoveMode() {
  return moveMode;
}

function removeHud() {
  document.getElementById("pcp-party-hud")?.remove();
}

function actorCanOpenSheet(actor) {
  return Boolean(actor && (game.user.isGM || actor.testUserPermission(game.user, "LIMITED")));
}

function buildNameBlock(actor, config, client, actorConfig) {
  const block = document.createElement("div");
  block.className = "pcp-names";
  let hasContent = false;

  if (config.data.showCharacterName && !client.hideNames) {
    const name = document.createElement("div");
    name.className = "pcp-char-name";
    name.textContent = actor.name;
    block.appendChild(name);
    hasContent = true;
  }

  const playerLabel = getActorPlayerLabel(actor, actorConfig);
  if (config.data.showPlayerName && !client.hideNames && playerLabel) {
    const player = document.createElement("div");
    player.className = "pcp-player-name";

    if (config.data.showPlayerStatus) {
      const dot = document.createElement("span");
      dot.className = `pcp-player-dot ${isAnyOwnerActive(actor) ? "pcp-online" : "pcp-offline"}`;
      dot.title = isAnyOwnerActive(actor)
        ? localize("PCP.Status.Connected")
        : localize("PCP.Status.Offline");
      player.appendChild(dot);
    }

    const text = document.createElement("span");
    text.className = "pcp-player-label";
    text.textContent = playerLabel;
    player.appendChild(text);
    block.appendChild(player);
    hasContent = true;
  }

  return hasContent ? block : null;
}

function buildFields(actor, config) {
  const fields = Array.isArray(config.data.fields) ? config.data.fields : [];
  if (!fields.length) return null;

  const container = document.createElement("div");
  container.className = "pcp-fields";

  for (const field of fields) {
    if (!field.path) continue;
    const value = resolvePath(actor, field.path);
    const text = formatFieldValue(value);
    if (!text) continue;

    const row = document.createElement("div");
    row.className = "pcp-field";

    if (field.label) {
      const label = document.createElement("span");
      label.className = "pcp-field-label";
      label.textContent = field.label;
      row.appendChild(label);
    }

    const valueElement = document.createElement("span");
    valueElement.className = "pcp-field-value";
    valueElement.textContent = `${text}${field.suffix ?? ""}`;
    row.appendChild(valueElement);
    container.appendChild(row);
  }

  return container.children.length ? container : null;
}

function buildBars(actor, config, client, actorConfig) {
  const bars = Array.isArray(config.data.bars) ? config.data.bars : [];
  if (!bars.length || client.hideBars || !config.data.showBars) return null;

  const container = document.createElement("div");
  container.className = "pcp-bars";

  for (const bar of bars) {
    if (!bar.valuePath) continue;
    const values = getActorBarValues(actor, bar, actorConfig);
    if (!values) continue;

    const element = document.createElement("div");
    element.className = "pcp-bar";
    element.title = bar.label || "";

    const showHead = Boolean(bar.showText || bar.label);
    if (showHead) {
      const head = document.createElement("div");
      head.className = "pcp-bar-head";

      if (bar.label) {
        const label = document.createElement("span");
        label.className = "pcp-bar-label";
        label.textContent = bar.label;
        head.appendChild(label);
      }

      if (bar.showText) {
        const text = document.createElement("span");
        text.className = "pcp-bar-value";
        text.textContent =
          values.hasBar && bar.showMax
            ? `${values.valueText} / ${values.maxText}`
            : values.valueText;
        head.appendChild(text);
      }

      element.appendChild(head);
    }

    if (values.hasBar) {
      const track = document.createElement("div");
      track.className = "pcp-bar-track";
      const fill = document.createElement("div");
      fill.className = "pcp-bar-fill";
      fill.style.width = `${values.percent}%`;
      fill.style.background = values.color;
      track.appendChild(fill);
      element.appendChild(track);
    }

    container.appendChild(element);
  }

  return container.children.length ? container : null;
}

function applyCardClasses(card, config, fit, frame) {
  const background = config.appearance.background;
  card.classList.add(`pcp-frame-${frame}`);
  card.classList.add(`pcp-bg-${background}`);
  card.classList.add(`pcp-fit-${fit}`);
  if (config.appearance.shadow && frame !== "none") card.classList.add("pcp-shadow");
  if (config.appearance.grayscale) card.classList.add("pcp-grayscale");
}

function buildCard(actor, config, client) {
  const actorConfig = getActorConfig(config, actor.id);
  const size = clampSize((actorConfig.size ?? config.bar.size) * client.scale, config.bar.size);
  const fit = getActorFit(config, actorConfig);
  const frame = getActorFrame(config, actorConfig);
  const namePosition = getActorNamePosition(config, actorConfig);
  const borderColor = normalizeColor(getActorBorderColor(config, actorConfig));

  const card = document.createElement("div");
  card.className = "pcp-card";
  card.dataset.actorId = actor.id;
  card.title = actor.name;
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  card.setAttribute("aria-label", actor.name);
  card.style.setProperty("--pcp-card-size", `${size}px`);
  card.style.setProperty("--pcp-card-border", borderColor);
  card.style.setProperty("--pcp-card-radius", `${config.appearance.radius}px`);
  card.style.setProperty("--pcp-name-color", config.appearance.nameColor);
  applyCardClasses(card, config, fit, frame);

  const portrait = document.createElement("div");
  portrait.className = "pcp-portrait";

  const img = createPortraitElement(portraitSource(actor, actorConfig, config), {
    alt: actor.name,
    still: client.a11y.motion
  });
  applyFraming(img, fit, actorConfig.x, actorConfig.y, actorConfig.zoom);
  const wrap = document.createElement("div");
  wrap.className = "pcp-media-wrap";
  wrap.appendChild(img);
  portrait.appendChild(wrap);
  const countdown = buildCountdown(actorConfig.countdown);
  if (countdown) portrait.appendChild(countdown);

  const overlay = document.createElement("div");
  overlay.className = "pcp-overlay";

  const overlayNames = namePosition === "overlay" ? buildNameBlock(actor, config, client, actorConfig) : null;
  if (overlayNames) overlay.appendChild(overlayNames);

  const overlayBars =
    config.data.barPosition === "overlay" ? buildBars(actor, config, client, actorConfig) : null;
  if (overlayBars) {
    overlayBars.classList.add("pcp-bars-overlay");
    overlay.appendChild(overlayBars);
  }

  if (overlay.children.length) portrait.appendChild(overlay);
  card.appendChild(portrait);

  const info = document.createElement("div");
  info.className = "pcp-info";

  if (namePosition === "below") {
    const names = buildNameBlock(actor, config, client, actorConfig);
    if (names) info.appendChild(names);
  }

  const fields = buildFields(actor, config);
  if (fields) info.appendChild(fields);

  if (config.data.barPosition === "below") {
    const bars = buildBars(actor, config, client, actorConfig);
    if (bars) info.appendChild(bars);
  }

  if (info.children.length) card.appendChild(info);

  applyLook(card, { ...actorConfig, hidden: actorConfig.hidden || Boolean(config._tokenHidden?.has(actor.id)) }, config.appearance.opacity);

  // Abrir la ficha con un clic, con doble clic o nunca (Configuración → General).
  const openSheet = () => {
    if (actorCanOpenSheet(actor)) actor.sheet?.render(true);
  };
  card.addEventListener("click", event => {
    if (card.dataset.stacked || moveMode || suppressClick || getConfig().ui.openSheet !== "click") return;
    event.preventDefault();
    openSheet();
  });
  card.addEventListener("dblclick", event => {
    if (card.dataset.stacked || moveMode || suppressClick || getConfig().ui.openSheet !== "dblclick") return;
    event.preventDefault();
    openSheet();
  });

  attachHover(card, actor);

  // Botones rápidos (máster) al pasar el cursor.
  if (game.user.isGM) {
    card.addEventListener("pointerenter", () => {
      if (!moveMode) showTools(card, actor.id);
    });
    card.addEventListener("pointerleave", () => hideTools(220));
    card.addEventListener("focus", () => showTools(card, actor.id));
  }

  // Ctrl + rueda: inclina solo este retrato (5° por muesca; con Mayús, 1°).
  card.addEventListener(
    "wheel",
    event => {
      if (!game.user.isGM || !event.ctrlKey) return;
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 1 : 5;
      const current = Number.parseFloat(card.style.getPropertyValue("--pcp-tilt")) || 0;
      let next = current + (event.deltaY < 0 ? step : -step);
      next = Math.max(-180, Math.min(180, next));
      card.style.setProperty("--pcp-tilt", `${next}deg`);
      hideHover({ force: true });
      window.clearTimeout(card._pcpTiltTimer);
      card._pcpTiltTimer = window.setTimeout(() => setTilt(actor.id, next), 350);
    },
    { passive: false }
  );

  card.addEventListener("keydown", event => {
    if (moveMode) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (getConfig().ui.openSheet !== "none") openSheet();
    } else if (event.key === "ContextMenu" || (event.shiftKey && event.key === "F10")) {
      event.preventDefault();
      const rect = card.getBoundingClientRect();
      dispatchMenuEvent("pcp:actor-menu", { actorId: actor.id, x: rect.left, y: rect.bottom });
    }
  });

  card.addEventListener("contextmenu", event => {
    event.preventDefault();
    event.stopPropagation();
    if (moveMode) return;
    openMenuOrWait("pcp:actor-menu", { actorId: actor.id, x: event.clientX, y: event.clientY });
  });

  return card;
}

function createHudHandle() {
  const handle = document.createElement("button");
  handle.type = "button";
  handle.className = "pcp-hud-handle";
  handle.title = localize("PCP.Menu.Hud.Title");
  handle.setAttribute("aria-label", localize("PCP.Menu.Hud.Title"));
  handle.innerHTML = '<i class="fa-solid fa-ellipsis"></i>';
  handle.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    const rect = handle.getBoundingClientRect();
    dispatchMenuEvent("pcp:hud-menu", { x: rect.left, y: rect.top });
  });
  return handle;
}

function createMoveHint() {
  const hint = document.createElement("div");
  hint.className = "pcp-move-hint";
  hint.innerHTML = `<i class="fa-solid fa-up-down-left-right"></i> ${localize("PCP.Move.Hint")}`;
  return hint;
}

function applyPosition(hud, config) {
  if (config.bar.free?.enabled) {
    hud.classList.add("pcp-free");
    const rect = hud.getBoundingClientRect();
    const maxX = Math.max(8, window.innerWidth - (rect.width || 120) - 4);
    const maxY = Math.max(8, window.innerHeight - (rect.height || 120) - 4);
    hud.style.left = `${clamp(config.bar.free.x, 0, maxX, 40)}px`;
    hud.style.top = `${clamp(config.bar.free.y, 0, maxY, 40)}px`;
    hud.classList.add("pcp-position-free");
  } else {
    hud.classList.remove("pcp-free", "pcp-position-free");
    hud.style.removeProperty("left");
    hud.style.removeProperty("top");
    hud.classList.add(`pcp-${config.bar.position}`);
  }
}

/* ------------------------------------------------------------------ arrastre
 * Se mueve con el botón izquierdo en «modo mover» o, siempre, con el botón derecho mantenido
 * (como en otros módulos). Un clic derecho sin arrastrar abre el menú. En macOS el evento
 * «contextmenu» llega al pulsar, así que el menú espera a soltar para saber si era un arrastre.
 */

const DRAG_THRESHOLD = 6;
let rightDown = false;
let pendingMenu = null;

function openMenuOrWait(name, detail) {
  if (rightDown) pendingMenu = { name, detail };
  else dispatchMenuEvent(name, detail);
}

/** Mueve `el` con el puntero; `save(rect)` guarda al soltar. */
function trackDrag(el, startEvent, { button, save, prepare }) {
  const rect = el.getBoundingClientRect();
  const offsetX = startEvent.clientX - rect.left;
  const offsetY = startEvent.clientY - rect.top;
  let started = false;
  let last = { left: rect.left, top: rect.top };

  const begin = () => {
    started = true;
    closeMenus();
    hideHover({ force: true });
    prepare?.(rect);
    el.classList.add("pcp-moving");
    el.style.left = `${rect.left}px`;
    el.style.top = `${rect.top}px`;
  };

  const onMove = event => {
    if (!started) {
      if (Math.hypot(event.clientX - startEvent.clientX, event.clientY - startEvent.clientY) < DRAG_THRESHOLD) return;
      begin();
    }
    last = {
      left: clamp(event.clientX - offsetX, 0, Math.max(8, window.innerWidth - rect.width - 4), rect.left),
      top: clamp(event.clientY - offsetY, 0, Math.max(8, window.innerHeight - rect.height - 4), rect.top)
    };
    el.style.left = `${last.left}px`;
    el.style.top = `${last.top}px`;
  };

  const onUp = async event => {
    if (event.button !== button) return;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp, true);
    if (button === 2) rightDown = false;

    if (!started) {
      if (pendingMenu) dispatchMenuEvent(pendingMenu.name, pendingMenu.detail);
      pendingMenu = null;
      return;
    }
    pendingMenu = null;
    el.classList.remove("pcp-moving");
    suppressClick = true;
    window.setTimeout(() => {
      suppressClick = false;
    }, 250);
    await save({ ...last, width: rect.width, height: rect.height });
    refreshAll();
  };

  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerup", onUp, true);
}

function saveBarPosition({ left, top }) {
  return mutateConfig(config => {
    config.bar.free = { enabled: true, x: Math.round(left), y: Math.round(top) };
  }).then(() => setMoveMode(false));
}

function saveFloatPosition(actorId) {
  return ({ left, top, width, height }) =>
    mutateConfig(config => {
      config.actors[actorId] = {
        ...getActorConfig(config, actorId),
        float: {
          x: (left + width / 2) / window.innerWidth,
          y: (top + height / 2) / window.innerHeight
        }
      };
    });
}

/** Engancha el arrastre (botón derecho siempre; izquierdo en «modo mover») a la barra o a un retrato suelto. */
function attachDrag(el, { save, prepare }) {
  el.addEventListener("pointerdown", event => {
    if (!game.user.isGM) return;
    if (event.button === 0 && moveMode) {
      event.preventDefault();
      closeMoveHintListeners();
      trackDrag(el, event, { button: 0, save, prepare });
    } else if (event.button === 2 && !moveMode) {
      rightDown = true;
      pendingMenu = null;
      trackDrag(el, event, { button: 2, save, prepare });
    }
  });
}

const prepareBar = hud => () => {
  hud.classList.add("pcp-free");
  hud.classList.remove("pcp-top-left", "pcp-top-right", "pcp-bottom-left", "pcp-bottom-right", "pcp-position-free");
};

function closeMoveHintListeners() {
  if (escapeListener) {
    document.removeEventListener("keydown", escapeListener, true);
    escapeListener = null;
  }
}

export function setMoveMode(enabled) {
  if (!game.user?.isGM) return;
  closeMoveHintListeners();
  moveMode = Boolean(enabled);

  const hud = document.getElementById("pcp-party-hud");
  const floats = document.getElementById("pcp-floats");
  if (!moveMode) {
    hud?.classList.remove("pcp-move-mode");
    hud?.querySelector(".pcp-move-hint")?.remove();
    floats?.classList.remove("pcp-move-mode");
    return;
  }
  floats?.classList.add("pcp-move-mode");

  if (!hud) {
    renderHud();
    const renderedHud = document.getElementById("pcp-party-hud");
    if (!renderedHud) {
      moveMode = false;
      return;
    }
    return setMoveMode(true);
  }

  hud.classList.add("pcp-move-mode");
  if (!hud.querySelector(".pcp-move-hint")) hud.appendChild(createMoveHint());

  escapeListener = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      setMoveMode(false);
      refreshAll(); // vuelve a la posición guardada
    }
  };
  document.addEventListener("keydown", escapeListener, true);
}

/* ------------------------------------------------------------------ pilas de fichas
 * Un jugador con varios personajes ve una pila: arriba el activo; al pulsar, pasa al fondo y sube
 * el siguiente (con una pequeña animación). Al pasar el cursor, las fichas se abren en abanico
 * y se puede elegir una directamente. La ficha activa se recuerda mientras dure la sesión.
 */

const stackTop = new Map(); // clave de jugador → actorId activo (se comparte con todos por socket y se guarda en el mundo)

/** Guarda en el mundo la ficha activa de un jugador (solo lo hace un máster), para quien entre después. */
async function persistTop(key, actorId) {
  if ((getConfig().stackTop ?? {})[key] === actorId) return;
  await mutateConfig(config => {
    config.stackTop = { ...config.stackTop, [key]: actorId };
  });
}

/** Avisa a todos del cambio de ficha activa. */
function announceTop(key, actorId) {
  game.socket.emit(`module.${MODULE_ID}`, { type: "stackTop", key, actorId });
  if (game.user.isGM) persistTop(key, actorId);
}

/**
 * Escucha los cambios de ficha activa de los demás. Un jugador solo puede cambiar entre fichas
 * de las que es propietario; el máster, cualquiera.
 */
export function registerStackSocket() {
  game.socket.on(`module.${MODULE_ID}`, (data, userId) => {
    if (data?.type !== "stackTop" || typeof data.key !== "string" || typeof data.actorId !== "string") return;
    const sender = game.users.get(userId);
    const target = game.actors.get(data.actorId);
    if (!sender || !target || !(sender.isGM || target.testUserPermission(sender, "OWNER"))) return;
    const stack = document.querySelector(`#pcp-party-hud .pcp-stack[data-owner="${data.key}"]`);
    if (stack?._slot) bringToTop(stack, stack._slot, data.actorId, true, false);
    else stackTop.set(data.key, data.actorId);
    if (game.users.activeGM?.isSelf) persistTop(data.key, data.actorId);
  });
}

function stackOrder(slot) {
  const ids = slot.members.map(actor => actor.id);
  // Lo último elegido en esta sesión manda; si no hay nada, lo guardado en el mundo.
  if (!stackTop.has(slot.key) && slot.saved) stackTop.set(slot.key, slot.saved);
  const top = stackTop.get(slot.key);
  const start = ids.includes(top) ? ids.indexOf(top) : 0;
  return [...ids.slice(start), ...ids.slice(0, start)]; // la primera es la de arriba
}

function applyStackDepths(stack, order) {
  stack.dataset.top = order[0];
  for (const item of stack.querySelectorAll(".pcp-stack-item")) {
    const depth = order.indexOf(item.dataset.actorId);
    item.style.setProperty("--d", String(depth));
    item.style.zIndex = String(100 - depth);
    item.classList.toggle("pcp-top", depth === 0);
    item.querySelector(".pcp-card")?.setAttribute("tabindex", depth === 0 ? "0" : "-1");
  }
}

/** Sube `actorId` a la cima; la que estaba arriba se desliza hacia fuera y se esconde detrás. */
function bringToTop(stack, slot, actorId, animate = true, announce = true) {
  const current = stackOrder(slot);
  if (current[0] === actorId) return;
  stackTop.set(slot.key, actorId);
  if (announce) announceTop(slot.key, actorId);
  const next = stackOrder(slot);
  const leaving = stack.querySelector(`.pcp-stack-item[data-actor-id="${current[0]}"]`);
  hideHover({ force: true });
  hideTools();
  if (!animate || getClientConfig().a11y.motion) {
    applyStackDepths(stack, next);
    return;
  }
  leaving?.classList.add("pcp-out");
  window.setTimeout(() => {
    applyStackDepths(stack, next);
    leaving?.classList.remove("pcp-out");
  }, 170);
}

function buildStack(slot, config, client) {
  const stack = document.createElement("div");
  stack.className = "pcp-stack";
  stack.dataset.owner = slot.key;
  stack._slot = slot;
  stack.style.setProperty("--n", String(slot.members.length));
  const first = getActorConfig(config, slot.members[0].id);
  stack.style.setProperty("--w", `${clampSize((first.size ?? config.bar.size) * client.scale, config.bar.size)}px`);

  for (const actor of slot.members) {
    const item = document.createElement("div");
    item.className = "pcp-stack-item";
    item.dataset.actorId = actor.id;
    const card = buildCard(actor, config, client);
    card.dataset.stacked = "1";
    card.title = `${actor.name} — ${localize("PCP.Stack.Hint")}`;
    item.appendChild(card);
    const tag = document.createElement("span"); // nombre visible en el abanico
    tag.className = "pcp-stack-tag";
    tag.textContent = actor.name;
    item.appendChild(tag);
    stack.appendChild(item);

    // Pulsar: la ficha de arriba pasa a la siguiente; una de las de atrás sube a la cima.
    card.addEventListener("click", event => {
      if (moveMode || suppressClick) return;
      event.preventDefault();
      event.stopPropagation();
      const order = stackOrder(slot);
      bringToTop(stack, slot, order[0] === actor.id ? order[1] : actor.id);
    });
    // Doble clic: abre la ficha (si no está desactivado).
    card.addEventListener("dblclick", event => {
      if (moveMode || getConfig().ui.openSheet === "none") return;
      event.preventDefault();
      if (actorCanOpenSheet(actor)) actor.sheet?.render(true);
    });
  }
  // El abanico se abre hacia arriba; si la pila está en la mitad superior de la pantalla, hacia abajo.
  stack.addEventListener("pointerenter", () => {
    const rect = stack.getBoundingClientRect();
    stack.style.setProperty("--fan-dir", rect.top + rect.height / 2 > window.innerHeight * 0.5 ? "-1" : "1");
  });
  applyStackDepths(stack, stackOrder(slot));
  return stack;
}

function removeFloats() {
  document.getElementById("pcp-floats")?.remove();
}

function hudVariables(el, config) {
  const gap = config.bar.gap;
  el.style.setProperty("--pcp-gap", `${Math.max(gap, 0)}px`);
  el.style.setProperty("--pcp-overlap", `${Math.min(gap, 0)}px`);
  el.style.setProperty("--pcp-offset-x", `${config.bar.offsetX}px`);
  el.style.setProperty("--pcp-offset-y", `${config.bar.offsetY}px`);
  el.style.setProperty("--pcp-border-color", normalizeColor(config.appearance.borderColor));
  el.style.setProperty("--pcp-border-width", `${config.appearance.borderWidth}px`);
  el.style.setProperty("--pcp-radius", `${config.appearance.radius}px`);
  el.style.setProperty("--pcp-bar-height", `${config.data.barHeight}px`);
  el.style.setProperty("--pcp-opacity", `${config.appearance.opacity}`);
  el.style.setProperty("--pcp-hover-scale", `${config.appearance.hoverScale}`);
  el.style.setProperty("--pcp-name-color", config.appearance.nameColor);
}

export function renderHud() {
  if (!game?.ready) return;

  removeHud();
  removeFloats();
  hideTools();
  hideHover(); // la tarjeta sobre la que estaba el cursor deja de existir

  const client = getClientConfig();
  if (client.hidden) return;

  const config = getConfig();

  // Los retratos ocultos solo los ve el máster (atenuados).
  const { ids, tokenHidden } = visiblePortraits(config);
  config._tokenHidden = tokenHidden; // lo lee buildCard para atenuar al máster
  const isHidden = id => getActorConfig(config, id).hidden || tokenHidden.has(id);
  const actors = ids
    .map(id => game.actors?.get(id))
    .filter(Boolean)
    .filter(actor => game.user.isGM || !isHidden(actor.id));
  const inBar = actors.filter(actor => !getActorConfig(config, actor.id).float);
  const loose = actors.filter(actor => getActorConfig(config, actor.id).float);

  // Retratos sueltos: cada uno donde se haya colocado.
  if (loose.length) {
    const layer = document.createElement("div");
    layer.id = "pcp-floats";
    hudVariables(layer, config);
    for (const actor of loose) {
      const { float } = getActorConfig(config, actor.id);
      const holder = document.createElement("div");
      holder.className = "pcp-float";
      holder.dataset.actorId = actor.id;
      holder.style.left = `${float.x * 100}%`;
      holder.style.top = `${float.y * 100}%`;
      holder.appendChild(buildCard(actor, config, client));
      attachDrag(holder, {
        save: saveFloatPosition(actor.id),
        prepare: () => {
          holder.style.transform = "none";
        }
      });
      layer.appendChild(holder);
    }
    document.body.appendChild(layer);
    applyFocus(layer);
    if (moveMode) layer.classList.add("pcp-move-mode");
  }

  // Sin retratos en la barra, el máster ve un botón para añadir (si no, no habría forma de volver a empezar).
  if (!inBar.length && !game.user.isGM) return;

  const hud = document.createElement("div");
  hud.id = "pcp-party-hud";
  hud.className = "pcp-party-hud";
  hud.classList.add(config.bar.free?.enabled ? "pcp-free" : `pcp-${config.bar.position}`);
  hud.classList.add(`pcp-${config.bar.orientation}`);
  hudVariables(hud, config);

  // En modo «escena», las fichas de un mismo jugador se apilan en un solo hueco.
  const slots = [];
  const byOwner = new Map();
  for (const actor of inBar) {
    const key = ownerKey(actor);
    if (key && byOwner.has(key)) byOwner.get(key).members.push(actor);
    else {
      const slot = { key, members: [actor], saved: key ? config.stackTop?.[key] : null };
      slots.push(slot);
      if (key) byOwner.set(key, slot);
    }
  }
  for (const slot of slots) {
    if (slot.members.length === 1) hud.appendChild(buildCard(slot.members[0], config, client));
    else hud.appendChild(buildStack(slot, config, client));
  }

  if (!inBar.length) {
    hud.classList.add("pcp-empty");
    const add = document.createElement("button");
    add.type = "button";
    add.className = "pcp-add-slot";
    add.title = localize("PCP.Add.Title");
    add.setAttribute("aria-label", localize("PCP.Add.Title"));
    add.innerHTML = '<i class="fa-solid fa-plus"></i>';
    add.addEventListener("click", () => dispatchMenuEvent("pcp:add-actors", {}));
    hud.appendChild(add);
  }
  applyFocus(hud);
  if (game.user.isGM) hud.appendChild(createHudHandle());
  document.body.appendChild(hud);
  applyPosition(hud, config);
  if (!config.bar.free?.enabled) avoidCoreUi(hud, config.bar.position);
  attachDrag(hud, { save: saveBarPosition, prepare: prepareBar(hud) });

  if (moveMode) {
    hud.classList.add("pcp-move-mode");
    hud.appendChild(createMoveHint());
  }
}

export { removeHud, buildCard };
