/**
 * Party Corner Portraits +
 * Retratos animados: vídeo (webm, mp4, m4v, ogv) además de imágenes, GIF y WebP/APNG animados.
 * Los GIF y WebP animados ya se mueven en un <img>; el vídeo necesita su propio elemento.
 */

const VIDEO_EXT = /\.(webm|mp4|m4v|ogv)(\?.*)?$/i;
export const FALLBACK = "icons/svg/mystery-man.svg";

export function isVideo(src) {
  return VIDEO_EXT.test(String(src ?? ""));
}

/** Origen del retrato: el medio propio del personaje en este módulo, o la imagen del actor. */
export function portraitSource(actor, actorConfig) {
  return String(actorConfig?.media || "").trim() || actor?.img || FALLBACK;
}

export function applyFraming(element, fit, x, y, zoom) {
  element.style.objectFit = fit;
  element.style.objectPosition = `${x}% ${y}%`;
  element.style.transformOrigin = `${x}% ${y}%`;
  element.style.transform = `scale(${zoom})`;
}

/**
 * Crea el elemento del retrato. `still` deja el vídeo en su primer fotograma
 * (opción «reducir movimiento» de accesibilidad).
 */
export function createPortraitElement(src, { alt = "", still = false } = {}) {
  if (!isVideo(src)) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = alt;
    img.draggable = false;
    img.addEventListener(
      "error",
      () => {
        if (!img.src.endsWith(FALLBACK)) img.src = FALLBACK;
      },
      { once: true }
    );
    return img;
  }

  const video = document.createElement("video");
  video.src = src;
  video.muted = true;
  video.loop = true;
  video.playsInline = true;
  video.autoplay = !still;
  video.preload = "auto";
  video.disablePictureInPicture = true;
  video.draggable = false;
  video.setAttribute("aria-label", alt);
  video.addEventListener(
    "error",
    () => {
      const img = createPortraitElement(FALLBACK, { alt });
      for (const name of ["objectFit", "objectPosition", "transformOrigin", "transform"]) {
        img.style[name] = video.style[name];
      }
      video.replaceWith(img);
    },
    { once: true }
  );
  if (!still) video.play?.().catch(() => {});
  return video;
}

/** Tamaño real del medio (imagen o vídeo), o null si aún no se conoce. */
export function naturalSize(element) {
  const w = element.naturalWidth || element.videoWidth;
  const h = element.naturalHeight || element.videoHeight;
  return w && h ? { w, h } : null;
}
