// =================================================================
// E-Shop Frontend Script - v31.0 (CALMER FESTIVAL THEMES, SHIPPING RULES, VIDEO FIX)
// Features: Festival themes (live backgrounds, graphics, moving animations),
//           robust price parsing, marketing, cart, chatbot
// Preview any theme without waiting for its dates:  yoursite.com/?festival=Christmas
// =================================================================

// ===========================================================
// [ 1.0 ] GLOBAL CONFIGURATION & STATE
// ===========================================================
const googleScriptURL = (window.FL_CONFIG && window.FL_CONFIG.SCRIPT_URL) || '';   // set in config.js
if (!googleScriptURL) console.error('config.js is missing. Upload it next to index.html.');
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
    '<text x="50%" y="50%" fill="#7a8a83" font-family="sans-serif" font-size="18" text-anchor="middle" dominant-baseline="middle">Forever Living by Muhd Isa</text></svg>'
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
        fireworks: { colors: ['#1a8cd8', '#f39c12', '#27ae60', '#e74c3c'], every: [5, 9] },
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

// ===========================================================
// [ 1.6 ] FESTIVAL BACKGROUND ARTWORK
// Each festival gets its own full-screen illustration, drawn as scalable SVG (no image files needed).
// They sit behind the page content at low opacity so text stays easy to read.
// ===========================================================
const FestivalArt = (() => {
    const TAU = Math.PI * 2;
    const f = n => Math.round(n * 10) / 10;
    const rng = seed => () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };

    // ---- building blocks ----
    function dots(cx, cy, n, r, dr, fill, op) {
        let o = '';
        for (let i = 0; i < n; i++) {
            const a = TAU * i / n;
            o += '<circle cx="' + f(cx + Math.cos(a) * r) + '" cy="' + f(cy + Math.sin(a) * r) + '" r="' + f(dr) + '" fill="' + fill + '"' + (op ? ' opacity="' + op + '"' : '') + '/>';
        }
        return o;
    }

    function petals(cx, cy, n, r0, len, wid, fill, stroke, rotDeg) {
        let o = '';
        for (let i = 0; i < n; i++) {
            const a = (rotDeg || 0) + 360 * i / n;
            o += '<path transform="translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + f(a) + ')" d="M' + f(r0) + ',0 C' + f(r0 + len * 0.3) + ',' + f(-wid) +
                ' ' + f(r0 + len * 0.8) + ',' + f(-wid) + ' ' + f(r0 + len) + ',0 C' + f(r0 + len * 0.8) + ',' + f(wid) + ' ' + f(r0 + len * 0.3) + ',' + f(wid) +
                ' ' + f(r0) + ',0Z" fill="' + fill + '" stroke="' + (stroke || 'none') + '" stroke-width="1.2"/>';
        }
        return o;
    }

    function starPoly(cx, cy, R, r, n, fill, op) {
        const pts = [];
        for (let i = 0; i < n * 2; i++) {
            const rad = i % 2 ? r : R;
            const a = Math.PI * i / n - Math.PI / 2;
            pts.push(f(cx + Math.cos(a) * rad) + ',' + f(cy + Math.sin(a) * rad));
        }
        return '<polygon points="' + pts.join(' ') + '" fill="' + fill + '" opacity="' + (op || 1) + '"/>';
    }

    // crescent opening to the right
    function crescent(id, cx, cy, r, fill, op) {
        return '<mask id="' + id + '"><rect x="' + f(cx - r * 1.3) + '" y="' + f(cy - r * 1.3) + '" width="' + f(r * 2.6) + '" height="' + f(r * 2.6) + '" fill="#fff"/>' +
            '<circle cx="' + f(cx + r * 0.4) + '" cy="' + f(cy) + '" r="' + f(r * 0.82) + '" fill="#000"/></mask>' +
            '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="' + fill + '" opacity="' + op + '" mask="url(#' + id + ')"/>';
    }

    // Rangoli: concentric rings of petals, dotted circles and a centre flower (palette: 4 colours)
    function rangoli(cx, cy, R, pal, cls) {
        return '<g class="' + (cls || '') + '">' +
            '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R) + '" fill="none" stroke="' + pal[0] + '" stroke-width="2"/>' +
            dots(cx, cy, 48, R * 0.95, R * 0.012, pal[1]) +
            petals(cx, cy, 16, R * 0.74, R * 0.2, R * 0.06, pal[0], pal[3], 0) +
            petals(cx, cy, 16, R * 0.6, R * 0.15, R * 0.045, pal[1], pal[3], 11.25) +
            '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * 0.58) + '" fill="none" stroke="' + pal[2] + '" stroke-width="2"/>' +
            dots(cx, cy, 32, R * 0.5, R * 0.011, pal[3]) +
            petals(cx, cy, 12, R * 0.3, R * 0.2, R * 0.075, pal[2], pal[3], 0) +
            petals(cx, cy, 12, R * 0.17, R * 0.13, R * 0.048, pal[0], pal[3], 15) +
            '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * 0.09) + '" fill="' + pal[3] + '"/>' +
            '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(R * 0.045) + '" fill="' + pal[2] + '"/></g>';
    }

    // Kolam: a diamond of dots (pulli) with overlapping loops woven around them
    function kolam(cx, cy, sp, color) {
        const rows = [1, 3, 5, 7, 5, 3, 1];
        let o = '';
        rows.forEach((n, ri) => {
            const y = cy + (ri - 3) * sp;
            for (let j = 0; j < n; j++) {
                const x = cx + (j - (n - 1) / 2) * sp;
                o += '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(sp * 0.08) + '" fill="' + color + '"/>' +
                    '<circle cx="' + f(x) + '" cy="' + f(y) + '" r="' + f(sp * 0.62) + '" fill="none" stroke="' + color + '" stroke-width="' + f(Math.max(1.4, sp * 0.05)) + '"/>';
            }
        });
        return '<g class="fl-pulse">' + o + '</g>';
    }

    // auspicious cloud swirl (Chinese)
    function cloud(x, y, s, fill, stroke) {
        return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')"><path d="M0,44 C-22,44 -22,14 4,14 C6,-10 40,-12 46,10 C62,-8 96,6 86,30 C108,28 112,52 86,52 L0,52Z" fill="' + fill + '" stroke="' + stroke +
            '" stroke-width="2"/><path d="M22,40 C14,40 14,28 24,28 M52,34 C44,34 44,22 54,22 M76,42 C68,42 68,32 78,32" fill="none" stroke="' + stroke + '" stroke-width="2"/></g>';
    }

    // Chinese dragon: a long wavy body with scales and spines, and a head with horns, whiskers and a pearl
    function dragon(w, h) {
        const base = h * 0.6, amp = h * 0.085, x0 = -w * 0.06, x1 = w * 0.74, N = 80;
        const wave = x => base + amp * Math.sin((x / w) * TAU * 1.5);
        const top = [], bot = [], mid = [];
        for (let i = 0; i <= N; i++) {
            const t = i / N, x = x0 + (x1 - x0) * t, cy = wave(x);
            const th = h * (0.012 + 0.052 * Math.sin(Math.min(1, t * 1.1) * Math.PI / 2));
            top.push(f(x) + ',' + f(cy - th)); bot.push(f(x) + ',' + f(cy + th)); mid.push([x, cy, th]);
        }
        const poly = top.join(' ') + ' ' + bot.reverse().join(' ');
        let scales = '', spines = '';
        mid.forEach((m, i) => {
            if (i % 2 === 0) scales += '<circle cx="' + f(m[0]) + '" cy="' + f(m[1]) + '" r="' + f(m[2] * 0.95) + '" fill="none" stroke="#ffd700" stroke-width="1.6" opacity=".75"/>';
            if (i % 4 === 1 && i > 6) spines += '<path d="M' + f(m[0] - m[2] * 0.35) + ',' + f(m[1] - m[2]) + ' L' + f(m[0]) + ',' + f(m[1] - m[2] * 1.65) + ' L' + f(m[0] + m[2] * 0.35) + ',' + f(m[1] - m[2]) + 'Z" fill="#ffb300"/>';
        });
        const hx = x1, hy = wave(x1);
        const ang = Math.atan2(wave(x1 + 6) - wave(x1 - 6), 12) * 180 / Math.PI;
        const sc = h * 0.0017;
        const head =
            '<g transform="translate(' + f(hx) + ' ' + f(hy) + ') rotate(' + f(ang) + ') scale(' + f(sc) + ')">' +
            '<path d="M-20,-48 C-8,-96 22,-116 44,-138 C42,-106 62,-96 74,-86 C60,-76 72,-54 40,-48Z" fill="#ff8c00"/>' +
            '<path d="M-26,14 C-62,46 -52,78 -20,98 C-30,66 -8,46 4,34Z" fill="#ff8c00"/>' +
            '<path d="M-14,-46 C20,-62 80,-62 132,-42 C170,-30 200,-32 236,-16 C252,-8 252,12 232,18 C206,28 190,22 170,32 C192,48 176,72 150,68 C120,64 110,78 70,72 C30,68 0,52 -14,46Z" fill="#c1121f"/>' +
            '<path d="M40,-54 C34,-88 8,-114 -24,-126 C4,-102 12,-82 18,-54Z" fill="#ffd700"/>' +
            '<path d="M78,-58 C84,-94 62,-124 34,-142 C52,-112 52,-88 52,-58Z" fill="#ffd700"/>' +
            '<ellipse cx="122" cy="-30" rx="14" ry="10" fill="#fff"/><circle cx="125" cy="-30" r="5.5" fill="#111"/>' +
            '<path d="M100,-46 C120,-58 142,-52 154,-38" stroke="#ffd700" stroke-width="5" fill="none" stroke-linecap="round"/>' +
            '<circle cx="224" cy="-6" r="4.5" fill="#7a0a12"/>' +
            '<path d="M172,28 l6,18 l7,-18 M194,24 l5,16 l6,-16" fill="#fff"/>' +
            '<path d="M214,14 C252,22 278,54 306,48" stroke="#ffd700" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
            '<path d="M204,22 C236,48 246,84 274,92" stroke="#ffd700" stroke-width="4.5" fill="none" stroke-linecap="round"/>' +
            '<circle cx="300" cy="22" r="17" fill="#fff4b0" stroke="#ffd700" stroke-width="3.5"/></g>';
        return '<clipPath id="flDragonClip"><polygon points="' + poly + '"/></clipPath>' +
            '<polygon points="' + poly + '" fill="#c1121f"/>' +
            '<g clip-path="url(#flDragonClip)">' + scales + '</g>' + spines + head;
    }

    function coin(cx, cy, r, color, cls) {
        return '<g class="' + (cls || '') + '"><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="none" stroke="' + color + '" stroke-width="' + f(r * 0.06) +
            '"/><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r * 0.86) + '" fill="none" stroke="' + color + '" stroke-width="2"/><rect x="' + f(cx - r * 0.2) + '" y="' + f(cy - r * 0.2) +
            '" width="' + f(r * 0.4) + '" height="' + f(r * 0.4) + '" fill="none" stroke="' + color + '" stroke-width="' + f(r * 0.05) + '"/>' +
            [0, 90, 180, 270].map(a => '<path transform="translate(' + f(cx) + ' ' + f(cy) + ') rotate(' + a + ')" d="M' + f(r * 0.3) + ',0 L' + f(r * 0.7) + ',0" stroke="' + color + '" stroke-width="3"/>').join('') + '</g>';
    }

    function pine(x, y, s) {
        return '<g transform="translate(' + f(x) + ' ' + f(y) + ') scale(' + f(s) + ')"><rect x="-7" y="-16" width="14" height="18" fill="#6d4c41"/>' +
            '<path d="M0,-150 L38,-84 L18,-84 L50,-42 L22,-42 L56,-16 L-56,-16 L-22,-42 L-50,-42 L-18,-84 L-38,-84Z" fill="#1b6b3a"/>' +
            '<path d="M0,-150 L14,-124 L-14,-124Z M-38,-84 L-26,-96 L-18,-84Z M38,-84 L26,-96 L18,-84Z M-50,-42 L-36,-54 L-22,-42Z M50,-42 L36,-54 L22,-42Z" fill="#fff"/></g>';
    }

    function mosque(cx, baseY, s, fill) {
        return '<g transform="translate(' + f(cx) + ' ' + f(baseY) + ') scale(' + f(s) + ')" fill="' + fill + '">' +
            '<rect x="-170" y="-110" width="340" height="110"/>' +
            '<path d="M-92,-110 A92,92 0 0 1 92,-110Z"/><rect x="-3" y="-232" width="6" height="40"/><circle cx="0" cy="-236" r="7"/>' +
            '<path d="M-170,-110 A42,42 0 0 1 -86,-110Z"/><path d="M86,-110 A42,42 0 0 1 170,-110Z"/>' +
            '<rect x="-236" y="-270" width="26" height="270"/><path d="M-242,-270 L-223,-318 L-204,-270Z"/><rect x="-241" y="-232" width="36" height="8"/>' +
            '<rect x="210" y="-270" width="26" height="270"/><path d="M204,-270 L223,-318 L242,-270Z"/><rect x="205" y="-232" width="36" height="8"/>' +
            '<path d="M-40,0 L-40,-48 A40,40 0 0 1 40,-48 L40,0Z" fill="#fff" opacity=".35"/></g>';
    }

    function gopuram(cx, baseY, s, fill) {
        let o = '', y = 0;
        const tiers = 7;
        for (let i = 0; i < tiers; i++) {
            const w = (tiers - i) * 46 + 50, h = 36;
            o += '<rect x="' + f(-w / 2) + '" y="' + f(-(y + h)) + '" width="' + w + '" height="' + h + '"/>';
            o += '<rect x="' + f(-w / 2 - 8) + '" y="' + f(-(y + h) - 5) + '" width="' + (w + 16) + '" height="9"/>';
            for (let k = -2; k <= 2 && i < tiers - 1; k++) o += '<rect x="' + (k * 26 - 6) + '" y="' + f(-(y + h) + 10) + '" width="12" height="18" fill="#fff" opacity=".35"/>';
            y += h + 4;
        }
        o += '<ellipse cx="0" cy="' + f(-y - 12) + '" rx="22" ry="14"/><ellipse cx="-30" cy="' + f(-y - 6) + '" rx="8" ry="10"/><ellipse cx="30" cy="' + f(-y - 6) + '" rx="8" ry="10"/><rect x="-2" y="' + f(-y - 46) + '" width="4" height="30"/>';
        return '<g transform="translate(' + f(cx) + ' ' + f(baseY) + ') scale(' + f(s) + ')" fill="' + fill + '">' + o + '</g>';
    }

    function heart(x, y, s, fill, op, rot) {
        return '<path transform="translate(' + f(x) + ' ' + f(y) + ') rotate(' + f(rot || 0) + ') scale(' + f(s) + ')" d="M0,30 C-62,-8 -34,-52 0,-20 C34,-52 62,-8 0,30Z" fill="' + fill + '" opacity="' + op + '"/>';
    }

    function burst(cx, cy, R, color, n) {
        let o = '';
        for (let i = 0; i < n; i++) {
            const a = TAU * i / n, c = Math.cos(a), s = Math.sin(a);
            o += '<line x1="' + f(cx + c * R * 0.3) + '" y1="' + f(cy + s * R * 0.3) + '" x2="' + f(cx + c * R) + '" y2="' + f(cy + s * R) + '" stroke="' + color + '" stroke-width="2.4" stroke-linecap="round"/>' +
                '<circle cx="' + f(cx + c * R * 1.08) + '" cy="' + f(cy + s * R * 1.08) + '" r="3.6" fill="' + color + '"/>';
        }
        return '<g class="fl-pulse">' + o + '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="5" fill="' + color + '"/></g>';
    }

    function balloon(x, y, r, color) {
        return '<g class="fl-bob"><ellipse cx="' + f(x) + '" cy="' + f(y) + '" rx="' + f(r) + '" ry="' + f(r * 1.2) + '" fill="' + color + '"/>' +
            '<ellipse cx="' + f(x - r * 0.35) + '" cy="' + f(y - r * 0.4) + '" rx="' + f(r * 0.18) + '" ry="' + f(r * 0.3) + '" fill="#fff" opacity=".5"/>' +
            '<path d="M' + f(x) + ',' + f(y + r * 1.2) + ' l-5,9 l10,0Z" fill="' + color + '"/>' +
            '<path d="M' + f(x) + ',' + f(y + r * 1.2 + 9) + ' c-10,30 10,50 0,90" fill="none" stroke="#777" stroke-width="1.5"/></g>';
    }

    // ---- one drawing per festival ----
    const themes = {
        // Rangoli + kolam: rotating rangoli mandalas with dot-and-loop kolam patterns
        Deepavali: (w, h) => {
            const m = Math.min(w, h);
            const palA = ['#ff8c00', '#ff2db4', '#ffd700', '#7b2cbf'];
            const palB = ['#ff2db4', '#ff8c00', '#ffd700', '#5b21b6'];
            return '<g opacity=".24">' + rangoli(w * 0.5, h * 0.5, m * 0.48, palA, 'fl-spin') + '</g>' +
                '<g opacity=".3">' + rangoli(w * 0.03, h * 0.1, m * 0.26, palB, 'fl-spin2') + rangoli(w * 0.97, h * 0.92, m * 0.3, palA, 'fl-spin2') + '</g>' +
                '<g opacity=".34">' + kolam(w * 0.93, h * 0.2, m * 0.04, '#ff8c00') + kolam(w * 0.07, h * 0.78, m * 0.04, '#a855f7') + '</g>';
        },

        // Dragon, auspicious clouds, coins
        CNY: (w, h) => {
            const m = Math.min(w, h);
            return '<g opacity=".16">' + coin(w * 0.12, h * 0.18, m * 0.2, '#d4a017', 'fl-spin') + coin(w * 0.9, h * 0.82, m * 0.26, '#d4a017', 'fl-spin2') + '</g>' +
                '<g class="fl-drift" opacity=".26">' + cloud(w * 0.08, h * 0.38, m * 0.0034 * 100, 'rgba(255,215,0,.25)', '#d4a017') + cloud(w * 0.72, h * 0.12, m * 0.003 * 100, 'rgba(255,215,0,.25)', '#d4a017') + '</g>' +
                '<g class="fl-drift2" opacity=".24">' + cloud(w * 0.48, h * 0.86, m * 0.0028 * 100, 'rgba(255,215,0,.25)', '#d4a017') + '</g>' +
                '<g class="fl-drift" opacity=".38">' + dragon(w, h) + '</g>';
        },

        // Islamic star pattern, crescent and star, mosque skyline
        HariRaya: (w, h) => {
            const s = Math.min(h / 900, w / 760);
            return '<defs><pattern id="flIslam" width="140" height="140" patternUnits="userSpaceOnUse"><g fill="none" stroke="#0b6b3a" stroke-width="1.6">' +
                '<rect x="37" y="37" width="66" height="66"/><rect x="37" y="37" width="66" height="66" transform="rotate(45 70 70)"/><circle cx="70" cy="70" r="36"/>' +
                '<path d="M0,-12 L12,0 L0,12 L-12,0Z"/><path transform="translate(140 0)" d="M0,-12 L12,0 L0,12 L-12,0Z"/><path transform="translate(0 140)" d="M0,-12 L12,0 L0,12 L-12,0Z"/><path transform="translate(140 140)" d="M0,-12 L12,0 L0,12 L-12,0Z"/>' +
                '</g></pattern></defs>' +
                '<rect width="' + w + '" height="' + h + '" fill="url(#flIslam)" opacity=".2"/>' +
                '<g class="fl-pulse">' + crescent('flCres', w * 0.84, h * 0.2, Math.min(w, h) * 0.13, '#d4a017', 0.5) + starPoly(w * 0.9, h * 0.15, Math.min(w, h) * 0.04, Math.min(w, h) * 0.017, 5, '#d4a017', 0.5) + '</g>' +
                '<g opacity=".34">' + mosque(w * 0.5, h + 4, s * 1.05, '#0b6b3a') + mosque(w * 0.12, h + 4, s * 0.6, '#0b6b3a') + mosque(w * 0.88, h + 4, s * 0.6, '#0b6b3a') + '</g>';
        },

        // Snowy hills, pine trees, snowflake mandalas
        Christmas: (w, h) => {
            const m = Math.min(w, h);
            const hill1 = 'M0,' + f(h * 0.8) + ' C' + f(w * 0.2) + ',' + f(h * 0.7) + ' ' + f(w * 0.4) + ',' + f(h * 0.86) + ' ' + f(w * 0.62) + ',' + f(h * 0.78) + ' S' + f(w * 0.9) + ',' + f(h * 0.72) + ' ' + w + ',' + f(h * 0.8) + ' L' + w + ',' + h + ' L0,' + h + 'Z';
            const hill2 = 'M0,' + f(h * 0.88) + ' C' + f(w * 0.25) + ',' + f(h * 0.82) + ' ' + f(w * 0.5) + ',' + f(h * 0.94) + ' ' + f(w * 0.75) + ',' + f(h * 0.87) + ' S' + f(w * 0.95) + ',' + f(h * 0.85) + ' ' + w + ',' + f(h * 0.88) + ' L' + w + ',' + h + ' L0,' + h + 'Z';
            const flake = (cx, cy, R) => petals(cx, cy, 6, R * 0.1, R * 0.9, R * 0.06, 'none', '#6aa6d8', 0) + petals(cx, cy, 6, R * 0.45, R * 0.35, R * 0.08, 'none', '#6aa6d8', 30) + dots(cx, cy, 6, R * 0.2, R * 0.03, '#6aa6d8');
            const ps = Math.min(h / 700, 1.3);
            return '<g opacity=".28" class="fl-spin">' + flake(w * 0.1, h * 0.16, m * 0.2) + '</g><g opacity=".28" class="fl-spin2">' + flake(w * 0.9, h * 0.3, m * 0.16) + '</g>' +
                '<path d="' + hill1 + '" fill="#dcecfb" opacity=".85"/>' +
                '<g opacity=".92">' + pine(w * 0.05, h * 0.84, ps * 1.15) + pine(w * 0.13, h * 0.8, ps * 0.8) + pine(w * 0.3, h * 0.83, ps * 0.7) + pine(w * 0.7, h * 0.8, ps * 0.75) + pine(w * 0.87, h * 0.78, ps * 0.85) + pine(w * 0.95, h * 0.83, ps * 1.2) + '</g>' +
                '<path d="' + hill2 + '" fill="#ffffff" opacity=".95"/>';
        },

        // Jalur Gemilang colours: faint red/white stripes, blue canton with crescent and 14-point star
        NationalDay: (w, h) => flag(w, h),
        MalaysiaDay: (w, h) => flag(w, h),

        // Giant harvest moon, drifting clouds, lantern string
        MooncakeFestival: (w, h) => {
            const m = Math.min(w, h), cx = w * 0.78, cy = h * 0.3, r = m * 0.24;
            return '<defs><radialGradient id="flMoonG" cx="40%" cy="38%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".7" stop-color="#ffe9a0"/><stop offset="1" stop-color="#ffd166"/></radialGradient></defs>' +
                '<circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r * 1.9) + '" fill="#ffd166" opacity=".12"/><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r * 1.4) + '" fill="#ffd166" opacity=".18"/>' +
                '<g class="fl-bob"><circle cx="' + f(cx) + '" cy="' + f(cy) + '" r="' + f(r) + '" fill="url(#flMoonG)" opacity=".75"/>' +
                '<circle cx="' + f(cx - r * 0.3) + '" cy="' + f(cy - r * 0.25) + '" r="' + f(r * 0.16) + '" fill="#e8c46a" opacity=".5"/><circle cx="' + f(cx + r * 0.25) + '" cy="' + f(cy + r * 0.2) + '" r="' + f(r * 0.22) + '" fill="#e8c46a" opacity=".4"/>' +
                '<circle cx="' + f(cx + r * 0.05) + '" cy="' + f(cy - r * 0.5) + '" r="' + f(r * 0.1) + '" fill="#e8c46a" opacity=".45"/></g>' +
                '<g class="fl-drift" opacity=".4">' + cloud(w * 0.1, h * 0.55, m * 0.0034 * 100, 'rgba(255,255,255,.7)', '#c9a24a') + cloud(w * 0.55, h * 0.72, m * 0.003 * 100, 'rgba(255,255,255,.7)', '#c9a24a') + '</g>' +
                '<g class="fl-drift2" opacity=".35">' + cloud(w * 0.35, h * 0.12, m * 0.0028 * 100, 'rgba(255,255,255,.7)', '#c9a24a') + '</g>' +
                '<g class="fl-pulse" opacity=".7">' + starPoly(w * 0.12, h * 0.2, 12, 4, 4, '#d4a017') + starPoly(w * 0.3, h * 0.08, 9, 3, 4, '#d4a017') + starPoly(w * 0.6, h * 0.15, 10, 3.5, 4, '#d4a017') + '</g>';
        },

        // Gopuram temple tower, saffron rangoli and kolam
        Thaipusam: (w, h) => {
            const m = Math.min(w, h), s = Math.min(h / 820, w / 640) * 1.05;
            const pal = ['#ff9933', '#8e44ad', '#ffd700', '#5b2c83'];
            return '<g opacity=".24">' + rangoli(w * 0.5, h * 0.42, m * 0.42, pal, 'fl-spin') + '</g>' +
                '<g opacity=".3">' + rangoli(w * 0.04, h * 0.12, m * 0.2, pal, 'fl-spin2') + '</g>' +
                '<g opacity=".28">' + gopuram(w * 0.5, h + 6, s, '#8e44ad') + gopuram(w * 0.12, h + 6, s * 0.55, '#ff9933') + gopuram(w * 0.88, h + 6, s * 0.55, '#ff9933') + '</g>' +
                '<g opacity=".3">' + kolam(w * 0.92, h * 0.22, m * 0.035, '#ff9933') + '</g>';
        },

        // Firework bursts and rising bubbles
        NewYear: (w, h) => {
            const m = Math.min(w, h), R = rng(7);
            let bubbles = '';
            for (let i = 0; i < 16; i++) bubbles += '<circle class="fl-bob" cx="' + f(R() * w) + '" cy="' + f(h * (0.45 + R() * 0.5)) + '" r="' + f(4 + R() * 10) + '" fill="none" stroke="#d4a017" stroke-width="1.6" opacity=".4" style="animation-delay:-' + f(R() * 7) + 's"/>';
            return '<g opacity=".34">' + burst(w * 0.2, h * 0.3, m * 0.16, '#d4a017', 28) + burst(w * 0.78, h * 0.24, m * 0.2, '#e11d48', 32) + burst(w * 0.55, h * 0.62, m * 0.13, '#2563eb', 24) + burst(w * 0.9, h * 0.7, m * 0.1, '#d4a017', 20) + burst(w * 0.06, h * 0.78, m * 0.11, '#7c3aed', 22) + '</g>' + bubbles;
        },

        // Hearts and rose petals
        Valentines: (w, h) => {
            const R = rng(21), m = Math.min(w, h);
            let o = heart(w * 0.5, h * 0.52, m * 0.0125 * 100 / 10 * 5, '#ff7aa2', 0.1, 0);
            const cols = ['#ff4d7d', '#ff8fb1', '#d70040', '#ffb3c8'];
            for (let i = 0; i < 22; i++) o += '<g class="' + (i % 2 ? 'fl-bob' : 'fl-pulse') + '" style="animation-delay:-' + f(R() * 6) + 's">' + heart(R() * w, R() * h, 0.4 + R() * 1.1, cols[i % 4], 0.16 + R() * 0.14, (R() - 0.5) * 50) + '</g>';
            return o;
        },

        // Bunting across the top and balloon bunches in the corners
        GrandOpening: (w, h) => {
            const cols = ['#1a8cd8', '#f39c12', '#27ae60', '#e74c3c', '#9b59b6'];
            const arcW = 320, arcs = Math.ceil(w / arcW) + 1;
            let line = 'M0,40', flags = '';
            for (let k = 0; k < arcs; k++) {
                const x0 = k * arcW, cx = x0 + arcW / 2, x2 = x0 + arcW;
                line += ' Q' + cx + ',110 ' + x2 + ',40';
                for (let j = 0; j < 8; j++) {
                    const u = (j + 0.5) / 8;
                    const px = (1 - u) * (1 - u) * x0 + 2 * u * (1 - u) * cx + u * u * x2;
                    const py = (1 - u) * (1 - u) * 40 + 2 * u * (1 - u) * 110 + u * u * 40;
                    flags += '<path d="M' + f(px - 15) + ',' + f(py) + ' L' + f(px + 15) + ',' + f(py) + ' L' + f(px) + ',' + f(py + 38) + 'Z" fill="' + cols[(k * 8 + j) % cols.length] + '"/>';
                }
            }
            const m = Math.min(w, h);
            return '<g opacity=".4"><path d="' + line + '" fill="none" stroke="#555" stroke-width="2"/>' + flags + '</g>' +
                '<g opacity=".4">' + balloon(w * 0.05, h * 0.62, m * 0.04, '#e74c3c') + balloon(w * 0.09, h * 0.7, m * 0.036, '#1a8cd8') + balloon(w * 0.03, h * 0.74, m * 0.032, '#f39c12') +
                balloon(w * 0.95, h * 0.6, m * 0.04, '#27ae60') + balloon(w * 0.91, h * 0.69, m * 0.036, '#9b59b6') + balloon(w * 0.97, h * 0.73, m * 0.032, '#f39c12') + '</g>';
        },

        // Lotus mandala with a soft halo
        Vesak: (w, h) => {
            const m = Math.min(w, h), pal = ['#f48fb1', '#ffd54f', '#ce93d8', '#b8860b'];
            return '<defs><radialGradient id="flHalo"><stop offset="0" stop-color="#ffe082" stop-opacity=".55"/><stop offset="1" stop-color="#ffe082" stop-opacity="0"/></radialGradient></defs>' +
                '<circle cx="' + f(w * 0.5) + '" cy="' + f(h * 0.5) + '" r="' + f(m * 0.8) + '" fill="url(#flHalo)"/>' +
                '<g opacity=".26">' + rangoli(w * 0.5, h * 0.5, m * 0.46, pal, 'fl-spin') + '</g>' +
                '<g opacity=".28">' + rangoli(w * 0.04, h * 0.88, m * 0.22, pal, 'fl-spin2') + rangoli(w * 0.96, h * 0.1, m * 0.2, pal, 'fl-spin2') + '</g>';
        }
    };

    function flag(w, h) {
        const stripeH = h / 14, m = Math.min(w, h);
        let stripes = '';
        for (let i = 0; i < 14; i += 2) stripes += '<rect x="0" y="' + f(i * stripeH) + '" width="' + w + '" height="' + f(stripeH) + '" fill="#cc0001"/>';
        const cw = w * 0.5, ch = stripeH * 8;
        return '<g class="fl-wave" opacity=".1">' + stripes + '</g>' +
            '<rect x="0" y="0" width="' + f(cw) + '" height="' + f(ch) + '" fill="#010066" opacity=".1"/>' +
            crescent('flCres2', cw * 0.38, ch * 0.5, Math.min(cw, ch) * 0.3, '#f5b800', 0.34) +
            '<g class="fl-spin">' + starPoly(cw * 0.62, ch * 0.5, Math.min(cw, ch) * 0.26, Math.min(cw, ch) * 0.12, 14, '#f5b800', 0.34) + '</g>';
    }

    return {
        has: key => !!themes[key],
        svg: (key, w, h) => themes[key] ? '<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' + themes[key](w, h) + '</svg>' : ''
    };
})();

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

