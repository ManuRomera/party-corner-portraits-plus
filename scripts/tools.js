/**
 * Party Corner Portraits +
 * Botones rápidos al pasar el cursor sobre un retrato (solo el máster), como los del HUD de un token:
 * ocultar o mostrar a los jugadores, deshacer la inclinación, sacar o meter en la barra, estudio y menú.
 */

import { getActorConfig, localize } from "./utils.js";
import { getConfig, mutateConfig } from "./settings.js";
import { refreshAll, dispatchMenuEvent } from "./events.js";
import { setLoose } from "./addactors.js";
import { openStudio } from "./studio.js";

let panel = null;
let hideTimer = null;
let currentCard = null;

export async function setHidden(actorId, hidden) {
  await mutateConfig(config => {
    config.actors[actorId] = { ...getActorConfig(config, actorId), hidden };
  });
  refreshAll();
}

export async function setTilt(actorId, tilt) {
  await mutateConfig(config => {
    config.actors[actorId] = { ...getActorConfig(config, actorId), tilt: Math.max(-180, Math.min(180, tilt)) };
  });
  refreshAll();
}

export function hideTools(delay = 0) {
  window.clearTimeout(hideTimer);
  const remove = () => {
    panel?.remove();
    panel = null;
    currentCard = null;
  };
  if (delay) hideTimer = window.setTimeout(remove, delay);
  else remove();
}

function button(icon, title, action, active = false) {
  const el = document.createElement("button");
  el.type = "button";
  el.className = `pcp-tool${active ? " pcp-on" : ""}`;
  el.title = title;
  el.setAttribute("aria-label", title);
  el.innerHTML = `<i class="${icon}" aria-hidden="true"></i>`;
  el.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    hideTools();
    action();
  });
  return el;
}

/** Muestra los botones junto a la tarjeta (a su derecha, o a su izquierda si no cabe). */
export function showTools(card, actorId) {
  if (!game.user.isGM) return;
  window.clearTimeout(hideTimer);
  if (currentCard === card && panel) return;
  hideTools();

  const config = getConfig();
  const actorConfig = getActorConfig(config, actorId);
  const loose = Boolean(actorConfig.float);

  panel = document.createElement("div");
  panel.id = "pcp-card-tools";
  panel.append(
    button(
      actorConfig.hidden ? "fa-solid fa-eye-slash" : "fa-solid fa-eye",
      actorConfig.hidden ? localize("PCP.Tools.Show") : localize("PCP.Tools.Hide"),
      () => setHidden(actorId, !actorConfig.hidden),
      actorConfig.hidden
    ),
    button("fa-solid fa-rotate-left", localize("PCP.Tools.ResetTilt"), () => setTilt(actorId, 0)),
    button(
      loose ? "fa-solid fa-table-cells-large" : "fa-solid fa-up-down-left-right",
      loose ? localize("PCP.Menu.Actor.IntoBar") : localize("PCP.Menu.Actor.OutOfBar"),
      () => {
        const rect = card.getBoundingClientRect();
        setLoose(
          actorId,
          loose ? null : { x: (rect.left + rect.width / 2) / window.innerWidth, y: (rect.top + rect.height / 2) / window.innerHeight }
        );
      },
      loose
    ),
    button("fa-solid fa-wand-magic-sparkles", localize("PCP.Menu.Hud.Studio"), () => openStudio([actorId])),
    button("fa-solid fa-ellipsis", localize("PCP.Tools.Menu"), () => {
      const rect = card.getBoundingClientRect();
      dispatchMenuEvent("pcp:actor-menu", { actorId, x: rect.right, y: rect.top });
    })
  );
  panel.addEventListener("pointerenter", () => window.clearTimeout(hideTimer));
  panel.addEventListener("pointerleave", () => hideTools(160));
  document.body.appendChild(panel);
  currentCard = card;

  const rect = card.getBoundingClientRect();
  const width = panel.offsetWidth || 38;
  const height = panel.offsetHeight || 190;
  const right = rect.right + 6 + width <= window.innerWidth - 4;
  panel.style.left = `${Math.round(right ? rect.right + 6 : rect.left - 6 - width)}px`;
  panel.style.top = `${Math.round(Math.min(Math.max(4, rect.top), window.innerHeight - height - 4))}px`;
}
