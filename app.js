"use strict";
/* FootCapture, paper-free flow: basic details and shoe size -> six guided photos (top, outer side,
   inner side of each foot, lined up with a dashed outline) -> a 3D model of both feet with
   measurements and left/right differences.  Everything runs in the browser (fit.js, viewer.js);
   photos are never uploaded.  Output: a small JSON for make_insole.py --app ("app": "footcapture"). */

const STEPS = ["top", "side", "inner"];

const TXT = {
  ko: {
    sub: "발 사진 6장으로 양발의 3D 모델과 치수를 만듭니다.",
    privacy: "사진은 이 휴대폰 안에서만 처리되며 서버로 전송되지 않습니다. 마지막에 숫자 결과 파일만 직접 보내시면 됩니다.",
    agree: "위 내용을 확인했습니다", start: "시작", loading: "불러오는 중…",
    infoTitle: "기본 정보", infoSub: "발 크기를 정하는 데 사용합니다.", code: "참여자 코드", codeHint: "연구자가 알려준 코드 (이름 X)",
    age: "나이", height: "키 (cm)", weight: "몸무게 (kg)", shoe: "신발 사이즈 (mm)", shoeHint: "예: 265", cont: "계속",
    L: "왼발", R: "오른발", stepOf: "단계", photos: "사진",
    t_top: "위에서 촬영", t_side: "바깥쪽에서 촬영", t_inner: "안쪽에서 촬영",
    d_top: "휴대폰을 바닥과 평행하게 들고 발 바로 위에서 찍습니다. 발끝을 점선 위쪽 끝에 맞추고 발이 점선 안에 들어오게 하세요.",
    d_side: "휴대폰을 바닥 가까이에 세워 발 바깥쪽(새끼발가락 쪽)을 정면으로 찍습니다. 뒤꿈치부터 발끝까지 점선 안에 들어오게 하세요.",
    d_inner: "휴대폰을 바닥 가까이에 세워 발 안쪽(엄지발가락·아치 쪽)을 정면으로 찍습니다. 뒤꿈치부터 발끝까지 점선 안에 들어오게 하세요.",
    prep: "맨발로, 바지는 종아리까지 걷고, 발을 바닥에 평평하게 둡니다. 바닥 색이 피부색과 다르면 더 정확합니다.",
    begin: "촬영 시작", shoot: "촬영", pick: "사진 선택", camFail: "카메라를 열 수 없습니다. 사진 선택을 사용하세요.",
    tilt: "기울기", flat: "수평", upright: "수직", fitGuide: "발을 점선에 맞추세요",
    working: "3D 모델을 만드는 중…", checkTitle: "확인", checkHint: "분홍색 선은 3D 모델의 윤곽입니다. 발 가장자리에 붙어 있어야 합니다.",
    fitGood: "잘 맞습니다", fitPoor: "잘 맞지 않습니다. 다시 찍는 것을 권합니다.", toResult: "결과 보기", retakeFoot: "다시 찍기", savePhotos: "사진 저장",
    errFoot: "발을 찾지 못했습니다. 발을 점선에 맞추고 밝은 곳에서 다시 찍어 주세요.", stageBad: "실패", detail: "자세히",
    len: "발 길이", ballW: "앞발 너비", toeW: "발가락 너비", heelW: "뒤꿈치 너비", instep: "발등 높이", arch: "아치 높이", archPct: "아치 높이 (길이 대비)", ballG: "앞발 둘레", instepG: "발등 둘레", diff: "좌우 차이",
    v_three: "입체", v_top: "위", v_side: "옆", v_front: "앞", v_sole: "발바닥", dragHint: "끌어서 돌리고, 두 손가락으로 확대합니다.",
    lenNote: "발 길이는 입력한 신발 사이즈를 그대로 사용했습니다. 너비·높이·둘레는 사진에서 추정한 값입니다.",
    modelNote: "3D 모델은 스캐너로 측정한 발 {n}개의 통계 모델을 사진에 맞춘 것입니다. 발가락 같은 세부는 매끄럽게 표현됩니다.",
    sumTitle: "결과", download: "결과 파일 저장", share: "결과 파일 보내기", stl: "3D 모델 저장 (STL)",
    sumHint: "저장된 파일(JSON)을 연구자에게 보내 주세요.", restart: "처음부터", notMedical: "참고용이며 의학적 진단이 아닙니다.",
  },
  zh: {
    sub: "用 6 张脚的照片生成双脚的 3D 模型和尺寸。",
    privacy: "照片只在这部手机里处理，不会上传到任何服务器。最后只需要把数字结果文件发给研究者。",
    agree: "我已了解以上说明", start: "开始", loading: "正在加载…",
    infoTitle: "基本信息", infoSub: "用来确定脚的大小。", code: "参与者编号", codeHint: "研究者给你的编号（不要填姓名）",
    age: "年龄", height: "身高 (cm)", weight: "体重 (kg)", shoe: "鞋码 (mm)", shoeHint: "例如 265", cont: "继续",
    L: "左脚", R: "右脚", stepOf: "步", photos: "张照片",
    t_top: "从正上方拍", t_side: "从外侧拍", t_inner: "从内侧拍",
    d_top: "手机与地面平行，举在脚的正上方拍。脚尖对齐虚线上端，让脚落在虚线里。",
    d_side: "手机竖直立在靠近地面的位置，正对脚的外侧（小脚趾一侧）拍。脚跟到脚尖都要落在虚线里。",
    d_inner: "手机竖直立在靠近地面的位置，正对脚的内侧（大脚趾、足弓一侧）拍。脚跟到脚尖都要落在虚线里。",
    prep: "赤脚，裤腿卷到小腿，脚平放在地上。地面颜色和肤色差别越大越准。",
    begin: "开始拍摄", shoot: "拍照", pick: "选择照片", camFail: "无法打开相机，请用“选择照片”。",
    tilt: "倾斜", flat: "水平", upright: "竖直", fitGuide: "把脚对准虚线",
    working: "正在生成 3D 模型…", checkTitle: "检查", checkHint: "粉色线是 3D 模型的轮廓，应当贴着脚的边缘。",
    fitGood: "匹配良好", fitPoor: "匹配不理想，建议重拍。", toResult: "查看结果", retakeFoot: "重拍", savePhotos: "保存照片",
    errFoot: "没有找到脚。请把脚对准虚线，在光线充足的地方重拍。", stageBad: "未通过", detail: "详细信息",
    len: "足长", ballW: "前掌宽", toeW: "脚趾宽", heelW: "后跟宽", instep: "脚背高", arch: "足弓高", archPct: "足弓高（占足长）", ballG: "前掌围", instepG: "脚背围", diff: "左右差",
    v_three: "立体", v_top: "俯视", v_side: "侧面", v_front: "正面", v_sole: "足底", dragHint: "拖动旋转，双指缩放。",
    lenNote: "足长直接取你填写的鞋码；宽度、高度和围度是从照片估计的。",
    modelNote: "3D 模型是把 {n} 只扫描足模统计出的足型拟合到照片上得到的，脚趾等细节是平滑的。",
    sumTitle: "结果", download: "保存结果文件", share: "发送结果文件", stl: "保存 3D 模型 (STL)",
    sumHint: "请把保存的文件（JSON）发给研究者。", restart: "重新开始", notMedical: "仅供参考，不是医学诊断。",
  },
  en: {
    sub: "Six photos of your feet give a 3D model of both feet with measurements.",
    privacy: "Photos are processed on this phone only and are never uploaded. At the end you send just the small result file.",
    agree: "I have read the above", start: "Start", loading: "Loading…",
    infoTitle: "Your details", infoSub: "Used to set the size of the foot.", code: "Participant code", codeHint: "The code the researcher gave you (not your name)",
    age: "Age", height: "Height (cm)", weight: "Weight (kg)", shoe: "Shoe size (mm)", shoeHint: "e.g. 265", cont: "Continue",
    L: "Left foot", R: "Right foot", stepOf: "step", photos: "photos",
    t_top: "Photo from above", t_side: "Photo from the outer side", t_inner: "Photo from the inner side",
    d_top: "Hold the phone level, straight above the foot. Put the toe tips at the top of the dashed outline and keep the foot inside it.",
    d_side: "Stand the phone upright close to the floor, facing the outer side of the foot (little toe side). Heel to toes must lie inside the dashed outline.",
    d_inner: "Stand the phone upright close to the floor, facing the inner side of the foot (big toe and arch side). Heel to toes must lie inside the dashed outline.",
    prep: "Barefoot, trousers rolled up to the calf, foot flat on the floor. A floor that differs in colour from skin gives better results.",
    begin: "Start photos", shoot: "Take photo", pick: "Choose photo", camFail: "Cannot open the camera. Use Choose photo.",
    tilt: "Tilt", flat: "level", upright: "upright", fitGuide: "Line the foot up with the dashed outline",
    working: "Building the 3D model…", checkTitle: "Check", checkHint: "The pink line is the outline of the 3D model. It should follow the edge of the foot.",
    fitGood: "Good match", fitPoor: "Poor match. Retaking is recommended.", toResult: "See result", retakeFoot: "Retake", savePhotos: "Save photos",
    errFoot: "The foot was not found. Line the foot up with the dashed outline, in good light, and retake.", stageBad: "failed", detail: "Details",
    len: "Foot length", ballW: "Forefoot width", toeW: "Toe width", heelW: "Heel width", instep: "Instep height", arch: "Arch height", archPct: "Arch height (of length)", ballG: "Ball girth", instepG: "Instep girth", diff: "L/R difference",
    v_three: "3D", v_top: "Top", v_side: "Side", v_front: "Front", v_sole: "Sole", dragHint: "Drag to turn, pinch to zoom.",
    lenNote: "Foot length is the shoe size you entered; widths, heights and girths are estimated from the photos.",
    modelNote: "The 3D model is a statistical foot shape from {n} scanned feet, fitted to the photos. Details such as toes are smoothed.",
    sumTitle: "Result", download: "Save result file", share: "Send result file", stl: "Save 3D model (STL)",
    sumHint: "Please send the saved file (JSON) to the researcher.", restart: "Start over", notMedical: "For reference only, not a medical diagnosis.",
  },
};
const MEASURES = [["len", "foot_length_mm", "mm"], ["ballW", "forefoot_width_mm", "mm"], ["toeW", "toe_width_mm", "mm"], ["heelW", "heel_width_mm", "mm"], ["instep", "instep_height_mm", "mm"],
  ["arch", "arch_height_mm", "mm"], ["archPct", "arch_ratio_pct", "%"], ["ballG", "ball_girth_mm", "mm"], ["instepG", "instep_girth_mm", "mm"]];

