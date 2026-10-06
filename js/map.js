/* VOYARA · map logic — world explorer (Leaflet + CARTO dark tiles) & city map */

const Maps = {
  world: null, city: null,
  worldMarkers: [], cityLayers: {},

  tileURL() {
    // swap in your own Mapbox/MapTiler style URL in CONFIG if desired
    if (document.documentElement.dataset.theme === "light")
      return "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";
    return CONFIG.MAP_TILES;
  },

  /* ---------- WORLD EXPLORER ---------- */
  initWorld() {
    if (this.world) { this.world.invalidateSize(); return; }
    this.world = L.map("worldMap", { zoomControl: false, attributionControl: false, worldCopyJump: true, minZoom: 2 })
      .setView([28, 12], 2.4);
    L.control.zoom({ position: "bottomright" }).addTo(this.world);
    L.tileLayer(this.tileURL(), { maxZoom: 18 }).addTo(this.world);
    L.control.attribution({ prefix: false }).addAttribution('© OpenStreetMap © CARTO').addTo(this.world);

    // glow-dot markers for every catalogue city
    [...CITIES, ...CITY_EXTRAS].forEach(c => this.addWorldCity(c));

    // clicking anywhere: fly to the nearest catalogue city (demo reverse-geocode)
    this.world.on("click", e => {
      const c = Api.nearestCity(e.latlng.lat, e.latlng.lng);
      if (c) this.world.flyTo([c.lat, c.lng], 5, { duration: 1.6 });
    });
  },

  addWorldCity(c) {
    const full = !!CITIES.find(x => x.id === c.id);
    const mk = L.divIcon({ className: "world-city-dot", iconSize: [26, 26], iconAnchor: [13, 13] });
    const m = L.marker([c.lat, c.lng], { icon: mk }).addTo(this.world);
    m.bindTooltip(`<b>${UI.esc(c.name)}</b> · ${UI.esc(c.country)}`, {
      direction: "top", offset: [0, -10], className: "world-pin-label", opacity: 1,
    });
    m.on("click", () => App.selectCity(c.id, { fromMap: true }));
    this.worldMarkers.push(m);
  },

  /* ---------- CITY MAP ---------- */
  initCity(city) {
    if (this.city) { this.city.remove(); this.city = null; this.cityLayers = {}; }
    this.city = L.map("cityMap", { zoomControl: false, attributionControl: false }).setView([city.lat, city.lng], 13);
    L.control.zoom({ position: "bottomright" }).addTo(this.city);
    L.tileLayer(this.tileURL(), { maxZoom: 19 }).addTo(this.city);
    L.control.attribution({ prefix: false }).addTo(this.city).addAttribution('© OpenStreetMap © CARTO');

    const groups = {
      places:  { label: "Museums & Sites",  color: "#c8a96a", items: city.places || [] },
      hotels:  { label: "Hotels",           color: "#5e8b7e", items: (city.hotels || []).map(h => ({ ...h, lat: city.lat + (Math.random() - .5) * .06, lng: city.lng + (Math.random() - .5) * .06 })) },
      experiences: { label: "Experiences",  color: "#8b7ec9", items: city.experiences || [] },
      hospitals: { label: "Emergency",      color: "#c05c5c", items: city.hospitals || [] },
    };
    // fallback coordinates for places lacking lat/lng (demo scatter)
    groups.places.items = groups.places.items.map((p, i) => p.lat ? p : { ...p, lat: city.lat + Math.sin(i * 2.1) * .04, lng: city.lng + Math.cos(i * 1.7) * .04 });
    groups.experiences.items = groups.experiences.items.map((p, i) => p.lat ? p : { ...p, lat: city.lat + Math.sin(i * 1.3 + 2) * .07, lng: city.lng + Math.cos(i * 2.3 + 1) * .07 });

    for (const [key, g] of Object.entries(groups)) {
      const layer = L.layerGroup().addTo(this.city);
      g.items.forEach(it => {
        const icon = L.divIcon({
          className: "", iconSize: [14, 14], iconAnchor: [7, 7],
          html: `<div style="width:14px;height:14px;border-radius:50%;background:${g.color};border:2px solid var(--ink);box-shadow:0 0 10px ${g.color}"></div>`,
        });
        L.marker([it.lat, it.lng], { icon }).addTo(layer).bindPopup(`
          <div class="map-popup-premium">
            <h5>${UI.esc(it.name)}</h5>
            <p>${UI.esc(it.type || it.cat || "Point of interest")}${it.open ? " · " + UI.esc(it.open) : ""}${it.price ? " · " + UI.esc(it.price) : ""}</p>
            ${it.img ? `<img src="${it.img}" alt="" style="width:100%;height:90px;object-fit:cover;border-radius:8px;margin-bottom:6px" loading="lazy">` : ""}
            ${it.rating ? `<span class="rating-pill">${it.rating}</span>` : ""}
          </div>`, { closeButton: true });
      });
      this.cityLayers[key] = { layer, label: g.label, color: g.color, count: g.items.length };
    }
    setTimeout(() => this.city.invalidateSize(), 80);
  },

  toggleCityLayer(key, show) {
    const l = this.cityLayers[key];
    if (!l) return;
    if (show) this.city.addLayer(l.layer); else this.city.removeLayer(l.layer);
  },
};
