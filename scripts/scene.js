/**
 * Party Corner Portraits +
 * Retratos por escena: en modo «escena» se muestran los marcados como fijos y los personajes
 * que tienen un token en la escena que se está viendo, con el mismo estado que ese token
 * (si el token está oculto, el retrato queda oculto para los jugadores).
 */

import { getActorConfig } from "./utils.js";

/** Tokens de la escena actual agrupados por actor base. */
export function sceneTokens() {
  const map = new Map();
  const scene = globalThis.canvas?.scene;
  if (!scene) return map;
  for (const token of scene.tokens) {
    const id = token.actorId;
    if (!id) continue;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(token);
  }
  return map;
}

/**
 * Qué retratos toca pintar, en orden, y cuáles quedan ocultos por el estado de sus tokens.
 * @returns {{ids: string[], tokenHidden: Set<string>}}
 */
export function visiblePortraits(config) {
  const tokens = sceneTokens();
  const tokenHidden = new Set();
  let ids = [...config.order];

  if (config.scene.mode === "scene") {
    ids = ids.filter(id => getActorConfig(config, id).pinned || tokens.has(id));
    if (config.scene.auto) {
      for (const id of tokens.keys()) if (!ids.includes(id) && globalThis.game?.actors?.get(id)) ids.push(id);
    }
    for (const id of ids) {
      const own = tokens.get(id);
      // Fijo y sin token en esta escena: se ve. Con tokens: se oculta solo si están todos ocultos.
      if (own?.length && own.every(token => token.hidden)) tokenHidden.add(id);
    }
  }
  return { ids, tokenHidden };
}
