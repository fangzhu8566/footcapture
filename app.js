"use strict";
/* FootCapture: foot length / widths from a top photo of the foot on A4 paper, navicular height
   from a medial photo.  Everything runs in the browser; photos are never uploaded.
   Output: a small JSON for make_insole.py --app (schema "app": "footcapture"). */

const PPM = 3, PW = 210, PH = 297;                  // rectified A4: pixels per mm, size in mm
const RW = PW * PPM, RH = PH * PPM;

const TXT = {
  ko: {
    sub: "A4 용지 위에서 발을 촬영해 발 길이와 아치 높이를 잽니다.",
    privacy: "사진은 이 휴대폰 안에서만 처리되며 서버로 전송되지 않습니다. 마지막에 숫자 결과 파일만 직접 보내시면 됩니다.",
    code: "참여자 코드", codeHint: "연구자가 알려준 코드 (이름 X)", agree: "위 내용을 확인했습니다", start: "시작",
    L: "왼발", R: "오른발", topTitle: "위에서 촬영",
    topSteps: ["A4 용지의 짧은 변을 벽에 붙여 바닥에 놓습니다 (어두운 바닥이 좋습니다).", "맨발로 용지 가운데에 서서 뒤꿈치를 벽에 댑니다.",
      "휴대폰을 발 중앙 바로 위에서 수평으로 들고, 용지 네 모서리가 모두 보이게 찍습니다."],
    sideTitle: "안쪽(아치 쪽)에서 촬영", sideSteps: ["주상골(안쪽 복사뼈 앞 아래 튀어나온 뼈)에 펜으로 점을 찍습니다.",
      "휴대폰을 바닥에 세워 발 안쪽을 정면으로 찍습니다. 뒤꿈치부터 엄지발가락 끝까지 보여야 합니다."],
    camera: "카메라 열기", pick: "사진 선택", shoot: "촬영", cancel: "취소", tilt: "기울기", level: "수평", upright: "수직",
    cornersTitle: "용지 모서리 확인", cornersHint: "네 점이 용지 모서리에 오도록 끌어서 맞추세요.", use: "이대로 측정", retake: "다시 찍기",
    resTitle: "측정 결과", len: "발 길이", ballW: "앞발 너비", heelW: "뒤꿈치 너비", heel: "뒤꿈치 선", toe: "발끝 선", flip: "앞뒤가 바뀌었어요",
    ok: "맞습니다", ptsHint: "차례로 누르세요: ① 뒤꿈치 뒤 바닥  ② 엄지발가락 끝 바닥  ③ 주상골 점", nh: "주상골 높이", reset: "점 다시 찍기",
    skip: "건너뛰기", next: "다음", sumTitle: "완료", download: "결과 파일 저장", share: "결과 파일 보내기",
    sumHint: "저장된 파일(JSON)을 연구자에게 보내 주세요.", restart: "처음부터", notMedical: "참고용이며 의학적 진단이 아닙니다.",
    errFoot: "발을 찾지 못했습니다. 모서리를 다시 맞추거나 밝은 곳에서 다시 찍어 주세요.", px: "해상도",
  },
  zh: {
    sub: "把脚踩在 A4 纸上拍照，测量足长和足弓高度。",
    privacy: "照片只在这部手机里处理，不会上传到任何服务器。最后只需要把数字结果文件发给研究者。",
    code: "参与者编号", codeHint: "研究者给你的编号（不要填姓名）", agree: "我已了解以上说明", start: "开始",
    L: "左脚", R: "右脚", topTitle: "从正上方拍",
    topSteps: ["把 A4 纸的短边贴着墙放在地上（深色地面最好）。", "赤脚站在纸中间，脚跟顶住墙。",
      "手机举在脚中部的正上方、保持水平，纸的四个角都要拍进去。"],
    sideTitle: "从内侧（足弓一侧）拍", sideSteps: ["在舟骨（内踝前下方的骨性突起）上用笔点一个点。",
      "手机立在地面上，正对脚的内侧拍。脚跟到大脚趾尖都要拍进去。"],
    camera: "打开相机", pick: "选择照片", shoot: "拍照", cancel: "取消", tilt: "倾斜", level: "水平", upright: "竖直",
    cornersTitle: "确认纸的四个角", cornersHint: "拖动四个点，让它们落在纸的四个角上。", use: "按这个测量", retake: "重拍",
    resTitle: "测量结果", len: "足长", ballW: "前掌宽", heelW: "后跟宽", heel: "脚跟线", toe: "脚尖线", flip: "前后反了",
    ok: "没问题", ptsHint: "依次点三个位置：① 脚跟后缘着地处  ② 大脚趾尖着地处  ③ 舟骨上的点", nh: "舟骨高度", reset: "重新点",
    skip: "跳过", next: "下一步", sumTitle: "完成", download: "保存结果文件", share: "发送结果文件",
    sumHint: "请把保存的文件（JSON）发给研究者。", restart: "重新开始", notMedical: "仅供参考，不是医学诊断。",
    errFoot: "没有找到脚。请重新调整四个角，或在更亮的地方重拍。", px: "分辨率",
  },
  en: {
    sub: "Photograph your foot on a sheet of A4 paper to measure foot length and arch height.",
    privacy: "Photos are processed on this phone only and are never uploaded. At the end you send just the small result file.",
    code: "Participant code", codeHint: "The code the researcher gave you (not your name)", agree: "I have read the above", start: "Start",
    L: "Left foot", R: "Right foot", topTitle: "Photo from above",
    topSteps: ["Put the A4 sheet on the floor with a short edge against the wall (a dark floor works best).",
      "Stand barefoot on the middle of the sheet with your heel against the wall.",
      "Hold the phone level, straight above the middle of the foot, with all four corners of the sheet in view."],
    sideTitle: "Photo from the inner (arch) side", sideSteps: ["Mark the navicular (the bony bump below and in front of the inner ankle) with a pen dot.",
      "Stand the phone on the floor facing the inner side of the foot. The heel and the tip of the big toe must be visible."],
    camera: "Open camera", pick: "Choose photo", shoot: "Take photo", cancel: "Cancel", tilt: "Tilt", level: "level", upright: "upright",
    cornersTitle: "Check the paper corners", cornersHint: "Drag the four dots onto the corners of the sheet.", use: "Measure", retake: "Retake",
    resTitle: "Result", len: "Foot length", ballW: "Forefoot width", heelW: "Heel width", heel: "Heel line", toe: "Toe line", flip: "Heel and toe are swapped",
    ok: "Looks right", ptsHint: "Tap in order: 1 back of the heel on the floor  2 tip of the big toe on the floor  3 the navicular dot", nh: "Navicular height", reset: "Clear points",
    skip: "Skip", next: "Next", sumTitle: "Done", download: "Save result file", share: "Send result file",
    sumHint: "Please send the saved file (JSON) to the researcher.", restart: "Start over", notMedical: "For reference only, not a medical diagnosis.",
    errFoot: "Could not find the foot. Adjust the corners or retake in better light.", px: "Resolution",
  },
};

