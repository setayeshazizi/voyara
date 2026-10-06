/* ============================================================
   VOYARA — Real-time Translator
   Web Speech APIs (SpeechRecognition / SpeechSynthesis) and a
   free MyMemory translation endpoint with a graceful demo
   fallback. Keys: none required for the base flows.
   ============================================================ */
const Translator = {

  fromLang: "en",
  toLang: "fr",
  history: [],

  root: null, input: null, output: null,

  render(root) {
    this.root = root;
    const fromOpts = LANGUAGES.map(l =>
      `<option value="${l.code}" ${l.code === this.fromLang ? "selected" : ""}>${l.name}</option>`).join("");
    const toOpts = LANGUAGES.map(l =>
      `<option value="${l.code}" ${l.code === this.toLang ? "selected" : ""}>${l.name}</option>`).join("");
    const phraseChips = Object.entries(PHRASES[this.toLang] || PHRASES.en).map(([en]) =>
      `<button type="button" class="sug-chip phrase-chip" data-phrase="${UI.esc(en)}">${UI.esc(en)}</button>`).join("");

    root.innerHTML = `
      <div class="page-head">
        <span class="kicker">Real-time Translator</span>
        <h2 class="display-6">Speak like a local</h2>
        <p class="page-sub">Type or speak a sentence, get an instant translation, then listen to the pronunciation. Conversation mode keeps both sides of the dialogue in view.</p>
      </div>
      <div class="translator-grid">

        <div class="panel translator-panel">
          <div class="translator-bar">
            <label class="t-label" for="trFrom">I speak</label>
            <select id="trFrom" class="form-select">${fromOpts}</select>
            <button type="button" class="btn-ghost" id="trSwap" title="Swap languages" style="padding:.45rem .8rem">⇄</button>
            <label class="t-label" for="trTo">They speak</label>
            <select id="trTo" class="form-select">${toOpts}</select>
          </div>
          <div class="translator-io">
            <textarea id="trInput" rows="4" placeholder="Type what you want to say…"></textarea>
            <div class="t-io-actions">
              <button type="button" class="btn-ghost" id="trMic" ${AI.supported ? "" : "disabled"} title="Speak (uses your microphone)">
                <span class="mic-dot"></span> Speak
              </button>
              <span class="flex-grow-1"></span>
              <button type="button" class="btn-gold" id="trGo">Translate</button>
            </div>
          </div>
          <div class="translator-io">
            <div id="trOutput" class="tr-output">Your translation appears here.</div>
            <div class="t-io-actions">
              <button type="button" class="btn-ghost" id="trListen">🔊 Listen</button>
              <button type="button" class="btn-ghost" id="trCopy">⧉ Copy</button>
              <button type="button" class="btn-ghost" id="trClear">Clear</button>
            </div>
          </div>
          <div class="mt-3">
            <div class="t-label mb-2">Quick phrases</div>
            <div class="d-flex flex-wrap gap-2">${phraseChips}</div>
          </div>
        </div>

        <div class="panel translator-panel">
          <div class="d-flex align-items-center justify-content-between mb-3">
            <div>
              <span class="kicker">Conversation mode</span>
              <h5 class="mb-0 mt-1">Two-way dialogue</h5>
            </div>
            <button type="button" class="btn-ghost" id="trReset">Reset</button>
          </div>
          <div id="convLog" class="conv-log">
            <div class="conv-hint">Translate something to start the conversation. Each turn is labelled with its language.</div>
          </div>
        </div>

      </div>`;

    this.input = root.querySelector("#trInput");
    this.output = root.querySelector("#trOutput");
    const fromSel = root.querySelector("#trFrom");
    const toSel = root.querySelector("#trTo");

    fromSel.addEventListener("change", () => { this.fromLang = fromSel.value; });
    toSel.addEventListener("change", () => { this.toLang = toSel.value; this._refreshPhrases(); });
    root.querySelector("#trSwap").addEventListener("click", () => {
      [this.fromLang, this.toLang] = [this.toLang, this.fromLang];
      fromSel.value = this.fromLang; toSel.value = this.toLang;
      this._refreshPhrases();
      if (this.input.value.trim()) this._translate();
    });
    root.querySelector("#trGo").addEventListener("click", () => this._translate());
    this.input.addEventListener("keydown", e => {
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) this._translate();
    });
    root.querySelector("#trMic").addEventListener("click", () => {
      if (!AI.supported) return UI.toast("Speech recognition is not supported in this browser.");
      AI.listen(text => { this.input.value = text; this._translate(); });
    });
    root.querySelector("#trListen").addEventListener("click", () => {
      const t = this.output.dataset.text;
      if (!t) return UI.toast("Translate something first.");
      AI.speak(t, this.toLang);
    });
    root.querySelector("#trCopy").addEventListener("click", async () => {
      const t = this.output.dataset.text;
      if (!t) return UI.toast("Nothing to copy yet.");
      try { await navigator.clipboard.writeText(t); UI.toast("Copied to clipboard."); }
      catch { UI.toast("Clipboard unavailable in this browser."); }
    });
    root.querySelector("#trClear").addEventListener("click", () => {
      this.input.value = ""; this.output.textContent = "Your translation appears here.";
      delete this.output.dataset.text;
    });
    root.querySelector("#trReset").addEventListener("click", () => {
      this.history = [];
      root.querySelector("#convLog").innerHTML = `<div class="conv-hint">Translate something to start the conversation. Each turn is labelled with its language.</div>`;
    });
    root.addEventListener("click", e => {
      const chip = e.target.closest(".phrase-chip");
      if (chip) { this.input.value = chip.dataset.phrase; this._translate(); }
    });
  },

  _refreshPhrases() {
    const wrap = this.root.querySelector(".d-flex.flex-wrap");
    if (!wrap) return;
    wrap.innerHTML = Object.entries(PHRASES[this.toLang] || PHRASES.en).map(([en]) =>
      `<button type="button" class="sug-chip phrase-chip" data-phrase="${UI.esc(en)}">${UI.esc(en)}</button>`).join("");
  },

  async _translate() {
    const text = this.input.value.trim();
    if (!text) return UI.toast("Type or speak a sentence first.");
    this.output.innerHTML = `<span class="typing"><span></span><span></span><span></span></span>`;
    const res = await Api.translate(text, this.fromLang, this.toLang);
    const translated = typeof res === "string" ? res : (res?.text || String(res));
    this.output.textContent = translated;
    this.output.dataset.text = translated;

    const log = this.root.querySelector("#convLog");
    if (log.querySelector(".conv-hint")) log.innerHTML = "";
    const fromName = (LANGUAGES.find(l => l.code === this.fromLang) || {}).name || this.fromLang;
    const toName = (LANGUAGES.find(l => l.code === this.toLang) || {}).name || this.toLang;
    log.insertAdjacentHTML("beforeend", `
      <div class="conv-turn conv-you">
        <span class="conv-lang">${UI.esc(fromName)}</span>${UI.esc(text)}
      </div>
      <div class="conv-turn conv-them">
        <span class="conv-lang">${UI.esc(toName)}</span>${UI.esc(translated)}
      </div>`);
    log.scrollTop = log.scrollHeight;
  }
};
