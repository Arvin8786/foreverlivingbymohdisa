/* DOM helpers shared by the shop and its portals. */
window.StoreUI = {
    safeRichText(value) {
        const source = document.createElement('template'); source.innerHTML = String(value ?? '');
        const allowed = new Set(['P', 'BR', 'STRONG', 'B', 'EM', 'I', 'UL', 'OL', 'LI', 'H3', 'H4', 'A']);
        function clean(parent) {
            for (const node of [...parent.childNodes]) {
                if (node.nodeType === Node.TEXT_NODE) continue;
                if (node.nodeType !== Node.ELEMENT_NODE) { node.remove(); continue; }
                if (['SCRIPT', 'STYLE', 'SVG', 'MATH', 'IFRAME', 'OBJECT', 'TEMPLATE'].includes(node.tagName)) { node.remove(); continue; }
                clean(node);
                if (!allowed.has(node.tagName)) { node.replaceWith(...node.childNodes); continue; }
                const href = node.getAttribute('href');
                for (const attribute of [...node.attributes]) node.removeAttribute(attribute.name);
                if (node.tagName === 'A' && href) {
                    try {
                        const url = new URL(href, document.baseURI);
                        if (['https:', 'http:', 'mailto:'].includes(url.protocol)) {
                            node.href = url.href; node.target = '_blank'; node.rel = 'noopener noreferrer';
                        }
                    } catch { /* Invalid links remain plain text. */ }
                }
            }
        }
        clean(source.content); return source.innerHTML;
    },
    image(source) {
        try {
            const raw = String(source || '');
            if (!raw.trim()) return '';
            if (Object.hasOwn(window.FL_IMAGE_MAP || {}, raw)) return new URL(window.FL_IMAGE_MAP[raw], document.baseURI).href;
            const url = new URL(raw, document.baseURI);
            if (!['http:', 'https:'].includes(url.protocol)) return '';
            if (url.origin === location.origin) {
                const name = decodeURIComponent(url.pathname.split('/').pop());
                const optimized = window.FL_IMAGE_MAP?.[name];
                if (optimized) return new URL(optimized, document.baseURI).href;
            }
            return url.href;
        } catch { return ''; }
    }
};
