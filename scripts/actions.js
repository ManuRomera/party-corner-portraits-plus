/**
 * Party Corner Portraits +
 * Context menus and the actions they trigger.
 */

import {
  SIZE_PRESETS,
  SIZE_MIN,
  SIZE_MAX,
  POSITIONS,
  FRAME_MODES,
  IMAGE_FITS,
  NAME_POSITIONS,
  BACKGROUND_MODES,
  VISIBILITY_MODES,
  HOTBAR_OVERLAPS
} from "./constants.js";
import {
  getConfig,
  getClientConfig,
  mutateConfig,
  mutateClientConfig
} from "./settings.js";
import {
  clamp,
  clampSize,
  escapeHTML,
  getActorConfig,
  localize,
  numericValue,
  positionLabelKey
} from "./utils.js";
import { openMenu } from "./menu.js";
import { refreshAll } from "./events.js";
import { setMoveMode, isMoveMode } from "./hud.js";
import { openFramingApp } from "./framing-app.js";
import { openConfigApp } from "./config-app.js";
import { A11yPanel } from "./a11y.js";

const { DialogV2 } = foundry.applications.api;

function getActor(actorId) {
  return game.actors?.get(actorId);
}

function actorCanOpenSheet(actor) {
  return Boolean(actor && (game.user.isGM || actor.testUserPermission(game.user, "LIMITED")));
}

function openActorSheet(actorId) {
  const actor = getActor(actorId);
  if (!actor) return;
  if (!actorCanOpenSheet(actor)) {
    ui.notifications.warn(localize("PCP.Notifications.NoPermission"));
    return;
  }
  actor.sheet?.render(true);
}

async function updateActorConfig(actorId, patch) {
  await mutateConfig(config => {
    config.actors[actorId] = {
      ...getActorConfig(config, actorId),
      ...patch
    };
  });
  refreshAll();
}

async function setGlobalSize(size) {
  await mutateConfig(config => {
    config.bar.size = clampSize(size, config.bar.size);
  });
  refreshAll();
}

async function promptSize(actorId = null) {
  const config = getConfig();
  const current = actorId ? getActorConfig(config, actorId).size ?? config.bar.size : config.bar.size;
  const value = await DialogV2.prompt({
    window: {
      title: actorId
        ? localize("PCP.Prompt.CustomSize.ActorTitle")
        : localize("PCP.Prompt.CustomSize.GlobalTitle")
    },
    content: `
      <div class="pcp-dialog-content">
        <label class="pcp-dialog-label">${localize("PCP.Prompt.CustomSize.Label", {
          min: SIZE_MIN,
          max: SIZE_MAX
        })}</label>
        <input type="number" name="size" value="${current}" min="${SIZE_MIN}" max="${SIZE_MAX}" step="1">
      </div>
    `,
    ok: {
      label: localize("PCP.Common.Apply"),
      callback: (event, button) => button.form.elements.size.value
    }
  });

  if (value === null || value === undefined) return;
  const size = clampSize(numericValue(value), current);
  if (actorId) await updateActorConfig(actorId, { size });
  else await setGlobalSize(size);
}

function sizeMenuItems(actorId = null) {
  const config = getConfig();
  const actorConfig = actorId ? getActorConfig(config, actorId) : null;
  const current = actorId ? actorConfig.size : config.bar.size;

  const items = [];
  if (actorId) {
    items.push({
      label: localize("PCP.Menu.Size.UseGlobal", { size: config.bar.size }),
      icon: "fa-solid fa-globe",
      checked: current === null || current === undefined,
      action: () => updateActorConfig(actorId, { size: null })
    });
    items.push({ separator: true });
  }

  for (const size of SIZE_PRESETS) {
    items.push({
      label: `${size}px`,
      icon: "fa-solid fa-up-right-and-down-left-from-center",
      checked: current === size,
      action: () => (actorId ? updateActorConfig(actorId, { size }) : setGlobalSize(size))
    });
  }

  items.push({ separator: true });
  items.push({
    label: localize("PCP.Menu.Size.Custom"),
    icon: "fa-solid fa-pen-ruler",
    action: () => promptSize(actorId)
  });

  return items;
}

