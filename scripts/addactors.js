/**
 * Party Corner Portraits +
 * Añadir personajes a la barra (o como retratos sueltos): selector con buscador y zonas
 * donde soltar actores arrastrados desde el directorio de Foundry.
 */

import { getActorConfig, localize, escapeHTML } from "./utils.js";
import { getConfig, mutateConfig } from "./settings.js";
import { refreshAll } from "./events.js";

const { ApplicationV2 } = foundry.applications.api;

/** Añade un actor a la configuración: a la barra, o suelto en `pos` (fracción de pantalla). */
export async function addToDisplay(actorId, pos = null) {
  if (!game.actors?.get(actorId)) return;
  await mutateConfig(config => {
    if (!config.order.includes(actorId)) config.order = [...config.order, actorId];
    const maxSort = Math.max(-1, ...Object.values(config.actors).map(a => Number(a.sortOrder) || 0));
    config.actors[actorId] = {
      ...getActorConfig(config, actorId),
      sortOrder: maxSort + 1,
      float: pos ? { x: pos.x, y: pos.y } : null
    };
  });
  refreshAll();
}

/** Saca un retrato de la barra para dejarlo suelto (en su centro actual), o lo mete de nuevo. */
export async function setLoose(actorId, pos) {
  await mutateConfig(config => {
    config.actors[actorId] = { ...getActorConfig(config, actorId), float: pos ? { x: pos.x, y: pos.y } : null };
  });
  refreshAll();
}

/* ------------------------------------------------------------------ selector */

export class AddActorsApp extends ApplicationV2 {
  static DEFAULT_OPTIONS = {
    id: "pcp-plus-add",
    classes: ["pcp-plus-window", "pcp-add-app", "themed", "theme-dark"],
    position: { width: 460, height: 560 },
    window: { title: "PCP.Add.Title", icon: "fa-solid fa-user-plus", resizable: true }
  };

  async _renderHTML() {
    const order = new Set(getConfig().order);
    const rows = (game.actors?.contents ?? [])
      .filter(actor => !order.has(actor.id))
      .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
      .map(
        actor => `
        <li class="pcp-add-row" data-actor="${actor.id}" data-name="${escapeHTML(actor.name.toLowerCase())}" data-type="${escapeHTML(actor.type)}">
          <img src="${escapeHTML(actor.img || "icons/svg/mystery-man.svg")}" alt="">
          <span class="pcp-add-name">${escapeHTML(actor.name)}<small>${escapeHTML(actor.type)}</small></span>
          <button type="button" data-where="bar" title="${localize("PCP.Add.ToBarHint")}"><i class="fa-solid fa-table-cells-large"></i> ${localize("PCP.Add.ToBar")}</button>
          <button type="button" data-where="loose" title="${localize("PCP.Add.LooseHint")}"><i class="fa-solid fa-up-down-left-right"></i> ${localize("PCP.Add.Loose")}</button>
        </li>`
      )
      .join("");

    return `
      <div class="pcp-add">
        <div class="pcp-search-wrap">
          <i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>
          <input class="pcp-add-search" type="search" placeholder="${localize("PCP.Config.Search")}" aria-label="${localize("PCP.Config.Search")}" autocomplete="off">
        </div>
        <p class="pcp-note pcp-note-top">${localize("PCP.Add.Help")}</p>
        <ul class="pcp-add-list">${rows}</ul>
        <p class="pcp-no-results" ${rows ? "hidden" : ""}>${localize("PCP.Add.None")}</p>
      </div>`;
  }

