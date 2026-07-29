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

const server = http.createServer((req,res)=>{
  // normalize URL
  const safeSuffix = path.normalize(req.url.split('?')[0]).replace(/^\/+/, '');
  let fileLoc = path.join(root, safeSuffix);
  // Prevent path traversal
  if (!fileLoc.startsWith(root)) return res.writeHead(400).end('Bad request');
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
