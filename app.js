"use strict";
/* FootCapture: a helper photographs each foot on A4 paper from three sides; the page fits a 3D
   foot to the photos and shows both feet in 3D with their measurements.  Everything runs in the
   browser (fit.js, viewer.js); photos are never uploaded.
   Output: a small JSON for make_insole.py --app (schema "app": "footcapture"). */

const SHOTS = ["front", "medial", "lateral"];

const TXT = {
  ko: {
    sub: "다른 사람이 사진 3장을 찍어 주면 양발의 3D 모델과 치수를 만듭니다.",
    privacy: "사진은 이 휴대폰 안에서만 처리되며 서버로 전송되지 않습니다. 마지막에 숫자 결과 파일만 직접 보내시면 됩니다.",
    code: "참여자 코드", codeHint: "연구자가 알려준 코드 (이름 X)", agree: "위 내용을 확인했습니다", start: "시작",
    L: "왼발", R: "오른발", prepTitle: "준비",
    prep: ["A4 흰 종이를 바닥에 놓습니다. 바닥 색이 종이와 뚜렷이 달라야 합니다.",
      "맨발로, 바지는 종아리까지 걷습니다. 한 발을 종이 가운데에 종이의 긴 변 방향으로 올리고, 다른 발은 반 걸음 뒤 종이 밖에 둡니다.",
      "똑바로 서서 체중을 양발에 고르게 싣습니다.",
      "도와주는 사람이 휴대폰으로 안내에 따라 3곳에서 한 장씩 찍습니다: 비스듬히 위(약 45°), 거리 약 70 cm, 종이 네 모서리가 모두 보이게."],
    begin: "촬영 시작", shot_front: "발끝 앞쪽", shot_medial: "안쪽 (엄지발가락 쪽)", shot_lateral: "바깥쪽 (새끼발가락 쪽)",
    shotHint: "비스듬히 위에서 약 45°, 거리 약 70 cm. 초록색 선이 종이 전체를 감싸면 찍으세요.",
    paperOk: "종이를 찾았습니다", paperNo: "종이 전체가 보이지 않습니다 (네 모서리 모두)", shoot: "촬영", pick: "사진 선택", camFail: "카메라를 열 수 없습니다. 사진 선택을 사용하세요.",
    fixTitle: "종이의 네 모서리를 표시해 주세요", fixHint: "자동 인식에 실패했습니다. 네 점을 종이 모서리로 끌어 주세요. 가려진 모서리는 짐작되는 위치에 두세요.", use: "이대로 사용", retake: "다시 찍기",
    working: "3D 모델을 만드는 중…", checkTitle: "확인", checkHint: "분홍색 선은 3D 모델의 윤곽입니다. 발 가장자리에 붙어 있어야 합니다.",
    fitGood: "잘 맞습니다", fitPoor: "잘 맞지 않습니다. 이 발을 다시 찍는 것을 권합니다.", nextFoot: "다음 발", toResult: "결과 보기", retakeFoot: "이 발 다시 찍기",
    errPaper: "종이를 인식하지 못한 사진이 있습니다.", errFoot: "발을 인식하지 못했습니다. 맨발로, 밝은 곳에서 다시 찍어 주세요.",
    len: "발 길이", ballW: "앞발 너비", heelW: "뒤꿈치 너비", instep: "발등 높이", arch: "아치 높이", ballG: "앞발 둘레", instepG: "발등 둘레",
    v_three: "입체", v_top: "위", v_side: "옆", v_front: "앞", v_sole: "발바닥", dragHint: "끌어서 돌리고, 두 손가락으로 확대합니다.",
    modelNote: "3D 모델은 스캐너로 측정한 발 {n}개의 통계 모델을 사진에 맞춘 것입니다. 발가락 같은 세부는 매끄럽게 표현됩니다.",
    sumTitle: "결과", download: "결과 파일 저장", share: "결과 파일 보내기", stl: "3D 모델 저장 (STL)",
    sumHint: "저장된 파일(JSON)을 연구자에게 보내 주세요.", restart: "처음부터", notMedical: "참고용이며 의학적 진단이 아닙니다.", loading: "불러오는 중…",
  },
  zh: {
    sub: "请另一个人帮忙拍 3 张照片，生成双脚的 3D 模型和尺寸。",
    privacy: "照片只在这部手机里处理，不会上传到任何服务器。最后只需要把数字结果文件发给研究者。",
    code: "参与者编号", codeHint: "研究者给你的编号（不要填姓名）", agree: "我已了解以上说明", start: "开始",
    L: "左脚", R: "右脚", prepTitle: "准备",
    prep: ["把 A4 白纸平放在地上，地面颜色要和白纸有明显区别。",
      "赤脚，裤腿卷到小腿。一只脚踩在纸中间、脚沿着纸的长边；另一只脚退后半步，踩在纸外。",
      "自然站直，体重平均分在两只脚上。",
      "帮手拿手机，按提示从 3 个位置各拍 1 张：斜上方约 45°，距离约 70 cm，纸的四个角都要拍进去。"],
    begin: "开始拍摄", shot_front: "脚尖正前方", shot_medial: "内侧（大脚趾一侧）", shot_lateral: "外侧（小脚趾一侧）",
    shotHint: "斜上方约 45°，距离约 70 cm。绿线框住整张纸再拍。",
    paperOk: "已识别到纸", paperNo: "没有看到完整的纸（四个角都要入镜）", shoot: "拍照", pick: "选择照片", camFail: "无法打开相机，请用“选择照片”。",
    fixTitle: "请标出纸的四个角", fixHint: "自动识别失败。把四个点拖到纸的四个角上；被挡住的角放在估计的位置。", use: "按这个使用", retake: "重拍",
    working: "正在生成 3D 模型…", checkTitle: "检查", checkHint: "粉色线是 3D 模型的轮廓，应当贴着脚的边缘。",
    fitGood: "匹配良好", fitPoor: "匹配不理想，建议重拍这只脚。", nextFoot: "下一只脚", toResult: "查看结果", retakeFoot: "重拍这只脚",
    errPaper: "有照片没有识别到纸。", errFoot: "没有识别到脚。请赤脚，并在光线充足的地方重拍。",
    len: "足长", ballW: "前掌宽", heelW: "后跟宽", instep: "脚背高", arch: "足弓高", ballG: "前掌围", instepG: "脚背围",
    v_three: "立体", v_top: "俯视", v_side: "侧面", v_front: "正面", v_sole: "足底", dragHint: "拖动旋转，双指缩放。",
    modelNote: "3D 模型是把 {n} 只扫描足模统计出的足型拟合到照片上得到的，脚趾等细节是平滑的。",
    sumTitle: "结果", download: "保存结果文件", share: "发送结果文件", stl: "保存 3D 模型 (STL)",
    sumHint: "请把保存的文件（JSON）发给研究者。", restart: "重新开始", notMedical: "仅供参考，不是医学诊断。", loading: "正在加载…",
  },
  en: {
    sub: "A helper takes 3 photos of each foot; the page builds a 3D model of both feet with measurements.",
    privacy: "Photos are processed on this phone only and are never uploaded. At the end you send just the small result file.",
    code: "Participant code", codeHint: "The code the researcher gave you (not your name)", agree: "I have read the above", start: "Start",
    L: "Left foot", R: "Right foot", prepTitle: "Set up",
    prep: ["Lay a white A4 sheet flat on the floor. The floor must clearly differ in colour from the paper.",
      "Barefoot, trousers rolled up to the calf. One foot on the middle of the sheet along its long side; the other foot half a step back, off the paper.",
      "Stand upright with your weight evenly on both feet.",
      "The helper takes one photo from each of 3 positions as prompted: from about 45° above, about 70 cm away, with all four corners of the sheet in view."],
    begin: "Start photos", shot_front: "In front of the toes", shot_medial: "Inner side (big toe side)", shot_lateral: "Outer side (little toe side)",
    shotHint: "From about 45° above, about 70 cm away. Shoot when the green line surrounds the whole sheet.",
    paperOk: "Paper found", paperNo: "The whole sheet is not visible (all four corners)", shoot: "Take photo", pick: "Choose photo", camFail: "Cannot open the camera. Use Choose photo.",
    fixTitle: "Mark the four corners of the sheet", fixHint: "Automatic detection failed. Drag the four dots onto the corners; put a hidden corner where you estimate it is.", use: "Use this", retake: "Retake",
    working: "Building the 3D model…", checkTitle: "Check", checkHint: "The pink line is the outline of the 3D model. It should follow the edge of the foot.",
    fitGood: "Good match", fitPoor: "Poor match. Retaking this foot is recommended.", nextFoot: "Next foot", toResult: "See result", retakeFoot: "Retake this foot",
    errPaper: "The paper was not found in some photos.", errFoot: "The foot was not found. Barefoot, in good light, please retake.",
    len: "Foot length", ballW: "Forefoot width", heelW: "Heel width", instep: "Instep height", arch: "Arch height", ballG: "Ball girth", instepG: "Instep girth",
    v_three: "3D", v_top: "Top", v_side: "Side", v_front: "Front", v_sole: "Sole", dragHint: "Drag to turn, pinch to zoom.",
    modelNote: "The 3D model is a statistical foot shape from {n} scanned feet, fitted to the photos. Details such as toes are smoothed.",
    sumTitle: "Result", download: "Save result file", share: "Send result file", stl: "Save 3D model (STL)",
    sumHint: "Please send the saved file (JSON) to the researcher.", restart: "Start over", notMedical: "For reference only, not a medical diagnosis.", loading: "Loading…",
  },
};
const MEASURES = [["len", "foot_length_mm"], ["ballW", "forefoot_width_mm"], ["heelW", "heel_width_mm"], ["instep", "instep_height_mm"], ["arch", "arch_height_mm"], ["ballG", "ball_girth_mm"], ["instepG", "instep_girth_mm"]];

