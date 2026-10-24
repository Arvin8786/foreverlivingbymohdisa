// =================================================================
// E-Shop Frontend Script - v31.0 (CALMER FESTIVAL THEMES, SHIPPING RULES, VIDEO FIX)
// Features: Festival themes (live backgrounds, graphics, moving animations),
//           robust price parsing, marketing, cart, chatbot
// Preview any theme without waiting for its dates:  yoursite.com/?festival=Christmas
// =================================================================

// ===========================================================
// [ 1.0 ] GLOBAL CONFIGURATION & STATE
// ===========================================================
const googleScriptURL = 'https://script.google.com/macros/s/AKfycbxjIQmAw_C2p3E09mMcj3HeZWgQDVAjR8hOpR88iUBZjQSxoLAEavDjylcIsejGKCgLcw/exec';
const botServerURL = 'https://whatsapp-eshop-bot.onrender.com/eshop-chat';
// SECURITY NOTE: anything in this file is public. Treat this key as non-secret and
// make sure the bot server does not rely on it alone for sensitive actions.
const apiKey = '9582967';

let products = [];
let allJobs = [];
let cart = [];
let chatSession = {};
let shippingRules = []; // [{ minSpend, charge }] from the ShippingRules sheet

const PLACEHOLDER_IMG = 'data:image/svg+xml;utf8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="250" height="250"><rect width="100%" height="100%" fill="#eef2f0"/>' +
    '<text x="50%" y="50%" fill="#7a8a83" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Forever Living</text></svg>'
);

