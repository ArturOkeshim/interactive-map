/**
 * Координаты x/y в park-data.js — проценты от исходного изображения (0–100).
 * При object-fit: cover картинка обрезается; маркеры и клики нужно
 * пересчитывать между «% изображения» и «% контейнера .scene».
 */
(function (global) {
  function imageDimensions(imageEl) {
    if (!imageEl) return { w: 0, h: 0 };
    var w =
      imageEl.naturalWidth || Number(imageEl.getAttribute("width")) || 0;
    var h =
      imageEl.naturalHeight || Number(imageEl.getAttribute("height")) || 0;
    return { w: w, h: h };
  }

  function getCoverLayout(containerW, containerH, imageW, imageH) {
    if (!containerW || !containerH || !imageW || !imageH) return null;
    var scale = Math.max(containerW / imageW, containerH / imageH);
    var displayW = imageW * scale;
    var displayH = imageH * scale;
    return {
      containerW: containerW,
      containerH: containerH,
      displayW: displayW,
      displayH: displayH,
      offsetX: (containerW - displayW) / 2,
      offsetY: (containerH - displayH) / 2,
    };
  }

  function getLayout(sceneEl, imageEl) {
    if (!sceneEl || !imageEl) return null;
    var rect = sceneEl.getBoundingClientRect();
    var dims = imageDimensions(imageEl);
    return getCoverLayout(rect.width, rect.height, dims.w, dims.h);
  }

  /** Клик/курсор → проценты от полного изображения (для park-data.js). */
  function pointerToImagePercent(clientX, clientY, sceneEl, imageEl) {
    var rect = sceneEl.getBoundingClientRect();
    var layout = getLayout(sceneEl, imageEl);
    if (!layout) return null;
    var localX = clientX - rect.left;
    var localY = clientY - rect.top;
    var x = ((localX - layout.offsetX) / layout.displayW) * 100;
    var y = ((localY - layout.offsetY) / layout.displayH) * 100;
    return {
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    };
  }

  /** Проценты изображения → left/top % контейнера для маркера. */
  function imagePercentToCssPercent(imageX, imageY, sceneEl, imageEl) {
    var layout = getLayout(sceneEl, imageEl);
    if (!layout) return { x: imageX, y: imageY };
    var px = layout.offsetX + (imageX / 100) * layout.displayW;
    var py = layout.offsetY + (imageY / 100) * layout.displayH;
    return {
      x: (px / layout.containerW) * 100,
      y: (py / layout.containerH) * 100,
    };
  }

  global.MapGeometry = {
    imageDimensions: imageDimensions,
    getCoverLayout: getCoverLayout,
    getLayout: getLayout,
    pointerToImagePercent: pointerToImagePercent,
    imagePercentToCssPercent: imagePercentToCssPercent,
  };
})(window);
