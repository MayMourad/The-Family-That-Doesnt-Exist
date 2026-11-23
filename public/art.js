'use strict';
/* THE IMPOSSIBLE PORTRAIT — one canvas painter for the on-screen "living poster" and the print export.
   Original code. Techniques: halftone screens at offset angles (overprint), torn-paper edges, sliced-print displacement,
   knock-out type. Nothing here encodes statistics: shapes, counts and positions are purely artistic. */
const ART = (() => {
  const W = 1000, H = 1414;
  const C = { porcelain: '#FFFDF8', ivory: '#F6F1E8', cobalt: '#3659D9', coral: '#EF785F', chartreuse: '#CBE27A', butter: '#F3CC6B', lavender: '#C6B0E2', sage: '#B6CE9B', graphite: '#292D35' };
  const PAL = [C.cobalt, C.coral, C.butter, C.chartreuse, C.lavender, C.sage];

  /* ---------- helpers ---------- */
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0)); return t * t * (3 - 2 * t); };
  function rng(seed) { let a = seed >>> 0; return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let x = Math.imul(a ^ a >>> 15, 1 | a); x = x + Math.imul(x ^ x >>> 7, 61 | x) ^ x; return ((x ^ x >>> 14) >>> 0) / 4294967296; }; }
  function hash(str) { let h = 2166136261; for (const c of str) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
  function lat(i, s) { let n = Math.imul(i, 374761393) + Math.imul(s | 0, 668265263); n = Math.imul(n ^ n >>> 13, 1274126177); return ((n ^ n >>> 16) >>> 0) / 4294967296 * 2 - 1; }
  function sn(x, s) { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f); return lat(i, s) * (1 - u) + lat(i + 1, s) * u; }
  const rgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
  const mix = (a, b, t) => { const A = rgb(a), B = rgb(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], t))).join(',')})`; };

  function trace(ctx, pts) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); }
  function rect(x, y, w, h, rot, cx, cy) {
    const c = Math.cos(rot), s = Math.sin(rot);
    return [[x, y], [x + w, y], [x + w, y + h], [x, y + h]].map(([px, py]) => { const dx = px - cx, dy = py - cy; return [cx + dx * c - dy * s, cy + dx * s + dy * c]; });
  }
  // subdivide + displace along normals: a torn paper edge. amp 0 => crisp polygon.
  function roughen(pts, amp, seed, step = 9) {
    const dense = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / step));
      for (let k = 0; k < n; k++) dense.push([lerp(a[0], b[0], k / n), lerp(a[1], b[1], k / n)]);
    }
    if (amp < 0.01) return dense;
    let s = 0;
    return dense.map((p, i) => {
      const q = dense[(i + dense.length - 1) % dense.length], r = dense[(i + 1) % dense.length];
      let nx = r[1] - q[1], ny = -(r[0] - q[0]); const l = Math.hypot(nx, ny) || 1; nx /= l; ny /= l;
      s += 1; const d = amp * (sn(s * 0.11, seed) * 0.65 + sn(s * 0.47, seed + 7) * 0.35 + (lat(i, seed + 3) * 0.25));
      return [p[0] + nx * d, p[1] + ny * d];
    });
  }
  function bbox(pts) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; pts.forEach(([x, y]) => { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }); return [x0, y0, x1, y1]; }

  // Clipped halftone screen at a given angle; dot radius falls off from a light point (printed-photo feel)
  function halftone(ctx, pts, color, ang, sp, alpha, power = 0.8) {
    const [x0, y0, x1, y1] = bbox(pts), cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, R = Math.hypot(x1 - x0, y1 - y0) / 2 + sp;
    const lx = x0 + (x1 - x0) * 0.3, ly = y0, maxd = Math.hypot(x1 - x0, y1 - y0) * 0.9, c = Math.cos(ang), s = Math.sin(ang);
    ctx.save(); trace(ctx, pts); ctx.clip(); ctx.fillStyle = color; ctx.globalAlpha = alpha; ctx.beginPath();
    for (let i = -R; i <= R; i += sp) for (let j = -R; j <= R; j += sp) {
      const wx = cx + i * c - j * s, wy = cy + i * s + j * c;
      if (wx < x0 - sp || wx > x1 + sp || wy < y0 - sp || wy > y1 + sp) continue;
      const d = Math.hypot(wx - lx, wy - ly) / maxd, r = sp * 0.56 * (0.12 + 0.88 * Math.pow(clamp(1 - d), power));
      if (r > 0.45) { ctx.moveTo(wx + r, wy); ctx.arc(wx, wy, r, 0, 6.2832); }
    }
    ctx.fill(); ctx.restore();
  }

  /* ---------- paper & grain ---------- */
  let grainTile = null;
  function grain() {
    if (grainTile) return grainTile;
    const c = document.createElement('canvas'); c.width = c.height = 512; const g = c.getContext('2d'), im = g.createImageData(512, 512), R = rng(99);
    for (let i = 0; i < im.data.length; i += 4) { const v = 232 + R() * 23; im.data[i] = v; im.data[i + 1] = v - 1; im.data[i + 2] = v - 4; im.data[i + 3] = 255; }
    g.putImageData(im, 0, 0); return (grainTile = c);
  }
  function paper(ctx, k) {
    ctx.fillStyle = C.porcelain; ctx.fillRect(0, 0, W, H);
    const R = rng(5); ctx.save(); ctx.strokeStyle = 'rgba(120,100,70,.10)'; ctx.lineWidth = 0.6; ctx.beginPath();
    for (let i = 0; i < 380; i++) { const x = R() * W, y = R() * H, a = R() * 6.28, l = 6 + R() * 22; ctx.moveTo(x, y); ctx.quadraticCurveTo(x + Math.cos(a) * l / 2 + 3, y + Math.sin(a) * l / 2, x + Math.cos(a) * l, y + Math.sin(a) * l); }
    ctx.stroke(); ctx.restore();
  }
  function paintGrain(ctx, k) {
    const p = ctx.createPattern(grain(), 'repeat'); if (p.setTransform) p.setTransform(new DOMMatrix().scale(1 / 1.0, 1 / 1.0));
    ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.fillStyle = p; ctx.globalAlpha = 0.55; ctx.fillRect(0, 0, W, H); ctx.restore();
  }

  /* ---------- copy ---------- */
  const TXT = {
    en: {
      mast: "THE FAMILY THAT DOESN'T EXIST", mastR: 'EXHIBITION PRINT', ctx: 'UAE YEAR OF FAMILY 2026 · GROWING IN UNITY',
      hlFinal: [['The', 'Family'], ['That', "Doesn't"], ['Exist']], hlAvg: [['The', 'average'], ['family?']], hlLoose: [['The', 'average'], ['family?']],
      stmt: 'A family is more than an average.', sup: 'Some things can be counted. Others must be understood.',
      method: 'METHOD — Artistic possibilities, not sampled families. No demographic proportions are implied.',
      src: 'SOURCES — Statistics Centre Abu Dhabi, Abu Dhabi Population 2024 (emirate-level) · UAE Year Of, Year of Family 2026 · Schuessler, “Ecological inference”, PNAS 1999.',
      credit: 'May Ahmed Mourad · Grade 12 · ADNOC Schools Madinat Zayed (MZ)',
      hyp: 'ILLUSTRATIVE HYPOTHESIS — NOT A MEASURED OR REPRESENTATIVE HOUSEHOLD',
      lab: ['FIG. 1 — THE MEAN PORTRAIT', 'n = ?', 'μ ≠ MEMBER'],
      stamp: ['NOT ESTABLISHED · HOUSEHOLD SIZE', 'MEDIAN ≠ ANY FAMILY’S AGES', 'CLOSENESS · NOT MEASURED']
    },
    ar: {
      mast: 'العائلة التي لا وجود لها', mastR: 'نسخة معرض', ctx: 'عام الأسرة 2026 · نماء وانتماء',
      hlFinal: [['العائلة'], ['التي', 'لا'], ['وجود', 'لها']], hlAvg: [['العائلة'], ['المتوسطة؟']], hlLoose: [['العائلة'], ['المتوسطة؟']],
      stmt: 'العائلة أكبر من مجرد متوسط.', sup: 'بعض الأشياء يمكن عدّها، وأخرى لا بد من فهمها.',
      method: 'المنهج — إمكانات فنية وليست أسراً مأخوذة بعينة. لا تُفيد أي نِسب ديموغرافية.',
      src: 'المصادر — مركز الإحصاء أبوظبي: سكان أبوظبي 2024 (على مستوى الإمارة) · عام الإمارات: عام الأسرة 2026 · شوسلر، «الاستدلال الإيكولوجي»، PNAS 1999.',
      credit: 'مي أحمد مراد · الصف الثاني عشر · مدارس أدنوك مدينة زايد',
      hyp: 'فرضية توضيحية — ليست أسرة مقيسة أو ممثِّلة',
      lab: ['الشكل 1 — اللوحة المتوسطة', 'ن = ؟', 'المتوسط ≠ الفرد'],
      stamp: ['غير مثبت · حجم الأسرة', 'الوسيط ≠ أعمار أي أسرة', 'القرب · غير مقيس']
    }
  };
  const SERIF = '"Instrument Serif","Noto Naskh Arabic",Georgia,serif';
  const SERIF_AR = '"Noto Naskh Arabic","Instrument Serif",serif';
  const SANS = '"IBM Plex Sans","IBM Plex Sans Arabic","Segoe UI",sans-serif';
  const SANS_AR = '"IBM Plex Sans Arabic","IBM Plex Sans","Segoe UI",sans-serif';
  const MONO = '"IBM Plex Mono","IBM Plex Sans Arabic",monospace';
  const MONO_AR = '"IBM Plex Sans Arabic","IBM Plex Mono",sans-serif';

  function setText(ctx, o) { ctx.font = o.font; ctx.direction = o.ar ? 'rtl' : 'ltr'; ctx.textAlign = o.align || (o.ar ? 'right' : 'left'); ctx.textBaseline = 'alphabetic'; if ('letterSpacing' in ctx) ctx.letterSpacing = (o.ls || 0) + 'px'; }
  function wrap(ctx, s, maxW) {
    const words = s.split(' '), lines = []; let cur = '';
    words.forEach(w => { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; });
    if (cur) lines.push(cur); return lines;
  }
  function para(ctx, s, x, y, maxW, lh, o) {
    setText(ctx, o); ctx.fillStyle = o.color; const lines = wrap(ctx, s, maxW);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh)); return y + lines.length * lh;
  }
  // headline: words as separate paper pieces, loosening with L
  function headline(ctx, lines, o) {
    const ar = o.ar, fam = ar ? SERIF_AR : SERIF; const weight = ar ? '700 ' : '';
    ctx.save(); ctx.fillStyle = o.color;
    const measure = size => lines.map((ln, li) => { setText(ctx, { font: `${weight}${size}px ${fam}`, ar }); return ln.reduce((a, w) => a + ctx.measureText(w).width, 0) + ctx.measureText(' ').width * (ln.length - 1); });
    let size = o.size; const mw = Math.max(...measure(size)); if (mw > o.maxW) size *= o.maxW / mw;
    lines.forEach((ln, li) => {
      const italicLine = !ar && o.italic && o.italic.includes(li);
      setText(ctx, { font: `${italicLine ? 'italic ' : ''}${weight}${size}px ${fam}`, ar });
      let cur = o.x; const y = o.y + li * size * o.lh, sp = ctx.measureText(' ').width;
      ln.forEach((w, wi) => {
        const gi = li * 5 + wi, wd = ctx.measureText(w).width;
        const dy = sn(gi * 1.3 + o.seed, 11) * size * 0.07 * o.L, dx = sn(gi * 1.9 + o.seed, 12) * size * 0.05 * o.L, rot = sn(gi * 2.1 + o.seed, 13) * 0.045 * o.L;
        ctx.save(); ctx.translate(cur + (ar ? -wd / 2 : wd / 2) + dx, y + dy); ctx.rotate(rot); ctx.textAlign = 'center';
        if (o.halo) { ctx.lineJoin = 'round'; ctx.lineWidth = size * 0.05; ctx.strokeStyle = C.porcelain; ctx.strokeText(w, 0, 0); ctx.fillStyle = o.color; } ctx.fillText(w, 0, 0); ctx.restore();
        cur += ar ? -(wd + sp) : wd + sp;
      });
    });
    ctx.restore(); return size;
  }

  /* ---------- scene definition ---------- */
  const SIL = [
    { x: -230, y: -40, s: .78, r: -6, ci: 0, ang: 15, paper: false }, { x: 215, y: -150, s: .58, r: 7, ci: 1, ang: 75, paper: true },
    { x: 20, y: 70, s: 1.0, r: -2, ci: 2, ang: 0, paper: false }, { x: -40, y: -300, s: .42, r: 12, ci: 3, ang: 45, paper: true },
    { x: 300, y: 130, s: .68, r: -9, ci: 4, ang: 105, paper: false }, { x: -340, y: 170, s: .5, r: 5, ci: 5, ang: 30, paper: true }];
  const MEAN = { x: 500, y: 830, s: .8 };
  const BLOCKS = [
    { x: 0, y: -0.2, w: 4, h: 4.45, col: C.cobalt, rot: -.05, dx: -14, dy: 18 },
    { x: 4.4, y: 6.3, w: 3.6, h: 3.3, col: C.coral, rot: .06, dx: 18, dy: -30 },
    { x: 0.6, y: 5.1, w: 1.5, h: 0.75, col: C.butter, rot: -.08, dx: -10, dy: 28 },
    { x: 6.4, y: -0.2, w: .55, h: 3.6, col: C.chartreuse, rot: .04, dx: 30, dy: 10 }];
  const MOD = 125;
  const SCRAPS = [
    { x: 105, y: 735, w: 230, h: 120, col: C.butter, th: .12 }, { x: 800, y: 470, w: 150, h: 250, col: C.lavender, th: .3 },
    { x: 840, y: 905, w: 200, h: 120, col: C.sage, th: .5 }, { x: 300, y: 930, w: 160, h: 90, col: C.coral, th: .65 },
    { x: 700, y: 190, w: 130, h: 100, col: C.butter, th: .8 }];
  const STAMP_POS = [{ x: 470, y: 690, r: -.07 }, { x: 70, y: 905, r: .05 }, { x: 520, y: 880, r: -.04 }];
  const FOCUS = [[170, 520, 830, 1110], [250, 470, 750, 700], [90, 520, 910, 1000]];

  let off = null;
  function group(wpx, hpx) {
    if (!off || off.width !== wpx || off.height !== hpx) { off = document.createElement('canvas'); off.width = wpx; off.height = hpx; }
    const g = off.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, wpx, hpx); return [off, g];
  }

  function silhouettes(g, st, L) {
    const [p1, p2, p3] = st.p, R = rng(st.seed || 1), amp = lerp(0, 11, L), movers = p1 + p2 > 0.02;
    const order = SIL.map((s, i) => i);
    for (let k = SIL.length - 1; k >= 0; k--) {
      if (!movers && k > 0) continue;
      const d = SIL[(k + (st.seed % 3)) % SIL.length], me = SIL[k];
      const jx = (R() - .5) * 50, jy = (R() - .5) * 40, jr = (R() - .5) * 6;
      const X = MEAN.x + lerp(0, me.x + jx, p1), Y = MEAN.y + lerp(0, me.y + jy, p1), S = lerp(MEAN.s, me.s * 0.8, p2), rot = lerp(0, (me.r + jr) * Math.PI / 180, Math.max(p1, p2));
      const c = Math.cos(rot), s = Math.sin(rot), T = (lx, ly) => [X + S * (lx * c - ly * s), Y + S * (lx * s + ly * c)];
      const head = Array.from({ length: 44 }, (_, i) => { const a = i / 44 * 6.2832; return T(Math.cos(a) * 112, -330 + Math.sin(a) * 112); });
      const sh = []; for (let i = 0; i <= 40; i++) { const a = Math.PI + i / 40 * Math.PI; sh.push(T(Math.cos(a) * 300, Math.sin(a) * 230)); } sh.push(T(300, 520), T(-300, 520));
      const col = mix(C.graphite, PAL[(me.ci + (st.seed % 5)) % 6 === 2 ? 0 : (me.ci + (st.seed % 5)) % 6], p2);
      const ang = (me.ang * Math.PI / 180);
      [[sh, 0], [head, 1]].forEach(([part, pi]) => {
        const poly = roughen(part, amp, k * 10 + pi + (st.seed % 50));
        g.save(); g.globalCompositeOperation = 'source-over';
        if (me.paper && p1 > .05) { g.globalAlpha = Math.min(1, p1 * 3); g.fillStyle = C.porcelain; trace(g, poly); g.fill(); g.globalAlpha = 1; }
        g.globalCompositeOperation = 'multiply'; g.globalAlpha = .2 + .08 * p2; g.fillStyle = col; trace(g, poly); g.fill(); g.globalAlpha = 1;
        halftone(g, poly, col, ang + pi * .52, 11, .92, 0.75);
        g.restore();
      });
    }
  }

  /* ---------- main render ---------- */
  function render(ctx, wpx, st) {
    const k = wpx / W, hpx = Math.round(wpx * H / W), ar = st.lang === 'ar', tx = TXT[ar ? 'ar' : 'en'];
    const [p1, p2, p3] = st.p, L = (p1 + p2 + p3) / 3, px = st.px || 0, py = st.py || 0, seed = st.seed || 1;
    ctx.save(); ctx.setTransform(k, 0, 0, k, 0, 0); ctx.beginPath(); ctx.rect(0, 0, W, H); ctx.clip();
    paper(ctx, k);

    // 1. colour planes: strict module grid -> displaced, torn, overprinted
    const blockPaths = [];
    BLOCKS.forEach((b, i) => {
      const x = b.x * MOD, y = b.y * MOD, w = b.w * MOD, h = b.h * MOD;
      const o = rect(x + b.dx * L * 0 , y, w, h, b.rot * L, x + w / 2, y + h / 2).map(([a, c]) => [a + b.dx * L + px * 6, c + b.dy * L + py * 4]);
      const poly = roughen(o, lerp(0, 15, L), 40 + i); blockPaths.push([poly, b.col]);
      ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = .92; ctx.fillStyle = b.col; trace(ctx, poly); ctx.fill(); ctx.restore();
      if (L > .15 && i < 2) halftone(ctx, poly, C.porcelain, 0.3 + i, 16, Math.min(.5, L * .6), 0.5);
    });

    // 2. measuring grid (machine) -> wobbling hand lines
    ctx.save(); ctx.strokeStyle = C.graphite; ctx.lineWidth = 1; ctx.globalAlpha = lerp(.16, .07, L);
    for (let i = 1; i < 8; i++) { ctx.beginPath(); for (let y = 0; y <= H; y += 24) { const x = i * MOD + sn(y * .02 + i, seed) * 9 * p3; y ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    for (let j = 1; j < 12; j++) { ctx.beginPath(); for (let x = 0; x <= W; x += 24) { const y = j * MOD + sn(x * .02 + j, seed + 4) * 9 * p3; x ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
    ctx.restore();

    // 3. torn paper scraps (collage language) appear as certainty loosens
    SCRAPS.forEach((s, i) => {
      const a = smooth(s.th - .15, s.th + .1, L); if (a <= 0.01) return;
      const R = rng(seed + i * 31), pts = [[-.5, -.5], [.1, -.55], [.5, -.45], [.55, .1], [.45, .5], [-.1, .55], [-.55, .4]].map(([u, v]) => [s.x + u * s.w * (1 + (R() - .5) * .25) + px * (8 + i * 3), s.y + v * s.h * (1 + (R() - .5) * .25) + py * (6 + i * 2)]);
      const poly = roughen(pts, 5, seed + i); ctx.save(); ctx.globalAlpha = a;
      ctx.shadowColor = 'rgba(41,45,53,.28)'; ctx.shadowBlur = 12; ctx.shadowOffsetY = 5; ctx.fillStyle = s.col; trace(ctx, poly); ctx.fill(); ctx.shadowColor = 'transparent';
      halftone(ctx, poly, C.graphite, .5 + i, 13, .28 * a, 0.6); ctx.restore();
    });

    // 4. the portrait group, sliced like a printed image that is coming apart
    const [off, g] = group(Math.round(wpx), hpx); g.setTransform(k, 0, 0, k, 0, 0);
    silhouettes(g, st, L);
    const A = Math.max(Math.sin(L * Math.PI) * 90, 0) * (L > .985 ? 0 : 1), N = 20;
    ctx.save();
    if (A < 1) ctx.drawImage(off, 0, 0, W, H);
    else for (let i = 0; i < N; i++) {
      const sx = i * W / N, sw = W / N, dy = sn(i * .9 + seed, 21) * A, dx = sn(i * 1.3 + seed, 22) * A * .18;
      ctx.drawImage(off, sx * k, 0, sw * k, hpx, sx + dx, dy, sw + .6, H);
    }
    if (L < .25) { ctx.strokeStyle = C.porcelain; ctx.globalAlpha = (1 - L * 4) * .9; ctx.lineWidth = 1.6; ctx.beginPath(); for (let i = 1; i < N; i++) { ctx.moveTo(i * W / N, 380); ctx.lineTo(i * W / N, 1300); } ctx.stroke(); }
    ctx.restore();

    // 5. ink ribbons: closeness drawn by hand (grows with p3)
    if (p3 > .01) {
      const pts = SIL.slice(0, 4).map(s => [MEAN.x + s.x * p1 * 1, MEAN.y + s.y * p1 - 60]);
      [[C.cobalt, 15], [C.coral, 10], [C.butter, 22]].forEach(([col, w], i) => {
        ctx.save(); ctx.globalCompositeOperation = 'multiply'; ctx.strokeStyle = col; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.globalAlpha = .85;
        const a = pts[i % 4], b = pts[(i + 1) % 4], m = [(a[0] + b[0]) / 2 + sn(i + seed, 5) * 140, (a[1] + b[1]) / 2 - 140 + i * 70];
        ctx.setLineDash([900 * p3, 2000]); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.quadraticCurveTo(m[0], m[1], b[0], b[1]); ctx.stroke(); ctx.restore();
      });
    }

    // 6. machine annotations: ruler, centre mark, labels (fade as the machine loses authority)
    const mA = 1 - smooth(.1, .9, p3);
    if (mA > .01) {
      ctx.save(); ctx.globalAlpha = mA; ctx.strokeStyle = C.graphite; ctx.fillStyle = C.graphite; ctx.lineWidth = 1.2;
      const cx = MEAN.x, cy = MEAN.y - 150, jit = p3 * 20;
      ctx.beginPath(); ctx.moveTo(cx - 28, cy); ctx.lineTo(cx + 28, cy); ctx.moveTo(cx, cy - 28); ctx.lineTo(cx, cy + 28); ctx.stroke(); ctx.beginPath(); ctx.arc(cx, cy, 13, 0, 6.28); ctx.stroke();
      const ry = 690 + jit; ctx.beginPath(); ctx.moveTo(150, ry); ctx.lineTo(850, ry); for (let x = 150; x <= 850; x += 35) { ctx.moveTo(x, ry - (x % 175 === 0 ? 12 : 5)); ctx.lineTo(x, ry + (x % 175 === 0 ? 12 : 5)); } ctx.stroke();
      setText(ctx, { font: `500 15px ${ar ? MONO_AR : MONO}`, ar, ls: ar ? 0 : 1.5 });
      const ax = ar ? 850 : 150; ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText(tx.lab[0], ax, ry - 22); ctx.fillText(tx.lab[1], cx + 40 + jit, cy - 8); ctx.fillText(tx.lab[2], cx + 40, cy + 18);
      ctx.restore();
    }

    // 7. evidence stamps (one per challenged assumption)
    for (let i = 0; i < 3; i++) {
      const a = smooth(.35, .8, st.p[i]); if (a < .02) continue; const sp = STAMP_POS[i];
      ctx.save(); ctx.globalAlpha = a; ctx.translate(sp.x, sp.y); ctx.rotate(sp.r); const f = ar ? SANS_AR : MONO;
      setText(ctx, { font: `600 21px ${f}`, ar, ls: ar ? 0 : 1 }); const w = ctx.measureText(tx.stamp[i]).width + 28;
      ctx.fillStyle = C.butter; ctx.fillRect(0, -26, w, 40);
      ctx.strokeStyle = C.coral; ctx.lineWidth = 2.5; ctx.strokeRect(0, -26, w, 40); ctx.fillStyle = C.graphite; ctx.textAlign = ar ? 'right' : 'left'; ctx.fillText(tx.stamp[i], ar ? w - 14 : 14, 2);
      ctx.restore();
    }

    // 8. typography
    const edge = ar ? W - 56 : 56, maxW = W - 112;
    const useFinal = st.final, hl = useFinal ? tx.hlFinal : tx.hlAvg, sizeH = useFinal ? 190 : 205;
    const hy = useFinal ? 255 : 285, hopts = { x: edge, y: hy, size: sizeH, lh: .86, maxW, ar, seed, L, italic: useFinal ? [] : [0], color: C.graphite, halo: true };
    ctx.save(); headline(ctx, hl, hopts); // graphite
    ctx.restore();
    ctx.save(); // knock-out: where type crosses the cobalt plane it prints in porcelain
    trace(ctx, blockPaths[0][0]); ctx.clip(); headline(ctx, hl, { ...hopts, color: C.porcelain, halo: false }); ctx.restore();
    // masthead
    ctx.save(); ctx.fillStyle = C.graphite; const mf = ar ? MONO_AR : MONO;
    setText(ctx, { font: `500 17px ${mf}`, ar, ls: ar ? 0 : 2 }); ctx.fillText(tx.mast, edge, 72);
    ctx.textAlign = ar ? 'left' : 'right'; ctx.fillText(tx.mastR, ar ? 56 : W - 56, 72);
    ctx.fillRect(56, 88, W - 112, 2); ctx.restore();

    // statement strip (torn porcelain) — always in the final print, fades in on stage
    const sa = useFinal ? 1 : smooth(.75, 1, L);
    if (sa > .01) {
      ctx.save(); ctx.globalAlpha = sa;
      const sp = roughen([[30, 1000], [970, 985], [985, 1210], [20, 1225]], 7, seed + 77);
      ctx.shadowColor = 'rgba(41,45,53,.3)'; ctx.shadowBlur = 16; ctx.shadowOffsetY = 6; ctx.fillStyle = C.porcelain; trace(ctx, sp); ctx.fill(); ctx.shadowColor = 'transparent';
      ctx.fillStyle = C.graphite; const f = ar ? SERIF_AR : SERIF; ctx.font = `${ar ? '700 ' : 'italic '}${ar ? 84 : 98}px ${f}`; ctx.direction = ar ? 'rtl' : 'ltr';
      para(ctx, tx.stmt, edge, 1090, maxW - 20, ar ? 100 : 92, { font: `${ar ? '700 ' : 'italic '}${ar ? 84 : 98}px ${f}`, ar, color: C.graphite });
      ctx.restore();
    }
    { const fp = roughen([[-10, 1243], [W + 10, 1238], [W + 10, H + 10], [-10, H + 10]], 5, seed + 91); ctx.save(); ctx.shadowColor = 'rgba(41,45,53,.22)'; ctx.shadowBlur = 14; ctx.shadowOffsetY = -3; ctx.fillStyle = C.porcelain; trace(ctx, fp); ctx.fill(); ctx.restore(); }
    if (useFinal) {
      para(ctx, tx.sup, edge, 1262, maxW, 34, { font: `600 27px ${ar ? SANS_AR : SANS}`, ar, color: C.graphite });
      const cws = [200, 250, 378], offs = [0, 230, 510], fy = 1312, f = ar ? SANS_AR : MONO, fs = ar ? 14.5 : 12.5, col = offs.map(o => ar ? W - 56 - o : 56 + o);
      const o = { font: `400 ${fs}px ${f}`, ar, color: C.graphite, ls: 0 };
      para(ctx, tx.ctx, col[0], fy, cws[0], 17, { ...o, font: `500 ${fs}px ${f}` }); para(ctx, tx.method, col[1], fy, cws[1], 17, o); para(ctx, tx.src, col[2], fy, cws[2], 17, o);
      ctx.save(); ctx.fillStyle = C.graphite; ctx.fillRect(56, 1296, W - 112, 1.5); ctx.restore();
    } else if (st.stageLabel !== false) {
      setText(ctx, { font: `500 15px ${ar ? MONO_AR : MONO}`, ar, ls: ar ? 0 : 1 }); ctx.fillStyle = C.graphite; ctx.fillText(tx.hyp, edge, 1372);
    }

    // 9. print furniture: registration marks, colour bar, edition
    ctx.save(); ctx.strokeStyle = C.graphite; ctx.fillStyle = C.graphite; ctx.lineWidth = 1.4;
    [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 9, 0, 6.28); ctx.moveTo(x - 17, y); ctx.lineTo(x + 17, y); ctx.moveTo(x, y - 17); ctx.lineTo(x, y + 17); ctx.stroke(); });
    const swx = ar ? 560 : 292; PAL.concat([C.graphite]).forEach((c, i) => { ctx.fillStyle = c; ctx.fillRect(swx + i * 24, H - 40, 20, 12); });
    const ed = (hash((st.order || []).join(',') || 'none') % 9000) + 1000;
    setText(ctx, { font: `500 13px ${MONO}`, ar: false, ls: 1.5, align: ar ? 'right' : 'left' }); ctx.fillStyle = C.graphite;
    ctx.fillText(`PATH ${(st.order || []).map(i => i + 1).join('·') || '—'}   No. ${ed}`, ar ? W - 70 : 70, H - 31);
    if (useFinal) { setText(ctx, { font: `500 ${ar ? 13.5 : 11.5}px ${ar ? SANS_AR : MONO}`, ar, ls: ar ? 0 : 0.4, align: ar ? 'left' : 'right' }); ctx.fillStyle = C.graphite; ctx.fillText(tx.credit, ar ? 70 : W - 70, H - 31); }
    ctx.restore();

    // focus bracket (stage only)
    if (st.focus != null && !useFinal) {
      const [a, b, c2, d] = FOCUS[st.focus]; ctx.save(); ctx.strokeStyle = C.coral; ctx.lineWidth = 5; const s = 34;
      [[a, b, 1, 1], [c2, b, -1, 1], [a, d, 1, -1], [c2, d, -1, -1]].forEach(([x, y, sx, sy]) => { ctx.beginPath(); ctx.moveTo(x, y + s * sy); ctx.lineTo(x, y); ctx.lineTo(x + s * sx, y); ctx.stroke(); }); ctx.restore();
    }
    paintGrain(ctx, k);
    ctx.restore();
  }

  return { W, H, C, render, hash, sn };
})();