// Escape text before putting it into HTML (stops broken markup and script injection from sheet data)
function esc(v) {
    return String(v === undefined || v === null ? '' : v).replace(/[&<>"']/g, c => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}
// Safe argument for inline handlers, e.g. onclick="addToCart(${jsArg(id)})"
function jsArg(v) {
    return esc(JSON.stringify(String(v === undefined || v === null ? '' : v)));
}

// Safely parse price regardless of sheet casing or string format (e.g., "RM 95.00", "95", 95)
function parseSafePrice(item) {
    if (!item) return 0;
    const raw = item.price ?? item.Price ?? item.retailPrice ?? item.RetailPrice ?? item.rsp ?? 0;
    const cleaned = String(raw).replace(/[^0-9.-]+/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

// ===========================================================
// [ 1.5 ] FESTIVAL ENGINE
// ===========================================================
// Each theme: brand colours, two background palettes (the page slowly cross-fades between them),
// falling or rising graphics, optional fireworks, a "traveller" that crosses the screen
// every ~20-30 seconds, and an optional string of festive lights along the top.
// Strings starting with # are drawn as coloured confetti; everything else is an emoji.
const FESTIVAL_THEMES = {
    // Rule for every theme: only items that genuinely belong to that festival.
    // Strings starting with # are drawn as small coloured confetti; everything else is an emoji.
    Christmas: {
        icon: '🎄', colors: { primary: '#d90429', secondary: '#FFD700', accent: '#004B23' },
        bg: [['#fff3f3', '#effaf2', '#fff9e3'], ['#f0faf3', '#fff0f0', '#fffcec']],
        fall: { glyphs: ['❄️', '❄️', '❄️', '🎄'], count: 12, size: [16, 26], speed: [0.45, 1.0], sway: 16 },
        traveler: { glyph: '🛷', trail: '❄️', duration: 22 }
    },
    HariRaya: {
        icon: '🌙', colors: { primary: '#006400', secondary: '#f0e68c', accent: '#27ae60' },
        bg: [['#f1faf1', '#fbf8e6', '#eaf6ee'], ['#fbf8e6', '#eaf6ee', '#f1faf1']],
        rise: { glyphs: ['🌙', '⭐', '🏮'], count: 10, size: [18, 28], speed: [0.3, 0.7], sway: 14 },
        fireworks: { colors: ['#27ae60', '#f0c419', '#ffd700'], every: [6, 11] },
        traveler: { glyph: '🌙', trail: '⭐', duration: 24 }
    },
    CNY: {
        icon: '🧧', colors: { primary: '#E00000', secondary: '#FFD700', accent: '#C04000' },
        bg: [['#fff1ee', '#fff8e1', '#ffeceb'], ['#fff8e1', '#ffeceb', '#fff1ee']],
        rise: { glyphs: ['🏮', '🧧', '🏮'], count: 10, size: [20, 30], speed: [0.3, 0.7], sway: 14 },
        fall: { glyphs: ['🪙'], count: 5, size: [16, 22], speed: [0.5, 1.0], sway: 12, spin: true },
        fireworks: { colors: ['#ff2a2a', '#ffd700', '#ff8c00'], every: [5, 9] },
        traveler: { glyph: '🐉', trail: '🏮', duration: 20 }
    },
    Thaipusam: {
        icon: '🔱', colors: { primary: '#FF9933', secondary: '#4B0082', accent: '#F0E68C' },
        bg: [['#fff6ea', '#f6efff', '#fffbe8'], ['#f6efff', '#fffbe8', '#fff6ea']],
        rise: { glyphs: ['🪔', '🔱', '🌼'], count: 9, size: [18, 26], speed: [0.3, 0.7], sway: 14 },
        traveler: { glyph: '🪔', trail: '🌼', duration: 24 }
    },
    NationalDay: {
        icon: '🇲🇾', colors: { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        bg: [['#eef0ff', '#fff6dc', '#ffecec'], ['#fff6dc', '#ffecec', '#eef0ff']],
        fall: { glyphs: ['🌺', '⭐'], count: 10, size: [16, 26], speed: [0.5, 1.0], sway: 14, spin: true },
        fireworks: { colors: ['#cc0000', '#ffcc00', '#2a3cff', '#ffffff'], every: [5, 9] },
        traveler: { glyph: '🎈', trail: '⭐', duration: 22 }
    },
    MalaysiaDay: {
        icon: '🇲🇾', colors: { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        bg: [['#eef0ff', '#fff6dc', '#ffecec'], ['#ffecec', '#eef0ff', '#fff6dc']],
        fall: { glyphs: ['🌺', '⭐'], count: 10, size: [16, 26], speed: [0.5, 1.0], sway: 14, spin: true },
        fireworks: { colors: ['#cc0000', '#ffcc00', '#2a3cff', '#ffffff'], every: [5, 9] },
        traveler: { glyph: '🎈', trail: '🌺', duration: 22 }
    },
    MooncakeFestival: {
        icon: '🥮', colors: { primary: '#C04000', secondary: '#FFD700', accent: '#E00000' },
        bg: [['#fff3e8', '#fff9e1', '#fdeee6'], ['#eef0ff', '#fff9e1', '#fff3e8']],
        rise: { glyphs: ['🏮', '🥮', '🌕'], count: 10, size: [20, 30], speed: [0.3, 0.7], sway: 14 },
        traveler: { glyph: '🐇', trail: '🥮', duration: 24 }
    },
    Deepavali: {
        icon: '🪔', colors: { primary: '#FF8C00', secondary: '#FF00FF', accent: '#FFD700' },
        bg: [['#fff5e6', '#fdeeff', '#fffbe0'], ['#fdeeff', '#fffbe0', '#fff5e6']],
        rise: { glyphs: ['🪔'], count: 10, size: [20, 30], speed: [0.3, 0.75], sway: 14 },
        fireworks: { colors: ['#ff8c00', '#ff2db4', '#ffd700'], every: [5, 9] },
        traveler: { glyph: '🪔', trail: '🪔', duration: 22 }
    },
    NewYear: {
        icon: '🎉', colors: { primary: '#111111', secondary: '#FFD700', accent: '#C0C0C0' },
        bg: [['#f6f6f8', '#fff9e0', '#eeeef2'], ['#fff9e0', '#eeeef2', '#f6f6f8']],
        fall: { glyphs: ['🥂', '🎉'], count: 10, size: [16, 26], speed: [0.5, 1.0], sway: 14, spin: true },
        fireworks: { colors: ['#ffd700', '#ffffff', '#ff5e5e', '#5ec8ff'], every: [4, 8] },
        traveler: { glyph: '🥂', trail: '🎉', duration: 20 }
    },
    Valentines: {
        icon: '💖', colors: { primary: '#D70040', secondary: '#FFC0CB', accent: '#C71585' },
        bg: [['#fff0f4', '#fff5f8', '#ffeaf3'], ['#ffeaf3', '#fff0f4', '#fff5f8']],
        rise: { glyphs: ['💖', '🌹', '💕'], count: 10, size: [18, 28], speed: [0.35, 0.8], sway: 14 },
        traveler: { glyph: '💘', trail: '💕', duration: 22 }
    },
    GrandOpening: {
        icon: '🎊', colors: { primary: '#1a5276', secondary: '#f39c12', accent: '#27ae60' },
        bg: [['#eaf3fa', '#fff5e3', '#eaf8ef'], ['#fff5e3', '#eaf8ef', '#eaf3fa']],
        fall: { glyphs: ['🎈', '🎉'], count: 9, size: [18, 26], speed: [0.5, 1.0], sway: 14, spin: true },
        traveler: { glyph: '🎈', trail: '🎉', duration: 22 }
    },
    Vesak: {
        icon: '🪷', colors: { primary: '#b8860b', secondary: '#fff3b0', accent: '#8e44ad' },
        bg: [['#fffbe8', '#f6efff', '#fff6e0'], ['#f6efff', '#fff6e0', '#fffbe8']],
        rise: { glyphs: ['🪷', '🏮'], count: 9, size: [18, 28], speed: [0.25, 0.6], sway: 12 },
        traveler: { glyph: '🕊️', trail: '🪷', duration: 26 }
    },
    // Unrecognised festival: keeps the site's own colours and adds only the soft background and string lights.
    Default: {
        icon: '🎉', colors: null,
        bg: [['#fbfbfd', '#f3f8f5', '#fffaf0'], ['#f3f8f5', '#fffaf0', '#fbfbfd']]
    }
};

// Works out which theme to use from the sheet row (ThemeName column if present,
// otherwise the Festival ID / Event name, e.g. "DEEPAVALI2026" or "Deepavali (Major)").
// Order matters: CNY is tested before NewYear, MalaysiaDay before NationalDay.
const FESTIVAL_MATCHERS = [
    ['Christmas', /christmas|xmas/],
    ['Deepavali', /deepavali|diwali/],
    ['CNY', /cny|chinesenewyear|lunarnewyear|springfestival/],
    ['HariRaya', /hariraya|aidil|eidul|eidfitr|ramadan|raya/],
    ['Thaipusam', /thaipusam/],
    ['MooncakeFestival', /mooncake|midautumn/],
    ['MalaysiaDay', /malaysiaday/],
    ['NationalDay', /merdeka|nationalday|kemerdekaan/],
    ['Valentines', /valentine/],
    ['GrandOpening', /grandopening/],
    ['Vesak', /vesak|wesak/],
    ['NewYear', /newyear/]
];

// Scene data per theme: people/characters that stroll along the bottom of the screen, props that stand along
// the ground, the ornament hung on product cards, and the colours the string lights cycle through.
// Only single-character emoji are used so they look the same on every phone and computer.
const FESTIVAL_SCENES = {
    Christmas: {
        walkers: ['🎅', '🤶', '🧒', '👧', '⛄', '🦌'],
        props: ['🎄', '⛄', '🎁', '🎄', '🔔'],
        orn: ['🎄', '🎁', '⭐', '🔔'], ribbon: 'Christmas Special',
        ground: 'rgba(255,255,255,.7)', lights: ['#ff3b3b', '#ffd700', '#2ecc71', '#ffffff', '#4da6ff']
    },
    HariRaya: {
        walkers: ['🧕', '🧒', '👧', '👦', '🧑'],
        props: ['🕌', '🌙', '🏮', '🕌', '⭐'],
        orn: ['🌙', '⭐', '🏮', '🕌'], ribbon: 'Raya Special',
        ground: 'rgba(39,174,96,.25)', lights: ['#27ae60', '#f1c40f', '#ffffff', '#1abc9c', '#f39c12']
    },
    CNY: {
        walkers: ['🦁', '🐉', '🧒', '👧', '👦'],
        props: ['🏮', '🧧', '🏮', '🍊', '🏮'],
        orn: ['🧧', '🏮', '🍊', '🪙'], ribbon: 'CNY Special',
        ground: 'rgba(224,0,0,.22)', lights: ['#ff2a2a', '#ffd700', '#ff8c00', '#ff2a2a', '#ffb300']
    },
    Thaipusam: {
        walkers: ['🧑', '👧', '🧒', '🙏'],
        props: ['🔱', '🪔', '🌼', '🪔', '🌺'],
        orn: ['🪔', '🌼', '🔱'], ribbon: 'Thaipusam',
        ground: 'rgba(255,153,51,.25)', lights: ['#ff9933', '#8e44ad', '#ffd700', '#e67e22']
    },
    NationalDay: {
        walkers: ['🧒', '👧', '👦', '🚴', '🏃'],
        props: ['🌺', '⭐', '🎈', '🌺', '⭐'],
        orn: ['🌺', '⭐', '🎈'], ribbon: 'Merdeka Special',
        ground: 'rgba(0,0,102,.18)', lights: ['#e02424', '#ffd700', '#2a3cff', '#ffffff', '#e02424']
    },
    MalaysiaDay: {
        walkers: ['🧒', '👧', '👦', '🚴', '🏃'],
        props: ['🌺', '⭐', '🎈', '🌺', '⭐'],
        orn: ['🌺', '⭐', '🎈'], ribbon: 'Malaysia Day',
        ground: 'rgba(0,0,102,.18)', lights: ['#e02424', '#ffd700', '#2a3cff', '#ffffff']
    },
    MooncakeFestival: {
        walkers: ['🧒', '👧', '🐇', '👦'],
        props: ['🏮', '🥮', '🌕', '🏮', '🥮'],
        orn: ['🥮', '🌕', '🏮'], ribbon: 'Mid-Autumn',
        ground: 'rgba(192,64,0,.22)', lights: ['#ffb300', '#ff7043', '#ffd700', '#ff8f00', '#ffe082']
    },
    Deepavali: {
        walkers: ['💃', '🕺', '🧒', '👧', '👦'],
        props: ['🪔', '🪔', '🪔', '🪔', '🪔'],
        orn: ['🪔'], ribbon: 'Deepavali Special',
        ground: 'rgba(255,140,0,.25)', lights: ['#ff8c00', '#ff2db4', '#ffd700', '#ff5722', '#a855f7']
    },
    NewYear: {
        walkers: ['🥳', '💃', '🕺', '🧒'],
        props: ['🥂', '🎉', '🍾', '🥂', '🎉'],
        orn: ['🎉', '🥂', '🍾'], ribbon: 'New Year',
        ground: 'rgba(255,215,0,.22)', lights: ['#ffd700', '#c0c0c0', '#ff5e5e', '#5ec8ff', '#b388ff']
    },
    Valentines: {
        walkers: ['💃', '🕺', '🌹'],
        props: ['🌹', '💖', '💌', '🌹', '💕'],
        orn: ['💖', '🌹', '💌'], ribbon: "Valentine's",
        ground: 'rgba(215,0,64,.18)', lights: ['#ff2d6f', '#ff8fb1', '#d70040', '#ffc0cb']
    },
    GrandOpening: {
        walkers: ['🥳', '💃', '🕺', '👏'],
        props: ['🎊', '🎈', '🎉', '🎈', '🎊'],
        orn: ['🎊', '🎈', '🎉'], ribbon: 'Grand Opening',
        ground: 'rgba(243,156,18,.22)', lights: ['#1a8cd8', '#f39c12', '#27ae60', '#e74c3c', '#9b59b6']
    },
    Vesak: {
        walkers: ['🧘', '🙏', '🧒', '👧'],
        props: ['🪷', '🏮', '🪷', '🕊️', '🪷'],
        orn: ['🪷', '🏮'], ribbon: 'Vesak Day',
        ground: 'rgba(184,134,11,.2)', lights: ['#ffd54f', '#ffb300', '#ce93d8', '#fff59d']
    },
    // Unrecognised festival: lights only, no characters
    Default: {
        walkers: [], props: [],
        orn: ['⭐'], ribbon: 'Special Offer',
        ground: 'rgba(0,0,0,.08)', lights: ['#f39c12', '#27ae60', '#e74c3c', '#3498db']
    }
};

const FestivalFX = (() => {
    const STORE_KEY = 'fl_fx_enabled';
    const S = {
        key: null, cfg: null, scene: null, info: null, enabled: true, running: false,
        canvas: null, ctx: null, w: 0, h: 0, dpr: 1, t: 0, last: 0, raf: 0,
        particles: [], rockets: [], sparks: [], glows: [], stars: [], sprites: new Map(), nextFirework: 2,
        travelerEl: null, garlandEl: null, paradeEl: null, toggleEl: null,
        travelTimer: 0, paletteTimer: 0, paletteIdx: 0, resizeTimer: 0, bound: false
    };

    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = arr => arr[Math.floor(Math.random() * arr.length)];
    const norm = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const storeGet = () => { try { return localStorage.getItem(STORE_KEY); } catch (e) { return null; } };
    const storeSet = v => { try { localStorage.setItem(STORE_KEY, v); } catch (e) { /* private mode */ } };

    function resolveKey(info) {
        if (!info) return null;
        const explicit = String(info.ThemeName || '').trim();
        if (FESTIVAL_THEMES[explicit]) return explicit;
        const hay = norm([info.ThemeName, info.FestivalID, info.EventName].join(' '));
        for (const [key, rx] of FESTIVAL_MATCHERS) if (rx.test(hay)) return key;
        return 'Default';
    }

    function cleanTitle(info) {
        const raw = info.EventName || info.FestivalID || '';
        return String(raw).replace(/\s*\((major|minor)\)\s*/ig, '').trim();
    }

    // ---------- styles ----------
    function injectStyles() {
        if (document.getElementById('fl-fx-style')) return;
        const css = `
@property --fl-c1 { syntax: '<color>'; inherits: true; initial-value: #ffffff; }
@property --fl-c2 { syntax: '<color>'; inherits: true; initial-value: #ffffff; }
@property --fl-c3 { syntax: '<color>'; inherits: true; initial-value: #ffffff; }
body.fl-on {
    background-color: var(--fl-c1) !important;
    background-image: linear-gradient(120deg, var(--fl-c1), var(--fl-c2), var(--fl-c3), var(--fl-c1)) !important;
    background-size: 300% 300% !important;
    background-attachment: fixed !important;
    animation: flBgDrift 32s ease-in-out infinite;
    transition: --fl-c1 3s ease, --fl-c2 3s ease, --fl-c3 3s ease;
    padding-bottom: 64px;
}
@keyframes flBgDrift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }

#fl-fx-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 55; pointer-events: none; display: none; }

/* colour-changing string lights */
#fl-garland { position: fixed; top: 0; left: 0; right: 0; height: 46px; z-index: 58; pointer-events: none; overflow: hidden; display: none; }
#fl-garland svg { position: absolute; top: 0; left: 0; }
#fl-garland b { position: absolute; width: 10px; height: 15px; border-radius: 50% 50% 50% 50% / 62% 62% 38% 38%;
    background: var(--b1); box-shadow: 0 0 12px 3px var(--b1);
    animation: flBulb 4.2s linear infinite, flPulse 1.7s ease-in-out infinite alternate; }
#fl-garland b::before { content: ''; position: absolute; left: 2px; top: -4px; width: 6px; height: 5px; background: #3b3b3b; border-radius: 1px; }
@keyframes flBulb {
    0%, 100% { background: var(--b1); box-shadow: 0 0 12px 3px var(--b1); }
    33% { background: var(--b2); box-shadow: 0 0 12px 3px var(--b2); }
    66% { background: var(--b3); box-shadow: 0 0 12px 3px var(--b3); }
}
@keyframes flPulse { from { opacity: .55; transform: scale(.92); } to { opacity: 1; transform: scale(1.04); } }

/* bottom parade: stays fixed to the bottom of the screen while the page scrolls */
#fl-parade { position: fixed; left: 0; right: 0; bottom: 0; height: 84px; z-index: 54; pointer-events: none; overflow: hidden; display: none; }
#fl-parade::before { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 38px; background: linear-gradient(to top, var(--fl-ground, rgba(0,0,0,.15)), transparent); }
.fl-prop { position: absolute; bottom: 0; font-size: var(--s, 40px); line-height: 1; transform-origin: 50% 100%;
    animation: flSway 4.5s ease-in-out infinite alternate; filter: drop-shadow(0 4px 4px rgba(0,0,0,.2)); }
@keyframes flSway { from { transform: rotate(-3deg); } to { transform: rotate(3deg); } }
.fl-walker { position: absolute; left: 0; bottom: var(--y, 4px); font-size: var(--s, 34px); line-height: 1;
    animation: flMarch var(--d, 60s) linear infinite; animation-delay: var(--dl, 0s); will-change: transform; }
.fl-walker.rev { animation-direction: reverse; }
.fl-flip, .fl-hop { display: block; }
.fl-walker.rev .fl-flip { transform: scaleX(-1); }
.fl-hop { animation: flHop .7s ease-in-out infinite alternate; filter: drop-shadow(0 3px 3px rgba(0,0,0,.25)); }
@keyframes flMarch { from { transform: translateX(-120px); } to { transform: translateX(calc(100vw + 120px)); } }
@keyframes flHop { from { transform: translateY(0) rotate(-5deg); } to { transform: translateY(-10px) rotate(5deg); } }

.fl-traveler { position: fixed; left: 0; top: 30vh; z-index: 60; pointer-events: none; opacity: 0; will-change: transform;
    font-size: clamp(28px, 3.2vw, 42px); white-space: nowrap; filter: drop-shadow(0 4px 6px rgba(0,0,0,.25)); }
.fl-traveler.go { animation: flFly var(--fl-dur, 20s) linear forwards; }
.fl-traveler.go.rtl { animation-name: flFlyRtl; }
.fl-tv-inner { display: flex; align-items: center; gap: 4px; animation: flBob 2.4s ease-in-out infinite; }
.fl-traveler.rtl .fl-tv-inner { transform: scaleX(-1); }
.fl-tv-t { font-size: .45em; }
.fl-tv-t:nth-child(1) { opacity: .25; } .fl-tv-t:nth-child(2) { opacity: .5; } .fl-tv-t:nth-child(3) { opacity: .8; }
@keyframes flFly { from { transform: translateX(-30vw); opacity: 1; } to { transform: translateX(115vw); opacity: 1; } }
@keyframes flFlyRtl { from { transform: translateX(115vw); opacity: 1; } to { transform: translateX(-30vw); opacity: 1; } }
@keyframes flBob { 0%, 100% { translate: 0 0; rotate: -3deg; } 50% { translate: 0 -16px; rotate: 3deg; } }

#fl-fx-toggle { position: fixed; left: 16px; bottom: 92px; z-index: 70; width: 44px; height: 44px; border-radius: 50%;
    border: 2px solid rgba(255,255,255,.9); background: var(--primary-color, #113626); color: #fff; font-size: 20px; line-height: 1;
    cursor: pointer; box-shadow: 0 6px 16px rgba(0,0,0,.25); transition: transform .2s, opacity .2s; }
#fl-fx-toggle:hover { transform: scale(1.08); }
#fl-fx-toggle.off { opacity: .6; filter: grayscale(1); }

.fl-greeting { margin: 22px auto 0; max-width: 760px; padding: 16px 22px; border-radius: 16px; text-align: center;
    background: rgba(255,255,255,.92); color: #1f2937; border: 2px solid var(--secondary-color, #FFD700);
    box-shadow: 0 10px 30px rgba(0,0,0,.15); animation: flGreetIn .9s cubic-bezier(.2,.8,.2,1) both; }
.fl-greeting .fl-pill { display: inline-block; padding: 5px 16px; border-radius: 999px; font-weight: 700; letter-spacing: .4px;
    background: var(--primary-color, #113626); color: #fff; font-size: .95rem; }
.fl-greeting p { margin: 12px 0 6px; line-height: 1.55; font-size: 1rem; }
.fl-greeting small { display: block; color: #64748b; font-size: .8rem; }
@keyframes flGreetIn { from { opacity: 0; transform: translateY(18px) scale(.97); } to { opacity: 1; transform: none; } }

/* product-card decorations (only visible while effects are on) */
.fl-orn, .fl-pill-sm { display: none; }
body.fl-on .fl-orn { display: block; position: absolute; top: 0; right: 12px; z-index: 4; transform-origin: 50% 0;
    animation: flSwing 3.4s ease-in-out infinite alternate; pointer-events: none; }
.fl-orn i { display: block; width: 2px; height: 16px; background: rgba(0,0,0,.35); margin: 0 auto; }
.fl-orn b { display: block; font-size: 24px; line-height: 1; margin-top: -2px; font-weight: 400; filter: drop-shadow(0 3px 3px rgba(0,0,0,.25)); }
@keyframes flSwing { from { transform: rotate(-9deg); } to { transform: rotate(9deg); } }
body.fl-on .fl-pill-sm { display: inline-block; align-self: flex-start; margin: 0; padding: 2px 9px; border-radius: 999px; font-size: .68rem; font-weight: 700;
    letter-spacing: .3px; color: #fff; background: linear-gradient(90deg, var(--primary-color, #113626), var(--accent-color, #27ae60));
    box-shadow: 0 2px 6px rgba(0,0,0,.18); }
body.fl-on .product-list .product { box-shadow: 0 0 0 1px var(--secondary-color, #ffd700), 0 6px 18px rgba(0,0,0,.1); }
body.fl-on .product-list .product:hover { box-shadow: 0 0 0 2px var(--secondary-color, #ffd700), 0 16px 32px rgba(0,0,0,.2); }
body.fl-on .product-image-container::after { content: ''; position: absolute; inset: 0; pointer-events: none;
    background: linear-gradient(115deg, transparent 40%, rgba(255,255,255,.6) 50%, transparent 60%); transform: translateX(-130%); transition: transform .9s ease; }
body.fl-on .product-list .product:hover .product-image-container::after { transform: translateX(130%); }
body.fl-on .pd-card { box-shadow: 0 0 0 2px var(--secondary-color, #ffd700), 0 14px 38px rgba(0,0,0,.14); }

@media (max-width: 600px) {
    .fl-greeting { margin: 16px 12px 0; padding: 14px 16px; } .fl-greeting p { font-size: .92rem; }
    #fl-fx-toggle { bottom: 88px; left: 10px; width: 40px; height: 40px; }
}
@media (prefers-reduced-motion: reduce) {
    body.fl-on { animation: none; }
    #fl-garland b, .fl-tv-inner, .fl-greeting, .fl-prop, .fl-hop, .fl-orn { animation: none; }
}`;
        const el = document.createElement('style');
        el.id = 'fl-fx-style';
        el.textContent = css;
        document.head.appendChild(el);
    }

    function ensureDom() {
        if (!S.canvas) {
            S.canvas = document.createElement('canvas');
            S.canvas.id = 'fl-fx-canvas';
            S.canvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(S.canvas);
            S.ctx = S.canvas.getContext('2d');
        }
        if (!S.paradeEl) {
            S.paradeEl = document.createElement('div');
            S.paradeEl.id = 'fl-parade';
            S.paradeEl.setAttribute('aria-hidden', 'true');
            document.body.appendChild(S.paradeEl);
        }
        if (!S.travelerEl) {
            S.travelerEl = document.createElement('div');
            S.travelerEl.className = 'fl-traveler';
            S.travelerEl.setAttribute('aria-hidden', 'true');
            S.travelerEl.addEventListener('animationend', e => {
                if (e.target !== S.travelerEl) return;
                S.travelerEl.classList.remove('go');
                scheduleTraveler(false);
            });
            document.body.appendChild(S.travelerEl);
        }
        if (!S.garlandEl) {
            S.garlandEl = document.createElement('div');
            S.garlandEl.id = 'fl-garland';
            S.garlandEl.setAttribute('aria-hidden', 'true');
            document.body.appendChild(S.garlandEl);
        }
        if (!S.toggleEl) {
            S.toggleEl = document.createElement('button');
            S.toggleEl.id = 'fl-fx-toggle';
            S.toggleEl.type = 'button';
            S.toggleEl.textContent = '🎊';
            S.toggleEl.addEventListener('click', () => {
                S.enabled = !S.enabled;
                storeSet(S.enabled ? '1' : '0');
                syncToggle();
                S.enabled ? start() : stop();
            });
            document.body.appendChild(S.toggleEl);
        }
        if (!S.bound) {
            S.bound = true;
            window.addEventListener('resize', () => {
                clearTimeout(S.resizeTimer);
                S.resizeTimer = setTimeout(() => { if (S.running) { resize(); seed(); buildGarland(); buildParade(); } }, 200);
            });
            document.addEventListener('visibilitychange', () => {
                if (!S.running) return;
                if (document.hidden) { cancelAnimationFrame(S.raf); }
                else { S.last = performance.now(); S.raf = requestAnimationFrame(frame); }
            });
        }
    }

    function syncToggle() {
        if (!S.toggleEl) return;
        S.toggleEl.classList.toggle('off', !S.enabled);
        S.toggleEl.setAttribute('aria-pressed', String(S.enabled));
        S.toggleEl.title = S.enabled ? 'Turn festive effects off' : 'Turn festive effects on';
        S.toggleEl.setAttribute('aria-label', S.toggleEl.title);
    }

    // ---------- canvas helpers ----------
    function resize() {
        S.dpr = Math.min(window.devicePixelRatio || 1, 2);
        S.w = window.innerWidth;
        S.h = window.innerHeight;
        S.canvas.width = Math.round(S.w * S.dpr);
        S.canvas.height = Math.round(S.h * S.dpr);
        S.sprites.clear();
    }

    // Sprite kinds: '#rrggbb' = confetti, '*#rrggbb' = 4-point twinkle star, '@#rrggbb' = soft glow, anything else = emoji
    function sprite(glyph, size) {
        const key = glyph + '|' + size;
        let s = S.sprites.get(key);
        if (s) return s;
        const d = Math.ceil(size * 1.5) + 8;
        const c = document.createElement('canvas');
        c.width = c.height = Math.round(d * S.dpr);
        const x = c.getContext('2d');
        x.scale(S.dpr, S.dpr);
        const kind = glyph.charAt(0);
        if (kind === '#') {
            x.fillStyle = glyph;
            x.fillRect(d / 2 - size * 0.25, d / 2 - size * 0.12, size * 0.5, size * 0.24);
        } else if (kind === '*') {
            x.fillStyle = glyph.slice(1);
            x.shadowColor = glyph.slice(1);
            x.shadowBlur = size * 0.35;
            x.beginPath();
            for (let i = 0; i < 8; i++) {
                const r = i % 2 ? size * 0.1 : size * 0.5;
                const a = (Math.PI / 4) * i - Math.PI / 2;
                x[i ? 'lineTo' : 'moveTo'](d / 2 + Math.cos(a) * r, d / 2 + Math.sin(a) * r);
            }
            x.closePath();
            x.fill();
        } else if (kind === '@') {
            const col = glyph.slice(1);
            const g = x.createRadialGradient(d / 2, d / 2, 0, d / 2, d / 2, d / 2);
            g.addColorStop(0, col + 'ff');
            g.addColorStop(1, col + '00');
            x.fillStyle = g;
            x.fillRect(0, 0, d, d);
        } else {
            x.font = size + 'px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
            x.textAlign = 'center';
            x.textBaseline = 'middle';
            x.fillText(glyph, d / 2, d / 2);
        }
        s = { c: c, d: d };
        S.sprites.set(key, s);
        return s;
    }

    // Particles live in a narrow strip down each side of the screen so they never sit on top of text or products
    function edgeX() {
        const band = Math.max(40, Math.min(S.w * 0.12, S.w < 700 ? 40 : 150));
        return Math.random() < 0.5 ? rand(10, band) : rand(S.w - band, S.w - 10);
    }

    function spawn(initial) {
        const cfg = S.cfg;
        const useRise = !!cfg.rise && (!cfg.fall || Math.random() < 0.6);
        const spec = useRise ? cfg.rise : cfg.fall;
        if (!spec) return;
        const glyph = pick(spec.glyphs);
        const size = Math.max(10, Math.round(rand(spec.size[0], spec.size[1]) / 4) * 4);
        const spr = sprite(glyph, size);
        const bx = edgeX();
        S.particles.push({
            spr: spr, rise: useRise, spin: !!spec.spin,
            bx: bx, x: bx,
            y: initial ? rand(0, S.h) : (useRise ? S.h + size : -size * 1.5),
            vy: rand(spec.speed[0], spec.speed[1]) * 60 * (useRise ? -1 : 1),
            amp: rand(0.4, 1) * (spec.sway || 24),
            phase: rand(0, 6.28), freq: rand(0.4, 1.1),
            rot: rand(0, 6.28), vr: spec.spin ? rand(-2.2, 2.2) : 0,
            alpha: rand(0.55, 0.85)
        });
    }

    function seed() {
        S.particles = []; S.rockets = []; S.sparks = []; S.glows = []; S.stars = [];
        const cfg = S.cfg;
        let base = 0;
        if (cfg.fall) base += cfg.fall.count;
        if (cfg.rise) base += cfg.rise.count;
        const area = (S.w * S.h) / (1366 * 768);
        const mobile = S.w < 700 ? 0.6 : 1;
        const n = Math.max(6, Math.round(base * Math.min(area, 1.2) * mobile));
        for (let i = 0; i < n; i++) spawn(true);

    }

    function launchRocket() {
        const colors = S.cfg.fireworks.colors;
        S.rockets.push({ x: edgeX(), y: S.h + 10, ty: rand(0.15, 0.45) * S.h, vy: -rand(420, 560), color: pick(colors) });
    }

    function explode(x, y, color) {
        if (S.sparks.length > 500) return;
        const colors = S.cfg.fireworks.colors;
        const n = 46;
        for (let i = 0; i < n; i++) {
            const a = (Math.PI * 2 * i) / n + rand(-0.08, 0.08);
            const sp = rand(70, 220);
            S.sparks.push({
                x: x, y: y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
                life: 1, decay: rand(0.55, 0.95), color: Math.random() < 0.25 ? pick(colors) : color
            });
        }
    }

    function frame(ts) {
        if (!S.running) return;
        S.raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, (ts - S.last) / 1000 || 0.016);
        S.last = ts;
        S.t += dt;
        const ctx = S.ctx, dpr = S.dpr;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, S.canvas.width, S.canvas.height);

        // drifting colour glows
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        for (const g of S.glows) {
            g.x += g.vx * dt; g.y += g.vy * dt;
            const half = g.sz / 2;
            if (g.x < -half) g.x = S.w + half; else if (g.x > S.w + half) g.x = -half;
            if (g.y < -half) g.y = S.h + half; else if (g.y > S.h + half) g.y = -half;
            ctx.globalAlpha = g.a * (0.75 + 0.25 * Math.sin(g.ph + S.t * 0.5));
            ctx.drawImage(g.spr.c, g.x - half, g.y - half, g.sz, g.sz);
        }
        // twinkling stars
        for (const st of S.stars) {
            const a = Math.sin(st.ph + S.t * st.fr);
            ctx.globalAlpha = 0.1 + 0.9 * a * a;
            ctx.drawImage(st.spr.c, st.x - st.spr.d / 2, st.y - st.spr.d / 2, st.spr.d, st.spr.d);
        }

        // falling / rising graphics
        for (let i = S.particles.length - 1; i >= 0; i--) {
            const p = S.particles[i];
            p.y += p.vy * dt;
            p.x = p.bx + Math.sin(p.phase + S.t * p.freq) * p.amp;
            p.rot += p.vr * dt;
            const off = p.rise ? p.y < -p.spr.d : p.y > S.h + p.spr.d;
            if (off) { S.particles.splice(i, 1); spawn(false); continue; }
            const r = p.spin ? p.rot : Math.sin(p.phase + S.t * p.freq) * 0.25;
            const c = Math.cos(r), s = Math.sin(r);
            ctx.globalAlpha = p.alpha;
            ctx.setTransform(dpr * c, dpr * s, -dpr * s, dpr * c, p.x * dpr, p.y * dpr);
            ctx.drawImage(p.spr.c, -p.spr.d / 2, -p.spr.d / 2, p.spr.d, p.spr.d);
        }

        // fireworks
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (S.cfg.fireworks) {
            S.nextFirework -= dt;
            if (S.nextFirework <= 0) {
                launchRocket();
                const ev = S.cfg.fireworks.every;
                S.nextFirework = rand(ev[0], ev[1]);
            }
            ctx.lineCap = 'round';
            for (let i = S.rockets.length - 1; i >= 0; i--) {
                const r = S.rockets[i];
                r.y += r.vy * dt;
                ctx.globalAlpha = 0.7;
                ctx.strokeStyle = r.color;
                ctx.lineWidth = 2.5;
                ctx.beginPath(); ctx.moveTo(r.x, r.y); ctx.lineTo(r.x, r.y + 16); ctx.stroke();
                if (r.y <= r.ty) { explode(r.x, r.y, r.color); S.rockets.splice(i, 1); }
            }
            const drag = Math.pow(0.1, dt);
            for (let i = S.sparks.length - 1; i >= 0; i--) {
                const sp = S.sparks[i];
                sp.px = sp.x; sp.py = sp.y;
                sp.vx *= drag; sp.vy = sp.vy * drag + 110 * dt;
                sp.x += sp.vx * dt; sp.y += sp.vy * dt;
                sp.life -= sp.decay * dt;
                if (sp.life <= 0) { S.sparks.splice(i, 1); continue; }
                ctx.globalAlpha = Math.max(0, sp.life) * 0.75;
                ctx.strokeStyle = sp.color;
                ctx.lineWidth = 2;
                ctx.beginPath(); ctx.moveTo(sp.px, sp.py); ctx.lineTo(sp.x, sp.y); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;
    }

    // ---------- traveller crossing the screen ----------
    function scheduleTraveler(first) {
        clearTimeout(S.travelTimer);
        if (!S.running || !S.cfg || !S.cfg.traveler) return;
        S.travelTimer = setTimeout(runTraveler, first ? 6000 : rand(35000, 60000));
    }

    function runTraveler() {
        if (!S.running || document.hidden) { scheduleTraveler(false); return; }
        const tv = S.cfg.traveler;
        const rtl = Math.random() < 0.5;
        const el = S.travelerEl;
        const trail = '<span class="fl-tv-t">' + tv.trail + '</span>';
        el.innerHTML = '<div class="fl-tv-inner">' + trail + trail + trail + '<span>' + tv.glyph + '</span></div>';
        el.style.top = rand(14, 62).toFixed(0) + 'vh';
        el.style.setProperty('--fl-dur', tv.duration + 's');
        el.className = 'fl-traveler';
        void el.offsetWidth; // restart the animation
        el.className = 'fl-traveler go' + (rtl ? ' rtl' : '');
    }

    // ---------- colour-changing string lights, draped in arcs ----------
    function buildGarland() {
        if (!S.scene) return;
        const cols = S.scene.lights;
        const arcW = 240, per = 6;
        const arcs = Math.ceil(window.innerWidth / arcW) + 1;
        let path = 'M0,4';
        for (let k = 0; k < arcs; k++) path += ' Q' + (k * arcW + arcW / 2) + ',36 ' + ((k + 1) * arcW) + ',4';
        let html = '<svg width="' + (arcs * arcW) + '" height="42" aria-hidden="true"><path d="' + path + '" fill="none" stroke="rgba(0,0,0,.45)" stroke-width="2"/></svg>';
        for (let k = 0; k < arcs; k++) {
            for (let j = 0; j < per; j++) {
                const u = (j + 0.5) / per;
                const idx = k * per + j;
                const x = k * arcW + u * arcW - 5;
                const y = 4 + 64 * u * (1 - u);
                const delay = (-(idx * 0.43) % 4.2).toFixed(2);
                html += '<b style="left:' + x.toFixed(1) + 'px;top:' + y.toFixed(1) + 'px;--b1:' + cols[idx % cols.length] +
                    ';--b2:' + cols[(idx + 1) % cols.length] + ';--b3:' + cols[(idx + 2) % cols.length] +
                    ';animation-delay:' + delay + 's,' + delay + 's"></b>';
            }
        }
        S.garlandEl.innerHTML = html;
        S.garlandEl.style.display = 'block';
    }

    // ---------- bottom parade: props along the ground + characters strolling past ----------
    function buildParade() {
        if (!S.scene || !S.paradeEl) return;
        const sc = S.scene;
        if (!sc.walkers.length && !sc.props.length) { S.paradeEl.innerHTML = ''; S.paradeEl.style.display = 'none'; return; }
        const mobile = window.innerWidth < 700;
        const nProps = mobile ? 3 : 5;
        const nWalk = mobile ? 3 : 5;
        let html = '';
        for (let i = 0; i < nProps; i++) {
            const left = ((i + 0.5) / nProps * 100 + rand(-3, 3)).toFixed(1);
            html += '<span class="fl-prop" style="left:' + left + '%;--s:' + rand(28, 38).toFixed(0) + 'px;animation-delay:-' + rand(0, 4).toFixed(2) + 's">' +
                sc.props[i % sc.props.length] + '</span>';
        }
        for (let i = 0; i < nWalk; i++) {
            const dur = rand(48, 95);
            const rev = Math.random() < 0.4;
            html += '<span class="fl-walker' + (rev ? ' rev' : '') + '" style="--d:' + dur.toFixed(0) + 's;--dl:-' + rand(0, dur).toFixed(1) +
                's;--s:' + rand(24, 32).toFixed(0) + 'px;--y:' + rand(0, 16).toFixed(0) + 'px"><span class="fl-flip"><span class="fl-hop" style="animation-delay:-' +
                rand(0, 0.7).toFixed(2) + 's;animation-duration:' + rand(0.5, 0.85).toFixed(2) + 's">' + pick(sc.walkers) + '</span></span></span>';
        }
        S.paradeEl.innerHTML = html;
        S.paradeEl.style.setProperty('--fl-ground', sc.ground);
        S.paradeEl.style.display = 'block';
    }

    // ---------- background palette cycling ----------
    function setPalette(i) {
        const pal = S.cfg.bg[i % S.cfg.bg.length];
        document.body.style.setProperty('--fl-c1', pal[0]);
        document.body.style.setProperty('--fl-c2', pal[1]);
        document.body.style.setProperty('--fl-c3', pal[2]);
    }

    function start() {
        if (S.running || !S.cfg) return;
        ensureDom();
        S.running = true;
        S.t = 0;
        S.nextFirework = 1.5;
        document.body.classList.add('fl-on');
        S.canvas.style.display = 'block';
        resize();
        setPalette(S.paletteIdx);
        seed();
        buildGarland();
        buildParade();
        S.last = performance.now();
        S.raf = requestAnimationFrame(frame);
        scheduleTraveler(true);
        clearInterval(S.paletteTimer);
        if (S.cfg.bg.length > 1) {
            S.paletteTimer = setInterval(() => { S.paletteIdx = (S.paletteIdx + 1) % S.cfg.bg.length; setPalette(S.paletteIdx); }, 15000);
        }
    }

    function stop() {
        S.running = false;
        cancelAnimationFrame(S.raf);
        clearTimeout(S.travelTimer);
        clearInterval(S.paletteTimer);
        document.body.classList.remove('fl-on');
        if (S.canvas) { S.ctx.setTransform(1, 0, 0, 1, 0, 0); S.ctx.clearRect(0, 0, S.canvas.width, S.canvas.height); S.canvas.style.display = 'none'; }
        if (S.travelerEl) S.travelerEl.className = 'fl-traveler';
        if (S.garlandEl) S.garlandEl.style.display = 'none';
        if (S.paradeEl) S.paradeEl.style.display = 'none';
    }

    function applyColors(colors) {
        if (!colors) return;
        const root = document.documentElement;
        root.style.setProperty('--primary-color', colors.primary);
        root.style.setProperty('--secondary-color', colors.secondary);
        root.style.setProperty('--accent-color', colors.accent);
    }

    // info = { FestivalID, EventName, ThemeName, WelcomeMessage, StartDate, EndDate }
    function init(info) {
        if (!info) { destroy(); return; }
        const key = resolveKey(info);
        S.key = key;
        S.cfg = FESTIVAL_THEMES[key];
        S.scene = FESTIVAL_SCENES[key] || FESTIVAL_SCENES.Default;
        S.info = info;
        S.paletteIdx = 0;
        injectStyles();
        ensureDom();
        applyColors(S.cfg.colors);
        const saved = storeGet();
        const reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        S.enabled = saved === null ? !reduced : saved === '1';
        syncToggle();
        stop();
        if (S.enabled) start();
        console.info('[Festival] theme:', key, '| effects:', S.enabled ? 'on' : 'off', '| source:', info.FestivalID || info.EventName || info.ThemeName);
    }

    function destroy() {
        stop();
        S.cfg = null; S.info = null; S.scene = null;
        ['fl-fx-canvas', 'fl-garland', 'fl-fx-toggle', 'fl-parade'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        if (S.travelerEl) S.travelerEl.remove();
        S.canvas = S.ctx = S.travelerEl = S.garlandEl = S.paradeEl = S.toggleEl = null;
    }

    // Festive greeting card inside the homepage hero (call after the hero has been rendered)
    function mountHero() {
        const hero = document.getElementById('homepage-hero');
        if (!hero || !S.info || !S.cfg) return;
        const old = hero.querySelector('.fl-greeting');
        if (old) old.remove();
        const info = S.info;
        let when = '';
        if (info.EndDate) {
            const end = new Date(info.EndDate + 'T00:00:00');
            const today = new Date(); today.setHours(0, 0, 0, 0);
            const left = Math.round((end - today) / 86400000);
            if (!isNaN(left) && left >= 0) {
                const label = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
                when = left === 0 ? 'Last day of our celebration!' : 'Celebrating until ' + label + ' · ' + left + ' day' + (left === 1 ? '' : 's') + ' left';
            }
        }
        const card = document.createElement('div');
        card.className = 'fl-greeting';
        card.innerHTML = '<span class="fl-pill">' + S.cfg.icon + ' ' + esc(cleanTitle(info) || 'Celebration') + '</span>' +
            (info.WelcomeMessage ? '<p>' + esc(info.WelcomeMessage) + '</p>' : '') +
            (when ? '<small>' + esc(when) + '</small>' : '');
        hero.appendChild(card);
    }

    // Decorations for product cards. They are only displayed while effects are on (CSS hides them otherwise).
    function cardOrnament(i) {
        if (!S.scene) return '';
        return '<span class="fl-orn" aria-hidden="true"><i></i><b>' + S.scene.orn[i % S.scene.orn.length] + '</b></span>';
    }
    function cardRibbon() {
        if (!S.scene || !S.cfg) return '';
        return '<span class="fl-pill-sm">' + S.cfg.icon + ' ' + esc(S.scene.ribbon) + '</span>';
    }

    return { init: init, destroy: destroy, mountHero: mountHero, resolveKey: resolveKey, cardOrnament: cardOrnament, cardRibbon: cardRibbon };
})();

// Lets you preview a theme by adding ?festival=Christmas (or Deepavali, CNY, ...) to the site address.
function getPreviewTheme() {
    try {
        const wanted = new URLSearchParams(window.location.search).get('festival');
        if (!wanted || !FESTIVAL_THEMES[wanted]) return null;
        return { FestivalID: wanted.toUpperCase() + '-PREVIEW', EventName: wanted, ThemeName: wanted, WelcomeMessage: 'Preview of the ' + wanted + ' theme.', EndDate: '' };
    } catch (e) { return null; }
}

// ===========================================================
// [ 1.8 ] SHOP LAYOUT (5 per row) & PRODUCT PAGES
// ===========================================================
const viewState = { current: 'homepage', listScroll: 0, baseTitle: document.title, pdQty: 1 };
const WHATSAPP_NUMBER = '601111033154';

function injectShopStyles() {
    if (document.getElementById('fl-shop-style')) return;
    const css = `
/* product grid: 5 per row on desktop, stepping down on smaller screens */
.product-list { display: grid !important; grid-template-columns: repeat(5, minmax(0, 1fr)) !important; gap: 16px !important; align-items: stretch; }
@media (max-width: 1280px) { .product-list { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; } }
@media (max-width: 1024px) { .product-list { grid-template-columns: repeat(3, minmax(0, 1fr)) !important; } }
@media (max-width: 720px)  { .product-list { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; gap: 10px !important; } }
@media (max-width: 330px)  { .product-list { grid-template-columns: 1fr !important; } }
.product-list .product { display: flex !important; flex-direction: column; width: auto !important; max-width: none !important; margin: 0 !important;
    position: relative; cursor: pointer; background: #fff; border-radius: 14px; overflow: hidden;
    box-shadow: 0 4px 14px rgba(0,0,0,.08); transition: transform .25s ease, box-shadow .25s ease; }
.product-list .product:hover, .product-list .product:focus-visible { transform: translateY(-5px); box-shadow: 0 14px 28px rgba(0,0,0,.16); outline: none; }
.product-list .product-image-container { position: relative; width: 100%; aspect-ratio: 1 / 1; overflow: hidden; background: #f4f7f5;
    display: flex; align-items: center; justify-content: center; }
.product-list .product-image-container img { width: 100%; height: 100%; object-fit: contain; transition: transform .4s ease; }
.product-list .product:hover .product-image-container img { transform: scale(1.06); }
.product-list .product-info { display: flex; flex-direction: column; flex: 1; padding: 10px 12px 12px; gap: 6px; }
.product-list .product-info h3 { margin: 0; font-size: .92rem; line-height: 1.3; min-height: 2.6em; display: -webkit-box;
    -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.product-list .price-section { font-size: 1rem; font-weight: 800; }
.product-list .product-benefits { font-size: .78rem; line-height: 1.4; color: #475569; display: -webkit-box;
    -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
.product-list .product-consumption { display: none !important; }
.product-list .product-more { font-size: .76rem; font-weight: 700; color: var(--primary-color, #113626); }
.product-list .product-actions { margin-top: auto; }
.product-list .product-actions .btn { width: 100%; padding: 8px 10px; font-size: .82rem; }

/* YouTube cards */
#youtube-videos-container { display: grid !important; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 22px; }
.yt-item { max-width: 680px; width: 100%; margin: 0 auto; }
.yt-frame { position: relative; aspect-ratio: 16 / 9; border-radius: 14px; overflow: hidden; background: #0f1a15; box-shadow: 0 8px 24px rgba(0,0,0,.18); }
.yt-frame iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; }
.yt-play { position: absolute; inset: 0; width: 100%; height: 100%; padding: 0; border: 0; background: none; cursor: pointer; }
.yt-play img { width: 100%; height: 100%; object-fit: cover; display: block; transition: transform .4s; }
.yt-play:hover img { transform: scale(1.04); }
.yt-btn { position: absolute; left: 50%; top: 50%; width: 68px; height: 48px; margin: -24px 0 0 -34px; border-radius: 14px; background: rgba(210,20,20,.92); }
.yt-btn::after { content: ''; position: absolute; left: 27px; top: 14px; border-left: 18px solid #fff; border-top: 10px solid transparent; border-bottom: 10px solid transparent; }
.yt-fallback { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: flex-end; gap: 10px;
    padding: 18px; text-align: center; color: #fff; text-decoration: none; font-size: .9rem; line-height: 1.4; }
.yt-fallback .yt-btn { top: 38%; }
.yt-link { display: inline-block; margin-top: 8px; font-size: .85rem; font-weight: 600; color: var(--primary-color, #113626); text-decoration: none; }
.yt-link:hover { text-decoration: underline; }

/* cart: let the whole list show (the modal itself scrolls) */
#cart-items { max-height: none !important; overflow: visible !important; }
#cart-items .cart-item { flex-shrink: 0; }

/* dedicated product page */
.pd-wrap { max-width: 1100px; margin: 0 auto; padding: 18px 14px 30px; }
.pd-crumbs { font-size: .85rem; color: #64748b; margin-bottom: 14px; }
.pd-crumbs a { color: var(--primary-color, #113626); font-weight: 700; text-decoration: none; cursor: pointer; }
.pd-card { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); gap: 28px; background: #fff; border-radius: 18px;
    padding: 24px; box-shadow: 0 10px 34px rgba(0,0,0,.1); position: relative; }
.pd-media { position: relative; border-radius: 14px; background: #f4f7f5; aspect-ratio: 1 / 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.pd-media img { width: 100%; height: 100%; object-fit: contain; }
.pd-info h1 { margin: 6px 0 8px; font-size: 1.7rem; line-height: 1.25; color: #10231b; }
.pd-price { font-size: 1.7rem; font-weight: 800; color: var(--primary-color, #113626); margin-bottom: 14px; }
.pd-block { margin: 0 0 14px; padding: 12px 14px; background: #f8fafc; border-left: 4px solid var(--secondary-color, #ffd700); border-radius: 8px; }
.pd-block h3 { margin: 0 0 4px; font-size: .8rem; text-transform: uppercase; letter-spacing: .6px; color: #475569; }
.pd-block p { margin: 0; line-height: 1.65; white-space: pre-line; color: #1f2937; }
.pd-buy { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 18px 0 12px; }
.pd-qty { display: flex; align-items: center; border: 1px solid #cbd5e1; border-radius: 10px; overflow: hidden; }
.pd-qty button { width: 40px; height: 44px; border: 0; background: #f1f5f9; font-size: 1.2rem; cursor: pointer; }
.pd-qty span { min-width: 44px; text-align: center; font-weight: 700; }
.pd-buy .btn { flex: 1; min-width: 160px; padding: 12px 18px; font-size: 1rem; }
.pd-links { display: flex; gap: 10px; flex-wrap: wrap; }
.pd-links a, .pd-links button { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 999px; border: 1px solid #cbd5e1;
    background: #fff; color: #1f2937; font-size: .85rem; font-weight: 600; text-decoration: none; cursor: pointer; }
.pd-links a:hover, .pd-links button:hover { border-color: var(--primary-color, #113626); color: var(--primary-color, #113626); }
.pd-related h2 { margin: 30px 0 12px; }
.pd-related-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 14px; }
.pd-mini { background: #fff; border-radius: 12px; overflow: hidden; cursor: pointer; box-shadow: 0 4px 14px rgba(0,0,0,.08); transition: transform .2s; }
.pd-mini:hover { transform: translateY(-4px); }
.pd-mini img { width: 100%; aspect-ratio: 1 / 1; object-fit: contain; background: #f4f7f5; display: block; }
.pd-mini div { padding: 8px 10px 10px; font-size: .85rem; font-weight: 600; line-height: 1.3; }
.pd-mini small { display: block; margin-top: 3px; color: var(--primary-color, #113626); font-weight: 800; }
@media (max-width: 820px) {
    .pd-card { grid-template-columns: 1fr; padding: 16px; gap: 16px; }
    .pd-info h1 { font-size: 1.35rem; }
    .pd-related-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}`;
    const el = document.createElement('style');
    el.id = 'fl-shop-style';
    el.textContent = css;
    document.head.appendChild(el);
}

// ---- routing: each product has its own address, e.g.  yoursite.com/#product/12 ----
function productRoute() {
    const m = String(window.location.hash || '').match(/^#product\/(.+)$/);
    if (!m) return null;
    try { return decodeURIComponent(m[1]); } catch (e) { return m[1]; }
}

function activateTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
    const target = document.getElementById(tabId);
    if (target) target.classList.add('active');
    viewState.current = tabId;
    if (tabId !== 'product-detail') document.title = viewState.baseTitle;
}

function openProduct(id) {
    viewState.listScroll = window.scrollY || 0;
    window.location.hash = 'product/' + encodeURIComponent(id);
}

function backToProducts() {
    // always return to the product list, even after browsing through several related products
    try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
    activateTab('products');
    window.scrollTo(0, viewState.listScroll || 0);
}

function handleRoute() {
    const id = productRoute();
    if (id !== null) { renderProductPage(id); return; }
    if (viewState.current === 'product-detail') {
        activateTab('products');
        window.scrollTo(0, viewState.listScroll || 0);
    }
}

function findProduct(id) {
    return products.find(p => String(p.id) === String(id));
}

function renderProductPage(id) {
    const box = document.getElementById('product-detail');
    if (!box) return;
    const p = findProduct(id);
    viewState.pdQty = 1;

    if (!p) {
        box.innerHTML = '<div class="pd-wrap"><p>Sorry, we could not find that product.</p><button class="btn btn-primary" onclick="backToProducts()">Back to products</button></div>';
        activateTab('product-detail');
        window.scrollTo(0, 0);
        return;
    }

    const idx = products.indexOf(p);
    const related = [];
    for (let i = 1; related.length < 4 && i < products.length; i++) related.push(products[(idx + i) % products.length]);
    const waText = 'Hi, I would like to know more about ' + p.name + ' ' + window.location.href;
    const waUrl = 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(waText);

    box.innerHTML = `
    <div class="pd-wrap">
        <nav class="pd-crumbs" aria-label="Breadcrumb"><a onclick="backToProducts()">&larr; All products</a> &nbsp;›&nbsp; <span>${esc(p.name)}</span></nav>
        <article class="pd-card">
            ${FestivalFX.cardOrnament(idx)}
            <div class="pd-media"><img src="${esc(p.image)}" alt="${esc(p.name)}" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"></div>
            <div class="pd-info">
                ${FestivalFX.cardRibbon()}
                <h1>${esc(p.name)}</h1>
                <div class="pd-price">RM ${Number(p.price || 0).toFixed(2)}</div>
                ${p.benefits ? `<div class="pd-block"><h3>Benefits</h3><p>${esc(p.benefits)}</p></div>` : ''}
                ${p.consumption ? `<div class="pd-block"><h3>How to use</h3><p>${esc(p.consumption)}</p></div>` : ''}
                <div class="pd-buy">
                    <div class="pd-qty">
                        <button type="button" aria-label="Decrease quantity" onclick="pdChangeQty(-1)">&minus;</button>
                        <span id="pd-qty" aria-live="polite">1</span>
                        <button type="button" aria-label="Increase quantity" onclick="pdChangeQty(1)">+</button>
                    </div>
                    <button type="button" id="pd-add" class="btn btn-primary" onclick="pdAddToCart(${jsArg(p.id)})">Add to Cart</button>
                </div>
                <div class="pd-links">
                    <a href="${esc(waUrl)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> Ask on WhatsApp</a>
                    <button type="button" id="pd-share" onclick="shareProduct(${jsArg(p.id)})"><i class="fa-solid fa-share-nodes"></i> Share</button>
                </div>
            </div>
        </article>
        ${related.length ? `<section class="pd-related"><h2>You may also like</h2><div class="pd-related-grid">${related.map(r => `
            <div class="pd-mini" role="link" tabindex="0" onclick="openProduct(${jsArg(r.id)})" onkeydown="if(event.key==='Enter')openProduct(${jsArg(r.id)})">
                <img src="${esc(r.image)}" alt="${esc(r.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG">
                <div>${esc(r.name)}<small>RM ${Number(r.price || 0).toFixed(2)}</small></div>
            </div>`).join('')}</div></section>` : ''}
    </div>`;

    document.title = p.name + ' | ' + viewState.baseTitle;
    activateTab('product-detail');
    window.scrollTo(0, 0);
}

function pdChangeQty(delta) {
    viewState.pdQty = Math.min(99, Math.max(1, viewState.pdQty + delta));
    const el = document.getElementById('pd-qty');
    if (el) el.textContent = viewState.pdQty;
}

function pdAddToCart(id) {
    addToCart(id, viewState.pdQty);
    const btn = document.getElementById('pd-add');
    if (btn) {
        btn.textContent = 'Added ✓';
        setTimeout(() => { const b = document.getElementById('pd-add'); if (b) b.textContent = 'Add to Cart'; }, 1400);
    }
}

function shareProduct(id) {
    const p = findProduct(id);
    if (!p) return;
    const url = window.location.href;
    const done = () => {
        const b = document.getElementById('pd-share');
        if (b) { b.textContent = 'Link copied ✓'; setTimeout(() => { const x = document.getElementById('pd-share'); if (x) x.innerHTML = '<i class="fa-solid fa-share-nodes"></i> Share'; }, 1600); }
    };
    if (navigator.share) {
        navigator.share({ title: p.name, url: url }).catch(() => { /* cancelled */ });
    } else if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copy this link:', url));
    } else {
        window.prompt('Copy this link:', url);
    }
}

// ===========================================================
// [ 2.0 ] MAIN CONTROLLER & INITIALIZATION
// ===========================================================
document.addEventListener('DOMContentLoaded', () => {
    injectShopStyles();
    window.addEventListener('hashchange', handleRoute);
    const loginBtn = document.getElementById('nav-login-btn');
    if (loginBtn) loginBtn.addEventListener('click', () => toggleLoginModal(true));

    const closeLoginBtn = document.getElementById('close-login-modal-btn');
    if (closeLoginBtn) closeLoginBtn.addEventListener('click', () => toggleLoginModal(false));

    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(googleScriptURL);
        if (!response.ok) throw new Error('Network response failed');
        const data = await response.json();

        if (data.status !== 'success') throw new Error(data.message || 'Unknown backend error');
        if (data.failedSections && data.failedSections.length) console.warn('Backend sections failed:', data.failedSections);

        const marketingData = data.marketingData || {};
        const activeTheme = getPreviewTheme() || data.activeTheme || null;

        // 1. Maintenance Mode Check
        if (String(marketingData.MaintenanceMode).trim().toUpperCase() === 'TRUE') {
            const storeWrapper = document.getElementById('store-wrapper');
            if (storeWrapper) storeWrapper.style.display = 'none';
            const overlay = document.getElementById('maintenance-overlay');
            if (overlay) {
                overlay.style.display = 'flex';
                const msg = document.getElementById('maintenance-message');
                if (msg) msg.textContent = marketingData.MaintenanceMessage || 'Site is down for maintenance.';
            }
            return;
        }

        // 2. Apply Theme & Marketing Banners
        applyTheme(activeTheme);
        applyMarketing(marketingData, activeTheme);

        // 3. Normalize products safely (handles case mismatches and missing fields)
        const rawProducts = data.products || [];
        products = rawProducts.map((p, idx) => ({
            id: p.id ?? p.ID ?? p.productId ?? idx + 1,
            name: p.name ?? p.Name ?? p.ProductName ?? 'Product Item',
            price: parseSafePrice(p),
            image: p.image ?? p.Image ?? p.imageURL ?? p.ImageURL ?? '',
            benefits: p.benefits ?? p.Benefits ?? '',
            consumption: p.consumption ?? p.Consumption ?? p.Usage ?? ''
        }));

        shippingRules = normaliseShippingRules(data.shippingRules);
        allJobs = data.jobsListings || [];

        renderMainContentShell();
        renderStaticContent(data.aboutUsContent);
        renderHomepageContent(data.aboutUsContent, allJobs, data.testimonies);
        FestivalFX.mountHero();
        renderProducts(products, marketingData.ProductTagText);
        renderAboutUs(data.aboutUsContent);
        renderJobs(allJobs);

        buildEnquiryForm();
        buildCartModal();
        buildJobApplicationModal();
        buildFabButtons();
        buildChatbotWidget();

        if (marketingData.PopupMessageText || marketingData.PopupImageURL) {
            buildPopupModal(marketingData.PopupMessageText, marketingData.PopupImageURL);
        }

        const updateElem = document.getElementById('update-timestamp');
        if (updateElem) updateElem.textContent = `${new Date().toLocaleDateString('en-GB')} (v31.0)`;

        const enqForm = document.getElementById('enquiry-form');
        if (enqForm) enqForm.addEventListener('submit', handleEnquirySubmit);

        const jobForm = document.getElementById('job-application-form');
        if (jobForm) jobForm.addEventListener('submit', handleJobApplicationSubmit);

        if (productRoute() !== null) { renderProductPage(productRoute()); } else { showTab('homepage'); }

    } catch (error) {
        console.error("Fatal Error fetching store data:", error);
        const main = document.getElementById('main-content');
        if (main) main.innerHTML = `<p style="text-align: center; color: red;">Error loading store. Please try again later.</p>`;
    }
}

// ===========================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// ===========================================================
function renderStaticContent(content) {
    if (!content) return;
    const headerElem = document.getElementById('company-name-header');
    if (headerElem) {
        headerElem.innerHTML = `${esc(content.CompanyName)} <span class="by-line">${esc(content.Owner)} - ${esc(content.Role)}</span> <span class="slogan">${esc(content.Slogan)}</span>`;
    }
    const footerElem = document.getElementById('footer-text');
    if (footerElem) {
        footerElem.textContent = content.Footer || `© ${new Date().getFullYear()} ${content.CompanyName || 'Forever Living'}`;
    }
}

function renderMainContentShell() {
    const main = document.getElementById('main-content');
    if (!main) return;
    main.innerHTML = `
        <div id="homepage" class="tab-content">
            <section id="homepage-hero" class="hero-section"></section>
            <section id="why-choose-us" class="dynamic-content-wrapper"></section>
            <section id="youtube-videos" class="dynamic-content-wrapper"></section>
            <section id="homepage-testimonies" class="dynamic-content-wrapper"><h2>What Our Customers Say</h2><div id="testimonies-container"></div></section>
            <section id="homepage-featured-jobs" class="dynamic-content-wrapper"><h2>Join Our Team</h2><div id="featured-jobs-container"></div><a onclick="showTab('jobs')" class="btn btn-secondary" style="display: table; margin: 20px auto 0; max-width: 300px;">View All Career Opportunities</a></section>
        </div>
        <div id="products" class="tab-content"><div id="product-list-container"></div></div>
        <div id="product-detail" class="tab-content"></div>
        <div id="about" class="tab-content"><section id="about-us-content" class="dynamic-content-wrapper"></section></div>
        <div id="jobs" class="tab-content"><section id="jobs-content" class="dynamic-content-wrapper"><h2>All Career Opportunities</h2><div id="job-listings-container"></div></section></div>
        <div id="enquiries" class="tab-content"><section id="enquiries-form-content" class="dynamic-content-wrapper"></section></div>
        <div id="rewards" class="tab-content"><section class="dynamic-content-wrapper"><h2>Rewards</h2><p>This feature is coming soon!</p></section></div>
    `;
}

// Accepts watch links, youtu.be links, shorts/embed/live links, links without https://, a bare 11-character
// video ID, or a whole pasted <iframe ...> embed code.
function youtubeId(input) {
    let str = String(input || '').trim();
    if (!str) return null;
    const src = str.match(/src\s*=\s*["']([^"']+)["']/i);
    if (src) str = src[1];
    if (/^[\w-]{11}$/.test(str)) return str;
    if (!/^https?:\/\//i.test(str)) str = 'https://' + str.replace(/^\/\//, '');
    try {
        const u = new URL(str);
        const host = u.hostname.replace(/^(www|m)\./i, '').toLowerCase();
        let id = null;
        if (host === 'youtu.be') id = u.pathname.split('/')[1] || null;
        else if (host.endsWith('youtube.com') || host.endsWith('youtube-nocookie.com')) {
            id = u.searchParams.get('v');
            if (!id) { const m = u.pathname.match(/\/(embed|shorts|live|v)\/([\w-]+)/); if (m) id = m[2]; }
        }
        return id && /^[\w-]{6,}$/.test(id) ? id : null;
    } catch (e) { return null; }
}

// Click-to-play video card. The thumbnail loads first; the real player is only created when someone clicks,
// and a plain "Watch on YouTube" link is always shown, so the section still works if embedding is blocked.
function playYoutube(btn) {
    const frame = btn.closest('.yt-frame');
    if (!frame) return;
    const id = frame.dataset.vid;
    frame.innerHTML = '<iframe src="https://www.youtube-nocookie.com/embed/' + encodeURIComponent(id) + '?autoplay=1&rel=0&playsinline=1" title="YouTube video" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" ' +
        'referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe>';
}

function ytThumbFailed(img) {
    const frame = img.closest('.yt-frame');
    if (!frame) return;
    const id = frame.dataset.vid;
    frame.innerHTML = '<a class="yt-fallback" href="https://www.youtube.com/watch?v=' + encodeURIComponent(id) + '" target="_blank" rel="noopener">' +
        '<span class="yt-btn"></span><span>Preview unavailable on this connection.<br>Tap to watch on YouTube</span></a>';
}

function renderHomepageContent(about, jobs, testimonies) {
    about = about || { CompanyName: "Forever Living", Slogan: "Premium Wellness & Beauty" };
    const heroContainer = document.getElementById('homepage-hero');
    if (heroContainer) heroContainer.innerHTML = `<h2>${esc(about.CompanyName || 'Welcome')}</h2><p>${esc(about.Slogan || 'High-quality wellness products')}</p>`;

    const whyChooseUsContainer = document.getElementById('why-choose-us');
    if (whyChooseUsContainer) {
        whyChooseUsContainer.innerHTML = `<h2>${esc(about.WhyChooseUs_Title || 'Why Choose Us')}</h2><div class="why-choose-us-grid"><div><i class="${esc(about.Point1_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point1_Text)}</p></div><div><i class="${esc(about.Point2_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point2_Text)}</p></div><div><i class="${esc(about.Point3_Icon || 'fa-solid fa-check')}"></i><p>${esc(about.Point3_Text)}</p></div></div>`;
    }

    const youtubeSection = document.getElementById('youtube-videos');
    const videoIds = about.YoutubeURL ? String(about.YoutubeURL).split(/[,\n]+/).map(youtubeId).filter(Boolean) : [];
    if (youtubeSection && videoIds.length > 0) {
        const videosHtml = videoIds.map(id => `
            <div class="yt-item">
                <div class="yt-frame" data-vid="${esc(id)}">
                    <button type="button" class="yt-play" onclick="playYoutube(this)" aria-label="Play video">
                        <img src="https://i.ytimg.com/vi/${encodeURIComponent(id)}/hqdefault.jpg" alt="" loading="lazy" onerror="ytThumbFailed(this)">
                        <span class="yt-btn"></span>
                    </button>
                </div>
                <a class="yt-link" href="https://www.youtube.com/watch?v=${encodeURIComponent(id)}" target="_blank" rel="noopener">Watch on YouTube &#8599;</a>
            </div>`).join('');
        youtubeSection.innerHTML = `<h2>${esc(about.YoutubeSection_Title || 'Learn More')}</h2><div id="youtube-videos-container">${videosHtml}</div>`;
    } else if (youtubeSection) {
        youtubeSection.style.display = 'none';
    }

    const testimoniesContainer = document.getElementById('testimonies-container');
    if (testimoniesContainer && testimonies && testimonies.length > 0) {
        testimoniesContainer.innerHTML = testimonies.map(t => {
            let stars = '';
            const rating = Number(t.Rating) || 5;
            for (let i = 0; i < 5; i++) { stars += `<i class="fa-solid fa-star" style="color: ${i < rating ? 'var(--secondary-color)' : '#ccc'}"></i>`; }
            return `<div class="testimony-card"><div class="testimony-header"><h4>${esc(t.ClientName || 'Valued Customer')}</h4><div class="testimony-rating">${stars}</div></div><p>"${esc(t.Quote)}"</p></div>`;
        }).join('');
    } else {
        const homeTestimonies = document.getElementById('homepage-testimonies');
        if (homeTestimonies) homeTestimonies.style.display = 'none';
    }

    const featuredJobsContainer = document.getElementById('featured-jobs-container');
    const featuredJobs = jobs ? jobs.filter(j => j.isFeatured) : [];
    if (featuredJobsContainer && featuredJobs.length > 0) {
        featuredJobsContainer.innerHTML = featuredJobs.map(job => `<div class="job-listing-summary"><h4>${esc(job.position)}</h4><p>${esc(job.location)} | ${esc(job.type)}</p></div>`).join('');
    } else {
        const homeJobs = document.getElementById('homepage-featured-jobs');
        if (homeJobs) homeJobs.style.display = 'none';
    }
}

function renderProducts(productsToRender, tagText) {
    const container = document.getElementById('product-list-container');
    if (!container) return;
    if (!productsToRender || productsToRender.length === 0) { container.innerHTML = `<p>No products available.</p>`; return; }

    const tagHtml = tagText ? `<div class="product-tag">${esc(tagText)}</div>` : '';

    container.innerHTML = `<div class="product-list">${productsToRender.map((p, i) => {
        const displayPrice = Number(p.price || 0).toFixed(2);
        return `
        <div class="product" data-pid="${esc(p.id)}" role="link" tabindex="0" aria-label="View ${esc(p.name)}" style="position: relative;">
            ${FestivalFX.cardOrnament(i)}
            ${tagHtml}
            <div class="product-image-container"><img src="${esc(p.image)}" alt="${esc(p.name)}" loading="lazy" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"></div>
            <div class="product-info">
                ${FestivalFX.cardRibbon()}
                <h3>${esc(p.name)}</h3>
                <div class="price-section"><span class="new-price">RM ${displayPrice}</span></div>
                <div class="product-benefits">${esc(p.benefits)}</div>
                <div class="product-consumption"><strong>Usage:</strong> ${esc(p.consumption)}</div>
                <div class="product-more">View details &rarr;</div>
                <div class="product-actions"><button type="button" class="btn btn-primary" onclick="addToCart(${jsArg(p.id)})">Add to Cart</button></div>
            </div>
        </div>`;
    }).join('')}</div>`;

    // Whole card opens the product page (the Add to Cart button keeps its own action)
    const list = container.querySelector('.product-list');
    if (list) {
        list.addEventListener('click', e => {
            if (e.target.closest('button, a')) return;
            const card = e.target.closest('.product');
            if (card) openProduct(card.dataset.pid);
        });
        list.addEventListener('keydown', e => {
            if (e.key !== 'Enter' || e.target.closest('button, a')) return;
            const card = e.target.closest('.product');
            if (card) openProduct(card.dataset.pid);
        });
    }
}

function renderAboutUs(content) {
    const container = document.getElementById('about-us-content');
    if (!container) return;
    if (!content) { container.innerHTML = '<p>About information is unavailable.</p>'; return; }
    const historySection = content.History ? `<div class="about-section"><h4>Our History</h4><p>${esc(content.History)}</p></div>` : '';
    container.innerHTML = `
        <h2>About ${esc(content.CompanyName || 'Us')}</h2>
        <div class="owner-profile">
            <img src="arvind.jpg" alt="${esc(content.Owner || 'Owner')}" class="owner-image" onerror="this.style.display='none'">
            <div class="owner-details">
                <h3>${esc(content.Owner)} - ${esc(content.Role)}</h3>
                <div>${content.MoreDetails || ''}</div>
            </div>
        </div>
        <div class="about-section">
            <h4>Our Mission</h4>
            <p>${esc(content.OurMission)}</p>
        </div>
        <div class="about-section">
            <h4>Our Vision</h4>
            <p>${esc(content.OurVision)}</p>
        </div>
        ${historySection}`;
}

function renderJobs(jobs) {
    const container = document.getElementById('job-listings-container');
    if (!container) return;
    if (!jobs || jobs.length === 0) { container.innerHTML = '<p>There are currently no open positions.</p>'; return; }
    container.innerHTML = jobs.map(job => `
        <div class="job-card">
            <div class="job-header"><h3>${esc(job.position)}</h3></div>
            <div class="job-body">
                <div class="job-details">
                    <div class="job-detail-item"><i class="fa-solid fa-location-dot"></i> <span>${esc(job.location)} | ${esc(job.type)}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-money-bill-wave"></i> <span>${esc(job.salary || '0')} RM</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-house-user"></i> <span>${esc(job.accommodation)}</span></div>
                    <div class="job-detail-item"><i class="fa-solid fa-calendar-days"></i> <span>${esc(job.workDayPattern)}</span></div>
                </div>
                <div class="job-description">${job.description || ''}</div>
                <button class="btn btn-primary" onclick="toggleJobModal(true, ${jsArg(job.jobId)}, ${jsArg(job.position)})">Apply Now</button>
            </div>
        </div>`).join('');
}

function buildEnquiryForm() {
    const container = document.getElementById('enquiries-form-content');
    if (!container) return;
    container.innerHTML = `<h2>Send Us An Enquiry</h2><form id="enquiry-form" class="enquiry-form"><input type="text" id="enquiry-name" placeholder="Your Full Name" required><input type="email" id="enquiry-email" placeholder="Your Email Address" required><input type="tel" id="enquiry-phone" placeholder="Your Phone Number" required><select id="enquiry-type" required><option value="" disabled selected>Select Enquiry Type...</option><option value="General Question">General</option><option value="Product Support">Product</option></select><textarea id="enquiry-message" placeholder="Your Message" rows="6" required></textarea><button type="submit" class="btn btn-primary" style="width: 100%;">Submit</button><p id="enquiry-status"></p></form>`;
}

function buildCartModal() {
    const container = document.getElementById('cart-modal');
    if (!container) return;
    container.style.cssText = "display:none; position:fixed; z-index:999999; left:0; top:0; width:100vw; height:100vh; background:rgba(0,0,0,0.6); backdrop-filter:blur(3px); justify-content:center; align-items:center; padding:12px; box-sizing:border-box;";
    container.onclick = e => { if (e.target === container) toggleCart(true); };
    container.innerHTML = `
        <div class="modal-content" style="background:#fff !important; width:100% !important; max-width:460px !important; max-height:86vh !important; display:flex !important; flex-direction:column !important; border-radius:12px !important; overflow:hidden !important; box-shadow:0 15px 35px rgba(0,0,0,0.3) !important;">
            <div style="display:flex; justify-content:space-between; align-items:center; padding:14px 18px; border-bottom:1px solid #e2e8f0; background:#f8fafc;">
                <h2 style="margin:0; font-size:1.15rem; color:#113626; font-weight:700;">Your Cart</h2>
                <button type="button" aria-label="Close cart" onclick="toggleCart(true)" style="background:none; border:none; font-size:1.6rem; line-height:1; color:#64748b; cursor:pointer;">&times;</button>
            </div>

            <div style="overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; padding:14px 18px; flex:1 1 auto;">
                <div id="cart-items" style="display:flex; flex-direction:column; gap:10px; margin-bottom:12px;"><p style="text-align:center; padding:15px 0;">Your cart is empty.</p></div>
                <div id="cart-checkout-area">
                    <div style="border-top:1px dashed #cbd5e1; border-bottom:1px dashed #cbd5e1; padding:10px 0; margin-bottom:12px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.85rem; color:#475569; margin-bottom:3px;"><span>Subtotal</span><span id="cart-subtotal">RM 0.00</span></div>
                        <div id="cart-shipping-row" style="display:none; justify-content:space-between; font-size:0.85rem; color:#475569; margin-bottom:3px;"><span>Shipping</span><span id="cart-shipping">RM 0.00</span></div>
                        <div id="cart-ship-hint" style="display:none; font-size:0.76rem; color:#b45309; background:#fffbeb; border-radius:6px; padding:5px 8px; margin:4px 0 6px;"></div>
                        <div style="display:flex; justify-content:space-between; font-size:1.05rem; font-weight:bold; color:#113626;"><span>Total</span><span id="cart-total">RM 0.00</span></div>
                    </div>
                    <div style="background:#f8fafc; border:1px solid #e2e8f0; border-radius:8px; padding:10px; margin-bottom:10px;">
                        <h3 style="font-size:0.82rem; margin:0 0 8px 0; color:#113626; text-transform:uppercase; letter-spacing:0.5px;">Customer Info</h3>
                        <div style="display:grid; grid-template-columns:1fr 1fr; gap:6px; margin-bottom:6px;">
                            <input type="text" id="customer-name" placeholder="Full Name" required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                            <input type="tel" id="customer-phone" placeholder="WhatsApp No." required style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; box-sizing:border-box;">
                        </div>
                        <input type="email" id="customer-email" placeholder="Email (Optional)" style="width:100%; height:32px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; margin-bottom:6px; box-sizing:border-box;">
                        <textarea id="customer-address" placeholder="Delivery Address" required style="width:100%; height:44px; padding:5px 8px; font-size:0.8rem; border:1px solid #cbd5e1; border-radius:4px; resize:none; box-sizing:border-box;"></textarea>
                    </div>
                </div>
            </div>

            <div style="padding:12px 18px 14px; background:#f8fafc; border-top:1px solid #e2e8f0; flex-shrink:0;">
                <button type="button" id="checkout-btn" onclick="initiateCheckout()" style="width:100%; padding:10px; font-size:0.95rem; font-weight:700; background:#113626; color:#ffffff; border:none; border-radius:6px; cursor:pointer;">Complete Order</button>
            </div>
        </div>`;
}

function buildJobApplicationModal() {
    const container = document.getElementById('job-application-modal');
    if (!container) return;
    container.innerHTML = `<div class="modal-content"><span class="close" onclick="toggleJobModal(false)">&times;</span><h2>Apply for <span id="job-modal-title"></span></h2><form id="job-application-form" class="enquiry-form"><input type="hidden" id="job-id-input"><input type="hidden" id="job-position-input"><input type="text" id="applicant-name" placeholder="Full Name" required><input type="email" id="applicant-email" placeholder="Email" required><input type="tel" id="applicant-phone" placeholder="Phone" required><input type="text" id="applicant-citizenship" placeholder="Citizenship" required><textarea id="applicant-message" placeholder="Tell us about yourself" rows="4"></textarea><label for="applicant-resume">Upload Resume (Mandatory)</label><input type="file" id="applicant-resume" required><button type="submit" class="btn btn-primary">Submit</button><p id="job-application-status"></p></form></div>`;
}

function buildFabButtons() {
    const container = document.getElementById('fab-container');
    if (!container) return;
    container.innerHTML = `<div id="floating-cart" class="fab floating-cart-btn" onclick="toggleCart()"><i class="fa-solid fa-cart-shopping"></i><span id="cart-count">0</span></div><div class="fab chatbot-fab" onclick="toggleChatWidget(true)"><i class="fa-solid fa-robot"></i></div>`;
}

function buildChatbotWidget() {
    const container = document.getElementById('eshop-chat-widget');
    if (!container) return;
    container.innerHTML = `<div id="chat-header"><span>FL e-Shop Assistant</span><button id="close-chat-btn" onclick="toggleChatWidget(false)">&times;</button></div><div id="chat-body"></div><div id="chat-input-container"><input type="text" id="chat-input" placeholder="Type your message..."><button id="chat-send-btn"><i class="fa-solid fa-paper-plane"></i></button></div>`;

    // FIX: these elements only exist after this function runs, so the listeners
    // must be attached here (they were previously attached before the elements existed).
    const chatSend = document.getElementById('chat-send-btn');
    if (chatSend) chatSend.addEventListener('click', handleChatSubmit);
    const chatInput = document.getElementById('chat-input');
    if (chatInput) chatInput.addEventListener('keyup', (e) => { if (e.key === 'Enter') handleChatSubmit(); });
}

// ===========================================================
// [ 4.0 ] CART LOGIC
// ===========================================================
function addToCart(productId, qty = 1) {
    const product = products.find(p => String(p.id) === String(productId));
    if (!product) return;
    const amount = Math.max(1, parseInt(qty, 10) || 1);
    const existingItem = cart.find(item => String(item.id) === String(productId));
    if (existingItem) {
        existingItem.quantity += amount;
    } else {
        cart.push({ ...product, quantity: amount });
    }
    updateCartDisplay();
}

function increaseQuantity(productId) {
    const item = cart.find(i => String(i.id) === String(productId));
    if (item) { item.quantity++; }
    updateCartDisplay();
}

function decreaseQuantity(productId) {
    const item = cart.find(i => String(i.id) === String(productId));
    if (item) {
        item.quantity--;
        if (item.quantity <= 0) { removeItemFromCart(productId); }
        else { updateCartDisplay(); }
    }
}

function removeItemFromCart(productId) {
    cart = cart.filter(item => String(item.id) !== String(productId));
    updateCartDisplay();
}

// Shipping rules come from the ShippingRules sheet (only rows with Apply ticked are sent).
//   Tiered   = normal bands: spend between MinSpend and MaxSpend pays Charge
//   Free     = promotion: free shipping in that range      FlatRate = promotion: flat Charge in that range
// A running promotion beats the normal tiers. Spend below the lowest tier pays the lowest tier's charge.
function normaliseShippingRules(raw) {
    if (!Array.isArray(raw)) return [];
    const num = v => { const n = parseFloat(String(v === undefined || v === null ? '' : v).replace(/[^0-9.\-]/g, '')); return isNaN(n) ? 0 : n; };
    return raw.map(r => {
        let type = String(r.type || r.RuleType || 'tiered').toLowerCase().replace(/[^a-z]/g, '');
        if (type !== 'free' && type !== 'flatrate') type = 'tiered';
        const max = num(r.maxSpend ?? r.MaxSpend);
        return { type: type, minSpend: num(r.minSpend ?? r.MinSpend), maxSpend: max > 0 ? max : 999999999,
                 charge: type === 'free' ? 0 : Math.max(0, num(r.charge ?? r.Charge)) };
    }).sort((a, b) => a.minSpend - b.minSpend);
}

function calcShipping(subtotal) {
    if (!shippingRules.length) return 0;
    const amount = Math.round(Number(subtotal) * 100) / 100;
    const inRange = r => amount >= r.minSpend && amount <= r.maxSpend;

    const promos = shippingRules.filter(r => r.type !== 'tiered' && inRange(r));
    if (promos.length) return Math.min(...promos.map(r => r.charge));

    const tiers = shippingRules.filter(r => r.type === 'tiered');
    if (!tiers.length) return 0;
    const hit = tiers.filter(inRange).pop();
    if (hit) return hit.charge;
    if (amount < tiers[0].minSpend) return tiers[0].charge;      // under the lowest band
    const below = tiers.filter(r => amount > r.maxSpend).pop();   // gap between bands, or above the last band
    return below ? below.charge : tiers[0].charge;
}

// The next band up that would make shipping cheaper (used for the "add RM x more" hint)
function nextCheaperTier(subtotal) {
    const current = calcShipping(subtotal);
    return shippingRules.find(r => r.type === 'tiered' && r.minSpend > subtotal && r.charge < current) || null;
}

function updateCartDisplay() {
    const cartItemsContainer = document.getElementById('cart-items');
    const checkoutArea = document.getElementById('cart-checkout-area');
    const checkoutBtn = document.getElementById('checkout-btn');
    const cartCountElem = document.getElementById('cart-count');
    const totalItems = cart.reduce((sum, item) => sum + (Number(item.quantity) || 0), 0);

    if (cartCountElem) cartCountElem.textContent = totalItems;
    if (!cartItemsContainer) return;

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align:center; padding: 20px 0;">Your cart is empty.</p>';
        if (checkoutArea) checkoutArea.style.display = 'none';
        if (checkoutBtn) checkoutBtn.style.display = 'none';
        return;
    }

    if (checkoutArea) checkoutArea.style.display = 'block';
    if (checkoutBtn) checkoutBtn.style.display = 'block';
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${esc(item.image)}" alt="${esc(item.name)}" class="cart-item-image" onerror="this.onerror=null;this.src=PLACEHOLDER_IMG"/>
            <div class="cart-item-details">
                <strong>${esc(item.name)}</strong>
                <div class="quantity-controls">
                    <button class="quantity-btn" onclick="decreaseQuantity(${jsArg(item.id)})">-</button>
                    <span>${item.quantity}</span>
                    <button class="quantity-btn" onclick="increaseQuantity(${jsArg(item.id)})">+</button>
                </div>
            </div>
            <strong>RM ${(Number(item.price || 0) * Number(item.quantity || 1)).toFixed(2)}</strong>
            <button class="remove-item-btn" aria-label="Remove item" onclick="removeItemFromCart(${jsArg(item.id)})"><i class="fa-solid fa-trash-can"></i></button>
        </div>`).join('');

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const subtotalElem = document.getElementById('cart-subtotal');
    const totalElem = document.getElementById('cart-total');
    const shipping = calcShipping(subtotal);
    if (subtotalElem) subtotalElem.textContent = `RM ${subtotal.toFixed(2)}`;
    if (totalElem) totalElem.textContent = `RM ${(subtotal + shipping).toFixed(2)}`;

    const shipRow = document.getElementById('cart-shipping-row');
    const shipElem = document.getElementById('cart-shipping');
    const hintElem = document.getElementById('cart-ship-hint');
    if (shipRow) shipRow.style.display = shippingRules.length ? 'flex' : 'none';
    if (shipElem) shipElem.textContent = shipping > 0 ? `RM ${shipping.toFixed(2)}` : 'FREE';
    if (hintElem) {
        // tell the customer how far they are from the next, cheaper shipping tier
        const next = nextCheaperTier(subtotal);
        if (next) {
            const more = (next.minSpend - subtotal).toFixed(2);
            hintElem.textContent = next.charge === 0 ? `Add RM ${more} more to get FREE shipping!` : `Add RM ${more} more to reduce shipping to RM ${next.charge.toFixed(2)}.`;
            hintElem.style.display = 'block';
        } else {
            hintElem.style.display = 'none';
        }
    }
}

function toggleCart(hide = false) {
    const modal = document.getElementById('cart-modal');
    if (!modal) return;
    modal.style.display = hide ? 'none' : 'flex';
    if (!hide) updateCartDisplay();
}

async function initiateCheckout() {
    // FIX: the button lives outside #cart-checkout-area, so the old selector never found it
    const checkoutBtn = document.getElementById('checkout-btn');
    const resetBtn = () => { if (checkoutBtn) { checkoutBtn.disabled = false; checkoutBtn.textContent = 'Complete Order'; } };

    if (cart.length === 0) { alert('Your cart is empty.'); return; }

    const name = document.getElementById('customer-name')?.value.trim();
    const phone = document.getElementById('customer-phone')?.value.trim();
    const address = document.getElementById('customer-address')?.value.trim();
    const email = document.getElementById('customer-email')?.value.trim();

    if (!name || !phone || !address) {
        alert('Please fill in all required customer details: Name, Phone, and Address.');
        return;
    }

    if (checkoutBtn) { checkoutBtn.disabled = true; checkoutBtn.textContent = 'Processing...'; }

    const subtotal = cart.reduce((sum, item) => sum + (Number(item.price || 0) * Number(item.quantity || 1)), 0);
    const shippingFee = calcShipping(subtotal);
    const totalAmount = subtotal + shippingFee;
    const itemsPurchased = cart.map(item => `${item.id}x${item.quantity}`).join(', ');

    const payload = {
        action: 'logInitialOrder',
        data: {
            customerName: name,
            customerPhone: phone,
            customerEmail: email,
            customerAddress: address,
            itemsPurchased: itemsPurchased,
            cart: cart,
            totalAmount: totalAmount,
            shippingFee: shippingFee,
            totalPointsForThisPurchase: 0
        }
    };

    try {
        const result = await postDataToGScript(payload);
        const ref = result && result.invoiceId ? ` Your order reference is ${result.invoiceId}.` : '';
        const paid = result && result.totalAmount !== undefined ? ` Order total: RM ${Number(result.totalAmount).toFixed(2)} (including shipping RM ${Number(result.shippingFee || 0).toFixed(2)}).` : '';
        alert('Your order has been placed successfully!' + ref + paid + ' We will contact you via WhatsApp shortly to confirm payment and shipping.');
        cart = [];
        toggleCart(true);
        updateCartDisplay();
    } catch (error) {
        console.error('Checkout failed:', error);
        alert('There was an error placing your order. Please try again or contact us directly.');
    } finally {
        resetBtn();
    }
}

// ===========================================================
// [ 5.0 ] FORMS LOGIC
// ===========================================================
function toggleJobModal(show = false, jobId = '', jobTitle = '') {
    const modal = document.getElementById('job-application-modal');
    if (!modal) return;
    if (show) {
        const titleElem = document.getElementById('job-modal-title');
        const idInput = document.getElementById('job-id-input');
        const posInput = document.getElementById('job-position-input');
        if (titleElem) titleElem.textContent = jobTitle;
        if (idInput) idInput.value = jobId;
        if (posInput) posInput.value = jobTitle;
        modal.style.display = 'flex';
    } else {
        modal.style.display = 'none';
        const form = document.getElementById('job-application-form');
        if (form) form.reset();
    }
}

async function handleEnquirySubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('enquiry-status');
    if (statusEl) statusEl.textContent = 'Sending...';
    try {
        const payload = { action: 'logEnquiry', data: { name: document.getElementById('enquiry-name')?.value, email: document.getElementById('enquiry-email')?.value, phone: document.getElementById('enquiry-phone')?.value, type: document.getElementById('enquiry-type')?.value, message: document.getElementById('enquiry-message')?.value } };
        await postDataToGScript(payload);
        if (statusEl) statusEl.textContent = 'Enquiry sent successfully!';
        event.target.reset();
    } catch (error) {
        console.error('Enquiry failed:', error);
        if (statusEl) statusEl.textContent = 'An error occurred. Please try again.';
    }
}

async function handleJobApplicationSubmit(event) {
    event.preventDefault();
    const statusEl = document.getElementById('job-application-status');
    const fileInput = document.getElementById('applicant-resume');
    if (!fileInput || fileInput.files.length === 0) {
        if (statusEl) statusEl.textContent = 'Resume upload is mandatory.';
        return;
    }
    if (statusEl) statusEl.textContent = 'Submitting...';
    try {
        const file = fileInput.files[0];
        if (file.size > 5 * 1024 * 1024) {
            if (statusEl) statusEl.textContent = 'Resume must be under 5 MB.';
            return;
        }
        const base64File = await getBase64(file);
        const payload = {
            action: 'logJobApplication',
            data: {
                jobId: document.getElementById('job-id-input')?.value,
                position: document.getElementById('job-position-input')?.value,
                name: document.getElementById('applicant-name')?.value,
                email: document.getElementById('applicant-email')?.value,
                phone: document.getElementById('applicant-phone')?.value,
                citizenship: document.getElementById('applicant-citizenship')?.value,
                message: document.getElementById('applicant-message')?.value,
                resumeFile: base64File.split(',')[1],
                resumeMimeType: file.type,
                resumeFileName: file.name
            }
        };
        await postDataToGScript(payload);
        if (statusEl) statusEl.textContent = 'Application submitted successfully!';
        setTimeout(() => { toggleJobModal(false); }, 3000);
    } catch (error) {
        console.error('Job application failed:', error);
        if (statusEl) statusEl.textContent = 'An error occurred. Please try again.';
    }
}

function getBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result);
        reader.onerror = error => reject(error);
    });
}

// ===========================================================
// [ 6.0 ] CHATBOT LOGIC
// ===========================================================
function toggleChatWidget(show) {
    const chatWidget = document.getElementById('eshop-chat-widget');
    const fabContainer = document.getElementById('fab-container');
    if (!chatWidget) return;
    if (show) {
        chatWidget.classList.add('active');
        if (fabContainer) fabContainer.style.right = '370px';
        const body = document.getElementById('chat-body');
        if (body && body.innerHTML.trim() === '') {
            displayMainMenu();
        }
    } else {
        chatWidget.classList.remove('active');
        if (fabContainer) fabContainer.style.right = '20px';
    }
}

function addChatMessage(sender, text, type = 'text') {
    const chatBody = document.getElementById('chat-body');
    if (!chatBody) return null;
    const msg = document.createElement('div');
    msg.classList.add('chat-message', sender === 'bot' ? 'bot-message' : 'user-message');
    if (type === 'html') { msg.innerHTML = text; } else { msg.textContent = text; }
    chatBody.appendChild(msg);
    chatBody.scrollTop = chatBody.scrollHeight;
    return msg;
}

function displayMainMenu() {
    chatSession.state = 'main_menu';
    const menu = `<strong>Welcome!</strong><br>1. My Account<br>2. Talk to a Human<br>Or ask a question.`;
    addChatMessage('bot', menu, 'html');
}

async function handleChatSubmit() {
    const input = document.getElementById('chat-input');
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;
    addChatMessage('user', text);
    input.value = '';
    const thinkingMsg = addChatMessage('bot', '<i>Thinking...</i>', 'html');

    try {
        if (chatSession.state === 'awaiting_identifier') { await startVerification(text); }
        else if (chatSession.state === 'awaiting_code') { await submitVerificationCode(text); }
        else if (chatSession.state === 'my_account_menu') { await handleMyAccountMenu(text); }
        else { await handleMainMenu(text); }
    } catch (error) {
        // FIX: network/server errors used to leave "Thinking..." on screen forever
        console.error('Chat error:', error);
        addChatMessage('bot', 'Sorry, something went wrong. Please try again in a moment.');
    } finally {
        if (thinkingMsg) thinkingMsg.remove();
    }
}

async function handleMainMenu(text) {
    if (text === '1') {
        if (sessionStorage.getItem('eshop_session_token')) {
            displayMyAccountMenu();
        } else {
            chatSession.state = 'awaiting_identifier';
            addChatMessage('bot', 'Enter your PAC or Email to verify.');
        }
    } else if (text === '2') {
        addChatMessage('bot', '<a href="https://wa.me/601111033154" target="_blank" rel="noopener">Contact Admin</a>', 'html');
    } else {
        const response = await postToRender('getSmartAnswer', { question: text });
        addChatMessage('bot', response.answer || 'Sorry, I had trouble finding an answer.');
    }
}

async function startVerification(identifier) {
    const result = await postToRender('issueChatVerificationCode', { identifier: identifier });
    if (result.success) {
        chatSession.state = 'awaiting_code';
        chatSession.pac = result.pac;
        addChatMessage('bot', 'A code has been sent to your WhatsApp. Please enter it here.');
    } else {
        addChatMessage('bot', `Verification failed: ${result.message}`);
        chatSession.state = 'main_menu';
    }
}

async function submitVerificationCode(code) {
    const result = await postToRender('verifyChatCode', { pac: chatSession.pac, code: code });
    if (result.success) {
        sessionStorage.setItem('eshop_session_token', result.token);
        addChatMessage('bot', 'Verified!');
        displayMyAccountMenu();
    } else {
        addChatMessage('bot', `Verification failed: ${result.message}`);
        chatSession.state = 'main_menu';
    }
}

function displayMyAccountMenu() {
    chatSession.state = 'my_account_menu';
    addChatMessage('bot', '<strong>My Account</strong><br>1. View My Last 5 Orders<br>2. Check My Total Points<br>3. Back to Main Menu', 'html');
}

async function handleMyAccountMenu(text) {
    let action = '';
    if (text === '1') action = 'getPurchaseHistory';
    else if (text === '2') action = 'getPointsHistory';
    else if (text === '3') { displayMainMenu(); return; }
    else { addChatMessage('bot', 'Invalid option.'); return; }

    const token = sessionStorage.getItem('eshop_session_token');
    const result = await postToRender(action, { token: token });
    if (result.success) {
        if (action === 'getPurchaseHistory') {
            let historyText = "<strong>Your Last 5 Orders:</strong><br>";
            if (!result.history || result.history.length === 0) { historyText = 'You have no purchase history.'; }
            else { result.history.forEach(order => { historyText += `<br><strong>ID:</strong> ${esc(order.invoiceId)}<br><strong>Date:</strong> ${esc(order.date)}<br><strong>Total:</strong> RM ${esc(order.totalAmount)}<br><strong>Status:</strong> ${esc(order.status)}<br>`; }); }
            addChatMessage('bot', historyText, 'html');
        } else {
            addChatMessage('bot', `Your total points: <strong>${esc(result.currentBalance)}</strong>`, 'html');
        }
    } else {
        addChatMessage('bot', `Error: ${result.message}`);
    }
}

// ===========================================================
// [ 7.0 ] GLOBAL UTILITIES & API HELPERS
// ===========================================================
function showTab(tabId) {
    // leaving a product page through the menu: drop its address so Back/refresh behave
    if (productRoute() !== null && tabId !== 'product-detail') {
        try { window.history.replaceState(null, '', window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
    }
    activateTab(tabId);
}

// FIX: the old "no-cors" request could never read the server's reply, so the shop showed
// "order placed" even when the backend rejected the order. A text/plain POST needs no
// CORS pre-flight with Apps Script and lets us read the real result.
async function postDataToGScript(payload) {
    const response = await fetch(googleScriptURL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        redirect: 'follow'
    });
    if (!response.ok) throw new Error('Server responded with ' + response.status);
    const result = await response.json();
    if (result.status === 'error' || result.success === false) {
        throw new Error(result.message || 'Request was rejected by the server.');
    }
    return result;
}

async function postToRender(action, data) {
    const response = await fetch(botServerURL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, apiKey, data })
    });
    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.message || 'Server error');
    }
    return await response.json();
}

// ===========================================================
// [ 8.0 ] THEME, MARKETING & LOGIN MODAL LOGIC
// ===========================================================
function applyTheme(theme) {
    FestivalFX.init(theme || null);
}

function applyMarketing(marketing, theme) {
    const banner = document.getElementById('promo-running-banner');
    if (!banner) return;
    const bannerText = marketing.BannerText || (theme ? theme.WelcomeMessage : null);

    if (bannerText) {
        const textElem = document.getElementById('promo-banner-text');
        if (textElem) textElem.textContent = bannerText;
        banner.style.display = 'block';
    } else {
        banner.style.display = 'none';
    }
}

function buildPopupModal(message, imageUrl) {
    if (!message && !imageUrl) return;
    if (sessionStorage.getItem('eshopPopupShown') === 'true') return;

    const container = document.getElementById('popup-modal');
    if (!container) return;
    let modalHTML = '';

    if (imageUrl) {
        modalHTML = `
        <div class="modal-content" style="max-width: 500px; padding: 0;">
             <button class="close" aria-label="Close" style="position: absolute; top: 10px; right: 20px; font-size: 30px; background: white; border-radius: 50%; width: 40px; height: 40px; opacity: 0.8;" onclick="togglePopup(true)">&times;</button>
             <img src="${esc(imageUrl)}" style="width: 100%; border-radius: var(--border-radius);" onerror="this.parentElement.style.display='none'">
        </div>`;
    } else {
        modalHTML = `
        <div class="modal-content" style="max-width: 500px;">
            <div class="modal-header">
                <h2>Welcome!</h2>
                <button class="close" aria-label="Close" onclick="togglePopup(true)">&times;</button>
            </div>
            <div class="modal-body" style="padding: 30px; font-size: 1.1rem; text-align: center;">
                ${esc(message)}
            </div>
        </div>`;
    }

    container.innerHTML = modalHTML;
    togglePopup(false);
    sessionStorage.setItem('eshopPopupShown', 'true');
}

function togglePopup(hide = false) {
    const modal = document.getElementById('popup-modal');
    if (modal) modal.style.display = hide ? 'none' : 'flex';
}

function toggleLoginModal(show) {
    const modal = document.getElementById('login-modal');
    if (modal) modal.style.display = show ? 'flex' : 'none';
}
