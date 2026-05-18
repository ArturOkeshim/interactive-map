(function () {
  var DRAFT_KEY = "luzhnikiParkEditorDraft";
  var PLACED_EPS = 0.05;
  var DEFAULT_SIZE = 22;
  var MIN_SIZE = 8;
  var MAX_SIZE = 48;

  var searchInput = document.getElementById("searchInput");
  var statsBar = document.getElementById("statsBar");
  var objectList = document.getElementById("objectList");
  var scene = document.getElementById("scene");
  var markersRoot = document.getElementById("markers");
  var crosshair = document.getElementById("crosshair");
  var mapImage = document.getElementById("mapImage");
  var selectedTitle = document.getElementById("selectedTitle");
  var selectedCoords = document.getElementById("selectedCoords");
  var exportBtn = document.getElementById("exportBtn");
  var copyFileBtn = document.getElementById("copyFileBtn");
  var resetDraftBtn = document.getElementById("resetDraftBtn");
  var clearCoordsBtn = document.getElementById("clearCoordsBtn");
  var prevBtn = document.getElementById("prevBtn");
  var nextBtn = document.getElementById("nextBtn");
  var sizeControl = document.getElementById("sizeControl");
  var sizeRange = document.getElementById("sizeRange");
  var sizeNumber = document.getElementById("sizeNumber");
  var sizeDownBtn = document.getElementById("sizeDownBtn");
  var sizeUpBtn = document.getElementById("sizeUpBtn");

  var objects = cloneList(window.PARK_OBJECTS);
  var selectedId = null;
  var markerEls = {};
  var dragState = null;
  var saveTimer = null;

  mapImage.addEventListener("error", function () {
    if (mapImage.dataset.fallback) return;
    mapImage.dataset.fallback = "1";
    mapImage.src = "BAJQWt99bt08L6GIQfa5b_HQ9TRnUW(1).png";
  });

  mapImage.addEventListener("load", onLayoutChange);
  window.addEventListener("resize", onLayoutChange);

  function cloneList(list) {
    return JSON.parse(JSON.stringify(list || []));
  }

  function currentList() {
    return objects;
  }

  function findObject(id) {
    return currentList().find(function (o) {
      return o.id === id;
    });
  }

  function isPlaced(obj) {
    if (!obj) return false;
    return Math.abs(obj.x) > PLACED_EPS || Math.abs(obj.y) > PLACED_EPS;
  }

  function fmtCoord(n) {
    var v = Math.round(n * 100) / 100;
    if (Math.abs(v - Math.round(v)) < 0.001) return String(Math.round(v));
    return v.toFixed(2);
  }

  function getSize(obj) {
    if (!obj || obj.size == null || obj.size === "") return DEFAULT_SIZE;
    var s = Math.round(Number(obj.size));
    if (isNaN(s)) return DEFAULT_SIZE;
    return Math.max(MIN_SIZE, Math.min(MAX_SIZE, s));
  }

  function markerBorder(px) {
    return Math.max(1, Math.round(px / 11)) + "px";
  }

  function applyMarkerDimensions(el, px) {
    el.style.width = px + "px";
    el.style.height = px + "px";
    el.style.borderWidth = markerBorder(px);
  }

  function setSize(obj, size, skipToolbar) {
    var s = Math.max(MIN_SIZE, Math.min(MAX_SIZE, Math.round(size)));
    if (s === DEFAULT_SIZE) delete obj.size;
    else obj.size = s;
    scheduleSave();
    renderMarkers();
    if (!skipToolbar) syncSizeControls();
  }

  function scenePercents(clientX, clientY) {
    return MapGeometry.pointerToImagePercent(clientX, clientY, scene, mapImage);
  }

  function cssPositionForObject(obj) {
    return MapGeometry.imagePercentToCssPercent(obj.x, obj.y, scene, mapImage);
  }

  function onLayoutChange() {
    renderMarkers();
    updateToolbar();
  }

  function setCoords(obj, x, y) {
    obj.x = Math.round(x * 100) / 100;
    obj.y = Math.round(y * 100) / 100;
    scheduleSave();
    renderMarkers();
    renderList();
    updateToolbar();
  }

  function scheduleSave() {
    if (saveTimer) window.clearTimeout(saveTimer);
    saveTimer = window.setTimeout(persistDraft, 300);
  }

  function persistDraft() {
    try {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({
          savedAt: Date.now(),
          objects: objects,
          selectedId: selectedId,
        })
      );
    } catch (e) {}
  }

  function loadDraft() {
    try {
      var raw = window.localStorage.getItem(DRAFT_KEY);
      if (!raw) return false;
      var draft = JSON.parse(raw);
      if (!draft || (!draft.objects && !draft.data)) return false;
      var ok = window.confirm(
        "Найден сохранённый черновик (" +
          new Date(draft.savedAt).toLocaleString("ru-RU") +
          "). Восстановить?"
      );
      if (!ok) return false;
      objects = draft.objects || draft.data.PARK_OBJECTS || draft.data.PARK_OBJECTS_2 || [];
      if (draft.selectedId) selectedId = draft.selectedId;
      return true;
    } catch (e) {
      return false;
    }
  }

  function resetDraft() {
    if (
      !window.confirm(
        "Сбросить черновик и загрузить данные из park-data.js заново? Несохранённые правки пропадут."
      )
    ) {
      return;
    }
    try {
      window.localStorage.removeItem(DRAFT_KEY);
    } catch (e) {}
    objects = cloneList(window.PARK_OBJECTS);
    selectedId = null;
    renderAll();
  }

  function updateStats() {
    var list = currentList();
    var placed = list.filter(isPlaced).length;
    statsBar.innerHTML =
      "Размечено: <strong>" +
      placed +
      "</strong> из " +
      list.length +
      (placed < list.length ? " · осталось " + (list.length - placed) : "");
  }

  function syncSizeControls() {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) {
      sizeControl.hidden = true;
      return;
    }
    sizeControl.hidden = false;
    var s = getSize(obj);
    sizeRange.value = String(s);
    sizeNumber.value = String(s);
  }

  function updateToolbar() {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) {
      selectedTitle.textContent = "—";
      selectedCoords.textContent = "";
      crosshair.hidden = true;
      sizeControl.hidden = true;
      return;
    }
    selectedTitle.textContent = obj.title || obj.id;
    selectedCoords.textContent = isPlaced(obj)
      ? "x: " + fmtCoord(obj.x) + " % · y: " + fmtCoord(obj.y) + " %"
      : "ещё не отмечен";
    syncSizeControls();
    if (isPlaced(obj)) {
      var px = getSize(obj);
      crosshair.hidden = false;
      var cssPos = cssPositionForObject(obj);
      crosshair.style.left = cssPos.x + "%";
      crosshair.style.top = cssPos.y + "%";
      applyMarkerDimensions(crosshair, px);
    } else {
      crosshair.hidden = true;
    }
  }

  function renderList() {
    var q = (searchInput.value || "").trim().toLowerCase();
    var list = currentList();
    objectList.innerHTML = "";

    list.forEach(function (obj) {
      var hay = (obj.id + " " + (obj.title || "")).toLowerCase();
      if (q && hay.indexOf(q) === -1) return;

      var li = document.createElement("li");
      li.className = "editor__item";
      if (obj.id === selectedId) li.classList.add("editor__item--active");
      li.classList.add(isPlaced(obj) ? "editor__item--placed" : "editor__item--empty");

      var btn = document.createElement("button");
      btn.type = "button";
      btn.className = "editor__item-btn";
      btn.innerHTML =
        '<span class="editor__item-id">' +
        obj.id +
        "</span>" +
        '<span class="editor__item-coords">' +
        (isPlaced(obj) ? fmtCoord(obj.x) + ", " + fmtCoord(obj.y) : "—") +
        "</span>" +
        '<span class="editor__item-title">' +
        escapeHtml(obj.title || "") +
        "</span>";

      btn.addEventListener("click", function () {
        selectObject(obj.id);
      });

      li.appendChild(btn);
      objectList.appendChild(li);
    });

    updateStats();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function renderMarkers() {
    markersRoot.innerHTML = "";
    markerEls = {};

    currentList().forEach(function (obj) {
      if (!isPlaced(obj)) return;

      var dot = document.createElement("button");
      dot.type = "button";
      dot.className = "editor__marker";
      var cssPos = cssPositionForObject(obj);
      dot.style.left = cssPos.x + "%";
      dot.style.top = cssPos.y + "%";
      dot.title = obj.title || obj.id;
      dot.setAttribute("aria-label", obj.title || obj.id);

      if (obj.id === selectedId) {
        dot.classList.add("editor__marker--selected");
        applyMarkerDimensions(dot, getSize(obj));
      } else {
        dot.classList.add("editor__marker--dim");
        applyMarkerDimensions(dot, Math.max(8, Math.round(getSize(obj) * 0.55)));
      }

      dot.addEventListener("mousedown", function (e) {
        if (e.button !== 0) return;
        e.preventDefault();
        e.stopPropagation();
        selectObject(obj.id);
        dragState = { id: obj.id, moved: false };
        scene.classList.add("editor__scene--dragging");
      });

      dot.addEventListener("click", function (e) {
        e.stopPropagation();
        selectObject(obj.id);
      });

      markersRoot.appendChild(dot);
      markerEls[obj.id] = dot;
    });
  }

  function selectObject(id, scrollList) {
    selectedId = id;
    renderList();
    renderMarkers();
    updateToolbar();

    if (scrollList) {
      var active = objectList.querySelector(".editor__item--active");
      if (active) active.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }

  function selectNextUnplaced(dir) {
    var list = currentList();
    if (!list.length) return;

    var start = 0;
    if (selectedId) {
      var idx = list.findIndex(function (o) {
        return o.id === selectedId;
      });
      if (idx >= 0) start = idx;
    }

    var n = list.length;
    for (var i = 1; i <= n; i++) {
      var j = (start + i * dir + n) % n;
      if (!isPlaced(list[j])) {
        selectObject(list[j].id, true);
        return;
      }
    }
    var next = (start + dir + n) % n;
    selectObject(list[next].id, true);
  }

  function selectPrev() {
    var list = currentList();
    if (!list.length) return;
    var idx = selectedId
      ? list.findIndex(function (o) {
          return o.id === selectedId;
        })
      : 0;
    if (idx < 0) idx = 0;
    var prev = (idx - 1 + list.length) % list.length;
    selectObject(list[prev].id, true);
  }

  function serializeMetric(m) {
    return (
      '      { label: ' +
      JSON.stringify(m.label) +
      ", value: " +
      JSON.stringify(m.value) +
      " }"
    );
  }

  function serializeObject(obj) {
    var lines = [];
    lines.push("  {");
    lines.push('    id: "' + String(obj.id).replace(/\\/g, "\\\\").replace(/"/g, '\\"') + '",');
    lines.push("    x: " + fmtCoord(obj.x) + ",");
    lines.push("    y: " + fmtCoord(obj.y) + ",");
    if (getSize(obj) !== DEFAULT_SIZE) {
      lines.push("    size: " + getSize(obj) + ",");
    }
    lines.push("    title: " + JSON.stringify(obj.title || "") + ",");
    lines.push("    metrics: [");
    (obj.metrics || []).forEach(function (m, i, arr) {
      lines.push(serializeMetric(m) + (i < arr.length - 1 ? "," : ""));
    });
    lines.push("    ],");
    if (obj.note) {
      lines.push("    note: " + JSON.stringify(obj.note) + ",");
    }
    lines.push("    ");
    lines.push("  }");
    return lines.join("\n");
  }

  function serializeArray(list) {
    if (!list.length) return "[]";
    return "[\n" + list.map(serializeObject).join(",\n") + ",\n]";
  }

  function buildParkDataFile() {
    return (
      "/* Координаты x/y — проценты от области картинки (левый верх = 0,0). size — диаметр маркера в px (по умолчанию 22). */\n" +
      "window.PARK_OBJECTS = " +
      serializeArray(objects) +
      ";\n"
    );
  }

  function downloadFile() {
    var text = buildParkDataFile();
    var blob = new Blob([text], { type: "text/javascript;charset=utf-8" });
    var url = URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.href = url;
    a.download = "park-data.js";
    a.click();
    URL.revokeObjectURL(url);
  }

  function copyFile() {
    var text = buildParkDataFile();
    if (window.navigator.clipboard && window.isSecureContext) {
      window.navigator.clipboard.writeText(text).then(function () {
        copyFileBtn.textContent = "Скопировано";
        window.setTimeout(function () {
          copyFileBtn.textContent = "Копировать файл";
        }, 1500);
      });
      return;
    }
    window.prompt("Скопируйте содержимое park-data.js:", text);
  }

  function renderAll() {
    renderList();
    renderMarkers();
    updateToolbar();
    if (selectedId && !findObject(selectedId)) selectedId = null;
  }

  loadDraft();

  searchInput.addEventListener("input", renderList);

  scene.addEventListener("click", function (e) {
    if (dragState && dragState.moved) return;
    if (!selectedId) {
      window.alert("Сначала выберите объект в списке слева.");
      return;
    }
    var obj = findObject(selectedId);
    if (!obj) return;
    var p = scenePercents(e.clientX, e.clientY);
    if (!p) return;
    setCoords(obj, p.x, p.y);
    selectNextUnplaced(1);
  });

  window.addEventListener("mousemove", function (e) {
    if (!dragState) return;
    var obj = findObject(dragState.id);
    if (!obj) return;
    var p = scenePercents(e.clientX, e.clientY);
    if (!p) return;
    dragState.moved = true;
    setCoords(obj, p.x, p.y);
  });

  window.addEventListener("mouseup", function () {
    if (!dragState) return;
    dragState = null;
    scene.classList.remove("editor__scene--dragging");
  });

  clearCoordsBtn.addEventListener("click", function () {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) return;
    setCoords(obj, 0, 0);
  });

  prevBtn.addEventListener("click", selectPrev);
  nextBtn.addEventListener("click", function () {
    selectNextUnplaced(1);
  });

  exportBtn.addEventListener("click", downloadFile);
  copyFileBtn.addEventListener("click", copyFile);
  resetDraftBtn.addEventListener("click", resetDraft);

  function changeSizeBy(delta) {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) return;
    setSize(obj, getSize(obj) + delta);
    updateToolbar();
  }

  sizeRange.addEventListener("input", function () {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) return;
    setSize(obj, Number(sizeRange.value), true);
    sizeNumber.value = sizeRange.value;
    updateToolbar();
  });

  sizeNumber.addEventListener("change", function () {
    var obj = selectedId ? findObject(selectedId) : null;
    if (!obj) return;
    setSize(obj, Number(sizeNumber.value));
    updateToolbar();
  });

  sizeDownBtn.addEventListener("click", function () {
    changeSizeBy(-2);
  });

  sizeUpBtn.addEventListener("click", function () {
    changeSizeBy(2);
  });

  document.addEventListener("keydown", function (e) {
    if (e.target.matches("input, textarea, select")) return;
    if (e.key === "n" || e.key === "N") {
      e.preventDefault();
      selectNextUnplaced(1);
    }
    if (e.key === "p" || e.key === "P") {
      e.preventDefault();
      selectPrev();
    }
    if (e.key === "[" && selectedId) {
      e.preventDefault();
      changeSizeBy(-2);
    }
    if (e.key === "]" && selectedId) {
      e.preventDefault();
      changeSizeBy(2);
    }
  });

  renderAll();

  if (!selectedId) {
    var firstEmpty = currentList().find(function (o) {
      return !isPlaced(o);
    });
    if (firstEmpty) selectObject(firstEmpty.id);
  }
})();
