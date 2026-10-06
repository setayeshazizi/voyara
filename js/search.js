/* ============================================================
   VOYARA — Global Search & hero autocomplete
   Debounced, categorized: cities (always) + places / hotels /
   experiences in the current city. Keyboard: arrows + Enter.
   ============================================================ */
const Search = {

  open: false,
  items: [],   // flat selectable results
  cursor: -1,
  _debounce: null,

  init() {
    const btn = document.getElementById("globalSearchBtn");
    const close = document.getElementById("searchClose");
    const input = document.getElementById("globalSearchInput");
    const overlay = document.getElementById("searchOverlay");
    if (!btn || !overlay) return;

    btn.addEventListener("click", () => this.show());
    close.addEventListener("click", () => this.hide());
    overlay.addEventListener("click", e => { if (e.target === overlay) this.hide(); });
    document.addEventListener("keydown", e => {
      if (e.key === "Escape" && this.open) this.hide();
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); this.show(); }
    });
    input.addEventListener("input", () => {
      clearTimeout(this._debounce);
      this._debounce = setTimeout(() => this.run(input.value), 220);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "ArrowDown") { e.preventDefault(); this._move(1); }
      else if (e.key === "ArrowUp") { e.preventDefault(); this._move(-1); }
      else if (e.key === "Enter") {
        e.preventDefault();
        const pick = this.items[this.cursor] || this.items[0];
        if (pick) this._go(pick);
      }
    });

    this.bindHero();
  },
  show() {
    this.open = true;
    const overlay = document.getElementById("searchOverlay");
    const input = document.getElementById("globalSearchInput");
    overlay.classList.add("open");
    input.value = ""; this.run("");
    setTimeout(() => input.focus(), 60);
  },
  hide() {
    this.open = false;
    document.getElementById("searchOverlay").classList.remove("open");
  },
   run(q) {
    q = q.trim().toLowerCase();
    const out = document.getElementById("searchResults");
    const cities = Api.getCities()
      .filter(c => !q || c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q))
      .slice(0, q ? 6 : 7);

    let html = "";
    this.items = [];
    this.cursor = -1;
    const push = (kind, obj) => this.items.push({ kind, obj });

    if (cities.length) {
      html += `<div class="sr-group">Destinations</div>` + cities.map(c => {
        push("city", c);
        return `<button type="button" class="sr-item" data-i="${this.items.length - 1}">
          <span class="sr-flag">${c.flag || "🌍"}</span>
          <span class="sr-main">${this._hl(c.name, q)}<small>${c.country}</small></span>
          <span class="sr-kind">City</span></button>`;
      }).join("");
    }

    if (App.city) {
      const pool = [
        ["Places", "place", App.city.places || []],
        ["Hotels", "hotel", App.city.hotels || []],
        ["Experiences", "experience", App.city.experiences || []]
      ];
      pool.forEach(([label, kind, arr]) => {
        const hits = q ? arr.filter(x => x.name.toLowerCase().includes(q)).slice(0, 4) : [];
        if (!hits.length) return;
        html += `<div class="sr-group">${label} in ${UI.esc(App.city.name)}</div>` + hits.map(x => {
          push(kind, x);
          return `<button type="button" class="sr-item" data-i="${this.items.length - 1}">
            <span class="sr-main">${this._hl(x.name, q)}<small>${UI.esc(x.cat || x.area || (x.stars ? "★".repeat(x.stars) : ""))}</small></span>
            <span class="sr-kind">${kind === "place" ? "Place" : kind === "hotel" ? "Hotel" : "Experience"}</span></button>`;
        }).join("");
      });
    }
    if (!html) {
      out.innerHTML = UI.empty("🔎", "No matches found",
        q ? `Nothing in our catalogue matches “${UI.esc(q)}”. Try a city name like “Kyoto” or “Lisbon”.`
          : "Start typing to search destinations.");
      return;
    }

    if (!q) html = `<div class="sr-group">Popular destinations</div>` +
      html.replace('<div class="sr-group">Destinations</div>', "");

    out.innerHTML = html;
    out.querySelectorAll(".sr-item").forEach(b =>
      b.addEventListener("click", () => this._go(this.items[+b.dataset.i])));
  },

  _go(pick) {
    this.hide();
    if (!pick) return;
    if (pick.kind === "city") return App.selectCity(pick.obj.id);
    if (pick.kind === "place") return App.openPlace(pick.obj.id);
    if (pick.kind === "hotel") return App.go("hotels");
    if (pick.kind === "experience") return App.go("experiences");
  },

  _move(d) {
    if (!this.items.length) return;
    this.cursor = (this.cursor + d + this.items.length) % this.items.length;
    document.querySelectorAll("#searchResults .sr-item").forEach((el, i) =>
      el.classList.toggle("active", i === this.cursor));
  },

  _hl(text, q) {
    if (!q) return UI.esc(text);
    const i = text.toLowerCase().indexOf(q);
    if (i < 0) return UI.esc(text);
    return UI.esc(text.slice(0, i)) + "<mark>" + UI.esc(text.slice(i, i + q.length)) + "</mark>" + UI.esc(text.slice(i + q.length));
  },

  /* Hero explorer autocomplete on the home view */
  bindHero() {
    const input = document.getElementById("heroSearch");
    const box = document.getElementById("heroSuggest");
    if (!input || !box) return;
    input.addEventListener("input", () => {
      clearTimeout(this._heroT);
      this._heroT = setTimeout(() => {
        const q = input.value.trim().toLowerCase();
        if (!q) { box.classList.remove("show"); return; }
        const hits = Api.getCities().filter(c =>
          c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)).slice(0, 6);
        if (!hits.length) { box.classList.remove("show"); return; }
        box.innerHTML = hits.map(c => `
          <button type="button" class="sr-item" data-city="${c.id}">
            <span class="sr-flag">${c.flag || "🌍"}</span>
            <span class="sr-main">${UI.esc(c.name)}<small>${c.country}</small></span>
            <span class="sr-kind">Explore</span>
          </button>`).join("");
        box.classList.add("show");
        box.querySelectorAll("[data-city]").forEach(b =>
          b.addEventListener("click", () => { box.classList.remove("show"); App.selectCity(b.dataset.city); }));
      }, 200);
    });
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") {
        const q = input.value.trim().toLowerCase();
        const hit = Api.getCities().find(c => c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q));
        if (hit) { box.classList.remove("show"); App.selectCity(hit.id); }
      }
      if (e.key === "Escape") box.classList.remove("show");
    });
    document.addEventListener("click", e => {
      if (!e.target.closest("#heroSuggest") && e.target.id !== "heroSearch") box.classList.remove("show");
    });
  }
};