function frameMenuItems(actorId) {
  const config = getConfig();
  const actorConfig = getActorConfig(config, actorId);
  const globalFrame = config.appearance.frame;

  return [
    {
      label: localize("PCP.Menu.UseGlobal", { value: localize(`PCP.Frame.${capitalize(globalFrame)}`) }),
      icon: "fa-solid fa-globe",
      checked: !actorConfig.frame,
      action: () => updateActorConfig(actorId, { frame: null })
    },
    { separator: true },
    ...["full", "minimal", "none"].map(frame => ({
      label: localize(`PCP.Frame.${capitalize(frame)}`),
      icon:
        frame === "none"
          ? "fa-regular fa-square"
          : frame === "minimal"
            ? "fa-regular fa-square-minus"
            : "fa-regular fa-square-check",
      checked: actorConfig.frame === frame,
      action: () => updateActorConfig(actorId, { frame })
    }))
  ];
}

function fitMenuItems(actorId) {
  const config = getConfig();
  const actorConfig = getActorConfig(config, actorId);
  const globalFit = config.appearance.imageFit;

  return [
    {
      label: localize("PCP.Menu.UseGlobal", { value: localize(`PCP.Fit.${capitalize(globalFit)}`) }),
      icon: "fa-solid fa-globe",
      checked: !actorConfig.fit,
      action: () => updateActorConfig(actorId, { fit: null })
    },
    { separator: true },
    ...["cover", "contain"].map(fit => ({
      label: localize(`PCP.Fit.${capitalize(fit)}`),
      icon: fit === "cover" ? "fa-solid fa-crop" : "fa-solid fa-expand",
      checked: actorConfig.fit === fit,
      action: () => updateActorConfig(actorId, { fit })
    }))
  ];
}

function namePositionItems(actorId) {
  const config = getConfig();
  const actorConfig = getActorConfig(config, actorId);
  const globalPosition = config.appearance.namePosition;

  return [
    {
      label: localize("PCP.Menu.UseGlobal", {
        value: localize(`PCP.NamePosition.${capitalize(globalPosition)}`)
      }),
      icon: "fa-solid fa-globe",
      checked: !actorConfig.namePosition,
      action: () => updateActorConfig(actorId, { namePosition: null })
    },
    { separator: true },
    ...["overlay", "below", "hidden"].map(position => ({
      label: localize(`PCP.NamePosition.${capitalize(position)}`),
      icon:
        position === "overlay"
          ? "fa-solid fa-layer-group"
          : position === "below"
            ? "fa-solid fa-arrow-down"
            : "fa-solid fa-eye-slash",
      checked: actorConfig.namePosition === position,
      action: () => updateActorConfig(actorId, { namePosition: position })
    }))
  ];
}

function orderMenuItems(actorId) {
  const config = getConfig();
  const order = Array.isArray(config.order) ? config.order : [];
  const index = order.indexOf(actorId);

  return [
    {
      label: localize("PCP.Menu.Order.Up"),
      icon: "fa-solid fa-arrow-up",
      disabled: index <= 0,
      action: () => moveActor(actorId, -1)
    },
    {
      label: localize("PCP.Menu.Order.Down"),
      icon: "fa-solid fa-arrow-down",
      disabled: index < 0 || index >= order.length - 1,
      action: () => moveActor(actorId, 1)
    },
    { separator: true },
    {
      label: localize("PCP.Menu.Order.First"),
      icon: "fa-solid fa-angles-up",
      disabled: index <= 0,
      action: () => moveActorTo(actorId, 0)
    },
    {
      label: localize("PCP.Menu.Order.Last"),
      icon: "fa-solid fa-angles-down",
      disabled: index < 0 || index >= order.length - 1,
      action: () => moveActorTo(actorId, order.length - 1)
    }
  ];
}

async function moveActor(actorId, delta) {
  await mutateConfig(config => {
    const order = Array.isArray(config.order) ? [...config.order] : [];
    const index = order.indexOf(actorId);
    if (index < 0) return;
    const target = clamp(index + delta, 0, order.length - 1, index);
    if (target === index) return;
    order.splice(index, 1);
    order.splice(target, 0, actorId);
    config.order = order;
    syncSortOrders(config);
  });
  refreshAll();
}

