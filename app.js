(function () {
  var markersRoot = document.getElementById("markers");
  var card = document.getElementById("card");
  var cardBackdrop = document.getElementById("cardBackdrop");
  var cardTitle = document.getElementById("cardTitle");
  var cardMetrics = document.getElementById("cardMetrics");
  var cardNote = document.getElementById("cardNote");
  var cardClose = document.getElementById("cardClose");

  var scene = document.getElementById("scene");
  var mapImage = scene && scene.querySelector(".scene__image");
  var items = window.PARK_OBJECTS_3 || [];
  var activeId = null;
  var markerEls = {};

  function positionMarker(btn, obj) {
    if (!scene || !mapImage) return;
    var css = MapGeometry.imagePercentToCssPercent(obj.x, obj.y, scene, mapImage);
    btn.style.left = css.x + "%";
    btn.style.top = css.y + "%";
  }

  function repositionAllMarkers() {
    items.forEach(function (obj) {
      var btn = markerEls[obj.id];
      if (btn) positionMarker(btn, obj);
    });
  }

  function setCardVisible(visible) {
    if (visible) {
      card.hidden = false;
      cardBackdrop.hidden = false;
      requestAnimationFrame(function () {
        card.classList.add("card--visible");
        cardBackdrop.classList.add("card-backdrop--visible");
      });
    } else {
      card.classList.remove("card--visible");
      cardBackdrop.classList.remove("card-backdrop--visible");
      window.setTimeout(function () {
        if (!card.classList.contains("card--visible")) {
          card.hidden = true;
          cardBackdrop.hidden = true;
        }
      }, 240);
    }
  }

  function renderCard(obj) {
    cardTitle.textContent = obj.title || obj.id;
    cardMetrics.innerHTML = "";
    (obj.metrics || []).forEach(function (m) {
      var row = document.createElement("div");
      row.className = "card__row";
      var dt = document.createElement("dt");
      dt.textContent = m.label;
      var dd = document.createElement("dd");
      dd.textContent = m.value;
      row.appendChild(dt);
      row.appendChild(dd);
      cardMetrics.appendChild(row);
    });
    if (obj.note) {
      cardNote.textContent = obj.note;
      cardNote.hidden = false;
    } else {
      cardNote.textContent = "";
      cardNote.hidden = true;
    }
  }

  function setActiveMarker(id) {
    Object.keys(markerEls).forEach(function (key) {
      var el = markerEls[key];
      if (!el) return;
      if (key === id) el.classList.add("marker--active");
      else el.classList.remove("marker--active");
    });
  }

  function openFor(obj) {
    activeId = obj.id;
    renderCard(obj);
    setActiveMarker(obj.id);
    setCardVisible(true);
    cardClose.focus();
  }

  function closeCard() {
    activeId = null;
    setActiveMarker(null);
    setCardVisible(false);
  }

  function markerSizePx(obj) {
    var def = 22;
    if (obj.size == null || obj.size === "") return def;
    var s = Math.round(Number(obj.size));
    if (isNaN(s)) return def;
    return Math.max(8, Math.min(48, s));
  }

  items.forEach(function (obj) {
    var btn = document.createElement("button");
    btn.type = "button";
    btn.className = "marker";
    positionMarker(btn, obj);
    var px = markerSizePx(obj);
    btn.style.width = px + "px";
    btn.style.height = px + "px";
    btn.style.borderWidth = Math.max(1, Math.round(px / 11)) + "px";
    btn.setAttribute("aria-label", obj.title || obj.id);
    btn.addEventListener("click", function (e) {
      e.stopPropagation();
      if (activeId === obj.id && !card.hidden) {
        closeCard();
        return;
      }
      openFor(obj);
    });
    markersRoot.appendChild(btn);
    markerEls[obj.id] = btn;
  });

  cardClose.addEventListener("click", closeCard);
  cardBackdrop.addEventListener("click", closeCard);

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeCard();
  });

  card.addEventListener("click", function (e) {
    e.stopPropagation();
  });

  if (mapImage) {
    mapImage.addEventListener("load", repositionAllMarkers);
    window.addEventListener("resize", repositionAllMarkers);
  }
})();

(function () {
  var STORAGE_KEY = "luzhnikiParkCoordHud";
  var scene = document.getElementById("scene");
  var mapImage = scene && scene.querySelector(".scene__image");
  var hud = document.getElementById("coordHud");
  var hudValues = document.getElementById("coordHudValues");
  var hudCopy = document.getElementById("coordHudCopy");
  var hudHide = document.getElementById("coordHudHide");

  if (!scene || !hud || !hudValues || !hudCopy || !hudHide) return;

  var params = new URLSearchParams(window.location.search);
  var debugFromUrl =
    params.get("debug") === "1" || params.get("debug") === "true";

  var last = { x: null, y: null };

  function fmt(n) {
    return n.toFixed(2);
  }

  function stripDebugFromUrl() {
    var p = new URLSearchParams(window.location.search);
    if (!p.has("debug")) return;
    p.delete("debug");
    var qs = p.toString();
    var next =
      window.location.pathname + (qs ? "?" + qs : "") + window.location.hash;
    window.history.replaceState(null, "", next);
  }

  function shouldShowHud() {
    if (debugFromUrl) return true;
    try {
      return window.sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch (e) {
      return false;
    }
  }

  function setHudVisible(visible) {
    hud.hidden = !visible;
    hudCopy.disabled = !visible || last.x == null;
  }

  function showHudPersist() {
    try {
      window.sessionStorage.setItem(STORAGE_KEY, "1");
    } catch (e) {}
    setHudVisible(true);
  }

  function hideHud() {
    try {
      window.sessionStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
    stripDebugFromUrl();
    debugFromUrl = false;
    setHudVisible(false);
  }

  function toggleHud() {
    if (hud.hidden) {
      showHudPersist();
    } else {
      hideHud();
    }
  }

  function scenePercents(clientX, clientY) {
    return MapGeometry.pointerToImagePercent(clientX, clientY, scene, mapImage);
  }

  scene.addEventListener("mousemove", function (e) {
    if (hud.hidden) return;
    var p = scenePercents(e.clientX, e.clientY);
    if (!p) return;
    last.x = p.x;
    last.y = p.y;
    hudValues.textContent =
      "x: " + fmt(p.x) + " %   ·   y: " + fmt(p.y) + " %";
    hudCopy.disabled = false;
  });

  hudCopy.addEventListener("click", function () {
    if (last.x == null || last.y == null) return;
    var text =
      "    x: " + fmt(last.x) + ",\n" + "    y: " + fmt(last.y) + ",\n";
    var prev = hudCopy.textContent;
    var done = function () {
      hudCopy.textContent = "Скопировано";
      window.setTimeout(function () {
        hudCopy.textContent = prev;
      }, 1200);
    };
    if (window.navigator.clipboard && window.isSecureContext) {
      window.navigator.clipboard.writeText(text).then(done).catch(function () {
        window.prompt("Скопируйте вручную:", text);
      });
      return;
    }
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.left = "-9999px";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      done();
    } catch (err) {
      window.prompt("Скопируйте вручную:", text);
    }
  });

  hudHide.addEventListener("click", hideHud);

  document.addEventListener("keydown", function (e) {
    if (e.ctrlKey && e.shiftKey && !e.altKey && e.code === "KeyY") {
      e.preventDefault();
      toggleHud();
    }
  });

  if (shouldShowHud()) {
    setHudVisible(true);
    hudCopy.disabled = true;
  } else {
    setHudVisible(false);
  }
})();