const S = { lang: (navigator.language || "ko").slice(0, 2), subject: "", feet: { L: {}, R: {} }, order: ["L", "R"], i: 0 };
if (!TXT[S.lang]) S.lang = "ko";
const t = (k) => TXT[S.lang][k];
const $ = (id) => document.getElementById(id);
const app = () => $("app");

/* ---------------------------------------------------------------- image helpers */

function toCanvas(src, maxSide = 2000) {
  const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d", { willReadFrequently: true }).drawImage(src, 0, 0, c.width, c.height);
  return c;
}

function loadUrl(url) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(toCanvas(im)); im.onerror = bad; im.src = url; });
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

function morph(mask, w, h, r, erode) {                 // square structuring element, separable
  const pass = (src, dx, dy) => {
    const dst = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let v = erode ? 1 : 0;
      for (let k = -r; k <= r; k++) {
        const xx = x + k * dx, yy = y + k * dy;
        const m = xx < 0 || yy < 0 || xx >= w || yy >= h ? 0 : src[yy * w + xx];
        if (erode ? !m : m) { v = erode ? 0 : 1; break; }
      }
      dst[y * w + x] = v;
    }
    return dst;
  };
  return pass(pass(mask, 1, 0), 0, 1);
}

/* ---------------------------------------------------------------- paper: detect, rectify */

