/* ═══════════════════════════════════════════════════════════════
   VOYARA · API service layer
   Each service tries the LIVE endpoint (when CONFIG.MODE === "live"
   and a key is set) and gracefully falls back to demo data.
   Endpoints marked [PROXY] must be proxied through a backend in
   production — never ship those keys to the browser.
   ═══════════════════════════════════════════════════════════════ */

const Api = {
  cache: new Map(),
  hasKey(k) { return CONFIG[k] && CONFIG[k] !== "YOUR_API_KEY"; },
  cached(key, fn) {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.t < CONFIG.CACHE_TTL) return Promise.resolve(hit.v);
    return fn().then(v => { this.cache.set(key, { t: Date.now(), v }); return v; });
  },

  /* ---------- catalogue ---------- */
  getCities() { return [...CITIES, ...CITY_EXTRAS.map(e => this._synthesize(e))]; },
  getCity(id) {
    const c = CITIES.find(c => c.id === id);
    if (c) return c;
    // lightweight extras get a synthesized full record
    const e = CITY_EXTRAS.find(c => c.id === id);
    if (e) return this._synthesize(e);
    throw new Error("City not found");
  },
  nearestCity(lat, lng) {
    const all = [...CITIES, ...CITY_EXTRAS];
    let best = null, bd = 1e9;
    for (const c of all) {
      const d = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },
  _synthesize(e) {
    // generate a plausible full city record for catalogue extras
    return {
      ...e,
      population: "—", plug: "Check locally", emergency: { police: "112", ambulance: "112", fire: "112", general: "112" },
      visa: "Verify requirements with the embassy before booking.",
      score: { safety: 70, weather: 65, cost: 60, attractions: 80, access: 75 },
      bestSeason: "Spring & Autumn",
      monthScores: [2, 3, 3, 4, 3, 2, 1, 2, 3, 3, 3, 2],
      monthLabels: ["Mild", "Mild", "Pleasant", "Ideal", "Pleasant", "Warm", "Hot", "Warm", "Pleasant", "Pleasant", "Mild", "Mild"],
      costBase: { hotel: [60, 140, 400], food: [25, 50, 120], transport: 8, attractions: 18, activities: 35, shopping: 25 },
      weatherSeed: { temp: 22, condition: "Partly Cloudy", icon: "⛅", humidity: 60, wind: 12, vis: 10, sunrise: "06:40", sunset: "18:50" },
      safety: {
        level: "yellow", label: "Exercise Caution",
        advisory: "Demo mode: no live advisory data for this city. Check your government's official travel advisory before booking.",
        source: "Demo mode — live data unavailable, check official sources", updated: new Date().toISOString(),
        alerts: [],
      },
      transport: { airports: [], trains: "Live status unavailable in demo mode.", summary: "Live transport status unavailable — check airport and rail official sites." },
      etiquette: [
        { mark: "care", topic: "Local norms", text: "Demo mode: city-specific etiquette not yet curated for this destination." },
        { mark: "no", topic: "General", text: "Research local laws and customs before arrival; never assume rules from home apply." },
      ],
      goodToKnow: ["Live data for this city is limited to demo mode — verify details locally."],
      places: [], experiences: [], hotels: [], hospitals: [],
      news: [], events: [],
      _lite: true,
    };
  },

  /* ---------- weather ---------- */
  async getWeather(city) {
    // LIVE: OpenWeather One Call — https://openweathermap.org/api/one-call-3
    if (CONFIG.MODE === "live" && this.hasKey("OPENWEATHER_ONECALL")) {
      try {
        const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${city.lat}&lon=${city.lng}&units=metric&exclude=minutely,alerts&appid=${CONFIG.OPENWEATHER_ONECALL}`;
        const r = await this.cached("wx:" + city.id, () => fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }));
        const ic = r.current.weather[0].main;
        return {
          live: true,
          temp: Math.round(r.current.temp), feels: Math.round(r.current.feels_like),
          condition: r.current.weather[0].description.replace(/\b\w/g, c => c.toUpperCase()),
          icon: this._wxIcon(r.current.weather[0].id, r.current.dt, r.sys?.sunset),
          humidity: r.current.humidity, wind: Math.round(r.current.wind_speed * 3.6), vis: (r.current.visibility / 1000).toFixed(0),
          sunrise: new Date(r.current.sunrise * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          sunset: new Date(r.current.sunset * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          hourly: r.hourly.slice(0, 12).map(h => ({ t: new Date(h.dt * 1000).getHours() + ":00", icon: this._wxIcon(h.weather[0].id), temp: Math.round(h.temp) })),
          daily: r.daily.slice(0, 7).map(d => ({ day: new Date(d.dt * 1000).toLocaleDateString([], { weekday: "short" }), icon: this._wxIcon(d.weather[0].id), hi: Math.round(d.temp.max), lo: Math.round(d.temp.min) })),
        };
      } catch { /* fall through to demo */ }
    }
    // DEMO: deterministic variation around the seed
    return this.cached("wxdemo:" + city.id, () => Promise.resolve(this._demoWeather(city)));
  },
  _wxIcon(code, dt, sunset) {
    // OpenWeather condition-code → glyph
    if (code >= 200 && code < 600) return "🌧";
    if (code >= 600 && code < 700) return "❄️";
    if (code >= 700 && code < 800) return "🌫";
    if (code === 800) {
      if (dt && sunset) return dt > sunset ? "🌙" : "☀️";
      return "☀️";
    }
    if (code === 801 || code === 802) return "⛅";
    return "☁️";
  },
  _demoWeather(city) {
    const s = city.weatherSeed;
    const seedN = [...city.id].reduce((a, c) => a + c.charCodeAt(0), 0);
    const jitter = (n, amt) => Math.round((Math.sin(seedN * 31 + n * 7) * .5 + .5) * amt * 2) - amt;
    const conds = ["Clear Sky", "Partly Cloudy", "Sunny", "Light Rain", "Overcast"];
    const icons = ["☀️", "⛅", "☀️", "🌦️", "☁️"];
    const pick = Math.abs(jitter(0, 2)) % conds.length;
    const rainy = /rain/i.test(s.condition) || pick === 3;
    return {
      live: false,
      temp: s.temp + jitter(1, 2), feels: s.temp + jitter(2, 3),
      condition: rainy ? conds[3] : s.condition, icon: rainy ? icons[3] : s.icon,
      humidity: s.humidity, wind: s.wind + jitter(3, 4), vis: s.vis,
      sunrise: s.sunrise, sunset: s.sunset, rainy,
      hourly: Array.from({ length: 12 }, (_, i) => ({
        t: String((8 + i * 2) % 24).padStart(2, "0") + ":00",
        icon: i > 5 && rainy ? "🌧" : s.icon, temp: s.temp + jitter(10 + i, 3),
      })),
      daily: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day, i) => ({
        day, icon: i === 1 && rainy ? "🌧" : (i === 4 ? "⛅" : s.icon),
        hi: s.temp + jitter(20 + i, 3), lo: s.temp - 6 + jitter(30 + i, 2),
      })),
    };
  },

  /* ---------- currency (Frankfurter — free, no key, often live) ---------- */
  async getRates(from = "USD") {
    try {
      const r = await this.cached("fx:" + from, () =>
        fetch(`${CONFIG.FRANKFURTER}/latest?from=${from}`).then(r => { if (!r.ok) throw 0; return r.json(); }));
      return { live: true, base: r.base, rates: r.rates, date: r.date };
    } catch {
      // offline fallback (approx, labelled as demo in UI)
      const approx = { EUR: 0.92, GBP: 0.79, USD: 1, JPY: 149, AED: 3.67, TRY: 34.2, IRR: 42000, AFN: 71, CNY: 7.2, MAD: 10.1 };
      let rates = approx;
      if (from !== "USD") {
        const usdPer = 1 / (approx[from] || 1);
        rates = Object.fromEntries(Object.entries(approx).map(([k, v]) => [k, +(v * usdPer).toFixed(4)]));
        rates[from] = 1;
      }
      return { live: false, base: from, rates, date: "demo" };
    }
  },

  /* ---------- earthquakes (USGS — free, no key) ---------- */
  async getEarthquakes(city) {
    if (CONFIG.MODE === "live") {
      try {
        const url = `${CONFIG.USGS_EARTHQUAKE}?format=geojson&latitude=${city.lat}&longitude=${city.lng}&maxradiuskm=400&orderby=time&limit=5`;
        const r = await this.cached("usgs:" + city.id, () => fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }));
        return r.features.map(f => ({
          mag: f.properties.mag, place: f.properties.place,
          time: new Date(f.properties.time).toISOString(), url: f.properties.url,
        }));
      } catch { /* demo below */ }
    }
    return [
      { mag: 2.1, place: `Minor tremor — 180 km NE of ${city.name}`, time: new Date(Date.now() - 86400000 * 3).toISOString(), demo: true },
    ];
  },

  /* ---------- news ---------- */
  async getNews(city) {
    // LIVE requires a backend proxy (see config). Demo returns curated mock feed.
    if (CONFIG.MODE === "live" && this.hasKey("NEWS_KEY")) {
      try {
        const url = `${CONFIG.NEWS_ENDPOINT}?q=${encodeURIComponent(city.name)}&sortBy=publishedAt&pageSize=8&apiKey=${CONFIG.NEWS_KEY}`;
        const r = await this.cached("news:" + city.id, () => fetch(url).then(r => { if (!r.ok) throw 0; return r.json(); }));
        return (r.articles || []).map(a => ({
          title: a.title, src: a.source?.name, time: a.publishedAt,
          img: a.urlToImage || IMG("news-" + city.id), sum: a.description || "", url: a.url,
        }));
      } catch { /* demo */ }
    }
    return Promise.resolve(city.news || []);
  },

  /* ---------- translation ---------- */
  async translate(text, from, to) {
    if (from === to) return text;
    // offline seed first
    if (from === "en" && PHRASES[to] && PHRASES[to][text]) return PHRASES[to][text];
    // live: MyMemory free API
    try {
      const r = await fetch(`${CONFIG.MYMEMORY}?q=${encodeURIComponent(text)}&langpair=${from}|${to}`);
      const j = await r.json();
      const out = j?.responseData?.translatedText;
      if (out && !/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)) return out;
      throw 0;
    } catch {
      return PHRASES[to]?.[text] || `⚠ Translation unavailable (offline). Try: “${text}” — consider a connectivity check.`;
    }
  },

  /* ---------- hotels (demo) ----------
     LIVE booking APIs (Amadeus, Booking affiliate, etc.) require
     server-side keys; drop into this function behind your proxy. */
  async getHotels(city) {
    return Promise.resolve(city.hotels || []);
  },

  /* ---------- AI chat ----------
     LIVE: proxy OpenAI through your backend. Demo: local knowledge brain. */
  async aiChat(messages) {
    if (CONFIG.MODE === "live" && this.hasKey("OPENAI_KEY")) {
      try {
        const r = await fetch(CONFIG.OPENAI_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${CONFIG.OPENAI_KEY}` },
          body: JSON.stringify({ model: "gpt-4o-mini", messages }),
        });
        const j = await r.json();
        return j.choices[0].message.content;
      } catch { /* demo brain */ }
    }
    return null; // null → caller uses local brain
  },

  /* ---------- photo identification ----------
     LIVE: send the image to a vision model via backend proxy.
     Demo: local keyword knowledge base. */
  async identifyPhoto(file, hint = "") {
    if (CONFIG.MODE === "live" && this.hasKey("OPENAI_KEY")) {
      try {
        const b64 = await new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result.split(",")[1]); fr.readAsDataURL(file); });
        const r = await fetch(CONFIG.OPENAI_CHAT, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${CONFIG.OPENAI_KEY}` },
          body: JSON.stringify({
            model: "gpt-4o-mini", max_tokens: 600,
            messages: [{ role: "user", content: [
              { type: "text", text: "Identify this travel photo (landmark, artwork, food, sign, or object). Reply as JSON: {name,kind,confidence,history,meaning,facts[3],location,related[3]} — concise. If unsure, say so honestly." },
              { type: "image_url", image_url: { url: `data:${file.type};base64,${b64}` } },
            ] }],
          }),
        });
        const j = await r.json();
        return JSON.parse(j.choices[0].message.content);
      } catch { /* demo below */ }
    }
    // DEMO: filename keyword matching against local knowledge
    const hay = (file.name + " " + hint).toLowerCase();
    let best = null, score = 0;
    for (const k of PHOTO_KNOWLEDGE) {
      const s = k.keys.reduce((a, kw) => a + (hay.includes(kw) ? 1 : 0), 0);
      if (s > score) { score = s; best = k; }
    }
    return new Promise(res => setTimeout(() => {
      if (best && score > 0) {
        const conf = Math.min(best.confidence + (score - 1) * 4, 97);
        res({ ...best, confidence: conf, demo: true });
      } else {
        res({ ...PHOTO_FALLBACK, demo: true });
      }
    }, 1400)); // simulated thinking time
  },
};
