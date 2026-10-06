/* VOYARA · UI helpers — theme, loader, toast, formatting, reveal animations */

const UI = {
  $(sel, root = document) { return root.querySelector(sel); },
  $$(sel, root = document) { return [...root.querySelectorAll(sel)]; },
  el(html) { const t = document.createElement("template"); t.innerHTML = html.trim(); return t.content.firstElementChild; },
  esc(s = "") { return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); },

  fmtDate(iso) {
    try { return new Date(iso).toLocaleString([], { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }); }
    catch { return iso; }
  },
  fmtAgo(iso) {
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 3600) return Math.max(1, Math.round(s / 60)) + " min ago";
    if (s < 86400) return Math.round(s / 3600) + " h ago";
    return Math.round(s / 86400) + " d ago";
  },

  toast(msg) {
    let zone = this.$(".toast-zone");
    if (!zone) { zone = this.el('<div class="toast-zone" aria-live="polite"></div>'); document.body.appendChild(zone); }
    const t = this.el(`<div class="toastx">${this.esc(msg)}</div>`);
    zone.appendChild(t);
    setTimeout(() => { t.style.opacity = "0"; t.style.transition = "opacity .4s"; setTimeout(() => t.remove(), 400); }, 2400);
  },

  loader(show, text) {
    const l = this.$("#loader");
    if (text) l.querySelector(".loader-text").textContent = text;
    l.classList.toggle("done", !show);
  },

  setTheme(t) {
    document.documentElement.dataset.theme = t;
    Store.setTheme(t);
  },

  refreshCounts() {
    const s = Store.saved().length, tr = Store.tripCount();
    this.$("#savedCount").textContent = s;
    this.$("#tripCount").textContent = tr;
  },

  updateCityChip(city) {
    this.$("#cityChipName").textContent = city ? `${city.flag || "◎"} ${city.name}` : "Select a city";
  },

  /* animated score ring */
  scoreRing(score, size = 86) {
    const r = (size - 8) / 2, c = 2 * Math.PI * r;
    return `<div class="score-ring" style="width:${size}px;height:${size}px" role="img" aria-label="Destination score ${score} out of 100">
      <svg width="${size}" height="${size}">
        <circle class="bg" cx="${size / 2}" cy="${size / 2}" r="${r}"/>
        <circle class="fg" cx="${size / 2}" cy="${size / 2}" r="${r}" stroke-dasharray="${c}" stroke-dashoffset="${c}" data-target="${c * (1 - score / 100)}"/>
      </svg><span>${score}</span></div>`;
  },
  animateRings(root = document) {
    requestAnimationFrame(() => this.$$(".score-ring .fg", root).forEach(f => f.style.strokeDashoffset = f.dataset.target));
  },

  /* scroll reveal */
  observeReveals(root = document) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
    }), { threshold: .12 });
    this.$$(".fade-up", root).forEach(el => io.observe(el));
  },

  sevColor(sev) { return { green: "var(--ok)", yellow: "var(--warn)", orange: "#d07f3f", red: "var(--danger)", black: "#b9b3a8" }[sev] || "var(--gold)"; },
  safetyClass(level) { return { green: "sl-green", yellow: "sl-yellow", orange: "sl-orange", red: "sl-red", black: "sl-black" }[level] || "sl-yellow"; },

  saveHeart(type, item) {
    const saved = Store.isSaved(type, item.id);
    return `<button class="save-heart ${saved ? "saved" : ""}" data-save-type="${type}" data-save-id="${item.id}" aria-label="Save ${this.esc(item.name)}" aria-pressed="${saved}">♥</button>`;
  },

  stars(n) { return "★".repeat(n) + "☆".repeat(5 - n); },

  empty(icon, title, sub, cta = "") {
    return `<div class="empty-state"><div class="es-ic">${icon}</div><h3>${title}</h3><p>${sub}</p>${cta}</div>`;
  },

  skeletonCards(n = 4) {
    return Array.from({ length: n }, () => `<div class="skeleton sk-card"></div>`).join("");
  },
};

/* delegated save-heart & add-to-trip clicks */
document.addEventListener("click", e => {
  const heart = e.target.closest("[data-save-type]");
  if (heart) {
    const type = heart.dataset.saveType, id = heart.dataset.saveId;
    const city = App.city;
    const item = App.findItem(type, id);
    if (!item) return;
    const nowSaved = Store.toggleSaved({ type, id, name: item.name, img: item.img, cityId: city?.id });
    document.querySelectorAll(`[data-save-id="${CSS.escape(id)}"]`).forEach(h => {
      h.classList.toggle("saved", nowSaved); h.setAttribute("aria-pressed", nowSaved);
    });
    UI.refreshCounts();
    UI.toast(nowSaved ? `Saved ${item.name} ♥` : `Removed ${item.name}`);
    if (App.route === "saved") App.render();
    return;
  }
  const add = e.target.closest("[data-trip-add]");
  if (add) {
    const city = App.city;
    const item = App.findItem(add.dataset.tripType, add.dataset.tripAdd);
    if (!item || !city) return;
    const r = Store.addToTrip({ type: add.dataset.tripType, id: item.id, name: item.name, img: item.img, hours: item.hours, price: item.price, cityId: city.id });
    if (r.conflict) {
      if (confirm("Your trip is for another city. Start a new trip for " + city.name + "?")) {
        Store.resetTrip(city.id);
        Store.addToTrip({ type: add.dataset.tripType, id: item.id, name: item.name, img: item.img, hours: item.hours, price: item.price, cityId: city.id });
        UI.toast("New trip started — " + item.name + " added");
      }
    } else {
      UI.toast(`Added to Day 1 — ${item.name}`);
      document.querySelectorAll(`[data-trip-add="${CSS.escape(item.id)}"]`).forEach(b => { b.classList.add("added"); b.textContent = "✓ In trip"; });
    }
    UI.refreshCounts();
  }
});
