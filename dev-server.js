// Simple static server with SPA (index.html) fallback
// Run: node dev-server.js [port]
const http = require('http');
const fs = require('fs');
const path = require('path');
const port = process.argv[2] || process.env.PORT || 3000;
const root = path.resolve(__dirname);
const mime = {
  '.html':'text/html', '.js':'application/javascript', '.css':'text/css', '.json':'application/json',
  '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.webp':'image/webp', '.svg':'image/svg+xml',
  '.ico':'image/x-icon', '.txt':'text/plain', '.xml':'application/xml'
};

function sendFile(res, filePath){
  const ext = path.extname(filePath).toLowerCase();
  const type = mime[ext] || 'application/octet-stream';
  fs.createReadStream(filePath).on('open', ()=>{
    res.writeHead(200, {'Content-Type': type});
  }).on('error', ()=>{
    res.writeHead(404).end('Not found');
  }).pipe(res);
}

function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1e7) {
        reject(new Error('Request body too large'));
        req.destroy();
      }
    });
    req.on('end', () => {
      if (!body) return resolve({});
      const contentType = (req.headers['content-type'] || '').split(';')[0].trim();
      if (contentType === 'application/json') {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          reject(error);
        }
      } else {
        resolve(body);
      }
    });
    req.on('error', reject);
  });
}

async function handleApiRoute(req, res, filePath) {
  if (req.method === 'POST' || req.method === 'PUT' || req.method === 'PATCH' || req.method === 'DELETE') {
    try {
      req.body = await parseJsonBody(req);
    } catch (error) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ error: 'Invalid JSON payload.' }));
    }
  } else {
    req.body = {};
  }

  delete require.cache[require.resolve(filePath)];
  const handler = require(filePath);
  if (typeof handler !== 'function') {
    res.writeHead(500).end('API handler not found');
    return;
  }

  try {
    await handler(req, res);
  } catch (error) {
    res.writeHead(500).end('Server error');
  }
}

const server = http.createServer((req,res)=>{
  console.log(`[dev-server] ${req.method} ${req.url}`);
  // normalize URL
  const safeSuffix = path.normalize(req.url.split('?')[0]).replace(/^\/+/,'');
  let fileLoc = path.join(root, safeSuffix);
  // Prevent path traversal
  if (!fileLoc.startsWith(root)) return res.writeHead(400).end('Bad request');

  const isApiRoute = safeSuffix.startsWith('api/');
  if (isApiRoute) {
    const apiFile = safeSuffix.endsWith('.js') ? fileLoc : `${fileLoc}.js`;
    if (fs.existsSync(apiFile) && fs.statSync(apiFile).isFile()) {
      console.log(`[dev-server] API route matched: ${apiFile}`);
      return handleApiRoute(req, res, apiFile);
    }
    console.log(`[dev-server] API route not found: ${apiFile}`);
  }

  fs.stat(fileLoc, (err, stats)=>{
    if (!err && stats.isFile()) return sendFile(res, fileLoc);
    // If path maps to a directory, try index.html inside it
    if (!err && stats.isDirectory()){
      const indexPath = path.join(fileLoc, 'index.html');
      return fs.stat(indexPath, (ie, istat)=>{ if (!ie && istat.isFile()) return sendFile(res, indexPath); fallback(); });
    }
    // For GET requests, fall back to root index.html (SPA support)
    function fallback(){
      const index = path.join(root, 'index.html');
      fs.stat(index, (ie, istat)=>{ if (!ie && istat.isFile()) return sendFile(res, index); res.writeHead(404).end('Not found'); });
    }
    if (req.method === 'GET') return fallback();
    res.writeHead(404).end('Not found');
  });
});

server.listen(port, ()=>console.log(`Dev server listening at http://localhost:${port} — serving ${root}`));
