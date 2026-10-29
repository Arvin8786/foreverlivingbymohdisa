/* ============================================================================
   festival.js  -  Forever Living by Muhd Isa
   All festival theming lives in this one file: palettes, scenery, moving backdrops and the
   occasional visitors (CNY dragon, Thaipusam peacock, Christmas sleigh, Raya shooting star ...).
   Add  ?festival=CNY  (or Deepavali, Thaipusam ...) to the site address to preview a theme,
   and  &now=1  to see the first visitor straight away.
   Load order in index.html:  config.js  ->  festival.js  ->  script.js
   ============================================================================ */
// ===========================================================
// [ 1.5 ] FESTIVAL ENGINE
// ===========================================================
// Each theme: brand colours, two background palettes (the page slowly cross-fades between them) and optional fireworks.
// The scenery itself (moving backdrops and occasional visitors such as the dragon or the peacock) is drawn by FestivalStage below.
const FESTIVAL_THEMES = {
    // Rule for every theme: only items that genuinely belong to that festival.
    // Strings starting with # are drawn as small coloured confetti; everything else is an emoji.
    Christmas: {
        icon: '🎄', colors: { primary: '#d90429', secondary: '#FFD700', accent: '#004B23' },
        bg: [['#fff3f3', '#effaf2', '#fff9e3'], ['#f0faf3', '#fff0f0', '#fffcec']]
    },
    HariRaya: {
        icon: '🌙', colors: { primary: '#006400', secondary: '#f0e68c', accent: '#27ae60' },
        bg: [['#f1faf1', '#fbf8e6', '#eaf6ee'], ['#fbf8e6', '#eaf6ee', '#f1faf1']],
        fireworks: { colors: ['#27ae60', '#f0c419', '#ffd700'], every: [6, 11] }
    },
    CNY: {
        icon: '🧧', colors: { primary: '#E00000', secondary: '#FFD700', accent: '#C04000' },
        bg: [['#fff1ee', '#fff8e1', '#ffeceb'], ['#fff8e1', '#ffeceb', '#fff1ee']],
        fireworks: { colors: ['#ff2a2a', '#ffd700', '#ff8c00'], every: [5, 9] }
    },
    Thaipusam: {
        icon: '🔱', colors: { primary: '#FF9933', secondary: '#4B0082', accent: '#F0E68C' },
        bg: [['#fff6ea', '#f6efff', '#fffbe8'], ['#f6efff', '#fffbe8', '#fff6ea']]
    },
    NationalDay: {
        icon: '🇲🇾', colors: { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        bg: [['#eef0ff', '#fff6dc', '#ffecec'], ['#fff6dc', '#ffecec', '#eef0ff']],
        fireworks: { colors: ['#cc0000', '#ffcc00', '#2a3cff', '#ffffff'], every: [5, 9] }
    },
    MalaysiaDay: {
        icon: '🇲🇾', colors: { primary: '#000066', secondary: '#FFCC00', accent: '#CC0000' },
        bg: [['#eef0ff', '#fff6dc', '#ffecec'], ['#ffecec', '#eef0ff', '#fff6dc']],
        fireworks: { colors: ['#cc0000', '#ffcc00', '#2a3cff', '#ffffff'], every: [5, 9] }
    },
    MooncakeFestival: {
        icon: '🥮', colors: { primary: '#C04000', secondary: '#FFD700', accent: '#E00000' },
        bg: [['#fff3e8', '#fff9e1', '#fdeee6'], ['#eef0ff', '#fff9e1', '#fff3e8']]
    },
    Deepavali: {
        icon: '🪔', colors: { primary: '#FF8C00', secondary: '#FF00FF', accent: '#FFD700' },
        bg: [['#fff5e6', '#fdeeff', '#fffbe0'], ['#fdeeff', '#fffbe0', '#fff5e6']],
        fireworks: { colors: ['#ff8c00', '#ff2db4', '#ffd700'], every: [5, 9] }
    },
    NewYear: {
        icon: '🎉', colors: { primary: '#111111', secondary: '#FFD700', accent: '#C0C0C0' },
        bg: [['#f6f6f8', '#fff9e0', '#eeeef2'], ['#fff9e0', '#eeeef2', '#f6f6f8']],
        fireworks: { colors: ['#ffd700', '#ffffff', '#ff5e5e', '#5ec8ff'], every: [4, 8] }
    },
    Valentines: {
        icon: '💖', colors: { primary: '#D70040', secondary: '#FFC0CB', accent: '#C71585' },
        bg: [['#fff0f4', '#fff5f8', '#ffeaf3'], ['#ffeaf3', '#fff0f4', '#fff5f8']]
    },
    GrandOpening: {
        icon: '🎊', colors: { primary: '#1a5276', secondary: '#f39c12', accent: '#27ae60' },
        bg: [['#eaf3fa', '#fff5e3', '#eaf8ef'], ['#fff5e3', '#eaf8ef', '#eaf3fa']],
        fireworks: { colors: ['#1a8cd8', '#f39c12', '#27ae60', '#e74c3c'], every: [5, 9] }
    },
    Vesak: {
        icon: '🪷', colors: { primary: '#b8860b', secondary: '#fff3b0', accent: '#8e44ad' },
        bg: [['#fffbe8', '#f6efff', '#fff6e0'], ['#f6efff', '#fff6e0', '#fffbe8']]
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

    // ---------- once-in-a-while visitors ----------
    // A visitor waits a long, random time, crosses the page once, then waits again. Add ?now=1 to the address to see the first one straight away.
    const FAST = /[?&]now=1/.test(window.location.search);
    function makeVisitor(o) {
        let state = 'wait', timer = FAST ? 0.6 : R(o.first[0], o.first[1]), p = 0, dur = 1, st = null;
        return { front(ctx, t, dt) {
            if (state === 'wait') {
                timer -= dt; if (timer > 0) return;
                state = 'go'; p = 0; st = {}; if (o.init) o.init(st); dur = o.dur(st);
            }
            p += dt / dur;
            if (p >= 1) { state = 'wait'; timer = R(o.gap[0], o.gap[1]); if (o.done) o.done(st); return; }
            o.run(ctx, t, p, st, dt);
        } };
    }
    const smooth = (a, b, x) => { const u = clamp((x - a) / (b - a), 0, 1); return u * u * (3 - 2 * u); };

    // ---------- the dragon: a long flight along a spline, once in a while ----------
    function makeDragonFlight() {
        const sp = clamp(W / 52, 12, 24), N = mob ? 44 : 60, Lb = (N - 1) * sp, STEP = 3;
        let path = null;
        function catmull(p0, p1, p2, p3, u) {
            const u2 = u * u, u3 = u2 * u;
            return [0.5 * ((2 * p1[0]) + (-p0[0] + p2[0]) * u + (2 * p0[0] - 5 * p1[0] + 4 * p2[0] - p3[0]) * u2 + (-p0[0] + 3 * p1[0] - 3 * p2[0] + p3[0]) * u3),
                    0.5 * ((2 * p1[1]) + (-p0[1] + p2[1]) * u + (2 * p0[1] - 5 * p1[1] + 4 * p2[1] - p3[1]) * u2 + (-p0[1] + 3 * p1[1] - 3 * p2[1] + p3[1]) * u3)];
        }
        function buildPath(dir) {
            const pts = [], k = mob ? 3 : 5;
            pts.push([dir > 0 ? -sp * 8 : W + sp * 8, R(H * 0.15, H * 0.8)]);
            let up = Math.random() < 0.5;
            for (let i = 0; i <= k + 1; i++) {
                const fx = i / (k + 1);
                pts.push([(dir > 0 ? fx : 1 - fx) * W + R(-W * 0.04, W * 0.04), up ? R(H * 0.1, H * 0.34) : R(H * 0.5, H * 0.86)]);
                up = !up;
            }
            pts.push([dir > 0 ? W + sp * 8 : -sp * 8, R(H * 0.1, H * 0.85)]);
            const dense = [];
            for (let i = 0; i < pts.length - 1; i++) {
                const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
                for (let s = 0; s < 60; s++) dense.push(catmull(p0, p1, p2, p3, s / 60));
            }
            dense.push(pts[pts.length - 1]);
            // resample to even spacing
            const X = [dense[0][0]], Y = [dense[0][1]]; let acc = 0, px = dense[0][0], py = dense[0][1];
            for (let i = 1; i < dense.length; i++) {
                let d = Math.hypot(dense[i][0] - px, dense[i][1] - py);
                while (acc + d >= STEP) {
                    const f = (STEP - acc) / d; px += (dense[i][0] - px) * f; py += (dense[i][1] - py) * f; X.push(px); Y.push(py); d = Math.hypot(dense[i][0] - px, dense[i][1] - py); acc = 0;
                }
                acc += d; px = dense[i][0]; py = dense[i][1];
            }
            return { X: X, Y: Y, L: (X.length - 1) * STEP };
        }
        function at(s) {
            const X = path.X, Y = path.Y, n = X.length - 1;
            if (s <= 0) return [X[0] + (X[1] - X[0]) / STEP * s, Y[0] + (Y[1] - Y[0]) / STEP * s];
            if (s >= path.L) return [X[n] + (X[n] - X[n - 1]) / STEP * (s - path.L), Y[n] + (Y[n] - Y[n - 1]) / STEP * (s - path.L)];
            const f = s / STEP, i = Math.floor(f), u = f - i;
            return [X[i] + (X[i + 1] - X[i]) * u, Y[i] + (Y[i + 1] - Y[i]) * u];
        }
        const M = Math.floor(Lb / 4) + 1;
        const DK = { out: '#3a050c', base: '#b30f1f', hi: 'rgba(255,110,90,.34)', belly: '#f1c65f' };

        function spine(headS, t) {
            const P = [];
            for (let k = 0; k <= M; k++) {
                const s = headS - k * 4, c = at(s), a = at(s + 2), b = at(s - 2);
                let tx = a[0] - b[0], ty = a[1] - b[1]; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
                const u = k / M, depth = 0.9 + 0.2 * Math.sin(s / 520 + 1);
                const prof = u < 0.06 ? 0.84 + u * 2.6 : 1 - Math.pow((u - 0.06) / 0.94, 1.12) * 0.94;
                const w = Math.max(1.5, sp * 0.82 * depth * prof);
                let nx = -ty, ny = tx;
                const off = Math.sin(k * 0.1 - t * 4.2) * w * 0.34 * Math.min(1, k / 16);
                P.push({ x: c[0] + nx * off, y: c[1] + ny * off, tx: tx, ty: ty, nx: nx, ny: ny, w: w, k: k, ux: ny < 0 ? nx : -nx, uy: ny < 0 ? ny : -ny });
            }
            return P;
        }

        function drawFlame(ctx, x, y, dx, dy, len, wid, sway, c1, c2) {
            const g = ctx.createLinearGradient(x, y, x + dx * len, y + dy * len); g.addColorStop(0, c1); g.addColorStop(1, c2);
            const px = -dy, py = dx;
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x + px * wid, y + py * wid);
            ctx.quadraticCurveTo(x + dx * len * 0.55 + px * wid * 0.2 + px * sway, y + dy * len * 0.55 + py * wid * 0.2 + py * sway, x + dx * len + px * sway * 1.6, y + dy * len + py * sway * 1.6);
            ctx.quadraticCurveTo(x + dx * len * 0.45 - px * wid * 0.6, y + dy * len * 0.45 - py * wid * 0.6, x - px * wid, y - py * wid); ctx.closePath(); ctx.fill();
        }

        function drawDragon(ctx, t, headS) {
            const P = spine(headS, t), hd = P[0];
            // mist wrapped around the dragon
            for (let k = 6; k < M; k += 9) { const q = P[k]; glow(ctx, q.x + Math.sin(t + k) * 6, q.y + Math.cos(t * 0.8 + k) * 6, q.w * 3.2, '#fff1c9', 0.07); }
            // legs (behind the body)
            [0.17, 0.27, 0.56, 0.66].forEach((f, li) => {
                const q = P[Math.floor(M * f)], side = q.ny > 0 ? 1 : -1, dnx = q.nx * side, dny = q.ny * side;
                const sw = Math.sin(t * 5 + li * 1.7) * 0.45, len1 = sp * 1.9, len2 = sp * 1.6;
                const ang0 = Math.atan2(dny, dnx), a1 = ang0 + 0.5 * (li % 2 ? -1 : 1) + sw, a2 = a1 - 0.9 * (li % 2 ? -1 : 1) - sw * 0.6;
                const kx = q.x + Math.cos(a1) * len1, ky = q.y + Math.sin(a1) * len1, fx = kx + Math.cos(a2) * len2, fy = ky + Math.sin(a2) * len2;
                ctx.lineCap = 'round'; ctx.lineJoin = 'round';
                ctx.strokeStyle = DK.out; ctx.lineWidth = q.w * 0.72; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(kx, ky); ctx.stroke();
                ctx.strokeStyle = DK.base; ctx.lineWidth = q.w * 0.52; ctx.beginPath(); ctx.moveTo(q.x, q.y); ctx.lineTo(kx, ky); ctx.stroke();
                ctx.strokeStyle = DK.out; ctx.lineWidth = q.w * 0.5; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
                ctx.strokeStyle = '#9d0b19'; ctx.lineWidth = q.w * 0.32; ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
                ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(1.2, q.w * 0.1);
                const pa = Math.atan2(fy - ky, fx - kx);
                for (let c = -1; c <= 1; c++) { ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo(fx + Math.cos(pa + c * 0.7) * q.w * 0.7, fy + Math.sin(pa + c * 0.7) * q.w * 0.7, fx + Math.cos(pa + c * 0.9) * q.w * 1.05, fy + Math.sin(pa + c * 0.9) * q.w * 1.05); ctx.stroke(); }
                drawFlame(ctx, kx, ky, -q.tx, -q.ty, q.w * 1.3, q.w * 0.22, Math.sin(t * 6 + li) * 2, '#ff9d2e', 'rgba(255,220,120,.2)');
            });
            // dorsal fins and mane (behind the body)
            for (let k = 14; k < M - 4; k += 7) {
                const q = P[k], h = q.w * (1.15 + 0.2 * Math.sin(k)), sway = Math.sin(t * 5 - k * 0.3) * q.w * 0.18;
                drawFlame(ctx, q.x + q.ux * q.w * 0.8, q.y + q.uy * q.w * 0.8, q.ux * 0.55 - q.tx * 0.85, q.uy * 0.55 - q.ty * 0.85, h * 1.2, q.w * 0.3, sway, '#ffb703', 'rgba(255,241,168,.85)');
            }
            for (let k = 1; k < 20; k += 2) {
                const q = P[k], h = q.w * (2.6 - k * 0.08), sway = Math.sin(t * 6 - k * 0.5) * q.w * 0.45;
                drawFlame(ctx, q.x + q.ux * q.w * 0.7, q.y + q.uy * q.w * 0.7, q.ux * 0.45 - q.tx * 0.9, q.uy * 0.45 - q.ty * 0.9, h, q.w * 0.42, sway, '#ff6a00', 'rgba(255,226,122,.75)');
            }
            // body in passes so the silhouette stays smooth
            ctx.fillStyle = DK.out; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x, q.y, q.w + 1.4, 0, TAU); ctx.fill(); }
            ctx.fillStyle = DK.base; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x, q.y, q.w, 0, TAU); ctx.fill(); }
            ctx.fillStyle = DK.belly; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x - q.ux * q.w * 0.52, q.y - q.uy * q.w * 0.52, q.w * 0.5, 0, TAU); ctx.fill(); }
            ctx.fillStyle = 'rgba(30,0,8,.20)'; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x - q.ux * q.w * 0.18, q.y - q.uy * q.w * 0.18, q.w * 0.92, 0, TAU); ctx.globalCompositeOperation = 'source-over'; ctx.fill(); }
            ctx.fillStyle = DK.hi; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x + q.ux * q.w * 0.3, q.y + q.uy * q.w * 0.3, q.w * 0.55, 0, TAU); ctx.fill(); }
            ctx.fillStyle = 'rgba(255,225,205,.30)'; for (let k = M; k >= 1; k--) { const q = P[k]; ctx.beginPath(); ctx.arc(q.x + q.ux * q.w * 0.5, q.y + q.uy * q.w * 0.5, q.w * 0.16, 0, TAU); ctx.fill(); }
            // scales
            ctx.lineWidth = 1;
            for (let k = M - 1; k >= 3; k -= 3) {
                const q = P[k], ang = Math.atan2(q.ty, q.tx) + Math.PI, cx = q.x + q.tx * q.w * 0.55, cy = q.y + q.ty * q.w * 0.55, r = q.w * 0.92;
                ctx.strokeStyle = 'rgba(55,0,10,.42)'; ctx.beginPath(); ctx.arc(cx, cy, r, ang - 0.95, ang + 0.95); ctx.stroke();
                ctx.strokeStyle = 'rgba(255,196,120,.28)'; ctx.beginPath(); ctx.arc(cx + q.tx * -1.2, cy + q.ty * -1.2, r, ang - 0.7, ang + 0.7); ctx.stroke();
            }
            // belly plates
            ctx.strokeStyle = 'rgba(150,90,10,.5)';
            for (let k = M - 2; k >= 4; k -= 3) { const q = P[k], bx = q.x - q.ux * q.w * 0.5, by = q.y - q.uy * q.w * 0.5; ctx.beginPath(); ctx.moveTo(bx - q.nx * q.w * 0.42, by - q.ny * q.w * 0.42); ctx.lineTo(bx + q.nx * q.w * 0.42, by + q.ny * q.w * 0.42); ctx.stroke(); }
            // tail tuft
            const tl = P[M]; for (let i = -2; i <= 2; i++) drawFlame(ctx, tl.x, tl.y, -tl.tx * 0.9 + tl.nx * i * 0.25, -tl.ty * 0.9 + tl.ny * i * 0.25, sp * (2.2 - Math.abs(i) * 0.3), sp * 0.28, Math.sin(t * 6 + i) * 4, '#ffb703', 'rgba(255,90,40,.5)');
            // head
            drawHead(ctx, t, hd, P[3]);
            // sparkles in the wake
            if (Math.random() < 0.6) { const q = P[Math.floor(R(0, M * 0.7))]; star4(ctx, q.x + R(-12, 12), q.y + R(-12, 12), R(3, 8), '#ffe27a', 0.9); }
        }

        function drawHead(ctx, t, hd, nk) {
            const ang = Math.atan2(hd.ty, hd.tx), u = sp * 1.05 * (0.9 + 0.2 * Math.sin(headSCache / 520 + 1)), fl = Math.cos(ang) < 0 ? -1 : 1;
            ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(ang); ctx.scale(u, u * fl);
            // ear fin and mane tufts
            for (let k = 0; k < 4; k++) { drawFlame(ctx, -0.6 - k * 0.7, -1.2, -0.7, -0.7, 2.6 - k * 0.3, 0.45, Math.sin(t * 6 - k) * 0.5, '#ff7b00', 'rgba(255,226,122,.8)'); }
            // antlers
            ctx.strokeStyle = '#f7d774'; ctx.lineCap = 'round'; ctx.lineWidth = 0.42;
            for (const o of [0, 0.8]) {
                ctx.beginPath(); ctx.moveTo(0.1 - o * 0.5, -1.7); ctx.quadraticCurveTo(-1.6 - o, -3.0, -3.3 - o + Math.sin(t * 3) * 0.2, -2.8 - o * 0.5); ctx.stroke();
                ctx.lineWidth = 0.28; ctx.beginPath(); ctx.moveTo(-1.3 - o, -2.55); ctx.quadraticCurveTo(-1.6 - o, -3.5, -2.0 - o, -4.0); ctx.stroke(); ctx.lineWidth = 0.42;
            }
            // lower jaw
            const jaw = 0.24 + Math.sin(t * 2.2) * 0.05;
            ctx.save(); ctx.translate(0.2, 0.3); ctx.rotate(jaw);
            ctx.fillStyle = '#220007'; ctx.beginPath(); ctx.moveTo(0, -0.3); ctx.lineTo(4.4, -0.3); ctx.lineTo(4.6, 0.5); ctx.lineTo(0, 0.7); ctx.fill();
            ctx.fillStyle = '#e45a6a'; ctx.beginPath(); ctx.ellipse(2.0, 0.15, 1.7, 0.28, 0, 0, TAU); ctx.fill();
            const jg = ctx.createLinearGradient(0, 0, 0, 1.5); jg.addColorStop(0, '#c91d2e'); jg.addColorStop(1, '#6b0913');
            ctx.fillStyle = jg; ctx.beginPath(); ctx.moveTo(-0.5, 0.1); ctx.lineTo(4.3, 0.1); ctx.bezierCurveTo(4.5, 0.55, 3.6, 1.2, 1.9, 1.3); ctx.bezierCurveTo(0.6, 1.3, -0.3, 1.1, -0.7, 0.6); ctx.closePath(); ctx.fill();
            ctx.fillStyle = '#fffbea'; for (let x = 0.9; x < 4.2; x += 0.85) { ctx.beginPath(); ctx.moveTo(x, 0.1); ctx.lineTo(x + 0.26, 0.1); ctx.lineTo(x + 0.13, -0.5); ctx.fill(); }
            ctx.strokeStyle = '#ffe9a3'; ctx.lineWidth = 0.14;
            for (let b = 0; b < 6; b++) { ctx.beginPath(); ctx.moveTo(1.5 + b * 0.18, 1.2); ctx.quadraticCurveTo(0.5 - b * 0.3, 2.7 + Math.sin(t * 4 + b) * 0.4, -1.2 - b * 0.4, 3.0 + b * 0.3 + Math.sin(t * 3.5 + b) * 0.5); ctx.stroke(); }
            ctx.restore();
            // upper jaw and snout
            const ug = ctx.createLinearGradient(0, -1.9, 0, 0.4); ug.addColorStop(0, '#ff6a6a'); ug.addColorStop(0.45, '#c1121f'); ug.addColorStop(1, '#6b0913');
            ctx.fillStyle = ug; ctx.strokeStyle = 'rgba(40,0,6,.8)'; ctx.lineWidth = 0.14;
            ctx.beginPath(); ctx.moveTo(-1.3, -0.9); ctx.bezierCurveTo(0.2, -2.05, 2.4, -1.8, 3.9, -1.1); ctx.bezierCurveTo(4.6, -1.0, 5.3, -0.85, 5.4, -0.3); ctx.bezierCurveTo(5.4, 0.15, 4.7, 0.28, 4.2, 0.22); ctx.lineTo(0.4, 0.22); ctx.bezierCurveTo(-0.5, 0.32, -1.3, 0.0, -1.5, -0.5); ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.strokeStyle = 'rgba(255,200,120,.35)'; ctx.lineWidth = 0.1;
            for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.arc(-0.3 + i * 0.8, -0.9, 0.5, Math.PI, TAU); ctx.stroke(); }
            ctx.fillStyle = '#fffbea'; ctx.beginPath(); ctx.moveTo(3.9, 0.22); ctx.lineTo(4.3, 0.22); ctx.lineTo(4.1, 1.05); ctx.fill();
            ctx.fillStyle = '#2a0006'; ctx.beginPath(); ctx.ellipse(4.85, -0.62, 0.24, 0.15, -0.3, 0, TAU); ctx.fill();
            ctx.strokeStyle = '#7a0b17'; ctx.lineWidth = 0.34; ctx.beginPath(); ctx.moveTo(-0.1, -1.65); ctx.quadraticCurveTo(1.0, -1.4, 2.1, -1.65); ctx.stroke();
            // eye
            glow(ctx, 1.1, -0.82, 2.6, '#ffcc33', 0.85);
            ctx.fillStyle = '#fff4b0'; ctx.beginPath(); ctx.ellipse(1.1, -0.82, 0.5, 0.34, -0.2, 0, TAU); ctx.fill();
            ctx.fillStyle = '#1e0006'; ctx.beginPath(); ctx.ellipse(1.2, -0.82, 0.14, 0.3, 0, 0, TAU); ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.beginPath(); ctx.arc(0.98, -0.95, 0.07, 0, TAU); ctx.fill();
            // whiskers
            ctx.strokeStyle = '#ffe9a3'; ctx.lineWidth = 0.17;
            for (const s2 of [-1, 1]) {
                ctx.beginPath();
                for (let k = 0; k <= 26; k++) {
                    const x = 4.9 - k * 0.55, y = -0.1 + s2 * (0.35 + k * 0.17) + Math.sin(t * 5 - k * 0.45) * 0.45 * (k / 13);
                    ctx[k ? 'lineTo' : 'moveTo'](x, y);
                }
                ctx.stroke();
            }
            // pearl
            const px = 8.0, py = -0.4 + Math.sin(t * 3) * 0.5;
            glow(ctx, px, py, 8, '#ffd966', 0.95);
            const pg = ctx.createRadialGradient(px - 0.45, py - 0.45, 0.1, px, py, 1.6); pg.addColorStop(0, '#ffffff'); pg.addColorStop(0.5, '#ffe28a'); pg.addColorStop(1, '#d99a1c');
            ctx.fillStyle = pg; ctx.beginPath(); ctx.arc(px, py, 1.6, 0, TAU); ctx.fill();
            ctx.restore();
        }
        let headSCache = 0;
        return makeVisitor({
            first: [9, 16], gap: [55, 95],
            init(st) { st.dir = Math.random() < 0.5 ? 1 : -1; path = buildPath(st.dir); },
            dur() { const v = clamp(W * 0.2, 230, 340); return (path.L + Lb + 200) / v; },
            run(ctx, t, p) { headSCache = p * (path.L + Lb + 200) - 60; drawDragon(ctx, t, headSCache); }
        });
    }

    // ---------- shared flyer helpers ----------
    // A flyer crosses the page in a gentle wave. dir=+1 left→right, -1 right→left.
    function crossing(st, p, yMin, yMax, amp) {
        const x = st.dir > 0 ? -80 + p * (W + 160) : W + 80 - p * (W + 160);
        const y = st.y0 + Math.sin(p * 7 + st.ph) * amp + (st.y1 - st.y0) * p;
        const dy = Math.cos(p * 7 + st.ph) * amp * 7 / (W + 160) * st.dir;
        return { x: x, y: clamp(y, yMin, yMax), ang: Math.atan(dy) };
    }
    function flyInit(st, ya, yb) { st.dir = Math.random() < 0.5 ? 1 : -1; st.y0 = R(H * ya, H * yb); st.y1 = R(-H * 0.12, H * 0.12); st.ph = R(0, 6); }
    function wing(ctx, len, wid, ang, c1, c2) {
        const g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, c1); g.addColorStop(1, c2);
        ctx.save(); ctx.rotate(ang); ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-wid, -len * 0.45, -wid * 0.35, -len); ctx.quadraticCurveTo(wid * 0.45, -len * 0.55, wid * 0.7, 0); ctx.closePath(); ctx.fill(); ctx.restore();
    }

    // Peacock (Thaipusam): flies low across the page with a long shimmering train
    function makePeacock() {
        const s = clamp(W / 16, 46, 84);
        return makeVisitor({
            first: [8, 14], gap: [38, 70],
            init(st) { flyInit(st, 0.25, 0.65); },
            dur() { return (W + 160) / clamp(W * 0.13, 120, 190); },
            run(ctx, t, p, st) {
                const q = crossing(st, p, 40, H - 40, H * 0.07), d = st.dir, flap = Math.sin(t * 7);
                ctx.save(); ctx.translate(q.x, q.y); ctx.scale(d, 1); ctx.rotate(q.ang * d);
                glow(ctx, -s * 1.2, 0, s * 1.8, '#19c3b0', 0.22);
                // train: long feathers with eye spots, trailing behind
                const nF = mob ? 11 : 17;
                for (let i = 0; i < nF; i++) {
                    const f = i / (nF - 1) - 0.5, base = Math.PI + f * 0.95, sw = Math.sin(t * 3 + i * 0.6) * 0.07, a = base + sw, len = s * (2.5 + 0.5 * Math.cos(f * 2.2));
                    const ex = Math.cos(a) * len, ey = Math.sin(a) * len + s * 0.06;
                    ctx.strokeStyle = 'rgba(30,110,70,.9)'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-s * 0.35, 0); ctx.quadraticCurveTo(ex * 0.5, ey * 0.5 + Math.sin(t * 4 + i) * 3, ex, ey); ctx.stroke();
                    const eg = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 0.2);
                    eg.addColorStop(0, '#14206b'); eg.addColorStop(0.35, '#0aa5a0'); eg.addColorStop(0.7, '#e1b12c'); eg.addColorStop(1, '#2f8f4e');
                    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.2, s * 0.27, a, 0, TAU); ctx.fill();
                }
                // wings (behind and in front)
                wing(ctx, s * 1.25, s * 0.5, -0.35 - flap * 0.75, '#0e7c86', '#2dd4bf');
                // body
                const bg = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.3); bg.addColorStop(0, '#2563eb'); bg.addColorStop(1, '#0b3a8c');
                ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.26, 0, 0, TAU); ctx.fill();
                // neck, head, crest, beak
                ctx.strokeStyle = '#1f4fd0'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.17; ctx.beginPath(); ctx.moveTo(s * 0.42, -s * 0.04); ctx.quadraticCurveTo(s * 0.72, -s * 0.12, s * 0.8, -s * 0.34); ctx.stroke();
                ctx.fillStyle = '#1b43b8'; ctx.beginPath(); ctx.arc(s * 0.83, -s * 0.38, s * 0.12, 0, TAU); ctx.fill();
                ctx.fillStyle = '#d9a21b'; ctx.beginPath(); ctx.moveTo(s * 0.93, -s * 0.42); ctx.lineTo(s * 1.1, -s * 0.36); ctx.lineTo(s * 0.93, -s * 0.33); ctx.fill();
                ctx.strokeStyle = '#0f7a6a'; ctx.lineWidth = 1.4; for (let k = -1; k <= 1; k++) { ctx.beginPath(); ctx.moveTo(s * 0.82, -s * 0.48); ctx.lineTo(s * 0.8 + k * s * 0.06, -s * 0.66); ctx.stroke(); ctx.fillStyle = '#19c3b0'; ctx.beginPath(); ctx.arc(s * 0.8 + k * s * 0.06, -s * 0.67, 2, 0, TAU); ctx.fill(); }
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s * 0.86, -s * 0.4, 1.6, 0, TAU); ctx.fill();
                wing(ctx, s * 1.1, s * 0.46, -0.1 + flap * 0.6, '#0b5d7a', '#7ee0d2');
                ctx.restore();
                if (Math.random() < 0.5) star4(ctx, q.x - st.dir * s * R(0.6, 2.4), q.y + R(-s * 0.6, s * 0.6), R(3, 7), '#ffe27a', 0.9);
            }
        });
    }

    // Generic bird (dove / hornbill)
    function makeBird(o) {
        return makeVisitor({
            first: o.first, gap: o.gap,
            init(st) { flyInit(st, 0.12, 0.5); },
            dur() { return (W + 160) / clamp(W * 0.12, 110, 180); },
            run(ctx, t, p, st) {
                const q = crossing(st, p, 30, H - 30, H * 0.05), s = o.size(), flap = Math.sin(t * 8);
                ctx.save(); ctx.translate(q.x, q.y); ctx.scale(st.dir, 1); ctx.rotate(q.ang * st.dir);
                if (o.aura) glow(ctx, 0, 0, s * 2, o.aura, 0.25);
                wing(ctx, s * 1.2, s * 0.55, -0.2 - flap * 0.8, o.w1, o.w2);
                o.body(ctx, s, t);
                wing(ctx, s * 1.05, s * 0.5, 0.05 + flap * 0.65, o.w1, o.w2);
                ctx.restore();
            }
        });
    }
    const makeDove = () => makeBird({
        first: [10, 18], gap: [45, 80], size: () => clamp(W / 28, 26, 44), aura: '#fff6c8', w1: '#ffffff', w2: '#d9e4f2',
        body(ctx, s) { ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.6, s * 0.2, 0, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.moveTo(-s * 0.5, 0); ctx.lineTo(-s * 1.1, -s * 0.12); ctx.lineTo(-s * 1.05, s * 0.14); ctx.fill(); ctx.beginPath(); ctx.arc(s * 0.62, -s * 0.1, s * 0.14, 0, TAU); ctx.fill(); ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(s * 0.74, -s * 0.12); ctx.lineTo(s * 0.9, -s * 0.08); ctx.lineTo(s * 0.74, -s * 0.05); ctx.fill(); }
    });
    const makeHornbill = () => makeBird({
        first: [10, 18], gap: [45, 80], size: () => clamp(W / 18, 38, 62), aura: null, w1: '#1b1b1f', w2: '#4a4a55',
        body(ctx, s) { ctx.fillStyle = '#17171b'; ctx.beginPath(); ctx.ellipse(0, 0, s * 0.62, s * 0.24, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#f4f1e6'; ctx.beginPath(); ctx.moveTo(-s * 0.5, -s * 0.08); ctx.lineTo(-s * 1.3, -s * 0.1); ctx.lineTo(-s * 1.3, s * 0.12); ctx.lineTo(-s * 0.5, s * 0.1); ctx.fill(); ctx.fillStyle = '#17171b'; ctx.fillRect(-s * 1.0, -s * 0.1, s * 0.12, s * 0.22);
            ctx.fillStyle = '#f4f1e6'; ctx.beginPath(); ctx.arc(s * 0.7, -s * 0.16, s * 0.15, 0, TAU); ctx.fill();
            const bg = ctx.createLinearGradient(0, -s * 0.3, 0, s * 0.1); bg.addColorStop(0, '#ff8a1c'); bg.addColorStop(1, '#ffd23c'); ctx.fillStyle = bg;
            ctx.beginPath(); ctx.moveTo(s * 0.78, -s * 0.24); ctx.quadraticCurveTo(s * 1.15, -s * 0.34, s * 1.38, -s * 0.12); ctx.quadraticCurveTo(s * 1.1, -s * 0.02, s * 0.78, -s * 0.08); ctx.fill();
            ctx.fillStyle = '#e8641a'; ctx.beginPath(); ctx.moveTo(s * 0.82, -s * 0.26); ctx.quadraticCurveTo(s * 1.0, -s * 0.52, s * 1.22, -s * 0.28); ctx.quadraticCurveTo(s * 1.0, -s * 0.24, s * 0.82, -s * 0.2); ctx.fill(); }
    });

    // Santa's sleigh and reindeer (Christmas)
    function makeSleigh() {
        const s = clamp(W / 24, 28, 50);
        return makeVisitor({
            first: [10, 16], gap: [50, 90],
            init(st) { flyInit(st, 0.08, 0.3); },
            dur() { return (W + 260) / clamp(W * 0.15, 130, 210); },
            run(ctx, t, p, st) {
                const q = crossing(st, p, 30, H * 0.5, H * 0.04), d = st.dir;
                ctx.save(); ctx.translate(q.x, q.y); ctx.scale(d, 1); ctx.rotate(q.ang * d);
                for (let i = 0; i < 26; i++) { const f = i / 26; glow(ctx, -s * (2 + f * 8) + Math.sin(t * 5 + i) * 3, Math.sin(i + t * 3) * s * 0.25 * f, s * (0.5 - f * 0.3), i % 2 ? '#ffe27a' : '#ffffff', 0.5 * (1 - f)); }
                ctx.fillStyle = 'rgba(25,10,10,.88)';
                for (let r = 0; r < 3; r++) {
                    const rx = s * (1.4 + r * 1.25), ry = Math.sin(t * 6 + r) * s * 0.1, leg = Math.sin(t * 8 + r * 1.3);
                    ctx.beginPath(); ctx.ellipse(rx, ry, s * 0.42, s * 0.17, 0, 0, TAU); ctx.fill();
                    ctx.beginPath(); ctx.ellipse(rx + s * 0.42, ry - s * 0.2, s * 0.13, s * 0.1, 0.3, 0, TAU); ctx.fill();
                    ctx.strokeStyle = 'rgba(25,10,10,.88)'; ctx.lineWidth = 2; ctx.lineCap = 'round';
                    [-0.25, 0.3].forEach((o, k) => { ctx.beginPath(); ctx.moveTo(rx + o * s, ry + s * 0.1); ctx.lineTo(rx + o * s + leg * s * 0.25 * (k ? -1 : 1) + s * 0.1, ry + s * 0.42); ctx.stroke(); });
                    ctx.beginPath(); ctx.moveTo(rx + s * 0.42, ry - s * 0.28); ctx.lineTo(rx + s * 0.38, ry - s * 0.55); ctx.moveTo(rx + s * 0.4, ry - s * 0.44); ctx.lineTo(rx + s * 0.6, ry - s * 0.56); ctx.moveTo(rx + s * 0.38, ry - s * 0.5); ctx.lineTo(rx + s * 0.22, ry - s * 0.6); ctx.stroke();
                    if (r === 2) { glow(ctx, rx + s * 0.55, ry - s * 0.2, s * 0.35, '#ff2a2a', 0.9); ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(rx + s * 0.55, ry - s * 0.2, s * 0.06, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(25,10,10,.88)'; }
                    ctx.strokeStyle = 'rgba(255,215,0,.6)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(rx - s * 0.4, ry); ctx.lineTo(r ? rx - s * 0.85 : s * 0.2, r ? ry : 0); ctx.stroke(); ctx.fillStyle = 'rgba(25,10,10,.88)';
                }
                // sleigh
                const sg = ctx.createLinearGradient(0, -s * 0.5, 0, s * 0.3); sg.addColorStop(0, '#e11d2e'); sg.addColorStop(1, '#7a0a14'); ctx.fillStyle = sg;
                ctx.beginPath(); ctx.moveTo(-s * 0.9, -s * 0.5); ctx.quadraticCurveTo(-s * 0.75, 0.0, -s * 0.5, s * 0.22); ctx.lineTo(s * 0.6, s * 0.22); ctx.quadraticCurveTo(s * 0.8, -s * 0.1, s * 0.75, -s * 0.38); ctx.quadraticCurveTo(0, -s * 0.2, -s * 0.9, -s * 0.5); ctx.fill();
                ctx.strokeStyle = '#ffd700'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-s * 0.7, s * 0.34); ctx.lineTo(s * 0.8, s * 0.34); ctx.quadraticCurveTo(s * 1.0, s * 0.34, s * 1.0, s * 0.1); ctx.stroke();
                ctx.fillStyle = '#e11d2e'; ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.5, s * 0.2, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillRect(-s * 0.3, -s * 0.36, s * 0.4, s * 0.07); ctx.beginPath(); ctx.arc(-s * 0.1, -s * 0.66, s * 0.07, 0, TAU); ctx.fill(); ctx.fillStyle = '#f2c7a1'; ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.5, s * 0.1, 0, TAU); ctx.fill();
                ctx.fillStyle = '#8b5a2b'; ctx.fillRect(-s * 0.75, -s * 0.62, s * 0.4, s * 0.3); ctx.fillStyle = '#ffd700'; ctx.fillRect(-s * 0.58, -s * 0.62, s * 0.05, s * 0.3);
                ctx.restore();
            }
        });
    }

    // Wau bulan (National Day): the traditional Kelantan moon-kite drifting across
    function makeWau() {
        const s = clamp(W / 16, 46, 80);
        return makeVisitor({
            first: [10, 16], gap: [40, 75],
            init(st) { flyInit(st, 0.12, 0.4); st.ph = R(0, 6); },
            dur() { return (W + 200) / clamp(W * 0.09, 80, 130); },
            run(ctx, t, p, st) {
                const q = crossing(st, p, 50, H * 0.7, H * 0.05), d = st.dir, tilt = Math.sin(t * 1.6) * 0.14 + q.ang * 0.5;
                ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(tilt);
                // tail
                ctx.strokeStyle = '#ffcc00'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, s * 0.9); for (let k = 1; k <= 14; k++) ctx.lineTo(Math.sin(t * 3 + k * 0.7) * k * 2.4 - d * k * 1.5, s * 0.9 + k * s * 0.17); ctx.stroke();
                for (let k = 2; k <= 14; k += 3) { ctx.fillStyle = k % 2 ? '#cc0001' : '#010066'; ctx.beginPath(); ctx.arc(Math.sin(t * 3 + k * 0.7) * k * 2.4 - d * k * 1.5, s * 0.9 + k * s * 0.17, 4, 0, TAU); ctx.fill(); }
                // wings (the moon-shaped kite)
                for (const sg of [-1, 1]) {
                    const g = ctx.createLinearGradient(0, 0, sg * s, 0); g.addColorStop(0, '#cc0001'); g.addColorStop(0.55, '#ffcc00'); g.addColorStop(1, '#010066');
                    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, -s * 0.9); ctx.bezierCurveTo(sg * s * 1.1, -s * 0.85, sg * s * 1.15, s * 0.1, sg * s * 0.2, s * 0.9); ctx.lineTo(0, s * 0.7); ctx.closePath(); ctx.fill();
                    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -s * 0.5); ctx.bezierCurveTo(sg * s * 0.7, -s * 0.5, sg * s * 0.75, 0, sg * s * 0.15, s * 0.5); ctx.stroke();
                    ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.beginPath(); ctx.arc(sg * s * 0.45, -s * 0.15, s * 0.07, 0, TAU); ctx.fill();
                }
                ctx.fillStyle = '#ffd700'; ctx.beginPath(); ctx.moveTo(0, -s * 1.1); ctx.lineTo(s * 0.07, -s * 0.85); ctx.lineTo(-s * 0.07, -s * 0.85); ctx.fill();
                ctx.restore();
            }
        });
    }

    // Shooting star with a golden tail (Hari Raya night sky)
    function makeShootingStar(color) {
        return makeVisitor({
            first: [7, 12], gap: [9, 18],
            init(st) { const L = Math.random() < 0.5; st.x = L ? R(W * 0.1, W * 0.5) : R(W * 0.5, W * 0.95); st.y = R(H * 0.04, H * 0.3); st.a = L ? R(0.35, 0.7) : R(Math.PI - 0.7, Math.PI - 0.35); st.len = R(W * 0.22, W * 0.4); },
            dur() { return 1.1; },
            run(ctx, t, p, st) {
                const hx = st.x + Math.cos(st.a) * st.len * p, hy = st.y + Math.sin(st.a) * st.len * p, tl = st.len * 0.35 * Math.sin(p * Math.PI);
                const g = ctx.createLinearGradient(hx, hy, hx - Math.cos(st.a) * tl, hy - Math.sin(st.a) * tl); g.addColorStop(0, color); g.addColorStop(1, 'rgba(255,255,255,0)');
                ctx.strokeStyle = g; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx - Math.cos(st.a) * tl, hy - Math.sin(st.a) * tl); ctx.stroke();
                glow(ctx, hx, hy, 18, '#ffffff', 0.9); star4(ctx, hx, hy, 8, '#ffffff', 1);
            }
        });
    }

    // Cupid's arrow trailing hearts (Valentine's)
    function makeCupidArrow() {
        return makeVisitor({
            first: [8, 14], gap: [30, 55],
            init(st) { flyInit(st, 0.15, 0.7); },
            dur() { return (W + 200) / clamp(W * 0.22, 190, 320); },
            run(ctx, t, p, st) {
                const q = crossing(st, p, 30, H - 30, H * 0.08), d = st.dir, L = clamp(W / 12, 60, 100);
                for (let i = 1; i < 12; i++) {
                    const bx = q.x - d * i * 22, by = q.y + Math.sin(i * 0.8 + t * 3) * 8 + i * 1.5;
                    ctx.save(); ctx.translate(bx, by); ctx.rotate(Math.sin(i + t) * 0.4); ctx.globalAlpha = 1 - i / 12; ctx.fillStyle = i % 2 ? '#ff4d85' : '#ffb3c7'; const hs = 14 - i * 0.7; heartPath(ctx, hs); ctx.fill(); ctx.restore();
                }
                ctx.save(); ctx.translate(q.x, q.y); ctx.scale(d, 1); ctx.rotate(q.ang * d);
                glow(ctx, 0, 0, L * 0.9, '#ff7aa5', 0.5);
                ctx.strokeStyle = '#7a4a2a'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-L * 0.5, 0); ctx.lineTo(L * 0.5, 0); ctx.stroke();
                ctx.fillStyle = '#e8d8c0'; ctx.beginPath(); ctx.moveTo(L * 0.5, -7); ctx.lineTo(L * 0.72, 0); ctx.lineTo(L * 0.5, 7); ctx.fill();
                ctx.fillStyle = '#ff2d6f'; for (let k = 0; k < 3; k++) { ctx.beginPath(); ctx.moveTo(-L * 0.5 + k * 7, 0); ctx.lineTo(-L * 0.5 + k * 7 - 9, -9); ctx.lineTo(-L * 0.5 + k * 7 - 3, 0); ctx.lineTo(-L * 0.5 + k * 7 - 9, 9); ctx.fill(); }
                ctx.restore();
            }
        });
    }

    // Butterflies fluttering through (Valentine's / Vesak)
    function makeButterflies(c1, c2) {
        return makeVisitor({
            first: [12, 20], gap: [25, 45],
            init(st) { st.dir = Math.random() < 0.5 ? 1 : -1; st.y0 = R(H * 0.25, H * 0.75); st.ph = R(0, 6); st.n = 3; },
            dur() { return (W + 160) / 95; },
            run(ctx, t, p, st) {
                for (let b = 0; b < st.n; b++) {
                    const pp = p - b * 0.025, x = st.dir > 0 ? -80 + pp * (W + 160) : W + 80 - pp * (W + 160), y = st.y0 + b * 34 + Math.sin(pp * 14 + st.ph + b) * 55 + Math.sin(pp * 5 + b) * 40, f = Math.abs(Math.sin(t * 11 + b)), s = 14 - b * 2;
                    ctx.save(); ctx.translate(x, y); ctx.rotate(Math.cos(pp * 14 + st.ph + b) * 0.35 * st.dir);
                    for (const sg of [-1, 1]) { ctx.save(); ctx.scale(sg * Math.max(0.15, f), 1); const g = ctx.createRadialGradient(s * 0.5, -s * 0.3, 1, s * 0.5, -s * 0.2, s * 1.1); g.addColorStop(0, '#fff'); g.addColorStop(0.5, c1); g.addColorStop(1, c2); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 0.4, s * 0.62, s * 0.8, -0.5, 0, TAU); ctx.fill(); ctx.beginPath(); ctx.ellipse(s * 0.4, s * 0.45, s * 0.42, s * 0.55, 0.5, 0, TAU); ctx.fill(); ctx.restore(); }
                    ctx.fillStyle = '#3a2a2a'; ctx.fillRect(-1, -s * 0.8, 2, s * 1.6); ctx.restore();
                }
            }
        });
    }

    // Jade rabbit hops across the bottom, moonlit (Mid-Autumn)
    function makeJadeRabbit() {
        const s = clamp(W / 26, 24, 40);
        return makeVisitor({
            first: [10, 16], gap: [40, 70],
            init(st) { st.dir = Math.random() < 0.5 ? 1 : -1; },
            dur() { return (W + 160) / 120; },
            run(ctx, t, p, st) {
                const x = st.dir > 0 ? -60 + p * (W + 120) : W + 60 - p * (W + 120), hop = Math.abs(Math.sin(p * (W / 70) * Math.PI)), y = H - 16 - hop * s * 1.6;
                ctx.save(); ctx.translate(x, y); ctx.scale(st.dir, 1); glow(ctx, 0, -s * 0.4, s * 2.2, '#fff6cf', 0.25);
                const g = ctx.createLinearGradient(0, -s, 0, 0); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#dfe6ea'); ctx.fillStyle = g; ctx.strokeStyle = 'rgba(120,130,140,.5)'; ctx.lineWidth = 1;
                ctx.beginPath(); ctx.ellipse(0, -s * 0.4, s * 0.62, s * 0.38, 0, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(s * 0.6, -s * 0.72, s * 0.28, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.ellipse(s * 0.55, -s * 1.25, s * 0.09, s * 0.36, 0.1, 0, TAU); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.ellipse(s * 0.72, -s * 1.22, s * 0.09, s * 0.34, 0.3, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.beginPath(); ctx.arc(-s * 0.64, -s * 0.46, s * 0.14, 0, TAU); ctx.fill(); ctx.stroke();
                ctx.fillStyle = '#e24a6a'; ctx.beginPath(); ctx.arc(s * 0.77, -s * 0.74, 2, 0, TAU); ctx.fill();
                ctx.restore();
            }
        });
    }

    // Peacock-free Deepavali visitor: a rocket climbs and bursts, and a sparkler writes light in the air
    function makeSparklerSwirl() {
        return makeVisitor({
            first: [8, 14], gap: [24, 45],
            init(st) { st.cx = R(W * 0.15, W * 0.85); st.cy = R(H * 0.25, H * 0.6); st.r = R(60, 110); st.pts = []; },
            dur() { return 3.2; },
            run(ctx, t, p, st) {
                const a = p * TAU * 2.2, rr = st.r * (0.25 + 0.75 * Math.sin(Math.min(1, p * 1.2) * Math.PI / 2)), x = st.cx + Math.cos(a) * rr * 1.4, y = st.cy + Math.sin(a * 1.5) * rr;
                st.pts.push({ x: x, y: y, l: 1 });
                st.pts.forEach(q => { q.l -= 0.012; });
                st.pts = st.pts.filter(q => q.l > 0);
                st.pts.forEach(q => glow(ctx, q.x, q.y, 10 * q.l + 3, '#ffb347', q.l * 0.6));
                if (p < 0.9) { glow(ctx, x, y, 34, '#fff1a8', 0.9); for (let i = 0; i < 6; i++) star4(ctx, x + R(-18, 18), y + R(-18, 18), R(2, 6), i % 2 ? '#ffe27a' : '#ff8fd0', 0.95); }
            }
        });
    }

    // Firecracker string (CNY): a red string hangs from the top corner and crackles
    function makeFirecrackers() {
        return makeVisitor({
            first: [14, 22], gap: [45, 80],
            init(st) { st.x = Math.random() < 0.5 ? R(W * 0.04, W * 0.2) : R(W * 0.8, W * 0.96); st.n = mob ? 9 : 14; },
            dur() { return 3.4; },
            run(ctx, t, p, st) {
                const fall = smooth(0, 0.12, p), L = st.n * 18 * fall;
                ctx.strokeStyle = '#7a0b12'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(st.x, 0); ctx.lineTo(st.x, L); ctx.stroke();
                for (let i = 0; i < st.n; i++) {
                    const y = 10 + i * 18, boom = 0.18 + i * 0.045, k = (p - boom) / 0.12;
                    if (y > L) continue;
                    if (k < 0) { ctx.save(); ctx.translate(st.x + (i % 2 ? 5 : -5), y); ctx.fillStyle = '#d91e2a'; ctx.fillRect(-3, -7, 6, 14); ctx.fillStyle = '#ffd166'; ctx.fillRect(-3, -2, 6, 3); ctx.restore(); }
                    else if (k < 1) { glow(ctx, st.x, y, 60 * (1 - k * 0.4), '#ff9a3c', 0.8 * (1 - k)); for (let s2 = 0; s2 < 6; s2++) { const a = s2 / 6 * TAU + i, rr = 14 + k * 38; star4(ctx, st.x + Math.cos(a) * rr, y + Math.sin(a) * rr, 5 * (1 - k) + 1.5, '#ffe27a', 1 - k); } ctx.fillStyle = 'rgba(255,255,230,' + 0.5 * (1 - k) + ')'; ctx.fillRect(st.x - 14 * (1 - k), y - 1.5, 28 * (1 - k), 3); }
                }
            }
        });
    }

    // Confetti cannons from both bottom corners (Grand Opening) and a gold year banner (New Year)
    function makeConfettiCannons() {
        const cols = ['#e74c3c', '#f39c12', '#27ae60', '#1a8cd8', '#9b59b6', '#ffd700'];
        return makeVisitor({
            first: [8, 13], gap: [28, 50],
            init(st) { st.ps = []; for (let i = 0; i < (mob ? 50 : 90); i++) { const left = i % 2 === 0, a = left ? R(-1.35, -0.75) : R(-2.4, -1.8), v = R(480, 920); st.ps.push({ x: left ? 0 : W, y: H, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: cols[i % cols.length], r: R(0, 6), w: R(5, 9) }); } st.last = 0; },
            dur() { return 3.2; },
            run(ctx, t, p, st, dt) {
                st.ps.forEach(q => { q.vy += 640 * dt; q.vx *= 0.985; q.vy *= 0.985; q.x += q.vx * dt; q.y += q.vy * dt; q.r += dt * 9; ctx.save(); ctx.translate(q.x, q.y); ctx.rotate(q.r); ctx.globalAlpha = clamp(1.25 - p, 0, 1); ctx.fillStyle = q.c; ctx.fillRect(-q.w / 2, -2.5, q.w, 5 * Math.abs(Math.cos(q.r * 1.3)) + 1); ctx.restore(); });
                if (p < 0.12) { glow(ctx, 0, H, 140, '#fff4c2', 0.7 * (1 - p / 0.12)); glow(ctx, W, H, 140, '#fff4c2', 0.7 * (1 - p / 0.12)); }
            }
        });
    }
    function makeYearBanner() {
        const d = new Date(), yr = d.getMonth() >= 6 ? d.getFullYear() + 1 : d.getFullYear();
        return makeVisitor({
            first: [8, 13], gap: [40, 70],
            init(st) { st.ps = []; },
            dur() { return 5.5; },
            run(ctx, t, p, st, dt) {
                const a = smooth(0, 0.18, p) * (1 - smooth(0.78, 1, p)), sc = 0.8 + 0.2 * smooth(0, 0.25, p), fs = clamp(W / 5.5, 70, 190), cx = W / 2, cy = H * 0.42;
                ctx.save(); ctx.globalAlpha = a; ctx.translate(cx, cy); ctx.scale(sc, sc);
                glow(ctx, 0, 0, fs * 1.6, '#ffd36a', 0.35);
                ctx.font = '800 ' + fs + 'px "Playfair Display", Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                const g = ctx.createLinearGradient(0, -fs * 0.5, 0, fs * 0.5); g.addColorStop(0, '#fff7c9'); g.addColorStop(0.5, '#f4c542'); g.addColorStop(1, '#a8741a');
                ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(60,35,5,.55)'; ctx.strokeText(String(yr), 0, 0); ctx.fillStyle = g; ctx.fillText(String(yr), 0, 0);
                ctx.restore();
                if (a > 0.2 && Math.random() < 0.7) star4(ctx, cx + R(-fs * 1.3, fs * 1.3), cy + R(-fs * 0.5, fs * 0.5), R(4, 10), '#fff2b0', a);
            }
        });
    }

    // Lotus lantern bloom (Vesak): a glowing lotus rises and opens
    function makeLotusBloom() {
        return makeVisitor({
            first: [9, 15], gap: [30, 55],
            init(st) { st.x = R(W * 0.15, W * 0.85); },
            dur() { return 7; },
            run(ctx, t, p, st) {
                const y = H * 0.9 - p * H * 0.55, op = smooth(0, 0.1, p) * (1 - smooth(0.8, 1, p)), open = smooth(0.1, 0.6, p), r = clamp(W / 20, 26, 46), x = st.x + Math.sin(p * 9) * 14;
                ctx.save(); ctx.translate(x, y); ctx.globalAlpha = op; glow(ctx, 0, 0, r * 3.2, '#ffe39a', 0.55);
                for (let ring = 0; ring < 3; ring++) for (let i = 0; i < 8; i++) {
                    const a = -Math.PI / 2 + (i - 3.5) / 3.5 * (0.35 + open * 1.0 + ring * 0.0) * (1 - ring * 0.18), len = r * (1 - ring * 0.2);
                    ctx.save(); ctx.rotate(a); const g = ctx.createLinearGradient(0, 0, 0, -len); g.addColorStop(0, ring === 2 ? '#fff0f6' : '#ffd1e6'); g.addColorStop(1, ring === 2 ? '#ffe9a8' : '#f46fa6'); ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-len * 0.34, -len * 0.5, 0, -len); ctx.quadraticCurveTo(len * 0.34, -len * 0.5, 0, 0); ctx.fill(); ctx.restore();
                }
                glow(ctx, 0, -r * 0.2, r * 0.9, '#fff1b8', 0.9); ctx.restore();
            }
        });
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
        Deepavali: () => { const r = makeRangoliScene(); return stack({ back: (c, t) => r.back(c, t) }, asFront(makeMotes(['#ffb347', '#ff6fb5', '#ffd54f'], 24, { rise: true, star: true })), asFront(makeHangers('akash', null)), makeSparklerSwirl()); },
        CNY: () => stack(makeClouds(), asFront(makeFlutter({ kind: 'coin', colors: ['#ffd54f'], count: 9, size: [14, 20], vy: [30, 55], drift: 6, spin: 0, sway: 14, alpha: [0.85, 1], flip: true })),
            asFront(makeHangers('lantern', { pick: redLantern })), makeFirecrackers(), makeDragonFlight()),
        HariRaya: () => { const cr = makeCrescent(W - (mob ? 54 : 92), mob ? 52 : 66, mob ? 22 : 31); return stack({ front: (c, t) => cr.back(c, t) }, makeStars(34, ['#ffe9a0', '#ffffff', '#b9f6ca']), asFront(makeMotes(['#27ae60', '#f1c40f', '#ffe9a0'], 22, { star: true })), asFront(makeHangers('ketupat', null)), makeShootingStar('#ffe9a0')); },
        Christmas: () => stack(makeAurora(), makeBokeh(['#ffb347', '#ff5a5a', '#ffe9a0', '#52e08a'], 16, 0.35),
            asFront(makeFlutter({ kind: 'flake', colors: ['#ffffff'], count: 85, size: [5, 11], vy: [28, 55], drift: 6, spin: 0, sway: 16, alpha: [0.5, 0.9] })),
            asFront(makeFlutter({ kinds: ['flake', 'crystal', 'crystal'], colors: ['#ffffff'], count: 22, size: [14, 24], vy: [45, 80], drift: 8, spin: 0.8, sway: 24, alpha: [0.7, 1] })),
            asFront(makeFairyLights()), asFront(makeHangers('bauble', { pick: i => ({ c: ['#d90429', '#ffb703', '#2e9a45', '#3a86ff'][i % 4] }) })), makeSleigh()),
        Thaipusam: () => stack(makeRays('#ffb703', 0.07, W * 0.5, -H * 0.08, 28), asFront(makeMotes(['#ffb703', '#ff7a00', '#ffe27a'], 20, { rise: true, star: true })),
            asFront(makeFlutter({ kind: 'petal', colors: ['#ff9800', '#ffb300', '#ff6f00', '#ffc107'], count: 24, size: [13, 21], vy: [35, 70], drift: 8, spin: 1.5, sway: 22, alpha: [0.8, 1], flip: true })),
            asFront(makeGarland()), asFront(makeHangers('bell', null)), makePeacock()),
        NationalDay: () => makeFlagScene(makeWau),
        MalaysiaDay: () => makeFlagScene(makeHornbill),
        MooncakeFestival: () => stack((() => { const m = makeMoon(W - (mob ? 56 : 96), mob ? 54 : 68, mob ? 24 : 36); return { front: (c, t) => m.back(c, t) }; })(), makeStars(30, ['#fff6cf', '#ffffff']), asFront(makeMotes(['#ffd27a', '#fff2b8'], 26, {})),
            makeSkyLanterns(roundOrange), asFront(makeHangers('lantern', { pick: i => roundOrange })), makeJadeRabbit()),
        NewYear: () => stack(makeGlitter(), makeBeams('#ffe9a0'),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#ffd700', '#e8e8f0', '#ff5e5e', '#5ec8ff', '#b388ff'], count: 55, size: [9, 15], vy: [50, 100], drift: 10, spin: 4, sway: 26, alpha: [0.85, 1], flip: true })),
            asFront(makeMotes(['#ffd700', '#ffffff'], 22, { star: true })), makeYearBanner(), makeConfettiCannons()),
        Valentines: () => stack(makeBokeh(['#ff6f9c', '#ffb3c7', '#ff3d7f'], 18, 0.4),
            asFront(makeFlutter({ kind: 'petal', colors: ['#b0123f', '#d81b60', '#e91e63', '#8e0f35'], count: 26, size: [14, 22], vy: [32, 62], drift: 8, spin: 1.6, sway: 24, alpha: [0.85, 1], flip: true })),
            asFront(makeFlutter({ kind: 'heart', colors: ['#ff4d85', '#e91e63'], count: 7, size: [12, 20], vy: [22, 40], drift: 6, spin: 0.5, sway: 18, alpha: [0.7, 0.95] })),
            asFront(makeHangers('heart', { pick: i => ({ c: ['#e91e63', '#d90429', '#ff4d85'][i % 3] }) })), makeCupidArrow(), makeButterflies('#ff8fb1', '#c2185b')),
        GrandOpening: () => stack(makeBeams('#fff4c2'), asFront(makeBunting(['#e74c3c', '#f39c12', '#27ae60', '#1a8cd8', '#9b59b6'])),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#e74c3c', '#f39c12', '#27ae60', '#1a8cd8', '#9b59b6', '#ffd700'], count: 46, size: [9, 14], vy: [50, 95], drift: 10, spin: 4, sway: 24, alpha: [0.85, 1], flip: true })), makeConfettiCannons()),
        Vesak: () => stack(makeRays('#ffd54f', 0.06, W * 0.5, -H * 0.1, 22), makeLotusOutline(), asFront(makeMotes(['#ffe08a', '#fff4c2'], 24, { star: true })),
            asFront(makeFlutter({ kind: 'petal', colors: ['#ffd1e6', '#fff0f7', '#f9a8cd'], count: 20, size: [13, 20], vy: [26, 52], drift: 6, spin: 1.2, sway: 20, alpha: [0.8, 1], flip: true })),
            makeSkyLanterns({ c1: '#fff4d0', c2: '#ffcf6a', c3: '#e0903a', light: '#ffd27a', tassel: '#fff0c0', round: true }), asFront(makeHangers('lotus', null)), makeDove(), makeLotusBloom(), makeButterflies('#fff3b0', '#e0a21a')),
        Default: () => stack(makeBokeh(['#ffd27a', '#9be7c4', '#ffb3c7'], 12, 0.3), asFront(makeMotes(['#ffd27a', '#ffffff'], 18, { star: true })))
    };
    function makeFlagScene(extra) {
        const fw = Math.round(clamp(W * 0.13, 84, 190)), f = makeFlag(fw);
        const fl = { c: f.c, w: fw, h: fw / 2 };
        return stack(makeWaves(['rgba(204,0,1,.07)', 'rgba(255,255,255,.18)', 'rgba(1,0,102,.07)']), asFront(makeBunting(['#cc0001', '#ffffff', '#010066', '#ffcc00'])),
            asFront(makeFlutter({ kind: 'confetti', colors: ['#cc0001', '#ffffff', '#010066', '#ffcc00'], count: 36, size: [9, 14], vy: [45, 90], drift: 10, spin: 3.5, sway: 24, alpha: [0.85, 1], flip: true })),
            { front: (c, t) => { drawFlag(c, fl, 12, mob ? 54 : 70, t); drawFlag(c, fl, W - 12 - fw, mob ? 54 : 70, t); } }, extra());
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