function detectPaper(canvas) {                          // 4 corners TL, TR, BR, BL in canvas pixels, or null
  const k = Math.min(1, 360 / Math.max(canvas.width, canvas.height));
  const w = Math.round(canvas.width * k), h = Math.round(canvas.height * k);
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(canvas, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data, V = new Uint8Array(w * h), hist = new Uint32Array(256);
  const sat = new Float32Array(w * h);
  for (let i = 0, p = 0; i < d.length; i += 4, p++) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    V[p] = mx; hist[mx]++; sat[p] = mx ? (mx - mn) / mx : 0;
  }
  let acc = 0, p95 = 255; for (let v = 255; v >= 0; v--) { acc += hist[v]; if (acc > 0.05 * w * h) { p95 = v; break; } }
  const m = new Uint8Array(w * h);
  for (let p = 0; p < w * h; p++) m[p] = V[p] > 0.62 * p95 && sat[p] < 0.28 ? 1 : 0;
  const comp = largestComponent(m, w, h);
  if (comp.area < 0.06 * w * h) return null;
  const ext = [[1e9, 0, 0], [-1e9, 0, 0], [-1e9, 0, 0], [1e9, 0, 0]];   // TL min x+y, TR max x-y, BR max x+y, BL min x-y
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (comp.mask[y * w + x]) {
    const a = x + y, b = x - y;
    if (a < ext[0][0]) ext[0] = [a, x, y];
    if (b > ext[1][0]) ext[1] = [b, x, y];
    if (a > ext[2][0]) ext[2] = [a, x, y];
    if (b < ext[3][0]) ext[3] = [b, x, y];
  }
  return ext.map((e) => [e[1] / k, e[2] / k]);
}

function solve8(A, b) {                                 // Gaussian elimination with partial pivoting
  const n = 8;
  for (let i = 0; i < n; i++) {
    let p = i; for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[p][i])) p = r;
    [A[i], A[p]] = [A[p], A[i]]; [b[i], b[p]] = [b[p], b[i]];
    for (let r = i + 1; r < n; r++) {
      const f = A[r][i] / A[i][i];
      for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
      b[r] -= f * b[i];
    }
  }
  const x = new Array(n);
  for (let i = n - 1; i >= 0; i--) { let s = b[i]; for (let c = i + 1; c < n; c++) s -= A[i][c] * x[c]; x[i] = s / A[i][i]; }
  return x;
}

function homography(from, to) {                         // maps `from` points onto `to` points
  const A = [], b = [];
  for (let i = 0; i < 4; i++) {
    const [u, v] = from[i], [x, y] = to[i];
    A.push([u, v, 1, 0, 0, 0, -u * x, -v * x]); b.push(x);
    A.push([0, 0, 0, u, v, 1, -u * y, -v * y]); b.push(y);
  }
  return solve8(A, b);
}

function rectify(canvas, corners) {                     // A4 seen flat, long side vertical, RW x RH
  let c = corners.map((p) => p.slice());
  const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
  if (dist(c[0], c[1]) > dist(c[1], c[2])) c = [c[1], c[2], c[3], c[0]];     // first edge must be a short one
  const H = homography([[0, 0], [RW, 0], [RW, RH], [0, RH]], c);
  const src = canvas.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height);
  const out = new ImageData(RW, RH), sw = src.width, sh = src.height, sd = src.data, od = out.data;
  for (let v = 0; v < RH; v++) for (let u = 0; u < RW; u++) {
    const den = H[6] * u + H[7] * v + 1;
    const x = (H[0] * u + H[1] * v + H[2]) / den, y = (H[3] * u + H[4] * v + H[5]) / den;
    const x0 = Math.floor(x), y0 = Math.floor(y), o = (v * RW + u) * 4;
    if (x0 < 0 || y0 < 0 || x0 >= sw - 1 || y0 >= sh - 1) { od[o + 3] = 255; continue; }
    const fx = x - x0, fy = y - y0, i = (y0 * sw + x0) * 4;
    for (let ch = 0; ch < 3; ch++) {
      od[o + ch] = (sd[i + ch] * (1 - fx) + sd[i + 4 + ch] * fx) * (1 - fy) +
        (sd[i + sw * 4 + ch] * (1 - fx) + sd[i + sw * 4 + 4 + ch] * fx) * fy;
    }
    od[o + 3] = 255;
  }
  return { image: out, pxPerMm: Math.max(dist(c[1], c[2]), dist(c[3], c[0])) / PH };
}

