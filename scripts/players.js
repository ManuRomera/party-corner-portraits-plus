/**
 * Party Corner Portraits +
 * Optional replacement for Foundry's player list.
 */

import { getConfig } from "./settings.js";
import { colorToCss, localize } from "./utils.js";
import { dispatchMenuEvent } from "./events.js";
import { avoidCoreUi } from "./layout.js";

function canSeeCharacter(actor) {
  if (!actor) return false;
  return game.user.isGM || actor.testUserPermission(game.user, "LIMITED");
}

function buildRow(user, config) {
  const item = document.createElement("li");
  item.className = "pcp-player-entry";
  if (!user.active) item.classList.add("pcp-player-offline");
  if (user.id === game.user.id) item.classList.add("pcp-player-self");

  const button = document.createElement("button");
  button.type = "button";
  button.className = "pcp-player-row";
  button.dataset.userId = user.id;

  const dot = document.createElement("span");
  dot.className = `pcp-player-status-dot ${user.active ? "pcp-online" : "pcp-offline"}`;
  dot.style.setProperty("--pcp-user-color", colorToCss(user.color));
  dot.title = user.active ? localize("PCP.Status.Connected") : localize("PCP.Status.Offline");
  button.appendChild(dot);

  const name = document.createElement("span");
  name.className = "pcp-player-name";
  name.textContent = user.name;
  button.appendChild(name);

  if (config.players.showCharacter) {
    const actor = user.character;
    if (actor && canSeeCharacter(actor)) {
      const character = document.createElement("span");
      character.className = "pcp-player-character";
      character.textContent = actor.name;
      button.appendChild(character);
    }
  }

  if (user.isGM) {
    const crown = document.createElement("i");
    crown.className = "fa-solid fa-crown pcp-player-crown";
    crown.title = localize("PCP.Role.GM");
    button.appendChild(crown);
  }

  const titleParts = [user.name];
  if (user.character && canSeeCharacter(user.character)) titleParts.push(user.character.name);
  titleParts.push(user.active ? localize("PCP.Status.Connected") : localize("PCP.Status.Offline"));
  button.title = titleParts.join(" · ");

  const openMenu = event => {
    event.preventDefault();
    event.stopPropagation();
    dispatchMenuEvent("pcp:user-menu", {
      userId: user.id,
      x: event.clientX ?? button.getBoundingClientRect().left,
      y: event.clientY ?? button.getBoundingClientRect().bottom
    });
  };

  button.addEventListener("click", openMenu);
  button.addEventListener("contextmenu", openMenu);
  item.appendChild(button);
  return item;
}

export function renderPlayerList() {
  document.getElementById("pcp-player-list")?.remove();

  const config = getConfig();
  if (!config.players.enabled) return;

  let users = game.users?.contents ?? [];
  if (!config.players.showGM) users = users.filter(user => !user.isGM);

  users = [...users].sort((a, b) => {
    if (a.isGM !== b.isGM) return a.isGM ? -1 : 1;
    if (a.active !== b.active) return a.active ? -1 : 1;
    return a.name.localeCompare(b.name, game.i18n.lang);
  });

  if (!users.length) return;

  const panel = document.createElement("div");
  panel.id = "pcp-player-list";
  panel.className = `pcp-player-list pcp-${config.players.position}`;
  panel.classList.add(config.players.compact ? "pcp-compact" : "pcp-roomy");
  panel.style.setProperty("--pcp-players-offset-x", `${config.players.offsetX}px`);
  panel.style.setProperty("--pcp-players-offset-y", `${config.players.offsetY}px`);

  const header = document.createElement("div");
  header.className = "pcp-players-header";

  const title = document.createElement("span");
  title.className = "pcp-players-title";
  title.textContent = config.players.title?.trim() || localize("PCP.Players.Title");
  header.appendChild(title);

  if (config.players.showStatus) {
    const count = document.createElement("span");
    count.className = "pcp-players-count";
    const online = users.filter(user => user.active).length;
    count.textContent = `${online}/${users.length}`;
    count.title = localize("PCP.Players.CountHint");
    header.appendChild(count);
  }

  panel.appendChild(header);

  const list = document.createElement("ul");
  list.className = "pcp-player-entries";
  for (const user of users) list.appendChild(buildRow(user, config));
  panel.appendChild(list);

  document.body.appendChild(panel);
  avoidCoreUi(panel, config.players.position);
}
