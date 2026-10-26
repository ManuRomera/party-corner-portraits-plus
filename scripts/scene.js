/**
 * Party Corner Portraits +
 * Retratos por escena: en modo «escena» se muestran los personajes de jugador (siempre), los marcados
 * como fijos y todos los que tienen un token en la escena que se está viendo, con el mismo estado que
 * ese token (si el token está oculto, el retrato queda oculto para los jugadores).
 */

import { actorOwners, getActorConfig } from "./utils.js";

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

/** Los personajes de un jugador son siempre fijos. */
export function isPlayerActor(actor) {
  return Boolean(actor) && actorOwners(actor).length > 0;
}

/**
 * Qué retratos toca pintar, en orden, y cuáles quedan ocultos por el estado de sus tokens.
 * Los personajes de jugador salen siempre (en cualquier modo) salvo que se hayan quitado a mano.
 * @returns {{ids: string[], tokenHidden: Set<string>}}
 */
export function visiblePortraits(config) {
  const tokens = sceneTokens();
  const tokenHidden = new Set();
  const actors = globalThis.game?.actors;
  const excluded = id => getActorConfig(config, id).excluded;
  let ids = [...config.order];

  if (config.scene.mode === "scene") {
    ids = ids.filter(id => getActorConfig(config, id).pinned || isPlayerActor(actors?.get(id)) || tokens.has(id));
  }

  // Los personajes de jugador salen siempre, aunque no estuvieran en la lista.
  for (const actor of actors?.contents ?? []) {
    if (actor.type === "character" && !ids.includes(actor.id) && !excluded(actor.id) && isPlayerActor(actor)) {
      ids.push(actor.id);
    }
  }

  if (config.scene.mode === "scene") {
    // Lo que ya está puesto en la escena sale solo, aunque no estuviera en la lista.
    for (const id of tokens.keys()) if (!ids.includes(id) && actors?.get(id)) ids.push(id);
    for (const id of ids) {
      const own = tokens.get(id);
      if (own?.length && own.every(token => token.hidden)) tokenHidden.add(id);
    }
  }
  return { ids, tokenHidden };
}

/** ¿Está oculto ahora mismo (por el retrato o por el estado de sus tokens en modo escena)? */
export function effectiveHidden(config, actorId) {
  return Boolean(getActorConfig(config, actorId).hidden || visiblePortraits(config).tokenHidden.has(actorId));
}

/** Los tokens del actor en la escena que se está viendo. */
export function tokensOf(actorId) {
  return sceneTokens().get(actorId) ?? [];
}

/** Clave del jugador al que pertenece un retrato, para apilar sus fichas (null si no es de nadie). */
export function ownerKey(actor) {
  return actorOwners(actor)[0]?.id ?? null;
}