/* ---------------------------------------------------------------- foot: segment, measure */

function segmentFoot(img) {                              // skin is more saturated than paper or its shadow
  const w = img.width, h = img.height, d = img.data, n = w * h;
  const V = new Uint8Array(n), Sa = new Float32Array(n), hv = new Uint32Array(256);
  for (let i = 0, p = 0; p < n; i += 4, p++) {
    const mx = Math.max(d[i], d[i + 1], d[i + 2]), mn = Math.min(d[i], d[i + 1], d[i + 2]);
    V[p] = mx; Sa[p] = mx ? (mx - mn) / mx : 0;
    if (Sa[p] < 0.2) hv[mx]++;
  }
  let tot = 0; for (let v = 0; v < 256; v++) tot += hv[v];
  let acc = 0, Vp = 255; for (let v = 255; v >= 0; v--) { acc += hv[v]; if (acc > 0.2 * tot) { Vp = v; break; } }
  let sSum = 0, sN = 0; for (let p = 0; p < n; p++) if (V[p] > 0.8 * Vp && Sa[p] < 0.2) { sSum += Sa[p]; sN++; }
  const Sp = sN ? sSum / sN : 0.03;
  let m = new Uint8Array(n);
  for (let p = 0; p < n; p++) m[p] = (Sa[p] > Sp + 0.1 && V[p] < 1.05 * Vp) || V[p] < 0.45 * Vp ? 1 : 0;
  const r = 2 * PPM;                                     // opening: drops thin strips along the paper edge
  m = morph(morph(m, w, h, r, true), w, h, r, false);
  return largestComponent(m, w, h);
}