// ===========================================================
// [ 1.7 ] FESTIVAL STAGE  — hand-painted canvas scenery, unique for every festival
// back()  paints behind the page (rangoli, moon, rays ...)   front() paints over the page (dragon, flags, lanterns, petals ...)
// Nothing here is an emoji. Everything is drawn with gradients, so it stays crisp and looks the same on every device.
// ===========================================================
const FestivalStage = (() => {
    const TAU = Math.PI * 2;
    const R = (a, b) => a + Math.random() * (b - a);
    const P = arr => arr[Math.floor(Math.random() * arr.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const wrapA = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
    let W = 0, H = 0, DPR = 1, mob = false, cur = null;

    // ---------- colour & light helpers ----------
    const hexRgb = h => { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; };
    const rgba = (h, a) => { const c = hexRgb(h); return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + a + ')'; };
    const shade = (h, amt) => { const c = hexRgb(h).map(v => clamp(Math.round(v + amt), 0, 255)); return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')'; };
    const glowCache = new Map();
    function glowSprite(color) {
        let c = glowCache.get(color);
        if (c) return c;
        c = document.createElement('canvas'); c.width = c.height = 128;
        const g = c.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
        gr.addColorStop(0, rgba(color, 1)); gr.addColorStop(0.22, rgba(color, 0.55)); gr.addColorStop(0.55, rgba(color, 0.14)); gr.addColorStop(1, rgba(color, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
        glowCache.set(color, c);
        return c;
    }
    function glow(ctx, x, y, r, color, a) {
        ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(glowSprite(color), x - r, y - r, r * 2, r * 2);
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    }
    function star4(ctx, x, y, r, color, a) {
        ctx.save(); ctx.globalAlpha = a; ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = color;
        ctx.beginPath();
        for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.16 : r; const an = i * Math.PI / 4 - Math.PI / 2; ctx[i ? 'lineTo' : 'moveTo'](x + Math.cos(an) * rr, y + Math.sin(an) * rr); }
        ctx.fill(); ctx.restore();
    }
    function goldGrad(ctx, x0, y0, x1, y1) {
        const g = ctx.createLinearGradient(x0, y0, x1, y1);
        g.addColorStop(0, '#fff1a8'); g.addColorStop(0.35, '#e9bf45'); g.addColorStop(0.7, '#b8862a'); g.addColorStop(1, '#f2d676');
        return g;
    }
    function polyPath(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](p[0], p[1])); ctx.closePath(); }
    function heartPath(ctx, s) {
        ctx.beginPath(); ctx.moveTo(0, s * 0.3);
        ctx.bezierCurveTo(-s * 0.55, -s * 0.1, -s * 0.5, -s * 0.55, 0, -s * 0.28);
        ctx.bezierCurveTo(s * 0.5, -s * 0.55, s * 0.55, -s * 0.1, 0, s * 0.3); ctx.closePath();
    }
    function offscreen(w, h, scale) {
        const c = document.createElement('canvas');
        c.width = Math.max(2, Math.round(w * scale)); c.height = Math.max(2, Math.round(h * scale));
        const g = c.getContext('2d'); g.scale(scale, scale);
        return { c: c, g: g, w: w, h: h };
    }

    // ---------- hanging ornaments (drawn from a point at the top, hang downward) ----------
    const draw = {
        lantern(ctx, s, t, ph, o) {
            const w = s * 0.34, h = s * (o.round ? 0.62 : 0.78), y0 = s * 0.07, cy = y0 + h / 2;
            glow(ctx, 0, cy, s * 1.0, o.light, 0.30 + 0.08 * Math.sin(t * 5 + ph));
            const g = ctx.createRadialGradient(-w * 0.2, cy - h * 0.15, 1, 0, cy, w * 1.25);
            g.addColorStop(0, o.c1); g.addColorStop(0.55, o.c2); g.addColorStop(1, o.c3);
            ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(0, cy, w, h / 2, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(90,0,0,.38)'; ctx.lineWidth = 1;
            for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.ellipse(0, cy, w * k / 3.4, h / 2, 0, 0, TAU); ctx.stroke(); }
            ctx.beginPath(); ctx.moveTo(-w, cy); ctx.lineTo(w, cy); ctx.stroke();
            ctx.fillStyle = goldGrad(ctx, -w * 0.5, 0, w * 0.5, 0);
            ctx.fillRect(-w * 0.42, 0, w * 0.84, y0 + 1);
            ctx.fillRect(-w * 0.42, y0 + h - 2, w * 0.84, s * 0.06);
            const ty = y0 + h + s * 0.06;
            ctx.strokeStyle = o.tassel; ctx.lineWidth = 1.4;
            for (let i = -3; i <= 3; i++) {
                ctx.beginPath(); ctx.moveTo(i * 1.4, ty);
                ctx.quadraticCurveTo(i * 2.4 + Math.sin(t * 2.2 + ph + i) * 2.5, ty + s * 0.12, i * 2 + Math.sin(t * 2.4 + ph + i * 0.7) * 3.5, ty + s * 0.3); ctx.stroke();
            }
            ctx.fillStyle = goldGrad(ctx, -3, ty - 2, 3, ty + 3); ctx.beginPath(); ctx.arc(0, ty, 3, 0, TAU); ctx.fill();
        },
        ketupat(ctx, s, t, ph) {
            const hw = s * 0.34, cy = s * 0.38;
            ctx.save(); ctx.translate(0, cy);
            const g = ctx.createLinearGradient(-hw, -hw, hw, hw);
            g.addColorStop(0, '#7bd36a'); g.addColorStop(0.5, '#2e9a45'); g.addColorStop(1, '#14612c');
            polyPath(ctx, [[0, -hw * 1.1], [hw, 0], [0, hw * 1.1], [-hw, 0]]); ctx.fillStyle = g; ctx.fill();
            ctx.save(); polyPath(ctx, [[0, -hw * 1.1], [hw, 0], [0, hw * 1.1], [-hw, 0]]); ctx.clip();
            ctx.strokeStyle = 'rgba(220,255,200,.55)'; ctx.lineWidth = 1.6;
            for (let k = -6; k <= 6; k++) {
                const o = k * s * 0.085;
                ctx.beginPath(); ctx.moveTo(-hw * 1.2, o - hw * 1.2); ctx.lineTo(hw * 1.2, o + hw * 1.2); ctx.stroke();
                ctx.strokeStyle = 'rgba(8,60,25,.5)';
                ctx.beginPath(); ctx.moveTo(-hw * 1.2, o + hw * 1.2); ctx.lineTo(hw * 1.2, o - hw * 1.2); ctx.stroke();
                ctx.strokeStyle = 'rgba(220,255,200,.55)';
            }
            ctx.restore();
            polyPath(ctx, [[0, -hw * 1.1], [hw, 0], [0, hw * 1.1], [-hw, 0]]); ctx.strokeStyle = '#0c4a20'; ctx.lineWidth = 1.5; ctx.stroke();
            ctx.restore();
            ctx.strokeStyle = '#2e9a45'; ctx.lineWidth = 2;
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 2, cy + hw * 1.1); ctx.quadraticCurveTo(i * 3 + Math.sin(t * 2.5 + ph + i) * 3, cy + hw * 1.1 + s * 0.15, i * 4 + Math.sin(t * 2.2 + ph + i) * 4, cy + hw * 1.1 + s * 0.34); ctx.stroke(); }
            ctx.fillStyle = '#e9bf45'; ctx.beginPath(); ctx.arc(0, cy - hw * 1.1, 2.6, 0, TAU); ctx.fill();
        },
        bauble(ctx, s, t, ph, o) {
            const r = s * 0.3, cy = s * 0.1 + r;
            ctx.fillStyle = goldGrad(ctx, -r * 0.3, 0, r * 0.3, 0); ctx.fillRect(-r * 0.28, 0, r * 0.56, s * 0.1);
            const g = ctx.createRadialGradient(-r * 0.4, cy - r * 0.45, r * 0.05, 0, cy, r * 1.1);
            g.addColorStop(0, '#ffffff'); g.addColorStop(0.18, o.c); g.addColorStop(0.75, shade(o.c, -70)); g.addColorStop(1, shade(o.c, -110));
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, cy, r, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,.4)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, cy, r * 0.72, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
            ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(-r * 0.4, cy - r * 0.45, r * 0.22, r * 0.12, -0.7, 0, TAU); ctx.fill();
            glow(ctx, 0, cy, r * 2.4, o.c, 0.12);
        },
        akash(ctx, s, t, ph) {
            const cy = s * 0.46, Ro = s * 0.46, Ri = s * 0.2;
            glow(ctx, 0, cy, s * 1.1, '#ff8a1f', 0.38 + 0.1 * Math.sin(t * 4 + ph));
            const pts = []; for (let i = 0; i < 16; i++) { const r = i % 2 ? Ri : Ro, a = i * Math.PI / 8 - Math.PI / 2; pts.push([Math.cos(a) * r, cy + Math.sin(a) * r]); }
            const g = ctx.createRadialGradient(0, cy, 1, 0, cy, Ro);
            g.addColorStop(0, '#fff6c2'); g.addColorStop(0.35, '#ffb02e'); g.addColorStop(0.75, '#e0407a'); g.addColorStop(1, '#8e1b6e');
            polyPath(ctx, pts); ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = 'rgba(255,230,150,.8)'; ctx.lineWidth = 1.2; ctx.stroke();
            ctx.strokeStyle = 'rgba(255,255,255,.45)'; ctx.lineWidth = 1;
            for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4 - Math.PI / 2; ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(Math.cos(a) * Ro * 0.9, cy + Math.sin(a) * Ro * 0.9); ctx.stroke(); }
            ctx.fillStyle = goldGrad(ctx, -4, 0, 4, 0); ctx.fillRect(-3, 0, 6, s * 0.05);
            ctx.strokeStyle = '#ffcf4d'; ctx.lineWidth = 1.6;
            for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(i * 2, cy + Ro); ctx.quadraticCurveTo(i * 3 + Math.sin(t * 2 + ph + i) * 3, cy + Ro + s * 0.18, i * 4 + Math.sin(t * 2.3 + ph + i) * 4, cy + Ro + s * 0.4); ctx.stroke(); }
        },
        bell(ctx, s, t, ph) {
            const r = s * 0.28, top = s * 0.12;
            ctx.strokeStyle = '#d4af37'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, top * 0.6, 4, Math.PI, TAU); ctx.stroke();
            const g = ctx.createLinearGradient(-r, 0, r, 0);
            g.addColorStop(0, '#7a5a12'); g.addColorStop(0.3, '#f3d878'); g.addColorStop(0.55, '#c99a2e'); g.addColorStop(1, '#6e500f');
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-r * 0.25, top);
            ctx.bezierCurveTo(-r * 0.9, top + s * 0.1, -r * 1.1, top + s * 0.38, -r * 1.2, top + s * 0.52);
            ctx.lineTo(r * 1.2, top + s * 0.52); ctx.bezierCurveTo(r * 1.1, top + s * 0.38, r * 0.9, top + s * 0.1, r * 0.25, top); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#8f6a14'; ctx.beginPath(); ctx.ellipse(0, top + s * 0.52, r * 1.2, 3.5, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = goldGrad(ctx, -3, 0, 3, 8); ctx.beginPath(); ctx.arc(Math.sin(t * 6 + ph) * 3, top + s * 0.58, 4, 0, TAU); ctx.fill();
            glow(ctx, 0, top + s * 0.3, s * 0.7, '#ffd25a', 0.15);
        },
        heart(ctx, s, t, ph, o) {
            ctx.save(); ctx.translate(0, s * 0.4);
            const g = ctx.createRadialGradient(-s * 0.1, -s * 0.12, 1, 0, 0, s * 0.45);
            g.addColorStop(0, '#ff9ab3'); g.addColorStop(0.45, o.c); g.addColorStop(1, shade(o.c, -80));
            heartPath(ctx, s * 0.85); ctx.fillStyle = g; ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.beginPath(); ctx.ellipse(-s * 0.17, -s * 0.2, s * 0.09, s * 0.05, -0.6, 0, TAU); ctx.fill();
            glow(ctx, 0, 0, s * 0.8, o.c, 0.18);
            ctx.restore();
        },
        lotus(ctx, s, t, ph) {
            const cy = s * 0.42;
            glow(ctx, 0, cy, s * 1.0, '#ffd27a', 0.34 + 0.08 * Math.sin(t * 3 + ph));
            for (let layer = 0; layer < 2; layer++) {
                const n = layer ? 5 : 7, len = s * (layer ? 0.3 : 0.38), wid = s * (layer ? 0.1 : 0.12);
                for (let i = 0; i < n; i++) {
                    const a = -Math.PI / 2 + (i - (n - 1) / 2) * (layer ? 0.5 : 0.42);
                    ctx.save(); ctx.translate(0, cy + s * 0.12); ctx.rotate(a + Math.PI / 2);
                    const g = ctx.createLinearGradient(0, 0, 0, -len);
                    g.addColorStop(0, layer ? '#ffd1e6' : '#f9a8cd'); g.addColorStop(1, '#fff5fa');
                    ctx.fillStyle = g; ctx.strokeStyle = 'rgba(214,88,150,.5)'; ctx.lineWidth = 1;
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(wid * 1.5, -len * 0.25, wid, -len * 0.85, 0, -len); ctx.bezierCurveTo(-wid, -len * 0.85, -wid * 1.5, -len * 0.25, 0, 0); ctx.fill(); ctx.stroke();
                    ctx.restore();
                }
            }
            ctx.fillStyle = '#ffd34d'; ctx.beginPath(); ctx.arc(0, cy + s * 0.04, s * 0.05, 0, TAU); ctx.fill();
        }
    };

    function makeHangers(kind, opts) {
        const n = Math.max(3, Math.round(W / (mob ? 120 : 200)));
        const out = [];
        for (let i = 0; i < n; i++) {
            const big = i % 2 === 0;
            out.push({
                x: (i + 0.5) / n * W + R(-18, 18),
                len: (big ? R(60, 96) : R(26, 58)) * (mob ? 0.65 : 1),
                size: (big ? R(38, 50) : R(28, 38)) * (mob ? 0.75 : 1),
                ph: R(0, TAU), f: R(0.7, 1.2), amp: R(0.05, 0.1),
                o: opts && opts.pick ? opts.pick(i) : opts
            });
        }
        return { draw(ctx, t) {
            for (const it of out) {
                const a = Math.sin(t * it.f + it.ph) * it.amp;
                ctx.save(); ctx.translate(it.x, -2); ctx.rotate(a);
                ctx.strokeStyle = 'rgba(210,170,70,.9)'; ctx.lineWidth = 1.4;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, it.len); ctx.stroke();
                ctx.translate(0, it.len); draw[kind](ctx, it.size, t, it.ph, it.o);
                ctx.restore();
            }
        } };
    }

    // ---------- falling things: petals, snow, confetti, coins ----------
    const spriteCache = new Map();
    function spr(kind, color, size) {
        const key = kind + color + size;
        let s = spriteCache.get(key);
        if (s) return s;
        const d = Math.ceil(size * 1.6) + 6, o = offscreen(d, d, Math.min(DPR, 2)), g = o.g;
        g.translate(d / 2, d / 2);
        if (kind === 'petal') {
            const gr = g.createLinearGradient(0, -size / 2, 0, size / 2);
            gr.addColorStop(0, shade(color, 40)); gr.addColorStop(0.6, color); gr.addColorStop(1, shade(color, -50));
            g.fillStyle = gr; g.beginPath(); g.moveTo(0, size * 0.5);
            g.bezierCurveTo(size * 0.55, size * 0.15, size * 0.4, -size * 0.45, 0, -size * 0.5);
            g.bezierCurveTo(-size * 0.4, -size * 0.45, -size * 0.55, size * 0.15, 0, size * 0.5); g.fill();
            g.strokeStyle = rgba('#000000', 0.12); g.lineWidth = 0.8; g.beginPath(); g.moveTo(0, size * 0.45); g.lineTo(0, -size * 0.4); g.stroke();
        } else if (kind === 'flake') {
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
            gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,.75)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, size / 2, 0, TAU); g.fill();
        } else if (kind === 'crystal') {
            g.strokeStyle = 'rgba(255,255,255,.95)'; g.lineWidth = Math.max(1, size / 14); g.lineCap = 'round';
            g.shadowColor = 'rgba(150,200,255,.9)'; g.shadowBlur = 4;
            for (let i = 0; i < 6; i++) {
                g.save(); g.rotate(i * Math.PI / 3);
                g.beginPath(); g.moveTo(0, 0); g.lineTo(0, -size / 2);
                g.moveTo(0, -size * 0.3); g.lineTo(size * 0.14, -size * 0.42); g.moveTo(0, -size * 0.3); g.lineTo(-size * 0.14, -size * 0.42);
                g.moveTo(0, -size * 0.14); g.lineTo(size * 0.09, -size * 0.22); g.moveTo(0, -size * 0.14); g.lineTo(-size * 0.09, -size * 0.22);
                g.stroke(); g.restore();
            }
        } else if (kind === 'confetti') {
            const gr = g.createLinearGradient(-size / 2, 0, size / 2, 0);
            gr.addColorStop(0, shade(color, 50)); gr.addColorStop(0.5, color); gr.addColorStop(1, shade(color, -50));
            g.fillStyle = gr; g.fillRect(-size * 0.5, -size * 0.2, size, size * 0.4);
        } else if (kind === 'coin') {
            const gr = g.createRadialGradient(-size * 0.15, -size * 0.15, 1, 0, 0, size * 0.55);
            gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#e5b73b'); gr.addColorStop(1, '#8c6516');
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, size * 0.5, 0, TAU); g.fill();
            g.strokeStyle = '#8c6516'; g.lineWidth = 1; g.beginPath(); g.arc(0, 0, size * 0.42, 0, TAU); g.stroke();
            g.fillStyle = 'rgba(80,50,0,.85)'; g.fillRect(-size * 0.11, -size * 0.11, size * 0.22, size * 0.22);
        } else if (kind === 'heart') {
            const gr = g.createRadialGradient(-size * 0.12, -size * 0.12, 1, 0, 0, size * 0.55);
            gr.addColorStop(0, '#ffc2d1'); gr.addColorStop(0.5, color); gr.addColorStop(1, shade(color, -70));
            heartPath(g, size * 1.2); g.fillStyle = gr; g.fill();
        } else if (kind === 'bokeh') {
            const gr = g.createRadialGradient(0, 0, 0, 0, 0, size / 2);
            gr.addColorStop(0, rgba(color, 0.55)); gr.addColorStop(0.8, rgba(color, 0.35)); gr.addColorStop(0.93, rgba(color, 0.6)); gr.addColorStop(1, rgba(color, 0));
            g.fillStyle = gr; g.beginPath(); g.arc(0, 0, size / 2, 0, TAU); g.fill();
        }
        s = { c: o.c, d: d };
        spriteCache.set(key, s);
        return s;
    }

    function makeFlutter(o) {
        const items = [];
        const n = Math.round(o.count * clamp(W * H / (1366 * 768), 0.5, 1.2) * (mob ? 0.6 : 1));
        const make = initial => ({
            kind: o.kinds ? P(o.kinds) : o.kind, color: P(o.colors), size: R(o.size[0], o.size[1]) * (mob ? 0.8 : 1),
            x: R(0, W), y: initial ? R(-20, H) : -R(10, 80), vy: R(o.vy[0], o.vy[1]), vx: R(-o.drift, o.drift),
            rot: R(0, TAU), vr: R(-o.spin, o.spin), ph: R(0, TAU), f: R(0.6, 1.6), amp: R(o.sway * 0.4, o.sway),
            fp: R(0, TAU), fs: R(1.5, 4), flip: !!o.flip, a: R(o.alpha[0], o.alpha[1])
        });
        for (let i = 0; i < n; i++) items.push(make(true));
        return { draw(ctx, t, dt) {
            for (let i = 0; i < items.length; i++) {
                const p = items[i];
                p.y += p.vy * dt; p.x += (p.vx + Math.sin(t * p.f + p.ph) * p.amp) * dt; p.rot += p.vr * dt;
                if (p.y > H + 30 || p.x < -40 || p.x > W + 40) { items[i] = make(false); continue; }
                const s = spr(p.kind, p.color, Math.round(p.size));
                const sx = p.flip ? Math.cos(p.fp + t * p.fs) : 1, c = Math.cos(p.rot), sn = Math.sin(p.rot);
                ctx.globalAlpha = p.a;
                ctx.setTransform(DPR * c * sx, DPR * sn * sx, -DPR * sn, DPR * c, DPR * p.x, DPR * p.y);
                ctx.drawImage(s.c, -s.d / 2, -s.d / 2, s.d, s.d);
            }
            ctx.setTransform(DPR, 0, 0, DPR, 0, 0); ctx.globalAlpha = 1;
        } };
    }

    // drifting glowing motes (fireflies / embers / sparkle)
    function makeMotes(colors, count, o) {
        o = o || {};
        const n = Math.round(count * (mob ? 0.6 : 1)), items = [];
        for (let i = 0; i < n; i++) items.push({ x: R(0, W), y: R(0, H), ph: R(0, TAU), f: R(0.4, 1.3), r: R(o.r ? o.r[0] : 5, o.r ? o.r[1] : 11), c: P(colors), vy: o.rise ? -R(8, 22) : 0, sp: R(10, 30) });
        return { draw(ctx, t, dt) {
            for (const m of items) {
                m.x += Math.sin(t * m.f + m.ph) * m.sp * dt; m.y += (Math.cos(t * m.f * 0.8 + m.ph) * m.sp * 0.5 + m.vy) * dt;
                if (m.y < -20) { m.y = H + 10; m.x = R(0, W); }
                if (m.x < -20) m.x = W + 10; if (m.x > W + 20) m.x = -10;
                const a = 0.25 + 0.75 * Math.pow(0.5 + 0.5 * Math.sin(t * m.f * 2 + m.ph), 2);
                glow(ctx, m.x, m.y, m.r * 3, m.c, a * 0.8);
                if (o.star && a > 0.7) star4(ctx, m.x, m.y, m.r * 1.3, '#ffffff', (a - 0.7) * 2.4);
            }
        } };
    }

    // ---------- string of fairy lights (Christmas) ----------
    function makeFairyLights() {
        const rows = [], arcW = mob ? 180 : 230, arcs = Math.ceil(W / arcW) + 1;
        const cols = ['#ff4a4a', '#ffd35a', '#52e08a', '#69b7ff', '#fff1c4'];
        let idx = 0;
        for (let k = 0; k < arcs; k++) for (let j = 0; j < 6; j++) {
            const u = (j + 0.5) / 6;
            rows.push({ x: k * arcW + u * arcW, y: 3 + 5 + 62 * u * (1 - u) * 1.0, c: cols[idx % cols.length], i: idx++ });
        }
        return { draw(ctx, t) {
            ctx.strokeStyle = '#1d3a24'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 3);
            for (let k = 0; k < arcs; k++) ctx.quadraticCurveTo(k * arcW + arcW / 2, 3 + 62 * 0.5 * 1.0 + 8, (k + 1) * arcW, 3);
            ctx.stroke();
            const mode = Math.floor(t / 9) % 3;
            for (const b of rows) {
                let lv;
                if (mode === 0) lv = 0.7 + 0.3 * Math.sin(t * 2 + b.i * 0.9);
                else if (mode === 1) lv = Math.sin(t * 3 - b.i * 0.5) > 0.2 ? 1 : 0.35;
                else lv = 0.55 + 0.45 * Math.sin(t * 1.3 + (b.i % 2) * Math.PI);
                ctx.fillStyle = '#26382b'; ctx.fillRect(b.x - 2.5, b.y - 5, 5, 6);
                const g = ctx.createRadialGradient(b.x - 2, b.y + 4, 1, b.x, b.y + 7, 9);
                g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, b.c); g.addColorStop(1, shade(b.c, -90));
                ctx.globalAlpha = 0.45 + 0.55 * lv; ctx.fillStyle = g;
                ctx.beginPath(); ctx.ellipse(b.x, b.y + 8, 4.2, 6.5, 0, 0, TAU); ctx.fill(); ctx.globalAlpha = 1;
                glow(ctx, b.x, b.y + 8, 22 + 6 * lv, b.c, 0.5 * lv);
            }
        } };
    }

    // ---------- flower garland (Thaipusam) and bunting (Grand Opening / National Day) ----------
    function flowerSprite(c1, c2) {
        const d = 30, o = offscreen(d, d, Math.min(DPR, 2)), g = o.g;
        g.translate(d / 2, d / 2);
        for (let ring = 0; ring < 2; ring++) for (let i = 0; i < 9; i++) {
            g.save(); g.rotate(i * TAU / 9 + ring * 0.35);
            const gr = g.createRadialGradient(0, -4, 1, 0, -6, 12); gr.addColorStop(0, ring ? c2 : c1); gr.addColorStop(1, shade(ring ? c2 : c1, -45));
            g.fillStyle = gr; g.beginPath(); g.ellipse(0, -(ring ? 6 : 9), ring ? 3.4 : 3.8, ring ? 5 : 6, 0, 0, TAU); g.fill(); g.restore();
        }
        g.fillStyle = '#8a4b00'; g.beginPath(); g.arc(0, 0, 2.2, 0, TAU); g.fill();
        return o.c;
    }
    function makeGarland() {
        const sprites = [flowerSprite('#ff9800', '#ffc107'), flowerSprite('#ffb300', '#ff7a00'), flowerSprite('#ffc107', '#ff9800')];
        const arcW = mob ? 170 : 240, arcs = Math.ceil(W / arcW) + 1, fl = [];
        for (let k = 0; k < arcs; k++) for (let j = 0; j < (mob ? 8 : 12); j++) fl.push({ k: k, u: (j + 0.5) / (mob ? 8 : 12), s: sprites[(k + j) % 3], r: R(0, TAU) });
        return { draw(ctx, t) {
            for (const f of fl) {
                const x = f.k * arcW + f.u * arcW, sag = 52 + Math.sin(t * 0.8 + f.k) * 3;
                const y = 6 + sag * 4 * f.u * (1 - f.u);
                ctx.save(); ctx.translate(x, y + Math.sin(t * 1.2 + f.k * 2 + f.u * 6) * 1.2); ctx.rotate(f.r);
                ctx.shadowColor = 'rgba(0,0,0,.25)'; ctx.shadowBlur = 3;
                ctx.drawImage(f.s, -13, -13, 26, 26); ctx.restore();
            }
            ctx.shadowBlur = 0; ctx.shadowColor = 'transparent';
        } };
    }
    function makeBunting(colors) {
        const arcW = mob ? 200 : 300, arcs = Math.ceil(W / arcW) + 1, pens = [];
        for (let k = 0; k < arcs; k++) for (let j = 0; j < 6; j++) pens.push({ k: k, u: (j + 0.5) / 6, c: colors[(k * 6 + j) % colors.length] });
        const yAt = (k, u) => 4 + 42 * 4 * u * (1 - u);
        return { draw(ctx, t) {
            ctx.strokeStyle = 'rgba(70,50,20,.8)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 4);
            for (let k = 0; k < arcs; k++) ctx.quadraticCurveTo(k * arcW + arcW / 2, 4 + 42 * 2, (k + 1) * arcW, 4); ctx.stroke();
            for (const p of pens) {
                const x = p.k * arcW + p.u * arcW, y = yAt(p.k, p.u), sw = Math.sin(t * 1.6 + p.k + p.u * 9) * 0.12, sl = mob ? 20 : 26;
                ctx.save(); ctx.translate(x, y); ctx.rotate(sw);
                const g = ctx.createLinearGradient(-sl / 2, 0, sl / 2, sl);
                g.addColorStop(0, shade(p.c, 35)); g.addColorStop(1, shade(p.c, -45));
                ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-sl / 2, 0); ctx.lineTo(sl / 2, 0); ctx.lineTo(0, sl * 1.25); ctx.closePath(); ctx.fill();
                ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1; ctx.stroke(); ctx.restore();
            }
        } };
    }

    // ---------- waving Jalur Gemilang ----------
    function makeFlag(fw) {
        const fh = fw / 2, o = offscreen(fw, fh, Math.min(DPR, 2)), g = o.g, sh = fh / 14;
        for (let i = 0; i < 14; i++) { g.fillStyle = i % 2 ? '#ffffff' : '#cc0001'; g.fillRect(0, i * sh, fw, sh + 0.5); }
        g.fillStyle = '#010066'; g.fillRect(0, 0, fw / 2, sh * 8);
        const cx = fw / 4 - fw * 0.02, cy = sh * 4;
        g.fillStyle = '#ffcc00'; g.beginPath(); g.arc(cx, cy, sh * 2.6, 0, TAU); g.fill();
        g.fillStyle = '#010066'; g.beginPath(); g.arc(cx + sh * 0.75, cy, sh * 2.15, 0, TAU); g.fill();
        g.fillStyle = '#ffcc00'; g.beginPath();
        for (let i = 0; i < 28; i++) { const r = i % 2 ? sh * 0.95 : sh * 2.15, a = i * Math.PI / 14 - Math.PI / 2; g[i ? 'lineTo' : 'moveTo'](cx + sh * 2.6 + Math.cos(a) * r, cy + Math.sin(a) * r); }
        g.fill();
        return o;
    }
    function drawFlag(ctx, f, x, y, t, mirror) {
        const fw = f.w, fh = f.h, step = 2, scale = f.c.width / fw;
        ctx.strokeStyle = goldGrad(ctx, x - 3, y, x + 3, y); ctx.lineWidth = 5; ctx.lineCap = 'round';
        const px = x;
        const pg = ctx.createLinearGradient(px - 3, 0, px + 3, 0); pg.addColorStop(0, '#8a6a1c'); pg.addColorStop(0.5, '#f3d878'); pg.addColorStop(1, '#8a6a1c');
        ctx.strokeStyle = pg; ctx.beginPath(); ctx.moveTo(px, y - 12); ctx.lineTo(px, y + fh + 14); ctx.stroke();
        ctx.fillStyle = goldGrad(ctx, px - 5, y - 18, px + 5, y - 8); ctx.beginPath(); ctx.arc(px, y - 14, 5, 0, TAU); ctx.fill();
        for (let sx = 0; sx < fw; sx += step) {
            const u = sx / fw, ux = u, amp = 3 + ux * (fw * 0.07);
            const dy = Math.sin(ux * 8 - t * 3.2) * amp * ux, sl = Math.cos(ux * 8 - t * 3.2) * ux;
            const dx = sx;
            ctx.drawImage(f.c, sx * scale, 0, step * scale, f.c.height, x + dx, y + dy, step + 0.6, fh);
            ctx.fillStyle = sl > 0 ? 'rgba(0,0,0,' + (sl * 0.22).toFixed(3) + ')' : 'rgba(255,255,255,' + (-sl * 0.2).toFixed(3) + ')';
            ctx.fillRect(x + dx, y + dy, step + 0.6, fh);
        }
    }

    // ---------- rangoli: coloured powder, outlined in white dots ----------
    const POWDER = {
        pink: ['#e91e63', '#f06292', '#c2185b'], orange: ['#ff9800', '#fb8c00', '#ffa726'], yellow: ['#ffd54f', '#ffca28', '#fbc02d'],
        white: ['#ffffff', '#f6f6f6', '#ececec'], green: ['#2e7d32', '#43a047', '#66bb6a'], blue: ['#1565c0', '#1e88e5', '#42a5f5'],
        purple: ['#6a1b9a', '#8e24aa', '#ab47bc'], red: ['#c62828', '#e53935', '#ef5350']
    };
    function petalPts(cx, cy, ang, r0, len, wid) {
        const pts = [], ca = Math.cos(ang), sa = Math.sin(ang);
        const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
        const add = (lx, ly) => pts.push([cx + lx * ca - ly * sa, cy + lx * sa + ly * ca]);
        for (let i = 0; i <= 12; i++) { const t = i / 12; add(bez(r0, r0 + len * 0.3, r0 + len * 0.8, r0 + len, t), bez(0, -wid, -wid, 0, t)); }
        for (let i = 1; i < 12; i++) { const t = i / 12; add(bez(r0 + len, r0 + len * 0.8, r0 + len * 0.3, r0, t), bez(0, wid, wid, 0, t)); }
        return pts;
    }
    function powderFill(g, pts, palette, density) {
        let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
        pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
        g.save(); polyPath(g, pts); g.fillStyle = shade(palette[2], -10); g.fill(); g.clip();
        const n = Math.round((x1 - x0) * (y1 - y0) * density);
        for (let i = 0; i < n; i++) {
            g.fillStyle = shade(P(palette), R(-18, 14)); g.beginPath(); g.arc(R(x0, x1), R(y0, y1), R(0.7, 1.5), 0, TAU); g.fill();
        }
        g.restore();
    }
    function powderLine(g, pts, color, step, r) {
        for (let i = 0; i < pts.length; i++) {
            const a = pts[i], b = pts[(i + 1) % pts.length], d = Math.hypot(b[0] - a[0], b[1] - a[1]), n = Math.max(1, Math.round(d / step));
            for (let k = 0; k < n; k++) {
                const u = k / n, x = a[0] + (b[0] - a[0]) * u + R(-0.5, 0.5), y = a[1] + (b[1] - a[1]) * u + R(-0.5, 0.5);
                g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.arc(x + 0.6, y + 0.8, r, 0, TAU); g.fill();
                g.fillStyle = shade(color, R(-10, 6)); g.beginPath(); g.arc(x, y, r * R(0.85, 1.1), 0, TAU); g.fill();
            }
        }
    }
    function powderDot(g, x, y, r, color) {
        g.fillStyle = 'rgba(0,0,0,.2)'; g.beginPath(); g.arc(x + 0.8, y + 1, r, 0, TAU); g.fill();
        const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.35, r * 0.1, x, y, r);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.4, color); gr.addColorStop(1, shade(color, -40));
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, TAU); g.fill();
    }
    function buildRangoli(size) {
        const sc = Math.min(DPR, 1.5), o = offscreen(size, size, sc), g = o.g, C = size / 2, U = size * 0.4;
        g.translate(C, C);
        // swept floor and a soft shadow ring
        const fl = g.createRadialGradient(0, 0, U * 0.2, 0, 0, U * 1.12);
        fl.addColorStop(0, 'rgba(70,50,30,.10)'); fl.addColorStop(0.9, 'rgba(70,50,30,.14)'); fl.addColorStop(1, 'rgba(70,50,30,0)');
        g.fillStyle = fl; g.beginPath(); g.arc(0, 0, U * 1.12, 0, TAU); g.fill();
        const ringOfPetals = (n, r0, len, wid, pal, rot, outline) => {
            for (let i = 0; i < n; i++) {
                const pts = petalPts(0, 0, rot + i * TAU / n, r0 * U, len * U, wid * U);
                powderFill(g, pts, POWDER[Array.isArray(pal) ? pal[i % pal.length] : pal], 0.2);
                if (outline) powderLine(g, pts, '#ffffff', 3.2, 1.15);
            }
        };
        // 1 outer scalloped border
        ringOfPetals(36, 0.86, 0.12, 0.052, ['red', 'yellow'], 0, true);
        // 2 white dot garland
        for (let i = 0; i < 90; i++) { const a = i * TAU / 90; powderDot(g, Math.cos(a) * 0.835 * U, Math.sin(a) * 0.835 * U, 1.9, '#ffffff'); }
        // 3 leaf ring
        for (let i = 0; i < 24; i++) {
            const a = i * TAU / 24 + TAU / 48, r1 = 0.62 * U, r2 = 0.8 * U, w = 0.075 * U;
            const ca = Math.cos(a), sa = Math.sin(a), pts = [[ca * r1, sa * r1], [ca * (r1 + r2) / 2 - sa * w, sa * (r1 + r2) / 2 + ca * w], [ca * r2, sa * r2], [ca * (r1 + r2) / 2 + sa * w, sa * (r1 + r2) / 2 - ca * w]];
            powderFill(g, pts, POWDER[i % 2 ? 'blue' : 'green'], 0.22); powderLine(g, pts, '#ffffff', 3, 1.05);
            powderDot(g, ca * (r2 + 5), sa * (r2 + 5), 2.1, '#ffd54f');
        }
        // 4 big lotus petals
        ringOfPetals(16, 0.34, 0.3, 0.085, ['orange', 'purple'], 0, true);
        ringOfPetals(16, 0.34, 0.15, 0.04, ['yellow', 'pink'], 0, false);
        // 5 inner dots and petals
        for (let i = 0; i < 40; i++) { const a = i * TAU / 40; powderDot(g, Math.cos(a) * 0.315 * U, Math.sin(a) * 0.315 * U, 1.6, '#ffffff'); }
        ringOfPetals(8, 0.1, 0.2, 0.075, ['pink', 'red'], TAU / 16, true);
        // 6 centre
        const cc = [[0, -0.1 * U], [0.03 * U, -0.03 * U], [0.1 * U, 0], [0.03 * U, 0.03 * U], [0, 0.1 * U], [-0.03 * U, 0.03 * U], [-0.1 * U, 0], [-0.03 * U, -0.03 * U]];
        powderFill(g, cc, POWDER.yellow, 0.3); powderLine(g, cc, '#ffffff', 3, 1.1); powderDot(g, 0, 0, 4, '#ff9800');
        // diya bowls around the edge (flames are animated separately)
        const diyas = [];
        for (let i = 0; i < 12; i++) {
            const a = i * TAU / 12 + TAU / 24, x = Math.cos(a) * U * 1.0, y = Math.sin(a) * U * 1.0;
            g.save(); g.translate(x, y);
            const bg = g.createLinearGradient(0, -6, 0, 8); bg.addColorStop(0, '#d98a4e'); bg.addColorStop(0.5, '#b5532a'); bg.addColorStop(1, '#6e2c10');
            g.fillStyle = 'rgba(0,0,0,.28)'; g.beginPath(); g.ellipse(2, 7, 12, 4, 0, 0, TAU); g.fill();
            g.fillStyle = bg; g.beginPath(); g.moveTo(-10, -2); g.quadraticCurveTo(-9, 8, 0, 8); g.quadraticCurveTo(9, 8, 10, -2); g.quadraticCurveTo(0, 2, -10, -2); g.fill();
            g.fillStyle = '#ffc45a'; g.beginPath(); g.ellipse(0, -2, 9, 3, 0, 0, TAU); g.fill();
            g.fillStyle = '#3a1a08'; g.fillRect(-0.8, -5, 1.6, 4);
            g.restore();
            diyas.push([x, y - 5]);
        }
        return { c: o.c, size: size, diyas: diyas };
    }
    function makeRangoliScene() {
        const big = Math.round(clamp(Math.min(W, H) * 1.02, 340, 1000)), small = Math.round(big * 0.62);
        const rg = buildRangoli(big);
        const spots = [
            { x: W * 0.07, y: H * 0.9, s: big, rot: -0.25, a: 0.95 },
            { x: W * 0.95, y: H * 0.14, s: small, rot: 0.5, a: 0.85 }
        ];
        const glints = []; for (let i = 0; i < 26; i++) glints.push({ sp: Math.floor(R(0, 2)), r: R(0.05, 0.9), a: R(0, TAU), ph: R(0, TAU), f: R(0.6, 1.8) });
        const flickers = spots.map(() => rg.diyas.map(() => ({ ph: R(0, TAU), f: R(5, 9) })));
        return { back(ctx, t) {
            spots.forEach((sp, si) => {
                ctx.save(); ctx.translate(sp.x, sp.y); ctx.rotate(sp.rot); ctx.globalAlpha = sp.a;
                ctx.drawImage(rg.c, -sp.s / 2, -sp.s / 2, sp.s, sp.s);
                ctx.globalAlpha = 1;
                const k = sp.s / rg.size;
                rg.diyas.forEach((d, i) => {
                    const fl = flickers[si][i], fx = d[0] * k, fy = d[1] * k;
                    const h = (11 + Math.sin(t * fl.f + fl.ph) * 2.5 + Math.sin(t * fl.f * 2.3) * 1.5) * k * (sp.s > 500 ? 1 : 0.9);
                    const sw = Math.sin(t * 3 + fl.ph) * 1.8 * k;
                    glow(ctx, fx, fy - h * 0.4, 44 * k, '#ff9a2e', 0.55);
                    const g = ctx.createRadialGradient(fx + sw * 0.3, fy - h * 0.2, 0.5, fx + sw * 0.3, fy - h * 0.35, h);
                    g.addColorStop(0, '#fffbe0'); g.addColorStop(0.3, '#ffd45a'); g.addColorStop(0.7, '#ff8a1f'); g.addColorStop(1, 'rgba(255,90,0,0)');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(fx - 3.4 * k, fy);
                    ctx.quadraticCurveTo(fx - 4.2 * k + sw * 0.2, fy - h * 0.55, fx + sw, fy - h);
                    ctx.quadraticCurveTo(fx + 4.2 * k + sw * 0.2, fy - h * 0.55, fx + 3.4 * k, fy); ctx.closePath(); ctx.fill();
                });
                // powder glints
                glints.filter(g2 => g2.sp === si).forEach(gl => {
                    const rr = gl.r * sp.s * 0.4, a = 0.5 + 0.5 * Math.sin(t * gl.f + gl.ph);
                    if (a > 0.82) star4(ctx, Math.cos(gl.a) * rr, Math.sin(gl.a) * rr, 7 * (sp.s / big + 0.4), '#ffffff', (a - 0.82) * 5);
                });
                ctx.restore();
            });
        } };
    }

    // ---------- the dragon ----------
    function makeDragon() {
        const N = mob ? 44 : 62, sp = clamp(W / 48, 13, 27);
        const body = []; for (let i = 0; i < N; i++) body.push({ x: -80 - i * sp, y: H * 0.25 });
        const hd = { x: -60, y: H * 0.25, a: 0.2 };
        let way = { x: W * 0.5, y: H * 0.5 }, clouds = [], cloudT = 0, wob = R(0, 9);
        const nextWay = () => {
            const out = Math.random() < 0.18;
            if (out) { const side = P([0, 1, 2, 3]); way = side === 0 ? { x: -R(120, 260), y: R(0, H) } : side === 1 ? { x: W + R(120, 260), y: R(0, H) } : side === 2 ? { x: R(0, W), y: -R(80, 160) } : { x: R(0, W), y: H + R(80, 160) }; }
            else for (let k = 0; k < 8; k++) { way = { x: R(W * 0.06, W * 0.94), y: R(H * 0.08, H * 0.92) }; if (Math.hypot(way.x - hd.x, way.y - hd.y) > Math.min(W, H) * 0.45) break; }
        };
        nextWay();
        const colBody = '#c1121f', colDark = '#5c0a10';
        function seg(ctx, i, t) {
            const p = body[i], q = body[Math.max(0, i - 1)], r = body[Math.min(N - 1, i + 1)];
            const a = Math.atan2(q.y - r.y, q.x - r.x), u = i / (N - 1);
            const prof = u < 0.12 ? 0.85 + u * 1.2 : 1 - Math.pow((u - 0.12) / 0.88, 1.15) * 0.94;
            const th = Math.max(1.8, sp * 0.95 * prof), fl = Math.cos(a) < 0 ? -1 : 1;
            ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.scale(1, fl);
            // fin
            const fin = th * 0.9 + 2 + (i % 2) * 1.5;
            const fg = ctx.createLinearGradient(0, -th, 0, -th - fin); fg.addColorStop(0, '#ffb703'); fg.addColorStop(1, '#fff1a8');
            ctx.fillStyle = fg; ctx.beginPath(); ctx.moveTo(sp * 0.55, -th * 0.85); ctx.quadraticCurveTo(sp * 0.1, -th - fin * 0.6, -sp * 0.7 + Math.sin(t * 5 - i * 0.4) * 1.2, -th - fin); ctx.lineTo(-sp * 0.6, -th * 0.85); ctx.closePath(); ctx.fill();
            // legs
            if (i === 14 || i === 24 || i === 38 || i === 47) {
                const sw = Math.sin(t * 4 + i) * 0.4;
                ctx.save(); ctx.translate(0, th * 0.7); ctx.strokeStyle = colDark; ctx.lineWidth = Math.max(2, th * 0.38); ctx.lineCap = 'round';
                const l1 = sp * 1.5, l2 = sp * 1.3, k1 = 1.1 + sw, k2 = 0.2 - sw * 0.8;
                const kx = Math.cos(k1) * l1, ky = Math.sin(k1) * l1, fx = kx + Math.cos(k1 + k2) * l2, fy = ky + Math.sin(k1 + k2) * l2;
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
                ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5;
                for (let c = -1; c <= 1; c++) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + c * 4, fy + 4, fx + c * 6 + 2, fy + 8); ctx.stroke(); }
                ctx.restore();
            }
            // body
            const bg = ctx.createLinearGradient(0, -th, 0, th);
            bg.addColorStop(0, '#ff5d5d'); bg.addColorStop(0.35, colBody); bg.addColorStop(1, '#6b0a14');
            ctx.fillStyle = bg; ctx.strokeStyle = 'rgba(60,0,8,.65)'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.ellipse(0, 0, sp * 0.95, th, 0, 0, TAU); ctx.fill(); ctx.stroke();
            const belly = ctx.createLinearGradient(0, th * 0.1, 0, th); belly.addColorStop(0, '#ffe08a'); belly.addColorStop(1, '#d99a1c');
            ctx.fillStyle = belly; ctx.beginPath(); ctx.ellipse(0, th * 0.55, sp * 0.78, th * 0.42, 0, 0, TAU); ctx.fill();
            ctx.strokeStyle = 'rgba(255,214,120,.65)'; ctx.lineWidth = 1.2;
            ctx.beginPath(); ctx.arc(sp * 0.15, -th * 0.05, th * 0.62, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
            ctx.restore();
        }
        function head(ctx, t) {
            const u = sp * 0.82, fl = Math.cos(hd.a) < 0 ? -1 : 1;
            ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(hd.a); ctx.scale(u, u * fl);
            // mane
            for (let k = 0; k < 7; k++) {
                const bx = -1.6 - k * 1.5, by = -2.2 + k * 0.1, len = 4.8 - k * 0.35, w = Math.sin(t * 6 - k * 0.8) * 1.4;
                const mg = ctx.createLinearGradient(bx, by, bx - len, by - len * 0.6); mg.addColorStop(0, '#ff7b00'); mg.addColorStop(1, '#ffe27a');
                ctx.fillStyle = mg; ctx.beginPath(); ctx.moveTo(bx + 1, by); ctx.quadraticCurveTo(bx - len * 0.5, by - len * 0.9 + w, bx - len - 0.8, by - len * 0.3 + w * 1.5); ctx.quadraticCurveTo(bx - len * 0.5, by - 0.5, bx - 1, by + 0.4); ctx.closePath(); ctx.fill();
            }
            // antlers
            ctx.strokeStyle = '#f7d774'; ctx.lineCap = 'round'; ctx.lineWidth = 0.55;
            for (const o of [0, 0.7]) {
                ctx.beginPath(); ctx.moveTo(0.2 - o, -1.8); ctx.quadraticCurveTo(-1.8 - o, -3.2, -3.4 - o + Math.sin(t * 3) * 0.2, -3.0 - o * 0.5); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(-1.2 - o, -2.7); ctx.quadraticCurveTo(-1.5 - o, -3.6, -2.0 - o, -4.0); ctx.stroke();
            }
            // lower jaw
            const jaw = 0.22 + Math.sin(t * 2.2) * 0.04;
            ctx.save(); ctx.translate(0.2, 0.3); ctx.rotate(jaw);
            ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.moveTo(0, -0.3); ctx.lineTo(4.2, -0.3); ctx.lineTo(4.4, 0.4); ctx.lineTo(0, 0.6); ctx.fill();
            const jg = ctx.createLinearGradient(0, 0, 0, 1.4); jg.addColorStop(0, '#d92a3a'); jg.addColorStop(1, '#7a0b16');
            ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(-0.4, 0.1); ctx.lineTo(4.1, 0.1); ctx.bezierCurveTo(4.3, 0.5, 3.4, 1.1, 1.8, 1.2); ctx.bezierCurveTo(0.6, 1.2, -0.2, 1.0, -0.6, 0.6); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fffbea'; for (let x = 0.8; x < 4; x += 0.9) { ctx.beginPath(); ctx.moveTo(x, 0.1); ctx.lineTo(x + 0.28, 0.1); ctx.lineTo(x + 0.14, -0.55); ctx.fill(); }
            // beard
            ctx.strokeStyle = '#ffe9a3'; ctx.lineWidth = 0.25;
            for (let b = 0; b < 5; b++) { ctx.beginPath(); ctx.moveTo(1.4 + b * 0.2, 1.1); ctx.quadraticCurveTo(0.4 - b * 0.3, 2.6 + Math.sin(t * 4 + b) * 0.4, -1.0 - b * 0.4, 2.8 + b * 0.35 + Math.sin(t * 3.5 + b) * 0.5); ctx.stroke(); }
            ctx.restore();
            // upper jaw / snout
            const ug = ctx.createLinearGradient(0, -1.8, 0, 0.4); ug.addColorStop(0, '#ff5a5f'); ug.addColorStop(0.5, '#c1121f'); ug.addColorStop(1, '#7a0b16');
            ctx.fillStyle = ug; ctx.strokeStyle = 'rgba(60,0,8,.7)'; ctx.lineWidth = 0.18;
            ctx.beginPath(); ctx.moveTo(-1.1, -1.0); ctx.bezierCurveTo(0.4, -2.0, 2.4, -1.7, 3.8, -1.0); ctx.bezierCurveTo(4.5, -0.9, 5.1, -0.7, 5.2, -0.25); ctx.bezierCurveTo(5.2, 0.15, 4.6, 0.25, 4.1, 0.2); ctx.lineTo(0.4, 0.2); ctx.bezierCurveTo(-0.4, 0.3, -1.1, 0.0, -1.3, -0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.fillStyle = '#fffbea'; ctx.beginPath(); ctx.moveTo(3.8, 0.2); ctx.lineTo(4.15, 0.2); ctx.lineTo(3.98, 1.0); ctx.fill();
            ctx.fillStyle = '#3a0008'; ctx.beginPath(); ctx.ellipse(4.7, -0.55, 0.22, 0.14, -0.3, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#8a0e1b'; ctx.lineWidth = 0.28; ctx.beginPath(); ctx.moveTo(0.1, -1.55); ctx.quadraticCurveTo(1.1, -1.25, 1.9, -1.5); ctx.stroke();
            // eye
            glow(ctx, 1.0, -0.75, 2.4, '#ffcc33', 0.8);
            ctx.fillStyle = '#fff1a8'; ctx.beginPath(); ctx.ellipse(1.0, -0.75, 0.46, 0.32, -0.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#2a0008'; ctx.beginPath(); ctx.ellipse(1.1, -0.75, 0.13, 0.28, 0, 0, TAU); ctx.fill();
            // whiskers
            ctx.strokeStyle = '#ffe9a3'; ctx.lineWidth = 0.22;
            for (const s2 of [-1, 1]) {
                ctx.beginPath();
                for (let k = 0; k <= 22; k++) {
                    const x = 4.6 - k * 0.55, y = -0.1 + s2 * (0.4 + k * 0.17) + Math.sin(t * 5 - k * 0.45) * 0.4 * (k / 11);
                    ctx[k ? 'lineTo' : 'moveTo'](x, y);
                }
                ctx.stroke();
            }
            // pearl
            const px = 7.6, py = -0.4 + Math.sin(t * 3) * 0.5;
            glow(ctx, px, py, 7, '#ffd966', 0.9);
            const pg = ctx.createRadialGradient(px - 0.4, py - 0.4, 0.1, px, py, 1.5); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#ffe28a'); pg.addColorStop(1, '#d99a1c');
            ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 1.5, 0, TAU); ctx.fill();
            ctx.restore();
        }
        return { front(ctx, t, dt) {
            // steer
            const dxw = way.x - hd.x, dyw = way.y - hd.y;
            if (Math.hypot(dxw, dyw) < 130) nextWay();
            if ((hd.x < -420 || hd.x > W + 420 || hd.y < -420 || hd.y > H + 420)) { way = { x: R(W * 0.2, W * 0.8), y: R(H * 0.2, H * 0.8) }; }
            const want = Math.atan2(way.y - hd.y, way.x - hd.x), diff = wrapA(want - hd.a);
            hd.a += clamp(diff, -1.5 * dt, 1.5 * dt) + Math.sin(t * 2.1 + wob) * 0.55 * dt;
            const v = clamp(W * 0.17, 150, 250) * (0.9 + 0.2 * Math.sin(t * 0.9));
            hd.x += Math.cos(hd.a) * v * dt; hd.y += Math.sin(hd.a) * v * dt;
            body[0].x = hd.x; body[0].y = hd.y;
            for (let i = 1; i < N; i++) {
                const a = body[i - 1], b = body[i], dx = a.x - b.x, dy = a.y - b.y, d = Math.hypot(dx, dy) || 1;
                b.x = a.x - dx / d * sp; b.y = a.y - dy / d * sp;
            }
            // clouds trailing the dragon
            cloudT -= dt;
            if (cloudT <= 0) { cloudT = 0.07; const b = body[Math.floor(R(2, N * 0.8))]; clouds.push({ x: b.x, y: b.y, r: R(14, 30), life: 1, vx: R(-14, 14), vy: R(-10, 6) }); }
            for (let i = clouds.length - 1; i >= 0; i--) {
                const c = clouds[i]; c.life -= dt * 0.5; c.x += c.vx * dt; c.y += c.vy * dt; c.r += dt * 8;
                if (c.life <= 0) { clouds.splice(i, 1); continue; }
                glow(ctx, c.x, c.y, c.r, '#fff3c4', c.life * 0.22);
            }
            // serpentine swimming motion: the drawn body ripples sideways while the chain follows the head
            const real = body.map(b => ({ x: b.x, y: b.y }));
            for (let i = 1; i < N; i++) {
                const q = real[Math.max(0, i - 1)], r2 = real[Math.min(N - 1, i + 1)], a = Math.atan2(q.y - r2.y, q.x - r2.x);
                const off = Math.sin(i * 0.3 - t * 4) * sp * 0.75 * Math.min(1, i / 8);
                body[i].dx = Math.cos(a + Math.PI / 2) * off; body[i].dy = Math.sin(a + Math.PI / 2) * off;
            }
            const keep = body.map(b => ({ x: b.x, y: b.y }));
            for (let i = 1; i < N; i++) { body[i].x += body[i].dx; body[i].y += body[i].dy; }
            for (let i = N - 1; i >= 1; i--) seg(ctx, i, t);
            for (let i = 1; i < N; i++) { body[i].x = keep[i].x; body[i].y = keep[i].y; }
            // sparkles in the wake
            if (Math.random() < 0.5) { const b = body[Math.floor(R(0, N * 0.6))]; star4(ctx, b.x + R(-8, 8), b.y + R(-8, 8), R(3, 7), '#ffe27a', 0.9); }
            head(ctx, t);
        } };
    }

    // ---------- scenery behind the page ----------
    function bandSprite(color) {
        const key = 'band' + color; let s = spriteCache.get(key);
        if (s) return s;
        const o = offscreen(8, 256, 1), g = o.g, gr = g.createLinearGradient(0, 0, 0, 256);
        gr.addColorStop(0, rgba(color, 0)); gr.addColorStop(0.3, rgba(color, 0.55)); gr.addColorStop(1, rgba(color, 0));
        g.fillStyle = gr; g.fillRect(0, 0, 8, 256);
        s = { c: o.c }; spriteCache.set(key, s); return s;
    }
    function makeAurora() {
        const cols = ['#4dffb0', '#5ad1ff', '#b388ff'];
        return { back(ctx, t) {
            ctx.globalCompositeOperation = 'lighter';
            cols.forEach((c, b) => {
                const s = bandSprite(c); ctx.globalAlpha = 0.16;
                for (let x = 0; x < W; x += 6) {
                    const y = H * (0.02 + b * 0.05) + Math.sin(x * 0.004 + t * 0.25 + b * 1.7) * H * 0.045 + Math.sin(x * 0.011 - t * 0.4) * H * 0.012;
                    ctx.drawImage(s.c, x, y, 6.5, H * (0.26 + 0.04 * Math.sin(x * 0.01 + t * 0.5 + b)));
                }
            });
            ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
        } };
    }
    function makeBokeh(colors, count, alpha) {
        const items = [];
        for (let i = 0; i < Math.round(count * (mob ? 0.6 : 1)); i++) items.push({ x: R(0, W), y: R(0, H), r: R(24, 90), c: P(colors), ph: R(0, TAU), f: R(0.05, 0.2), sp: R(2, 8), a: R(alpha * 0.5, alpha) });
        return { back(ctx, t, dt) {
            for (const b of items) {
                b.x += b.sp * dt; if (b.x > W + 100) b.x = -100;
                const s = spr('bokeh', b.c, Math.round(b.r)); ctx.globalAlpha = b.a * (0.7 + 0.3 * Math.sin(t * b.f * 3 + b.ph));
                ctx.drawImage(s.c, b.x - s.d / 2, b.y + Math.sin(t * b.f + b.ph) * 14 - s.d / 2, s.d, s.d);
            }
            ctx.globalAlpha = 1;
        } };
    }
    function makeMoon(x, y, r) {
        const o = offscreen(r * 5, r * 5, Math.min(DPR, 2)), g = o.g, c = r * 2.5;
        const halo = g.createRadialGradient(c, c, r * 0.9, c, c, r * 2.5); halo.addColorStop(0, 'rgba(255,238,180,.55)'); halo.addColorStop(0.4, 'rgba(255,230,160,.18)'); halo.addColorStop(1, 'rgba(255,230,160,0)');
        g.fillStyle = halo; g.fillRect(0, 0, r * 5, r * 5);
        const mg = g.createRadialGradient(c - r * 0.3, c - r * 0.3, r * 0.1, c, c, r);
        mg.addColorStop(0, '#fffdf0'); mg.addColorStop(0.6, '#fbeeb8'); mg.addColorStop(1, '#e2cc86');
        g.fillStyle = mg; g.beginPath(); g.arc(c, c, r, 0, TAU); g.fill();
        [[-0.35, -0.2, 0.22], [0.25, -0.35, 0.15], [0.3, 0.2, 0.26], [-0.25, 0.35, 0.14], [0.0, 0.0, 0.1], [-0.55, 0.05, 0.1]].forEach(m => {
            const cg = g.createRadialGradient(c + m[0] * r, c + m[1] * r, 1, c + m[0] * r, c + m[1] * r, m[2] * r); cg.addColorStop(0, 'rgba(160,130,60,.38)'); cg.addColorStop(1, 'rgba(160,130,60,.02)');
            g.fillStyle = cg; g.beginPath(); g.arc(c + m[0] * r, c + m[1] * r, m[2] * r, 0, TAU); g.fill();
        });
        return { back(ctx, t) { ctx.globalAlpha = 0.9 + 0.1 * Math.sin(t * 0.6); ctx.drawImage(o.c, x - r * 2.5, y - r * 2.5, r * 5, r * 5); ctx.globalAlpha = 1; } };
    }
    function makeStars(n, colors) {
        const st = []; for (let i = 0; i < Math.round(n * (mob ? 0.6 : 1)); i++) st.push({ x: R(0, W), y: R(6, mob ? 90 : 128), ph: R(0, TAU), f: R(0.6, 2.2), r: R(2, 6), c: P(colors) });
        return { front(ctx, t) { for (const s of st) { const a = 0.5 + 0.5 * Math.sin(t * s.f + s.ph); if (a > 0.45) star4(ctx, s.x, s.y, s.r * (0.5 + a * 0.7), s.c, (a - 0.45) * 1.5); } } };
    }
    function makeCrescent(x, y, r) {
        return { back(ctx, t) {
            glow(ctx, x, y, r * 3.2, '#ffe9a0', 0.4 + 0.08 * Math.sin(t));
            ctx.save(); ctx.translate(x, y); ctx.rotate(-0.5);
            const g = ctx.createLinearGradient(-r, -r, r, r); g.addColorStop(0, '#fff6c9'); g.addColorStop(0.5, '#f0c94f'); g.addColorStop(1, '#b8862a');
            ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.arc(r * 0.42, -r * 0.1, r * 0.82, 0, TAU, true); ctx.fill('evenodd');
            ctx.restore();
            const sx = x + r * 1.05, sy = y - r * 0.15; ctx.fillStyle = '#ffe9a0'; ctx.beginPath();
            for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.17 : r * 0.42, a = i * Math.PI / 5 - Math.PI / 2 + t * 0.15; ctx[i ? 'lineTo' : 'moveTo'](sx + Math.cos(a) * rr, sy + Math.sin(a) * rr); }
            ctx.fill(); glow(ctx, sx, sy, r * 0.9, '#fff2b8', 0.55);
        } };
    }
    function makeRays(color, alpha, cx, cy, n) {
        return { back(ctx, t) {
            const rad = Math.hypot(W, H) * 1.05;
            const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad); g.addColorStop(0, rgba(color, alpha * 2.2)); g.addColorStop(1, rgba(color, 0));
            ctx.fillStyle = g; ctx.save(); ctx.translate(cx, cy); ctx.rotate(t * 0.025);
            for (let i = 0; i < n; i++) { const a = i * TAU / n; ctx.beginPath(); ctx.moveTo(0, 0); ctx.arc(0, 0, rad, a, a + TAU / n * 0.42); ctx.closePath(); ctx.fill(); }
            ctx.restore();
        } };
    }
    function makeBeams(color) {
        return { back(ctx, t) {
            ctx.globalCompositeOperation = 'lighter';
            [[W * 0.04, 1], [W * 0.96, -1], [W * 0.5, 0.5]].forEach(([x, dir], i) => {
                const ang = Math.sin(t * 0.5 + i * 2) * 0.5 * dir, len = H * 1.2;
                ctx.save(); ctx.translate(x, -10); ctx.rotate(ang);
                const g = ctx.createLinearGradient(0, 0, 0, len); g.addColorStop(0, rgba(color, 0.28)); g.addColorStop(1, rgba(color, 0));
                ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(6, 0); ctx.lineTo(len * 0.22, len); ctx.lineTo(-len * 0.22, len); ctx.closePath(); ctx.fill(); ctx.restore();
            });
            ctx.globalCompositeOperation = 'source-over';
        } };
    }
    function makeWaves(colors) {
        return { back(ctx, t) {
            colors.forEach((c, b) => {
                ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(0, H);
                for (let x = 0; x <= W; x += 16) ctx.lineTo(x, H * (0.62 + b * 0.07) + Math.sin(x * 0.006 + t * 0.5 + b * 1.5) * H * 0.035);
                ctx.lineTo(W, H); ctx.closePath(); ctx.fill();
            });
        } };
    }
    function makeGlitter() {
        const items = []; for (let i = 0; i < Math.round(130 * (mob ? 0.5 : 1)); i++) items.push({ x: R(0, W), y: R(0, H), ph: R(0, TAU), f: R(1, 3.5), c: P(['#ffd700', '#fff4c2', '#ffffff', '#e8c36a']), r: R(2, 6) });
        return { back(ctx, t) { for (const g of items) { const a = Math.pow(0.5 + 0.5 * Math.sin(t * g.f + g.ph), 3); if (a > 0.08) star4(ctx, g.x, g.y, g.r, g.c, a); } } };
    }
    function makeClouds() {
        // seigaiha: the overlapping wave arcs found on Chinese festival silk, in soft gold
        const r = Math.round(clamp(Math.min(W, H) * 0.055, 26, 52)), o = offscreen(W, H, 1), g = o.g;
        g.strokeStyle = 'rgba(200,150,30,.5)'; g.lineWidth = 1.2;
        for (let row = Math.floor(H / (r * 0.5)); row >= 0; row--) {
            for (let col = -1; col < W / (r * 2) + 1; col++) {
                const cx = col * r * 2 + (row % 2 ? r : 0), cy = row * r * 0.5;
                for (let k = 3; k >= 1; k--) { g.fillStyle = k % 2 ? 'rgba(255,247,222,.9)' : 'rgba(255,236,170,.9)'; g.beginPath(); g.arc(cx, cy, r * k / 3, Math.PI, 0); g.fill(); g.stroke(); }
            }
        }
        return { back(ctx, t) {
            ctx.globalAlpha = 0.22; ctx.drawImage(o.c, 0, 0, W, H); ctx.globalAlpha = 1;
            glow(ctx, W * 0.5, H * 0.35, Math.max(W, H) * 0.7, '#ff4d3a', 0.07);
            glow(ctx, W * 0.5, H * 0.5, Math.max(W, H) * 0.5, '#ffb703', 0.07 + 0.02 * Math.sin(t * 0.6));
        } };
    }
    function makeLotusOutline() {
        return { back(ctx, t) {
            const cx = W * 0.5, cy = H * 0.62, k = Math.min(W, H) * 0.42;
            glow(ctx, cx, cy, k * 1.6, '#ffe08a', 0.2);
            ctx.save(); ctx.translate(cx, cy); ctx.strokeStyle = 'rgba(214,160,40,.28)'; ctx.fillStyle = 'rgba(255,214,235,.18)'; ctx.lineWidth = 2;
            for (let layer = 0; layer < 3; layer++) {
                const n = 8 + layer * 4, len = k * (1 - layer * 0.22), wid = k * (0.2 - layer * 0.03);
                for (let i = 0; i < n; i++) {
                    ctx.save(); ctx.rotate(i * TAU / n + layer * 0.2 + Math.sin(t * 0.2) * 0.02);
                    ctx.beginPath(); ctx.moveTo(0, 0); ctx.bezierCurveTo(wid * 1.6, -len * 0.3, wid, -len * 0.85, 0, -len); ctx.bezierCurveTo(-wid, -len * 0.85, -wid * 1.6, -len * 0.3, 0, 0); ctx.fill(); ctx.stroke(); ctx.restore();
                }
            }
            ctx.restore();
        } };
    }
    function makeSkyLanterns(o) {
        const items = []; let tt = 0;
        return { front(ctx, t, dt) {
            tt -= dt;
            if (tt <= 0 && items.length < (mob ? 3 : 6)) { tt = R(2, 4); items.push({ x: R(W * 0.05, W * 0.95), y: R(H * 0.5, H * 0.85), life: 0, max: R(14, 20), s: R(34, 54) * (mob ? 0.7 : 1), ph: R(0, TAU) }); }
            for (let i = items.length - 1; i >= 0; i--) {
                const l = items[i]; l.life += dt; l.y -= 14 * dt; l.x += Math.sin(t * 0.5 + l.ph) * 8 * dt;
                if (l.life > l.max) { items.splice(i, 1); continue; }
                ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(Math.sin(t * 0.8 + l.ph) * 0.06); ctx.globalAlpha = Math.sin(Math.PI * l.life / l.max) * 0.95;
                draw.lantern(ctx, l.s, t, l.ph, o); ctx.restore();
            }
            ctx.globalAlpha = 1;
        } };
    }

    // ---------- festival line-ups ----------
    const redLantern = i => i % 3 === 0
        ? { c1: '#fff0a0', c2: '#f2b01e', c3: '#a86c0c', light: '#ffd25a', tassel: '#e11d2e', round: false }
        : { c1: '#ff9a7a', c2: '#e0141e', c3: '#8f0a12', light: '#ff5a3c', tassel: '#ffd166', round: i % 3 === 1 };
    const roundOrange = { c1: '#fff0b8', c2: '#ffa63a', c3: '#c2561a', light: '#ffb347', tassel: '#ffd166', round: true };
    const stack = (...parts) => ({
        back: parts.some(p => p && p.back) ? (c, t, dt) => parts.forEach(p => p && p.back && p.back(c, t, dt)) : null,
        front: (c, t, dt) => parts.forEach(p => p && p.front && p.front(c, t, dt))
    });
    const asFront = p => ({ front: (c, t, dt) => p.draw(c, t, dt) });
    const SCENES = {
        Deepavali: () => { const r = makeRangoliScene(); return stack({ back: (c, t) => r.back(c, t) }, asFront(makeMotes(['#ffb347', '#ff6fb5', '#ffd54f'], 24, { rise: true, star: true })), asFront(makeHangers('akash', null))); },
        CNY: () => stack(makeClouds(), asFront(makeFlutter({ kind: 'coin', colors: ['#ffd54f'], count: 9, size: [14, 20], vy: [30, 55], drift: 6, spin: 0, sway: 14, alpha: [0.85, 1], flip: true })),
            asFront(makeHangers('lantern', { pick: redLantern })), (() => { const d = makeDragon(); return { front: (c, t, dt) => d.front(c, t, dt) }; })()),
        HariRaya: () => { const cr = makeCrescent(W - (mob ? 54 : 92), mob ? 52 : 66, mob ? 22 : 31); return stack({ front: (c, t) => cr.back(c, t) }, makeStars(34, ['#ffe9a0', '#ffffff', '#b9f6ca']), asFront(makeMotes(['#27ae60', '#f1c40f', '#ffe9a0'], 22, { star: true })), asFront(makeHangers('ketupat', null))); },
        Christmas: () => stack(makeAurora(), makeBokeh(['#ffb347', '#ff5a5a', '#ffe9a0', '#52e08a'], 16, 0.35),
            asFront(makeFlutter({ kind: 'flake', colors: ['#ffffff'], count: 85, size: [5, 11], vy: [28, 55], drift: 6, spin: 0, sway: 16, alpha: [0.5, 0.9] })),
            asFront(makeFlutter({ kinds: ['flake', 'crystal', 'crystal'], colors: ['#ffffff'], count: 22, size: [14, 24], vy: [45, 80], drift: 8, spin: 0.8, sway: 24, alpha: [0.7, 1] })),
            asFront(makeFairyLights()), asFront(makeHangers('bauble', { pick: i => ({ c: ['#d90429', '#ffb703', '#2e9a45', '#3a86ff'][i % 4] }) }))),
        Thaipusam: () => stack(makeRays('#ffb703', 0.07, W * 0.5, -H * 0.08, 28), asFront(makeMotes(['#ffb703', '#ff7a00', '#ffe27a'], 20, { rise: true, star: true })),
            asFront(makeFlutter({ kind: 'petal', colors: ['#ff9800', '#ffb300', '#ff6f00', '#ffc107'], count: 24, size: [13, 21], vy: [35, 70], drift: 8, spin: 1.5, sway: 22, alpha: [0.8, 1], flip: true })),
            asFront(makeGarland()), asFront(makeHangers('bell', null))),
        NationalDay: () => makeFlagScene(),
        MalaysiaDay: () => makeFlagScene(),
        MooncakeFestival: () => stack((() => { const m = makeMoon(W - (mob ? 56 : 96), mob ? 54 : 68, mob ? 24 : 36); return { front: (c, t) => m.back(c, t) }; })(), makeStars(30, ['#fff6cf', '#ffffff']), asFront(makeMotes(['#ffd27a', '#fff2b8'], 26, {})),
            makeSkyLanterns(roundOrange), asFront(makeHangers('lantern', { pick: i => roundOrange }))),
        NewYear: () => stack(makeGlitter(), makeBeams('#ffe9a0'),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#ffd700', '#e8e8f0', '#ff5e5e', '#5ec8ff', '#b388ff'], count: 55, size: [9, 15], vy: [50, 100], drift: 10, spin: 4, sway: 26, alpha: [0.85, 1], flip: true })),
            asFront(makeMotes(['#ffd700', '#ffffff'], 22, { star: true }))),
        Valentines: () => stack(makeBokeh(['#ff6f9c', '#ffb3c7', '#ff3d7f'], 18, 0.4),
            asFront(makeFlutter({ kind: 'petal', colors: ['#b0123f', '#d81b60', '#e91e63', '#8e0f35'], count: 26, size: [14, 22], vy: [32, 62], drift: 8, spin: 1.6, sway: 24, alpha: [0.85, 1], flip: true })),
            asFront(makeFlutter({ kind: 'heart', colors: ['#ff4d85', '#e91e63'], count: 7, size: [12, 20], vy: [22, 40], drift: 6, spin: 0.5, sway: 18, alpha: [0.7, 0.95] })),
            asFront(makeHangers('heart', { pick: i => ({ c: ['#e91e63', '#d90429', '#ff4d85'][i % 3] }) }))),
        GrandOpening: () => stack(makeBeams('#fff4c2'), asFront(makeBunting(['#e74c3c', '#f39c12', '#27ae60', '#1a8cd8', '#9b59b6'])),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#e74c3c', '#f39c12', '#27ae60', '#1a8cd8', '#9b59b6', '#ffd700'], count: 46, size: [9, 14], vy: [50, 95], drift: 10, spin: 4, sway: 24, alpha: [0.85, 1], flip: true }))),
        Vesak: () => stack(makeRays('#ffd54f', 0.06, W * 0.5, -H * 0.1, 22), makeLotusOutline(), asFront(makeMotes(['#ffe08a', '#fff4c2'], 24, { star: true })),
            asFront(makeFlutter({ kind: 'petal', colors: ['#ffd1e6', '#fff0f7', '#f9a8cd'], count: 20, size: [13, 20], vy: [26, 52], drift: 6, spin: 1.2, sway: 20, alpha: [0.8, 1], flip: true })),
            makeSkyLanterns({ c1: '#fff4d0', c2: '#ffcf6a', c3: '#e0903a', light: '#ffd27a', tassel: '#fff0c0', round: true }), asFront(makeHangers('lotus', null))),
        Default: () => stack(makeBokeh(['#ffd27a', '#9be7c4', '#ffb3c7'], 12, 0.3), asFront(makeMotes(['#ffd27a', '#ffffff'], 18, { star: true })))
    };
    function makeFlagScene() {
        const fw = Math.round(clamp(W * 0.13, 84, 190)), f = makeFlag(fw);
        const fl = { c: f.c, w: fw, h: fw / 2 };
        return stack(makeWaves(['rgba(204,0,1,.07)', 'rgba(255,255,255,.18)', 'rgba(1,0,102,.07)']), asFront(makeBunting(['#cc0001', '#ffffff', '#010066', '#ffcc00'])),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#cc0001', '#ffffff', '#010066', '#ffcc00'], count: 36, size: [9, 14], vy: [45, 90], drift: 10, spin: 3.5, sway: 24, alpha: [0.85, 1], flip: true })),
            { front: (c, t) => { drawFlag(c, fl, 12, mob ? 54 : 70, t); drawFlag(c, fl, W - 12 - fw, mob ? 54 : 70, t); } });
    }

    return {
        init(k, w, h, dpr) {
            W = w; H = h; DPR = dpr; mob = w < 700; spriteCache.clear();
            try { cur = (SCENES[k] || SCENES.Default)(); } catch (e) { console.error('[FestivalStage]', e); cur = null; }
        },
        back(ctx, t, dt) { if (cur && cur.back) cur.back(ctx, t, dt); },
        front(ctx, t, dt) { if (cur && cur.front) cur.front(ctx, t, dt); },
        clear() { cur = null; }
    };
})();

