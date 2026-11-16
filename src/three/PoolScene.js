import * as THREE from 'three'

// Ripple behavior based on Christian Ortiz's Mouse Effects demo:
// https://github.com/cortiz2894/mouse-effects
const quadVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }
`

const SIMULATION_STEP = 1 / 60

const simFrag = /* glsl */ `
  uniform sampler2D uState;
  uniform vec2 uTexel;
  uniform float uAspect;
  uniform vec2 uPointer;
  uniform vec2 uPreviousPointer;
  uniform vec3 uTap;
  varying vec2 vUv;

  void main() {
    // The red and green channels hold the current and preceding wave heights.
    vec2 height = texture2D(uState, vUv).rg;
    vec2 dx = vec2(uTexel.x, 0.0);
    vec2 dy = vec2(0.0, uTexel.y);
    float neighbors = texture2D(uState, vUv - dx).r + texture2D(uState, vUv + dx).r
      + texture2D(uState, vUv - dy).r + texture2D(uState, vUv + dy).r;
    float wave = mix(height.r, neighbors * 0.5 - height.g, 0.97) * 0.98;

    // A soft brush follows the entire pointer segment. Fast movement adds more energy.
    vec2 scale = vec2(uAspect, 1.0);
    vec2 motion = (uPointer - uPreviousPointer) * scale;
    float speed = length(motion);
    if (speed > 0.0001) {
      vec2 offset = (vUv - uPreviousPointer) * scale;
      float along = clamp(dot(offset, motion) / dot(motion, motion), 0.0, 1.0);
      float radius = mix(0.022, 0.032, along);
      float trail = 1.0 - smoothstep(0.0, radius, length(offset - motion * along));
      wave += trail * trail * min(speed * 14.0, 1.0) * 0.28;
    }
    float tap = 1.0 - smoothstep(0.0, 0.045, length((vUv - uTap.xy) * scale));
    wave += tap * tap * uTap.z;

    gl_FragColor = vec4(wave, height.r, 0.0, 1.0);
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
    vec2 dx = vec2(uTexel.x, 0.0);
    vec2 dy = vec2(0.0, uTexel.y);
    float slopeX = texture2D(uWater, vUv - dx).r - texture2D(uWater, vUv + dx).r;
    float slopeY = texture2D(uWater, vUv - dy).r - texture2D(uWater, vUv + dy).r;
    vec3 normal = normalize(vec3(vec2(slopeX, slopeY) * 24.0, 1.0));
    float bend = length(normal.xy);
    vec2 distorted = clamp(vUv + normal.xy * vec2(1.0 / uAspect, 1.0) * 0.037, 0.001, 0.999);
    vec3 col = waterColor(distorted);

    if (bend > 0.008) {
      vec3 halfLight = normalize(vec3(0.24, 0.30, 1.0));
      float specular = pow(max(dot(normal, halfLight), 0.0), 38.0);
      float fresnel = (1.0 - normal.z) * (1.0 - normal.z);
      float rippleMask = smoothstep(0.008, 0.14, bend);
      col += vec3(0.48, 0.88, 0.96) * (specular * 0.27 + fresnel * 0.07) * rippleMask;
    }
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
    this.pointer = new THREE.Vector2()
    this.pointerInside = false

    this.simMat = new THREE.ShaderMaterial({
      vertexShader: quadVert,
      fragmentShader: simFrag,
      uniforms: {
        uState: { value: null },
        uTexel: { value: new THREE.Vector2() },
        uAspect: { value: 1 },
        uPointer: { value: this.pointer },
        uPreviousPointer: { value: new THREE.Vector2() },
        uTap: { value: new THREE.Vector3() },
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
    this._onLeave = () => { this.pointerInside = false }
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

  onMove(e) {
    const rect = this.canvas.getBoundingClientRect()
    this.pointer.set((e.clientX - rect.left) / rect.width, 1 - (e.clientY - rect.top) / rect.height)
    if (!this.pointerInside) this.simMat.uniforms.uPreviousPointer.value.copy(this.pointer)
    this.pointerInside = true
  }

  onDown(e) {
    this.onMove(e)
    this.simMat.uniforms.uTap.value.set(this.pointer.x, this.pointer.y, 0.27)
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
      this.pointerInside = false
    }
  }

  step() {
    const uniforms = this.simMat.uniforms
    uniforms.uState.value = this.rtA.texture
    this.renderer.setRenderTarget(this.rtB)
    this.renderer.render(this.simScene, this.camera)
    ;[this.rtA, this.rtB] = [this.rtB, this.rtA]
    uniforms.uPreviousPointer.value.copy(this.pointer)
    uniforms.uTap.value.z = 0
  }

  loop(now) {
    this.raf = requestAnimationFrame(this.loop)
    if (!this.rtA) return
    const dt = Math.min(Math.max(0, (now - this.last) / 1000), 1 / 20)
    this.last = now
    this.time += dt
    this.accumulator += dt

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
