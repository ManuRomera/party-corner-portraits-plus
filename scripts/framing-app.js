/**
 * Party Corner Portraits +
 * Interactive portrait framing window (pan / zoom).
 */

import { MODULE_ID } from "./constants.js";
import { getConfig, saveConfig } from "./settings.js";
import {
  clamp,
  getActorConfig,
  getActorFit,
  getActorFrame,
  localize
} from "./utils.js";
import { refreshAll } from "./events.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

async function submitFraming(_event, form) {
  const app = this;
  const config = getConfig();
  const actorConfig = getActorConfig(config, app.actorId);

  const x = clamp(form.elements.x?.value, 0, 100, 50);
  const y = clamp(form.elements.y?.value, 0, 100, 50);
  const zoom = clamp(form.elements.zoom?.value, 1, 4, 1);

  config.actors[app.actorId] = {
    ...actorConfig,
    x,
    y,
    zoom
  };

  await saveConfig(config);
  refreshAll();
  ui.notifications.info(localize("PCP.Notifications.FramingSaved", { name: app.actor?.name ?? "" }));
}

export class FramingApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "pcp-plus-framing",
    tag: "form",
    classes: ["pcp-framing-app"],
    position: {
      width: 520,
      height: "auto"
    },
    window: {
      title: "PCP.Framing.Title",
      icon: "fa-solid fa-crop-simple",
      resizable: false
    },
    form: {
      closeOnSubmit: true,
      submitOnChange: false,
      handler: submitFraming
    }
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/framing.html`
    }
  };

  constructor(actorId, options = {}) {
    const actor = game.actors?.get(actorId);
    super(
      foundry.utils.mergeObject(
        options,
        {
          id: `pcp-plus-framing-${actorId}`,
          window: {
            title: localize("PCP.Framing.TitleFor", { name: actor?.name ?? "" })
          }
        },
        { inplace: false }
      )
    );
    this.actorId = actorId;
  }

  get actor() {
    return game.actors?.get(this.actorId);
  }

  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    const config = getConfig();
    const actorConfig = getActorConfig(config, this.actorId);
    const actor = this.actor;

    return {
      ...context,
      actorId: this.actorId,
      actorName: actor?.name ?? "",
      actorImg: actor?.img || "icons/svg/mystery-man.svg",
      x: actorConfig.x,
      y: actorConfig.y,
      zoom: actorConfig.zoom,
      fit: getActorFit(config, actorConfig),
      frame: getActorFrame(config, actorConfig),
      background: config.appearance.background
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);

    const stage = this.element.querySelector(".pcp-framing-stage");
    const img = stage?.querySelector("img");
    const xInput = this.element.querySelector('input[name="x"]');
    const yInput = this.element.querySelector('input[name="y"]');
    const zoomInput = this.element.querySelector('input[name="zoom"]');
    if (!stage || !img || !xInput || !yInput || !zoomInput) return;

    const outputs = {
      x: this.element.querySelector('output[data-for="x"]'),
      y: this.element.querySelector('output[data-for="y"]'),
      zoom: this.element.querySelector('output[data-for="zoom"]')
    };

    const updatePreview = () => {
      const x = clamp(xInput.value, 0, 100, 50);
      const y = clamp(yInput.value, 0, 100, 50);
      const zoom = clamp(zoomInput.value, 1, 4, 1);
      img.style.objectPosition = `${x}% ${y}%`;
      img.style.transformOrigin = `${x}% ${y}%`;
      img.style.transform = `scale(${zoom})`;
      if (outputs.x) outputs.x.value = `${Math.round(x)}%`;
      if (outputs.y) outputs.y.value = `${Math.round(y)}%`;
      if (outputs.zoom) outputs.zoom.value = `${zoom.toFixed(2)}×`;
    };

    for (const input of [xInput, yInput, zoomInput]) {
      input.addEventListener("input", updatePreview);
    }

    let drag = null;

    stage.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      stage.setPointerCapture?.(event.pointerId);
      drag = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        x: Number(xInput.value),
        y: Number(yInput.value),
        zoom: clamp(zoomInput.value, 1, 4, 1),
        width: stage.getBoundingClientRect().width
      };
      stage.classList.add("pcp-dragging");
    });

    stage.addEventListener("pointermove", event => {
      if (!drag) return;
      const dx = event.clientX - drag.startX;
      const dy = event.clientY - drag.startY;
      const scale = 100 / Math.max(1, drag.width);
      xInput.value = String(clamp(drag.x - (dx * scale) / drag.zoom, 0, 100, 50));
      yInput.value = String(clamp(drag.y - (dy * scale) / drag.zoom, 0, 100, 50));
      updatePreview();
    });

    const endDrag = () => {
      drag = null;
      stage.classList.remove("pcp-dragging");
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", endDrag);
    stage.addEventListener("pointerleave", () => {
      if (drag && !stage.hasPointerCapture?.(drag.pointerId)) endDrag();
    });

    stage.addEventListener(
      "wheel",
      event => {
        event.preventDefault();
        const current = clamp(zoomInput.value, 1, 4, 1);
        const next = clamp(current * (1 - event.deltaY * 0.0018), 1, 4, current);
        zoomInput.value = String(Math.round(next * 100) / 100);
        updatePreview();
      },
      { passive: false }
    );

    stage.addEventListener("dblclick", event => {
      event.preventDefault();
      xInput.value = "50";
      yInput.value = "50";
      zoomInput.value = "1";
      updatePreview();
    });

    this.element.querySelector(".pcp-framing-center")?.addEventListener("click", event => {
      event.preventDefault();
      xInput.value = "50";
      yInput.value = "50";
      updatePreview();
    });

    this.element.querySelector(".pcp-framing-reset")?.addEventListener("click", event => {
      event.preventDefault();
      xInput.value = "50";
      yInput.value = "50";
      zoomInput.value = "1";
      updatePreview();
    });

    this.element.querySelector(".pcp-framing-close")?.addEventListener("click", event => {
      event.preventDefault();
      this.close();
    });

    updatePreview();
  }
}

const openFramingApps = new Map();

export function openFramingApp(actorId) {
  const existing = openFramingApps.get(actorId);
  if (existing?.rendered) {
    existing.bringToFront?.();
    return existing;
  }
  const app = new FramingApp(actorId);
  openFramingApps.set(actorId, app);
  app.render(true);
  return app;
}
