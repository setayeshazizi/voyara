/* ═══════════════════════════════════════════════════════════════
   VOYARA · AI module
   - Travel chatbot (text + voice) with a local demo "brain" that
     understands the selected city. Swap in OpenAI via proxy (config).
   - Photo Travel Assistant ("What am I looking at?").
   - Voice mode via Web Speech APIs, with graceful fallbacks.
   ═══════════════════════════════════════════════════════════════ */

const AI = {
  listening: false, recognition: null,

  /* ---------- local demo brain ---------- */
  brain(q, city) {
    const t = q.toLowerCase();
    const c = city;
    const has = (...ws) => ws.some(w => t.includes(w));

    if (!c) return "Select a city first and I'll give you advice that's actually local. Try the world map on the Discover page.";

    if (has("safe", "danger", "crime", "is it ok")) {
      return `In <b>${c.name}</b>: current status is <b>${c.safety.label}</b>. ${c.safety.advisory} Key alerts right now:<ul>${c.safety.alerts.slice(0, 3).map(a => `<li><b>${a.title}</b> — ${a.text}</li>`).join("")}</ul>Check the Safety page for sources and timestamps.`;
    }
    if (has("weather", "rain", "hot", "cold", "temperature", "what to wear", "wear")) {
      return `Current conditions in ${c.name}: about <b>${c.weatherSeed.temp}°C</b>, ${c.weatherSeed.condition}. Best season: <b>${c.bestSeason}</b>. ${has("wear") ? "Pack layers; locals dress " + (c.id === "dubai" ? "modestly but light — shoulders/knees covered in malls." : "smart-casual.") : "See the dashboard for the hourly and 7-day forecast."}`;
    }
    if (has("cost", "budget", "money", "how much", "expensive", "carry")) {
      const b = c.costBase;
      return `Rough daily budget per person in ${c.name}: <b>budget ~$${b.hotel[0] + b.food[0] + b.transport + b.attractions}</b> · <b>comfortable ~$${b.hotel[1] + b.food[1] + b.transport + b.attractions + b.activities}</b> · <b>luxury ~$${b.hotel[2] + b.food[2] + b.transport + b.activities + 100}+</b>. Use the Travel Costs tool for an exact trip estimate in your currency.`;
    }
    if (has("tonight", "today", "plan my day", "where should i go", "itinerary", "suggest", "recommend")) {
      const picks = [...(c.places || []), ...(c.experiences || [])].sort((a, b) => b.rating - a.rating).slice(0, 3);
      const ev = (c.events || [])[0];
      return `Here's a ${has("tonight") ? "night" : "day"} I'd suggest in ${c.name}:<ul>${picks.map(p => `<li><b>${p.name}</b> ★${p.rating} — ${p.desc || ""}</li>`).join("")}</ul>${ev ? `Also on: <b>${ev.title}</b> (${ev.day} ${ev.mon}, ${ev.where}). ` : ""}Tap “+ Trip” on any card to build your itinerary.`;
    }
    if (has("food", "eat", "restaurant", "vegetarian", "vegan", "halal")) {
      const vegNote = has("vegetarian", "vegan") ? ` In ${c.name}, ${c.id === "kyoto" ? "temple shojin-ryori cuisine is fully plant-based — ask for “shojin”." : c.id === "dubai" ? "most restaurants label vegetarian options; Indian restaurants are a safe bet." : "look for restaurants with green V labels and confirm stocks/sauces."}` : "";
      return `Food scene in ${c.name}: don't miss the local specialties. ${(c.goodToKnow || [])[0] || ""}${vegNote} Check the Experiences page for food tours.`;
    }
    if (has("museum", "ticket", "entry", "hours", "opening")) {
      const m = (c.places || []).find(p => p.cat === "museum") || (c.places || [])[0];
      return m ? `<b>${m.name}</b>: ${m.hours}, entry ${m.price}. ${m.visit ? "Allow " + m.visit + "." : ""} ${m.desc} Full details on the History & Culture page.` : "No museum data for this city yet.";
    }
    if (has("hotel", "stay", "sleep", "accommodation")) {
      const h = (c.hotels || [])[1] || (c.hotels || [])[0];
      return h ? `A well-rated pick: <b>${h.name}</b> (${"★".repeat(h.stars)}, ${h.rating}) around ${c.currency} ${h.price}/night in ${h.area}. ${(c.hotels || []).length} stays listed on the Hotels page.` : "No hotel data for this city yet.";
    }
    if (has("translate", "meaning", "say ")) {
      return `Open the Travel Translator (nav bar) — set ${c.language} as the local language and speak or type. It reads the translation aloud too.`;
    }
    if (has("pharmacy", "hospital", "doctor", "emergency", "police", "help")) {
      const h = (c.hospitals || [])[0];
      return `Emergency numbers in ${c.name} — Police <b>${c.emergency.police}</b>, Ambulance <b>${c.emergency.ambulance}</b>, Fire <b>${c.emergency.fire}</b>. ${h ? `Nearest listed hospital: <b>${h.name}</b>, ${h.address} (${h.open}).` : ""} The Emergency page has the full list with map.`;
    }
    if (has("hello", "hi", "hey")) return `Hello! I'm your ${c.name} companion. Ask me about safety, weather, costs, what to do tonight, food, museums — or “plan my day”.`;
    if (has("thank")) return "Anytime. Safe travels. ✦";
    // default: combine a snapshot
    return `Here's ${c.name} in one breath: ${c.weatherSeed.icon} ~${c.weatherSeed.temp}°C · ${c.safety.label.toLowerCase()} · currency ${c.currency} · language ${c.language} · best in ${c.bestSeason}. Ask me about <i>costs</i>, <i>what to do tonight</i>, <i>food</i>, <i>museums</i> or <i>emergency help</i>.`;
  },

  async reply(text, city, history) {
    // try live model first (requires proxy key); fall back to brain
    if (CONFIG.MODE === "live" && Api.hasKey("OPENAI_KEY")) {
      const sys = `You are VOYARA, a premium travel assistant. The user is currently looking at ${city ? city.name + ", " + city.country : "no city"}. Use this city context: ${city ? JSON.stringify({ safety: city.safety.label, advisory: city.safety.advisory, weather: city.weatherSeed, emergency: city.emergency, etiquette: city.etiquette, goodToKnow: city.goodToKnow }) : "none"}. Be concise (max 120 words), warm, practical. Never invent safety facts — say to check official sources when unsure.`;
      const live = await Api.aiChat([{ role: "system", content: sys }, ...history.slice(-8).map(m => ({ role: m.who === "user" ? "user" : "assistant", content: m.text })), { role: "user", content: text }]);
      if (live) return live;
    }
    return this.brain(text, city);
  },

  /* ---------- speech ---------- */
  supported() { return "webkitSpeechRecognition" in window || "SpeechRecognition" in window; },
  speak(text, lang = "en") {
    if (!window.speechSynthesis) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text.replace(/<[^>]+>/g, ""));
    u.lang = lang; u.rate = 1;
    const v = speechSynthesis.getVoices().find(v => v.lang.startsWith(lang));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  },
  listen(onResult, onEnd) {
    if (!this.supported()) { UI.toast("Speech recognition not supported in this browser — try Chrome/Edge."); return false; }
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    this.recognition = new SR();
    this.recognition.lang = "en-US"; this.recognition.interimResults = false;
    this.recognition.onresult = e => onResult(e.results[0][0].transcript);
    this.recognition.onend = () => { this.listening = false; onEnd && onEnd(); };
    this.recognition.onerror = () => { this.listening = false; onEnd && onEnd(); };
    this.recognition.start();
    this.listening = true;
    return true;
  },
  stopListening() { try { this.recognition?.stop(); } catch {} this.listening = false; },
};

