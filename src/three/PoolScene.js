import * as THREE from 'three'

// Ripples: drop-based heightfield sim (pointer trail drops + click splash), softened.
const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const SIMULATION_STEP = 1 / 120
const MAX_DROPS = 24

const simFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uPrev;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform vec4 uDrops[${MAX_DROPS}];
  uniform int uCount;
  varying vec2 vUv;
  const float PI = 3.14159265;
  void main() {
    vec4 info = texture2D(uPrev, vUv);
    vec2 dx = vec2(uTexel.x, 0.0);
    vec2 dy = vec2(0.0, uTexel.y);
    float avg = (
      texture2D(uPrev, vUv - dx).r + texture2D(uPrev, vUv + dx).r +
      texture2D(uPrev, vUv - dy).r + texture2D(uPrev, vUv + dy).r
    ) * 0.25;
    info.g += (avg - info.r) * 2.0;
    info.g *= 0.988;
    info.r += info.g;
    info.r *= 0.998;
    for (int i = 0; i < ${MAX_DROPS}; i++) {
      if (i >= uCount) break;
      vec4 d = uDrops[i];
      vec2 diff = (vUv - d.xy) * vec2(uAspect, 1.0);
      float drop = max(0.0, 1.0 - length(diff) / d.z);
      drop = 0.5 - cos(drop * PI) * 0.5;
      info.r += drop * d.w;
    }
    gl_FragColor = info;
  }
`

const renderFrag = /* glsl */ `
  precision highp float;
  uniform sampler2D uWater;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform float uTime;
  uniform float uScroll;   // 0..1 hero scroll progress
  varying vec2 vUv;

  const float TAU = 6.2831853;

  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }

  // tileable water caustic (after joltz0r)
  float caustic(vec2 uv, float t) {
    vec2 p = mod(uv * TAU, TAU) - 250.0;
    vec2 i = p;
    float c = 1.0;
    float inten = 0.005;
    for (int n = 0; n < 4; n++) {
      float tt = t * (1.0 - (3.5 / float(n + 1)));
      i = p + vec2(cos(tt - i.x) + sin(tt + i.y), sin(tt - i.y) + cos(tt + i.x));
      c += 1.0 / length(vec2(p.x / (sin(i.x + tt) / inten), p.y / (cos(i.y + tt) / inten)));
    }
    c /= 4.0;
    c = 1.17 - pow(c, 1.4);
    return pow(abs(c), 8.0);
  }

  vec3 waterColor(vec2 uv) {
    vec2 p = vec2(uv.x * uAspect, uv.y);
    vec2 swell = vec2(sin(p.y * 9.0 + uTime * 0.65), cos(p.x * 7.0 - uTime * 0.5)) * 0.0015;
    vec2 fp = p + swell;
    float nz = vnoise(fp * 1.6 + vec2(uTime * 0.04, -uTime * 0.03)) * 0.6 + vnoise(fp * 4.0 - uTime * 0.06) * 0.4;
    // Concentrate the sunlight above the name with deeper blue around it.
    vec2 light = (vec2(fp.x / uAspect, fp.y) - vec2(0.59, 0.73)) * vec2(1.18, 1.5);
    float glow = exp(-5.5 * dot(light, light));
    glow *= smoothstep(0.05, 0.97, fp.y + (nz - 0.5) * 0.24);
    vec3 deepBlue = vec3(0.035, 0.36, 0.56);
    vec3 poolBlue = vec3(0.12, 0.66, 0.83);
    vec3 col = mix(deepBlue, poolBlue, clamp(glow + nz * 0.20, 0.0, 1.0));

    float shafts = pow(0.5 + 0.5 * sin(fp.x * 5.0 + fp.y * 1.8 + uTime * 0.25 + nz * 2.0), 8.0);
    col += vec3(0.31, 0.65, 0.78) * shafts * glow * 0.12;
    float broadCaustics = caustic(fp * 0.55 + vec2(0.0, uTime * 0.01), uTime * 0.45);
    float fineCaustics = caustic(fp * 0.9 + 3.1, uTime * 0.35 + 7.0);
    col += vec3(0.45, 0.82, 0.90) * (broadCaustics * 0.65 + fineCaustics * 0.3) * (0.12 + 0.55 * glow);
    return col;
  }

  void main() {
    vec2 tx = vec2(uTexel.x, 0.0);
    vec2 ty = vec2(0.0, uTexel.y);
    float h = texture2D(uWater, vUv).r;
    float hR = texture2D(uWater, vUv + tx).r, hL = texture2D(uWater, vUv - tx).r;
    float hU = texture2D(uWater, vUv + ty).r, hD = texture2D(uWater, vUv - ty).r;
    vec3 n = normalize(vec3(-(hR - hL) * 8.0, -(hU - hD) * 8.0, 1.0));
    float lap = hR + hL + hU + hD - 4.0 * h;

    vec2 distorted = clamp(vUv + n.xy * vec2(1.0 / uAspect, 1.0) * 0.06, 0.001, 0.999);
    vec3 col = waterColor(distorted);

    // ripple crests focus light, a soft sun glint and rim brightening on the slopes
    col += vec3(0.45, 0.82, 0.90) * clamp(-lap * 70.0, 0.0, 1.0) * 0.26;
    vec3 L = normalize(vec3(-0.35, 0.55, 1.0));
    float spec = pow(max(reflect(-L, n).z, 0.0), 220.0);
    col += spec * 0.25;
    col += (1.0 - n.z) * 1.6 * vec3(0.8, 1.0, 1.0);
    gl_FragColor = vec4(mix(col, vec3(0.027, 0.110, 0.145), uScroll * 0.55), 1.0);
  }
