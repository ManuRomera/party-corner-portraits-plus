/**
 * Party Corner Portraits +
 * Vista ampliada: al dejar el cursor sobre un retrato de la barra se ve en grande el token,
 * el retrato o un archivo propio (imagen, GIF o vídeo en bucle). El máster puede enseñárselo a todos.
 * Inspirado en el módulo Image Hover, pero disparado por los retratos de este módulo.
 */

import { MODULE_ID } from "./constants.js";
import { getClientConfig, getConfig, mutateClientConfig, mutateConfig } from "./settings.js";
import { refreshAll } from "./events.js";
import { getActorConfig, getActorPlayerLabel, localize } from "./utils.js";
import { createPortraitElement, hoverSource, naturalSize } from "./media.js";
import { applyHoverLook } from "./look.js";
import { visiblePortraits } from "./scene.js";

const ID = "pcp-hover";
const MARGIN = 8;
const LEVELS = { LIMITED: 1, OBSERVER: 2, OWNER: 3 };

let live = null; // {actorId, media, stage, reposition, placement} de la imagen mostrada
let timer = null;
let hideTimer = null;
let element = null;
let sharedUntil = 0;

function canSee(actor, permission) {
  if (game.user.isGM || permission === "none") return true;
  return actor.testUserPermission(game.user, permission) || actor.ownership?.[game.user.id] >= LEVELS[permission];
}

export function hideHover({ force = false } = {}) {
  window.clearTimeout(timer);
  if (!force && Date.now() < sharedUntil) return;
  window.clearTimeout(hideTimer);
  element?.remove();
  element = null;
  live = null;
  sharedUntil = 0;
}

let dragging = false;

/** Coloca el panel: en el punto fijo elegido por el máster (o en una esquina/centro), siempre dentro de la pantalla. */
function place(placement, pos, moving = false) {
  if (!element || dragging) return;
  const box = element.getBoundingClientRect();
  const { innerWidth: vw, innerHeight: vh } = window;
  let x;
  let y;

  if (placement === "top-left") {
    [x, y] = [MARGIN + 80, MARGIN];
  } else if (placement === "top-right") {
    [x, y] = [vw - box.width - MARGIN - 60, MARGIN];
  } else if (placement === "bottom-left") {
    [x, y] = [MARGIN + 80, vh - box.height - MARGIN];
  } else if (placement === "bottom-right") {
    [x, y] = [vw - box.width - MARGIN - 60, vh - box.height - MARGIN];
  } else if (placement === "free") {
    // El punto elegido es el centro de la imagen (en fracción de pantalla): vale para cualquier tamaño.
    [x, y] = [pos.x * vw - box.width / 2, pos.y * vh - box.height / 2];
  } else {
    [x, y] = [(vw - box.width) / 2, (vh - box.height) / 2];
  }

  // Posiciones enteras: con medios píxeles el navegador reescala la imagen y se ve borrosa.
  if (placement === "free") {
    // Punto libre: puede quedar parcialmente (o del todo) fuera de la pantalla si así se ha colocado.
    // Solo en el modo de colocar se mantiene un trozo visible para poder agarrarla.
    if (moving) {
      x = Math.min(Math.max(-box.width + 80, x), vw - 80);
      y = Math.min(Math.max(-box.height + 80, y), vh - 80);
    }
    element.style.left = `${Math.round(x)}px`;
    element.style.top = `${Math.round(y)}px`;
  } else {
    element.style.left = `${Math.round(Math.min(Math.max(MARGIN, x), Math.max(MARGIN, vw - box.width - MARGIN)))}px`;
    element.style.top = `${Math.round(Math.min(Math.max(MARGIN, y), Math.max(MARGIN, vh - box.height - MARGIN)))}px`;
  }
  element.style.visibility = "visible";
}

