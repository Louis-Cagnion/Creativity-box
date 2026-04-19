let places = JSON.parse(localStorage.getItem("places")) || [];
let selectedPlace = null;
let draggingPlace = null;
let mode = "user"; // 👈 user par défaut

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

    createPlaceMarker(name, x, y);
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

function createPlaceMarker(name, x, y) {
    const el = document.createElement("div");
    el.className = "marker place-marker";
    el.style.background = "white";
    el.style.left = x + "%";
    el.style.top = y + "%";
    el.dataset.name = name;

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
        if (mode !== "admin") return;

        draggingPlace = el;
        e.preventDefault();
        e.stopPropagation();
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

    container.appendChild(el);
}

// =========================
// 🔄 LOAD MAP
// =========================

places.forEach(p => {
    const exists = [...document.querySelectorAll(".place-marker")]
        .some(el => el.dataset.name === p.name);

    if (!exists) {
        createPlaceMarker(p.name, p.x, p.y);
    }
});

// =========================
// 📤 EXPORT
// =========================

function exportPlacesToJSON() {
    if (mode !== "admin") return;

    const cleaned = places.map(p => ({
        name: p.name,
        x: Math.round(p.x),
        y: Math.round(p.y)
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

        places.forEach(p => createPlaceMarker(p.name, p.x, p.y));
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