const S = { lang: (navigator.language || "ko").slice(0, 2), subject: "", info: {}, feet: {}, fits: {}, shots: { L: {}, R: {} }, queue: [], q: 0 };
if (!TXT[S.lang]) S.lang = "ko";
let MODEL = null;
const t = (k) => TXT[S.lang][k];
const $ = (id) => document.getElementById(id);
const app = () => $("app");
const FL = () => +S.info.shoe_size_mm;

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
function drawGuide(g, name, side, w, h) {                   // dashed outline of an average foot of this size
  const pts = FIT.guideOutline(MODEL, name, side, FL(), w, h), r = Math.max(1.5, w / 260);
  g.fillStyle = "rgba(255,255,255,.95)"; pts.forEach((p, i) => { if (i % 3 !== 2) { g.beginPath(); g.arc(p[0], p[1], r, 0, 7); g.fill(); } });
}

/* ---------------------------------------------------------------- screens */

function langBar() {
  return `<div class="lang">${["ko", "zh", "en"].map((l) => `<button data-lang="${l}">${{ ko: "한국어", zh: "中文", en: "EN" }[l]}</button>`).join("")}</div>`;
}
function bindLang(again) { document.querySelectorAll("[data-lang]").forEach((b) => (b.onclick = () => { S.lang = b.dataset.lang; again(); })); }
function steps(i) { return `<div class="steps">${[1, 2, 3, 4].map((n) => `<span class="${n - 1 < i ? "done" : n - 1 === i ? "on" : ""}">${n}</span>`).join("<i></i>")}</div>`; }

