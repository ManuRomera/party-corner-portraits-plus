/**
 * Party Corner Portraits +
 * Configuration application (ApplicationV2).
 */

import {
  MODULE_ID,
  SIZE_PRESETS,
  POSITIONS,
  ORIENTATIONS,
  FRAME_MODES,
  IMAGE_FITS,
  NAME_POSITIONS,
  BACKGROUND_MODES,
  BAR_POSITIONS,
  VISIBILITY_MODES,
  HOTBAR_OVERLAPS,
  HOVER_SOURCES,
  HOVER_PLACEMENTS,
  HOVER_PERMISSIONS,
  SYSTEM_BAR_PRESETS
} from "./constants.js";
import { getConfig, saveConfig } from "./settings.js";
import {
  clamp,
  clampSize,
  collectPaths,
  getActorConfig,
  getActorFit,
  getActorFrame,
  getActorNamePosition,
  getActorPlayerLabel,
  localize,
  normalizeColor,
  normalizeColorOrNull,
  positionLabelKey
} from "./utils.js";
import { refreshAll } from "./events.js";
import { openFramingApp } from "./framing-app.js";
import { WithMemory } from "./memory.js";
import { createPortraitElement, isVideo, portraitSource } from "./media.js";
import { addA11yButton } from "./a11y.js";
import { confirmReset } from "./reset.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

const CONFIG_APP_ID = "pcp-plus-config";
let currentConfigApp = null;