function measureFoot(mask, side, flip = false) {
  const w = RW, h = RH;
  let y0 = -1, y1 = -1;
  const rowW = new Int32Array(h), rowC = new Float32Array(h);
  for (let y = 0; y < h; y++) {
    let a = -1, b = -1; for (let x = 0; x < w; x++) if (mask[y * w + x]) { if (a < 0) a = x; b = x; }
    if (a >= 0) { rowW[y] = b - a + 1; rowC[y] = (a + b) / 2; if (y0 < 0) y0 = y; y1 = y; }
  }
  if (y0 < 0 || y1 - y0 < 120 * PPM) return null;
  const len = y1 - y0, wAt = (f) => { let s = 0, k = 0; for (let y = Math.round(y0 + (f - 0.03) * len); y <= y0 + (f + 0.03) * len; y++) { s += rowW[y]; k++; } return s / k; };
  let heelLow = wAt(0.88) < wAt(0.12);                   // the narrower end is the heel; true = heel at the bottom
  if (flip) heelLow = !heelLow;
  let a = [0, heelLow ? -1 : 1], hc = [w / 2, heelLow ? y1 : y0], tmin = 0, tmax = len;
  const each = (fn) => { for (let y = y0; y <= y1; y++) for (let x = 0; x < w; x++) if (mask[y * w + x]) fn(x, y, (x - hc[0]) * a[0] + (y - hc[1]) * a[1]); };
  const span = () => { let lo = 1e9, hi = -1e9; each((x, y, tt) => { if (tt < lo) lo = tt; if (tt > hi) hi = tt; }); tmin = lo; tmax = hi; };
  for (let it = 0; it < 3; it++) {                       // axis: heel centre -> ball centre, as in footmodel.load_foot
    span();
    const c = [[0, 0, 0], [0, 0, 0]];
    each((x, y, tt) => {
      const f = (tt - tmin) / (tmax - tmin), k = f > 0.05 && f < 0.2 ? 0 : f > 0.6 && f < 0.76 ? 1 : -1;
      if (k >= 0) { c[k][0] += x; c[k][1] += y; c[k][2]++; }
    });
    if (!c[0][2] || !c[1][2]) return null;
    const h2 = [c[0][0] / c[0][2], c[0][1] / c[0][2]], b2 = [c[1][0] / c[1][2], c[1][1] / c[1][2]];
    const L = Math.hypot(b2[0] - h2[0], b2[1] - h2[1]);
    hc = h2; a = [(b2[0] - h2[0]) / L, (b2[1] - h2[1]) / L];
  }
  span();
  const b = [-a[1], a[0]], nb = Math.ceil((tmax - tmin) / PPM) + 2;
  const smin = new Float32Array(nb).fill(1e9), smax = new Float32Array(nb).fill(-1e9);
  each((x, y, tt) => {
    const ss = (x - hc[0]) * b[0] + (y - hc[1]) * b[1], k = Math.floor((tt - tmin) / PPM);
    if (ss < smin[k]) smin[k] = ss; if (ss > smax[k]) smax[k] = ss;
  });
  const FL = (tmax - tmin + 1) / PPM;
  const widest = (f0, f1) => { let m = 0; for (let k = Math.floor(f0 * FL); k <= f1 * FL && k < nb; k++) if (smax[k] > smin[k]) m = Math.max(m, smax[k] - smin[k] + 1); return m / PPM; };
  const sgn = side === "L" ? 1 : -1, lat = [], med = [];          // +b is medial for a left foot seen from above
  for (let k = 0; k < nb; k += 4) if (smax[k] > smin[k]) {
    const ya = sgn * smin[k] / PPM, yb = sgn * smax[k] / PPM;
    lat.push([k, +Math.min(ya, yb).toFixed(1)]); med.push([k, +Math.max(ya, yb).toFixed(1)]);
  }
  return { foot_length_mm: FL, forefoot_width_mm: widest(0.55, 0.85), heel_width_mm: widest(0.05, 0.25),
    outline_mm: lat.concat(med.reverse()), hc, a, b, tmin, tmax };
}

function navicularHeight(heel, toe, nav, footLength) {  // points in photo pixels; scale from the known foot length
  const L = Math.hypot(toe[0] - heel[0], toe[1] - heel[1]);
  const d = Math.abs((toe[0] - heel[0]) * (nav[1] - heel[1]) - (toe[1] - heel[1]) * (nav[0] - heel[0])) / L;
  return d * footLength / L;
}

function processTop(canvas, side, corners, flip = false) {
  corners = corners || detectPaper(canvas);
  if (!corners) return null;
  const rect = rectify(canvas, corners), seg = segmentFoot(rect.image);
  const m = seg.area > 4000 ? measureFoot(seg.mask, side, flip) : null;
  return { corners, rect, mask: seg.mask, m };
}

/* ---------------------------------------------------------------- drawing */

function drawResult(cv, res, adj) {
  cv.width = RW; cv.height = RH;
  const g = cv.getContext("2d"), img = new ImageData(new Uint8ClampedArray(res.rect.image.data), RW, RH), d = img.data, k = res.mask;
  for (let y = 1; y < RH - 1; y++) for (let x = 1; x < RW - 1; x++) {
    const p = y * RW + x;
    if (k[p] && !(k[p - 1] && k[p + 1] && k[p - RW] && k[p + RW])) { d[p * 4] = 0; d[p * 4 + 1] = 200; d[p * 4 + 2] = 120; }
  }
  g.putImageData(img, 0, 0);
  if (!res.m) return;
  const { hc, a, b, tmin, tmax } = res.m;
  const line = (tt, col) => {
    const c = [hc[0] + a[0] * tt, hc[1] + a[1] * tt];
    g.strokeStyle = col; g.lineWidth = 3; g.setLineDash([10, 6]); g.beginPath();
    g.moveTo(c[0] - b[0] * 250, c[1] - b[1] * 250); g.lineTo(c[0] + b[0] * 250, c[1] + b[1] * 250); g.stroke();
  };
  line(tmin - adj.heel * PPM, "#e11d48"); line(tmax + adj.toe * PPM, "#2563eb");
}