async function moveActorTo(actorId, target) {
  await mutateConfig(config => {
    const order = Array.isArray(config.order) ? [...config.order] : [];
    const index = order.indexOf(actorId);
    if (index < 0) return;
    order.splice(index, 1);
    order.splice(clamp(target, 0, order.length, order.length), 0, actorId);
    config.order = order;
    syncSortOrders(config);
  });
  refreshAll();
}

function syncSortOrders(config) {
  for (const [index, id] of (config.order || []).entries()) {
    config.actors[id] = {
      ...getActorConfig(config, id),
      sortOrder: index
    };
  }
}

async function removeActor(actorId) {
  await mutateConfig(config => {
    config.order = (config.order || []).filter(id => id !== actorId);
  });
  refreshAll();
}

async function addActor(actorId) {
  await mutateConfig(config => {
    const order = Array.isArray(config.order) ? config.order : [];
    if (order.includes(actorId)) return;
    const maxSort = Math.max(
      -1,
      ...Object.values(config.actors || {}).map(actor => Number(actor.sortOrder) || 0)
    );
    config.actors[actorId] = {
      ...getActorConfig(config, actorId),
      sortOrder: maxSort + 1
    };
    config.order = [...order, actorId];
  });
  refreshAll();
}

function capitalize(value) {
  const text = String(value ?? "");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function openFraming(actorId) {
  openFramingApp(actorId);
}

function clientScaleItems() {
  const client = getClientConfig();
  const scales = [0.75, 1, 1.25, 1.5];
  return scales.map(scale => ({
    label: `${Math.round(scale * 100)}%`,
    icon: "fa-solid fa-magnifying-glass",
    checked: Math.abs(client.scale - scale) < 0.001,
    action: async () => {
      await mutateClientConfig(config => {
        config.scale = scale;
      });
      refreshAll();
    }
  }));
}

function localPreferenceItems() {
  const client = getClientConfig();
  return [
    {
      label: client.hidden ? localize("PCP.Menu.Local.ShowBar") : localize("PCP.Menu.Local.HideBar"),
      icon: client.hidden ? "fa-solid fa-eye" : "fa-solid fa-eye-slash",
      action: async () => {
        await mutateClientConfig(config => {
          config.hidden = !config.hidden;
        });
        refreshAll();
      }
    },
    {
      label: localize("PCP.Menu.Local.Size"),
      icon: "fa-solid fa-up-right-and-down-left-from-center",
      children: clientScaleItems()
    },
    {
      label: localize("PCP.Menu.Local.ToggleNames"),
      icon: "fa-solid fa-signature",
      checked: !client.hideNames,
      action: async () => {
        await mutateClientConfig(config => {
          config.hideNames = !config.hideNames;
        });
        refreshAll();
      }
    },
    {
      label: localize("PCP.Menu.Local.ToggleBars"),
      icon: "fa-solid fa-bars-staggered",
      checked: !client.hideBars,
      action: async () => {
        await mutateClientConfig(config => {
          config.hideBars = !config.hideBars;
        });
        refreshAll();
      }
    },
    { separator: true },
    {
      label: localize("PCP.A11y.Title"),
      icon: "fa-solid fa-universal-access",
      action: () => A11yPanel.open()
    }
  ];
}

export function openActorMenu(actorId, { x = 0, y = 0 } = {}) {
  const actor = getActor(actorId);
  if (!actor) return;

  if (!game.user.isGM) {
    openMenu(
      [
        {
          label: localize("PCP.Menu.Actor.OpenSheet"),
          icon: "fa-solid fa-address-card",
          disabled: !actorCanOpenSheet(actor),
          action: () => openActorSheet(actorId)
        },
        { separator: true },
        {
          label: localize("PCP.Menu.Local.Preferences"),
          icon: "fa-solid fa-sliders",
          children: localPreferenceItems()
        }
      ],
      { x, y, title: actor.name }
    );
    return;
  }

  openMenu(
    [
      {
        label: localize("PCP.Menu.Actor.OpenSheet"),
        icon: "fa-solid fa-address-card",
        action: () => openActorSheet(actorId)
      },
      { separator: true },
      {
        label: localize("PCP.Menu.Actor.Size"),
        icon: "fa-solid fa-up-right-and-down-left-from-center",
        children: sizeMenuItems(actorId)
      },
      {
        label: localize("PCP.Menu.Actor.Framing"),
        icon: "fa-solid fa-crop-simple",
        children: [
          {
            label: localize("PCP.Menu.Actor.AdjustFraming"),
            icon: "fa-solid fa-crop-simple",
            action: () => openFraming(actorId)
          },
          {
            label: localize("PCP.Menu.Actor.Center"),
            icon: "fa-solid fa-crosshairs",
            action: () => updateActorConfig(actorId, { x: 50, y: 50 })
          },
          {
            label: localize("PCP.Menu.Actor.ResetZoom"),
            icon: "fa-solid fa-magnifying-glass-minus",
            action: () => updateActorConfig(actorId, { zoom: 1 })
          },
          { separator: true },
          ...fitMenuItems(actorId)
        ]
      },
      {
        label: localize("PCP.Menu.Actor.Appearance"),
        icon: "fa-solid fa-palette",
        children: [
          {
            label: localize("PCP.Menu.Actor.Frame"),
            icon: "fa-regular fa-square",
            children: frameMenuItems(actorId)
          },
          {
            label: localize("PCP.Menu.Actor.NamePosition"),
            icon: "fa-solid fa-signature",
            children: namePositionItems(actorId)
          },
          { separator: true },
          {
            label: localize("PCP.Menu.Actor.ClearBorder"),
            icon: "fa-solid fa-eraser",
            action: () => updateActorConfig(actorId, { borderColor: null })
          }
        ]
      },
      {
        label: localize("PCP.Menu.Actor.Order"),
        icon: "fa-solid fa-sort",
        children: orderMenuItems(actorId)
      },
      { separator: true },
      {
        label: localize("PCP.Menu.Actor.Remove"),
        icon: "fa-solid fa-eye-slash",
        action: () => removeActor(actorId)
      },
      {
        label: localize("PCP.Menu.Configure"),
        icon: "fa-solid fa-gear",
        action: () => openConfigApp()
      }
    ],
    { x, y, title: actor.name }
  );
}

async function setPosition(position) {
  await mutateConfig(config => {
    if (position === "free") {
      const hud = document.getElementById("pcp-party-hud");
      const rect = hud?.getBoundingClientRect();
      config.bar.free = {
        enabled: true,
        x: Math.round(rect?.left ?? config.bar.free?.x ?? 40),
        y: Math.round(rect?.top ?? config.bar.free?.y ?? 40)
      };
      return;
    }
    config.bar.free.enabled = false;
    config.bar.position = POSITIONS.includes(position) ? position : "bottom-left";
  });
  refreshAll();
  if (position === "free") setMoveMode(true);
}

async function setOrientation(orientation) {
  await mutateConfig(config => {
    config.bar.orientation = orientation === "vertical" ? "vertical" : "horizontal";
  });
  refreshAll();
}

async function toggleConfigValue(path) {
  await mutateConfig(config => {
    const current = foundry.utils.getProperty(config, path);
    foundry.utils.setProperty(config, path, !current);
  });
  refreshAll();
}

async function setConfigValue(path, value) {
  await mutateConfig(config => {
    foundry.utils.setProperty(config, path, value);
  });
  refreshAll();
}

function globalFrameItems(config) {
  return FRAME_MODES.map(frame => ({
    label: localize(`PCP.Frame.${capitalize(frame)}`),
    icon: frame === "none" ? "fa-regular fa-square" : "fa-regular fa-square-check",
    checked: config.appearance.frame === frame,
    action: () => setConfigValue("appearance.frame", frame)
  }));
}

function globalFitItems(config) {
  return IMAGE_FITS.map(fit => ({
    label: localize(`PCP.Fit.${capitalize(fit)}`),
    icon: fit === "cover" ? "fa-solid fa-crop" : "fa-solid fa-expand",
    checked: config.appearance.imageFit === fit,
    action: () => setConfigValue("appearance.imageFit", fit)
  }));
}

function globalBackgroundItems(config) {
  return BACKGROUND_MODES.map(background => ({
    label: localize(`PCP.Background.${capitalize(background)}`),
    icon:
      background === "dark"
        ? "fa-solid fa-moon"
        : background === "transparent"
          ? "fa-regular fa-square"
          : "fa-solid fa-ban",
    checked: config.appearance.background === background,
    action: () => setConfigValue("appearance.background", background)
  }));
}

function globalNamePositionItems(config) {
  return NAME_POSITIONS.map(position => ({
    label: localize(`PCP.NamePosition.${capitalize(position)}`),
    icon:
      position === "overlay"
        ? "fa-solid fa-layer-group"
        : position === "below"
          ? "fa-solid fa-arrow-down"
          : "fa-solid fa-eye-slash",
    checked: config.appearance.namePosition === position,
    action: () => setConfigValue("appearance.namePosition", position)
  }));
}

function visibilityItems(config, key) {
  const icons = { show: "fa-solid fa-eye", hide: "fa-solid fa-eye-slash", hover: "fa-solid fa-arrow-pointer" };
  return VISIBILITY_MODES.map(mode => ({
    label: localize(`PCP.Visibility.${capitalize(mode)}`),
    icon: icons[mode],
    checked: config.ui[key] === mode,
    action: () => setConfigValue(`ui.${key}`, mode)
  }));
}

async function resetBar() {
  await mutateConfig(config => {
    config.bar.position = "bottom-left";
    config.bar.orientation = "horizontal";
    config.bar.offsetX = 16;
    config.bar.offsetY = 16;
    config.bar.free = { enabled: false, x: 40, y: 40 };
  });
  refreshAll();
  if (isMoveMode()) setMoveMode(false);
}

export function openHudMenu({ x = 0, y = 0 } = {}) {
  if (!game.user.isGM) return;

  const config = getConfig();
  const positionItems = POSITIONS.map(position => ({
    label: localize(positionLabelKey(position)),
    icon: "fa-solid fa-location-dot",
    checked: !config.bar.free?.enabled && config.bar.position === position,
    action: () => setPosition(position)
  }));
  positionItems.push({ separator: true });
  positionItems.push({
    label: localize("PCP.Menu.Hud.FreePosition"),
    icon: "fa-solid fa-up-down-left-right",
    checked: Boolean(config.bar.free?.enabled),
    action: () => setPosition("free")
  });
  positionItems.push({
    label: localize("PCP.Menu.Hud.ResetPosition"),
    icon: "fa-solid fa-rotate-left",
    action: () => resetBar()
  });

  openMenu(
    [
      {
        label: isMoveMode() ? localize("PCP.Menu.Hud.StopMoving") : localize("PCP.Menu.Hud.Move"),
        icon: "fa-solid fa-up-down-left-right",
        checked: isMoveMode(),
        action: () => setMoveMode(!isMoveMode())
      },
      { separator: true },
      {
        label: localize("PCP.Menu.Hud.Position"),
        icon: "fa-solid fa-location-dot",
        children: positionItems
      },
      {
        label: localize("PCP.Menu.Hud.Orientation"),
        icon: "fa-solid fa-arrows-left-right",
        children: [
          {
            label: localize("PCP.Orientation.Horizontal"),
            icon: "fa-solid fa-arrows-left-right",
            checked: config.bar.orientation === "horizontal",
            action: () => setOrientation("horizontal")
          },
          {
            label: localize("PCP.Orientation.Vertical"),
            icon: "fa-solid fa-arrows-up-down",
            checked: config.bar.orientation === "vertical",
            action: () => setOrientation("vertical")
          }
        ]
      },
      {
        label: localize("PCP.Menu.Hud.GlobalSize"),
        icon: "fa-solid fa-up-right-and-down-left-from-center",
        children: sizeMenuItems()
      },
      {
        label: localize("PCP.Menu.Hud.Appearance"),
        icon: "fa-solid fa-palette",
        children: [
          {
            label: localize("PCP.Config.Frame"),
            icon: "fa-regular fa-square",
            children: globalFrameItems(config)
          },
          {
            label: localize("PCP.Config.ImageFit"),
            icon: "fa-solid fa-crop",
            children: globalFitItems(config)
          },
          {
            label: localize("PCP.Config.Background"),
            icon: "fa-solid fa-fill-drip",
            children: globalBackgroundItems(config)
          },
          {
            label: localize("PCP.Config.NamePosition"),
            icon: "fa-solid fa-signature",
            children: globalNamePositionItems(config)
          }
        ]
      },
      { separator: true },
      {
        label: localize("PCP.Menu.Hud.CharacterNames"),
        icon: "fa-solid fa-signature",
        checked: config.data.showCharacterName,
        action: () => toggleConfigValue("data.showCharacterName")
      },
      {
        label: localize("PCP.Menu.Hud.PlayerNames"),
        icon: "fa-solid fa-user",
        checked: config.data.showPlayerName,
        action: () => toggleConfigValue("data.showPlayerName")
      },
      {
        label: localize("PCP.Config.Hotbar"),
        icon: "fa-solid fa-keyboard",
        children: [
          ...visibilityItems(config, "hotbar"),
          { separator: true },
          ...HOTBAR_OVERLAPS.map(mode => ({
            label: localize(`PCP.Overlap.${capitalize(mode)}`),
            icon: mode === "shift" ? "fa-solid fa-arrows-left-right" : "fa-solid fa-clone",
            checked: config.ui.hotbarOverlap === mode,
            action: () => setConfigValue("ui.hotbarOverlap", mode)
          }))
        ]
      },
      {
        label: localize("PCP.Menu.Hud.HidePlayers"),
        icon: "fa-solid fa-users-slash",
        children: visibilityItems(config, "players")
      },
      {
        label: localize("PCP.Menu.Hud.PlayerList"),
        icon: "fa-solid fa-users",
        children: [
          {
            label: localize("PCP.Menu.Hud.ReplaceList"),
            icon: "fa-solid fa-users-viewfinder",
            checked: config.players.enabled,
            action: () => toggleConfigValue("players.enabled")
          },
          {
            label: localize("PCP.Menu.Hud.HideCoreList"),
            icon: "fa-solid fa-eye-slash",
            checked: config.players.hideCore,
            action: () => toggleConfigValue("players.hideCore")
          }
        ]
      },
      { separator: true },
      {
        label: localize("PCP.A11y.Title"),
        icon: "fa-solid fa-universal-access",
        action: () => A11yPanel.open()
      },
      {
        label: localize("PCP.Menu.Configure"),
        icon: "fa-solid fa-gear",
        action: () => openConfigApp()
      }
    ],
    { x, y, title: localize("PCP.Menu.Hud.Title") }
  );
}

async function whisperUser(userId) {
  const user = game.users.get(userId);
  if (!user) return;

  const text = await DialogV2.prompt({
    window: { title: localize("PCP.Prompt.Whisper.Title", { name: user.name }) },
    content: `
      <div class="pcp-dialog-content">
        <textarea name="message" rows="4" placeholder="${escapeHTML(
          localize("PCP.Prompt.Whisper.Placeholder")
        )}"></textarea>
      </div>
    `,
    ok: {
      label: localize("PCP.Prompt.Whisper.Send"),
      callback: (event, button) => button.form.elements.message.value
    }
  });

  const message = String(text ?? "").trim();
  if (!message) return;

  await ChatMessage.create({
    content: `<p>${escapeHTML(message)}</p>`,
    whisper: [game.user.id, userId],
    speaker: ChatMessage.getSpeaker({ alias: game.user.name })
  });
}

async function whisperGMs(extraText = "") {
  const gms = game.users.contents.filter(user => user.isGM && user.active && user.id !== game.user.id);
  if (!gms.length) {
    ui.notifications.warn(localize("PCP.Notifications.NoGM"));
    return;
  }

  const message =
    extraText ||
    (await DialogV2.prompt({
      window: { title: localize("PCP.Prompt.WhisperGM.Title") },
      content: `
        <div class="pcp-dialog-content">
          <textarea name="message" rows="4" placeholder="${escapeHTML(
            localize("PCP.Prompt.Whisper.Placeholder")
          )}"></textarea>
        </div>
      `,
      ok: {
        label: localize("PCP.Prompt.Whisper.Send"),
        callback: (event, button) => button.form.elements.message.value
      }
    }));

  const text = String(message ?? "").trim();
  if (!text) return;

  await ChatMessage.create({
    content: `<p>${escapeHTML(text)}</p>`,
    whisper: [game.user.id, ...gms.map(user => user.id)],
    speaker: ChatMessage.getSpeaker({ alias: game.user.name })
  });
}

async function assignUserCharacter(user, actorId) {
  try {
    await user.update({ character: actorId });
    refreshAll();
  } catch (error) {
    console.error("Party Corner Portraits + | could not assign character", error);
    ui.notifications.error(localize("PCP.Notifications.CharacterChangeFailed"));
  }
}

async function chooseCharacter(userId, { x = window.innerWidth / 2, y = 200 } = {}) {
  const user = game.users.get(userId);
  if (!user) return;

  const actors = game.actors.contents
    .filter(actor => actor.type === "character")
    .filter(actor => {
      if (userId === game.user.id) return actor.testUserPermission(game.user, "OWNER");
      if (game.user.isGM) return actor.testUserPermission(user, "OWNER") || user.isGM;
      return actor.testUserPermission(user, "OWNER");
    })
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang));

  const items = [
    {
      label: localize("PCP.Menu.User.NoCharacter"),
      icon: "fa-solid fa-ban",
      checked: !user.character,
      action: () => assignUserCharacter(user, null)
    }
  ];

  if (actors.length) items.push({ separator: true });
  for (const actor of actors) {
    items.push({
      label: actor.name,
      icon: "fa-solid fa-user",
      checked: user.character?.id === actor.id,
      action: () => assignUserCharacter(user, actor.id)
    });
  }

  openMenu(items, {
    x,
    y,
    title: localize("PCP.Menu.User.ChooseCharacter")
  });
}