function home() {
  stopCamera();
  app().innerHTML = `${langBar()}<h1>FootCapture</h1><p>${t("sub")}</p>
    <div class="card"><p>${t("privacy")}</p><p><label><input type="checkbox" id="agree"> ${t("agree")}</label></p>
      <button class="go" id="go" disabled>${MODEL ? t("start") : t("loading")}</button></div>
    <p class="small">${t("notMedical")}</p>`;
  bindLang(home);
  $("agree").onchange = () => { $("go").disabled = !(MODEL && $("agree").checked); };
  $("go").onclick = info;
}

function info() {
  const f = (k, key, hint, type) => `<label>${t(k)}<input type="${type || "number"}" inputmode="${type ? "text" : "decimal"}" id="${key}" placeholder="${hint || ""}" value="${S.info[key] == null ? "" : S.info[key]}"></label>`;
  app().innerHTML = `${steps(0)}<h2>${t("infoTitle")}</h2><p>${t("infoSub")}</p>
    <div class="card">${f("code", "subject", t("codeHint"), "text")}${f("age", "age")}${f("height", "height_cm")}${f("weight", "weight_kg")}${f("shoe", "shoe_size_mm", t("shoeHint"))}</div>
    <button class="go" id="go" disabled>${t("cont")}</button>`;
  const ok = () => { const s = +$("shoe_size_mm").value; $("go").disabled = !($("subject").value.trim() && s >= 150 && s <= 330); };
  document.querySelectorAll("input").forEach((i) => (i.oninput = ok)); ok();
  $("go").onclick = () => {
    for (const k of ["age", "height_cm", "weight_kg", "shoe_size_mm"]) S.info[k] = $(k).value === "" ? null : +$(k).value;
    S.info.subject = S.subject = $("subject").value.trim();
    S.shots = { L: {}, R: {} }; S.feet = {}; S.fits = {};
    S.queue = []; for (const name of STEPS) for (const side of ["L", "R"]) S.queue.push({ name, side });
    S.q = 0; explain();
  };
}