const FestivalFX = (() => {
    const STORE_KEY = 'fl_fx_enabled';
    const S = {
        key: null, cfg: null, scene: null, info: null, enabled: true, running: false,
        canvas: null, ctx: null, w: 0, h: 0, dpr: 1, t: 0, last: 0, raf: 0,
        particles: [], rockets: [], sparks: [], glows: [], stars: [], sprites: new Map(), nextFirework: 2,
        travelerEl: null, garlandEl: null, paradeEl: null, toggleEl: null, backdropEl: null, backCanvas: null, backCtx: null, flip: 0,
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
}
@keyframes flBgDrift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }


/* full-screen festival artwork sits behind the page */
#fl-backdrop { position: fixed; inset: 0; z-index: -1; pointer-events: none; overflow: hidden; display: none; }
#fl-backdrop svg { position: absolute; inset: 0; width: 100%; height: 100%; }
#fl-backdrop .fl-spin { transform-box: fill-box; transform-origin: center; animation: flSpin 120s linear infinite; }
#fl-backdrop .fl-spin2 { transform-box: fill-box; transform-origin: center; animation: flSpin 160s linear infinite reverse; }
#fl-backdrop .fl-pulse { transform-box: fill-box; transform-origin: center; animation: flArtPulse 5s ease-in-out infinite alternate; }
#fl-backdrop .fl-bob { animation: flBob 7s ease-in-out infinite alternate; }
#fl-backdrop .fl-drift { animation: flDrift 60s ease-in-out infinite alternate; }
#fl-backdrop .fl-drift2 { animation: flDrift 80s ease-in-out infinite alternate-reverse; }
#fl-backdrop .fl-wave { animation: flBob 9s ease-in-out infinite alternate; }
@keyframes flSpin { to { transform: rotate(360deg); } }
@keyframes flArtPulse { from { opacity: .6; transform: scale(.96); } to { opacity: 1; transform: scale(1.04); } }
@keyframes flBob { from { transform: translateY(0); } to { transform: translateY(-14px); } }
@keyframes flDrift { from { transform: translateX(-3%); } to { transform: translateX(3%); } }
@media (prefers-reduced-motion: reduce) { #fl-backdrop * { animation: none !important; } }

/* let the artwork show through the shop's white panels while a festival is on */
body.fl-on .dynamic-content-wrapper,
body.fl-on .about-section,
body.fl-on .testimony-card,
body.fl-on .job-card { background: rgba(255,255,255,.80) !important; backdrop-filter: blur(3px); }
/* header stays deep emerald with gold type, festival or not (see style.css) */

#fl-back { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: -1; pointer-events: none; display: none; }
#fl-fx-canvas { position: fixed; inset: 0; width: 100vw; height: 100vh; z-index: 1000; pointer-events: none; display: none; }

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
        if (!S.backCanvas) {
            S.backCanvas = document.createElement('canvas');
            S.backCanvas.id = 'fl-back';
            S.backCanvas.setAttribute('aria-hidden', 'true');
            document.body.appendChild(S.backCanvas);
            S.backCtx = S.backCanvas.getContext('2d');
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
                S.resizeTimer = setTimeout(() => { if (S.running) { resize(); FestivalStage.init(S.key, S.w, S.h, S.dpr); } }, 250);
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
        if (S.backCanvas) { S.backCanvas.width = S.canvas.width; S.backCanvas.height = S.canvas.height; }
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

    function buildBackdrop() {
        if (!S.backdropEl) return;
        const w = Math.max(320, window.innerWidth), h = Math.max(480, window.innerHeight);
        S.backdropEl.innerHTML = FestivalArt.svg(S.key, w, h);
        S.backdropEl.style.display = FestivalArt.has(S.key) ? 'block' : 'none';
    }

    function launchRocket() {
        const colors = S.cfg.fireworks.colors;
        S.rockets.push({ x: rand(0.1, 0.9) * S.w, y: S.h + 10, ty: rand(0.12, 0.45) * S.h, vy: -rand(480, 640), color: pick(colors) });
    }

    function explode(x, y, color) {
        if (S.sparks.length > 900) return;
        const colors = S.cfg.fireworks.colors;
        const big = S.w > 700 ? 1 : 0.7;
        const ring = (n, speed, c, decay) => {
            for (let i = 0; i < n; i++) {
                const a = (Math.PI * 2 * i) / n + rand(-0.05, 0.05);
                const sp = speed * rand(0.9, 1.1) * big;
                S.sparks.push({ x: x, y: y, px: x, py: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, decay: decay * rand(0.9, 1.1), color: c });
            }
        };
        ring(64, 300, color, 0.5);
        ring(36, 170, pick(colors), 0.65);
        ring(16, 80, '#ffffff', 0.9);
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

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // fireworks
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (S.cfg.fireworks) {
            S.nextFirework -= dt;
            if (S.nextFirework <= 0) {
                launchRocket();
                const ev = S.cfg.fireworks.every;
                S.nextFirework = rand(ev[0], ev[1]);
                if (Math.random() < 0.4) setTimeout(() => { if (S.running) launchRocket(); }, 400);
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
                ctx.globalAlpha = Math.max(0, sp.life) * 0.9;
                ctx.strokeStyle = sp.color;
                ctx.lineWidth = 2.6;
                ctx.beginPath(); ctx.moveTo(sp.px, sp.py); ctx.lineTo(sp.x, sp.y); ctx.stroke();
            }
        }
        ctx.globalAlpha = 1;

        // scenery: dragon, flags, lanterns, petals ... drawn over the page
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        FestivalStage.front(ctx, S.t, dt);
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;

        // scenery behind the page (redrawn at ~30 frames a second)
        S.flip = (S.flip + 1) % 2;
        if (S.flip === 0 && S.backCtx) {
            const bc = S.backCtx;
            bc.setTransform(1, 0, 0, 1, 0, 0);
            bc.clearRect(0, 0, S.backCanvas.width, S.backCanvas.height);
            bc.setTransform(dpr, 0, 0, dpr, 0, 0);
            FestivalStage.back(bc, S.t, dt * 2);
            bc.setTransform(1, 0, 0, 1, 0, 0);
            bc.globalAlpha = 1;
        }
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
        S.backCanvas.style.display = 'block';
        FestivalStage.init(S.key, S.w, S.h, S.dpr);
        S.last = performance.now();
        S.raf = requestAnimationFrame(frame);
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
        if (S.backdropEl) S.backdropEl.style.display = 'none';
        if (S.backCanvas) { S.backCtx.setTransform(1, 0, 0, 1, 0, 0); S.backCtx.clearRect(0, 0, S.backCanvas.width, S.backCanvas.height); S.backCanvas.style.display = 'none'; }
        FestivalStage.clear();
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
        ['fl-fx-canvas', 'fl-back', 'fl-fx-toggle'].forEach(id => { const el = document.getElementById(id); if (el) el.remove(); });
        if (S.travelerEl) S.travelerEl.remove();
        S.canvas = S.ctx = S.backCanvas = S.backCtx = S.toggleEl = null;
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
        let wanted = new URLSearchParams(window.location.search).get('festival');
        if (!wanted) return null;
        const n = wanted.toLowerCase().replace(/[^a-z0-9]/g, '');
        let k = FESTIVAL_THEMES[wanted] ? wanted : null;
        if (!k) { const m = FESTIVAL_MATCHERS.find(x => x[1].test(n)); k = m ? m[0] : null; }
        if (!k) return null;
        wanted = k;
        return { FestivalID: wanted.toUpperCase() + '-PREVIEW', EventName: wanted, ThemeName: wanted, WelcomeMessage: 'Preview of the ' + wanted + ' theme.', EndDate: '' };
    } catch (e) { return null; }
}

// ===========================================================
// [ 1.8 ] SHOP LAYOUT (5 per row) & PRODUCT PAGES
// ===========================================================
const viewState = { current: 'homepage', listScroll: 0, baseTitle: document.title, pdQty: 1 };
// Contact number comes from the AboutUs sheet (cell M2) and is set when the shop data loads.
const BRAND_NAME = 'Forever Living by Muhd Isa';   // always shown in full, never just "Forever Living"
let WHATSAPP_NUMBER = '601154443154';
let CONTACT_DISPLAY = '+60 11-5444 3154';
function applyContactNumber(content) {
    if (!content) return;
    if (content.WhatsAppNumber) WHATSAPP_NUMBER = String(content.WhatsAppNumber).replace(/\D/g, '');
    if (content.ContactNumber) CONTACT_DISPLAY = content.ContactNumber;
}

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

        applyContactNumber(data.aboutUsContent);
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
        let why = String(error && error.message || error);
        if (!googleScriptURL) why = 'config.js was not found. Upload config.js next to index.html.';
        else if (/Failed to fetch|NetworkError|Load failed/i.test(why)) why = 'The store server could not be reached. In Apps Script, deploy as Web app with access set to "Anyone", then check the address in config.js.';
        else if (/JSON|Unexpected token/i.test(why)) why = 'The store server did not return store data. Check that config.js has the latest Web app address and that access is set to "Anyone".';
        if (main) main.innerHTML = `<p style="text-align: center; color: red;">Error loading store. Please try again later.</p><p style="text-align:center;color:#888;font-size:.85rem;max-width:560px;margin:10px auto;">${esc(why)}</p>`;
    }
}

