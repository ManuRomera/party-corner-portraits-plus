/**
 * Party Corner Portraits +
 * Aspecto visual de cada retrato (transparencia, halo, giro, rotación, cuenta atrás).
 * El mismo código dibuja la barra y la vista previa en vivo del estudio.
 */

import { DEFAULT_GLOW } from "./constants.js";

function hexToRgba(hex, alpha) {
  const text = String(hex ?? "#ffffff").replace("#", "");
  const n = parseInt(text.length === 6 ? text : "ffffff", 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${Math.max(0, Math.min(1, alpha))})`;
}

/** Radios del halo: «fuerza» = alcance; «suavidad» = de banda nítida a luz difusa. */
export function glowStyle(glow) {
  const g = { ...DEFAULT_GLOW, ...glow };
  const reach = 2 + g.power * 0.2;
  const soft = g.soft / 100;
  return {
    color: hexToRgba(g.color, g.alpha / 100),
    near: `${(reach * (0.12 + 0.6 * soft)).toFixed(1)}px`,
    far: `${(reach * (0.7 + 1.6 * soft)).toFixed(1)}px`
  };
}

/**
 * @param {HTMLElement} card  tarjeta de la barra
 * @param {object} actorConfig  configuración del personaje (ya mezclada con los valores por defecto)
 * @param {number} globalOpacity  opacidad global de la barra
 */
export function applyLook(card, actorConfig, globalOpacity = 1) {
  const opacity = (actorConfig.opacity ?? 1) * globalOpacity;
  card.style.setProperty("--pcp-opacity", String(opacity));
  card.style.opacity = String(opacity);

  card.style.setProperty("--pcp-tilt", `${actorConfig.tilt ?? 0}deg`);
  card.classList.toggle("pcp-hidden-gm", Boolean(actorConfig.hidden));

  const glow = actorConfig.glow;
  card.classList.toggle("pcp-glow", Boolean(glow));
  card.classList.toggle("pcp-glow-pulse", Boolean(glow?.pulse));
  if (glow) {
    const { color, near, far } = glowStyle(glow);
    card.style.setProperty("--pcp-glow-color", color);
    card.style.setProperty("--pcp-glow-near", near);
    card.style.setProperty("--pcp-glow-far", far);
  } else {
    for (const name of ["--pcp-glow-color", "--pcp-glow-near", "--pcp-glow-far"]) card.style.removeProperty(name);
  }

  const wrap = card.querySelector(".pcp-media-wrap");
  if (wrap) {
    const flip = `scale(${actorConfig.flipX ? -1 : 1}, ${actorConfig.flipY ? -1 : 1})`;
    const rotate = actorConfig.rotation ? `rotate(${actorConfig.rotation}deg) ` : "";
    wrap.style.transform = rotate + flip === "scale(1, 1)" ? "" : rotate + flip;
  }
}

/** Número de cuenta atrás sobre el retrato. */
export function buildCountdown(countdown) {
  if (!countdown) return null;
  const badge = document.createElement("div");
  badge.className = `pcp-countdown${countdown.turns <= 0 ? " pcp-countdown-end" : ""}`;
  badge.style.setProperty("--pcp-countdown-scale", String(countdown.size));
  badge.textContent = String(countdown.turns);
  badge.setAttribute("aria-label", String(countdown.turns));
  return badge;
}

/** Focus y Spotlight: atenúan el resto de retratos (solo en esta pantalla). */
export const focusState = { ids: new Set(), spot: false };

export function applyFocus(hud = document.getElementById("pcp-party-hud")) {
  if (!hud) return;
  const active = focusState.ids.size > 0;
  hud.classList.toggle("pcp-focus-on", active);
  for (const card of hud.querySelectorAll(".pcp-card")) {
    const on = active && focusState.ids.has(card.dataset.actorId);
    card.classList.toggle("pcp-focused", on);
    card.classList.toggle("pcp-spot", on && focusState.spot);
  }
}

export function setFocus(ids, spot = false) {
  focusState.ids = new Set(ids);
  focusState.spot = spot;
  applyFocus();
}

/** Aspecto propio de la imagen ampliada (hoverOpacity, hoverGlow…), independiente del retrato de la barra. */
export function applyHoverLook(stage, media, actorConfig, config) {
  const opacity = actorConfig.hoverOpacity;
  stage.style.opacity = opacity === null || opacity === undefined ? "" : String(opacity);
  const flip = `scale(${actorConfig.hoverFlipX ? -1 : 1}, ${actorConfig.hoverFlipY ? -1 : 1})`;
  const rotate = actorConfig.hoverRotation ? `rotate(${actorConfig.hoverRotation}deg) ` : "";
  stage.style.transform = rotate + flip === "scale(1, 1)" ? "" : rotate + flip;
  stage.classList.toggle("pcp-gray", Boolean(config.appearance.grayscale));

  const glow = actorConfig.hoverGlow;
  media.classList.toggle("pcp-glow", Boolean(glow));
  media.classList.toggle("pcp-glow-pulse", Boolean(glow?.pulse));
  if (glow) {
    const { color, near, far } = glowStyle(glow);
    media.style.setProperty("--pcp-glow-color", color);
    media.style.setProperty("--pcp-glow-near", near);
    media.style.setProperty("--pcp-glow-far", far);
  }
}
