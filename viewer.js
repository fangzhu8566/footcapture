"use strict";
/* Small WebGL viewer for the fitted feet: drag to turn, pinch or wheel to zoom.  No libraries.
   Frame: X towards the toes, Y to the person's left, Z up, millimetres. */
(function (root) {
  const VS = "attribute vec3 p; attribute vec3 n; uniform mat4 mvp; uniform mat3 nm; varying vec3 vn;" +
    "void main(){ vn = nm * n; gl_Position = mvp * vec4(p, 1.0); }";
  const FS = "precision mediump float; varying vec3 vn; uniform vec3 col; uniform float lit;" +
    "void main(){ vec3 N = normalize(vn); if (!gl_FrontFacing) N = -N;" +
    " float d = max(dot(N, normalize(vec3(0.35, 0.55, 0.76))), 0.0); float f = max(dot(N, normalize(vec3(-0.6, -0.2, 0.5))), 0.0);" +
    " vec3 c = col * (0.38 + 0.55 * d + 0.18 * f) + vec3(0.10) * pow(d, 18.0);" +
    " gl_FragColor = vec4(mix(col, c, lit), 1.0); }";

  const mul = (a, b) => { const o = new Float32Array(16); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) { let s = 0; for (let k = 0; k < 4; k++) s += a[k * 4 + r] * b[c * 4 + k]; o[c * 4 + r] = s; } return o; };
  const persp = (fovy, asp, n, f) => { const t = 1 / Math.tan(fovy / 2), o = new Float32Array(16); o[0] = t / asp; o[5] = t; o[10] = (f + n) / (n - f); o[11] = -1; o[14] = 2 * f * n / (n - f); return o; };
  const norm = (v) => { const m = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / m, v[1] / m, v[2] / m]; };
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  function lookAt(eye, at, up) {
    const z = norm([eye[0] - at[0], eye[1] - at[1], eye[2] - at[2]]), x = norm(cross(up, z)), y = cross(z, x), o = new Float32Array(16);
    o[0] = x[0]; o[4] = x[1]; o[8] = x[2]; o[1] = y[0]; o[5] = y[1]; o[9] = y[2]; o[2] = z[0]; o[6] = z[1]; o[10] = z[2];
    o[12] = -(x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]); o[13] = -(y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]); o[14] = -(z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]); o[15] = 1;
    return o;
  }

  function vertexNormals(V, tris) {
    const N = new Float32Array(V.length);
    for (let i = 0; i < tris.length; i += 3) {
      const a = tris[i] * 3, b = tris[i + 1] * 3, c = tris[i + 2] * 3;
      const n = cross([V[b] - V[a], V[b + 1] - V[a + 1], V[b + 2] - V[a + 2]], [V[c] - V[a], V[c + 1] - V[a + 1], V[c + 2] - V[a + 2]]);
      for (const k of [a, b, c]) { N[k] += n[0]; N[k + 1] += n[1]; N[k + 2] += n[2]; }
    }
    for (let i = 0; i < N.length; i += 3) { const m = Math.hypot(N[i], N[i + 1], N[i + 2]) || 1; N[i] /= m; N[i + 1] /= m; N[i + 2] /= m; }
    return N;
  }

  const PRESET = { three: [-0.95, 0.5], top: [-Math.PI / 2, 1.5], side: [-Math.PI / 2, 0.12], front: [0, 0.22], sole: [-Math.PI / 2, -1.5] };

  function create(canvas) {
    const gl = canvas.getContext("webgl", { antialias: true }); if (!gl) return null;
    const sh = (type, src) => { const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s); return s; };
    const prog = gl.createProgram(); gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(prog); gl.useProgram(prog);
    const loc = { p: gl.getAttribLocation(prog, "p"), n: gl.getAttribLocation(prog, "n"), mvp: gl.getUniformLocation(prog, "mvp"), nm: gl.getUniformLocation(prog, "nm"), col: gl.getUniformLocation(prog, "col"), lit: gl.getUniformLocation(prog, "lit") };
    const ext = gl.getExtension("OES_element_index_uint");
    let meshes = [], ground = null, az = PRESET.three[0], el = PRESET.three[1], dist = 620, target = [0, 0, 35], raf = 0;
    const buf = (V, N, tris) => {
      const o = { v: gl.createBuffer(), n: gl.createBuffer(), i: gl.createBuffer(), count: tris.length, type: ext ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT };
      gl.bindBuffer(gl.ARRAY_BUFFER, o.v); gl.bufferData(gl.ARRAY_BUFFER, V, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ARRAY_BUFFER, o.n); gl.bufferData(gl.ARRAY_BUFFER, N, gl.STATIC_DRAW);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, o.i); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, ext ? Uint32Array.from(tris) : Uint16Array.from(tris), gl.STATIC_DRAW);
      return o;
    };
    function setFeet(feet) {                                  // [{V: Float32Array, tris}]
      meshes = feet.map((f) => buf(f.V, vertexNormals(f.V, f.tris), f.tris));
      let x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
      for (const f of feet) for (let i = 0; i < f.V.length; i += 3) { x0 = Math.min(x0, f.V[i]); x1 = Math.max(x1, f.V[i]); y0 = Math.min(y0, f.V[i + 1]); y1 = Math.max(y1, f.V[i + 1]); }
      target = [(x0 + x1) / 2, (y0 + y1) / 2, 35]; dist = 2.3 * Math.max(x1 - x0, y1 - y0);
      const m = 45, g = new Float32Array([x0 - m, y0 - m, -0.4, x1 + m, y0 - m, -0.4, x1 + m, y1 + m, -0.4, x0 - m, y1 + m, -0.4]);
      ground = buf(g, new Float32Array([0, 0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1]), [0, 1, 2, 0, 2, 3]);
      draw();
    }
    function draw() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const dpr = Math.min(2, root.devicePixelRatio || 1), w = Math.round(canvas.clientWidth * dpr), h = Math.round(canvas.clientHeight * dpr);
        if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
        gl.viewport(0, 0, w, h); gl.clearColor(0.93, 0.945, 0.96, 1); gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.enable(gl.DEPTH_TEST);
        const eye = [target[0] + dist * Math.cos(el) * Math.cos(az), target[1] + dist * Math.cos(el) * Math.sin(az), target[2] + dist * Math.sin(el)];
        const up = Math.abs(el) > 1.45 ? [1, 0, 0] : [0, 0, 1], view = lookAt(eye, target, up), mvp = mul(persp(0.6, w / h, 20, 5000), view);
        gl.uniformMatrix4fv(loc.mvp, false, mvp); gl.uniformMatrix3fv(loc.nm, false, new Float32Array([view[0], view[1], view[2], view[4], view[5], view[6], view[8], view[9], view[10]]));
        const one = (m, col, lit) => {
          gl.uniform3fv(loc.col, col); gl.uniform1f(loc.lit, lit);
          gl.bindBuffer(gl.ARRAY_BUFFER, m.v); gl.enableVertexAttribArray(loc.p); gl.vertexAttribPointer(loc.p, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ARRAY_BUFFER, m.n); gl.enableVertexAttribArray(loc.n); gl.vertexAttribPointer(loc.n, 3, gl.FLOAT, false, 0, 0);
          gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, m.i); gl.drawElements(gl.TRIANGLES, m.count, m.type, 0);
        };
        if (ground && eye[2] > 0) one(ground, [0.99, 0.99, 0.985], 0);
        for (const m of meshes) one(m, [0.93, 0.76, 0.65], 1);
      });
    }
    const pts = new Map(); let pinch = 0;
    canvas.addEventListener("pointerdown", (e) => { pts.set(e.pointerId, [e.clientX, e.clientY]); canvas.setPointerCapture(e.pointerId); pinch = 0; });
    canvas.addEventListener("pointermove", (e) => {
      if (!pts.has(e.pointerId)) return; const prev = pts.get(e.pointerId); pts.set(e.pointerId, [e.clientX, e.clientY]);
      if (pts.size === 1) { az -= (e.clientX - prev[0]) * 0.01; el = Math.max(-1.55, Math.min(1.55, el + (e.clientY - prev[1]) * 0.01)); }
      else if (pts.size === 2) { const [a, b] = [...pts.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]); if (pinch) dist = Math.max(250, Math.min(2500, dist * pinch / d)); pinch = d; }
      draw();
    });
    const up = (e) => { pts.delete(e.pointerId); pinch = 0; };
    canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
    canvas.addEventListener("wheel", (e) => { e.preventDefault(); dist = Math.max(250, Math.min(2500, dist * (e.deltaY > 0 ? 1.1 : 0.9))); draw(); }, { passive: false });
    return { setFeet, draw, setView: (name) => { [az, el] = PRESET[name] || PRESET.three; draw(); }, state: () => ({ az, el, dist }) };
  }

  root.VIEW3D = { create, vertexNormals };
})(window);