`

export default class PoolScene {
  constructor(canvas) {
    this.canvas = canvas
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75))
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.geo = new THREE.PlaneGeometry(2, 2)

    this.time = 0
    this.accumulator = 0
    this.scroll = 0
    this.visible = true
    this.drops = []
    this.pointer = { x: 0, y: 0, px: 0, py: 0, inside: false }

    this.simMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: simFrag,
      uniforms: {
        uPrev: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uDrops: { value: Array.from({ length: MAX_DROPS }, () => new THREE.Vector4()) },
        uCount: { value: 0 },
      },
    })
    this.renderMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: renderFrag,
      uniforms: {
        uWater: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uTime: { value: 0 },
        uScroll: { value: 0 },
      },
    })
    this.simScene = new THREE.Scene()
    this.simScene.add(new THREE.Mesh(this.geo, this.simMat))
    this.scene = new THREE.Scene()
    this.scene.add(new THREE.Mesh(this.geo, this.renderMat))

    this.resize()
    this._onMove = this.onMove.bind(this)
    this._onDown = this.onDown.bind(this)
    this._onLeave = () => { this.pointer.inside = false }
    canvas.parentElement.addEventListener('pointermove', this._onMove)
    canvas.parentElement.addEventListener('pointerdown', this._onDown)
    canvas.parentElement.addEventListener('pointerleave', this._onLeave)
    canvas.parentElement.addEventListener('pointercancel', this._onLeave)
    this._onResize = () => this.resize()
    window.addEventListener('resize', this._onResize)

    this.last = performance.now()
    this.loop = this.loop.bind(this)
    this.raf = requestAnimationFrame(this.loop)
  }

  makeTargets(w, h) {
    const opts = {
      type: THREE.HalfFloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      depthBuffer: false,
      stencilBuffer: false,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping,
    }
    this.rtA?.dispose()
    this.rtB?.dispose()
    this.rtA = new THREE.WebGLRenderTarget(w, h, opts)
    this.rtB = new THREE.WebGLRenderTarget(w, h, opts)
    this.renderer.setRenderTarget(this.rtA)
    this.renderer.clearColor()
    this.renderer.setRenderTarget(this.rtB)
    this.renderer.clearColor()
    this.renderer.setRenderTarget(null)
  }

  resize() {
    const { clientWidth: w, clientHeight: h } = this.canvas.parentElement
    if (!w || !h) return
    this.aspect = w / h
    this.renderer.setSize(w, h, false)
    const scale = Math.min(1 / 2.6, 420 / Math.max(w, h))
    const simW = Math.max(2, Math.round(w * scale))
    const simH = Math.max(2, Math.round(h * scale))
    if (!this.rtA || this.rtA.width !== simW || this.rtA.height !== simH) this.makeTargets(simW, simH)
    const texel = new THREE.Vector2(1 / simW, 1 / simH)
    this.simMat.uniforms.uTexel.value.copy(texel)
    this.renderMat.uniforms.uTexel.value.copy(texel)
    this.simMat.uniforms.uAspect.value = this.aspect
    this.renderMat.uniforms.uAspect.value = this.aspect
  }

  // pointer position in uv (0..1)
  toUv(e) {
    const rect = this.canvas.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: 1 - (e.clientY - rect.top) / rect.height }
  }

  onMove(e) {
    const p = this.toUv(e)
    const pt = this.pointer
    if (!pt.inside) { pt.px = p.x; pt.py = p.y }
    pt.inside = true
    pt.x = p.x
    pt.y = p.y
  }

  onDown(e) {
    const p = this.toUv(e)
    this.addDrop(p.x, p.y, 0.06, 0.36)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2
      this.addDrop(p.x + (Math.cos(a) * 0.045) / this.aspect, p.y + Math.sin(a) * 0.045, 0.022, -0.07)
    }
  }

  addDrop(x, y, r, strength) {
    if (this.drops.length < MAX_DROPS) this.drops.push([x, y, r, strength])
  }

  // soft drops along the pointer's path; faster movement makes bigger waves
  pointerWake() {
    const pt = this.pointer
    if (!pt.inside) return
    const dx = (pt.x - pt.px) * this.aspect, dy = pt.y - pt.py
    const v = Math.hypot(dx, dy)
    if (v > 0.0005) {
      const steps = Math.min(4, Math.ceil(v / 0.02))
      for (let i = 1; i <= steps; i++) {
        const t = i / steps
        this.addDrop(pt.px + (pt.x - pt.px) * t, pt.py + (pt.y - pt.py) * t, 0.02, (Math.min(0.035, v * 0.8) / steps) * 2.2)
      }
    }
    pt.px = pt.x
    pt.py = pt.y
  }

  setScroll(v) { this.scroll = v }

  setVisible(visible) {
    if (visible === this.visible) return
    this.visible = visible
    if (visible) {
      this.last = performance.now()
      this.raf = requestAnimationFrame(this.loop)
    } else {
      cancelAnimationFrame(this.raf)
      this.pointer.inside = false
    }
  }

  step() {
    const u = this.simMat.uniforms
    u.uPrev.value = this.rtA.texture
    const n = Math.min(this.drops.length, MAX_DROPS)
    for (let i = 0; i < n; i++) u.uDrops.value[i].set(...this.drops[i])
    u.uCount.value = n
    this.renderer.setRenderTarget(this.rtB)
    this.renderer.render(this.simScene, this.camera)
    ;[this.rtA, this.rtB] = [this.rtB, this.rtA]
    this.drops.length = 0
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop)
    if (!this.rtA) return
    // skip all GPU work while the full-screen menu hides the hero
    if (document.documentElement.classList.contains('menu-open')) { this.last = now; return }
    const dt = Math.min(Math.max(0, (now - this.last) / 1000), 1 / 20)
    this.last = now
    this.time += dt
    this.accumulator += dt

    this.pointerWake()
    while (this.accumulator >= SIMULATION_STEP) {
      this.step()
      this.accumulator -= SIMULATION_STEP
    }

    const uniforms = this.renderMat.uniforms
    uniforms.uWater.value = this.rtA.texture
    uniforms.uTime.value = this.time
    uniforms.uScroll.value = this.scroll
    this.renderer.setRenderTarget(null)
    this.renderer.render(this.scene, this.camera)
  }

  dispose() {
    cancelAnimationFrame(this.raf)
    this.visible = false
    const el = this.canvas.parentElement
    el?.removeEventListener('pointermove', this._onMove)
    el?.removeEventListener('pointerdown', this._onDown)
    el?.removeEventListener('pointerleave', this._onLeave)
    el?.removeEventListener('pointercancel', this._onLeave)
    window.removeEventListener('resize', this._onResize)
    this.rtA?.dispose()
    this.rtB?.dispose()
    this.simMat.dispose()
    this.renderMat.dispose()
    this.geo.dispose()
    this.renderer.dispose()
  }
}
