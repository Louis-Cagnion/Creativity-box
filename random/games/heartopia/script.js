let places = JSON.parse(localStorage.getItem("places")) || [];
let selectedPlace = null;
let draggingPlace = null;
let mode = "user";

const inner = document.getElementById("map-inner");
const container = document.getElementById("map-container");
container.classList.add("add-mode");

// =========================
// 🔐 MODE MANAGEMENT
// =========================

function setMode(newMode) {
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
// 🐟 ELEMENTS
// =========================

let poissons = JSON.parse(localStorage.getItem("poissons")) || [];
let insectes = JSON.parse(localStorage.getItem("insectes")) || [];
let oiseaux = JSON.parse(localStorage.getItem("oiseaux")) || [];
let collectibles = JSON.parse(localStorage.getItem("collectibles")) || [];

let collectiblePlacementMode = false;
let currentCollectible = null;
const lieuxGeneriques = ["Lacs", "Rivières", "Mers", "Forêts", "Foyer", "Bord de l'eau", "Au sommet de la tête de Blanc", "Attracteur d'insectes"];
let draggingCollectible = null;

// =========================
// 🗺️ ADD PLACE (ADMIN ONLY)
// =========================

function createCollectibleMarker(x, y, type, collectibleName, spawnIndex, color = "#e67e22") {
    const el = document.createElement("div");
    el.className = "marker collectible-marker";
    el.style.left = x + "%";
    el.style.top = y + "%";
    el.style.background = color;
    el.dataset.type = type;
    el.dataset.collectibleName = collectibleName;
    el.dataset.spawnIndex = spawnIndex;

    el.onmousedown = function(e) {
        if (mode !== "admin") return;
        draggingCollectible = el;
        e.preventDefault();
        e.stopPropagation();
    };

    inner.appendChild(el);
}

container.addEventListener("click", function(e) {
    if (collectiblePlacementMode) {
        const rect = container.getBoundingClientRect();
        const x = Math.round(((e.clientX - rect.left - panX) / (container.offsetWidth * zoom)) * 10000) / 100;
        const y = Math.round(((e.clientY - rect.top - panY) / (container.offsetHeight * zoom)) * 10000) / 100;
        currentCollectible.spawns.push({ x, y });
        localStorage.setItem("collectibles", JSON.stringify(collectibles));
        const spawnIndex = currentCollectible.spawns.length - 1;
        createCollectibleMarker(x, y, currentCollectible.type, currentCollectible.name, spawnIndex, currentCollectible.color || "#e67e22");
        return;
    }

    if (mode !== "admin") return;
    if (e.target.classList.contains("marker")) return;

    const rect = container.getBoundingClientRect();
    const x = ((e.clientX - rect.left - panX) / (rect.width * zoom)) * 100;
    const y = ((e.clientY - rect.top - panY) / (rect.height * zoom)) * 100;

    const name = prompt("Nom du lieu ?");
    if (!name) return;

    const levelStr = prompt("Niveau (1 ou 2) ?");
    const level = parseInt(levelStr) === 2 ? 2 : 1;

    const place = { name, x, y, level };
    places.push(place);
    savePlaces();
    createPlaceMarker(name, x, y, level);
});

// =========================
// 🧲 DRAG (ADMIN ONLY)
// =========================

document.addEventListener("mousemove", function(e) {
    const rect = container.getBoundingClientRect();

    if (draggingPlace && mode === "admin") {
        let x = ((e.clientX - rect.left - panX) / (rect.width * zoom)) * 100;
        let y = ((e.clientY - rect.top - panY) / (rect.height * zoom)) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        draggingPlace.style.left = x + "%";
        draggingPlace.style.top = y + "%";
    }

    if (draggingCollectible && mode === "admin") {
        let x = ((e.clientX - rect.left - panX) / (rect.width * zoom)) * 100;
        let y = ((e.clientY - rect.top - panY) / (rect.height * zoom)) * 100;
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        draggingCollectible.style.left = x + "%";
        draggingCollectible.style.top = y + "%";
    }
});

// =========================
// 🧲 STOP DRAG + SAVE
// =========================

document.addEventListener("mouseup", function() {
    if (draggingPlace && mode === "admin") {
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
    }

    if (draggingCollectible && mode === "admin") {
        const name = draggingCollectible.dataset.collectibleName;
        const idx = parseInt(draggingCollectible.dataset.spawnIndex);
        const x = Math.round(parseFloat(draggingCollectible.style.left) * 100) / 100;
        const y = Math.round(parseFloat(draggingCollectible.style.top) * 100) / 100;
        const collectible = collectibles.find(c => c.name === name);
        if (collectible) {
            collectible.spawns[idx] = { x, y };
            localStorage.setItem("collectibles", JSON.stringify(collectibles));
        }
        draggingCollectible = null;
    }

    if (isPanning) {
        isPanning = false;
        inner.classList.remove("grabbing");
        repositionLabels();
        clampLabels();
    }
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

    const label = document.createElement("div");
    label.className = "place-label";
    label.textContent = formatPlaceName(name);
    el.appendChild(label);

    label.ondblclick = function(e) {
        if (mode !== "admin") return;
        e.stopPropagation();

        const newName = prompt("Nouveau nom ?", name);
        if (!newName || newName === name) return;

        label.textContent = formatPlaceName(newName);
        el.dataset.name = newName;

        const place = places.find(p => p.name === name);
        if (place) {
            place.name = newName;
            name = newName;
            savePlaces();
        }
        setTimeout(() => { repositionLabels(); clampLabels(); }, 50);
    };

    el.onclick = function(e) {
        e.stopPropagation();
        selectedPlace = name;
        const title = document.getElementById("placeTitle");
        if (title) title.textContent = name;
    };

    el.onmousedown = function(e) {
        if (mode === "admin") {
            draggingPlace = el;
            e.preventDefault();
            e.stopPropagation();
            return;
        }
        e.stopPropagation();
    };

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
collectibles.forEach(c => {
    c.spawns.forEach((s, i) => {
        createCollectibleMarker(s.x, s.y, c.type, c.name, i, c.color || "#e67e22");
    });
});
setTimeout(() => { applyTransform(); updateMarkerVisibility(); repositionLabels(); clampLabels(); }, 100);

// =========================
// 📤 EXPORT LIEUX
// =========================

function exportPlacesToJSON() {
    if (mode !== "admin") return;
    const cleaned = places.map(p => ({
        name: p.name,
        x: Math.round(p.x),
        y: Math.round(p.y),
        level: p.level || 1
    }));
    const blob = new Blob([JSON.stringify(cleaned, null, 2)], { type: "application/json" });
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
// 📥 IMPORT LIEUX
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

// =========================
// 🔤 FORMAT
// =========================

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

// =========================
// 🏷️ LABELS
// =========================

function repositionLabels() {
    const labels = [...document.querySelectorAll(".place-label")];
    labels.forEach(l => {
        l.style.transform = "translateX(-50%)";
        l.style.left = "50%";
    });
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

function clampLabels() {
    const containerRect = inner.getBoundingClientRect();
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
    const minPanX = -(900 * zoom - 900);
    const minPanY = -(908 * zoom - 908);
    panX = Math.min(0, Math.max(panX, minPanX));
    panY = Math.min(0, Math.max(panY, minPanY));
    inner.style.transform = `translate(${panX}px, ${panY}px) scale(${zoom})`;

    const fontSize = 22 / zoom;
    const markerSize = Math.max(6, 16 / zoom);
    const borderSize = Math.max(1, 2 / zoom);

    document.querySelectorAll(".place-label").forEach(l => {
        l.style.fontSize = fontSize + "px";
    });
    document.querySelectorAll(".place-marker").forEach(el => {
        el.style.width = markerSize + "px";
        el.style.height = markerSize + "px";
        el.style.borderRadius = "50%";
        el.style.border = `${borderSize}px solid black`;
        el.style.boxShadow = "none";
    });

    const collectibleSize = Math.max(4, 8 / zoom);
    const collectibleBorder = Math.max(0.5, 1 / zoom);

    document.querySelectorAll(".collectible-marker").forEach(el => {
        el.style.width = collectibleSize + "px";
        el.style.height = collectibleSize + "px";
        el.style.borderRadius = "50%";
        el.style.border = `${collectibleBorder}px solid black`;
    });
}

container.addEventListener("wheel", function(e) {
    e.preventDefault();
    const rect = container.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.min(Math.max(zoom * delta, 1), 5);
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    zoom = newZoom;
    applyTransform();
    updateMarkerVisibility();
    setTimeout(() => { repositionLabels(); clampLabels(); }, 50);
}, { passive: false });

container.addEventListener("mousedown", function(e) {
    if (e.button !== 2) return;
    isPanning = true;
    panStartX = e.clientX - panX;
    panStartY = e.clientY - panY;
    inner.classList.add("grabbing");
    e.preventDefault();
});

container.addEventListener("contextmenu", function(e) {
    e.preventDefault();
    if (collectiblePlacementMode) {
        collectiblePlacementMode = false;
        currentCollectible = null;
        container.style.cursor = "default";
    }
});

document.addEventListener("mousemove", function(e) {
    if (!isPanning) return;
    panX = e.clientX - panStartX;
    panY = e.clientY - panStartY;
    applyTransform();
});

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

function openPanel(panelId) {
    ["panelPoisson", "panelInsecte", "panelOiseau", "panelCollectible"].forEach(id => {
        document.getElementById(id).classList.add("hidden");
    });
    const panelEl = document.getElementById(panelId);
    const select = panelEl.querySelector("select");
    if (select) {
        select.innerHTML = "";
        let generiques = [...lieuxGeneriques];

        if (panelId === "panelPoisson") {
            generiques = generiques.filter(l => ["Lacs", "Rivières", "Mers"].includes(l));
        } else if (panelId === "panelInsecte") {
            generiques = generiques.filter(l => !["Mers", "Au sommet de la tête de Blanc"].includes(l));
        }

        generiques.forEach(l => {
            const opt = document.createElement("option");
            opt.value = l;
            opt.textContent = "🌍 " + l;
            select.appendChild(opt);
        });
        const sep = document.createElement("option");
        sep.disabled = true;
        sep.textContent = "──────────";
        select.appendChild(sep);

        let lieux = [...places].sort((a, b) => a.name.localeCompare(b.name, "fr"));

        // Filtre pour les poissons
        if (panelId === "panelPoisson") {
            const mots = ["lac", "mer", "rivière", "fleuve"];
            lieux = lieux.filter(p =>
                mots.some(mot => new RegExp(`\\b${mot}`, "i").test(p.name))
            );
        } else if (panelId === "panelOiseau") {
            const motsExclus = ["insectes", "Événement : pêche"];
            lieux = lieux.filter(p =>
                !motsExclus.some(mot => p.name.includes(mot))
            );
        } else if (panelId === "panelInsecte") {
            const motsExclus = ["mer", "oiseaux"];
            lieux = lieux.filter(p =>
                !motsExclus.some(mot => new RegExp(`\\b${mot}`, "i").test(p.name))
            );
        }

        lieux.forEach(p => {
            const opt = document.createElement("option");
            opt.value = p.name;
            opt.textContent = p.name;
            select.appendChild(opt);
        });
    }
    panelEl.classList.remove("hidden");
    panelEl.querySelectorAll(".checkbox-group input[type='checkbox']").forEach(cb => {
        cb.checked = true;
    });
}

function closePanel(panelId) {
    document.getElementById(panelId).classList.add("hidden");
    collectiblePlacementMode = false;
    container.style.cursor = "crosshair";
}

function saveElement(type) {
    const panelId = type === "poisson" ? "panelPoisson" : type === "insecte" ? "panelInsecte" : "panelOiseau";
    const panel = document.getElementById(panelId);
    const prefix = type === "oiseau" ? "oisseau" : type;

    const nom = panel.querySelector(`#${prefix}Nom`).value.trim();
    if (!nom) { alert("Nom manquant"); return; }

    const lieu = panel.querySelector(`#${prefix}Lieu`).value;
    const niveau = parseInt(panel.querySelector(`#${prefix}Niveau`).value) || 1;

    const allGroups = panel.querySelectorAll(".checkbox-group");
    const heures = [...allGroups[0].querySelectorAll("input[type='checkbox']")]
        .filter(cb => cb.checked).map(cb => cb.value);
    const meteos = [...allGroups[1].querySelectorAll("input[type='checkbox']")]
        .filter(cb => cb.checked).map(cb => cb.value);

    const element = { name: nom, lieu, heures, meteos, niveau_hobby: niveau };

    if (type === "poisson") {
        poissons.push(element);
        localStorage.setItem("poissons", JSON.stringify(poissons));
    } else if (type === "insecte") {
        insectes.push(element);
        localStorage.setItem("insectes", JSON.stringify(insectes));
    } else {
        oiseaux.push(element);
        localStorage.setItem("oiseaux", JSON.stringify(oiseaux));
    }

    panel.querySelector(`#${prefix}Nom`).value = "";
    alert(`${nom} sauvegardé !`);
}

// =========================
// 🍄 COLLECTIBLES PLACEMENT
// =========================

function creerCollectible() {
    const nom = document.getElementById("collectibleNom").value.trim();
    const categorieSelect = document.getElementById("collectibleCategorieSelect").value;
    const type = categorieSelect === "__new__"
        ? document.getElementById("collectibleType").value.trim()
        : categorieSelect;
    const color = document.getElementById("collectibleColor").value;

    if (!nom) { alert("Nom manquant"); return; }
    if (!type) { alert("Type/catégorie manquant"); return; }

    if (collectibles.find(c => c.name === nom)) {
        alert("Un collectible avec ce nom existe déjà.");
        return;
    }

    currentCollectible = { name: nom, type, color, spawns: [] };
    collectibles.push(currentCollectible);
    localStorage.setItem("collectibles", JSON.stringify(collectibles));

    collectiblePlacementMode = true;
    container.style.cursor = "crosshair";
    document.getElementById("panelCollectible").classList.add("hidden");
}

function placerCollectibleExistant() {
    const nom = document.getElementById("collectibleExistantSelect").value;
    if (!nom) { alert("Aucun élément sélectionné"); return; }

    currentCollectible = collectibles.find(c => c.name === nom);
    if (!currentCollectible) { alert("Élément introuvable"); return; }

    collectiblePlacementMode = true;
    container.style.cursor = "crosshair";
    document.getElementById("panelCollectible").classList.add("hidden");
}

// =========================
// 📤 EXPORT TOUT
// =========================

function exportTout() {
    if (mode !== "admin") return;
    [
        { data: places.map(p => ({ name: p.name, x: Math.round(p.x), y: Math.round(p.y), level: p.level || 1 })), filename: "places.json" },
        { data: poissons, filename: "poissons.json" },
        { data: insectes, filename: "insectes.json" },
        { data: oiseaux, filename: "oiseaux.json" },
        { 
            data: collectibles.map(c => ({
                name: c.name,
                type: c.type,
                color: c.color || "#e67e22",
                spawns: c.spawns.map(s => ({
                    x: Math.round(s.x * 100) / 100,
                    y: Math.round(s.y * 100) / 100
                }))
            })),
            filename: "collectibles.json"
        },
    ].forEach(({ data, filename }) => {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    });
}

// =========================
// 📥 IMPORT ELEMENTS
// =========================

function triggerImportElements() {
    if (mode !== "admin") return;
    document.getElementById("importElementsFile").click();
}

function importElements(event) {
    if (mode !== "admin") return;
    const files = [...event.target.files];
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const data = JSON.parse(e.target.result);
            if (file.name === "places.json") {
                places = data;
                savePlaces();
                document.querySelectorAll(".place-marker").forEach(el => el.remove());
                places.forEach(p => createPlaceMarker(p.name, p.x, p.y, p.level || 1));
            } else if (file.name === "poissons.json") {
                poissons = data;
                localStorage.setItem("poissons", JSON.stringify(poissons));
            } else if (file.name === "insectes.json") {
                insectes = data;
                localStorage.setItem("insectes", JSON.stringify(insectes));
            } else if (file.name === "oiseaux.json") {
                oiseaux = data;
                localStorage.setItem("oiseaux", JSON.stringify(oiseaux));
            } else if (file.name === "collectibles.json") {
                collectibles = data;
                localStorage.setItem("collectibles", JSON.stringify(collectibles));
            } else {
                alert(`Fichier non reconnu : ${file.name}`);
            }
        };
        reader.readAsText(file);
    });
    alert("Import terminé !");
}

function onCategorieSelect() {
    const val = document.getElementById("collectibleCategorieSelect").value;
    const label = document.getElementById("collectibleTypeLabel");
    if (val === "__new__") {
        label.classList.remove("hidden");
    } else {
        label.classList.add("hidden");
    }
}

function openCollectiblePanel() {
    openPanel("panelCollectible");

    // Remplir catégories
    const selectCat = document.getElementById("collectibleCategorieSelect");
    selectCat.innerHTML = '<option value="__new__">➕ Nouvelle catégorie</option>';
    const types = [...new Set(collectibles.map(c => c.type))].sort();
    types.forEach(t => {
        const opt = document.createElement("option");
        opt.value = t;
        opt.textContent = t;
        selectCat.appendChild(opt);
    });
    document.getElementById("collectibleTypeLabel").classList.add("hidden");

    // Remplir éléments existants
    const selectEx = document.getElementById("collectibleExistantSelect");
    selectEx.innerHTML = "";
    [...collectibles].sort((a, b) => a.name.localeCompare(b.name, "fr")).forEach(c => {
        const opt = document.createElement("option");
        opt.value = c.name;
        opt.textContent = c.name;
        selectEx.appendChild(opt);
    });

    // Reset champs
    document.getElementById("collectibleNom").value = "";
    document.getElementById("collectibleColor").value = "#e67e22";
}