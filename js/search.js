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