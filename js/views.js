/* ═══════════════════════════════════════════════════════════════
   VOYARA · view renderers
   Each render function writes HTML into its root container.
   ═══════════════════════════════════════════════════════════════ */

const Views = {

  /* ══════════ HOME — popular destinations ══════════ */
  home(root) {
    root.innerHTML = `
      <h2 class="section-label">Popular destinations</h2>
      <div class="strip-scroll">
        ${CITIES.map(c => `
          <article class="strip-card" data-city="${c.id}" tabindex="0" role="button" aria-label="Explore ${UI.esc(c.name)}">
            <img src="${c.hero}" alt="${UI.esc(c.name)}" loading="lazy">
            <div class="strip-meta"><h3>${c.flag} ${UI.esc(c.name)}</h3><p>${UI.esc(c.country)}</p></div>
          </article>`).join("")}
      </div>`;
    root.querySelectorAll("[data-city]").forEach(el => {
      el.addEventListener("click", () => App.selectCity(el.dataset.city));
      el.addEventListener("keydown", e => { if (e.key === "Enter") App.selectCity(el.dataset.city); });
    });
  },

  /* ══════════ CITY DASHBOARD ══════════ */
  async city(root, city) {
    root.innerHTML = UI.skeletonCards(3);
    const [wx, rates] = await Promise.all([Api.getWeather(city), Api.getRates("USD")]);
    const score = Math.round(Object.values(city.score).reduce((a, b) => a + b, 0) / 5);
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", timeZone: city.tz });
    const fx = (rates.rates[city.currency] || 1).toFixed(rates.rates[city.currency] > 100 ? 0 : 2);

    root.innerHTML = `
    <!-- HERO -->
    <div class="city-hero">
      <img src="${city.hero}" alt="${UI.esc(city.name)} skyline" fetchpriority="high">
      <div class="city-hero-inner">
        <div>
          <p class="eyebrow">${city.flag} ${UI.esc(city.country)}</p>
          <h1>${UI.esc(city.name)}</h1>
          <p class="country">${UI.esc(city.country)}</p>
          <p class="tagline">${UI.esc(city.tagline)}</p>
        </div>
        <div class="hero-stat-row">
          <div class="hero-stat"><small>Local time</small><b>${now}</b></div>
          <div class="hero-stat"><small>Weather</small><b>${wx.icon} ${wx.temp}°C</b></div>
          <div class="hero-stat"><small>Currency</small><b>${city.currency} · $1≈${fx}</b></div>
          <div class="hero-stat"><small>Safety</small><b>${city.safety.label}</b></div>
          <div class="hero-stat"><small>Best season</small><b>${city.bestSeason}</b></div>
          <div style="display:grid;place-items:center">${UI.scoreRing(score, 92)}<small style="text-align:center;color:var(--text-dim);font-size:.62rem;letter-spacing:.14em;text-transform:uppercase;margin-top:4px">Voyara score</small></div>
        </div>
      </div>
    </div>

    <!-- SMART ALERTS -->
    <div class="smart-alerts">
      ${this._smartAlerts(city, wx).map(a => `<div class="smart-alert ${a.sev}"><span class="dot"></span>${a.text}</div>`).join("")}
    </div>

    <div class="dash-grid">
      <!-- WEATHER -->
      <div class="panel span4 ${wx.rainy ? "raining" : ""}">
        <div class="rain-layer"></div>
        <div class="panel-head"><h3><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M17.5 18a4.5 4.5 0 0 0 .4-9A6 6 0 0 0 6.2 8.3 4.2 4.2 0 0 0 7 18z"/></svg> Weather now</h3>
        ${wx.live ? '<span class="sub" style="margin:0">● live</span>' : '<span class="sub" style="margin:0">demo data</span>'}</div>
        <div class="weather-now">
          <div style="font-size:3rem">${wx.icon}</div>
          <div><div class="weather-temp">${wx.temp}°</div>
          <div class="weather-cond">${UI.esc(wx.condition)} · feels ${wx.feels}°</div></div>
        </div>
        <div class="wx-detail">
          <div><small>Humidity</small><b>${wx.humidity}%</b></div>
          <div><small>Wind</small><b>${wx.wind} km/h</b></div>
          <div><small>Visibility</small><b>${wx.vis} km</b></div>
          <div><small>Sunrise</small><b>${wx.sunrise}</b></div>
          <div><small>Sunset</small><b>${wx.sunset}</b></div>
        </div>
      </div>

      <!-- HOURLY + 7-DAY -->
      <div class="panel span8">
        <div class="panel-head"><h3>Forecast</h3><span class="sub" style="margin:0">next hours & 7 days</span></div>
        <div class="wx-hours">${wx.hourly.map(h => `<div class="wx-hour"><small>${h.t}</small><div class="h-ic">${h.icon}</div><b>${h.temp}°</b></div>`).join("")}</div>
        <div style="margin-top:14px">${wx.daily.map(d => `<div class="wx-day"><span>${d.day}</span><span>${d.icon}</span><span class="range">${d.hi}° / ${d.lo}°</span></div>`).join("")}</div>
      </div>

      <!-- TRAVELER SNAPSHOT -->
      <div class="panel span4">
        <h3>Traveler snapshot</h3>
        <p class="sub">Everything essential, at a glance</p>
        <div class="snapshot">
          <div><small>Weather</small><b>${wx.icon} ${wx.temp}°C</b></div>
          <div><small>Safety</small><b>${city.safety.label}</b></div>
          <div><small>Cost level</small><b>${"$".repeat(city.score.cost > 70 ? 1 : city.score.cost > 45 ? 2 : 3)}</b></div>
          <div><small>Best season</small><b>${city.bestSeason}</b></div>
          <div><small>Language</small><b>${UI.esc(city.language)}</b></div>
          <div><small>Currency</small><b>${city.currency}</b></div>
          <div><small>Time</small><b>${now}</b></div>
          <div><small>Plug</small><b>${UI.esc(city.plug)}</b></div>
        </div>
        <div class="divider"></div>
        <a class="btn-ghost" href="#/costs">Estimate trip cost →</a>
      </div>

      <!-- SAFETY -->
      <div class="panel span8">
        <div class="panel-head"><h3>Is it safe to travel?</h3><a class="btn-ghost" style="padding:7px 16px;font-size:.74rem" href="#/safety">Full safety report</a></div>
        <div class="safety-level">
          <span class="safety-badge ${UI.safetyClass(city.safety.level)}">${city.safety.label}</span>
          <small style="color:var(--text-dim)">Updated ${UI.fmtAgo(city.safety.updated)}</small>
        </div>
        <p style="font-size:.88rem;color:var(--text-dim)">${UI.esc(city.safety.advisory)}</p>
        ${city.safety.alerts.length ? city.safety.alerts.slice(0, 3).map(a => `
          <div class="alert-item"><span class="alert-sev" style="background:${UI.sevColor(a.sev)}"></span>
          <div><b>${UI.esc(a.title)}</b><p>${UI.esc(a.text)}</p><span class="src">${UI.esc(a.src)} · ${UI.fmtAgo(a.time)}</span></div></div>`).join("")
        : `<div class="unavailable">Live information unavailable — check official sources.</div>`}
      </div>

      <!-- BEST TIME TO VISIT -->
      <div class="panel span6">
        <h3>Best time to visit</h3>
        <p class="sub">Compare every month at a glance</p>
        <div class="month-strip">${city.monthScores.map((s, i) => {
          const cls = s >= 4 ? "mc-best" : s === 3 ? "mc-good" : s === 2 ? "mc-mid" : "mc-poor";
          return `<div class="month-cell ${cls}" title="${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]} — ${city.monthLabels[i]}"><b>${["J","F","M","A","M","J","J","A","S","O","N","D"][i]}</b>${["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][i]}</div>`;
        }).join("")}</div>
        <div class="chart-box" style="margin-top:18px"><canvas id="monthChart" aria-label="Monthly visitor score chart" role="img"></canvas></div>
      </div>

      <!-- CITY OVERVIEW (expandable) -->
      <div class="panel span6">
        <h3>City overview</h3>
        <p class="sub">Practical facts & local life</p>
        ${this._expandos(city, [
          ["Essential facts", `<div class="snapshot" style="grid-template-columns:1fr 1fr">
            <div><small>Population</small><b>${UI.esc(city.population)}</b></div>
            <div><small>Language</small><b>${UI.esc(city.language)}</b></div>
            <div><small>Currency</small><b>${city.currency}</b></div>
            <div><small>Time zone</small><b>${UI.esc(city.tz.replace("_", " "))}</b></div>
            <div><small>Electricity</small><b>${UI.esc(city.plug)}</b></div>
            <div><small>Emergency</small><b>${city.emergency.general}</b></div></div>
            <p style="margin-top:10px"><b style="color:var(--text)">Visa:</b> ${UI.esc(city.visa)}</p>`],
          ["Getting around", `<p>${UI.esc(city.transport.trains)}</p><p style="margin-top:8px"><b style="color:var(--text)">Airport:</b> ${(city.transport.airports[0] || {}).name || "See map"} — ${UI.esc((city.transport.airports[0] || {}).note || "")}</p>`],
          ["Know before you go", city.etiquette.map(e => `<div class="etiquette-row"><span class="mark ${e.mark === "ok" ? "ok" : e.mark === "care" ? "care" : "no"}">${e.mark === "ok" ? "✓" : e.mark === "care" ? "⚠" : "✕"}</span><span><b>${UI.esc(e.topic)}.</b> ${UI.esc(e.text)}</span></div>`).join("")],
          ["Good to know", `<ul style="margin:0;padding-left:18px">${city.goodToKnow.map(t => `<li style="margin-bottom:6px">${UI.esc(t)}</li>`).join("")}</ul>`],
        ])}
      </div>

      <!-- NEWS -->
      <div class="panel span6">
        <div class="panel-head"><h3>What's happening now?</h3><a class="btn-ghost" style="padding:7px 16px;font-size:.74rem" href="#/events">All events</a></div>
        ${city.news.length ? city.news.slice(0, 4).map(n => `
          <div class="news-item"><img src="${n.img}" alt="" loading="lazy">
          <div><span class="n-meta">${UI.esc(n.cat)} · ${UI.esc(n.src)} · ${UI.fmtAgo(n.time)}</span>
          <b>${UI.esc(n.title)}</b><p>${UI.esc(n.sum)}</p></div></div>`).join("")
        : `<div class="unavailable">News could not be loaded — please try again later.</div>`}
      </div>

      <!-- BEFORE YOU LEAVE -->
      <div class="panel span6">
        <h3>Before you leave</h3>
        <p class="sub">Your pre-flight checklist</p>
        <div id="checklist">${this._checklist()}</div>
      </div>

      <!-- TOP HOTELS PREVIEW -->
      <div class="panel span12">
        <div class="panel-head"><h3>Where to stay</h3><a class="btn-ghost" style="padding:7px 16px;font-size:.74rem" href="#/hotels">All hotels →</a></div>
        <div class="card-row">${(city.hotels || []).slice(0, 4).map(h => this._hotelCard(h, city)).join("")}</div>
      </div>

      <!-- TOP PLACES PREVIEW -->
      <div class="panel span12">
        <div class="panel-head"><h3>Unmissable places</h3><a class="btn-ghost" style="padding:7px 16px;font-size:.74rem" href="#/places">History & Culture →</a></div>
        <div class="card-row">${(city.places || []).slice(0, 4).map(p => this._placeCard(p, city)).join("")}</div>
      </div>
    </div>`;

    UI.animateRings(root);
    this._bindExpandos(root);
    this._bindChecklist(root);
    this._monthChart(city);
  },

  _smartAlerts(city, wx) {
    const out = [];
    const y = wx.daily[1];
    if (y && /rain|snow|storm/i.test(wx.condition + " " + y.icon)) out.push({ sev: "warn", text: `⚠ Precipitation expected ${y.day} (${y.icon}) — pack accordingly` });
    city.safety.alerts.filter(a => a.sev !== "green").slice(0, 2)
      .forEach(a => out.push({ sev: a.sev === "yellow" ? "warn" : "danger", text: `⚠ ${a.title}` }));
    const air = (city.transport.airports[0] || {});
    if (/delay|closure|suspension/i.test(air.note || "")) out.push({ sev: "warn", text: `✈ ${air.name}: ${air.note}` });
    if (!out.length) out.push({ sev: "", text: "✓ No major disruptions reported for " + city.name });
    if (city.events?.length) out.push({ sev: "", text: `◈ ${city.events[0].title} — ${city.events[0].day} ${city.events[0].mon}` });
    return out;
  },

  _expandos(root, pairs) {
    return pairs.map(([title, body], i) => `
      <div class="expando ${i === 0 ? "open" : ""}">
        <button aria-expanded="${i === 0}"><span>${UI.esc(title)}</span><span class="chev">▾</span></button>
        <div class="expando-body"><div class="expando-inner">${body}</div></div>
      </div>`).join("");
  },
  _bindExpandos(root) {
    root.querySelectorAll(".expando > button").forEach(b => b.addEventListener("click", () => {
      const ex = b.parentElement, open = ex.classList.toggle("open");
      b.setAttribute("aria-expanded", open);
    }));
  },

  _checklist() {
    const items = ["Passport valid 6+ months", "Visa / ETA confirmed", "Travel insurance purchased",
      "Currency or fee-free card arranged", "Weather checked & packed for", "Local SIM / eSIM activated",
      "Emergency numbers saved", "Cultural rules reviewed"];
    const done = Store.checklist();
    return items.map((t, i) => `
      <div class="check-item ${done[i] ? "done" : ""}" data-check="${i}" role="checkbox" aria-checked="${!!done[i]}" tabindex="0">
        <span class="check-box">✓</span><span>${t}</span>
      </div>`).join("");
  },
  _bindChecklist(root) {
    const toggle = el => {
      const done = Store.checklist();
      done[el.dataset.check] = !done[el.dataset.check];
      Store.setChecklist(done);
      el.classList.toggle("done", done[el.dataset.check]);
      el.setAttribute("aria-checked", done[el.dataset.check]);
    };
    root.querySelectorAll("[data-check]").forEach(el => {
      el.addEventListener("click", () => toggle(el));
      el.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(el); } });
    });
  },

  _monthChart(city) {
    const ctx = UI.$("#monthChart");
    if (!ctx || !window.Chart) return;
    Chart.defaults.color = getComputedStyle(document.body).getPropertyValue("--text-dim");
    Chart.defaults.font.family = "Inter";
    new Chart(ctx, {
      type: "bar",
      data: {
        labels: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
        datasets: [{ data: city.monthScores.map(s => s + 1), backgroundColor: city.monthScores.map(s => s >= 4 ? "rgba(111,162,135,.7)" : s === 3 ? "rgba(200,169,106,.7)" : "rgba(168,159,143,.35)"), borderRadius: 4 }],
      },
      options: { plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => city.monthLabels[c.dataIndex] } } }, scales: { y: { display: false, max: 5.6 }, x: { grid: { display: false } } }, maintainAspectRatio: false },
    });
  },

  _placeCard(p, city) {
    return `<article class="place-card fade-up" data-open-place="${p.id}">
      ${UI.saveHeart("place", p)}
      <button class="add-trip-btn" data-trip-type="place" data-trip-add="${p.id}">+ Trip</button>
      <div class="pc-img"><img src="${p.img}" alt="${UI.esc(p.name)}" loading="lazy">${p.unesco ? '<span class="rating-pill" style="position:absolute;bottom:10px;left:12px">UNESCO</span>' : ""}</div>
      <div class="pc-body"><h4>${UI.esc(p.name)}</h4>
      <div class="pc-meta">${p.cat} · ${UI.esc(p.hours || "")} · ${UI.esc(p.dist || "")}</div>
      <div class="pc-foot"><span class="rating-pill">${p.rating}</span><span class="price-tag">${UI.esc(p.price || "Free")}</span></div></div>
    </article>`;
  },

  _hotelCard(h, city) {
    return `<article class="place-card fade-up">
      ${UI.saveHeart("hotel", h)}
      <button class="add-trip-btn" data-trip-type="hotel" data-trip-add="${h.id}">+ Trip</button>
      <div class="pc-img"><img src="${h.img}" alt="${UI.esc(h.name)}" loading="lazy"><span style="position:absolute;bottom:10px;left:12px;color:var(--gold-2);font-size:.8rem;letter-spacing:2px">${UI.stars(h.stars)}</span></div>
      <div class="pc-body"><h4>${UI.esc(h.name)}</h4>
      <div class="pc-meta">${UI.esc(h.area)} · ${UI.esc(h.dist)} from center</div>
      <div class="pc-foot"><span class="rating-pill">${h.rating}</span><span class="price-tag">${city.currency} ${h.price.toLocaleString()}<small>/night</small></span></div>
      <div style="margin-top:8px">${h.amenities.slice(0, 3).map(a => `<span class="amenity-chip">${UI.esc(a)}</span>`).join("")}</div></div>
    </article>`;
  },

  /* ══════════ TRAVEL COSTS ══════════ */
  async costs(root, city) {
    root.innerHTML = `<div class="page-head"><h2>How much will my trip cost?</h2>
      <p>Estimate your full budget — accommodation, food, transport, activities and more. ${city ? `Estimates for <b class="gold">${UI.esc(city.name)}</b>.` : "Select a city for local estimates."}</p></div>
      <div class="panel">
        <div class="cost-controls">
          <div><label for="cTrav">Travelers</label><input id="cTrav" type="number" min="1" max="12" value="2"></div>
          <div><label for="cDays">Days</label><input id="cDays" type="number" min="1" max="60" value="7"></div>
          <div><label>Travel style</label>
            <div class="seg" id="cStyle">
              <button data-v="0" class="active">Budget</button><button data-v="1">Comfortable</button><button data-v="2">Luxury</button>
            </div></div>
          <div><label for="cCurr">Display currency</label>
            <select id="cCurr" class="curr-select">
              ${LANGUAGES ? "" : ""}${["USD","EUR","GBP","AED","TRY","JPY","IRR","AFN","CNY","MAD"].map(c => `<option ${c === (city?.currency || "USD") ? "selected" : ""}>${c}</option>`).join("")}
            </select></div>
        </div>
        <div id="costOut"></div>
      </div>`;

    const rates = await Api.getRates("USD");
    const render = () => {
      const trav = +UI.$("#cTrav").value || 1, days = +UI.$("#cDays").value || 1;
      const style = +UI.$("#cStyle .active").dataset.v;
      const cur = UI.$("#cCurr").value;
      const rate = rates.rates[cur] || 1;
      const conv = usd => Math.round(usd * rate).toLocaleString();
      const base = city ? city.costBase : { hotel: [70, 150, 400], food: [25, 50, 120], transport: 8, attractions: 18, activities: 35, shopping: 25 };
      const lines = [
        ["Hotel (" + ["hostel/guesthouse", "mid-range hotel", "luxury hotel"][style] + ")", base.hotel[style] * days],
        ["Food & drink", base.food[style] * days],
        ["Local transport", base.transport * days],
        ["Attractions & museums", base.attractions * days],
        ["Activities & experiences", base.activities * days],
        ["Shopping & souvenirs", base.shopping * days],
        ["Visa & admin (est.)", 40],
        ["Travel insurance (est.)", 9 * days],
        ["Miscellaneous buffer", 15 * days],
      ];
      const perPerson = lines.reduce((a, l) => a + l[1], 0);
      const flights = 450 * trav; // demo long-haul average — live flight APIs via proxy in live mode
      const total = (perPerson * trav + flights) * rate;
      const daily = ((perPerson) ) * rate;
      UI.$("#costOut").innerHTML = `
        <div class="cost-total"><span class="big">${cur} ${Math.round(total).toLocaleString()}</span>
          <span class="cost-note">estimated total · ≈ ${cur} ${Math.round(daily).toLocaleString()} per person/day</span></div>
        <div class="cost-note" style="margin-bottom:14px">Includes ≈ ${cur} ${Math.round(flights * rate).toLocaleString()} estimated flights (long-haul avg). ${rates.live ? "Live exchange rates" : "Offline demo exchange rates"} · Estimates only — prices change.</div>
        <div class="chart-box sm"><canvas id="costChart"></canvas></div>
        <div class="divider"></div>
        ${lines.map(l => `<div class="cost-line"><span>${l[0]}</span><b>${cur} ${conv(l[1] * trav)}</b></div>`).join("")}`;
      const ctx = UI.$("#costChart");
      if (ctx && window.Chart) new Chart(ctx, {
        type: "doughnut",
        data: { labels: lines.map(l => l[0]), datasets: [{ data: lines.map(l => l[1]), backgroundColor: ["#c8a96a", "#5e8b7e", "#8b7ec9", "#c05c5c", "#d19a3f", "#6fa287", "#a89f8f", "#7e9bb5", "#b58ba0"], borderWidth: 0 }] },
        options: { cutout: "68%", plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 10 } } } }, maintainAspectRatio: false },
      });
    };
    root.querySelectorAll("#cStyle button").forEach(b => b.addEventListener("click", () => {
      root.querySelectorAll("#cStyle button").forEach(x => x.classList.remove("active"));
      b.classList.add("active"); render();
    }));
    ["cTrav", "cDays", "cCurr"].forEach(id => UI.$("#" + id).addEventListener("input", render));
    render();
  },

  /* ══════════ HOTELS ══════════ */
  hotels(root, city) {
    if (!city || !(city.hotels || []).length) {
      root.innerHTML = UI.empty("🏨", "No hotel data", "Select a fully-featured demo city (Paris, Kyoto, Dubai, Istanbul, Rome, New York, London) or connect a live hotel API.");
      return;
    }
    root.innerHTML = `<div class="page-head"><h2>Where to stay in ${UI.esc(city.name)}</h2>
      <p>Curated stays across budgets. Availability is not real-time — always confirm before booking.</p></div>
      <div class="filter-bar" id="hFilters">
        ${["All", "Luxury ★★★★★", "4-star", "3-star & under", "Near center"].map((f, i) => `<button class="filter-chip ${i === 0 ? "active" : ""}" data-f="${f}">${f}</button>`).join("")}
      </div>
      <div class="card-row" id="hGrid"></div>`;
    const grid = UI.$("#hGrid", root);
    const draw = f => {
      let list = city.hotels;
      if (f === "Luxury ★★★★★") list = list.filter(h => h.stars === 5);
      if (f === "4-star") list = list.filter(h => h.stars === 4);
      if (f === "3-star & under") list = list.filter(h => h.stars <= 3);
      if (f === "Near center") list = [...list].sort((a, b) => parseFloat(a.dist) - parseFloat(b.dist));
      grid.innerHTML = list.map(h => this._hotelCard(h, city)).join("") || UI.empty("🔍", "No matches", "Try a different filter.");
      UI.observeReveals(grid);
    };
    root.querySelectorAll("#hFilters .filter-chip").forEach(c => c.addEventListener("click", () => {
      root.querySelectorAll("#hFilters .filter-chip").forEach(x => x.classList.remove("active"));
      c.classList.add("active"); draw(c.dataset.f);
    }));
    draw("All");
  },

  /* ══════════ HISTORY & CULTURE ══════════ */
  places(root, city) {
    if (!city || !(city.places || []).length) {
      root.innerHTML = UI.empty("🏛", "No places yet", "This city is a lightweight demo entry. Choose a full city to explore its history & culture.");
      return;
    }
    const cats = ["All", ...new Set(city.places.map(p => p.cat))];
    root.innerHTML = `<div class="page-head"><h2>History & Culture — ${UI.esc(city.name)}</h2>
      <p>Landmarks, museums, sacred architecture and the neighborhoods that hold a city's memory.</p></div>
      <div class="filter-bar" id="pFilters">
        ${cats.map((c, i) => `<button class="filter-chip ${i === 0 ? "active" : ""}" data-f="${c}">${c[0].toUpperCase() + c.slice(1)}</button>`).join("")}
      </div>
      <div class="card-row" id="pGrid"></div>`;
    const grid = UI.$("#pGrid", root);
    const draw = f => {
      const list = f === "All" ? city.places : city.places.filter(p => p.cat === f);
      grid.innerHTML = list.map(p => this._placeCard(p, city)).join("");
      UI.observeReveals(grid);
      grid.querySelectorAll("[data-open-place]").forEach(el => el.addEventListener("click", e => {
        if (e.target.closest("[data-save-type],[data-trip-add]")) return;
        App.openPlace(el.dataset.openPlace);
      }));
    };
    root.querySelectorAll("#pFilters .filter-chip").forEach(c => c.addEventListener("click", () => {
      root.querySelectorAll("#pFilters .filter-chip").forEach(x => x.classList.remove("active"));
      c.classList.add("active"); draw(c.dataset.f);
    }));
    draw("All");
  },

  /* place detail (museum experience included) */
  placeDetail(place, city) {
    const isMuseum = place.cat === "museum" || (place.artworks || []).length > 1;
    return `
    <div class="city-hero" style="min-height:44vh">
      <img src="${place.img}" alt="${UI.esc(place.name)}">
      <div class="city-hero-inner"><div>
        <p class="eyebrow">${place.cat}${place.unesco ? " · UNESCO World Heritage" : ""}</p>
        <h1 style="font-size:clamp(1.8rem,4vw,3rem)">${UI.esc(place.name)}</h1>
        <p class="tagline">${UI.esc(place.desc)}</p>
        <div class="hero-stat-row" style="margin-top:14px">
          ${place.hours ? `<div class="hero-stat"><small>Hours</small><b>${UI.esc(place.hours)}</b></div>` : ""}
          ${place.price ? `<div class="hero-stat"><small>Entry</small><b>${UI.esc(place.price)}</b></div>` : ""}
          ${place.rating ? `<div class="hero-stat"><small>Rating</small><b>★ ${place.rating}</b></div>` : ""}
          ${place.visit ? `<div class="hero-stat"><small>Visit duration</small><b>${UI.esc(place.visit)}</b></div>` : ""}
          ${place.dist ? `<div class="hero-stat"><small>Distance</small><b>${UI.esc(place.dist)}</b></div>` : ""}
        </div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-gold" data-trip-type="place" data-trip-add="${place.id}">+ Add to my trip</button>
          <a class="btn-ghost" href="#/map">View on map</a>
        </div>
      </div></div>
    </div>
    ${(place.artworks || []).length ? `
    <div class="dash-grid" style="grid-template-columns:1fr">
      <div class="panel">
        <h3>${isMuseum ? "Inside the collection" : "In focus"}</h3>
        <p class="sub">Highlight${place.artworks.length > 1 ? "s" : ""} — tap “Ask AI” to learn more from the assistant</p>
        ${place.artworks.map(a => `
          <div class="news-item" style="align-items:flex-start">
            <img src="${a.img}" alt="${UI.esc(a.name)}" style="width:130px;height:96px">
            <div style="flex:1"><b>${UI.esc(a.name)}</b>
              <span class="n-meta">${UI.esc(a.period)} · ${UI.esc(a.origin)}</span>
              <p>${UI.esc(a.sig)}</p>
              <p style="color:var(--gold-2)">✦ ${UI.esc(a.fact)}</p>
              <button class="sug-chip" style="margin-top:6px" data-askai="Tell me about ${UI.esc(a.name)} at ${UI.esc(place.name)}">✦ Ask AI about this</button>
            </div>
          </div>`).join("")}
      </div>
    </div>` : ""}`;
  },

  /* ══════════ EXPERIENCES ══════════ */
  experiences(root, city) {
    if (!city || !(city.experiences || []).length) {
      root.innerHTML = UI.empty("✦", "No experiences yet", "Choose a full demo city to browse experiences.");
      return;
    }
    const cats = ["All", "Entertainment", "Nature", "Adventure", "Nightlife", "Family"];
    const catImg = { Entertainment: IMG("cat-fun"), Nature: IMG("cat-nature"), Adventure: IMG("cat-adventure"), Nightlife: IMG("cat-night"), Family: IMG("cat-family") };
    root.innerHTML = `<div class="page-head"><h2>Experiences — ${UI.esc(city.name)}</h2>
      <p>From sunrise summits to midnight meyhane. Pick your pace.</p></div>
      <div class="cat-grid" id="catGrid" style="margin-bottom:30px">
        ${cats.slice(1).map(c => `<div class="cat-card" data-cat="${c}"><img src="${catImg[c]}" alt="${c}" loading="lazy"><span>${c}</span></div>`).join("")}
      </div>
      <div class="filter-bar" id="xFilters">
        ${cats.map((c, i) => `<button class="filter-chip ${i === 0 ? "active" : ""}" data-f="${c}">${c}</button>`).join("")}
      </div>
      <div class="card-row" id="xGrid"></div>`;
    const grid = UI.$("#xGrid", root);
    const draw = f => {
      const list = f === "All" ? city.experiences : city.experiences.filter(x => x.cat === f);
      grid.innerHTML = list.map(x => `
        <article class="place-card fade-up">
          ${UI.saveHeart("experience", x)}
          <button class="add-trip-btn" data-trip-type="experience" data-trip-add="${x.id}">+ Trip</button>
          <div class="pc-img"><img src="${x.img}" alt="${UI.esc(x.name)}" loading="lazy"><span class="rating-pill" style="position:absolute;bottom:10px;left:12px">${x.cat}</span></div>
          <div class="pc-body"><h4>${UI.esc(x.name)}</h4>
          <div class="pc-meta">${UI.esc(x.hours)} · ${UI.esc(x.dist)}</div>
          <p style="font-size:.8rem;color:var(--text-dim)">${UI.esc(x.desc)}</p>
          <div class="pc-foot"><span class="rating-pill">${x.rating}</span><span class="price-tag">${UI.esc(x.price)}</span></div></div>
        </article>`).join("") || UI.empty("🔍", "Nothing here yet", "Try another category.");
      UI.observeReveals(grid);
    };
    const setFilter = f => {
      root.querySelectorAll("#xFilters .filter-chip").forEach(x => x.classList.toggle("active", x.dataset.f === f));
      draw(f);
    };
    root.querySelectorAll("#xFilters .filter-chip").forEach(c => c.addEventListener("click", () => setFilter(c.dataset.f)));
    root.querySelectorAll("#catGrid .cat-card").forEach(c => c.addEventListener("click", () => {
      setFilter(c.dataset.cat); UI.$("#xGrid").scrollIntoView({ behavior: "smooth", block: "start" });
    }));
    draw("All");
  },

  /* ══════════ SAFETY DEDICATED ══════════ */
  async safety(root, city) {
    if (!city) { root.innerHTML = UI.empty("🛡", "Select a city", "Choose a destination to view its safety report."); return; }
    root.innerHTML = UI.skeletonCards(2);
    const quakes = await Api.getEarthquakes(city);
    const levels = [
      ["green", "🟢 Normal"], ["yellow", "🟡 Exercise caution"], ["orange", "🟠 High caution"],
      ["red", "🔴 Avoid non-essential travel"], ["black", "⚫ Critical"],
    ];
    root.innerHTML = `<div class="page-head"><h2>Safety & Live Alerts — ${UI.esc(city.name)}</h2>
      <p>An honest picture, not a reassurance. We distinguish official advisories, live disruptions and local incidents.</p></div>
    <div class="dash-grid" style="padding:0;margin:0 auto;width:100%">
      <div class="panel span4 tinted">
        <h3>Travel status</h3>
        <div class="safety-level" style="margin-top:14px">
          <span class="safety-badge ${UI.safetyClass(city.safety.level)}">${city.safety.label}</span>
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;margin-top:10px">
          ${levels.map(([k, l]) => `<div style="font-size:.78rem;opacity:${k === city.safety.level ? 1 : .4};font-weight:${k === city.safety.level ? 600 : 300}">${l}</div>`).join("")}
        </div>
        <div class="divider"></div>
        <p style="font-size:.86rem">${UI.esc(city.safety.advisory)}</p>
        <p class="cost-note">Source: ${UI.esc(city.safety.source)} · Updated ${UI.fmtAgo(city.safety.updated)}</p>
      </div>

      <div class="panel span8">
        <h3>Active alerts</h3>
        <p class="sub">Every alert shows severity, place, time and source</p>
        ${city.safety.alerts.length ? city.safety.alerts.map(a => `
          <div class="alert-item"><span class="alert-sev" style="background:${UI.sevColor(a.sev)}"></span>
            <div style="flex:1"><div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap"><b>${UI.esc(a.title)}</b>
              <span style="font-size:.64rem;letter-spacing:.1em;text-transform:uppercase;color:${UI.sevColor(a.sev)}">${a.sev}</span></div>
            <p>${UI.esc(a.text)}</p>
            <span class="src">📍 ${UI.esc(a.where)} · 🕒 ${UI.fmtDate(a.time)} · Source: ${UI.esc(a.src)}</span></div></div>`).join("")
        : `<div class="unavailable">Live information unavailable — check official sources (foreign ministry travel advice, local civil protection, airport status).</div>`}
        <div class="divider"></div>
        <h3 style="margin-top:6px">Can I travel there right now?</h3>
        <div class="alert-item" style="border:none"><span class="alert-sev" style="background:var(--ok)"></span>
          <div><b>Summary</b><p>${UI.esc(city.transport.summary)}</p>
          ${city.transport.airports.map(a => `<span class="src">✈ ${UI.esc(a.name)} — <b style="color:${a.status === "open" ? "var(--ok)" : "var(--danger)"}">${a.status.toUpperCase()}</b> · ${UI.esc(a.note)}</span>`).join("<br>")}
          <br><span class="src">🚆 ${UI.esc(city.transport.trains)}</span></div></div>
      </div>

      <div class="panel span6">
        <h3>Recent seismic activity (USGS)</h3>
        <p class="sub">${CONFIG.MODE === "live" ? "Live feed · 400 km radius" : "Demo feed — enable live mode for USGS data"}</p>
        ${quakes.map(q => `<div class="alert-item"><span class="alert-sev" style="background:${q.mag >= 4.5 ? "var(--danger)" : q.mag >= 3 ? "var(--warn)" : "var(--ok)"}"></span>
          <div><b>M${q.mag?.toFixed(1)} — ${UI.esc(q.place)}</b><span class="src">🕒 ${UI.fmtAgo(q.time)}${q.demo ? " · demo" : ""}</span></div></div>`).join("")}
      </div>

      <div class="panel span6">
        <h3>Official sources to verify</h3>
        <p class="sub">VOYARA never invents safety data — when in doubt, go to the source</p>
        ${["Your government's foreign-travel advisory website", "Airport official status page & your airline", "National meteorological service", "Local civil protection / emergency management agency", "Embassy of your country at destination"].map(s => `<div class="etiquette-row"><span class="mark ok">✓</span><span>${s}</span></div>`).join("")}
        <p class="cost-note" style="margin-top:10px">Emergency numbers in ${UI.esc(city.name)}: Police <b class="gold">${city.emergency.police}</b> · Ambulance <b class="gold">${city.emergency.ambulance}</b> · Fire <b class="gold">${city.emergency.fire}</b></p>
      </div>
    </div>`;
  },

  /* ══════════ EMERGENCY ══════════ */
  emergency(root, city) {
    if (!city) { root.innerHTML = UI.empty("⛑", "Select a city", "Choose a destination for emergency information."); return; }
    const nums = [["Police", city.emergency.police], ["Ambulance", city.emergency.ambulance], ["Fire", city.emergency.fire], ["General EU-style", city.emergency.general]];
    root.innerHTML = `<div class="page-head"><h2>Emergency & Healthcare — ${UI.esc(city.name)}</h2>
      <p>Save these before you need them. One tap from the bottom bar, always.</p></div>
    <div class="dash-grid" style="padding:0;margin:0 auto;width:100%">
      <div class="panel span4 tinted">
        <h3>Emergency numbers</h3>
        <div class="snapshot" style="grid-template-columns:1fr 1fr;margin-top:12px">
          ${nums.map(([k, v]) => `<div><small>${k}</small><b style="font-size:1.5rem;color:var(--gold-2);font-family:var(--font-display)">${v}</b></div>`).join("")}
        </div>
        <div class="divider"></div>
        <a class="btn-ghost" href="#/assistant">Ask AI for help →</a>
      </div>
      <div class="panel span8">
        <h3>Hospitals, pharmacies & services</h3>
        <p class="sub">Tap “Map” to see it on the city map</p>
        ${(city.hospitals || []).length ? city.hospitals.map(h => `
          <div class="alert-item"><span class="alert-sev" style="background:${h.type.includes("Hospital") ? "var(--danger)" : h.type === "Police" ? "var(--warn)" : "var(--ok)"}"></span>
            <div style="flex:1"><div style="display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap"><b>${UI.esc(h.name)}</b><span class="src">${UI.esc(h.open)}</span></div>
            <p>${UI.esc(h.type)} · ${UI.esc(h.address)}</p>
            <button class="sug-chip" data-flymap="${h.lat},${h.lng}" style="margin-top:4px">◍ Show on map</button></div></div>`).join("")
        : `<div class="unavailable">Facility data unavailable for this city — dial ${city.emergency.general} in an emergency and ask for the nearest hospital.</div>`}
      </div>
    </div>`;
    root.querySelectorAll("[data-flymap]").forEach(b => b.addEventListener("click", () => {
      App.go("map");
      setTimeout(() => Maps.city?.flyTo(b.dataset.flymap.split(",").map(Number), 16), 400);
    }));
  },

  /* ══════════ EVENTS & NEWS ══════════ */
  events(root, city) {
    if (!city) { root.innerHTML = UI.empty("📅", "Select a city", "Choose a destination to see what's on."); return; }
    root.innerHTML = `<div class="page-head"><h2>What's happening in ${UI.esc(city.name)}?</h2>
      <p>Festivals, concerts, exhibitions, holidays and markets — the city's calendar, curated.</p></div>
    <div class="dash-grid" style="padding:0;margin:0 auto;width:100%">
      <div class="panel span6">
        <h3>Upcoming events</h3>
        ${(city.events || []).map(ev => `
          <div class="event-row"><div class="event-date"><b>${ev.day}</b><small>${ev.mon}</small></div>
          <div style="flex:1"><b style="font-weight:500;font-size:.92rem">${UI.esc(ev.title)}</b>
          <div class="pc-meta">📍 ${UI.esc(ev.where)} · ${UI.esc(ev.time)} · ${UI.esc(ev.cat)}</div></div>
          <span class="price-tag" style="font-size:.8rem">${UI.esc(ev.price)}</span></div>`).join("") || `<div class="unavailable">No event data available for this city.</div>`}
      </div>
      <div class="panel span6">
        <h3>Latest news</h3>
        ${(city.news || []).map(n => `
          <div class="news-item"><img src="${n.img}" alt="" loading="lazy">
          <div><span class="n-meta">${UI.esc(n.cat)} · ${UI.esc(n.src)} · ${UI.fmtAgo(n.time)}</span>
          <b>${UI.esc(n.title)}</b><p>${UI.esc(n.sum)}</p></div></div>`).join("") || `<div class="unavailable">News could not be loaded — please try again.</div>`}
      </div>
    </div>`;
  },

  /* ══════════ MAP SIDEBAR ══════════ */
  mapSidebar(root, city) {
    root.innerHTML = `<h3 style="margin:0 0 2px">Explore ${UI.esc(city.name)}</h3>
      <p class="sub" style="margin-bottom:6px">Filter what's on the map</p>
      <div class="map-legend" id="mapLegend"></div>
      <div class="divider" style="margin:12px 0"></div>
      <p class="sub">Nearby essentials</p>
      <div id="mapList" style="display:flex;flex-direction:column;gap:8px"></div>`;
    const legend = UI.$("#mapLegend", root);
    for (const [key, l] of Object.entries(Maps.cityLayers)) {
      const chip = UI.el(`<button class="legend-chip active"><i style="background:${l.color}"></i>${l.label} <span style="opacity:.6">(${l.count})</span></button>`);
      chip.addEventListener("click", () => {
        const on = chip.classList.toggle("active");
        Maps.toggleCityLayer(key, on);
      });
      legend.appendChild(chip);
    }
    const list = UI.$("#mapList", root);
    (city.hospitals || []).slice(0, 3).forEach(h => {
      const b = UI.el(`<button class="legend-chip" style="justify-content:flex-start">⛑ ${UI.esc(h.name)}</button>`);
      b.addEventListener("click", () => Maps.city?.flyTo([h.lat, h.lng], 16));
      list.appendChild(b);
    });
  },
};