let stream = null, liveTimer = 0, tiltHandler = null, tilt = null;
const openCamera = async () => { try { stream = stream || await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false }); } catch (e) { stream = null; } };
function stopCamera() {
  clearInterval(liveTimer); liveTimer = 0; if (stream) stream.getTracks().forEach((x) => x.stop()); stream = null;
  if (tiltHandler) window.removeEventListener("deviceorientation", tiltHandler); tiltHandler = null;
}

function explain() {                                        // what this step's photo should look like
  const { name } = S.queue[S.q], n = STEPS.indexOf(name);
  app().innerHTML = `${steps(1)}<p class="small">${n + 1} / ${STEPS.length} ${t("stepOf")} · ${S.q} / ${S.queue.length} ${t("photos")}</p>
    <h2>${t("t_" + name)}</h2><canvas id="demo" class="demo"></canvas>
    <div class="card"><p>${t("d_" + name)}</p><p class="small">${t("prep")}</p></div>
    <button class="go" id="go">${t("begin")}</button>`;
  const c = $("demo"); c.width = 270; c.height = 360; const g = c.getContext("2d"); g.fillStyle = "#26323f"; g.fillRect(0, 0, 270, 360); drawGuide(g, name, S.queue[S.q].side, 270, 360);
  $("go").onclick = async () => {
    try { if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) await DeviceOrientationEvent.requestPermission(); } catch (e) { /* the tilt display is optional */ }
    await openCamera(); capture();
  };
}

