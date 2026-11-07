#!/usr/bin/env node
// Frame-by-frame renderer for a video page (see stages/3-build.md for the page contract).
// Opens <src>/video.html in headless Chrome, calls window.renderFrame(t) for each frame, screenshots → ffmpeg → mp4.
//
//   node scripts/render.cjs <src_dir> <out.mp4> --end 49 [--start 0] [--fps 30] [--workers 2] [--size 1080x1920] [--audio a.wav] [--gpu]
//   node scripts/render.cjs <src_dir> <out_dir> --frames 2.5,10,20        → out_dir/f2.5.jpg …  (control frames)
//
// WebGL runs on the CPU (SwiftShader) by default so frames look the same on every machine; --gpu uses your graphics card.
// Rendering is CPU-heavy: on a laptop start with --workers 2, or use the optional server (server/README.md).
const path = require('path'), http = require('http'), fs = require('fs'), os = require('os'), { spawn } = require('child_process');

function req(...names) { for (const n of names) { try { return require(n); } catch (e) { /* next */ } } return null; }
const puppeteer = req('puppeteer', 'puppeteer-core');
const FF = process.env.FFMPEG || req('ffmpeg-static') || 'ffmpeg';
const THREE_DIR = (() => { try { return path.dirname(require.resolve('three/package.json')); } catch (e) { return null; } })();
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.ttf': 'font/ttf',
  '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml',
  '.wav': 'audio/wav', '.mp3': 'audio/mpeg' };

function staticServer(src) {
  return new Promise(res => {
    const srv = http.createServer((q, r) => {
      const u = decodeURIComponent(q.url.split('?')[0]);
      const f = u.startsWith('/three/') && THREE_DIR ? path.join(THREE_DIR, u.slice(7)) : path.join(src, u);
      fs.readFile(f, (e, d) => { if (e) { r.writeHead(404); return r.end(); }
        r.writeHead(200, { 'Content-Type': TYPES[path.extname(f)] || 'application/octet-stream' }); r.end(d); });
    }).listen(0, '127.0.0.1', () => res(srv));
  });
}