/* ══════════ CHAT VIEW ══════════ */
const Chat = {
  history: [],

  render(root) {
    const city = App.city;
    root.innerHTML = `
      <div class="chat-shell">
        <div class="chat-scroll" id="chatScroll" aria-live="polite"></div>
        <div class="chat-suggest" id="chatSuggest">
          ${["Where should I go tonight?", "Is it safe at night?", "How much money should I carry?", "Plan my day", "What should I wear here?"].map(s => `<button class="sug-chip">${s}</button>`).join("")}
        </div>
        <div class="chat-input">
          <button class="voice-btn" id="micBtn" aria-label="Voice input">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/></svg>
          </button>
          <input id="chatText" type="text" placeholder="Ask about ${city ? UI.esc(city.name) : "your destination"}…" aria-label="Message the assistant">
          <button class="btn-gold" id="chatSend" style="padding:12px 20px">Send</button>
        </div>
      </div>`;
    this.scroll = UI.$("#chatScroll", root);
    this.aiSay(`Welcome to VOYARA ✦ ${city ? `You're exploring <b>${UI.esc(city.name)}, ${UI.esc(city.country)}</b>. ` : "Pick a city and I'll get local. "}Ask me anything — or tap a suggestion.`, false);
    const send = () => {
      const inp = UI.$("#chatText", root), v = inp.value.trim();
      if (!v) return; inp.value = ""; this.userSay(v);
    };
    UI.$("#chatSend", root).addEventListener("click", send);
    UI.$("#chatText", root).addEventListener("keydown", e => { if (e.key === "Enter") send(); });
    root.querySelectorAll("#chatSuggest .sug-chip").forEach(b => b.addEventListener("click", () => this.userSay(b.textContent)));
    UI.$("#micBtn", root).addEventListener("click", () => this.toggleVoice(root));
  },

  push(who, html) {
    this.history.push({ who, text: html });
    const m = UI.el(`<div class="msg ${who === "user" ? "user" : "ai"}"><div class="who">${who === "user" ? "You" : "Voyara AI"}</div><div>${html}</div></div>`);
    this.scroll.appendChild(m); this.scroll.scrollTop = this.scroll.scrollHeight;
    return m;
  },
  userSay(text) {
    this.push("user", UI.esc(text));
    const typing = UI.el(`<div class="msg ai"><div class="who">Voyara AI</div><div class="typing"><i></i><i></i><i></i></div></div>`);
    this.scroll.appendChild(typing); this.scroll.scrollTop = this.scroll.scrollHeight;
    setTimeout(async () => {
      const ans = await AI.reply(text, App.city, this.history);
      typing.remove(); this.push("ai", ans);
    }, 500 + Math.random() * 700);
  },
  aiSay(html, speakIt = true) {
    this.push("ai", html);
    if (speakIt) AI.speak(html);
  },

  toggleVoice(root) {
    const btn = UI.$("#micBtn", root);
    if (AI.listening) { AI.stopListening(); btn.classList.remove("listening"); return; }
    const ok = AI.listen(
      transcript => { UI.$("#chatText", root).value = transcript; this.userSay(transcript); },
      () => btn.classList.remove("listening")
    );
    if (ok) {
      btn.classList.add("listening");
      AI.speak("I'm listening.");
    }
  },
};

/* ══════════ PHOTO IDENTIFIER VIEW ══════════ */
const Photo = {
  render(root) {
    root.innerHTML = `
      <div class="page-head"><h2>What am I looking at?</h2>
      <p>Point your camera at a monument, artwork, statue, dish or sign — I'll identify it and tell you its story. Honest confidence, never invented facts.</p></div>
      <div class="photo-drop" id="drop" role="button" tabindex="0" aria-label="Upload a photo">
        <svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M12 16V5m0 0-4 4m4-4 4 4"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>
        <h3 style="margin:0 0 6px">Drop a photo here, or tap to choose</h3>
        <p class="cost-note">JPG / PNG · processed locally in demo mode · <label style="text-decoration:underline;cursor:pointer">browse<input id="fileIn" type="file" accept="image/*" capture="environment" hidden></label></p>
      </div>
      <div class="id-result" id="idOut"></div>`;
    const drop = UI.$("#drop", root), out = UI.$("#idOut", root), input = UI.$("#fileIn", root);
    input.addEventListener("change", () => input.files[0] && this.analyze(input.files[0], out));
    ["dragover", "dragleave", "drop"].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault(); drop.classList.toggle("drag", ev === "dragover");
      if (ev === "drop" && e.dataTransfer.files[0]) this.analyze(e.dataTransfer.files[0], out);
    }));
    drop.addEventListener("click", () => input.click());
    drop.addEventListener("keydown", e => { if (e.key === "Enter") input.click(); });
  },

  async analyze(file, out) {
    const url = URL.createObjectURL(file);
    out.innerHTML = `
      <div class="panel tinted"><div style="display:flex;gap:18px;flex-wrap:wrap">
        <img src="${url}" alt="Your photo" style="width:220px;border-radius:var(--r-md);object-fit:cover">
        <div style="flex:1;min-width:240px">
          <div class="typing" style="padding:0"><i></i><i></i><i></i></div>
          <p class="cost-note" style="margin-top:8px">Analyzing image${Api.hasKey("OPENAI_KEY") && CONFIG.MODE === "live" ? " with live vision model" : " with the demo knowledge base"}…</p>
        </div></div></div>`;
    const r = await Api.identifyPhoto(file, App.city?.name || "");
    const conf = Math.round(r.confidence || 0);
    const unsure = conf < 60;
    out.innerHTML = `
      <div class="panel tinted">
        <div style="display:flex;gap:18px;flex-wrap:wrap">
          <img src="${url}" alt="Your photo" style="width:240px;border-radius:var(--r-md);object-fit:cover">
          <div style="flex:1;min-width:260px">
            <span class="n-meta">${UI.esc(r.kind || "Identification")}${r.location ? " · " + UI.esc(r.location) : ""}</span>
            <h3 style="font-size:1.5rem;margin:4px 0 6px">${unsure ? "This may be… " : ""}${UI.esc(r.name)}</h3>
            <small style="color:var(--text-dim)">Identification confidence</small>
            <div class="conf-bar"><i style="width:${conf}%"></i></div>
            <b style="color:${unsure ? "var(--warn)" : "var(--ok)"};font-size:.85rem">${conf}%${unsure ? " — I'm not certain; treat this as a lead, not a fact." : ""}</b>
            <div class="id-field"><small>What is it?</small><p>${UI.esc(r.history || "")}</p></div>
            <div class="id-field"><small>Why it matters</small><p>${UI.esc(r.meaning || "")}</p></div>
            ${(r.facts || []).length ? `<div class="id-field"><small>Interesting facts</small><p>${r.facts.map(f => "✦ " + UI.esc(f)).join("<br>")}</p></div>` : ""}
            ${(r.related || []).length ? `<div class="id-field" style="border:none"><small>Related places</small><p>${r.related.map(x => `<span class="amenity-chip">${UI.esc(x)}</span>`).join("")}</p></div>` : ""}
            <div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">
              <button class="btn-ghost" id="idSpeak">🔊 Listen</button>
              <button class="btn-gold" data-askai="Tell me more about ${UI.esc(r.name)}">Ask AI more →</button>
            </div>
            ${r.demo ? '<p class="cost-note" style="margin-top:10px">Demo identification — add a vision API key (see js/config.js) for real image understanding.</p>' : ""}
          </div>
        </div>
      </div>`;
    UI.$("#idSpeak", out).addEventListener("click", () => AI.speak(`${r.name}. ${r.history} ${r.meaning}`));
  },
};