const S = { lang: (navigator.language || "ko").slice(0, 2), subject: "", feet: {}, order: ["L", "R"], i: 0, shot: 0, shots: [] };
if (!TXT[S.lang]) S.lang = "ko";
let MODEL = null;
const t = (k) => TXT[S.lang][k];
const $ = (id) => document.getElementById(id);
const app = () => $("app");
const foot = () => S.order[S.i];

/* ---------------------------------------------------------------- images */

function toCanvas(src, maxSide = 1920) {
  const w = src.videoWidth || src.naturalWidth || src.width, h = src.videoHeight || src.naturalHeight || src.height;
  const k = Math.min(1, maxSide / Math.max(w, h)), c = document.createElement("canvas");
  c.width = Math.round(w * k); c.height = Math.round(h * k);
  c.getContext("2d", { willReadFrequently: true }).drawImage(src, 0, 0, c.width, c.height);
  return c;
}
const pixels = (cv) => { const d = cv.getContext("2d", { willReadFrequently: true }).getImageData(0, 0, cv.width, cv.height); return { w: cv.width, h: cv.height, data: d.data }; };
function loadUrl(url) {
  return new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(toCanvas(im)); im.onerror = bad; im.src = url; });
}

/* Top view of the sheet with the foot and the three camera positions; the active one is highlighted. */
function diagram(side, active) {
  const m = side === "R" ? -1 : 1, cams = { front: [60, 14], medial: [60 + m * 46, 78], lateral: [60 - m * 46, 78] };
  let s = `<svg viewBox="0 0 120 150" width="120" height="150" aria-hidden="true"><rect x="32" y="34" width="56" height="80" rx="2" fill="#fff" stroke="#98a2b3"/>
    <path d="M60 46 c${-m * 9} 0 ${-m * 12} 9 ${-m * 11} 22 c1 12 ${m * 3} 20 ${m * 3} 28 c0 7 ${m * 4} 10 ${m * 8} 10 c${m * 5} 0 ${m * 8} -4 ${m * 8} -11 c0 -9 ${m * 2} -17 ${m * 3} -27 c${m * 1} -13 ${-m * 3} -22 ${-m * 11} -22 z" fill="#f0c9ae" stroke="#b9805f"/>`;
  for (const k of SHOTS) {
    const [x, y] = cams[k], on = k === active;
    s += `<line x1="${x}" y1="${y}" x2="${60 + (x - 60) * 0.35}" y2="${74 + (y - 74) * 0.35}" stroke="${on ? "#0f766e" : "#c5ccd6"}" stroke-width="${on ? 2 : 1}" stroke-dasharray="3 3"/>
      <rect x="${x - 7}" y="${y - 10}" width="14" height="20" rx="3" fill="${on ? "#0f766e" : "#fff"}" stroke="${on ? "#0f766e" : "#98a2b3"}"/>
      <text x="${x}" y="${y + 4}" text-anchor="middle" font-size="10" fill="${on ? "#fff" : "#667085"}">${SHOTS.indexOf(k) + 1}</text>`;
  }
  return s + "</svg>";
}

