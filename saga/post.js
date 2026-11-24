'use strict';
// Post-processing: HDR scene target -> bright pass -> two-level gaussian bloom -> ACES filmic tone map + sRGB + vignette + grain.
(function () {
  const T = THREE;
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const BRIGHT = `uniform sampler2D tex; uniform float threshold; varying vec2 vUv;
    void main(){ vec3 c = texture2D(tex, vUv).rgb; float l = max(c.r, max(c.g, c.b));
      float k = smoothstep(threshold, threshold + 0.6, l); gl_FragColor = vec4(c * k, 1.0); }`;
  const BLUR = `uniform sampler2D tex; uniform vec2 dir; varying vec2 vUv;
    void main(){ vec3 s = texture2D(tex, vUv).rgb * 0.227027;
      s += texture2D(tex, vUv + dir * 1.384615).rgb * 0.316216; s += texture2D(tex, vUv - dir * 1.384615).rgb * 0.316216;
      s += texture2D(tex, vUv + dir * 3.230769).rgb * 0.070270; s += texture2D(tex, vUv - dir * 3.230769).rgb * 0.070270;
      gl_FragColor = vec4(s, 1.0); }`;
  const COMP = `uniform sampler2D tex; uniform sampler2D b1; uniform sampler2D b2; uniform float strength; uniform float exposure; uniform float time; uniform float flash; varying vec2 vUv;
    vec3 aces(vec3 x){ x *= 0.6; return clamp((x*(2.51*x+0.03))/(x*(2.43*x+0.59)+0.14), 0.0, 1.0); }
    vec3 toSRGB(vec3 c){ return mix(c * 12.92, 1.055 * pow(c, vec3(1.0/2.4)) - 0.055, step(0.0031308, c)); }
    float hash(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + time) * 43758.5453); }
    void main(){
      vec3 c = texture2D(tex, vUv).rgb;
      vec3 bl = texture2D(b1, vUv).rgb * 0.6 + texture2D(b2, vUv).rgb * 0.9;
      c = (c + bl * strength) * exposure + flash;
      c = toSRGB(aces(c));
      vec2 q = vUv - 0.5; c *= 1.0 - dot(q, q) * 0.55;
      c += (hash(vUv * 1000.0) - 0.5) * 0.018;
      gl_FragColor = vec4(c, 1.0); }`;

  class Post {
    constructor(renderer) {
      this.r = renderer;
      this.cam = new T.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      this.quad = new T.Mesh(new T.PlaneGeometry(2, 2));
      this.quad.frustumCulled = false;
      this.scene = new T.Scene();
      this.scene.add(this.quad);
      const opt = { type: T.HalfFloatType, depthBuffer: false };
      this.main = new T.WebGLRenderTarget(4, 4, { type: T.HalfFloatType, samples: 4 });
      this.h1 = new T.WebGLRenderTarget(4, 4, opt);
      this.h2 = new T.WebGLRenderTarget(4, 4, opt);
      this.q1 = new T.WebGLRenderTarget(4, 4, opt);
      this.q2 = new T.WebGLRenderTarget(4, 4, opt);
      const mat = (fs, u) => new T.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms: u, depthTest: false, depthWrite: false, toneMapped: false });
      this.bright = mat(BRIGHT, { tex: { value: null }, threshold: { value: 1.0 } });
      this.blur = mat(BLUR, { tex: { value: null }, dir: { value: new T.Vector2() } });
      this.comp = mat(COMP, { tex: { value: null }, b1: { value: null }, b2: { value: null }, strength: { value: 0.9 }, exposure: { value: 1.0 }, time: { value: 0 }, flash: { value: 0 } });
      this.w = this.h = 0;
      this.flash = 0;
    }
    size() {
      const s = new T.Vector2();
      this.r.getDrawingBufferSize(s);
      if (s.x === this.w && s.y === this.h) return;
      this.w = s.x;
      this.h = s.y;
      this.main.setSize(s.x, s.y);
      const hw = Math.max(1, s.x >> 2), hh = Math.max(1, s.y >> 2);
      this.h1.setSize(hw, hh);
      this.h2.setSize(hw, hh);
      this.q1.setSize(Math.max(1, hw >> 2), Math.max(1, hh >> 2));
      this.q2.setSize(Math.max(1, hw >> 2), Math.max(1, hh >> 2));
    }
    pass(material, target) {
      this.quad.material = material;
      this.r.setRenderTarget(target);
      this.r.render(this.scene, this.cam);
    }
    blurPass(src, tmp, w, h) {
      this.blur.uniforms.tex.value = src.texture;
      this.blur.uniforms.dir.value.set(1 / w, 0);
      this.pass(this.blur, tmp);
      this.blur.uniforms.tex.value = tmp.texture;
      this.blur.uniforms.dir.value.set(0, 1 / h);
      this.pass(this.blur, src);
    }
    render(scene, camera, dt) {
      this.size();
      const r = this.r;
      r.setRenderTarget(this.main);
      r.render(scene, camera);
      this.bright.uniforms.tex.value = this.main.texture;
      this.pass(this.bright, this.h1);
      this.blurPass(this.h1, this.h2, this.h1.width, this.h1.height);
      this.blurPass(this.h1, this.h2, this.h1.width, this.h1.height);
      this.blur.uniforms.tex.value = this.h1.texture;
      this.blur.uniforms.dir.value.set(0, 0);
      this.pass(this.blur, this.q1);
      this.blurPass(this.q1, this.q2, this.q1.width, this.q1.height);
      this.blurPass(this.q1, this.q2, this.q1.width, this.q1.height);
      const u = this.comp.uniforms;
      u.tex.value = this.main.texture;
      u.b1.value = this.h1.texture;
      u.b2.value = this.q1.texture;
      u.time.value = (u.time.value + 0.017) % 100;
      this.flash = Math.max(0, this.flash - (dt || 0.016) * 3);
      u.flash.value = this.flash;
      this.pass(this.comp, null);
    }
  }
  ZB.Post = Post;
})();