async function kickUser(userId) {
  const user = game.users.get(userId);
  if (!user || user.isSelf) return;

  const confirmed = await DialogV2.confirm({
    window: { title: localize("PCP.Prompt.Kick.Title") },
    content: `<p>${localize("PCP.Prompt.Kick.Content", { name: escapeHTML(user.name) })}</p>`,
    yes: { label: localize("PCP.Prompt.Kick.Confirm") },
    no: { label: localize("PCP.Common.Cancel") }
  });

  if (!confirmed) return;

  try {
    // Foundry's core player list does the same: temporarily ban the user to
    // drop the connection, then restore the previous role.
    const role = user.role;
    try {
      await user.update({ role: CONST.USER_ROLES.NONE });
    } finally {
      // Pase lo que pase, la persona no se queda vetada por error.
      await user.update({ role }, { diff: false });
    }
    ui.notifications.info(localize("PCP.Notifications.Kicked", { name: user.name }));
  } catch (error) {
    console.error("Party Corner Portraits + | kick failed", error);
    ui.notifications.error(localize("PCP.Notifications.KickFailed"));
  }
}

function openUserConfig(user) {
  try {
    if (user.sheet) {
      user.sheet.render({ force: true });
      return;
    }
    new foundry.applications.sheets.UserConfig({ document: user }).render(true);
  } catch (error) {
    console.error("Party Corner Portraits + | could not open the user configuration", error);
    ui.notifications.error(localize("PCP.Notifications.UserConfigFailed"));
  }
}