/* ---------------------------------------------------------------- screens */

function langBar() {
  return `<div class="lang">${["ko", "zh", "en"].map((l) => `<button data-lang="${l}">${{ ko: "한국어", zh: "中文", en: "EN" }[l]}</button>`).join("")}</div>`;
}
function bindLang(again) { document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { S.lang = b.dataset.lang; again(); })); }
const foot = () => S.order[S.i];

function home() {
  app().innerHTML = `${langBar()}<h1>FootCapture</h1><p>${t("sub")}</p>
    <div class="card"><p>${t("privacy")}</p>
      <label>${t("code")}<input type="text" id="code" placeholder="${t("codeHint")}" value="${S.subject}"></label>
      <p><label><input type="checkbox" id="agree"> ${t("agree")}</label></p>
      <button class="go" id="go" disabled>${t("start")}</button></div>
    <p class="small">${t("notMedical")}</p>`;
  bindLang(home);
  const upd = () => { $("go").disabled = !($("agree").checked && $("code").value.trim()); };
  $("agree").onchange = upd; $("code").oninput = upd;
  $("go").onclick = () => { S.subject = $("code").value.trim(); S.i = 0; S.feet = { L: {}, R: {} }; capture("top"); };
}

let stream = null, tiltHandler = null;
function stopCamera() {
  if (stream) stream.getTracks().forEach((x) => x.stop()); stream = null;
  if (tiltHandler) window.removeEventListener("deviceorientation", tiltHandler); tiltHandler = null;
}

function capture(kind) {                                 // kind: "top" | "side"
  stopCamera();
  const steps = t(kind === "top" ? "topSteps" : "sideSteps");
  app().innerHTML = `<h2>${t(foot())} · ${t(kind === "top" ? "topTitle" : "sideTitle")}</h2>
    <div class="card"><ol>${steps.map((s) => `<li>${s}</li>`).join("")}</ol></div>
    <div id="cam"></div>
    <button class="go" id="open">${t("camera")}</button>
    <label class="btn">${t("pick")}<input type="file" accept="image/*" id="file" hidden></label>
    ${kind === "side" ? `<button id="skip">${t("skip")}</button>` : ""}`;
  const got = (cv) => { stopCamera(); kind === "top" ? corners(cv) : sidePoints(cv); };
  $("file").onchange = (e) => { const f = e.target.files[0]; if (f) loadUrl(URL.createObjectURL(f)).then(got); };
  if (kind === "side") $("skip").onclick = nextFoot;
  $("open").onclick = async () => {
    try {
      if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission().catch(() => {});
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
    } catch (e) { $("file").click(); return; }
    $("cam").innerHTML = `<div class="stage"><video id="v" playsinline autoplay muted></video><canvas class="ov" id="ov"></canvas></div>
      <p>${t("tilt")}: <span class="tilt" id="tilt">–</span></p><button class="go" id="shoot">${t("shoot")}</button>`;
    $("open").style.display = "none";
    const v = $("v"); v.srcObject = stream;
    v.onloadedmetadata = () => {
      const ov = $("ov"); ov.width = v.videoWidth; ov.height = v.videoHeight;
      const g = ov.getContext("2d"); g.strokeStyle = "rgba(255,255,255,.9)"; g.lineWidth = Math.max(3, ov.width / 250); g.setLineDash([18, 12]);
      if (kind === "top") {                                // dashed A4 sheet to aim at
        const hh = ov.height * 0.86, ww = Math.min(ov.width * 0.86, hh * PW / PH), h2 = ww * PH / PW;
        g.strokeRect((ov.width - ww) / 2, (ov.height - h2) / 2, ww, h2);
      } else { g.beginPath(); g.moveTo(0, ov.height * 0.8); g.lineTo(ov.width, ov.height * 0.8); g.stroke(); }
    };
    tiltHandler = (e) => {                                 // top: phone flat; side: phone upright
      if (e.beta == null) return;
      const dev = kind === "top" ? Math.hypot(e.beta, e.gamma) : Math.hypot(Math.abs(e.beta) - 90, e.gamma);
      const el = $("tilt"); if (!el) return;
      el.textContent = `${dev.toFixed(0)}°  (${t(kind === "top" ? "level" : "upright")})`;
      el.className = "tilt " + (dev < 6 ? "ok" : dev < 12 ? "warn" : "bad"); S.tilt = dev;
    };
    window.addEventListener("deviceorientation", tiltHandler);
    $("shoot").onclick = () => got(toCanvas(v));
  };
}