function capture() {
  clearInterval(liveTimer);
  const { name, side } = S.queue[S.q];
  app().innerHTML = `<h2>${t(side)} · ${t("t_" + name)}</h2><p class="small">${S.q + 1} / ${S.queue.length} · ${t("fitGuide")}</p>
    ${stream ? `<div class="stage"><video id="v" playsinline autoplay muted></video><canvas class="ov" id="ov"></canvas></div><p>${t("tilt")}: <span class="tilt" id="st">–</span></p><button class="go" id="shoot">${t("shoot")}</button>` : `<p class="warn">${t("camFail")}</p>`}
    <label class="btn">${t("pick")}<input type="file" accept="image/*" id="file" hidden></label>`;
  const got = (cv) => { clearInterval(liveTimer); S.shots[side][name] = { name, cv, img: pixels(cv), tilt_deg: tilt == null ? null : +tilt.toFixed(1) }; next(); };
  $("file").onchange = (e) => { const f = e.target.files[0]; if (f) loadUrl(URL.createObjectURL(f)).then(got); };
  if (!stream) return;
  const v = $("v"), ov = $("ov"); v.srcObject = stream; let drawn = "";
  liveTimer = setInterval(() => {                           // the outline follows the camera's frame shape
    if (!v.videoWidth || !$("ov")) return; const key = v.videoWidth + "x" + v.videoHeight; if (key === drawn) return; drawn = key;
    const k = 480 / Math.max(v.videoWidth, v.videoHeight); ov.width = Math.round(v.videoWidth * k); ov.height = Math.round(v.videoHeight * k);
    drawGuide(ov.getContext("2d"), name, side, ov.width, ov.height);
  }, 300);
  if (tiltHandler) window.removeEventListener("deviceorientation", tiltHandler);
  tiltHandler = (e) => {                                    // top: screen facing up; sides: screen upright
    if (e.beta == null || !$("st")) return;
    const fromFlat = Math.acos(Math.min(1, Math.abs(Math.cos(e.beta * Math.PI / 180) * Math.cos(e.gamma * Math.PI / 180)))) * 180 / Math.PI;
    tilt = name === "top" ? fromFlat : Math.abs(90 - fromFlat);
    $("st").textContent = `${tilt.toFixed(0)}° (${t(name === "top" ? "flat" : "upright")})`; $("st").className = "tilt " + (tilt < 8 ? "ok" : tilt < 15 ? "warn" : "bad");
  };
  window.addEventListener("deviceorientation", tiltHandler);
  $("shoot").onclick = () => got(toCanvas(v));
}

function next() {
  const prev = S.queue[S.q]; S.q++;
  if (S.q >= S.queue.length) return build();
  S.queue[S.q].name !== prev.name ? explain() : capture();
}

function build() {
  stopCamera();
  app().innerHTML = `${steps(2)}<h2>${t("working")}</h2><div class="card"><p id="prog">…</p></div>`;
  const sides = ["L", "R"].filter((s) => Object.keys(S.shots[s]).length), run = (i) => {
    if (i >= sides.length) return check();
    $("prog").textContent = t(sides[i]);
    setTimeout(() => {
      const side = sides[i], photos = STEPS.filter((n) => S.shots[side][n]).map((n) => S.shots[side][n]);
      let r; try { r = FIT.reconstructFree(photos, side, MODEL, FL()); } catch (e) { r = { error: "foot", detail: String(e && e.stack || e).slice(0, 300) }; }
      S.fits[side] = r; run(i + 1);
    }, 60);
  };
  run(0);
}

function savePhotos() {                                     // the photos as taken, to send to the researcher when something fails
  const all = []; for (const s of ["L", "R"]) for (const n of STEPS) if (S.shots[s][n]) all.push([s, S.shots[s][n]]);
  Promise.all(all.map(([s, sh]) => new Promise((ok) => sh.cv.toBlob((bl) => ok(new File([bl], `${S.subject || "foot"}_${s}_${sh.name}.jpg`, { type: "image/jpeg" })), "image/jpeg", 0.92)))).then((files) => {
    if (navigator.canShare && navigator.canShare({ files })) return navigator.share({ files }).catch(() => {});
    files.forEach((f, i) => setTimeout(() => { const a = document.createElement("a"); a.href = URL.createObjectURL(f); a.download = f.name; a.click(); }, 400 * i));
  });
}

