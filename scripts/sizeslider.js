/**
 * Party Corner Portraits +
 * Deslizador de tamaño en vivo: los retratos cambian mientras se arrastra y se guarda al soltar.
 * El máster cambia el tamaño de todos (ajuste del mundo); cada jugador, la escala de los suyos (solo en su pantalla).
 */

import { SIZE_MAX, SIZE_MIN } from "./constants.js";
import { getClientConfig, getConfig, mutateClientConfig, mutateConfig } from "./settings.js";
import { clampSize, localize } from "./utils.js";
import { refreshAll } from "./events.js";

const ID = "pcp-size-slider";
let outside = null;

export function closeSizeSlider() {
  document.getElementById(ID)?.remove();
  if (outside) {
    document.removeEventListener("pointerdown", outside, true);
    document.removeEventListener("keydown", outside, true);
    outside = null;
  }
}

/** Aplica el valor a las tarjetas sin guardar. */
function preview(value, gm) {
  for (const card of document.querySelectorAll("#pcp-party-hud .pcp-card, #pcp-floats .pcp-card")) {
    const base = Number(card.dataset.baseSize) || getConfig().bar.size;
    const size = gm ? clampSize(value, base) : clampSize(base * (value / 100), base);
    card.style.setProperty("--pcp-card-size", `${size}px`);
  }
}

export function openSizeSlider({ x = 120, y = 120 } = {}) {
  closeSizeSlider();
  const gm = game.user.isGM;
  const min = gm ? SIZE_MIN : 50;
  const max = gm ? SIZE_MAX : 200;
  const current = gm ? getConfig().bar.size : Math.round(getClientConfig().scale * 100);
  const unit = gm ? " px" : " %";

  const panel = document.createElement("div");
  panel.id = ID;
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", localize("PCP.Size.Title"));
  panel.innerHTML = `
    <div class="pcp-size-head"><i class="fa-solid fa-up-right-and-down-left-from-center" aria-hidden="true"></i><span>${localize(gm ? "PCP.Size.TitleAll" : "PCP.Size.Title")}</span></div>
    <div class="pcp-size-body">
      <input type="range" min="${min}" max="${max}" step="1" value="${current}" aria-label="${localize("PCP.Size.Title")}">
      <output>${current}${unit}</output>
    </div>
    <p class="pcp-size-note">${localize(gm ? "PCP.Size.NoteAll" : "PCP.Size.Note")}</p>
    <div class="pcp-size-actions">
      ${gm ? "" : `<button type="button" data-reset><i class="fa-solid fa-rotate-left"></i> ${localize("PCP.Size.Reset")}</button>`}
      <button type="button" data-close><i class="fa-solid fa-check"></i> ${localize("PCP.Size.Done")}</button>
    </div>`;
  document.body.appendChild(panel);

  const range = panel.querySelector("input");
  const output = panel.querySelector("output");
  range.addEventListener("input", () => {
    output.value = `${range.value}${unit}`;
    preview(Number(range.value), gm);
  });
  const commit = async value => {
    if (gm) {
      await mutateConfig(config => {
        config.bar.size = clampSize(value, config.bar.size);
        for (const id of Object.keys(config.actors)) config.actors[id].size = null;
      });
    } else {
      await mutateClientConfig(config => {
        config.scale = value / 100;
      });
    }
    refreshAll();
  };
  range.addEventListener("change", () => commit(Number(range.value)));
  panel.querySelector("[data-reset]")?.addEventListener("click", async () => {
    range.value = "100";
    output.value = `100${unit}`;
    await commit(100);
  });
  panel.querySelector("[data-close]").addEventListener("click", closeSizeSlider);

  const width = panel.offsetWidth || 260;
  const height = panel.offsetHeight || 140;
  panel.style.left = `${Math.round(Math.min(Math.max(8, x), window.innerWidth - width - 8))}px`;
  panel.style.top = `${Math.round(Math.min(Math.max(8, y), window.innerHeight - height - 8))}px`;

  outside = event => {
    if (event.type === "keydown") {
      if (event.key === "Escape") closeSizeSlider();
      return;
    }
    if (!panel.contains(event.target)) closeSizeSlider();
  };
  // Un instante después, para que el clic que lo abrió no lo cierre.
  window.setTimeout(() => {
    document.addEventListener("pointerdown", outside, true);
    document.addEventListener("keydown", outside, true);
  }, 50);
  range.focus();
}
