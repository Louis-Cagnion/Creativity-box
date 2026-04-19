let places = JSON.parse(localStorage.getItem("places")) || [];
let selectedPlace = null;
let draggingPlace = null;
let mode = "user"; // 👈 user par défaut

const inner = document.getElementById("map-inner");

const container = document.getElementById("map-container");
container.classList.add("add-mode");

// =========================
// 🔐 MODE MANAGEMENT
// =========================

function setMode(newMode) {

    // 🔐 passage en admin
    if (newMode === "admin") {

        const pass = prompt("Mot de passe admin ?");

        if (pass !== "admin") {
            alert("Mot de passe incorrect");
            return;
        }

        mode = "admin";

        document.getElementById("adminPanel").classList.remove("hidden");
        container.classList.add("editor-mode");
        container.style.cursor = "crosshair";

        updateModeButtons();
        return;
    }

    // 👀 mode user
    mode = "user";

    document.getElementById("adminPanel").classList.add("hidden");
    container.classList.remove("editor-mode");
    container.style.cursor = "default";

    updateModeButtons();
}

function updateModeButtons() {
    const btnUser = document.getElementById("btnUser");
    const btnAdmin = document.getElementById("btnAdmin");

    btnUser.disabled = mode === "user";
    btnAdmin.disabled = mode === "admin";
}

// =========================
// 💾 SAVE
// =========================

function savePlaces() {
    localStorage.setItem("places", JSON.stringify(places));
}

// =========================
// 🗺️ ADD PLACE (ADMIN ONLY)
// =========================

container.addEventListener("click", function(e) {
    if (mode !== "admin") return;
    if (e.target.classList.contains("marker")) return;

    const rect = container.getBoundingClientRect();

    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const name = prompt("Nom du lieu ?");
    if (!name) return;

    const place = { name, x, y };

    places.push(place);
    savePlaces();

    createPlaceMarker(name, x, y, 1);
});

// =========================
// 🧲 DRAG (ADMIN ONLY)
// =========================

document.addEventListener("mousemove", function(e) {
    if (mode !== "admin") return;
    if (!draggingPlace) return;

    const rect = container.getBoundingClientRect();

    let x = ((e.clientX - rect.left) / rect.width) * 100;
    let y = ((e.clientY - rect.top) / rect.height) * 100;

    x = Math.max(0, Math.min(100, x));
    y = Math.max(0, Math.min(100, y));

    draggingPlace.style.left = x + "%";
    draggingPlace.style.top = y + "%";
});

// =========================
// 🧲 STOP DRAG + SAVE
// =========================

document.addEventListener("mouseup", function() {
    if (mode !== "admin") return;
    if (!draggingPlace) return;

    const name = draggingPlace.dataset.name;

    const x = parseFloat(draggingPlace.style.left);
    const y = parseFloat(draggingPlace.style.top);

    const place = places.find(p => p.name === name);

    if (place) {
        place.x = x;
        place.y = y;
        savePlaces();
    }

    draggingPlace = null;
});

// =========================
// 📍 CREATE MARKER
// =========================

