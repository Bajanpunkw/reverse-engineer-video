// Render server: the same renderer as scripts/render.cjs, behind HTTP. Every request needs ?key=<RENDER_KEY>.
//   GET /status                                   progress
//   GET /start?start=0&end=49&fps=30&workers=6    start a render (one at a time)
//   GET /out.mp4                                  the finished video
//   GET /frame.jpg?t=12.5                         one control frame
const http = require('http'), fs = require('fs'), path = require('path');
const { render, renderFrames } = require('./render.cjs');
const KEY = process.env.RENDER_KEY, SRC = process.env.SRC || path.join(__dirname, 'src');
const OUT_DIR = '/tmp/render'; fs.mkdirSync(OUT_DIR, { recursive: true }); const OUT = path.join(OUT_DIR, 'out.mp4');
let state = { status: 'idle' };
process.on('unhandledRejection', e => console.log('unhandled', e && e.message));
http.createServer(async (q, r) => {
  const u = new URL(q.url, 'http://x');
  if (u.pathname === '/health') { r.writeHead(200); return r.end('ok'); }
  if (!KEY || u.searchParams.get('key') !== KEY) { r.writeHead(401); return r.end('no'); }
  const num = (k, d) => u.searchParams.has(k) ? parseFloat(u.searchParams.get(k)) : d;
  try {
    if (u.pathname === '/status') { r.writeHead(200, { 'Content-Type': 'application/json' }); return r.end(JSON.stringify(state)); }
    if (u.pathname === '/start') {
      if (state.status === 'running') { r.writeHead(409); return r.end('busy'); }
      const t0 = Date.now(); state = { status: 'running', done: 0, total: 0 };
      render({ src: SRC, out: OUT, start: num('start', 0), end: num('end', 5), fps: num('fps', 30), workers: num('workers', 4),
        onProgress: (d, n) => { state.done = d; state.total = n; state.msPerFrame = Math.round((Date.now() - t0) / d); } })
        .then(() => { state.status = 'done'; state.seconds = Math.round((Date.now() - t0) / 1000); })
        .catch(e => { state.status = 'error'; state.error = e.message; });
      r.writeHead(200); return r.end('started');
    }
    if (u.pathname === '/out.mp4') { if (!fs.existsSync(OUT)) { r.writeHead(404); return r.end(); }
      r.writeHead(200, { 'Content-Type': 'video/mp4', 'Content-Length': fs.statSync(OUT).size }); return fs.createReadStream(OUT).pipe(r); }
    if (u.pathname === '/frame.jpg') { const [f] = await renderFrames({ src: SRC, outDir: path.join(OUT_DIR, 'frames'), times: [num('t', 5)] });
      r.writeHead(200, { 'Content-Type': 'image/jpeg' }); return r.end(fs.readFileSync(f)); }
    r.writeHead(404); r.end();
  } catch (e) { r.writeHead(500); r.end(String(e.message)); }
}).listen(process.env.PORT || 8080, () => console.log('render server up'));