/** Ajusta el lado mayor al tamaño elegido (sin pasarse de la pantalla) y coloca el panel. */
function fit(media, size, sharp, reposition) {
  const natural = naturalSize(media);
  if (natural) {
    const limit = Math.min(size, window.innerWidth * 0.9, window.innerHeight * 0.85);
    // Sin «ampliar», nunca se dibuja por encima de su tamaño real: es lo que mantiene la nitidez.
    const scale = Math.min(limit / Math.max(natural.w, natural.h), sharp ? 1 : 6);
    media.style.width = `${Math.round(natural.w * scale)}px`;
    media.style.height = `${Math.round(natural.h * scale)}px`;
    media.style.maxWidth = "none";
  }
  reposition();
}

export function showHover(actorId, { card = null, shared = false, moving = false, persist = false, override = null } = {}) {
  const actor = game.actors?.get(actorId);
  if (!actor) return;
  const config = getConfig();
  const client = getClientConfig();
  const actorConfig = { ...getActorConfig(config, actorId), ...override };

  hideHover({ force: true });

  const src = hoverSource(actor, actorConfig, config);
  // Si el jugador ha colocado la imagen ampliada en su pantalla, manda su sitio sobre el del máster.
  const mine = !game.user.isGM && client.hoverPos ? client.hoverPos : null;
  const pos = mine ?? config.hover.pos;
  const placement = shared ? "center" : moving || mine ? "free" : config.hover.placement;

  element = document.createElement("div");
  element.id = ID;
  element.className = `pcp-hover${shared ? " pcp-hover-shared" : ""}${config.hover.box ? " pcp-hover-box" : ""}`;
  element.style.visibility = "hidden";
  element.setAttribute("role", "img");
  element.setAttribute("aria-label", actor.name);

  const media = createPortraitElement(src, { alt: actor.name, still: client.a11y.motion });
  media.classList.add("pcp-hover-media");
  media.decoding = "sync";
  const stage = document.createElement("div");
  stage.className = "pcp-hover-stage";
  stage.appendChild(media);
  element.appendChild(stage);
  applyHoverLook(stage, media, actorConfig, config);

  document.body.appendChild(element);
  // El panel puede cambiar de tamaño al cargar el medio o el texto: se recoloca siempre dentro de la pantalla.
  new ResizeObserver(() => place(placement, pos, moving)).observe(element);
  const reposition = () => place(placement, pos, moving);
  live = { actorId, media, stage, reposition };
  const refit = () => fit(media, actorConfig.hoverSize ?? config.hover.size, config.hover.sharp, reposition);
  media.addEventListener("load", refit, { once: true });
  media.addEventListener("loadedmetadata", refit, { once: true });
  // Imágenes ya en caché: no siempre disparan «load».
  if (media.complete || media.readyState >= 1) refit();
  else reposition();

  if (persist) element.classList.add("pcp-hover-preview"); // detrás de las ventanas, para no tapar los controles
  if (persist) sharedUntil = Infinity; // vista previa del estudio: se queda hasta cerrarla

  if (shared) {
    const ms = config.hover.sharedSeconds * 1000;
    sharedUntil = Date.now() + ms;
    hideTimer = window.setTimeout(() => hideHover({ force: true }), ms);
  }
}

function schedule(actor, card) {
  window.clearTimeout(timer);
  const config = getConfig();
  if (!config.hover.enabled || getClientConfig().hoverOff) return;
  if (document.getElementById("pcp-party-hud")?.classList.contains("pcp-move-mode")) return;
  if (!canSee(actor, config.hover.permission)) return;
  timer = window.setTimeout(() => showHover(actor.id, { card }), config.hover.delay);
}

/** Engancha la vista ampliada a una tarjeta de la barra. */
export function attachHover(card, actor) {
  card.addEventListener("pointerenter", () => schedule(actor, card));
  card.addEventListener("pointerleave", () => hideHover());
  card.addEventListener("pointerdown", () => hideHover());
  card.addEventListener("contextmenu", () => hideHover());
  card.addEventListener("focus", () => schedule(actor, card));
  card.addEventListener("blur", () => hideHover());
}

