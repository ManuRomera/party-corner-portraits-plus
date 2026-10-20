/**
 * Party Corner Portraits +
 * Lightweight context menu with nested submenus.
 */

let activeRoot = null;
let outsideListener = null;
let escapeListener = null;
let scrollListener = null;

function buildMenu(items, title, isSubmenu = false) {
  const menu = document.createElement("div");
  menu.className = `pcp-menu${isSubmenu ? " pcp-submenu" : " pcp-context-menu"}`;
  menu.setAttribute("role", "menu");

  if (title) {
    const header = document.createElement("div");
    header.className = "pcp-menu-title";
    header.textContent = title;
    menu.appendChild(header);
  }

  for (const item of items) {
    if (!item) continue;

    if (item.separator) {
      const separator = document.createElement("div");
      separator.className = "pcp-menu-separator";
      menu.appendChild(separator);
      continue;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "pcp-menu-item";
    if (item.className) wrapper.classList.add(item.className);

    wrapper.addEventListener("pointerenter", () => {
      for (const submenu of menu.querySelectorAll(":scope > .pcp-menu-item > .pcp-submenu")) {
        if (!wrapper.contains(submenu)) submenu.remove();
      }
    });

    const button = document.createElement("button");
    button.type = "button";
    button.className = "pcp-menu-button";
    button.disabled = Boolean(item.disabled);
    button.setAttribute("role", "menuitem");
    if (item.title) button.title = item.title;

    const icon = document.createElement("i");
    icon.className = `pcp-menu-icon ${item.icon ?? "fa-solid fa-circle-small"}`;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);

    const label = document.createElement("span");
    label.className = "pcp-menu-label";
    label.textContent = item.label ?? "";
    button.appendChild(label);

    const suffix = document.createElement("span");
    suffix.className = "pcp-menu-suffix";
    if (item.checked) {
      const check = document.createElement("i");
      check.className = "fa-solid fa-check";
      suffix.appendChild(check);
    } else if (item.children?.length) {
      const arrow = document.createElement("i");
      arrow.className = "fa-solid fa-chevron-right";
      suffix.appendChild(arrow);
    }
    button.appendChild(suffix);

    wrapper.appendChild(button);

    if (item.children?.length && !item.disabled) {
      let submenu = null;
      let closeTimer = null;

      const cancelClose = () => {
        if (closeTimer !== null) {
          window.clearTimeout(closeTimer);
          closeTimer = null;
        }
      };

      const closeSubmenu = () => {
        cancelClose();
        submenu?.remove();
        submenu = null;
        wrapper.classList.remove("pcp-has-open-submenu");
      };

      const openSubmenu = () => {
        cancelClose();
        if (submenu && !submenu.isConnected) submenu = null;
        if (submenu) return;
        for (const other of menu.querySelectorAll(":scope > .pcp-menu-item")) {
          if (other !== wrapper) other.querySelector(":scope > .pcp-submenu")?.remove();
        }
        submenu = buildMenu(item.children, item.submenuTitle ?? "", true);
        wrapper.appendChild(submenu);
        submenu.style.visibility = "hidden";
        requestAnimationFrame(() => {
          const rect = submenu.getBoundingClientRect();
          if (rect.right > window.innerWidth - 8) submenu.classList.add("pcp-flip");
          if (rect.bottom > window.innerHeight - 8) submenu.classList.add("pcp-flip-y");
          submenu.style.visibility = "";
        });
        submenu.addEventListener("pointerenter", cancelClose);
        wrapper.classList.add("pcp-has-open-submenu");
      };

      wrapper.addEventListener("pointerenter", openSubmenu);
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        openSubmenu();
      });
      wrapper.addEventListener("pointerleave", event => {
        if (event.relatedTarget && wrapper.contains(event.relatedTarget)) return;
        closeTimer = window.setTimeout(closeSubmenu, 180);
      });
    } else {
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        closeMenus();
        try {
          const result = item.action?.();
          if (result && typeof result.catch === "function") {
            result.catch(error => console.error("Party Corner Portraits + | menu action failed", error));
          }
        } catch (error) {
          console.error("Party Corner Portraits + | menu action failed", error);
        }
      });
    }

    if (item.disabled) wrapper.classList.add("pcp-menu-item-disabled");
    menu.appendChild(wrapper);
  }

  return menu;
}

function placeMenu(menu, x, y) {
  const rect = menu.getBoundingClientRect();
  let left = x;
  let top = y;

  if (left + rect.width > window.innerWidth - 8) left = window.innerWidth - rect.width - 8;
  if (top + rect.height > window.innerHeight - 8) top = window.innerHeight - rect.height - 8;

  menu.style.left = `${Math.max(8, left)}px`;
  menu.style.top = `${Math.max(8, top)}px`;
}

export function closeMenus() {
  if (activeRoot) {
    activeRoot.remove();
    activeRoot = null;
  }

  if (outsideListener) {
    document.removeEventListener("pointerdown", outsideListener, true);
    outsideListener = null;
  }
  if (escapeListener) {
    document.removeEventListener("keydown", escapeListener, true);
    escapeListener = null;
  }
  if (scrollListener) {
    window.removeEventListener("scroll", scrollListener, true);
    window.removeEventListener("resize", scrollListener, true);
    scrollListener = null;
  }
}

export function openMenu(items, { x = 0, y = 0, title = "" } = {}) {
  closeMenus();

  const menu = buildMenu(items, title);
  document.body.appendChild(menu);
  activeRoot = menu;
  placeMenu(menu, x, y);

  outsideListener = event => {
    if (!activeRoot?.contains(event.target)) closeMenus();
  };
  document.addEventListener("pointerdown", outsideListener, true);

  escapeListener = event => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMenus();
    }
  };
  document.addEventListener("keydown", escapeListener, true);

  scrollListener = () => closeMenus();
  window.addEventListener("scroll", scrollListener, true);
  window.addEventListener("resize", scrollListener, true);

  return menu;
}