function run(cmd, args) {
  return new Promise((ok, bad) => { const p = spawn(cmd, args, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', bad); p.on('close', c => c === 0 ? ok() : bad(new Error(`${cmd} exited with ${c}`))); });
}

async function launch(gpu) {
  if (!puppeteer) throw new Error('puppeteer not installed: run scripts/setup.sh');
  const args = ['--no-sandbox', '--disable-dev-shm-usage', '--force-color-profile=srgb', '--ignore-gpu-blocklist'];
  if (!gpu) args.push('--use-angle=swiftshader', '--enable-unsafe-swiftshader');
  for (let k = 0; ; k++) {
    try { return await puppeteer.launch({ executablePath: process.env.CHROME || undefined, headless: true, args }); }
    catch (e) { if (k >= 4) throw e; console.log('browser launch retry', k + 1, e.message.split('\n')[0]); await new Promise(r => setTimeout(r, 3000)); }
  }
}

async function openPage(b, port, size, t) {
  const p = await b.newPage();
  p.on('pageerror', e => console.log('[page error]', e.message));
  p.on('console', m => { if (m.type() === 'error') console.log('[console]', m.text()); });
  await p.setViewport({ width: size[0], height: size[1], deviceScaleFactor: 1 });
  await p.goto(`http://127.0.0.1:${port}/video.html?t=${t}`);
  await p.waitForFunction('window.READY === true', { timeout: 300000 });
  return p;
}

// page size = video size: read from <body> unless --size is given
async function detectSize(b, port) {
  const p = await b.newPage(); await p.setViewport({ width: 2000, height: 2000 });
  await p.goto(`http://127.0.0.1:${port}/video.html?t=0`); await p.waitForFunction('window.READY === true', { timeout: 300000 });
  const s = await p.evaluate(() => [document.body.offsetWidth, document.body.offsetHeight]); await p.close(); return s;
}

// opts: {src, start, end, fps, workers, out, audio, size:[w,h], gpu, onProgress(done,total)}
async function render(opts) {
  const { src, start = 0, end, fps = 30, out, audio, gpu = false, onProgress = () => {} } = opts;
  const workers = Math.max(1, opts.workers || 2);
  const N = Math.round((end - start) * fps), per = Math.ceil(N / workers);
  const dir = path.join(path.dirname(path.resolve(out)), `.frames_${start}_${end}_${fps}`); fs.mkdirSync(dir, { recursive: true });
  const srv = await staticServer(src), port = srv.address().port; let done = 0;
  try {
    let size = opts.size;
    if (!size) { const b = await launch(gpu); try { size = await detectSize(b, port); } finally { await b.close(); } }
    const chunk = async (i0, i1, delay) => {
      await new Promise(r => setTimeout(r, delay));
      const b = await launch(gpu);
      try {
        const p = await openPage(b, port, size, start + i0 / fps);
        for (let i = i0; i < i1; i++) {
          const f = path.join(dir, String(i).padStart(6, '0') + '.jpg');
          if (fs.existsSync(f)) { onProgress(++done, N); continue; }     // resume after a crash
          await p.evaluate(t => window.renderFrame(t), start + i / fps);
          await p.screenshot({ path: f + '.tmp.jpg', type: 'jpeg', quality: 93 });
          fs.renameSync(f + '.tmp.jpg', f); onProgress(++done, N);
        }
      } finally { await b.close().catch(() => {}); }
    };
    const jobs = [];
    for (let k = 0; k < workers; k++) { const i0 = k * per, i1 = Math.min(N, (k + 1) * per); if (i0 < i1) jobs.push(chunk(i0, i1, k * 2500)); }
    const res = await Promise.allSettled(jobs); const bad = res.find(r => r.status === 'rejected'); if (bad) throw bad.reason;
    const args = ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, '%06d.jpg')];
    if (audio) args.push('-ss', String(start), '-i', audio, '-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '192k', '-shortest');
    args.push('-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '17', '-preset', 'medium', '-movflags', '+faststart', out);
    await run(FF, args);
    fs.rmSync(dir, { recursive: true, force: true });
  } finally { srv.close(); }
  return out;
}

// single control frames → outDir/f<t>.jpg
async function renderFrames({ src, outDir, times, size, gpu = false }) {
  fs.mkdirSync(outDir, { recursive: true });
  const srv = await staticServer(src), port = srv.address().port; const b = await launch(gpu); const files = [];
  try {
    size = size || await detectSize(b, port);
    const p = await openPage(b, port, size, times[0]);
    for (const t of times) { await p.evaluate(t => window.renderFrame(t), t); const f = path.join(outDir, `f${t}.jpg`);
      await p.screenshot({ path: f, type: 'jpeg', quality: 92 }); files.push(f); }
  } finally { await b.close().catch(() => {}); srv.close(); }
  return files;
}

module.exports = { render, renderFrames };

if (require.main === module) {
  const [src, out, ...rest] = process.argv.slice(2);
  if (!src || !out) { console.log('usage: node scripts/render.cjs <src_dir> <out.mp4|out_dir> --end S [--start S] [--fps 30] [--workers 2] [--size WxH] [--audio a.wav] [--gpu] [--frames t1,t2]'); process.exit(1); }
  const o = {}; for (let i = 0; i < rest.length; i++) { const k = rest[i].replace(/^--/, ''); if (k === 'gpu') o.gpu = true; else o[k] = rest[++i]; }
  const size = o.size ? o.size.split('x').map(Number) : undefined;
  const t0 = Date.now();
  (async () => {
    if (o.frames) {
      const files = await renderFrames({ src: path.resolve(src), outDir: out, times: o.frames.split(',').map(Number), size, gpu: !!o.gpu });
      console.log(`${files.length} frames → ${out} (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
    } else {
      if (!o.end) { console.log('--end is required'); process.exit(1); }
      const workers = o.workers ? +o.workers : Math.max(1, Math.min(4, Math.floor(os.cpus().length / 2)));
      await render({ src: path.resolve(src), out, start: +(o.start || 0), end: +o.end, fps: +(o.fps || 30), workers, size, gpu: !!o.gpu, audio: o.audio,
        onProgress: (d, n) => { if (d % 30 === 0 || d === n) process.stdout.write(`\r${d}/${n} frames, ${((Date.now() - t0) / d).toFixed(0)} ms/frame   `); } });
      console.log(`\ndone: ${out} (${((Date.now() - t0) / 60000).toFixed(1)} min)`);
    }
  })().catch(e => { console.error(e); process.exit(1); });
}
