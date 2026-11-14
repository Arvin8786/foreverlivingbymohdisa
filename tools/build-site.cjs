'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const Core = require('../store-core');
const root = path.resolve(__dirname, '..');
const html = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const scriptJson = value => JSON.stringify(value).replace(/</g, '\\u003c');
async function build({ catalog, siteUrl, outDir }) {
    const base = new URL(siteUrl.endsWith('/') ? siteUrl : siteUrl + '/');
    if (!['https:', 'http:'].includes(base.protocol)) throw new Error('PUBLIC_SITE_URL must be an HTTP(S) URL.');
    const site = outDir || path.join(root, '_site');
    if (!catalog || catalog.status !== 'success' || !Array.isArray(catalog.products)) throw new Error('Catalog response must contain status=success and a products array.');
    const products = catalog.products.map(Core.normalizeProduct);
    if (!products.length) throw new Error('Public catalog is empty; preserving the currently deployed site.');
    if (new Set(products.map(p => p.id)).size !== products.length) throw new Error('Duplicate product IDs must be corrected in the public catalog.');
    if (path.resolve(site) === root || path.resolve(site) === path.parse(site).root) throw new Error('Invalid build directory.');
    await fs.mkdir(site, { recursive: true });
    await fs.rm(path.join(site, 'products'), { recursive: true, force: true });
    for (const name of await fs.readdir(root)) {
        if (/\.(html|js|css|jpg|png|webp)$/.test(name)) await fs.copyFile(path.join(root, name), path.join(site, name));
    }
    await fs.cp(path.join(root, 'assets'), path.join(site, 'assets'), { recursive: true });
    const home = new URL('index.html', base).href;
    const urls = [base.href, new URL('products/', base).href];
    for (const p of products) {
        const relative = Core.productPath(p); const url = new URL(relative, base).href;
        const image = new URL(p.image || 'assets/social.jpg', base);
        const safeImage = ['https:', 'http:'].includes(image.protocol) ? image.href : new URL('assets/social.jpg', base).href;
        const description = `${p.name}. ${p.benefits || 'Explore product details and shop the collection.'}`.slice(0, 160);
        const schema = { '@context': 'https://schema.org', '@type': 'Product', name: p.name, sku: p.id, description, image: safeImage };
        if (p.price !== null) schema.offers = { '@type': 'Offer', priceCurrency: 'MYR', price: p.price, url };
        const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${html(p.name)} | Forever Living by Muhd Isa</title><meta name="description" content="${html(description)}"><link rel="canonical" href="${html(url)}"><meta property="og:type" content="product"><meta property="og:title" content="${html(p.name)}"><meta property="og:description" content="${html(description)}"><meta property="og:image" content="${html(safeImage)}"><meta property="og:url" content="${html(url)}"><meta name="twitter:card" content="summary_large_image"><link rel="stylesheet" href="${new URL('style.css', base).href}"><script type="application/ld+json">${scriptJson(schema)}</script></head><body class="shop"><main class="static-product"><a href="${html(home)}">Forever Living by Muhd Isa</a><nav aria-label="Breadcrumb"><a href="${new URL('products/', base).href}">All products</a></nav><article class="pd-card"><div class="pd-media"><img src="${html(safeImage)}" alt="${html(p.name)}" width="640" height="640"></div><div class="pd-info"><p class="section-eyebrow">${html(p.category)}</p><h1>${html(p.name)}</h1><p class="pd-price">${p.price === null ? 'Ask the shop for current pricing' : 'RM ' + p.price.toFixed(2)}</p><p>${html(p.benefits)}</p>${p.consumption ? `<h2>How to use</h2><p>${html(p.consumption)}</p>` : ''}<p>Check the live shop for current pricing and availability before ordering.</p><a class="btn btn-primary" href="${html(home + '?product=' + encodeURIComponent(p.id))}">Shop this product</a></div></article></main></body></html>`;
        const target = path.join(site, relative); await fs.mkdir(target, { recursive: true }); await fs.writeFile(path.join(target, 'index.html'), page); urls.push(url);
    }
    await fs.mkdir(path.join(site, 'products'), { recursive: true });
    await fs.writeFile(path.join(site, 'products/index.html'), `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Our collection | Forever Living by Muhd Isa</title><link rel="canonical" href="${new URL('products/', base).href}"><link rel="stylesheet" href="${new URL('style.css', base).href}"></head><body><main class="static-product"><h1>Explore the collection</h1><p><a href="${html(home)}">Open the live shop</a> for current prices and availability.</p><ul class="static-product-list">${products.map(p => `<li><a href="${html(new URL(Core.productPath(p), base).href)}">${html(p.name)}</a><span>${html(p.category)}</span></li>`).join('')}</ul></main></body></html>`);
    await fs.writeFile(path.join(site, 'sitemap.xml'), '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' + urls.map(url => `<url><loc>${html(url)}</loc></url>`).join('') + '</urlset>');
    await fs.writeFile(path.join(site, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: ${base.pathname}customer.html\nDisallow: ${base.pathname}agent.html\nSitemap: ${new URL('sitemap.xml', base).href}\n`);
    let index = await fs.readFile(path.join(site, 'index.html'), 'utf8');
    index = index.replace('property="og:image" content="assets/social.jpg"', `property="og:image" content="${new URL('assets/social.jpg', base).href}"`).replace('property="og:url" content="./"', `property="og:url" content="${base.href}"`).replace('rel="canonical" href="./"', `rel="canonical" href="${base.href}"`);
    index = index.replace('<script src="config.js?v=1"></script>', '<script>window.FL_STATIC_CATALOG = true;</script><script src="config.js?v=1"></script>').replace('</noscript>', '<p><a href="products/">Browse the product directory</a></p></noscript>');
    await fs.writeFile(path.join(site, 'index.html'), index); await fs.writeFile(path.join(site, '.nojekyll'), '');
    console.log(`Built ${products.length} public product pages, sitemap and social metadata.`);
    return site;
}
if (require.main === module) (async () => {
    let catalog;
    if (process.env.CATALOG_FILE) catalog = JSON.parse(await fs.readFile(process.env.CATALOG_FILE, 'utf8'));
    else {
        const config = await fs.readFile(path.join(root, 'config.js'), 'utf8');
        const url = config.match(/SCRIPT_URL:\s*(['"])(.*?)\1/)?.[2];
        if (!url) throw new Error('No public Apps Script URL found in config.js.');
        const response = await fetch(url, { signal: AbortSignal.timeout(30000) });
        if (!response.ok) throw new Error(`Public catalog returned HTTP ${response.status}; no site was published.`);
        catalog = await response.json();
    }
    const repo = (process.env.GITHUB_REPOSITORY || 'Arvin8786/foreverlivingbymohdisa').split('/');
    await build({ catalog, siteUrl: process.env.PUBLIC_SITE_URL || `https://${repo[0]}.github.io/${repo[1]}/` });
})().catch(error => { console.error(error.message); process.exitCode = 1; });
module.exports = { build };