/* ---------------------------------------------------------------- screens */

function langBar() {
  return `<div class="lang">${["ko", "zh", "en"].map((l) => `<button data-lang="${l}">${{ ko: "한국어", zh: "中文", en: "EN" }[l]}</button>`).join("")}</div>`;
}
function bindLang(again) { document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { S.lang = b.dataset.lang; again(); })); }

function home() {
  stopCamera();
  app().innerHTML = `${langBar()}<h1>FootCapture</h1><p>${t("sub")}</p>
    <div class="card"><p>${t("privacy")}</p>
      <label>${t("code")}<input type="text" id="code" placeholder="${t("codeHint")}" value="${S.subject}"></label>
      <p><label><input type="checkbox" id="agree"> ${t("agree")}</label></p>
      <button class="go" id="go" disabled>${MODEL ? t("start") : t("loading")}</button></div>
    <p class="small">${t("notMedical")}</p>`;
  bindLang(home);
  const upd = () => { $("go").disabled = !(MODEL && $("agree").checked && $("code").value.trim()); };
  $("agree").onchange = upd; $("code").oninput = upd;
  $("go").onclick = () => { S.subject = $("code").value.trim(); S.i = 0; S.feet = {}; prep(); };
}

function prep() {
  S.shot = 0; S.shots = [];
  app().innerHTML = `<h2>${t(foot())} · ${t("prepTitle")}</h2>
    <div class="card"><div class="side">${diagram(foot(), null)}<ol>${t("prep").map((s) => `<li>${s}</li>`).join("")}</ol></div></div>
    <button class="go" id="go">${t("begin")}</button>`;
  $("go").onclick = async () => {
    try { stream = stream || await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); } catch (e) { stream = null; }
    capture();
  };
}