function corners(cv) {
  let pts = detectPaper(cv) || [[0.15, 0.1], [0.85, 0.1], [0.85, 0.9], [0.15, 0.9]].map((p) => [p[0] * cv.width, p[1] * cv.height]);
  app().innerHTML = `<h2>${t("cornersTitle")}</h2><p>${t("cornersHint")}</p><canvas id="c"></canvas>
    <button class="go" id="use">${t("use")}</button><button id="re">${t("retake")}</button>`;
  const c = $("c"); c.width = cv.width; c.height = cv.height; const g = c.getContext("2d");
  const draw = () => {
    g.drawImage(cv, 0, 0); g.strokeStyle = "#22c55e"; g.lineWidth = cv.width / 200; g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke();
    pts.forEach((p) => { g.fillStyle = "#22c55e"; g.beginPath(); g.arc(p[0], p[1], cv.width / 45, 0, 7); g.fill(); });
  };
  draw();
  let drag = -1;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  c.onpointerdown = (e) => { const p = pos(e); let best = 1e9; pts.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < best) { best = dd; drag = i; } }); c.setPointerCapture(e.pointerId); };
  c.onpointermove = (e) => { if (drag >= 0) { pts[drag] = pos(e); draw(); } };
  c.onpointerup = () => { drag = -1; };
  $("re").onclick = () => capture("top");
  $("use").onclick = () => result(cv, pts, false);
}

function result(cv, pts, flip) {
  const res = processTop(cv, foot(), pts, flip), adj = { heel: 0, toe: 0 };
  if (!res || !res.m) {
    app().innerHTML = `<h2>${t("resTitle")}</h2><div class="card"><p class="bad">${t("errFoot")}</p></div><canvas id="r"></canvas><button id="re">${t("retake")}</button>`;
    if (res) drawResult($("r"), res, adj);
    $("re").onclick = () => capture("top"); return;
  }
  const nudge = (k) => `<div class="row"><button data-n="${k}:-0.5">${t(k)} −</button><button data-n="${k}:0.5">${t(k)} +</button></div>`;
  app().innerHTML = `<h2>${t(foot())} · ${t("resTitle")}</h2><canvas id="r"></canvas>
    <div class="card"><table><tr><td>${t("len")}</td><th id="fl"></th></tr><tr><td>${t("ballW")}</td><th>${res.m.forefoot_width_mm.toFixed(1)} mm</th></tr>
      <tr><td>${t("heelW")}</td><th>${res.m.heel_width_mm.toFixed(1)} mm</th></tr><tr><td>${t("px")}</td><th>${res.rect.pxPerMm.toFixed(1)} px/mm</th></tr></table></div>
    ${nudge("toe")}${nudge("heel")}
    <button class="go" id="ok">${t("ok")}</button><button id="flip">${t("flip")}</button><button id="re">${t("retake")}</button>`;
  const show = () => { drawResult($("r"), res, adj); $("fl").textContent = (res.m.foot_length_mm + adj.heel + adj.toe).toFixed(1) + " mm"; };
  show();
  document.querySelectorAll("[data-n]").forEach((b) => (b.onclick = () => { const [k, v] = b.dataset.n.split(":"); adj[k] += +v; show(); }));
  $("re").onclick = () => capture("top");
  $("flip").onclick = () => result(cv, pts, !flip);
  $("ok").onclick = () => {
    S.feet[foot()] = { foot_length_mm: +(res.m.foot_length_mm + adj.heel + adj.toe).toFixed(1), forefoot_width_mm: +res.m.forefoot_width_mm.toFixed(1),
      heel_width_mm: +res.m.heel_width_mm.toFixed(1), outline_mm: res.m.outline_mm,
      quality: { px_per_mm: +res.rect.pxPerMm.toFixed(2), tilt_deg: S.tilt == null ? null : +S.tilt.toFixed(1), manual_adjust_mm: adj.heel + adj.toe } };
    capture("side");
  };
}

