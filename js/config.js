/* ═══════════════════════════════════════════════════════════════
   VOYARA · Configuration & API keys
   ───────────────────────────────────────────────────────────────
   LIVE API MODE:
     Insert your API keys below and flip `MODE` to "live".
     ⚠ Keys marked [PROXY] should NEVER be used in production
     front-end code — route them through a small backend proxy
     (e.g. /api/weather) so secrets never reach the browser.
     See js/api.js for the service layer that consumes these.

   DEMO MODE:
     With keys left as "YOUR_API_KEY", the app automatically uses
     rich structured mock data (js/data.js). Everything works.
   ═══════════════════════════════════════════════════════════════ */

const CONFIG = {
  /* "demo" (default, no keys needed) or "live" */
  MODE: "demo",

  OPENWEATHER_KEY: "YOUR_API_KEY",        // https://openweathermap.org  (safe in front-end on free tier, but proxy recommended)
  OPENWEATHER_ONECALL: "YOUR_API_KEY",    // One Call 3.0 — hourly/7-day forecast

  MAP_TILES: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", // CARTO dark (no key). Swap for Mapbox styles if desired.

  FRANKFURTER: "https://api.frankfurter.app", // Free FX, no key. e.g. /latest?from=USD&to=EUR

  USGS_EARTHQUAKE: "https://earthquake.usgs.gov/fdsnws/event/1/query", // Free, no key: ?format=geojson&latitude=..&longitude=..&maxradiuskm=300

  OPENTRIPMAP_KEY: "YOUR_API_KEY",        // https://opentripmap.io  [PROXY recommended]

  NEWS_KEY: "YOUR_API_KEY",               // https://newsapi.org  [PROXY REQUIRED — browser calls blocked]
  NEWS_ENDPOINT: "https://newsapi.org/v2/everything",

  OPENAI_KEY: "YOUR_API_KEY",             // https://platform.openai.com  [PROXY REQUIRED — chat + vision]
  OPENAI_CHAT: "https://api.openai.com/v1/chat/completions",

  AMADEUS_KEY: "YOUR_API_KEY",            // https://developers.amadeus.com  [PROXY REQUIRED]
  AVIATIONSTACK_KEY: "YOUR_API_KEY",      // https://aviationstack.com  [PROXY REQUIRED]

  MYMEMORY: "https://api.mymemory.translated.net/get", // Free translation, no key: ?q=..&langpair=en|fa

  NOMINATIM: "https://nominatim.openstreetmap.org",   // Free geocoding — be polite: low volume only.

  /* caching */
  CACHE_TTL: 10 * 60 * 1000, // 10 min
};
