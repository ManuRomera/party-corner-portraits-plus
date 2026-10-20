/**
 * Party Corner Portraits +
 * Evita que los paneles del módulo tapen la interfaz de Foundry (controles de
 * escena, barra lateral, lista de jugadores original).
 */

const GAP = 10;

function visibleRect(selector) {
  const element = document.querySelector(selector);
  if (!element) return null;
  const style = getComputedStyle(element);
  if (style.display === "none" || style.visibility === "hidden") return null;
  const rect = element.getBoundingClientRect();
  return rect.width && rect.height ? rect : null;
}

function overlaps(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

/**
 * Desplaza `element` en horizontal si, en la esquina elegida, se solapa con
 * los controles de escena (izquierda) o la barra lateral (derecha).
 * `corner` es top-left, top-right, bottom-left o bottom-right.
 */
export function avoidCoreUi(element, corner) {
  if (!element?.isConnected) return;
  element.style.removeProperty("--pcp-avoid-x");

  const left = corner.endsWith("left");
  const blockers = left
    ? ["#scene-controls", "#players"]
    : ["#sidebar", "#ui-right #sidebar-tabs", "#players"];

  let shift = 0;
  for (let pass = 0; pass < 3; pass += 1) {
    const rect = element.getBoundingClientRect();
    let moved = false;
    for (const selector of blockers) {
      const blocker = visibleRect(selector);
      if (!blocker || !overlaps(rect, blocker)) continue;
      const wanted = left ? blocker.right + GAP - rect.left : rect.right - (blocker.left - GAP);
      if (wanted > 0) {
        shift += wanted;
        element.style.setProperty("--pcp-avoid-x", `${Math.round(shift)}px`);
        moved = true;
        break;
      }
    }
    if (!moved) break;
  }
}
