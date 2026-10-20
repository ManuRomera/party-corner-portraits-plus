/**
 * Party Corner Portraits +
 * Accesibilidad: ajustes de cliente (cada persona los suyos) y un panel al que se
 * llega desde un icono en la cabecera de las ventanas, junto al de cerrar.
 */

import { createDefaultClientConfig } from "./constants.js";
import { getClientConfig, mutateClientConfig } from "./settings.js";
import { localize } from "./utils.js";
import { refreshAll } from "./events.js";

const { ApplicationV2 } = foundry.applications.api;

export function applyA11y() {
  if (!document.body) return;
  const { a11y } = getClientConfig();
  document.documentElement.style.setProperty("--pcp-text-scale", String(a11y.text / 100));
  document.body.classList.toggle("pcp-a11y-contrast", a11y.contrast);
  document.body.classList.toggle("pcp-a11y-legible", a11y.legible);
  document.body.classList.toggle("pcp-a11y-calm", a11y.motion);
}

// Los cambios se encadenan: dos interruptores pulsados seguidos no se pisan.
let queue = Promise.resolve();

function setA11y(patch) {
  queue = queue.then(async () => {
    await mutateClientConfig(config => {
      config.a11y = { ...config.a11y, ...patch };
    });
    applyA11y();
    refreshAll();
  });
  return queue;
}

const CHECKS = [
  ["contrast", "PCP.A11y.Contrast", "PCP.A11y.ContrastHint"],
  ["legible", "PCP.A11y.Legible", "PCP.A11y.LegibleHint"],
  ["motion", "PCP.A11y.Motion", "PCP.A11y.MotionHint"]
];

export class A11yPanel extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pcp-plus-a11y",
    classes: ["pcp-plus-window", "pcp-a11y-panel", "themed", "theme-dark"],
    position: { width: 380, height: "auto" },
    window: { title: "PCP.A11y.Title", icon: "fa-solid fa-universal-access" }
  };

  static open() {
    const existing = foundry.applications.instances.get(A11yPanel.DEFAULT_OPTIONS.id);
    if (existing?.rendered) return existing.bringToFront();
    return new A11yPanel().render({ force: true });
  }

  async _renderHTML() {
    const { a11y } = getClientConfig();
    const rows = CHECKS.map(
      ([key, label, hint]) => `
        <label class="pcp-row pcp-row-check">
          <span class="pcp-row-text">${localize(label)}<small>${localize(hint)}</small></span>
          <input type="checkbox" class="pcp-switch" name="${key}" ${a11y[key] ? "checked" : ""}>
        </label>`
    ).join("");
    return `
      <div class="pcp-form">
        <section class="pcp-card-group">
          <label class="pcp-row">
            <span class="pcp-row-text">${localize("PCP.A11y.TextSize")}<small>${localize("PCP.A11y.TextSizeHint")}</small></span>
            <span class="pcp-range"><input type="range" name="text" min="85" max="160" step="5" value="${a11y.text}" aria-label="${localize("PCP.A11y.TextSize")}"><output>${a11y.text}%</output></span>
          </label>
          ${rows}
        </section>
        <p class="pcp-note">${localize("PCP.A11y.Note")}</p>
        <div class="pcp-actions">
          <button type="button" data-reset><i class="fa-solid fa-rotate-left"></i> ${localize("PCP.A11y.Reset")}</button>
        </div>
      </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    for (const input of content.querySelectorAll("input")) {
      input.addEventListener("change", () =>
        setA11y({ [input.name]: input.type === "checkbox" ? input.checked : Number(input.value) })
      );
    }
    content.querySelector('input[type="range"]')?.addEventListener("input", event => {
      event.target.parentElement.querySelector("output").value = `${event.target.value}%`;
    });
    content.querySelector("[data-reset]")?.addEventListener("click", async () => {
      await setA11y(createDefaultClientConfig().a11y);
      this.render();
    });
  }
}

/** Añade el icono de accesibilidad justo antes del de cerrar. */
export function addA11yButton(app) {
  const header = app.element?.querySelector(".window-header");
  if (!header || header.querySelector(".pcp-a11y-button")) return;
  const button = document.createElement("button");
  button.type = "button";
  button.className = "header-control icon fa-solid fa-universal-access pcp-a11y-button";
  button.dataset.tooltip = localize("PCP.A11y.Title");
  button.setAttribute("aria-label", localize("PCP.A11y.Title"));
  button.addEventListener("click", event => {
    event.stopPropagation();
    A11yPanel.open();
  });
  const close = header.querySelector('[data-action="close"]');
  if (close) close.before(button);
  else header.append(button);
}