let stream = null, liveTimer = 0;
function stopCamera() { clearInterval(liveTimer); liveTimer = 0; if (stream) stream.getTracks().forEach((x) => x.stop()); stream = null; }

function capture() {
  clearInterval(liveTimer);
  const name = SHOTS[S.shot];
  app().innerHTML = `<h2>${t(foot())} · ${S.shot + 1}/${SHOTS.length} ${t("shot_" + name)}</h2>
    <div class="side">${diagram(foot(), name)}<p>${t("shotHint")}</p></div>
    ${stream ? `<div class="stage"><video id="v" playsinline autoplay muted></video><canvas class="ov" id="ov"></canvas></div><p class="tilt" id="st">–</p><button class="go" id="shoot">${t("shoot")}</button>` : `<p class="warn">${t("camFail")}</p>`}
    <label class="btn">${t("pick")}<input type="file" accept="image/*" id="file" hidden></label>`;
  const got = (cv) => { clearInterval(liveTimer); const img = pixels(cv), quad = FIT.detectQuad(img); quad ? accept(cv, img, quad) : fixCorners(cv, img); };
  $("file").onchange = (e) => { const f = e.target.files[0]; if (f) loadUrl(URL.createObjectURL(f)).then(got); };
  if (!stream) return;
  const v = $("v"), ov = $("ov"), small = document.createElement("canvas"); v.srcObject = stream;
  liveTimer = setInterval(() => {                           // live: is the whole sheet in view?
    if (!v.videoWidth || !$("ov")) return;
    const k = 400 / Math.max(v.videoWidth, v.videoHeight); small.width = Math.round(v.videoWidth * k); small.height = Math.round(v.videoHeight * k);
    small.getContext("2d", { willReadFrequently: true }).drawImage(v, 0, 0, small.width, small.height);
    const q = FIT.detectQuad(pixels(small), true), g = ov.getContext("2d");
    if (ov.width !== small.width) { ov.width = small.width; ov.height = small.height; }
    g.clearRect(0, 0, ov.width, ov.height);
    if (q) { g.strokeStyle = "#22c55e"; g.lineWidth = 3; g.beginPath(); q.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke(); }
    $("st").textContent = q ? t("paperOk") : t("paperNo"); $("st").className = "tilt " + (q ? "ok" : "bad");
  }, 350);
  $("shoot").onclick = () => got(toCanvas(v));
}