function drawCheck(cv, shot, v, W) {                        // the photo around the foot with the 3D foot's outline
  const z = 2; cv.width = v.w * z; cv.height = v.h * z;
  const g = cv.getContext("2d"); g.drawImage(shot.cv, v.x0, v.y0, v.w * v.k, v.h * v.k, 0, 0, cv.width, cv.height);
  const m = FIT.renderMask(v, W, MODEL.tris, new Uint8Array(v.w * v.h)); g.fillStyle = "#ff2d9a";
  for (let y = 1; y < v.h - 1; y++) for (let x = 1; x < v.w - 1; x++) { const p = y * v.w + x; if (m[p] && !(m[p - 1] && m[p + 1] && m[p - v.w] && m[p + v.w])) g.fillRect(x * z, y * z, z, z); }
}
function drawShot(cv, shot) { const k = 300 / Math.max(shot.cv.width, shot.cv.height); cv.width = Math.round(shot.cv.width * k); cv.height = Math.round(shot.cv.height * k); cv.getContext("2d").drawImage(shot.cv, 0, 0, cv.width, cv.height); }

function check() {
  let html = `${steps(2)}<h2>${t("checkTitle")}</h2><p>${t("checkHint")}</p>`; const jobs = [];
  for (const side of ["L", "R"]) {
    const r = S.fits[side]; if (!r) continue;
    const shots = STEPS.filter((n) => S.shots[side][n]).map((n) => S.shots[side][n]);
    html += `<h2>${t(side)}</h2><div class="thumbs">${shots.map((sh) => `<canvas id="k_${side}_${sh.name}"></canvas>`).join("")}</div>`;
    if (r.error) {
      const dg = r.diag || {};
      html += `<div class="card"><p class="bad">${t("errFoot")}</p><p class="small"><b>${t("detail")}</b><br>${shots.map((sh) => `${t("t_" + sh.name)}: ${(dg[sh.name] || {}).stage === "ok" ? "OK" : t("stageBad")} ${(dg[sh.name] || {}).foot_vs_guide != null ? "· " + dg[sh.name].foot_vs_guide : ""}`).join("<br>")}${r.detail ? "<br>" + r.detail : ""}</p></div>`;
      shots.forEach((sh) => jobs.push(() => drawShot($(`k_${side}_${sh.name}`), sh)));
    } else {
      const iou = r.iou.reduce((a, b) => a + b, 0) / r.iou.length, good = iou > 0.86 && r.views.length === STEPS.length;
      html += `<div class="card"><p class="${good ? "ok" : "warn"}"><b>${t(good ? "fitGood" : "fitPoor")}</b> (${(iou * 100).toFixed(0)}%)</p></div>`;
      const W = FIT.toWorld(FIT.footVerts(MODEL, r.foot_length, r.coef), r.foot_length, side, r.place);
      shots.forEach((sh) => { const v = r.views.find((x) => x.name === sh.name); jobs.push(() => (v ? drawCheck($(`k_${side}_${sh.name}`), sh, v, W) : drawShot($(`k_${side}_${sh.name}`), sh))); });
      S.feet[side] = Object.assign({}, r.measures, { length_source: "shoe_size", shape: { coef: r.coef.map((c) => +c.toFixed(3)) },
        quality: { outline_match: +iou.toFixed(3), photos: r.views.map((v) => v.name), camera_mm: r.views.map((v) => v.camera_mm), tilt_deg: shots.map((sh) => sh.tilt_deg) } });
    }
    html += `<button id="re_${side}">${t(side)} · ${t("retakeFoot")}</button>`;
  }
  const any = Object.keys(S.feet).length > 0;
  html += `<button class="go" id="ok" ${any ? "" : "disabled"}>${t("toResult")}</button><button id="sp">${t("savePhotos")}</button>`;
  app().innerHTML = html; jobs.forEach((j) => j());
  for (const side of ["L", "R"]) if ($("re_" + side)) $("re_" + side).onclick = async () => {
    delete S.feet[side]; delete S.fits[side]; S.shots[side] = {}; S.queue = STEPS.map((name) => ({ name, side })); S.q = 0;
    await openCamera(); capture();
  };
  $("ok").onclick = summary; $("sp").onclick = savePhotos;
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
    const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, m = Math.hypot(nx, ny, nz) || 1;
    for (const v of [nx / m, ny / m, nz / m, V[a], V[a + 1], V[a + 2], V[b], V[b + 1], V[b + 2], V[c], V[c + 1], V[c + 2]]) { dv.setFloat32(o, v, true); o += 4; }
    o += 2;
  }
  return new Blob([buf], { type: "model/stl" });
}

