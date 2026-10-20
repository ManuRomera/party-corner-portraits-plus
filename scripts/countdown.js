/**
 * Party Corner Portraits +
 * Cuenta atrás sobre el retrato: baja sola al avanzar el combate (por ronda o en el turno del propio
 * personaje). Solo escribe el máster activo; el resto de clientes lo ve por el ajuste de mundo.
 */

import { getConfig, mutateConfig } from "./settings.js";
import { localize } from "./utils.js";
import { refreshAll } from "./events.js";

const isWriter = () => game.user.isGM && game.users.activeGM?.isSelf;

async function step(match, delta) {
  const config = getConfig();
  const ids = Object.entries(config.actors)
    .filter(([id, a]) => config.order.includes(id) && a.countdown && match(a.countdown, id))
    .map(([id]) => id);
  if (!ids.length) return;

  const ended = [];
  await mutateConfig(cfg => {
    for (const id of ids) {
      const countdown = cfg.actors[id].countdown;
      const before = countdown.turns;
      countdown.turns = Math.max(0, before + delta);
      if (countdown.turns === 0 && before > 0) ended.push(id);
      if (countdown.turns > 0) countdown.warned = false;
    }
  });
  for (const id of ended) {
    ui.notifications.warn(localize("PCP.Studio.CountdownEnded", { name: game.actors.get(id)?.name ?? "" }));
  }
  refreshAll();
}

export function registerCountdown() {
  Hooks.on("updateCombat", (combat, changes, options) => {
    if (!isWriter() || !combat.started) return;
    const direction = options?.direction ?? 1;
    const delta = direction < 0 ? 1 : -1;
    // Empezar el combate (ronda 0 → 1) no cuenta como una ronda terminada.
    const opening = changes.round === 1 && !combat.previous?.round;
    if (changes.round !== undefined && !opening) step(countdown => countdown.mode === "round", delta);
    if (changes.turn !== undefined || changes.round !== undefined) {
      const actorId = combat.combatant?.actor?.id;
      if (actorId) step((countdown, id) => countdown.mode === "turn" && id === actorId, delta);
    }
  });
}