function capitalize(value) {
  const text = String(value ?? "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Convierte cualquier color CSS válido a #rrggbb (para el selector de color). */
function cssToHex(value, fallback = "#4ade80") {
  const text = String(value ?? "").trim();
  if (/^#[0-9a-f]{6}$/i.test(text)) return text.toLowerCase();
  try {
    const context = document.createElement("canvas").getContext("2d");
    context.fillStyle = "#000000";
    context.fillStyle = text;
    const result = context.fillStyle;
    return /^#[0-9a-f]{6}$/i.test(result) ? result : fallback;
  } catch {
    return fallback;
  }
}

function buildOptions(values, current, keyFor) {
  return values.map(value => ({
    value,
    label: keyFor(value),
    selected: current === value
  }));
}

function collectAvailablePaths() {
  const paths = new Set();
  const actors = game.actors?.contents ?? [];
  const limited = actors.slice(0, 40);
  for (const actor of limited) {
    if (!actor.system) continue;
    for (const path of collectPaths(actor.system, "system", { maxDepth: 5, limit: 180 })) {
      paths.add(path);
      if (paths.size >= 900) break;
    }
    if (paths.size >= 900) break;
  }
  return [...paths].sort((a, b) => a.localeCompare(b));
}

function collectFormData(form) {
  const old = getConfig();
  const element = name => form.elements.namedItem(name);
  const value = (name, fallback = "") => element(name)?.value ?? fallback;
  const checked = name => Boolean(element(name)?.checked);

  const config = foundry.utils.deepClone(old);

  config.bar.position = POSITIONS.includes(value("position")) ? value("position") : old.bar.position;
  config.bar.orientation = ORIENTATIONS.includes(value("orientation")) ? value("orientation") : old.bar.orientation;
  config.bar.offsetX = clamp(value("offsetX"), 0, 2000, old.bar.offsetX);
  config.bar.offsetY = clamp(value("offsetY"), 0, 2000, old.bar.offsetY);
  config.bar.gap = clamp(value("gap"), 0, 40, old.bar.gap);
  config.bar.size = clampSize(value("size"), old.bar.size);
  config.bar.free = {
    enabled: checked("free.enabled"),
    x: clamp(value("free.x"), 0, 10000, old.bar.free?.x ?? 40),
    y: clamp(value("free.y"), 0, 10000, old.bar.free?.y ?? 40)
  };

  config.appearance.borderColor = normalizeColor(value("borderColor"), old.appearance.borderColor);
  config.appearance.borderWidth = clamp(value("borderWidth"), 0, 10, old.appearance.borderWidth);
  config.appearance.radius = clamp(value("radius"), 0, 60, old.appearance.radius);
  config.appearance.shadow = checked("shadow");
  config.appearance.frame = FRAME_MODES.includes(value("frame")) ? value("frame") : old.appearance.frame;
  config.appearance.source = ["portrait", "token"].includes(value("source")) ? value("source") : old.appearance.source;
  config.appearance.imageFit = IMAGE_FITS.includes(value("imageFit")) ? value("imageFit") : old.appearance.imageFit;
  config.appearance.namePosition = NAME_POSITIONS.includes(value("namePosition"))
    ? value("namePosition")
    : old.appearance.namePosition;
  config.appearance.nameColor = normalizeColor(value("nameColor"), old.appearance.nameColor);
  config.appearance.background = BACKGROUND_MODES.includes(value("background"))
    ? value("background")
    : old.appearance.background;
  config.appearance.grayscale = checked("grayscale");
  config.appearance.opacity = clamp(value("opacity"), 0.1, 1, old.appearance.opacity);
  config.appearance.hoverScale = clamp(value("hoverScale"), 1, 1.5, old.appearance.hoverScale);

  config.data.showCharacterName = checked("showCharacterName");
  config.data.showPlayerName = checked("showPlayerName");
  config.data.showPlayerStatus = checked("showPlayerStatus");
  config.data.barPosition = BAR_POSITIONS.includes(value("barPosition"))
    ? value("barPosition")
    : old.data.barPosition;
  config.data.barHeight = clamp(value("barHeight"), 2, 24, old.data.barHeight);

  config.data.bars = [...form.querySelectorAll(".pcp-bar-row")]
    .map((row, index) => {
      const auto = Boolean(row.querySelector(".pcp-bar-auto")?.checked);
      const color = auto ? "auto" : row.querySelector(".pcp-bar-color")?.value?.trim() || "#4ade80";
      return {
        id: row.dataset.barId || `bar-${index + 1}`,
        label: row.querySelector(".pcp-bar-label")?.value?.trim() ?? "",
        valuePath: row.querySelector(".pcp-bar-value")?.value?.trim() ?? "",
        maxPath: row.querySelector(".pcp-bar-max")?.value?.trim() ?? "",
        max: clamp(row.querySelector(".pcp-bar-maximum")?.value, 1, 1000000, 100),
        color,
        showText: Boolean(row.querySelector(".pcp-bar-show-text")?.checked),
        showMax: Boolean(row.querySelector(".pcp-bar-show-max")?.checked)
      };
    })
    .filter(bar => bar.valuePath);

  config.data.fields = [...form.querySelectorAll(".pcp-field-row")]
    .map(row => ({
      label: row.querySelector(".pcp-field-label")?.value?.trim() ?? "",
      path: row.querySelector(".pcp-field-path")?.value?.trim() ?? "",
      suffix: row.querySelector(".pcp-field-suffix")?.value?.trim() ?? ""
    }))
    .filter(field => field.path);

  config.hover = {
    enabled: checked("hover.enabled"),
    delay: clamp(value("hover.delay"), 0, 3000, old.hover.delay),
    source: HOVER_SOURCES.includes(value("hover.source")) ? value("hover.source") : old.hover.source,
    size: clamp(value("hover.size"), 120, 1200, old.hover.size),
    placement: HOVER_PLACEMENTS.includes(value("hover.placement")) ? value("hover.placement") : old.hover.placement,
    permission: HOVER_PERMISSIONS.includes(value("hover.permission")) ? value("hover.permission") : old.hover.permission,
    caption: checked("hover.caption"),
    box: checked("hover.box"),
    sharp: checked("hover.sharp"),
    pos: old.hover.pos,
    sharedSeconds: clamp(value("hover.sharedSeconds"), 1, 60, old.hover.sharedSeconds)
  };

  config.players.enabled = checked("players.enabled");
  config.players.hideCore = checked("players.hideCore");
  config.players.position = POSITIONS.includes(value("players.position"))
    ? value("players.position")
    : old.players.position;
  config.players.offsetX = clamp(value("players.offsetX"), 0, 2000, old.players.offsetX);
  config.players.offsetY = clamp(value("players.offsetY"), 0, 2000, old.players.offsetY);
  config.players.showGM = checked("players.showGM");
  config.players.showCharacter = checked("players.showCharacter");
  config.players.showStatus = checked("players.showStatus");
  config.players.compact = checked("players.compact");
  config.players.title = value("players.title", "").trim();

  config.ui.hotbar = VISIBILITY_MODES.includes(value("hotbar")) ? value("hotbar") : old.ui.hotbar;
  config.ui.hotbarOverlap = HOTBAR_OVERLAPS.includes(value("hotbarOverlap"))
    ? value("hotbarOverlap")
    : old.ui.hotbarOverlap;
  config.ui.players = VISIBILITY_MODES.includes(value("playersVisibility"))
    ? value("playersVisibility")
    : old.ui.players;

  const previousIndex = new Map((old.order || []).map((id, index) => [id, index]));
  const selected = [];
  const actors = {};

  for (const row of form.querySelectorAll(".pcp-actor-row")) {
    const actorId = row.dataset.actorId;
    if (!actorId) continue;

    const current = getActorConfig(old, actorId);
    const sizeValue = row.querySelector(".pcp-actor-size")?.value?.trim() ?? "";
    const useBorder = Boolean(row.querySelector(".pcp-actor-border-use")?.checked);
    const sortOrder = Math.trunc(
      clamp(row.querySelector(".pcp-actor-order")?.value, -9999, 9999, current.sortOrder)
    );

    actors[actorId] = {
      ...current,
      sortOrder,
      size: sizeValue === "" ? null : clampSize(sizeValue, current.size ?? old.bar.size),
      fit: row.querySelector(".pcp-actor-fit")?.value || null,
      frame: row.querySelector(".pcp-actor-frame")?.value || null,
      namePosition: row.querySelector(".pcp-actor-name-position")?.value || null,
      borderColor: useBorder
        ? normalizeColorOrNull(row.querySelector(".pcp-actor-border-color")?.value)
        : null,
      playerLabel: row.querySelector(".pcp-actor-player-label")?.value?.trim() ?? "",
      media: row.querySelector(".pcp-actor-media")?.value?.trim() ?? "",
      source: row.querySelector(".pcp-actor-source")?.value || null,
      hoverSource: row.querySelector(".pcp-actor-hover-source")?.value || null,
      hoverMedia: row.querySelector(".pcp-actor-hover-media")?.value?.trim() ?? ""
    };

    if (row.querySelector(".pcp-actor-enabled")?.checked) {
      selected.push({
        id: actorId,
        sortOrder,
        previousIndex: previousIndex.get(actorId) ?? previousIndex.size + selected.length
      });
    }
  }

  selected.sort((a, b) => a.sortOrder - b.sortOrder || a.previousIndex - b.previousIndex);
  config.order = selected.map(entry => entry.id);
  config.actors = actors;

  return config;
}

async function saveConfiguration(_event, form) {
  const config = collectFormData(form);
  await saveConfig(config);
  refreshAll();
  ui.notifications.info(localize("PCP.Notifications.ConfigSaved"));
}

export class PartyPortraitsConfig extends WithMemory(HandlebarsApplicationMixin(ApplicationV2)) {
  static MEMORY_ID = "config";

  static DEFAULT_OPTIONS = {
    id: CONFIG_APP_ID,
    tag: "form",
    classes: ["pcp-plus-window", "pcp-plus-config", "themed", "theme-dark"],
    position: { width: 900, height: 760 },
    window: {
      title: "PCP.Config.WindowTitle",
      icon: "fa-solid fa-users-viewfinder",
      resizable: true,
      contentClasses: ["pcp-config-window"]
    },
    form: {
      closeOnSubmit: false,
      submitOnChange: false,
      handler: saveConfiguration
    }
  };

  static PARTS = {
    main: {
      template: `modules/${MODULE_ID}/templates/config.html`
    }
  };

  constructor(options = {}) {
    // Nunca más grande que la pantalla; la memoria de ventanas recuerda lo que el usuario cambie.
    const position = {
      width: Math.min(900, window.innerWidth - 40),
      height: Math.min(780, window.innerHeight - 60),
      ...options.position
    };
    super({ ...options, position });
    const tabs = ["general", "appearance", "data", "hover", "players", "characters"];
    this.activeTab = tabs.includes(this.memoryTab) ? this.memoryTab : "general";
    currentConfigApp = this;
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();

    const orderIndex = new Map((config.order || []).map((id, index) => [id, index]));
    const actors = (game.actors?.contents ?? [])
      .map(actor => {
        const actorConfig = getActorConfig(config, actor.id);
        const fit = getActorFit(config, actorConfig);
        return {
          id: actor.id,
          name: actor.name,
          img: portraitSource(actor, actorConfig, config),
          isVideo: isVideo(portraitSource(actor, actorConfig, config)),
          media: actorConfig.media,
          portraitImg: actor.img || "",
          tokenImg: actor.prototypeToken?.texture?.src || "",
          source: actorConfig.source ?? "",
          sourcePortrait: actorConfig.source === "portrait",
          sourceToken: actorConfig.source === "token",
          sourceCustom: actorConfig.source === "custom",
          hoverMedia: actorConfig.hoverMedia,
          hoverSource: actorConfig.hoverSource ?? "",
          hoverToken: actorConfig.hoverSource === "token",
          hoverPortrait: actorConfig.hoverSource === "portrait",
          hoverSame: actorConfig.hoverSource === "same",
          hoverCustom: actorConfig.hoverSource === "custom",
          globalHoverLabel: localize(`PCP.HoverSource.${capitalize(config.hover.source)}`),
          globalSourceLabel: localize(`PCP.Source.${capitalize(config.appearance.source)}`),
          enabled: orderIndex.has(actor.id),
          order: orderIndex.get(actor.id) ?? 999999,
          sortOrder: actorConfig.sortOrder,
          playerLabel: actorConfig.playerLabel,
          ownerLabel: getActorPlayerLabel(actor, { ...actorConfig, playerLabel: "" }),
          size: actorConfig.size ?? "",
          fit: actorConfig.fit ?? "",
          fitCover: actorConfig.fit === "cover",
          fitContain: actorConfig.fit === "contain",
          frame: actorConfig.frame ?? "",
          frameFull: actorConfig.frame === "full",
          frameMinimal: actorConfig.frame === "minimal",
          frameNone: actorConfig.frame === "none",
          namePosition: actorConfig.namePosition ?? "",
          nameOverlay: actorConfig.namePosition === "overlay",
          nameBelow: actorConfig.namePosition === "below",
          nameHidden: actorConfig.namePosition === "hidden",
          useBorder: Boolean(actorConfig.borderColor),
          borderColor: actorConfig.borderColor ?? config.appearance.borderColor,
          x: actorConfig.x,
          y: actorConfig.y,
          zoom: actorConfig.zoom,
          previewFit: fit,
          previewFrame: getActorFrame(config, actorConfig),
          previewNamePosition: getActorNamePosition(config, actorConfig),
          globalSize: config.bar.size,
          globalFitLabel: localize(`PCP.Fit.${capitalize(config.appearance.imageFit)}`),
          globalFrameLabel: localize(`PCP.Frame.${capitalize(config.appearance.frame)}`),
          globalNameLabel: localize(`PCP.NamePosition.${capitalize(config.appearance.namePosition)}`)
        };
      })
      .sort((a, b) => {
        if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
        if (a.enabled && b.enabled && a.order !== b.order) return a.order - b.order;
        return a.name.localeCompare(b.name, game.i18n.lang);
      });

    const systemPreset = SYSTEM_BAR_PRESETS[game.system?.id] ?? null;

    return {
      ...context,
      config,
      actors,
      barRows: config.data.bars.map(bar => ({
        ...bar,
        auto: bar.color === "auto",
        hex: cssToHex(bar.color === "auto" ? "#4ade80" : bar.color)
      })),
      paths: collectAvailablePaths(),
      systemPreset,
      systemPresetName: game.system?.title ?? game.system?.id ?? "",
      positions: buildOptions(POSITIONS, config.bar.position, value => localize(positionLabelKey(value))),
      orientations: buildOptions(ORIENTATIONS, config.bar.orientation, value =>
        localize(`PCP.Orientation.${capitalize(value)}`)
      ),
      playerPositions: buildOptions(POSITIONS, config.players.position, value => localize(positionLabelKey(value))),
      frames: buildOptions(FRAME_MODES, config.appearance.frame, value =>
        localize(`PCP.Frame.${capitalize(value)}`)
      ),
      fits: buildOptions(IMAGE_FITS, config.appearance.imageFit, value =>
        localize(`PCP.Fit.${capitalize(value)}`)
      ),
      namePositions: buildOptions(NAME_POSITIONS, config.appearance.namePosition, value =>
        localize(`PCP.NamePosition.${capitalize(value)}`)
      ),
      backgrounds: buildOptions(BACKGROUND_MODES, config.appearance.background, value =>
        localize(`PCP.Background.${capitalize(value)}`)
      ),
      sources: buildOptions(["portrait", "token"], config.appearance.source, value =>
        localize(`PCP.Source.${capitalize(value)}`)
      ),
      hoverSources: buildOptions(HOVER_SOURCES, config.hover.source, value =>
        localize(`PCP.HoverSource.${capitalize(value)}`)
      ),
      hoverPlacements: buildOptions(HOVER_PLACEMENTS, config.hover.placement, value =>
        localize(`PCP.HoverPlacement.${value.split("-").map(capitalize).join("")}`)
      ),
      hoverPermissions: buildOptions(HOVER_PERMISSIONS, config.hover.permission, value =>
        localize(`PCP.HoverPermission.${capitalize(value.toLowerCase())}`)
      ),
      hotbarModes: buildOptions(VISIBILITY_MODES, config.ui.hotbar, value =>
        localize(`PCP.Visibility.${capitalize(value)}`)
      ),
      hotbarOverlaps: buildOptions(HOTBAR_OVERLAPS, config.ui.hotbarOverlap, value =>
        localize(`PCP.Overlap.${capitalize(value)}`)
      ),
      playersModes: buildOptions(VISIBILITY_MODES, config.ui.players, value =>
        localize(`PCP.Visibility.${capitalize(value)}`)
      ),
      barPositions: buildOptions(BAR_POSITIONS, config.data.barPosition, value =>
        localize(`PCP.BarPosition.${capitalize(value)}`)
      ),
      sizePresets: SIZE_PRESETS.map(size => ({
        value: size,
        label: `${size}px`,
        selected: config.bar.size === size
      })),
      activeTab: this.activeTab
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const root = this.element;

    addA11yButton(this);

    const activateTab = tab => {
      this.activeTab = tab;
      this.rememberTab(tab);
      for (const button of root.querySelectorAll(".pcp-tab")) {
        button.classList.toggle("active", button.dataset.tab === tab);
      }
      for (const panel of root.querySelectorAll(".pcp-panel")) {
        panel.classList.toggle("active", panel.dataset.panel === tab);
      }
    };

    for (const button of root.querySelectorAll(".pcp-tab")) {
      button.addEventListener("click", event => {
        event.preventDefault();
        activateTab(button.dataset.tab);
      });
    }
    activateTab(this.activeTab);

    root.querySelector(".pcp-reset-config")?.addEventListener("click", async event => {
      event.preventDefault();
      if (await confirmReset()) this.close();
    });

    root.querySelector(".pcp-close-config")?.addEventListener("click", event => {
      event.preventDefault();
      this.close();
    });

    const barTemplate = root.querySelector('template[data-template="bar"]');
    const barList = root.querySelector(".pcp-bar-list");
    const fieldTemplate = root.querySelector('template[data-template="field"]');
    const fieldList = root.querySelector(".pcp-field-list");

    const appendBarRow = values => {
      if (!barTemplate || !barList) return;
      const row = barTemplate.content.firstElementChild.cloneNode(true);
      row.dataset.barId = values?.id || foundry.utils.randomID();
      if (values) {
        row.querySelector(".pcp-bar-label").value = values.label ?? "";
        row.querySelector(".pcp-bar-value").value = values.valuePath ?? "";
        row.querySelector(".pcp-bar-max").value = values.maxPath ?? "";
        row.querySelector(".pcp-bar-maximum").value = values.max ?? 100;
        const auto = values.color === "auto";
        row.querySelector(".pcp-bar-auto").checked = auto;
        row.querySelector(".pcp-bar-color").value = cssToHex(auto ? "#4ade80" : values.color);
        row.querySelector(".pcp-bar-color").disabled = auto;
        row.querySelector(".pcp-bar-show-text").checked = values.showText !== false;
        row.querySelector(".pcp-bar-show-max").checked = values.showMax !== false;
      }
      barList.appendChild(row);
    };

    root.querySelector(".pcp-add-bar")?.addEventListener("click", event => {
      event.preventDefault();
      appendBarRow();
    });

    root.querySelector(".pcp-add-system-bar")?.addEventListener("click", event => {
      event.preventDefault();
      const preset = SYSTEM_BAR_PRESETS[game.system?.id];
      if (!preset) return;
      appendBarRow({
        id: foundry.utils.randomID(),
        label: preset.label,
        valuePath: preset.valuePath,
        maxPath: preset.maxPath,
        max: 100,
        color: preset.color,
        showText: true,
        showMax: true
      });
    });

    const appendFieldRow = values => {
      if (!fieldTemplate || !fieldList) return;
      const row = fieldTemplate.content.firstElementChild.cloneNode(true);
      if (values) {
        row.querySelector(".pcp-field-label").value = values.label ?? "";
        row.querySelector(".pcp-field-path").value = values.path ?? "";
        row.querySelector(".pcp-field-suffix").value = values.suffix ?? "";
      }
      fieldList.appendChild(row);
    };

    root.querySelector(".pcp-add-field")?.addEventListener("click", event => {
      event.preventDefault();
      appendFieldRow();
    });

    barList?.addEventListener("change", event => {
      if (!event.target.matches(".pcp-bar-auto")) return;
      const color = event.target.closest(".pcp-bar-row")?.querySelector(".pcp-bar-color");
      if (color) color.disabled = event.target.checked;
    });

    barList?.addEventListener("click", event => {
      if (!event.target.closest(".pcp-bar-remove")) return;
      event.preventDefault();
      event.target.closest(".pcp-bar-row")?.remove();
    });

    fieldList?.addEventListener("click", event => {
      if (!event.target.closest(".pcp-field-remove")) return;
      event.preventDefault();
      event.target.closest(".pcp-field-row")?.remove();
    });

    const syncRangeOutputs = (scope = root) => {
      for (const range of scope.querySelectorAll('input[type="range"][data-output]')) {
        const output = scope.querySelector(`output[data-for="${range.dataset.output}"]`);
        if (!output) continue;
        const suffix = range.dataset.suffix ?? "";
        output.value = `${range.value}${suffix}`;
      }
    };

    for (const range of root.querySelectorAll('input[type="range"][data-output]')) {
      range.addEventListener("input", () => syncRangeOutputs());
    }
    syncRangeOutputs();

    const borderColor = root.querySelector('input[name="borderColor"]');
    const borderPreview = value => {
      for (const preview of root.querySelectorAll(".pcp-config-preview")) {
        preview.style.setProperty("--pcp-preview-border", normalizeColor(value));
      }
    };
    if (borderColor) {
      borderPreview(borderColor.value);
      borderColor.addEventListener("input", () => borderPreview(borderColor.value));
    }

    const globalSize = root.querySelector('input[name="size"]');
    const syncGlobalSize = () => {
      const value = globalSize?.value ?? "";
      for (const input of root.querySelectorAll(".pcp-actor-size")) {
        input.placeholder = value;
      }
    };
    globalSize?.addEventListener("input", syncGlobalSize);
    syncGlobalSize();

    const actorSearch = root.querySelector(".pcp-actor-search");
    const actorRows = [...root.querySelectorAll(".pcp-actor-row")];
    const noResults = root.querySelector(".pcp-no-results");
    if (actorSearch) {
      actorSearch.addEventListener("input", () => {
        const query = actorSearch.value.trim().toLocaleLowerCase(game.i18n.lang);
        let matches = 0;
        for (const row of actorRows) {
          const name = row.dataset.actorName?.toLocaleLowerCase(game.i18n.lang) ?? "";
          const player = row.dataset.playerLabel?.toLocaleLowerCase(game.i18n.lang) ?? "";
          const visible = !query || name.includes(query) || player.includes(query);
          row.hidden = !visible;
          if (visible) matches += 1;
        }
        if (noResults) noResults.hidden = matches > 0;
      });
    }

    for (const checkbox of root.querySelectorAll(".pcp-actor-enabled")) {
      checkbox.addEventListener("change", () => {
        checkbox.closest(".pcp-actor-row")?.classList.toggle("pcp-disabled", !checkbox.checked);
      });
    }

    for (const checkbox of root.querySelectorAll(".pcp-actor-border-use")) {
      const row = checkbox.closest(".pcp-actor-row");
      const colorInput = row?.querySelector(".pcp-actor-border-color");
      const sync = () => {
        if (colorInput) colorInput.disabled = !checkbox.checked;
      };
      checkbox.addEventListener("change", sync);
      sync();
    }

    // Origen de la imagen por personaje: muestra el archivo propio solo si hace falta y actualiza la vista previa.
    const globalSource = root.querySelector('select[name="source"]');
    for (const row of root.querySelectorAll(".pcp-actor-row")) {
      const select = row.querySelector(".pcp-actor-source");
      const field = row.querySelector(".pcp-media-field");
      const media = row.querySelector(".pcp-actor-media");
      const preview = row.querySelector(".pcp-config-preview");
      const refresh = () => {
        const source = select.value || globalSource?.value || "portrait";
        field.hidden = source !== "custom";
        const pick =
          { portrait: row.dataset.portrait, token: row.dataset.token, custom: media.value.trim() }[source] ||
          row.dataset.portrait ||
          row.dataset.token ||
          "icons/svg/mystery-man.svg";
        const old = preview.querySelector("img, video");
        const next = createPortraitElement(pick, { alt: "", still: true });
        if (old) {
          for (const name of ["objectFit", "objectPosition", "transformOrigin", "transform"]) {
            next.style[name] = old.style[name];
          }
          old.replaceWith(next);
        }
      };
      select.addEventListener("change", refresh);
      media.addEventListener("change", refresh);
      media.addEventListener("input", refresh);
      row.refreshSource = refresh;
      refresh();
    }
    globalSource?.addEventListener("change", () => {
      for (const row of root.querySelectorAll(".pcp-actor-row")) row.refreshSource?.();
    });

    for (const row of root.querySelectorAll(".pcp-actor-row")) {
      const select = row.querySelector(".pcp-actor-hover-source");
      const field = row.querySelector(".pcp-hover-media-field");
      if (!select || !field) continue;
      const sync = () => {
        field.hidden = select.value !== "custom";
      };
      select.addEventListener("change", sync);
      sync();
    }

    for (const button of root.querySelectorAll(".pcp-pick-media")) {
      button.addEventListener("click", event => {
        event.preventDefault();
        const input = button.closest(".pcp-media-field, .pcp-hover-media-field")?.querySelector("input[type=text]");
        const Picker = foundry.applications.apps.FilePicker.implementation;
        new Picker({
          type: "imagevideo",
          current: input?.value ?? "",
          callback: path => {
            if (!input) return;
            input.value = path;
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
        }).render(true);
      });
    }

    for (const button of root.querySelectorAll(".pcp-open-framing")) {
      button.addEventListener("click", event => {
        event.preventDefault();
        const actorId = button.closest(".pcp-actor-row")?.dataset.actorId;
        if (actorId) openFramingApp(actorId);
      });
    }
  }
}

export function openConfigApp() {
  const existing =
    (currentConfigApp?.rendered ? currentConfigApp : null) ??
    foundry.applications.instances?.get(CONFIG_APP_ID);
  if (existing?.rendered) {
    currentConfigApp = existing;
    existing.bringToFront?.();
    return existing;
  }
  currentConfigApp = new PartyPortraitsConfig();
  currentConfigApp.render(true);
  return currentConfigApp;
}
