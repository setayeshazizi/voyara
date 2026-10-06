/* ============================================================
   VOYARA — Personal Trip Planner + Saved Places
   Client-side itinerary (LocalStorage, no account). Drag-and-drop
   reordering, day management, price estimates from listed prices.
   ============================================================ */
const Trip = {

  activeDay: 0,
  dragRef: null,

  render(root) {
    const t = Store.trip();
    const items = t.days.flat();

    if (!t.cityId || !items.length) {
      root.innerHTML = `
        <div class="page-head">
          <span class="kicker">Personal Trip Planner</span>
          <h2 class="display-6">My Trip</h2>
        </div>
        ${UI.empty("🧭", "Your itinerary is empty",
          "Tap “+ Trip” on any place, hotel or experience to start building your day-by-day plan. It stays on this device — no account needed.",
          `<button class="btn-gold" data-go-places>Browse places</button>`)}`;
      root.querySelector("[data-go-places]").addEventListener("click", () => App.go("places"));
      return;
    }

    let city = null;
    try { city = Api.getCity(t.cityId); } catch { city = null; }

    const days = t.days;
    if (this.activeDay >= days.length) this.activeDay = 0;

    const priceNum = p => {
      if (!p) return 0;
      const m = String(p).replace(/,/g, "").match(/(\d+(?:\.\d+)?)/);
      return m ? parseFloat(m[1]) : 0;
    };
    const est = items.reduce((a, it) => a + priceNum(it.price), 0);

    const tabs = days.map((d, i) => `
      <button type="button" class="trip-tab ${i === this.activeDay ? "active" : ""}" data-day="${i}">
        Day ${i + 1}<span class="trip-tab-n">${d.length}</span>
      </button>`).join("");

    const renderDay = (day, di) => day.length ? day.map((it, i) => {
      const closed = it.hours && /closed/i.test(it.hours);
      return `
      <div class="trip-item" draggable="true" data-day="${di}" data-idx="${i}" tabindex="0">
        <span class="trip-grip" title="Drag to reorder">⋮⋮</span>
        <img class="trip-item-img" src="${it.img || IMG("trip-item")}" alt="" loading="lazy">
        <div class="trip-item-body">
          <div class="trip-item-name">${UI.esc(it.name || "Saved item")}</div>
          <div class="trip-item-meta">
            ${it.price ? `<span>${UI.esc(it.price)}</span>` : ""}
            ${it.hours ? `<span>${UI.esc(it.hours)}</span>` : ""}
            ${closed ? `<span class="trip-warn">⚠ has closing day — check before you go</span>` : ""}
          </div>
        </div>
        <button type="button" class="trip-rm" data-rm="${di}:${i}" title="Remove from trip">✕</button>
      </div>`;
    }).join("") : `<div class="conv-hint">Nothing planned for day ${di + 1} yet — drag items here.</div>`;

    root.innerHTML = `
      <div class="page-head">
        <span class="kicker">Personal Trip Planner</span>
        <h2 class="display-6">My Trip ${city ? `· ${UI.esc(city.name)}` : ""}</h2>
        <p class="page-sub">${items.length} item${items.length === 1 ? "" : "s"} across ${days.length} day${days.length === 1 ? "" : "s"} · stored locally on this device.</p>
      </div>
      <div class="dash-grid">
        <div class="panel span-8">
          <div class="trip-tabs">
            ${tabs}
            <button type="button" class="trip-tab trip-add" id="tripAddDay" title="Add a day">+ Day</button>
          </div>
          <div class="trip-day" id="tripDayList" data-day="${this.activeDay}">
            ${renderDay(days[this.activeDay], this.activeDay)}
          </div>
          <div class="trip-foot">
            <span class="note">Drag items between days to reorder your plan. Estimates use listed entry prices only.</span>
          </div>
        </div>
        <div class="panel span-4">
          <span class="kicker">Estimate</span>
          <h3 class="mt-2 mb-1" style="font-family:var(--font-display)">${UI.esc(city ? city.currency : "USD")} ${Math.round(est).toLocaleString()}</h3>
          <p class="note mb-3">Estimated from ${items.length} listed price${items.length === 1 ? "" : "s"} — activities, meals and transport are extra.</p>
          <div class="d-grid gap-2">
            <button class="btn-gold" id="tripAddMore">Find more places</button>
            <button class="btn-ghost" id="tripBrowseHotels">Where to stay</button>
            <button class="btn-ghost" id="tripClear">Clear entire trip</button>
          </div>
        </div>
      </div>`;

    root.querySelectorAll(".trip-tab[data-day]").forEach(b =>
      b.addEventListener("click", () => { this.activeDay = +b.dataset.day; this.render(root); }));
    root.querySelector("#tripAddDay").addEventListener("click", () => {
      t.days.push([]); Store.saveTrip(t); this.activeDay = t.days.length - 1; this.render(root);
    });
    root.querySelector("#tripAddMore").addEventListener("click", () => App.go("places"));
    root.querySelector("#tripBrowseHotels").addEventListener("click", () => App.go("hotels"));
    root.querySelector("#tripClear").addEventListener("click", () => {
      if (confirm("Remove every item from your trip?")) { Store.resetTrip(null); this.activeDay = 0; UI.refreshCounts(); this.render(root); }
    });

    root.querySelectorAll("[data-rm]").forEach(b => b.addEventListener("click", e => {
      e.stopPropagation();
      const [d, i] = b.dataset.rm.split(":").map(Number);
      t.days[d].splice(i, 1);
      if (!t.days.flat().length) Store.resetTrip(null);
      else if (t.days.length > 1 && !t.days[d].length && t.days.every((x, xi) => xi === d || x.length)) t.days.splice(d, 1);
      Store.saveTrip(t); UI.refreshCounts(); this.render(root);
    }));

    /* drag & drop */
    const list = root.querySelector("#tripDayList");
    list.addEventListener("dragstart", e => {
      const item = e.target.closest(".trip-item");
      if (!item) return;
      this.dragRef = { day: +item.dataset.day, idx: +item.dataset.idx };
      e.dataTransfer.effectAllowed = "move";
    });
    list.addEventListener("dragover", e => e.preventDefault());
    list.addEventListener("drop", e => {
      e.preventDefault();
      const item = e.target.closest(".trip-item");
      const toDay = +list.dataset.day;
      if (!this.dragRef) return;
      const { day: fromDay, idx } = this.dragRef;
      this.dragRef = null;
      let toIdx = item ? +item.dataset.idx : t.days[toDay].length;
      if (fromDay === toDay && toIdx > idx) toIdx--;
      const [moved] = t.days[fromDay].splice(idx, 1);
      if (fromDay === toDay && toIdx > t.days[toDay].length) toIdx = t.days[toDay].length;
      t.days[toDay].splice(toIdx, 0, moved);
      Store.saveTrip(t); this.render(root);
    });
  }
};