// ===========================================================
// [ 3.0 ] UI & DYNAMIC CONTENT RENDERING
// ===========================================================
function renderStaticContent(content) {
    if (!content) return;
    const headerElem = document.getElementById('company-name-header');
    if (headerElem) {
        headerElem.innerHTML = `${esc(BRAND_NAME)} <span class="by-line">${esc(content.Owner)} - ${esc(content.Role)}</span> <span class="slogan">${esc(content.Slogan)}</span>`;
    }
    const footerElem = document.getElementById('footer-text');
    if (footerElem) {
        footerElem.innerHTML = esc(content.Footer || `© ${new Date().getFullYear()} ${BRAND_NAME}`) + ` &nbsp;|&nbsp; <a href="https://wa.me/${esc(WHATSAPP_NUMBER)}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i> WhatsApp ${esc(CONTACT_DISPLAY)}</a>`;
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
    about = about || { CompanyName: "Forever Living by Muhd Isa", Slogan: "Premium Wellness & Beauty" };
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
        <h2>About ${esc(BRAND_NAME)}</h2>
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
        const gotPdf = result && result.invoicePdf && result.invoicePdf.base64 && downloadPdfBase64(result.invoicePdf.base64, result.invoicePdf.filename);
        alert('Your order has been placed successfully!' + ref + paid + (gotPdf ? ' Your invoice PDF has been downloaded. Scan the QR code on it to pay.' : ' You can view your invoice in My Account.') + ' We will contact you via WhatsApp shortly to confirm payment and shipping.');
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
        addChatMessage('bot', '<a href="https://wa.me/' + WHATSAPP_NUMBER + '" target="_blank" rel="noopener">Contact Admin</a>', 'html');
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
// Saves a PDF sent as base64 straight to the customer's downloads
function downloadPdfBase64(base64, filename) {
    try {
        const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
        const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
        const a = document.createElement('a');
        a.href = url; a.download = filename || 'Invoice.pdf';
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 60000);
        return true;
    } catch (e) { console.error('PDF download failed:', e); return false; }
}

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