function createPlaceMarker(name, x, y, level = 1) {
    const el = document.createElement("div");
    el.className = "marker place-marker";
    el.style.background = "white";
    el.style.left = x + "%";
    el.style.top = y + "%";
    el.dataset.name = name;
    el.dataset.level = level;

    // 🏷️ label
    const label = document.createElement("div");
    label.className = "place-label";
    label.textContent = formatPlaceName(name);
    el.appendChild(label);

    // 🖱️ SELECT (TOUS MODES)
    el.onclick = function(e) {
        e.stopPropagation();

        selectedPlace = name;

        const title = document.getElementById("placeTitle");
        if (title) title.textContent = name;
    };

    // 🧲 DRAG START (ADMIN ONLY)
    el.onmousedown = function(e) {
        if (mode === "admin") {
            draggingPlace = el;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.stopPropagation(); // 👈 empêche le pan quand on clique sur un marqueur
    };

    // 🗑️ DELETE (ADMIN ONLY)
    el.oncontextmenu = function(e) {
        if (mode !== "admin") return;

        e.preventDefault();

        if (!confirm("Supprimer ce lieu ?")) return;

        places = places.filter(p => p.name !== name);
        savePlaces();

        el.remove();

        if (selectedPlace === name) {
            selectedPlace = null;
            const title = document.getElementById("placeTitle");
            if (title) title.textContent = "";
        }
    };

    inner.appendChild(el);
    console.log(label.getBoundingClientRect());
}

// =========================
// 🔄 LOAD MAP
// =========================

places.forEach(p => {
    const exists = [...document.querySelectorAll(".place-marker")]
        .some(el => el.dataset.name === p.name);

    if (!exists) {
        createPlaceMarker(p.name, p.x, p.y, p.level || 1);
    }
});
setTimeout(() => {updateMarkerVisibility(); repositionLabels(); clampLabels();}, 100);

// =========================
// 📤 EXPORT
// =========================

function exportPlacesToJSON() {
    if (mode !== "admin") return;

    const cleaned = places.map(p => ({
        name: p.name,
        x: Math.round(p.x),
        y: Math.round(p.y),
        level: p.level || 1
    }));

    const json = JSON.stringify(cleaned, null, 2);

    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "places.json";

    document.body.appendChild(a);
    a.click();

    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// =========================
// 📥 IMPORT
// =========================

function importPlacesFromJSON(event) {
    if (mode !== "admin") return;

    const file = event.target.files[0];

    const reader = new FileReader();

    reader.onload = function(e) {
        places = JSON.parse(e.target.result);

        savePlaces();

        document.querySelectorAll(".place-marker").forEach(el => el.remove());

        places.forEach(p => createPlaceMarker(p.name, p.x, p.y, p.level || 1));
    };

    reader.readAsText(file);
}

function triggerImport() {
    if (mode !== "admin") return;

    document.getElementById("importFile").click();
}

function formatPlaceName(name) {
    const max = 19;
    const words = name.split(" ");

    let lines = [];
    let line = "";

    for (let w of words) {
        const test = line ? line + " " + w : w;

        if (test.length > max) {
            lines.push(line);
            line = w;
        } else {
            line = test;
        }
    }

    if (line) lines.push(line);

    return lines.join("\n");
}

function repositionLabels() {
    const labels = [...document.querySelectorAll(".place-label")];

    // Reset
    labels.forEach(l => {
        l.style.transform = "translateX(-50%)";
        l.style.left = "50%"; // 👈 reset le clamp
    });

    // Trier par position verticale (du haut vers le bas)
    labels.sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top);

    for (let i = 1; i < labels.length; i++) {
        const prev = labels[i - 1].getBoundingClientRect();
        const curr = labels[i].getBoundingClientRect();

        const overlap =
            prev.left < curr.right &&
            prev.right > curr.left &&
            prev.bottom > curr.top;

        if (overlap) {
            const shift = prev.bottom - curr.top + 8;
            const current = parseFloat(labels[i].style.transform.match(/translateY\((.+)px\)/)?.[1]) || 0;
            labels[i].style.transform = `translateX(-50%) translateY(${current - shift}px)`;
        }
    }
}

// =========================
// 🔍 ZOOM + PAN
// =========================

let zoom = 1;
let panX = 0;
let panY = 0;
let isPanning = false;
let panStartX = 0;
let panStartY = 0;

function applyTransform() {
    // Limites du pan
    const minPanX = -(900 * zoom - 900);
    const minPanY = -(908 * zoom - 908);

    panX = Math.min(0, Math.max(panX, minPanX));
    panY = Math.min(0, Math.max(panY, minPanY));

    inner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;
    const fontSize = 22 / zoom;
    document.querySelectorAll(".place-label").forEach(l => {
        l.style.fontSize = fontSize + "px";
    });
}

// Zoom molette
container.addEventListener("wheel", function(e) {
    e.preventDefault();

    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 1), 5);

    // Zoom centré sur la position de la souris
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;

    applyTransform();
    updateMarkerVisibility();
    setTimeout(() => { repositionLabels(); clampLabels(); }, 50);
}, { passive: false });

// Pan - début
container.addEventListener("mousedown", function(e) {
    if (mode === "admin") return; // en admin on place des marqueurs
    if (e.button !== 0) return;

    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    inner.classList.add("grabbing");
});

// Pan - déplacement
document.addEventListener("mousemove", function(e) {
    if (!isPanning) return;

    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;

    applyTransform();
});

// Pan - fin
document.addEventListener("mouseup", function(e) {
    if (!isPanning) return;
    isPanning = false;
    inner.classList.remove("grabbing");
    repositionLabels();
    clampLabels();
});

function clampLabels() {
    const containerRect = inner.getBoundingClientRect(); // 👈 inner au lieu de container
    const labels = [...document.querySelectorAll(".place-label")];

    labels.forEach(l => {
        const rect = l.getBoundingClientRect();

        if (rect.left < containerRect.left) {
            const overflow = containerRect.left - rect.left;
            l.style.left = `calc(50% + ${overflow}px)`;
        }

        if (rect.right > containerRect.right) {
            const overflow = rect.right - containerRect.right;
            l.style.left = `calc(50% - ${overflow}px)`;
        }
    });
}

function updateMarkerVisibility() {
    document.querySelectorAll(".place-marker").forEach(el => {
        const level = parseInt(el.dataset.level) || 1;
        if (level === 2 && zoom < 2) {
            el.style.display = "none";
        } else if (level === 1 && zoom >= 2) {
            el.style.display = "none";
        } else {
            el.style.display = "block";
        }
    });
}