/* ============================================================
   Saved Places view — grouped collection with quick actions
   ============================================================ */
const Saved = {
  render(root) {
    const list = Store.saved();
    const groups = [
      { type: "place", label: "Places & Museums" },
      { type: "hotel", label: "Hotels" },
      { type: "experience", label: "Experiences" }
    ];

    root.innerHTML = `
      <div class="page-head">
        <span class="kicker">Saved Places</span>
        <h2 class="display-6">Your collection</h2>
        <p class="page-sub">Kept locally on this device — no account, no sign-in.</p>
      </div>
      ${!list.length ? UI.empty("♡", "Nothing saved yet",
        "Tap the heart on any place, hotel or experience and it will wait for you here.",
        `<button class="btn-gold" onclick="App.go('city')">Explore ${App.city ? UI.esc(App.city.name) : "a city"}</button>`) : ""}`;

    groups.forEach(g => {
      const items = list.filter(s => s.type === g.type);
      if (!items.length) return;
      root.insertAdjacentHTML("beforeend", `
        <div class="panel mb-3">
          <h5 class="mb-3" style="font-family:var(--font-display)">${g.label} <span class="kicker ms-2">${items.length}</span></h5>
          <div class="row g-3">
            ${items.map(s => `
              <div class="col-md-6 col-lg-4">
                <div class="place-card" style="cursor:pointer" data-saved-open="${s.type}:${s.id}" data-city="${s.cityId}">
                  <div class="pc-img"><img src="${s.img || IMG("saved")}" alt="" loading="lazy"></div>
                  <div class="pc-body">
                    <div class="pc-name">${UI.esc(s.name)}</div>
                    <div class="d-flex gap-2 mt-2">
                      <button class="btn-ghost btn-sm" data-saved-view="${s.type}:${s.id}" data-city="${s.cityId}">View</button>
                      <button class="btn-ghost btn-sm" data-saved-unsave="${s.type}:${s.id}">Remove</button>
                    </div>
                  </div>
                </div>
              </div>`).join("")}
          </div>
        </div>`);
    });

    if (root._savedBound) return;
    root._savedBound = true;
    root.addEventListener("click", e => {
      const unsave = e.target.closest("[data-saved-unsave]");
      if (unsave) {
        const [type, id] = unsave.dataset.savedUnsave.split(":");
        Store.toggleSaved({ type, id });
        UI.refreshCounts(); this.render(root); return;
      }
      const view = e.target.closest("[data-saved-view],[data-saved-open]");
      if (view) {
        const [type, id] = (view.dataset.savedView || view.dataset.savedOpen).split(":");
        const cityId = view.dataset.city;
        const finish = () => {
          if (type === "hotel") App.go("hotels");
          else if (type === "experience") App.go("experiences");
          else App.openPlace(id);
        };
        if (cityId && (!App.city || App.city.id !== cityId)) App.selectCity(cityId).then(finish);
        else finish();
      }
    });
  }
};
