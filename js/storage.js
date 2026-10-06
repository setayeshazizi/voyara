/* VOYARA · storage layer — LocalStorage persistence (no account needed) */

const Store = {
  get(key, fallback) {
    try { const v = localStorage.getItem("voyara:" + key); return v ? JSON.parse(v) : fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem("voyara:" + key, JSON.stringify(val)); } catch {}
  },

  /* saved places: [{type, id, name, img, cityId, addedAt}] */
  saved() { return this.get("saved", []); },
  isSaved(type, id) { return this.saved().some(s => s.type === type && s.id === id); },
  toggleSaved(item) {
    let list = this.saved();
    const i = list.findIndex(s => s.type === item.type && s.id === item.id);
    if (i >= 0) list.splice(i, 1); else list.push({ ...item, addedAt: Date.now() });
    this.set("saved", list);
    return i < 0; // true if now saved
  },

  /* trip itinerary: { cityId, days: [[item, item…], …] } */
  trip() { return this.get("trip", { cityId: null, days: [[]] }); },
  saveTrip(t) { this.set("trip", t); },
  addToTrip(item) {
    const t = this.trip();
    if (t.cityId && t.cityId !== item.cityId) {
      // different city — confirm reset via return flag
      return { conflict: true };
    }
    t.cityId = item.cityId;
    t.days[0].push({ ...item, addedAt: Date.now() });
    this.saveTrip(t);
    return { added: true, count: t.days.flat().length };
  },
  resetTrip(cityId) {
    this.saveTrip({ cityId, days: [[]] });
    return { added: true, count: 1 };
  },
  tripCount() { const t = this.trip(); return t.days.flat().length; },

  /* preferences */
  theme() { return this.get("theme", "dark"); },
  setTheme(t) { this.set("theme", t); },
  currentCity() { return this.get("city", null); },
  setCurrentCity(id) { this.set("city", id); },
  checklist() { return this.get("checklist", {}); },
  setChecklist(c) { this.set("checklist", c); },
};