function toggleActorForUser(userId) {
  const user = game.users.get(userId);
  const actor = user?.character;
  if (!actor) {
    ui.notifications.warn(localize("PCP.Notifications.NoCharacter"));
    return;
  }

  const config = getConfig();
  if (config.order.includes(actor.id)) removeActor(actor.id);
  else addActor(actor.id);
}

export function openUserMenu(userId, { x = 0, y = 0 } = {}) {
  const user = game.users.get(userId);
  if (!user) return;

  const isSelf = user.id === game.user.id;
  const items = [];
  const actor = user.character;

  if (game.user.isGM) {
    items.push({
      label: localize("PCP.Menu.User.OpenSheet"),
      icon: "fa-solid fa-address-card",
      disabled: !actor || !actorCanOpenSheet(actor),
      action: () => actor && openActorSheet(actor.id)
    });
    items.push({
      label: localize("PCP.Menu.User.PullToScene"),
      icon: "fa-solid fa-diamond-turn-right",
      disabled: !user.active || isSelf || !globalThis.canvas?.scene,
      action: () => globalThis.canvas?.scene?.pullUsers([user.id])
    });
    items.push({
      label: localize("PCP.Menu.User.ShowInBar"),
      icon: "fa-solid fa-eye",
      checked: Boolean(actor && getConfig().order.includes(actor.id)),
      disabled: !actor,
      action: () => toggleActorForUser(userId)
    });
    items.push({
      label: localize("PCP.Menu.User.ChooseCharacter"),
      icon: "fa-solid fa-user-check",
      action: () => chooseCharacter(userId, { x, y })
    });
    items.push({
      label: localize("PCP.Menu.User.Configure"),
      icon: "fa-solid fa-user-gear",
      action: () => openUserConfig(user)
    });
    items.push({ separator: true });
    items.push({
      label: localize("PCP.Menu.User.Whisper"),
      icon: "fa-solid fa-comment-dots",
      action: () => whisperUser(userId)
    });
    if (user.active && !isSelf) {
      items.push({ separator: true });
      items.push({
        label: localize("PCP.Menu.User.Kick"),
        icon: "fa-solid fa-user-slash",
        action: () => kickUser(userId)
      });
    }
    if (isSelf) {
      items.push({ separator: true });
      items.push({
        label: localize("PCP.Menu.Local.Preferences"),
        icon: "fa-solid fa-sliders",
        children: localPreferenceItems()
      });
    }
    items.push({ separator: true });
    items.push({
      label: localize("PCP.Menu.Configure"),
      icon: "fa-solid fa-gear",
      action: () => openConfigApp()
    });
  } else if (isSelf) {
    items.push({
      label: localize("PCP.Menu.User.MySheet"),
      icon: "fa-solid fa-address-card",
      disabled: !actor,
      action: () => actor && openActorSheet(actor.id)
    });
    items.push({
      label: localize("PCP.Menu.User.Configure"),
      icon: "fa-solid fa-user-gear",
      action: () => openUserConfig(user)
    });
    items.push({
      label: localize("PCP.Menu.User.ChooseCharacter"),
      icon: "fa-solid fa-user-check",
      action: () => chooseCharacter(userId, { x, y })
    });
    if (actor) {
      items.push({
        label: localize("PCP.Menu.User.RequestBar"),
        icon: "fa-solid fa-hand",
        action: () =>
          whisperGMs(
            localize("PCP.Prompt.RequestBar.Message", {
              actor: actor.name,
              user: game.user.name
            })
          )
      });
    }
    items.push({ separator: true });
    items.push({
      label: localize("PCP.Menu.User.WhisperGM"),
      icon: "fa-solid fa-comment-dots",
      action: () => whisperGMs()
    });
    items.push({ separator: true });
    items.push({
      label: localize("PCP.Menu.Local.Preferences"),
      icon: "fa-solid fa-sliders",
      children: localPreferenceItems()
    });
  } else {
    items.push({
      label: localize("PCP.Menu.User.OpenSheet"),
      icon: "fa-solid fa-address-card",
      disabled: !actor || !actorCanOpenSheet(actor),
      action: () => actor && openActorSheet(actor.id)
    });
    items.push({
      label: localize("PCP.Menu.User.Whisper"),
      icon: "fa-solid fa-comment-dots",
      action: () => whisperUser(userId)
    });
  }

  openMenu(items, { x, y, title: user.name });
}

export { openActorSheet, addActor, removeActor };
