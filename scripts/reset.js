/**
 * Party Corner Portraits +
 * Volver a la configuración original del módulo, por si algo se rompe.
 * Está en Configuración → Ajustes del módulo y en el pie de la ventana de configuración.
 */

import { MODULE_ID, SETTING_CLIENT, SETTING_CONFIG, createDefaultClientConfig, createDefaultConfig } from "./constants.js";
import { localize } from "./utils.js";
import { refreshAll } from "./events.js";
import { ensureInitialized } from "./settings.js";

const { ApplicationV2, DialogV2 } = foundry.applications.api;

function clearWindowMemory() {
  try {
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (key?.startsWith(`${MODULE_ID}.window.`)) localStorage.removeItem(key);
    }
  } catch {
    /* sin almacenamiento local: no hay nada que borrar */
  }
}

/**
 * Deja el módulo como recién instalado: configuración del mundo de serie (se vuelve a elegir
 * el grupo y la barra del sistema), y, si se pide, también las preferencias de este navegador.
 */
export async function resetModule({ personal = true } = {}) {
  if (!game.user.isGM) return;
  await game.settings.set(MODULE_ID, SETTING_CONFIG, createDefaultConfig());
  if (personal) {
    await game.settings.set(MODULE_ID, SETTING_CLIENT, createDefaultClientConfig());
    clearWindowMemory();
  }
  await ensureInitialized();
  for (const app of foundry.applications.instances.values()) {
    if (app.id?.startsWith("pcp-plus-") && app.id !== "pcp-plus-reset") app.close();
  }
  refreshAll();
  ui.notifications.info(localize("PCP.Reset.Done"));
}

/** Pide confirmación y restablece. Devuelve true si se hizo. */
export async function confirmReset() {
  const result = await DialogV2.wait({
    window: { title: localize("PCP.Reset.Title"), icon: "fa-solid fa-rotate-left" },
    content: `
      <div class="pcp-dialog-content">
        <p>${localize("PCP.Reset.Confirm")}</p>
        <label class="pcp-dialog-check"><input type="checkbox" name="personal" checked> ${localize("PCP.Reset.Personal")}</label>
      </div>`,
    buttons: [
      {
        action: "reset",
        label: localize("PCP.Reset.Button"),
        icon: "fa-solid fa-rotate-left",
        default: false,
        callback: (event, button) => ({ personal: button.form.elements.personal.checked })
      },
      { action: "cancel", label: localize("PCP.Common.Cancel"), icon: "fa-solid fa-xmark", default: true }
    ],
    rejectClose: false
  }).catch(() => null);
  if (!result || result === "cancel") return false;
  await resetModule(result);
  return true;
}

/** Entrada del menú de ajustes del módulo: abre un panel con el botón de restablecer. */
export class ResetApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pcp-plus-reset",
    classes: ["pcp-plus-window", "pcp-reset-app", "themed", "theme-dark"],
    position: { width: 420, height: "auto" },
    window: { title: "PCP.Reset.Title", icon: "fa-solid fa-rotate-left" }
  };

  async _renderHTML() {
    return `
      <div class="pcp-form">
        <p class="pcp-note pcp-note-top">${localize("PCP.Reset.Explain")}</p>
        <div class="pcp-actions">
          <button type="button" class="pcp-danger" data-reset><i class="fa-solid fa-rotate-left"></i> ${localize("PCP.Reset.Button")}</button>
        </div>
      </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    content.querySelector("[data-reset]").addEventListener("click", async () => {
      if (await confirmReset()) this.close();
    });
  }
}
