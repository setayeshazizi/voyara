/* ═══════════════════════════════════════════════════════════════
   VOYARA · app entry point
   Hash router, view switching, city selection, boot sequence.
   Loaded last — everything above (CONFIG, data, Store, Api, UI,
   Maps, Views, AI/Chat/Photo, Translator, Trip/Saved, Search)
   must already exist.
   ═══════════════════════════════════════════════════════════════ */

const App = {
  city: null,          // currently selected city object (full)
  route: "home",       // active route name
  _booted: false,

  /* ---------- helpers ---------- */
  $(id) { return document.getElementById(id); },

  _root(id) { return this.$(id); },

  /* All known routes: name → { section id, renderer, needsCity } */
  routes() {
    return {
      "":        { id: "view-home",         nav: "home" },
      "city":    { id: "view-city",         nav: "city",    needsCity: true, run: (r, c) => Views.city(r, c) },
      "costs":   { id: "view-costs",        nav: "costs",   needsCity: true, run: (r, c) => Views.costs(r, c) },
      "hotels":  { id: "view-hotels",       nav: "hotels",  needsCity: true, run: (r, c) => Views.hotels(r, c) },
      "places":  { id: "view-places",       nav: "places",  needsCity: true, run: (r, c) => Views.places(r, c) },
      "experiences": { id: "view-experiences", nav: "experiences", needsCity: true, run: (r, c) => Views.experiences(r, c) },
      "map":     { id: "view-map",          nav: "map",     needsCity: true, run: (r, c) => this._renderMap(c) },
      "assistant": { id: "view-assistant",  nav: "assistant", run: r => Chat.render(r) },
      "photo":   { id: "view-photo",        nav: "photo",   run: r => Photo.render(r) },
      "translator": { id: "view-translator", nav: "translator", run: r => Translator.render(r) },
      "trip":    { id: "view-trip",         nav: "trip",    run: r => Trip.render(r) },
      "saved":   { id: "view-saved",        nav: "saved",   run: r => Saved.render(r) },
      "safety":  { id: "view-safety",       nav: "safety",  needsCity: true, run: (r, c) => Views.safety(r, c) },
      "emergency": { id: "view-emergency",  nav: "emergency", needsCity: true, run: (r, c) => Views.emergency(r, c) },
      "events":  { id: "view-events",       nav: "events",  needsCity: true, run: (r, c) => Views.events(r, c) },
    };
  },

  /* ---------- routing ---------- */
  _routeFromHash() {
    const h = location.hash.replace(/^#\/?/, "").split("?")[0];
    return h || "";
  },

  go(route) {
    const target = "#/" + (route || "");
    if (location.hash === target) this.render();   // same-route refresh
    else location.hash = target;
  },

  render() {
    const name = this._routeFromHash();
    const table = this.routes();
    const def = table[name] || table[""];
    this.route = table[name] ? name : "";

    // city-gated views fall back to home with a hint
    if (def.needsCity && !this.city) {
      UI.toast("Pick a destination first — tap a city on the map.");
      return this.go("");
    }

    // toggle sections
    document.querySelectorAll("section.view").forEach(s => s.classList.remove("active"));
    const sec = this.$(def.id);
    if (sec) { sec.classList.add("active"); sec.classList.remove("viewIn"); void sec.offsetWidth; sec.classList.add("viewIn"); }

    // nav active state
    document.querySelectorAll("[data-nav]").forEach(a =>
      a.classList.toggle("active", a.dataset.nav === def.nav));

    // per-view render
    const rootMap = {
      "city": "cityRoot", "costs": "costsRoot", "places": "placesRoot",
      "experiences": "experiencesRoot", "trip": "tripRoot", "saved": "savedRoot",
      "safety": "safetyRoot", "emergency": "emergencyRoot", "hotels": "hotelsRoot",
      "events": "eventsRoot", "assistant": "assistantRoot", "photo": "photoRoot",
      "translator": "translatorRoot",
    };
    if (def.run) {
      const done = def.run(this.$(rootMap[this.route] || ""), this.city);
      // a pending place detail rides on top of the freshly rendered dashboard
      if (this._pendingPlace && this.route === "city") {
        Promise.resolve(done).then(() => {
          const p = this.city && this.city.places.find(x => x.id === this._pendingPlace);
          this._pendingPlace = null;
          if (p) {
            this.$("cityRoot").innerHTML = Views.placeDetail(p, this.city);
            window.scrollTo({ top: 0, behavior: "instant" });
          }
        });
      }
    }
    if (this.route === "") this._renderHome();

    // leaflet needs a nudge after becoming visible
    if (this.route === "") setTimeout(() => Maps.world?.invalidateSize(), 120);
    if (this.route === "map") setTimeout(() => Maps.city?.invalidateSize(), 120);

    window.scrollTo({ top: 0, behavior: "instant" });
  },

  _renderHome() {
    if (!this._homeBuilt) {
      Maps.initWorld();
      Views.home(this.$("popularStrip"));
      this._homeBuilt = true;
    }
  },

  _renderMap(city) {
    Maps.initCity(city);
    Views.mapSidebar(this.$("mapSidebar"), city);
  },

  /* ---------- city selection ---------- */
  selectCity(id, opts = {}) {
    return new Promise(resolve => {
      let city;
      try { city = Api.getCity(id); }
      catch { UI.toast("Destination not in our catalogue yet."); return resolve(null); }

      // cinematic transition
      UI.loader(true, `Preparing ${city.name}…`);
      this.city = city;
      Store.setCurrentCity(city.id);
      UI.updateCityChip(city);
      this._homeBuilt = false;      // force home refresh on return
      Maps.city?.remove(); Maps.city = null;

      setTimeout(() => {
        UI.loader(false);
        this.go("city");
        resolve(city);
      }, opts.fromMap ? 500 : 950);
    });
  },

  findItem(type, id) {
    if (!this.city) return null;
    const pools = { place: "places", hotel: "hotels", experience: "experiences" };
    const arr = this.city[pools[type]] || [];
    const found = arr.find(x => x.id === id);
    return found ? { ...found, type, cityId: this.city.id } : null;
  },

  openPlace(id) {
    if (!this.city || !this.city.places.some(p => p.id === id))
      return UI.toast("Place not found in this city.");
    this._pendingPlace = id;
    this.go("city");
  },

  /* ---------- boot ---------- */
  boot() {
    if (this._booted) return;
    this._booted = true;

    // theme
    UI.setTheme(Store.theme());

    // restore last city (silently — no transition)
    const savedId = Store.currentCity();
    try { if (savedId) { this.city = Api.getCity(savedId); UI.updateCityChip(this.city); } }
    catch { /* unknown id → stay world-first */ }

    UI.refreshCounts();
    Search.init();

    // topnav actions
    this.$("themeToggle").addEventListener("click", () => {
      const next = (Store.theme() === "dark") ? "light" : "dark";
      Store.setTheme(next); UI.setTheme(next);
    });
    this.$("savedBtn").addEventListener("click", () => this.go("saved"));
    const chip = this.$("cityChip");
    if (chip) {
      chip.addEventListener("click", () => this.go("city"));
      chip.addEventListener("keydown", e => { if (e.key === "Enter") this.go("city"); });
    }

    // global "Ask AI about this" bridge (artworks, photo results, etc.)
    document.addEventListener("click", e => {
      const b = e.target.closest("[data-askai]");
      if (!b) return;
      const prompt = b.dataset.askai;
      this.go("assistant");
      setTimeout(() => Chat.userSay(prompt), 350);
    });

    // place cards anywhere (city preview, related lists) open the detail page
    document.addEventListener("click", e => {
      if (this.route === "places") return;         // places() binds its own
      const card = e.target.closest("[data-open-place]");
      if (!card || e.target.closest("[data-save-type],[data-trip-add]")) return;
      this.openPlace(card.dataset.openPlace);
    });

    // router
    window.addEventListener("hashchange", () => this.render());

    // first paint
    this.render();

    // hide loader
    setTimeout(() => UI.loader(false), 900);
  },
};

document.addEventListener("DOMContentLoaded", () => App.boot());