function fixCorners(cv, img) {
  let pts = FIT.detectQuad(img, true) || [[0.2, 0.45], [0.8, 0.45], [0.85, 0.7], [0.15, 0.7]].map((p) => [p[0] * cv.width, p[1] * cv.height]);
  app().innerHTML = `<h2>${t("fixTitle")}</h2><p>${t("fixHint")}</p><canvas id="c"></canvas>
    <button class="go" id="use">${t("use")}</button><button id="re">${t("retake")}</button>`;
  const c = $("c"); c.width = cv.width; c.height = cv.height; const g = c.getContext("2d");
  const draw = () => {
    g.drawImage(cv, 0, 0); const o = FIT.orderQuad(pts); g.strokeStyle = "#22c55e"; g.lineWidth = cv.width / 200; g.beginPath();
    o.forEach((p, i) => (i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1]))); g.closePath(); g.stroke();
    pts.forEach((p) => { g.fillStyle = "rgba(34,197,94,.75)"; g.beginPath(); g.arc(p[0], p[1], cv.width / 40, 0, 7); g.fill(); });
  };
  draw();
  let drag = -1;
  const pos = (e) => { const r = c.getBoundingClientRect(); return [(e.clientX - r.left) * c.width / r.width, (e.clientY - r.top) * c.height / r.height]; };
  c.onpointerdown = (e) => { const p = pos(e); let best = 1e9; pts.forEach((q, i) => { const dd = Math.hypot(q[0] - p[0], q[1] - p[1]); if (dd < best) { best = dd; drag = i; } }); c.setPointerCapture(e.pointerId); };
  c.onpointermove = (e) => { if (drag >= 0) { pts[drag] = pos(e); draw(); } };
  c.onpointerup = () => { drag = -1; };
  $("re").onclick = capture;
  $("use").onclick = () => accept(cv, img, FIT.orderQuad(pts));
}

function accept(cv, img, quad) {
  S.shots[S.shot] = { name: SHOTS[S.shot], cv, img, quad };
  S.shot++;
  S.shot < SHOTS.length ? capture() : build();
}

function build() {
  clearInterval(liveTimer);
  app().innerHTML = `<h2>${t(foot())}</h2><div class="card"><p>${t("working")}</p></div>`;
  setTimeout(() => {
    let r; try { r = FIT.reconstruct(S.shots, foot(), MODEL); } catch (e) { r = { error: "foot", detail: String(e) }; }
    check(r);
  }, 60);
}

