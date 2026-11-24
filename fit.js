"use strict";
/* FootCapture 3D core: find the A4 sheet in each photo, work out where the camera was, pick out
   the foot against the paper, and adjust a statistical 3D foot until its outline matches every
   photo.  Pure computation on {w, h, data(RGBA)} images: runs in the browser and in Node tests.

   World frame = the sheet: origin at its centre, X along the long side towards the toes,
   Y to the standing person's left, Z up, millimetres. */
(function (root) {
  const A4L = 297, A4S = 210;
  const PAPER = [[-A4L / 2, -A4S / 2], [A4L / 2, -A4S / 2], [A4L / 2, A4S / 2], [-A4L / 2, A4S / 2]];

  /* ------------------------------------------------------------ small helpers */

  function shrink(img, k) {                                // block average by an integer factor
    if (k <= 1) return img;
    const w = Math.floor(img.w / k), h = Math.floor(img.h / k), out = new Uint8ClampedArray(w * h * 4), d = img.data, n = k * k;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < k; j++) { let i = ((y * k + j) * img.w + x * k) * 4; for (let q = 0; q < k; q++, i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } }
      const o = (y * w + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
    }
    return { w, h, data: out };
  }

  function largestComponent(mask, w, h) {
    const lab = new Int32Array(w * h), stack = new Int32Array(w * h);
    let best = 0, bestN = 0, cur = 0;
    for (let s = 0; s < w * h; s++) {
      if (!mask[s] || lab[s]) continue;
      cur++; let n = 0, top = 0; stack[top++] = s; lab[s] = cur;
      while (top) {
        const p = stack[--top], x = p % w; n++;
        if (x > 0 && mask[p - 1] && !lab[p - 1]) { lab[p - 1] = cur; stack[top++] = p - 1; }
        if (x < w - 1 && mask[p + 1] && !lab[p + 1]) { lab[p + 1] = cur; stack[top++] = p + 1; }
        if (p >= w && mask[p - w] && !lab[p - w]) { lab[p - w] = cur; stack[top++] = p - w; }
        if (p < w * (h - 1) && mask[p + w] && !lab[p + w]) { lab[p + w] = cur; stack[top++] = p + w; }
      }
      if (n > bestN) { bestN = n; best = cur; }
    }
    const out = new Uint8Array(w * h);
    if (best) for (let s = 0; s < w * h; s++) out[s] = lab[s] === best ? 1 : 0;
    return { mask: out, area: bestN };
  }

  function morph(mask, w, h, r, erode) {
    const pass = (src, dx, dy) => {
      const dst = new Uint8Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        let v = erode ? 1 : 0;
        for (let k = -r; k <= r; k++) {
          const xx = x + k * dx, yy = y + k * dy, m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
          if (erode ? !m : m) { v = erode ? 0 : 1; break; }
        }
        dst[y * w + x] = v;
      }
      return dst;
    };
    return pass(pass(mask, 1, 0), 0, 1);
  }

  function solve(A, b) {                                   // Gaussian elimination, partial pivoting; A is n x n
    const n = b.length;
    for (let i = 0; i < n; i++) {
      let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
      [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
      if (Math.abs(A[i][i]) < 1e-14) return null;
      for (let r = i + 1; r < n; r++) { const f = A[r][i] / A[i][i]; for (let c = i; c < n; c++) A[r][c] -= f * A[i][c]; b[r] -= f * b[i]; }
    }
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
    return x;
  }

  /* Levenberg-Marquardt with forward-difference derivatives.  fn(x) -> Float32Array / Float64Array of residuals. */
  function lm(fn, x0, steps, opt) {
    opt = opt || {};
    const n = x0.length, lo = opt.lo, hi = opt.hi, clamp = (x) => { if (lo) for (let i = 0; i < n; i++) x[i] = Math.min(hi[i], Math.max(lo[i], x[i])); return x; };
    let x = clamp(x0.slice()), r = fn(x), cost = 0; for (let i = 0; i < r.length; i++) cost += r[i] * r[i];
    let lam = opt.lambda || 1e-3, stall = 0;
    for (let it = 0; it < (opt.iters || 20); it++) {
      const m = r.length, J = [];
      for (let p = 0; p < n; p++) {
        const xp = x.slice(); let st = steps[p]; if (hi && xp[p] + st > hi[p]) st = -st; xp[p] += st;
        const rp = fn(xp), col = new Float32Array(m); for (let i = 0; i < m; i++) col[i] = (rp[i] - r[i]) / st; J.push(col);
      }
      const JtJ = [], g = new Array(n);
      for (let a = 0; a < n; a++) {
        JtJ.push(new Array(n)); let s = 0; const ca = J[a]; for (let i = 0; i < m; i++) s += ca[i] * r[i]; g[a] = -s;
        for (let b = 0; b <= a; b++) { let q = 0; const cb = J[b]; for (let i = 0; i < m; i++) q += ca[i] * cb[i]; JtJ[a][b] = q; JtJ[b][a] = q; }
      }
      let improved = false;
      for (let tries = 0; tries < 6; tries++) {
        const A = JtJ.map((row, a) => row.map((v, b) => (a === b ? v * (1 + lam) + 1e-12 : v))), dx = solve(A, g.slice());
        if (!dx) { lam *= 10; continue; }
        const xn = clamp(x.map((v, i) => v + dx[i])), rn = fn(xn); let cn = 0; for (let i = 0; i < rn.length; i++) cn += rn[i] * rn[i];
        if (cn < cost) { stall = (cost - cn) / cost < (opt.tol || 1e-4) ? stall + 1 : 0; x = xn; r = rn; cost = cn; lam = Math.max(lam / 4, 1e-7); improved = true; break; }
        lam *= 6;
      }
      if (!improved || stall >= 2) break;
    }
    return { x, cost, n: r.length };
  }

  /* ------------------------------------------------------------ the sheet of paper */

  /* The sheet = the brightest even patch near the middle of the picture, grown outwards pixel by pixel
     while the colour stays that of the paper and changes smoothly.  Growth stops at the sheet's edge,
     where brightness jumps, whatever the floor looks like; soft shadows on the paper are crossed. */
  function paperBlob(small, relaxed) {
    const w = small.w, h = small.h, d = small.data, n = w * h, V = new Uint8Array(n), hist = new Uint32Array(256);
    const x0 = Math.round(0.1 * w), x1 = Math.round(0.9 * w), y0 = Math.round(0.12 * h), y1 = Math.round(0.88 * h);
    let cnt = 0;
    for (let p = 0, i = 0; p < n; p++, i += 4) { V[p] = Math.max(d[i], d[i + 1], d[i + 2]); const x = p % w, y = (p - x) / w; if (x >= x0 && x < x1 && y >= y0 && y < y1) { hist[V[p]]++; cnt++; } }
    let acc = 0, Vp = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > 0.03 * cnt) { Vp = v; break; } }
    const diff = (p, q) => Math.max(Math.abs(d[p * 4] - d[q * 4]), Math.abs(d[p * 4 + 1] - d[q * 4 + 1]), Math.abs(d[p * 4 + 2] - d[q * 4 + 2]));
    const seed = new Uint8Array(n);
    for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
      const p = y * w + x; if (V[p] > 0.88 * Vp && diff(p, p - 1) < 10 && diff(p, p + 1) < 10 && diff(p, p - w) < 10 && diff(p, p + w) < 10) seed[p] = 1;
    }
    const core = largestComponent(seed, w, h); if (core.area < 0.004 * n) return { mask: core.mask, area: 0 };
    let sr = 0, sg = 0, sb = 0; for (let p = 0; p < n; p++) if (core.mask[p]) { sr += d[p * 4]; sg += d[p * 4 + 1]; sb += d[p * 4 + 2]; }
    sr /= core.area; sg /= core.area; sb /= core.area;
    const ss = sr + sg + sb, rp = sr / ss, gp = sg / ss, Vc = Math.max(sr, sg, sb), tl = Math.max(6, 0.035 * Vc);
    const like = (p) => { const r = d[p * 4], g = d[p * 4 + 1], b = d[p * 4 + 2], s = r + g + b + 1e-6; return V[p] > 0.4 * Vc && Math.hypot(r / s - rp, g / s - gp) < 0.03; };
    const out = new Uint8Array(n), stack = new Int32Array(n); let top = 0, area = 0;
    for (let p = 0; p < n; p++) if (seed[p] && Math.abs(d[p * 4] - sr) < 14 && Math.abs(d[p * 4 + 1] - sg) < 14 && Math.abs(d[p * 4 + 2] - sb) < 14) { out[p] = 1; stack[top++] = p; }   // every bright piece of paper, also beyond the leg
    while (top) {
      const p = stack[--top], x = p % w; area++;
      for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) if (q >= 0 && q < n && !out[q] && like(q) && diff(p, q) < tl) { out[q] = 1; stack[top++] = q; }
    }
    if (relaxed) {                                            // paper in hard shadow: same hue, darker, close to the bright part
      let bx0 = w, bx1 = 0, by0 = h, by1 = 0;
      for (let p = 0; p < n; p++) if (out[p]) { const x = p % w, y = (p - x) / w; if (x < bx0) bx0 = x; if (x > bx1) bx1 = x; if (y < by0) by0 = y; if (y > by1) by1 = y; }
      const gx = Math.round(0.35 * (bx1 - bx0)) + 3, gy = Math.round(0.35 * (by1 - by0)) + 3;
      for (let p = 0; p < n; p++) if (out[p]) stack[top++] = p;
      while (top) {
        const p = stack[--top], x = p % w;
        for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, p - w, p + w]) {
          if (q < 0 || q >= n || out[q] || !like(q)) continue; const qx = q % w, qy = (q - qx) / w;
          if (qx < bx0 - gx || qx > bx1 + gx || qy < by0 - gy || qy > by1 + gy) continue;
          out[q] = 1; stack[top++] = q; area++;
        }
      }
    }
    return { mask: morph(morph(out, w, h, 1, true), w, h, 1, false), area };
  }

  function convexHull(pts) {
    pts.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]), lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let i = pts.length - 1; i >= 0; i--) { const p = pts[i]; while (up.length >= 2 && cr(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    lo.pop(); up.pop(); return lo.concat(up);
  }

  function fitLine(P) {                                     // total least squares: {n:[nx,ny], d, c:[cx,cy]}
    let cx = 0, cy = 0; for (const p of P) { cx += p[0]; cy += p[1]; } cx /= P.length; cy /= P.length;
    let sxx = 0, sxy = 0, syy = 0; for (const p of P) { const a = p[0] - cx, b = p[1] - cy; sxx += a * a; sxy += a * b; syy += b * b; }
    const th = 0.5 * Math.atan2(2 * sxy, sxx - syy), nx = -Math.sin(th), ny = Math.cos(th);
    return { n: [nx, ny], d: nx * cx + ny * cy, c: [cx, cy] };
  }
  const lineDist = (L, p) => L.n[0] * p[0] + L.n[1] * p[1] - L.d;
  function intersect(A, B) {
    const det = A.n[0] * B.n[1] - A.n[1] * B.n[0]; if (Math.abs(det) < 1e-9) return null;
    return [(A.d * B.n[1] - A.n[1] * B.d) / det, (A.n[0] * B.d - A.d * B.n[0]) / det];
  }

  /* Four edge lines of the sheet from the parts of its outline that are really visible.  The convex
     hull of the paper pixels bridges whatever the foot and leg hide; hull stretches with no paper
     pixels next to them are bridges, not edges, and are ignored. */
  function paperLines(small, relaxed) {
    const w = small.w, h = small.h, blob = paperBlob(small, relaxed);
    if (blob.area < 0.03 * w * h) return null;
    const m = blob.mask, pts = [];
    for (let y = 0; y < h; y++) { let a = -1, b = -1; for (let x = 0; x < w; x++) if (m[y * w + x]) { if (a < 0) a = x; b = x; } if (a >= 0) { pts.push([a, y]); if (b > a) pts.push([b, y]); } }
    const hull = convexHull(pts); if (hull.length < 4) return null;
    let cx = 0, cy = 0; for (const p of hull) { cx += p[0]; cy += p[1]; } cx /= hull.length; cy /= hull.length;
    let S = [];
    for (let i = 0; i < hull.length; i++) {
      const a = hull[i], b = hull[(i + 1) % hull.length], len = Math.hypot(b[0] - a[0], b[1] - a[1]), k = Math.max(1, Math.round(len));
      for (let j = 0; j < k; j++) {
        const x = a[0] + (b[0] - a[0]) * j / k, y = a[1] + (b[1] - a[1]) * j / k, xi = Math.round(x), yi = Math.round(y);
        if (xi < 2 || yi < 2 || xi >= w - 2 || yi >= h - 2) continue;         // cut by the frame: not an edge of the sheet
        let near = false; for (let dy = -1; dy <= 1 && !near; dy++) for (let dx = -1; dx <= 1; dx++) if (m[(yi + dy) * w + xi + dx]) { near = true; break; }
        if (near) S.push([x, y]);
      }
    }
    const diag = Math.hypot(w, h), nr = Math.ceil(diag), lines = [];
    for (let k = 0; k < 4; k++) {
      if (S.length < 8) break;
      const acc = new Uint16Array(180 * (2 * nr + 1)); let best = 0, bi = 0;
      for (const p of S) for (let t = 0; t < 180; t++) {
        const th = t * Math.PI / 180, r = Math.round((p[0] * Math.cos(th) + p[1] * Math.sin(th)) / 2) + Math.floor(nr / 2), i = t * (2 * nr + 1) + r;
        if (++acc[i] > best) { best = acc[i]; bi = i; }
      }
      const t = Math.floor(bi / (2 * nr + 1)), th = t * Math.PI / 180, rho = (bi % (2 * nr + 1) - Math.floor(nr / 2)) * 2;
      let L = { n: [Math.cos(th), Math.sin(th)], d: rho }, inl = S.filter((p) => Math.abs(lineDist(L, p)) < 3.5);
      if (inl.length < 8) break;
      L = fitLine(inl); inl = S.filter((p) => Math.abs(lineDist(L, p)) < 2.2);
      if (inl.length < 8) break;
      L = fitLine(inl); L.pts = inl;
      S = S.filter((p) => Math.abs(lineDist(L, p)) >= 4);
      lines.push(L);
    }
    if (lines.length < 4) return null;
    for (const L of lines) { if (lineDist(L, [cx, cy]) > 0) { L.n = [-L.n[0], -L.n[1]]; L.d = -L.d; } L.ang = Math.atan2(L.c[1] - cy, L.c[0] - cx); }   // normals point outwards
    lines.sort((a, b) => b.ang - a.ang);                    // counter-clockwise on screen
    return { lines, centre: [cx, cy] };
  }

  /* Sharpen each line on the full-size photo: along it, find where "whiteness" drops going outwards. */
  function refineLine(img, L, k) {
    const d = img.data, w = img.w, h = img.h, tx = -L.n[1], ty = L.n[0];
    let s0 = 1e9, s1 = -1e9; for (const p of L.pts) { const s = p[0] * tx + p[1] * ty; if (s < s0) s0 = s; if (s > s1) s1 = s; }
    const base = [L.n[0] * L.d, L.n[1] * L.d], R = 2 * k + 3, step = Math.max(2, k / 2), P = [];
    const white = (x, y) => { const xi = Math.round(x), yi = Math.round(y); if (xi < 0 || yi < 0 || xi >= w || yi >= h) return -1; const i = (yi * w + xi) * 4; return Math.min(d[i], d[i + 1], d[i + 2]); };
    for (let s = s0 * k; s <= s1 * k; s += step) {
      const px = (base[0] * k + (k - 1) / 2) + tx * s, py = (base[1] * k + (k - 1) / 2) + ty * s, prof = [];
      let ok = true; for (let t = -R - 3; t <= R + 3; t++) { const v = white(px + L.n[0] * t, py + L.n[1] * t); if (v < 0) { ok = false; break; } prof.push(v); }
      if (!ok) continue;
      let best = -1, bt = 0; const sc = [];
      for (let t = 3; t < prof.length - 3; t++) { const v = (prof[t - 1] + prof[t - 2] + prof[t - 3]) - (prof[t] + prof[t + 1] + prof[t + 2]); sc.push(v); if (v > best) { best = v; bt = t; } }
      if (best < 3 * 14) continue;                           // no clear white -> dark step here (foot or shadow in the way)
      const i = bt - 3, a = sc[i - 1], b = sc[i], c = sc[i + 1]; let sub = 0; if (i > 0 && i < sc.length - 1 && a - 2 * b + c < 0) sub = 0.5 * (a - c) / (a - 2 * b + c);
      const tt = bt + sub - 0.5 - (R + 3); P.push([px + L.n[0] * tt, py + L.n[1] * tt]);
    }
    if (P.length < 6) return null;
    let F = fitLine(P);
    for (let it = 0; it < 3; it++) {
      const res = P.map((p) => Math.abs(lineDist(F, p))), srt = res.slice().sort((a, b) => a - b), cut = Math.max(1.0, 2.5 * srt[Math.floor(srt.length / 2)]);
      const keep = P.filter((p, i) => res[i] <= cut); if (keep.length < 6) break; F = fitLine(keep);
    }
    if (F.n[0] * L.n[0] + F.n[1] * L.n[1] < 0) { F.n = [-F.n[0], -F.n[1]]; F.d = -F.d; }
    return F;
  }

  /* Corners of the sheet in photo pixels, counter-clockwise on screen, or null.  quick = preview quality.
     A result counts only if the four corners can be a real A4 sheet seen by a camera. */
  function quadFrom(img, small, k, quick, relaxed) {
    const pl = paperLines(small, relaxed); if (!pl) return null;
    const L = pl.lines.map((l) => { if (!quick) { const r = refineLine(img, l, k); if (r) return r; } return { n: l.n, d: l.d * k + (k - 1) / 2 * (l.n[0] + l.n[1]) }; });
    const c = []; for (let i = 0; i < 4; i++) { const p = intersect(L[i], L[(i + 1) % 4]); if (!p) return null; c.push(p); }
    let area = 0; for (let i = 0; i < 4; i++) { const a = c[i], b = c[(i + 1) % 4]; area += a[0] * b[1] - a[1] * b[0]; }
    area = Math.abs(area) / 2;
    const span = Math.max(img.w, img.h);
    if (area < 0.02 * img.w * img.h || c.some((p) => p[0] < -0.5 * span || p[1] < -0.5 * span || p[0] > 1.5 * span || p[1] > 1.5 * span)) return null;
    for (let i = 0; i < 4; i++) {                             // must be convex
      const a = c[i], b = c[(i + 1) % 4], e = c[(i + 2) % 4];
      if ((b[0] - a[0]) * (e[1] - b[1]) - (b[1] - a[1]) * (e[0] - b[0]) > 0) return null;
    }
    let err = 1e9; for (const q of [0.65, 0.8, 1.0, 1.25]) { const p = solvePose(c, q * span, img.w, img.h); if (p && p.err < err) err = p.err; }
    return { c, err: err / span };
  }
  function detectQuad(img, quick) {
    const k = Math.max(1, Math.round(Math.max(img.w, img.h) / 420)), small = shrink(img, k);
    let best = quadFrom(img, small, k, quick, false);
    if (!best || best.err > 0.003) { const alt = quadFrom(img, small, k, quick, true); if (alt && (!best || alt.err < best.err)) best = alt; }
    return best && best.err < POSE_GATE ? best.c : null;
  }
  const POSE_GATE = 0.012;                                  // corner misfit allowed, as a share of the photo's long side

  /* ------------------------------------------------------------ camera */

  function rodrigues(v) {
    const th = Math.hypot(v[0], v[1], v[2]); if (th < 1e-12) return [1, 0, 0, 0, 1, 0, 0, 0, 1];
    const x = v[0] / th, y = v[1] / th, z = v[2] / th, c = Math.cos(th), s = Math.sin(th), C = 1 - c;
    return [c + x * x * C, x * y * C - z * s, x * z * C + y * s, y * x * C + z * s, c + y * y * C, y * z * C - x * s, z * x * C - y * s, z * y * C + x * s, c + z * z * C];
  }
  function rotVec(R) {
    const tr = R[0] + R[4] + R[8], c = Math.min(1, Math.max(-1, (tr - 1) / 2)), th = Math.acos(c);
    if (th < 1e-9) return [0, 0, 0];
    if (Math.PI - th < 1e-4) {                              // near 180 deg: axis from the diagonal
      const x = Math.sqrt(Math.max(0, (R[0] + 1) / 2)), y = Math.sqrt(Math.max(0, (R[4] + 1) / 2)) * (R[1] + R[3] < 0 ? -1 : 1), z = Math.sqrt(Math.max(0, (R[8] + 1) / 2)) * (R[2] + R[6] < 0 ? -1 : 1);
      return [x * th, y * th, z * th];
    }
    const k = th / (2 * Math.sin(th)); return [(R[7] - R[5]) * k, (R[2] - R[6]) * k, (R[3] - R[1]) * k];
  }

  function homography(from, to) {
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [u, v] = from[i], [x, y] = to[i];
      A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
      A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
    }
    return solve(A, b);
  }

  function project(cam, X, Y, Z) {
    const R = cam.R, t = cam.t, x = R[0] * X + R[1] * Y + R[2] * Z + t[0], y = R[3] * X + R[4] * Y + R[5] * Z + t[1], z = R[6] * X + R[7] * Y + R[8] * Z + t[2];
    return [cam.f * x / z + cam.cx, cam.f * y / z + cam.cy, z];
  }

  /* Camera from the sheet's four corners (already matched to PAPER order) for focal length f. */
  function poseFromCorners(c, f, cx, cy) {
    const n = c.map((p) => [(p[0] - cx) / f, (p[1] - cy) / f]), H = homography(PAPER, n); if (!H) return null;
    let h1 = [H[0], H[3], H[6]], h2 = [H[1], H[4], H[7]], h3 = [H[2], H[5], 1];
    const l = 2 / (Math.hypot(...h1) + Math.hypot(...h2)), sg = h3[2] * l < 0 ? -1 : 1;
    let r1 = h1.map((v) => v * l * sg), r2 = h2.map((v) => v * l * sg); const t0 = h3.map((v) => v * l * sg);
    let m = Math.hypot(...r1); r1 = r1.map((v) => v / m);
    const dp = r1[0] * r2[0] + r1[1] * r2[1] + r1[2] * r2[2]; r2 = r2.map((v, i) => v - dp * r1[i]); m = Math.hypot(...r2); r2 = r2.map((v) => v / m);
    const r3 = [r1[1] * r2[2] - r1[2] * r2[1], r1[2] * r2[0] - r1[0] * r2[2], r1[0] * r2[1] - r1[1] * r2[0]];
    const x0 = rotVec([r1[0], r2[0], r3[0], r1[1], r2[1], r3[1], r1[2], r2[2], r3[2]]).concat(t0);
    const res = (x) => {
      const cam = { R: rodrigues(x), t: [x[3], x[4], x[5]], f, cx, cy }, r = new Float64Array(8);
      for (let i = 0; i < 4; i++) { const p = project(cam, PAPER[i][0], PAPER[i][1], 0); r[2 * i] = p[0] - c[i][0]; r[2 * i + 1] = p[1] - c[i][1]; }
      return r;
    };
    const o = lm(res, x0, [1e-4, 1e-4, 1e-4, 0.05, 0.05, 0.05], { iters: 30, tol: 1e-9 });
    return { R: rodrigues(o.x), t: [o.x[3], o.x[4], o.x[5]], f, cx, cy, err: Math.sqrt(o.cost / 4) };
  }

  /* The sheet looks the same after half a turn, and its long and short sides must be told apart:
     try the corner order both ways, keep the better one. */
  function solvePose(quad, f, w, h) {
    let best = null;
    for (let s = 0; s < 2; s++) { const c = [0, 1, 2, 3].map((i) => quad[(i + s) % 4]), p = poseFromCorners(c, f, w / 2, h / 2); if (p && p.t[2] > 0 && (!best || p.err < best.err)) best = p; }
    return best;
  }
  const camCentre = (cam) => { const R = cam.R, t = cam.t; return [-(R[0] * t[0] + R[3] * t[1] + R[6] * t[2]), -(R[1] * t[0] + R[4] * t[1] + R[7] * t[2]), -(R[2] * t[0] + R[5] * t[1] + R[8] * t[2])]; };
  const halfTurn = (cam) => Object.assign({}, cam, { R: [-cam.R[0], -cam.R[1], cam.R[2], -cam.R[3], -cam.R[4], cam.R[5], -cam.R[6], -cam.R[7], cam.R[8]] });

  function estimateFocal(quads, w, h) {                     // the focal length that lets every photo show a true A4 sheet
    const span = Math.max(w, h), fs = [], cost = [];
    for (let q = 0.5; q <= 1.75; q *= 1.035) {
      let s = 0, n = 0; for (const quad of quads) { const p = solvePose(quad, q * span, w, h); if (p) { s += Math.min(p.err * p.err, 9); n++; } }
      if (n) { const pr = Math.log(q / 0.85) / 0.45; fs.push(q); cost.push(s / n + 0.5 * pr * pr); }   // weak prior: phone main cameras
    }
    let i = 0; for (let j = 1; j < fs.length; j++) if (cost[j] < cost[i]) i = j;
    let q = fs[i];
    if (i > 0 && i < fs.length - 1) { const a = cost[i - 1], b = cost[i], c = cost[i + 1], den = a - 2 * b + c; if (den > 0) q = fs[i] * Math.pow(1.035, 0.5 * (a - c) / den); }
    return { f: q * span, curve: fs.map((v, j) => [v, cost[j]]) };
  }

  /* ------------------------------------------------------------ foot against the paper */

  function segmentView(img, quad, maxSide) {
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of quad) { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    x0 = Math.max(0, Math.floor(x0)); y0 = Math.max(0, Math.floor(y0)); x1 = Math.min(img.w, Math.ceil(x1)); y1 = Math.min(img.h, Math.ceil(y1));
    const k = Math.max(1, Math.ceil(Math.max(x1 - x0, y1 - y0) / (maxSide || 300))), w = Math.floor((x1 - x0) / k), h = Math.floor((y1 - y0) / k), n = w * h;
    const d = img.data, rgb = new Float32Array(n * 3);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < k; j++) { let i = ((y0 + y * k + j) * img.w + x0 + x * k) * 4; for (let q = 0; q < k; q++, i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } }
      const o = (y * w + x) * 3; rgb[o] = r / (k * k); rgb[o + 1] = g / (k * k); rgb[o + 2] = b / (k * k);
    }
    const E = [];                                            // inside the sheet, a little away from its edges
    for (let i = 0; i < 4; i++) {
      const a = quad[i], b = quad[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      E.push([(b[1] - a[1]) / len, -(b[0] - a[0]) / len, a]);
    }
    let cxq = 0, cyq = 0; for (const p of quad) { cxq += p[0] / 4; cyq += p[1] / 4; }
    for (const e of E) if (e[0] * (cxq - e[2][0]) + e[1] * (cyq - e[2][1]) < 0) { e[0] = -e[0]; e[1] = -e[1]; }
    const inside = new Uint8Array(n), margin = 2.5 * k;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const px = x0 + (x + 0.5) * k, py = y0 + (y + 0.5) * k; let ok = 1;
      for (const e of E) if (e[0] * (px - e[2][0]) + e[1] * (py - e[2][1]) < margin) { ok = 0; break; }
      inside[y * w + x] = ok;
    }
    const vals = []; for (let p = 0; p < n; p++) if (inside[p]) vals.push(Math.max(rgb[p * 3], rgb[p * 3 + 1], rgb[p * 3 + 2]));
    if (vals.length < 50) return null;
    vals.sort((a, b) => a - b); const Vp = vals[Math.floor(0.85 * vals.length)];       // paper is the bright part of what lies inside the sheet
    let sr = 0, sg = 0, sn = 0;                              // its colour under this light, whatever the white balance
    for (let p = 0; p < n; p++) if (inside[p]) { const o = p * 3, mx = Math.max(rgb[o], rgb[o + 1], rgb[o + 2]); if (mx > 0.9 * Vp) { const q = rgb[o] + rgb[o + 1] + rgb[o + 2]; sr += rgb[o] / q; sg += rgb[o + 1] / q; sn++; } }
    const rp = sr / sn, gp = sg / sn, D = new Float32Array(n), dark = new Uint8Array(n), hist = new Float64Array(64);
    for (let p = 0; p < n; p++) if (inside[p]) {
      const o = p * 3, s = rgb[o] + rgb[o + 1] + rgb[o + 2] + 1e-6, r = rgb[o] / s, g = rgb[o + 1] / s, mx = Math.max(rgb[o], rgb[o + 1], rgb[o + 2]);
      if (mx < 0.13 * Vp) { dark[p] = 1; continue; }
      D[p] = r - rp > 0 ? Math.hypot(r - rp, g - gp) : 0;    // skin is redder than paper; shadows keep the paper's hue
      hist[Math.min(63, Math.floor(D[p] / 0.0025))]++;
    }
    let tot = 0, sum = 0; for (let i = 0; i < 64; i++) { tot += hist[i]; sum += i * hist[i]; }
    let wB = 0, sB = 0, bestV = -1, thr = 12; for (let i = 0; i < 64; i++) { wB += hist[i]; if (!wB || wB === tot) continue; sB += i * hist[i]; const mB = sB / wB, mF = (sum - sB) / (tot - wB), v = wB * (tot - wB) * (mB - mF) * (mB - mF); if (v > bestV) { bestV = v; thr = i + 1; } }
    const T = Math.min(0.06, Math.max(0.02, thr * 0.0025));
    let m = new Uint8Array(n); for (let p = 0; p < n; p++) m[p] = inside[p] && !dark[p] && D[p] > T ? 1 : 0;
    m = morph(morph(m, w, h, 1, true), w, h, 1, false);
    const comp = largestComponent(m, w, h), O = new Float32Array(n), Wt = new Float32Array(n);
    for (let p = 0; p < n; p++) { O[p] = comp.mask[p]; Wt[p] = inside[p] && !(dark[p] && !comp.mask[p]) ? 1 : 0; }
    return { x0, y0, k, w, h, O, Wt, area: comp.area, threshold: T, white: Vp };
  }

  /* ------------------------------------------------------------ the 3D foot */

  function loadModel(j) {
    const nx = j.nx, nt = j.nt, K = j.sd.length, nv = nx * nt + 2, tris = [];
    for (let i = 0; i < nx - 1; i++) for (let t = 0; t < nt; t++) {
      const a = i * nt + t, b = i * nt + (t + 1) % nt, c = a + nt, e = b + nt; tris.push(a, c, b, b, c, e);
    }
    for (let t = 0; t < nt; t++) { tris.push(nx * nt, t, (t + 1) % nt, nx * nt + 1, (nx - 1) * nt + (t + 1) % nt, (nx - 1) * nt + t); }
    const mean = Float32Array.from(j.mean), modes = Float32Array.from(j.modes);
    let cap = [1e9, -1e9, 1e9, -1e9];                         // where the ankle meets the top cut (mean shape)
    for (let i = 0; i < nx; i++) for (let t = 0; t < nt; t++) if (mean[(i * nt + t) * 2 + 1] > 0.97 * j.cut) { const y = mean[(i * nt + t) * 2]; cap = [Math.min(cap[0], j.x[i]), Math.max(cap[1], j.x[i]), Math.min(cap[2], y), Math.max(cap[3], y)]; }
    return { nx, nt, K, nv, cut: j.cut, x: Float32Array.from(j.x), sd: Float32Array.from(j.sd), mean, modes, tris: Uint32Array.from(tris), cap, flMean: j.fl_mean, flSd: j.fl_sd, nFeet: j.n_feet };
  }

  /* Vertices in the foot's own frame (mm): x heel -> toe, y towards medial, z up.  coef in standard deviations. */
  function footVerts(M, FL, coef, out) {
    const n = M.nx * M.nt, V = out || new Float32Array(M.nv * 3), g = new Float32Array(n * 2); g.set(M.mean);
    for (let k = 0; k < M.K; k++) { const c = (coef[k] || 0) * M.sd[k]; if (!c) continue; const o = k * n * 2; for (let i = 0; i < n * 2; i++) g[i] += c * M.modes[o + i]; }
    for (let i = 0; i < M.nx; i++) for (let t = 0; t < M.nt; t++) {
      const p = i * M.nt + t; V[p * 3] = M.x[i] * FL; V[p * 3 + 1] = g[p * 2] * FL; V[p * 3 + 2] = Math.min(M.cut, Math.max(0, g[p * 2 + 1])) * FL;
    }
    for (const [row, o] of [[0, n], [M.nx - 1, n + 1]]) {
      let x = 0, y = 0, z = 0; for (let t = 0; t < M.nt; t++) { const p = (row * M.nt + t) * 3; x += V[p]; y += V[p + 1]; z += V[p + 2]; }
      V[o * 3] = x / M.nt; V[o * 3 + 1] = y / M.nt; V[o * 3 + 2] = z / M.nt;
    }
    return V;
  }

  /* Foot frame -> sheet frame.  place = {tx, ty, yaw}: where the middle of the foot stands and how it is turned. */
  function toWorld(V, FL, side, place, out) {
    const W = out || new Float32Array(V.length), c = Math.cos(place.yaw), s = Math.sin(place.yaw), m = side === "L" ? -1 : 1;
    for (let i = 0; i < V.length; i += 3) { const x = V[i] - FL / 2, y = m * V[i + 1]; W[i] = place.tx + c * x - s * y; W[i + 1] = place.ty + s * x + c * y; W[i + 2] = V[i + 2]; }
    return W;
  }

  function fillTri(buf, w, h, ax, ay, bx, by, cx, cy) {
    let area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax); if (area === 0) return;
    if (area < 0) { let t = bx; bx = cx; cx = t; t = by; by = cy; cy = t; area = -area; }
    const x0 = Math.max(0, Math.ceil(Math.min(ax, bx, cx))), x1 = Math.min(w - 1, Math.floor(Math.max(ax, bx, cx)));
    const y0 = Math.max(0, Math.ceil(Math.min(ay, by, cy))), y1 = Math.min(h - 1, Math.floor(Math.max(ay, by, cy)));
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) {
      if ((bx - ax) * (y - ay) - (by - ay) * (x - ax) >= 0 && (cx - bx) * (y - by) - (cy - by) * (x - bx) >= 0 && (ax - cx) * (y - cy) - (ay - cy) * (x - cx) >= 0) buf[y * w + x] = 1;
    }
  }

  function renderMask(view, W, tris, buf, pts) {              // outline of the 3D foot as this photo would see it
    const cam = view.cam, R = cam.R, t = cam.t, nv = W.length / 3, P = pts || new Float32Array(nv * 2);
    for (let i = 0; i < nv; i++) {
      const X = W[i * 3], Y = W[i * 3 + 1], Z = W[i * 3 + 2], z = R[6] * X + R[7] * Y + R[8] * Z + t[2];
      P[i * 2] = ((cam.f * (R[0] * X + R[1] * Y + R[2] * Z + t[0]) / z + cam.cx) - view.x0) / view.k - 0.5;
      P[i * 2 + 1] = ((cam.f * (R[3] * X + R[4] * Y + R[5] * Z + t[1]) / z + cam.cy) - view.y0) / view.k - 0.5;
    }
    buf.fill(0);
    for (let i = 0; i < tris.length; i += 3) { const a = tris[i] * 2, b = tris[i + 1] * 2, c = tris[i + 2] * 2; fillTri(buf, view.w, view.h, P[a], P[a + 1], P[b], P[b + 1], P[c], P[c + 1]); }
    return buf;
  }

  /* Where the leg may be in this photo: a widening box above the ankle.  Pixels there are not compared. */
  function legMask(view, M, FL, side, place) {
    const cp = M.cap, zb = 0.82 * M.cut * FL, pad = 10, box = [];
    for (const [z, a] of [[zb, [cp[0] * FL - pad, cp[1] * FL + pad, cp[2] * FL - pad, cp[3] * FL + pad]], [480, [cp[0] * FL - 70, cp[1] * FL + 110, cp[2] * FL - 55, cp[3] * FL + 55]]])
      for (const x of [a[0], a[1]]) for (const y of [a[2], a[3]]) box.push(x, y, z);
    const W = toWorld(Float32Array.from(box), FL, side, place), cam = view.cam, pts = [];
    for (let i = 0; i < 8; i++) { const p = project(cam, W[i * 3], W[i * 3 + 1], W[i * 3 + 2]); if (p[2] > 1) pts.push([(p[0] - view.x0) / view.k - 0.5, (p[1] - view.y0) / view.k - 0.5]); }
    const buf = new Uint8Array(view.w * view.h); if (pts.length < 3) return buf;
    const hull = convexHull(pts);
    for (let i = 1; i < hull.length - 1; i++) fillTri(buf, view.w, view.h, hull[0][0], hull[0][1], hull[i][0], hull[i][1], hull[i + 1][0], hull[i + 1][1]);
    return buf;
  }

  function boxBlur(src, w, h, r, tmp) {                      // two passes of a running mean: roughly a triangle filter
    if (r < 1) return src;
    const pass = (a, b, len, stride, lines, lstride) => {
      for (let l = 0; l < lines; l++) {
        const o = l * lstride; let s = 0;
        for (let i = -r; i <= r; i++) s += a[o + Math.min(len - 1, Math.max(0, i)) * stride];
        for (let i = 0; i < len; i++) { b[o + i * stride] = s / (2 * r + 1); s += a[o + Math.min(len - 1, i + r + 1) * stride] - a[o + Math.max(0, i - r) * stride]; }
      }
    };
    pass(src, tmp, w, 1, h, w); pass(tmp, src, h, w, w, 1);
    return src;
  }

  /* Adjust foot length, shape and placement until the 3D foot's outline matches all photos. */
  function fitShape(views, M, side, opt) {
    opt = opt || {};
    const K = Math.min(opt.modes == null ? M.K : opt.modes, M.K), V = new Float32Array(M.nv * 3), Wd = new Float32Array(M.nv * 3), pts = new Float32Array(M.nv * 2);
    const bufs = views.map((v) => ({ m: new Uint8Array(v.w * v.h), d: new Float32Array(v.w * v.h), t: new Float32Array(v.w * v.h), w: new Float32Array(v.w * v.h), idx: null }));
    const prior = opt.prior == null ? 0.006 : opt.prior;
    let blur = 4, nres = 0, scale = 1;
    const unpack = (x) => ({ place: { tx: x[0], ty: x[1], yaw: x[2] }, FL: x[3], coef: Array.from(x.slice(4)) });
    const setup = (x, r) => {                                 // freeze which pixels are compared, for this stage
      blur = r; const p = unpack(x); nres = 0;
      views.forEach((v, i) => {
        const leg = legMask(v, M, p.FL, side, p.place), b = bufs[i], idx = [];
        for (let q = 0; q < v.w * v.h; q++) { b.w[q] = v.Wt[q] && !leg[q] ? 1 : 0; if (b.w[q]) idx.push(q); }
        b.idx = Int32Array.from(idx); nres += idx.length;
      });
      scale = 1 / Math.sqrt(nres);
    };
    const residuals = (x) => {
      const p = unpack(x), nc = p.coef.length, r = new Float32Array(nres + nc); let o = 0;
      footVerts(M, p.FL, p.coef, V); toWorld(V, p.FL, side, p.place, Wd);
      views.forEach((v, i) => {
        const b = bufs[i]; renderMask(v, Wd, M.tris, b.m, pts);
        for (let q = 0; q < b.d.length; q++) b.d[q] = (b.m[q] - v.O[q]) * b.w[q];
        boxBlur(b.d, v.w, v.h, blur, b.t); if (blur > 1) boxBlur(b.d, v.w, v.h, blur, b.t);
        const idx = b.idx; for (let q = 0; q < idx.length; q++) r[o++] = b.d[idx[q]] * scale;
      });
      for (let k = 0; k < nc; k++) r[o++] = prior * p.coef[k];
      return r;
    };
    let x = [opt.tx || 0, opt.ty || 0, opt.yaw || 0, opt.FL || 250];
    const lo4 = [-80, -80, -0.8, 170], hi4 = [80, 80, 0.8, 330], st4 = [2, 2, 0.02, 2];
    let best = null;
    for (const FL0 of opt.FL ? [opt.FL] : [235, 265]) {       // coarse: where the foot is and how long
      const x0 = x.slice(); x0[3] = FL0; setup(x0, 5);
      const o = lm(residuals, x0, st4, { lo: lo4, hi: hi4, iters: 25 });
      if (!best || o.cost < best.cost) best = o;
    }
    x = best.x;
    const full = (k) => ({ lo: lo4.concat(new Array(k).fill(-2.5)), hi: hi4.concat(new Array(k).fill(2.5)), st: st4.concat(new Array(k).fill(0.5)) });
    let out = best;
    for (const [k, r, it] of [[Math.min(2, K), 4, 12], [K, 3, 14], [K, 2, 12]]) {
      while (x.length < 4 + k) x.push(0);
      setup(x, r); const b = full(k); out = lm(residuals, x, b.st, { lo: b.lo, hi: b.hi, iters: it }); x = out.x;
    }
    setup(x, 0);                                              // how well the outlines agree, per photo
    const p = unpack(x); footVerts(M, p.FL, p.coef, V); toWorld(V, p.FL, side, p.place, Wd);
    const iou = views.map((v, i) => {
      const b = bufs[i]; renderMask(v, Wd, M.tris, b.m, pts); let a = 0, u = 0;
      for (const q of b.idx) { const mm = b.m[q], oo = v.O[q] > 0.5; if (mm && oo) a++; if (mm || oo) u++; }
      return u ? a / u : 0;
    });
    return { foot_length: p.FL, coef: p.coef, place: p.place, iou, cost: out.cost };
  }

  /* ------------------------------------------------------------ measurements on the fitted foot */

  function measure(M, FL, coef) { return measureVerts(M, footVerts(M, FL, coef), FL); }
  function measureVerts(M, V, FL) {
    const nt = M.nt, at = (i, t) => { const p = (i * nt + ((t % nt) + nt) % nt) * 3; return [V[p], V[p + 1], V[p + 2]]; };
    const slice = (X) => { let b = 0; for (let i = 1; i < M.nx; i++) if (Math.abs(M.x[i] - X) < Math.abs(M.x[b] - X)) b = i; return b; };
    const width = (X0, X1, zmax) => {
      let best = 0; for (let i = 0; i < M.nx; i++) { if (M.x[i] < X0 || M.x[i] > X1) continue; let lo = 1e9, hi = -1e9; for (let t = 0; t < nt; t++) { const p = at(i, t); if (p[2] <= zmax) { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]); } } best = Math.max(best, hi - lo); }
      return best;
    };
    const girth = (X) => { const i = slice(X); let s = 0; for (let t = 0; t < nt; t++) { const a = at(i, t), b = at(i, t + 1); s += Math.hypot(a[1] - b[1], a[2] - b[2]); } return s; };
    const top = (X) => { const i = slice(X); let z = 0; for (let t = 0; t < nt; t++) z = Math.max(z, at(i, t)[2]); return z; };
    let arch = 0;                                             // highest point of the sole 18 mm in from the medial edge, 30-50 % of length
    for (let i = 0; i < M.nx; i++) {
      if (M.x[i] < 0.3 || M.x[i] > 0.5) continue;
      let ymax = -1e9; for (let t = 0; t < nt; t++) { const p = at(i, t); if (p[2] < 0.1 * FL) ymax = Math.max(ymax, p[1]); }
      const yq = ymax - 18 * FL / 250; let z = null;
      for (let t = 0; t < nt; t++) { const a = at(i, t), b = at(i, t + 1); if (a[2] > 0.12 * FL || b[2] > 0.12 * FL) continue; if ((a[1] - yq) * (b[1] - yq) <= 0 && a[1] !== b[1]) { const zz = a[2] + (b[2] - a[2]) * (yq - a[1]) / (b[1] - a[1]); z = z == null ? zz : Math.min(z, zz); } }
      if (z != null) arch = Math.max(arch, z);
    }
    const r1 = (v) => Math.round(v * 10) / 10;
    return { foot_length_mm: r1(FL), toe_width_mm: r1(width(0.92, 0.95, 0.14 * FL)), arch_ratio_pct: r1(arch / FL * 100), forefoot_width_mm: r1(width(0.55, 0.85, 0.14 * FL)), heel_width_mm: r1(width(0.05, 0.25, 0.14 * FL)),
      instep_height_mm: r1(top(0.5)), arch_height_mm: r1(arch), ball_girth_mm: r1(girth(0.7)), instep_girth_mm: r1(girth(0.5)) };
  }

  /* ------------------------------------------------------------ everything for one foot */

  const EXPECT = { front: [1, 0], back: [-1, 0], medial: [0, 1], lateral: [0, -1] };

  /* photos: [{name: "front"|"medial"|"lateral"|"back", img, quad?}] -> fitted foot, or {error}. */
  function reconstruct(photos, side, M, opt) {
    opt = opt || {};
    const used = [], bad = [], diag = {};
    for (const ph of photos) { const quad = ph.quad || detectQuad(ph.img); if (quad) used.push(Object.assign({}, ph, { quad })); else { bad.push(ph.name); diag[ph.name] = { stage: "paper" }; } }
    if (used.length < 2) return { error: "paper", bad, diag };
    const w = used[0].img.w, h = used[0].img.h, same = used.every((u) => u.img.w === w && u.img.h === h);
    const focal = opt.f ? { f: opt.f } : estimateFocal(same ? used.map((u) => u.quad) : [used[0].quad], w, h), views = [];
    for (const u of used) {
      const span = Math.max(u.img.w, u.img.h), d = diag[u.name] = { stage: "ok" };
      let cam = solvePose(u.quad, focal.f * span / Math.max(w, h), u.img.w, u.img.h);
      d.pose_err_px = cam ? +cam.err.toFixed(1) : null;
      if (!cam || cam.err > 1.5 * POSE_GATE * span) { bad.push(u.name); d.stage = "pose"; continue; }      // the four corners cannot be an A4 sheet
      const e = EXPECT[u.name] || [1, 0], m = side === "L" && e[0] === 0 ? -1 : 1, C = camCentre(cam);
      if (C[0] * e[0] + C[1] * e[1] * m < 0) cam = halfTurn(cam);
      const seg = segmentView(u.img, u.quad, opt.maxSide || 280);
      d.foot_share = seg ? +(seg.area / (seg.w * seg.h)).toFixed(3) : null; if (seg) d.threshold = +seg.threshold.toFixed(4);
      if (!seg || seg.area < 0.01 * seg.w * seg.h) { bad.push(u.name); d.stage = "foot"; continue; }
      seg.cam = cam; seg.name = u.name; seg.quad = u.quad; seg.camera_mm = camCentre(cam).map((v) => Math.round(v));
      views.push(seg);
    }
    const stages = Object.values(diag).map((d) => d.stage);
    if (views.length < 2) return { error: stages.includes("foot") ? "foot" : stages.includes("pose") ? "pose" : "paper", bad, diag, focal_px: focal.f };
    const fit = fitShape(views, M, side, opt);
    return Object.assign(fit, { side, focal_px: focal.f, views, bad, diag, measures: measure(M, fit.foot_length, fit.coef) });
  }

  function orderQuad(pts) {                                 // any four corners -> counter-clockwise on screen, as detectQuad gives them
    const cx = pts.reduce((s, p) => s + p[0], 0) / 4, cy = pts.reduce((s, p) => s + p[1], 0) / 4;
    return pts.slice().sort((a, b) => Math.atan2(b[1] - cy, b[0] - cx) - Math.atan2(a[1] - cy, a[0] - cx));
  }

  /* ============================================================ paper-free flow
     No sheet of paper: the foot is lined up with a dashed outline on the screen, the size comes from
     the shoe size typed in, and three photos (top, outer side, inner side) give the shape. */

  function lookAt(C, T, up, f, w, h) {
    const nrm = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; }, cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const z = nrm([T[0] - C[0], T[1] - C[1], T[2] - C[2]]), x = nrm(cr(z, up)), y = cr(z, x), R = [x[0], x[1], x[2], y[0], y[1], y[2], z[0], z[1], z[2]];
    return { R, t: [-(R[0] * C[0] + R[1] * C[1] + R[2] * C[2]), -(R[3] * C[0] + R[4] * C[1] + R[5] * C[2]), -(R[6] * C[0] + R[7] * C[1] + R[8] * C[2])], f, cx: w / 2, cy: h / 2 };
  }

  /* Where the camera is when the foot fills the dashed outline.  The foot stands at the origin, toes towards +X. */
  function guideCam(name, side, FL, w, h, f) {
    f = f || 0.85 * Math.max(w, h); const m = side === "L" ? -1 : 1;
    if (name === "top") return lookAt([0, 0, f * FL / ((h >= w ? 0.62 : 0.8) * h)], [0, 0, 0], [1, 0, 0], f, w, h);
    const d = f * FL / ((h >= w ? 0.8 : 0.62) * w);
    return lookAt([0, (name === "inner" ? 1 : -1) * m * d, 0.4 * FL], [0, 0, 0.15 * FL], [0, 0, 1], f, w, h);
  }
  const ORIGIN = { tx: 0, ty: 0, yaw: 0 };

  /* Dashed outline to draw on the camera view: points [x, y] in photo pixels along the mean foot's outline. */
  function guideOutline(M, name, side, FL, w, h) {
    const cam = guideCam(name, side, FL, w, h), k = Math.max(1, Math.round(Math.max(w, h) / 240)), v = { x0: 0, y0: 0, k, w: Math.floor(w / k), h: Math.floor(h / k), cam };
    const m = renderMask(v, toWorld(footVerts(M, FL, []), FL, side, ORIGIN), M.tris, new Uint8Array(v.w * v.h)), pts = [];
    for (let y = 1; y < v.h - 1; y++) for (let x = 1; x < v.w - 1; x++) { const p = y * v.w + x; if (m[p] && !(m[p - 1] && m[p + 1] && m[p - v.w] && m[p + v.w])) pts.push([(x + 0.5) * k, (y + 0.5) * k]); }
    return pts;
  }

  /* Foot against any floor.  Colours well inside the expected outline teach what the foot looks like, colours
     well outside teach the background; every pixel in between goes to the side it resembles, then both
     colour tables are learnt again from the result. */
  function segmentGuided(img, cam, M, FL, side, seedVerts) {
    const W0 = seedVerts || toWorld(footVerts(M, FL, []), FL, side, ORIGIN);
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (let i = 0; i < W0.length; i += 3) { const p = project(cam, W0[i], W0[i + 1], W0[i + 2]); if (p[2] <= 1) continue; x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); }
    const padX = 0.3 * (x1 - x0), padY = 0.3 * (y1 - y0), len = Math.max(x1 - x0, y1 - y0);
    x0 = Math.max(0, Math.floor(x0 - padX)); y0 = Math.max(0, Math.floor(y0 - padY)); x1 = Math.min(img.w, Math.ceil(x1 + padX)); y1 = Math.min(img.h, Math.ceil(y1 + padY));
    const k = Math.max(1, Math.ceil(Math.max(x1 - x0, y1 - y0) / 260)), w = Math.floor((x1 - x0) / k), h = Math.floor((y1 - y0) / k), n = w * h;
    if (!(w >= 20 && h >= 20)) return null;
    const view = { x0, y0, k, w, h, cam }, d = img.data, bin = new Int32Array(n), NR = 20, NG = 20, NV = 8, NB = NR * NG * NV;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let r = 0, g = 0, b = 0;
      for (let j = 0; j < k; j++) { let i = ((y0 + y * k + j) * img.w + x0 + x * k) * 4; for (let q = 0; q < k; q++, i += 4) { r += d[i]; g += d[i + 1]; b += d[i + 2]; } }
      const s = r + g + b + 1e-6, V = Math.max(r, g, b) / (k * k);
      const ri = Math.min(NR - 1, Math.max(0, Math.floor((r / s - 0.2) / 0.4 * NR))), gi = Math.min(NG - 1, Math.max(0, Math.floor((g / s - 0.2) / 0.3 * NG))), vi = Math.min(NV - 1, Math.floor(V / 256 * NV));
      bin[y * w + x] = (ri * NG + gi) * NV + vi;
    }
    const m0 = renderMask(view, W0, M.tris, new Uint8Array(n)), leg = legMask(view, M, FL, side, ORIGIN), rr = Math.max(2, Math.round(len / k * (seedVerts ? 0.035 : 0.07)));
    const fgSeed = morph(m0, w, h, rr, true), far = morph(m0, w, h, Math.round((seedVerts ? 1.6 : 2.2) * rr), false);
    const lab = new Int8Array(n);                            // 1 foot, -1 background, 0 undecided
    for (let p = 0; p < n; p++) lab[p] = leg[p] ? 0 : fgSeed[p] ? 1 : !far[p] ? -1 : 0;
    const P = new Float32Array(n), tmp = new Float32Array(n);
    const learn = (sel) => {
      const H = new Float32Array(NB), S = new Float32Array(NB); let tot = 0;
      for (let p = 0; p < n; p++) if (sel(p)) { H[bin[p]]++; tot++; }
      for (let a = 0; a < NR; a++) for (let b = 0; b < NG; b++) for (let c = 0; c < NV; c++) {       // soften: neighbouring colours count a little
        let s = 0; for (let da = -1; da <= 1; da++) for (let db = -1; db <= 1; db++) for (let dc = -1; dc <= 1; dc++) { const A = a + da, B = b + db, C = c + dc; if (A < 0 || B < 0 || C < 0 || A >= NR || B >= NG || C >= NV) continue; s += H[(A * NG + B) * NV + C] * (da || db || dc ? 0.35 : 1); }
        S[(a * NG + b) * NV + c] = s;
      }
      for (let i = 0; i < NB; i++) S[i] = (S[i] + 0.02) / (tot + 1); return S;
    };
    let cur = lab;
    for (let it = 0; it < 3; it++) {
      const Hf = learn((p) => cur[p] > 0 && !leg[p]), Hb = learn((p) => cur[p] < 0 && !leg[p]);
      for (let p = 0; p < n; p++) P[p] = lab[p] > 0 ? 1 : lab[p] < 0 ? 0 : Hf[bin[p]] / (Hf[bin[p]] + Hb[bin[p]]);
      boxBlur(P, w, h, 2, tmp);
      const nxt = new Int8Array(n); for (let p = 0; p < n; p++) nxt[p] = lab[p] || (P[p] > 0.5 ? 1 : -1); cur = nxt;
    }
    let m = new Uint8Array(n); for (let p = 0; p < n; p++) m[p] = cur[p] > 0 ? 1 : 0;
    m = morph(morph(m, w, h, 1, true), w, h, 1, false);
    const comp = largestComponent(m, w, h), O = new Float32Array(n), Wt = new Float32Array(n);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const p = y * w + x; O[p] = comp.mask[p]; Wt[p] = x > 1 && y > 1 && x < w - 2 && y < h - 2 ? 1 : 0; }
    let seedArea = 0; for (let p = 0; p < n; p++) seedArea += m0[p];
    return Object.assign(view, { O, Wt, area: comp.area, seedArea });
  }

  /* Fit the foot's shape to the three outlines; each photo's camera may move away from where the guide put it. */
  function fitFree(views, M, side, FL, opt) {
    opt = opt || {};
    const K = Math.min(opt.modes == null ? M.K : opt.modes, M.K), V = new Float32Array(M.nv * 3), Wd = new Float32Array(M.nv * 3), pts = new Float32Array(M.nv * 2);
    const prior = opt.prior == null ? 0.004 : opt.prior, camPrior = opt.camPrior == null ? 0.08 : opt.camPrior;
    const st = views.map((v) => ({ cam0: v.cam, x: [0, 0, 0, 0, 0, 0], m: new Uint8Array(v.w * v.h), d: new Float32Array(v.w * v.h), t: new Float32Array(v.w * v.h), idx: null }));
    const coef = new Array(K).fill(0);
    const camOf = (s, x) => {
      const D = rodrigues(x), R0 = s.cam0.R, R = new Array(9);
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) R[i * 3 + j] = D[i * 3] * R0[j] + D[i * 3 + 1] * R0[3 + j] + D[i * 3 + 2] * R0[6 + j];
      return Object.assign({}, s.cam0, { R, t: [s.cam0.t[0] + x[3] * FL, s.cam0.t[1] + x[4] * FL, s.cam0.t[2] + x[5] * FL] });
    };
    const setVerts = (c) => { footVerts(M, FL, c, V); toWorld(V, FL, side, ORIGIN, Wd); };
    const freeze = () => views.forEach((v, i) => { v.cam = camOf(st[i], st[i].x); const leg = legMask(v, M, FL, side, ORIGIN), idx = []; for (let q = 0; q < v.w * v.h; q++) if (v.Wt[q] && !leg[q]) idx.push(q); st[i].idx = Int32Array.from(idx); });
    const viewRes = (i, cam, blur, out, o) => {
      const v = views[i], s = st[i], sc = 1 / Math.sqrt(s.idx.length || 1); v.cam = cam; renderMask(v, Wd, M.tris, s.m, pts);
      for (let q = 0; q < s.d.length; q++) s.d[q] = (s.m[q] - v.O[q]) * v.Wt[q];
      boxBlur(s.d, v.w, v.h, blur, s.t); if (blur > 1) boxBlur(s.d, v.w, v.h, blur, s.t);
      for (let q = 0; q < s.idx.length; q++) out[o + q] = s.d[s.idx[q]] * sc; return o + s.idx.length;
    };
    for (const [blur, kk] of [[6, 0], [4, Math.min(2, K)], [3, K], [2, K], [2, K]]) {
      freeze(); setVerts(coef);
      views.forEach((v, i) => {                               // this photo's camera
        const s = st[i], fn = (x) => { const r = new Float32Array(s.idx.length + 6); viewRes(i, camOf(s, x), blur, r, 0); for (let j = 0; j < 6; j++) r[s.idx.length + j] = camPrior * x[j] * (j < 3 ? 3 : 4); return r; };
        s.x = lm(fn, s.x, [0.01, 0.01, 0.01, 0.01, 0.01, 0.02], { lo: [-0.45, -0.45, -0.45, -0.6, -0.6, -0.6], hi: [0.45, 0.45, 0.45, 0.6, 0.6, 0.9], iters: 12 }).x;
        v.cam = camOf(s, s.x);
      });
      if (!kk) continue;
      freeze(); const cams = views.map((v) => v.cam), tot = st.reduce((a, s) => a + s.idx.length, 0);
      const fn = (c) => { const r = new Float32Array(tot + kk); let o = 0; setVerts(c); for (let i = 0; i < views.length; i++) o = viewRes(i, cams[i], blur, r, o); for (let j = 0; j < kk; j++) r[o + j] = prior * c[j] * Math.sqrt(views.length); return r; };
      const c = lm(fn, coef.slice(0, kk), new Array(kk).fill(0.5), { lo: new Array(kk).fill(-2.5), hi: new Array(kk).fill(2.5), iters: 10 }).x;
      for (let j = 0; j < kk; j++) coef[j] = c[j];
    }
    freeze(); setVerts(coef);
    const iou = views.map((v, i) => { const s = st[i]; renderMask(v, Wd, M.tris, s.m, pts); let a = 0, u = 0; for (const q of s.idx) { const mm = s.m[q], oo = v.O[q] > 0.5; if (mm && oo) a++; if (mm || oo) u++; } return u ? a / u : 0; });
    return { foot_length: FL, coef, place: ORIGIN, iou };
  }

  /* photos: [{name: "top"|"side"|"inner", img}], FL = foot length in mm from the shoe size. */
  function reconstructFree(photos, side, M, FL, opt) {
    opt = opt || {};
    const diag = {}, bad = [];
    const seg = (seedOf) => {
      const vs = [];
      for (const ph of photos) {
        const sd = seedOf(ph), v = segmentGuided(ph.img, sd.cam, M, FL, side, sd.verts), share = v ? v.area / Math.max(1, v.seedArea) : 0;
        diag[ph.name] = { stage: v && share > 0.35 && share < 2.6 ? "ok" : "foot", foot_vs_guide: +share.toFixed(2) };
        if (diag[ph.name].stage === "ok") { v.name = ph.name; vs.push(v); }
      }
      return vs;
    };
    let views = seg((ph) => ({ cam: guideCam(ph.name, side, FL, ph.img.w, ph.img.h, opt.f) }));
    for (const ph of photos) if (diag[ph.name].stage !== "ok") bad.push(ph.name);
    if (views.length < 2) return { error: "foot", bad, diag };
    let fit = fitFree(views, M, side, FL, opt);
    if (opt.rounds !== 1) {                                   // second look: cut the foot out again around the fitted model
      const W1 = toWorld(footVerts(M, FL, fit.coef), FL, side, ORIGIN), cams = {}; views.forEach((v) => (cams[v.name] = v.cam));
      const v2 = seg((ph) => ({ cam: cams[ph.name] || guideCam(ph.name, side, FL, ph.img.w, ph.img.h, opt.f), verts: cams[ph.name] ? W1 : null }));
      if (v2.length >= 2) { views = v2; fit = fitFree(views, M, side, FL, opt); }
    }
    views.forEach((v) => { v.camera_mm = camCentre(v.cam).map((x) => Math.round(x)); });
    return Object.assign(fit, { side, views, bad, diag, measures: measure(M, FL, fit.coef) });
  }


  const api = { guideCam, guideOutline, segmentGuided, fitFree, reconstructFree, orderQuad, A4L, A4S, PAPER, shrink, detectQuad, solvePose, estimateFocal, segmentView, loadModel, footVerts, toWorld, renderMask, legMask, fitShape, measure, measureVerts, reconstruct, project, camCentre, lm };
  if (typeof module !== "undefined" && module.exports) module.exports = api; else root.FIT = api;
})(typeof window !== "undefined" ? window : globalThis);
