import { FRAG, VERT } from "./shaders";

export type LensUniforms = {
  cx: number;
  cy: number;
  hw: number;
  hh: number;
  radius: number;
  mag: number;
  refract: number;
  chroma: number;
  chromaDirX: number;
  chromaDirY: number;
  alpha: number;
  lift: number;
};

/**
 * WebGL2 lens renderer. Owns one reusable texture (the offscreen nav content
 * render target) and one program. No per-frame allocations.
 */
export class LensRenderer {
  private gl: WebGL2RenderingContext;
  private program: WebGLProgram;
  private tex: WebGLTexture;
  private vao: WebGLVertexArrayObject;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private texW = 0;
  private texH = 0;

  constructor(canvas: HTMLCanvasElement) {
    const gl = canvas.getContext("webgl2", {
      alpha: false,
      antialias: false,
      premultipliedAlpha: false,
      powerPreference: "high-performance",
    });
    if (!gl) throw new Error("WebGL2 unavailable");
    this.gl = gl;

    this.program = this.link(VERT, FRAG);
    gl.useProgram(this.program);
    for (const name of [
      "uTex",
      "uRes",
      "uCenter",
      "uHalf",
      "uRadius",
      "uMag",
      "uRefract",
      "uChroma",
      "uChromaDir",
      "uAlpha",
      "uLift",
    ]) {
      this.u[name] = gl.getUniformLocation(this.program, name);
    }

    this.vao = gl.createVertexArray()!;
    this.tex = gl.createTexture()!;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.uniform1i(this.u["uTex"]!, 0);
  }

  private link(vs: string, fs: string): WebGLProgram {
    const gl = this.gl;
    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        throw new Error(`shader: ${gl.getShaderInfoLog(s)}`);
      }
      return s;
    };
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    const p = gl.createProgram()!;
    gl.attachShader(p, v);
    gl.attachShader(p, f);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(`link: ${gl.getProgramInfoLog(p)}`);
    }
    gl.deleteShader(v);
    gl.deleteShader(f);
    return p;
  }

  resize(pw: number, ph: number) {
    const gl = this.gl;
    if (gl.canvas.width !== pw || gl.canvas.height !== ph) {
      gl.canvas.width = pw;
      gl.canvas.height = ph;
    }
    gl.viewport(0, 0, pw, ph);
  }

  /** Upload the offscreen scene. Called only when content actually changes. */
  upload(source: HTMLCanvasElement) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    if (source.width !== this.texW || source.height !== this.texH) {
      this.texW = source.width;
      this.texH = source.height;
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, source.width, source.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    } else {
      gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, source);
    }
  }

  draw(p: LensUniforms) {
    const gl = this.gl;
    const w = gl.canvas.width;
    const h = gl.canvas.height;
    gl.useProgram(this.program);
    gl.bindVertexArray(this.vao);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform2f(this.u["uRes"]!, w, h);
    gl.uniform2f(this.u["uCenter"]!, p.cx, p.cy);
    gl.uniform2f(this.u["uHalf"]!, p.hw, p.hh);
    gl.uniform1f(this.u["uRadius"]!, p.radius);
    gl.uniform1f(this.u["uMag"]!, p.mag);
    gl.uniform1f(this.u["uRefract"]!, p.refract);
    gl.uniform1f(this.u["uChroma"]!, p.chroma);
    gl.uniform2f(this.u["uChromaDir"]!, p.chromaDirX, p.chromaDirY);
    gl.uniform1f(this.u["uAlpha"]!, p.alpha);
    gl.uniform1f(this.u["uLift"]!, p.lift);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  dispose() {
    const gl = this.gl;
    gl.deleteTexture(this.tex);
    gl.deleteProgram(this.program);
    gl.deleteVertexArray(this.vao);
  }
}