/**
 * Modo «mover la imagen ampliada»: se muestra la del primer personaje de la barra y se arrastra hasta
 * el punto que convenga; al soltar se fija ahí para todos los personajes. Esc cancela.
 */
export function startHoverMove() {
  const config = getConfig();
  const actorId =
    visiblePortraits(config).ids.find(id => game.actors?.get(id)) ??
    config.order.find(id => game.actors?.get(id)) ??
    game.actors?.contents[0]?.id;
  if (!actorId) {
    ui.notifications.warn(localize("PCP.Hover.NoCharacters"));
    return;
  }
  showHover(actorId, { moving: true });
  if (!element) return;
  sharedUntil = Infinity; // no se cierra mientras se coloca
  element.classList.add("pcp-hover-moving");
  const hint = document.createElement("div");
  hint.className = "pcp-hover-hint";
  hint.innerHTML = `<i class="fa-solid fa-up-down-left-right"></i> ${localize("PCP.Hover.MoveHint")}`;
  element.appendChild(hint);

  const finish = () => {
    dragging = false;
    document.removeEventListener("keydown", onKey, true);
    sharedUntil = 0;
    hideHover({ force: true });
  };
  const onKey = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      finish();
    }
  };
  document.addEventListener("keydown", onKey, true);

  element.addEventListener("pointerdown", event => {
    if (event.button !== 0) return;
    event.preventDefault();
    dragging = true;
    const rect = element.getBoundingClientRect();
    const dx = event.clientX - rect.left;
    const dy = event.clientY - rect.top;
    const move = e => {
      // Sin límites: se puede sacar de los márgenes de la pantalla.
      element.style.left = `${e.clientX - dx}px`;
      element.style.top = `${e.clientY - dy}px`;
    };
    const up = async () => {
      window.removeEventListener("pointermove", move);
      const box = element.getBoundingClientRect();
      const pos = {
        x: (box.left + box.width / 2) / window.innerWidth,
        y: (box.top + box.height / 2) / window.innerHeight
      };
      finish();
      // El máster fija el sitio de todos; un jugador, solo el de su pantalla.
      if (game.user.isGM) {
        await mutateConfig(cfg => {
          cfg.hover.placement = "free";
          cfg.hover.pos = pos;
        });
      } else {
        await mutateClientConfig(client => {
          client.hoverPos = pos;
        });
      }
      refreshAll();
      ui.notifications.info(localize("PCP.Hover.MoveSaved"));
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
  });
}

/** El máster enseña la imagen ampliada de un personaje a todos los conectados. */
export function showToEveryone(actorId) {
  if (!game.user.isGM) return;
  game.socket.emit(`module.${MODULE_ID}`, { type: "show", actorId });
  showHover(actorId, { shared: true });
}

export function registerHoverSocket() {
  game.socket.on(`module.${MODULE_ID}`, (data, userId) => {
    if (data?.type !== "show" || !game.users.get(userId)?.isGM) return;
    showHover(data.actorId, { shared: true });
  });
}

window.addEventListener("resize", () => hideHover());

/** Cambia al vuelo el aspecto o el tamaño de la imagen ya mostrada (vista previa del estudio). */
export function refreshHoverPreview(actorId, override) {
  if (!element || !live || live.actorId !== actorId) return false;
  const config = getConfig();
  const actorConfig = { ...getActorConfig(config, actorId), ...override };
  applyHoverLook(live.stage, live.media, actorConfig, config);
  fit(live.media, actorConfig.hoverSize ?? config.hover.size, config.hover.sharp, live.reposition);
  return true;
}

/** El jugador vuelve al sitio que fijó el máster para la imagen ampliada. */
export async function resetMyHoverPosition() {
  await mutateClientConfig(client => {
    client.hoverPos = null;
  });
  refreshAll();
}
