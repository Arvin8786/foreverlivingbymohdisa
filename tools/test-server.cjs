const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const types = { '.js': 'application/javascript', '.html': 'text/html', '.css': 'text/css', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
http.createServer(async (req, res) => {
    try {
        let name = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
        if (name.endsWith('/')) name += 'index.html';
        const file = path.resolve(root, '.' + name);
        if (!file.startsWith(root + path.sep) || /(?:^|\/)(?:\.git|node_modules|\.env)(?:\/|$)/.test(name)) throw new Error('Invalid path');
        res.setHeader('Content-Type', types[path.extname(file)] || 'application/octet-stream');
        res.end(await fs.readFile(file));
    } catch { res.statusCode = 404; res.end('Not found'); }
}).listen(4173, '127.0.0.1');