function exportData() {
  return { app: "footcapture", version: "0.3", flow: "paper-free", subject: S.subject, created: new Date().toISOString(),
    age: S.info.age, height_cm: S.info.height_cm, weight_kg: S.info.weight_kg, shoe_size_mm: S.info.shoe_size_mm,
    shape_model: { n_feet: MODEL.nFeet, modes: MODEL.K, nx: MODEL.nx, nt: MODEL.nt, cut: MODEL.cut }, left: S.feet.L, right: S.feet.R };
}

function summary() {
  stopCamera();
  const d = exportData(), val = (s, f) => (d[s] ? d[s][f] : null);
  const row = ([k, f, u]) => { const a = val("left", f), b = val("right", f), df = a != null && b != null && (a + b) ? Math.abs(a - b) / ((a + b) / 2) * 100 : null; return `<tr><td>${t(k)} <span class="small">${u}</span></td><th>${a == null ? "–" : a.toFixed(1)}</th><th>${b == null ? "–" : b.toFixed(1)}</th><th class="small">${df == null ? "–" : df.toFixed(1) + "%"}</th></tr>`; };
  app().innerHTML = `${steps(3)}<h2>${t("sumTitle")} · ${S.subject}</h2>
    <canvas id="gl" class="gl"></canvas>
    <div class="views">${["three", "top", "side", "front", "sole"].map((v) => `<button data-v="${v}">${t("v_" + v)}</button>`).join("")}</div>
    <p class="small">${t("dragHint")}</p>
    <div class="card"><table><tr><td></td><th>${t("L")}</th><th>${t("R")}</th><th class="small">${t("diff")}</th></tr>${MEASURES.map(row).join("")}</table></div>
    <p class="small">${t("lenNote")}</p><p class="small">${t("modelNote").replace("{n}", MODEL.nFeet)}</p>
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

/* For tests: run from photo URLs without the camera.  urls = {L: {top, side, inner}, R: {...}} */
async function runUrls(urls, info) {
  Object.assign(S.info, { subject: "TEST", shoe_size_mm: 250 }, info || {}); S.subject = S.info.subject; S.shots = { L: {}, R: {} }; S.feet = {}; S.fits = {};
  for (const side of Object.keys(urls)) for (const name of Object.keys(urls[side])) { const cv = await loadUrl(urls[side][name]); S.shots[side][name] = { name, cv, img: pixels(cv), tilt_deg: null }; }
  for (const side of Object.keys(urls)) S.fits[side] = FIT.reconstructFree(STEPS.filter((n) => S.shots[side][n]).map((n) => S.shots[side][n]), side, MODEL, FL());
  check(); return S.fits;
}

window.FC = { S, loadUrl, pixels, exportData, home, info, explain, capture, check, summary, runUrls, viewerFeet, model: () => MODEL };
home();
fetch("footmodel.json?v=3d4").then((r) => r.json()).then((j) => { MODEL = FIT.loadModel(j); if ($("agree")) home(); });
