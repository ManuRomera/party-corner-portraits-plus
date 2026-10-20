/**
 * Party Corner Portraits +
 * Memoria de ventanas: posición, tamaño y pestaña se recuerdan por usuario y mundo
 * (localStorage: es una preferencia de este navegador, no un dato del mundo).
 */

import { MODULE_ID } from "./constants.js";

const key = id => `${MODULE_ID}.window.${game.world?.id}.${game.user?.id}.${id}`;

export function readMemory(id) {
  try {
    return JSON.parse(localStorage.getItem(key(id))) ?? {};
  } catch {
    return {};
  }
}

function writeMemory(id, patch) {
  try {
    localStorage.setItem(key(id), JSON.stringify({ ...readMemory(id), ...patch }));
  } catch (error) {
    console.warn("Party Corner Portraits + | no se pudo guardar la ventana", error);
  }
}

const numbers = (position, fields) =>
  Object.fromEntries(fields.filter(f => Number.isFinite(position?.[f])).map(f => [f, Math.round(position[f])]));

/**
 * @param {typeof foundry.applications.api.ApplicationV2} Base
 * La subclase declara `static MEMORY_ID` y, si quiere, `static MEMORY_FIELDS`
 * (por defecto left/top/width/height; las ventanas de alto automático omiten height).
 */
export function WithMemory(Base) {
  return class extends Base {
    static MEMORY_FIELDS = ["left", "top", "width", "height"];

    constructor(options = {}) {
      const Cls = new.target;
      const id = options.memoryId ?? Cls.MEMORY_ID ?? Cls.name;
      const saved = numbers(readMemory(id).position, Cls.MEMORY_FIELDS);
      super({ ...options, position: { ...options.position, ...saved } });
      this._memoryId = id;
      this._memoryTab = readMemory(id).tab;
    }

    get memoryTab() {
      return this._memoryTab;
    }

    rememberTab(tab) {
      this._memoryTab = tab;
      writeMemory(this._memoryId, { tab });
    }

    _onPosition(position) {
      super._onPosition?.(position);
      if (!this.rendered) return;
      clearTimeout(this._memoryTimer);
      this._memoryTimer = setTimeout(() => {
        const fields = this.minimized ? ["left", "top"] : this.constructor.MEMORY_FIELDS;
        writeMemory(this._memoryId, {
          position: { ...readMemory(this._memoryId).position, ...numbers(this.position, fields) }
        });
      }, 250);
    }
  };
}