function drawCheck(cv, shot, v, W) {                        // photo around the sheet with the 3D foot's outline
  const z = 2; cv.width = v.w * z; cv.height = v.h * z;
  const g = cv.getContext("2d"); g.drawImage(shot.cv, v.x0, v.y0, v.w * v.k, v.h * v.k, 0, 0, cv.width, cv.height);
  const m = FIT.renderMask(v, W, MODEL.tris, new Uint8Array(v.w * v.h)); g.fillStyle = "#ff2d9a";
  for (let y = 1; y < v.h - 1; y++) for (let x = 1; x < v.w - 1; x++) { const p = y * v.w + x; if (m[p] && !(m[p - 1] && m[p + 1] && m[p - v.w] && m[p + v.w])) g.fillRect(x * z, y * z, z, z); }
}

function check(r) {
  const again = () => { S.shot = 0; S.shots = []; capture(); };
  if (r.error) {
    app().innerHTML = `<h2>${t(foot())}</h2><div class="card"><p class="bad">${t(r.error === "paper" ? "errPaper" : "errFoot")}</p>
      <p class="small">${(r.bad || []).map((n) => t("shot_" + n)).join(" · ")}</p></div><button class="go" id="re">${t("retakeFoot")}</button>`;
    $("re").onclick = again; return;
  }
  const iou = r.iou.reduce((a, b) => a + b, 0) / r.iou.length, good = iou > 0.88 && r.views.length === SHOTS.length, last = S.i === S.order.length - 1;
  app().innerHTML = `<h2>${t(foot())} · ${t("checkTitle")}</h2><p>${t("checkHint")}</p>
    <div class="thumbs">${r.views.map((v, i) => `<canvas id="k${i}"></canvas>`).join("")}</div>
    <div class="card"><p class="${good ? "ok" : "warn"}"><b>${t(good ? "fitGood" : "fitPoor")}</b> (${(iou * 100).toFixed(0)}%)</p>
      <table>${MEASURES.slice(0, 3).map(([k, f]) => `<tr><td>${t(k)}</td><th>${r.measures[f].toFixed(1)} mm</th></tr>`).join("")}</table></div>
    <button class="${good ? "go" : ""}" id="ok">${t(last ? "toResult" : "nextFoot")}</button><button class="${good ? "" : "go"}" id="re">${t("retakeFoot")}</button>`;
  const W = FIT.toWorld(FIT.footVerts(MODEL, r.foot_length, r.coef), r.foot_length, foot(), r.place);
  r.views.forEach((v, i) => drawCheck($("k" + i), S.shots.find((s) => s.name === v.name), v, W));
  $("re").onclick = again;
  $("ok").onclick = () => {
    S.feet[foot()] = Object.assign({}, r.measures, { shape: { coef: r.coef.map((c) => +c.toFixed(3)) },
      quality: { outline_match: +iou.toFixed(3), photos: r.views.map((v) => v.name), camera_mm: r.views.map((v) => v.camera_mm), focal_px: Math.round(r.focal_px),
        turn_deg: +(r.place.yaw * 180 / Math.PI).toFixed(1) } });
    S.shots = []; S.i++;
    S.i < S.order.length ? prep() : summary();
  };
}

/* ---------------------------------------------------------------- result: both feet in 3D */

function viewerFeet() {                                     // both feet side by side: X to the toes, Y to the left, Z up
  const out = [];
  for (const side of ["L", "R"]) {
    const f = S.feet[side]; if (!f) continue;
    const V = FIT.footVerts(MODEL, f.foot_length_mm, f.shape.coef), m = side === "L" ? -1 : 1, off = side === "L" ? 62 : -62;
    for (let i = 0; i < V.length; i += 3) { V[i] -= f.foot_length_mm / 2; V[i + 1] = m * V[i + 1] + off; }
    const tris = side === "L" ? MODEL.tris : MODEL.tris.map((_, i, a) => a[i - (i % 3) + [0, 2, 1][i % 3]]);
    out.push({ side, V, tris });
  }
  return out;
}

