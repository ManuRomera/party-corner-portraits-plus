/**
 * Party Corner Portraits +
 * Main HUD (party corner) renderer.
 */

import { getConfig, getClientConfig, saveConfig } from "./settings.js";
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
import { attachHover, hideHover } from "./hover.js";
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
  if (!bars.length || client.hideBars) return null;

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
  portrait.appendChild(img);

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

  card.addEventListener("click", event => {
    if (moveMode || suppressClick) return;
    event.preventDefault();
    if (actorCanOpenSheet(actor)) actor.sheet?.render(true);
  });

  attachHover(card, actor);

  card.addEventListener("keydown", event => {
    if (moveMode) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      if (actorCanOpenSheet(actor)) actor.sheet?.render(true);
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
    dispatchMenuEvent("pcp:actor-menu", {
      actorId: actor.id,
      x: event.clientX,
      y: event.clientY
    });
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

function attachDrag(hud) {
  hud.addEventListener("pointerdown", event => {
    if (!moveMode || !game.user.isGM) return;
    if (event.button !== 0) return;

    event.preventDefault();
    closeMoveHintListeners();

    const rect = hud.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    const barWidth = hud.offsetWidth || 120;
    const barHeight = hud.offsetHeight || 120;

    hud.classList.add("pcp-free", "pcp-moving");
    hud.classList.remove(
      "pcp-top-left",
      "pcp-top-right",
      "pcp-bottom-left",
      "pcp-bottom-right",
      "pcp-position-free"
    );
    hud.style.left = `${rect.left}px`;
    hud.style.top = `${rect.top}px`;

    let lastX = rect.left;
    let lastY = rect.top;

    const onMove = moveEvent => {
      const maxX = Math.max(8, window.innerWidth - barWidth - 4);
      const maxY = Math.max(8, window.innerHeight - barHeight - 4);
      lastX = clamp(moveEvent.clientX - offsetX, 0, maxX, rect.left);
      lastY = clamp(moveEvent.clientY - offsetY, 0, maxY, rect.top);
      hud.style.left = `${lastX}px`;
      hud.style.top = `${lastY}px`;
    };

    const onUp = async () => {
      window.removeEventListener("pointermove", onMove);
      hud.classList.remove("pcp-moving");
      suppressClick = true;
      window.setTimeout(() => {
        suppressClick = false;
      }, 250);

      const config = getConfig();
      config.bar.free = { enabled: true, x: Math.round(lastX), y: Math.round(lastY) };
      await saveConfig(config);
      setMoveMode(false);
      refreshAll();
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp, { once: true });
  });
}

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
  if (!moveMode) {
    hud?.classList.remove("pcp-move-mode");
    hud?.querySelector(".pcp-move-hint")?.remove();
    if (hud && !hud.querySelector(".pcp-move-hint")) hud.classList.remove("pcp-move-mode");
    return;
  }

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
    }
  };
  document.addEventListener("keydown", escapeListener, true);
}

export function renderHud() {
  if (!game?.ready) return;

  removeHud();
  hideHover(); // la tarjeta sobre la que estaba el cursor deja de existir

  const client = getClientConfig();
  if (client.hidden) return;

  const config = getConfig();
  const order = Array.isArray(config.order) ? config.order : [];
  if (!order.length) return;

  const hud = document.createElement("div");
  hud.id = "pcp-party-hud";
  hud.className = "pcp-party-hud";
  hud.classList.add(config.bar.free?.enabled ? "pcp-free" : `pcp-${config.bar.position}`);
  hud.classList.add(`pcp-${config.bar.orientation}`);
  hud.style.setProperty("--pcp-gap", `${config.bar.gap}px`);
  hud.style.setProperty("--pcp-offset-x", `${config.bar.offsetX}px`);
  hud.style.setProperty("--pcp-offset-y", `${config.bar.offsetY}px`);
  hud.style.setProperty("--pcp-border-color", normalizeColor(config.appearance.borderColor));
  hud.style.setProperty("--pcp-border-width", `${config.appearance.borderWidth}px`);
  hud.style.setProperty("--pcp-radius", `${config.appearance.radius}px`);
  hud.style.setProperty("--pcp-bar-height", `${config.data.barHeight}px`);
  hud.style.setProperty("--pcp-opacity", `${config.appearance.opacity}`);
  hud.style.setProperty("--pcp-hover-scale", `${config.appearance.hoverScale}`);
  hud.style.setProperty("--pcp-name-color", config.appearance.nameColor);

  for (const actorId of order) {
    const actor = game.actors?.get(actorId);
    if (!actor) continue;
    hud.appendChild(buildCard(actor, config, client));
  }

  if (!hud.querySelector(".pcp-card")) return;

  if (game.user.isGM) hud.appendChild(createHudHandle());
  document.body.appendChild(hud);
  applyPosition(hud, config);
  if (!config.bar.free?.enabled) avoidCoreUi(hud, config.bar.position);
  attachDrag(hud);

  if (moveMode) {
    hud.classList.add("pcp-move-mode");
    hud.appendChild(createMoveHint());
  }
}

export { removeHud, buildCard };
