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