function sidePoints(cv) {
  const pts = [], FL = S.feet[foot()].foot_length_mm;
  app().innerHTML = `<h2>${t(foot())} · ${t("nh")}</h2><p>${t("ptsHint")}</p><canvas id="c"></canvas>
    <div class="card"><table><tr><td>${t("nh")}</td><th id="nh">–</th></tr></table></div>
    <button class="go" id="ok" disabled>${t("ok")}</button><button id="rs">${t("reset")}</button><button id="skip">${t("skip")}</button>`;
  const c = $("c"); c.width = cv.width; c.height = cv.height; const g = c.getContext("2d"), col = ["#e11d48", "#2563eb", "#f59e0b"];
  const draw = () => {
    g.drawImage(cv, 0, 0); g.lineWidth = cv.width / 250;
    if (pts.length >= 2) { g.strokeStyle = "#fff"; g.beginPath(); g.moveTo(pts[0][0], pts[0][1]); g.lineTo(pts[1][0], pts[1][1]); g.stroke(); }
    pts.forEach((p, i) => { g.fillStyle = col[i]; g.beginPath(); g.arc(p[0], p[1], cv.width / 70, 0, 7); g.fill(); });
    const done = pts.length === 3; $("ok").disabled = !done;
    $("nh").textContent = done ? navicularHeight(pts[0], pts[1], pts[2], FL).toFixed(1) + " mm" : "–";
  };
  draw();
  c.onpointerdown = (e) => { if (pts.length < 3) { const r = c.getBoundingClientRect(); pts.push([(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]); draw(); } };
  $("rs").onclick = () => { pts.length = 0; draw(); };
  $("skip").onclick = nextFoot;
  $("ok").onclick = () => { S.feet[foot()].navicular_height_mm = +navicularHeight(pts[0], pts[1], pts[2], FL).toFixed(1); nextFoot(); };
}

function nextFoot() { stopCamera(); S.i++; S.i < S.order.length ? capture("top") : summary(); }

function exportData() {
  const side = (k) => (S.feet[k].foot_length_mm ? S.feet[k] : undefined);
  return { app: "footcapture", version: "0.1", subject: S.subject, created: new Date().toISOString(), left: side("L"), right: side("R") };
}

function summary() {
  const d = exportData(), row = (k, u) => `<tr><td>${t(k)}</td>${["left", "right"].map((s) => `<th>${d[s] && d[s][{ len: "foot_length_mm", ballW: "forefoot_width_mm", heelW: "heel_width_mm", nh: "navicular_height_mm" }[k]] != null ? d[s][{ len: "foot_length_mm", ballW: "forefoot_width_mm", heelW: "heel_width_mm", nh: "navicular_height_mm" }[k]] + u : "–"}</th>`).join("")}</tr>`;
  app().innerHTML = `<h2>${t("sumTitle")} · ${S.subject}</h2>
    <div class="card"><table><tr><td></td><th>${t("L")}</th><th>${t("R")}</th></tr>${row("len", " mm")}${row("ballW", " mm")}${row("heelW", " mm")}${row("nh", " mm")}</table></div>
    <p>${t("sumHint")}</p><button class="go" id="share">${t("share")}</button><button id="dl">${t("download")}</button><button id="again">${t("restart")}</button>
    <p class="small">${t("notMedical")}</p>`;
  const name = `${S.subject || "foot"}_app.json`, blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
  $("dl").onclick = () => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); };
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) $("share").onclick = () => navigator.share({ files: [file], title: name }).catch(() => {});
  else $("share").style.display = "none";
  $("again").onclick = home;
}

window.FC = { S, loadUrl, detectPaper, rectify, segmentFoot, measureFoot, processTop, navicularHeight, exportData, home, summary, corners, sidePoints };
home();