function stlBlob(feet) {
  let n = 0; for (const f of feet) n += f.tris.length / 3;
  const buf = new ArrayBuffer(84 + 50 * n), dv = new DataView(buf); dv.setUint32(80, n, true); let o = 84;
  for (const f of feet) for (let i = 0; i < f.tris.length; i += 3) {
    const a = f.tris[i] * 3, b = f.tris[i + 1] * 3, c = f.tris[i + 2] * 3, V = f.V;
    const ux = V[b] - V[a], uy = V[b + 1] - V[a + 1], uz = V[b + 2] - V[a + 2], vx = V[c] - V[a], vy = V[c + 1] - V[a + 1], vz = V[c + 2] - V[a + 2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx; const m = Math.hypot(nx, ny, nz) || 1;
    for (const v of [nx / m, ny / m, nz / m, V[a], V[a + 1], V[a + 2], V[b], V[b + 1], V[b + 2], V[c], V[c + 1], V[c + 2]]) { dv.setFloat32(o, v, true); o += 4; }
    o += 2;
  }
  return new Blob([buf], { type: "model/stl" });
}

function exportData() {
  return { app: "footcapture", version: "0.2", subject: S.subject, created: new Date().toISOString(),
    shape_model: { n_feet: MODEL.nFeet, modes: MODEL.K, nx: MODEL.nx, nt: MODEL.nt, cut: MODEL.cut }, left: S.feet.L, right: S.feet.R };
}

function summary() {
  stopCamera();
  const d = exportData(), cell = (s, f) => `<th>${d[s] ? d[s][f].toFixed(1) : "–"}</th>`;
  app().innerHTML = `<h2>${t("sumTitle")} · ${S.subject}</h2>
    <canvas id="gl" class="gl"></canvas>
    <div class="views">${["three", "top", "side", "front", "sole"].map((v) => `<button data-v="${v}">${t("v_" + v)}</button>`).join("")}</div>
    <p class="small">${t("dragHint")}</p>
    <div class="card"><table><tr><td>mm</td><th>${t("L")}</th><th>${t("R")}</th></tr>${MEASURES.map(([k, f]) => `<tr><td>${t(k)}</td>${cell("left", f)}${cell("right", f)}</tr>`).join("")}</table></div>
    <p class="small">${t("modelNote").replace("{n}", MODEL.nFeet)}</p>
    <p>${t("sumHint")}</p><button class="go" id="share">${t("share")}</button><button id="dl">${t("download")}</button><button id="stl">${t("stl")}</button><button id="again">${t("restart")}</button>
    <p class="small">${t("notMedical")}</p>`;
  const feet = viewerFeet(), view = VIEW3D.create($("gl"));
  if (view) { view.setFeet(feet); document.querySelectorAll("[data-v]").forEach((b) => (b.onclick = () => view.setView(b.dataset.v))); S.view = view; }
  const save = (blob, name) => { const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; a.click(); };
  const name = `${S.subject || "foot"}_app.json`, blob = new Blob([JSON.stringify(d, null, 1)], { type: "application/json" });
  $("dl").onclick = () => save(blob, name);
  $("stl").onclick = () => save(stlBlob(feet), `${S.subject || "foot"}_feet.stl`);
  const file = new File([blob], name, { type: "application/json" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) $("share").onclick = () => navigator.share({ files: [file], title: name }).catch(() => {});
  else $("share").style.display = "none";
  $("again").onclick = home;
}

/* For tests: run one foot from photo URLs without the camera. */
async function runUrls(side, urls) {
  const shots = [];
  for (let i = 0; i < urls.length; i++) { const cv = await loadUrl(urls[i]), img = pixels(cv); shots.push({ name: SHOTS[i], cv, img, quad: FIT.detectQuad(img) }); }
  S.i = S.order.indexOf(side); S.shots = shots; S.shot = shots.length;
  const r = FIT.reconstruct(shots, side, MODEL); check(r); return r;
}

window.FC = { S, loadUrl, pixels, exportData, home, prep, capture, summary, check, runUrls, viewerFeet, model: () => MODEL };
home();
fetch("footmodel.json?v=3d1").then((r) => r.json()).then((j) => { MODEL = FIT.loadModel(j); if ($("go") && $("code")) home(); });