  _replaceHTML(html, content) {
    content.innerHTML = html;
    const search = content.querySelector(".pcp-add-search");
    const rows = [...content.querySelectorAll(".pcp-add-row")];
    search.addEventListener("input", () => {
      const query = search.value.trim().toLowerCase();
      for (const row of rows) row.hidden = Boolean(query) && !row.dataset.name.includes(query);
    });
    content.querySelector(".pcp-add-list").addEventListener("click", async event => {
      const button = event.target.closest("button[data-where]");
      if (!button) return;
      const row = button.closest(".pcp-add-row");
      // «Suelto» aparece cerca del centro; después se arrastra con el botón derecho.
      const jitter = () => 0.35 + Math.random() * 0.3; // repartidos, para que no queden uno sobre otro
      await addToDisplay(row.dataset.actor, button.dataset.where === "loose" ? { x: jitter(), y: jitter() } : null);
      row.remove();
      content.querySelector(".pcp-no-results").hidden = Boolean(content.querySelector(".pcp-add-row"));
    });
    search.focus();
  }
}

export function openAddActors() {
  if (!game.user.isGM) return null;
  const existing = foundry.applications.instances.get(AddActorsApp.DEFAULT_OPTIONS.id);
  if (existing?.rendered) {
    existing.render();
    return existing.bringToFront();
  }
  return new AddActorsApp().render({ force: true });
}

/* ------------------------------------------------------------ soltar actores */

let zones = null;
let dragging = null; // actorId arrastrado

function actorFromDrag(event) {
  try {
    const data = JSON.parse(event.dataTransfer?.getData("text/plain") || "{}");
    if (data.type !== "Actor" || !data.uuid) return null;
    const doc = fromUuidSync(data.uuid);
    if (!doc) return null;
    if (doc.pack) return { compendium: true };
    return { actor: doc.isToken ? doc.baseActor : doc };
  } catch {
    return null;
  }
}

function zone(kind, label, icon) {
  const el = document.createElement("div");
  el.className = `pcp-dropzone pcp-dropzone-${kind}`;
  el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${label}</span>`;
  el.addEventListener("dragover", event => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    el.classList.add("pcp-over");
  });
  el.addEventListener("dragleave", () => el.classList.remove("pcp-over"));
  el.addEventListener("drop", async event => {
    event.preventDefault();
    event.stopPropagation();
    const id = dragging;
    const rect = el.getBoundingClientRect(); // antes de quitar las zonas
    hideZones();
    if (!id) return;
    if (kind === "bar") {
      await addToDisplay(id, null);
    } else {
      await addToDisplay(id, {
        x: (rect.left + rect.width / 2) / window.innerWidth,
        y: (rect.top + rect.height / 2) / window.innerHeight
      });
    }
    ui.notifications.info(localize("PCP.Add.Added", { name: game.actors.get(id)?.name ?? "" }));
  });
  return el;
}

function showZones() {
  hideZones();
  zones = document.createElement("div");
  zones.id = "pcp-dropzones";
  const hud = document.getElementById("pcp-party-hud")?.getBoundingClientRect();
  const width = Math.max(220, Math.min(hud?.width ?? 0, 420));
  const left = hud ? hud.left : 96;
  const bottom = hud ? window.innerHeight - hud.bottom : 16;
  zones.style.left = `${Math.min(left, window.innerWidth - width - 8)}px`;
  zones.style.bottom = `${Math.max(8, bottom)}px`;
  zones.style.width = `${width}px`;
  zones.append(
    zone("loose", localize("PCP.Add.DropLoose"), "fa-up-down-left-right"),
    zone("bar", localize("PCP.Add.DropBar"), "fa-table-cells-large")
  );
  document.body.appendChild(zones);
}

function hideZones() {
  zones?.remove();
  zones = null;
  dragging = null;
}

export function initDropZone() {
  if (!game.user.isGM) return;
  // Foundry rellena los datos en su propio «dragstart»; aquí se lee ya al burbujear.
  document.addEventListener("dragstart", event => {
    const found = actorFromDrag(event);
    if (!found) return;
    if (found.compendium) return; // desde un compendio no se puede: se avisa al soltar en la barra
    showZones();
    dragging = found.actor.id; // después: showZones() limpia el estado anterior
  });
  document.addEventListener("dragend", hideZones);
  document.addEventListener("drop", () => window.setTimeout(hideZones, 50));
}
