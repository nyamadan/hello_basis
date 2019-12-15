import * as React from "react";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import * as ReactDOM from "react-dom";

import styled from "styled-components";
import * as twgl from "twgl.js";

import { createBasisFile } from "../basis_file";

import { BASIS_FORMAT } from "../basis_format";

const COMPRESSED_RGBA_ASTC_4x4_KHR = 0x93B0;
const COMPRESSED_RGB_S3TC_DXT1_EXT = 0x83F0;
const COMPRESSED_RGBA_S3TC_DXT5_EXT = 0x83f3;
const COMPRESSED_RGB_ETC1_WEBGL = 0x8D64;
const COMPRESSED_RGBA8_ETC2_EAC = 0x9278;
const COMPRESSED_RGB_PVRTC_4BPPV1_IMG = 0x8C00;
const COMPRESSED_RGBA_PVRTC_4BPPV1_IMG = 0x8C02;

const VertexShaderSource = `
attribute vec3 position;

void main()
{
  gl_Position = vec4(position, 1.0);
}
`;

const FragmentShaderSource = `
#ifdef GL_ES
precision mediump float;
#endif

uniform vec2 resolution;
uniform sampler2D tex;

void main()
{
  vec2 p = gl_FragCoord.xy / resolution;
  vec4 color = texture2D(tex, p);
  gl_FragColor = color;
}
`;

interface TextureFormatParam {
  readonly texFormat: number;
  readonly basisFormat: BASIS_FORMAT;
  readonly formatName: string;
  readonly compressed: boolean;
}

type FormatName = "RGBA32" | "RGB565" | "BC1" | "BC3" | "ASTC" | "ETC2" | "ETC1" | "PVRTC_RGB" | "PVRTC_RGBA";

interface Props {
  src?: string;
}

interface State {
  width: number;
  height: number;
  compressedSize: number;
  extractSize: number;
  formatName: FormatName;
}

const Container = styled.div`
position: relative;
`;

const Dialog = styled.div`
position: absolute;
border: solid black 1px;
background: rgba(32, 32, 32, 0.75);
padding: 5px 10px;
border-radius: 5px;
`;

const DialogRow = styled.tr`
height: 28px;
`;

export class BasisImage extends React.Component<Props, State> {
  private el: HTMLCanvasElement = null;
  private gl: WebGLRenderingContext = null;

  private astcSupported = false;
  private etc1Supported = false;
  private etc2Supported = false;
  private dxtSupported = false;
  private pvrtcSupported = false;
  private supportedTextureParams: ReadonlyArray<TextureFormatParam> = [];

  private tex: WebGLTexture = null;
  private imageBuffer: Uint8Array = null;

  private programInfo: twgl.ProgramInfo = null;
  private bufferInfo: twgl.BufferInfo = null;

  private numberWithCommas(x: number): string {
    const parts = x.toString().split(".");
    parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    return parts.join(".");
  }

  private getSupportedTextureParams(): ReadonlyArray<TextureFormatParam> {
    const {
      dxtSupported,
      pvrtcSupported,
      etc2Supported,
      etc1Supported,
      astcSupported
    } = this;

    const dest: TextureFormatParam[] = [];

    dest.push(this.getTextureFormatParam(BASIS_FORMAT.RGBA32));

    dest.push(this.getTextureFormatParam(BASIS_FORMAT.RGB565));

    if (astcSupported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.ASTC_4x4));
    }

    if (etc2Supported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.ETC2));
    }

    if (dxtSupported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.BC3));
    }
    if (dxtSupported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.BC1));
    }

    if (pvrtcSupported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.PVRTC1_4_RGBA));
    }
    if (pvrtcSupported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.PVRTC1_4_RGB));
    }

    if (etc1Supported) {
      dest.push(this.getTextureFormatParam(BASIS_FORMAT.ETC1));
    }

    return dest;
  }

  private getTextureFormatParam(basisFormat: BASIS_FORMAT): TextureFormatParam {
    const { gl } = this;

    switch (basisFormat) {
      case BASIS_FORMAT.ASTC_4x4:
        return {
          texFormat: COMPRESSED_RGBA_ASTC_4x4_KHR,
          basisFormat: BASIS_FORMAT.ASTC_4x4,
          formatName: "ASTC",
          compressed: true
        };
      case BASIS_FORMAT.ETC2:
        return {
          texFormat: COMPRESSED_RGBA8_ETC2_EAC,
          basisFormat: BASIS_FORMAT.ETC2,
          formatName: "ETC2",
          compressed: true
        };
      case BASIS_FORMAT.BC3:
        return {
          texFormat: COMPRESSED_RGBA_S3TC_DXT5_EXT,
          basisFormat: BASIS_FORMAT.BC3,
          formatName: "BC3",
          compressed: true
        };
      case BASIS_FORMAT.PVRTC1_4_RGBA:
        return {
          texFormat: COMPRESSED_RGBA_PVRTC_4BPPV1_IMG,
          basisFormat: BASIS_FORMAT.PVRTC1_4_RGBA,
          formatName: "PVRTC_RGBA",
          compressed: true
        };
      case BASIS_FORMAT.RGBA32:
        return {
          texFormat: gl.RGBA,
          basisFormat: BASIS_FORMAT.RGBA32,
          formatName: "RGBA32",
          compressed: false
        };
      case BASIS_FORMAT.BC1:
        return {
          texFormat: COMPRESSED_RGB_S3TC_DXT1_EXT,
          basisFormat: BASIS_FORMAT.BC1,
          formatName: "BC1",
          compressed: true
        };
      case BASIS_FORMAT.PVRTC1_4_RGB:
        return {
          texFormat: COMPRESSED_RGB_PVRTC_4BPPV1_IMG,
          basisFormat: BASIS_FORMAT.PVRTC1_4_RGB,
          formatName: "PVRTC_RGB",
          compressed: true
        };
      case BASIS_FORMAT.ETC1:
        return {
          texFormat: COMPRESSED_RGB_ETC1_WEBGL,
          basisFormat: BASIS_FORMAT.ETC1,
          formatName: "ETC1",
          compressed: true
        };
      case BASIS_FORMAT.RGB565:
        return {
          texFormat: gl.RGB565,
          basisFormat: BASIS_FORMAT.RGB565,
          formatName: "RGB565",
          compressed: false
        };
    }

    return null;
  }

  public constructor(props: Props, context?: any) {
    super(props, context);
    this.state = {
      width: 32,
      height: 32,
      extractSize: 0,
      compressedSize: 0,
      formatName: "RGBA32"
    };
  }

  public componentDidUpdate(prevProps: Props): void {
    if (this.props.src !== prevProps.src) {
      this.load(this.props.src);
    }
  }

  public componentDidMount(): void {
    const gl = this.gl = (this.el.getContext("webgl2") || this.el.getContext("webgl")) as WebGLRenderingContext;

    this.astcSupported = !!gl.getExtension("WEBGL_compressed_texture_astc");
    this.etc1Supported = !!gl.getExtension("WEBGL_compressed_texture_etc1");
    this.etc2Supported = !!gl.getExtension("WEBGL_compressed_texture_etc");
    this.dxtSupported = !!gl.getExtension("WEBGL_compressed_texture_s3tc");
    this.pvrtcSupported =
      !!gl.getExtension("WEBGL_compressed_texture_pvrtc") ||
      !!gl.getExtension("WEBKIT_WEBGL_compressed_texture_pvrtc");

    this.supportedTextureParams = this.getSupportedTextureParams();

    const programInfo = twgl.createProgramInfo(gl, [
      VertexShaderSource,
      FragmentShaderSource,
    ]);

    const arrays = {
      position: [-1, -1, 0, 1, -1, 0, -1, 1, 0, -1, 1, 0, 1, -1, 0, 1, 1, 0],
    };
    const bufferInfo = twgl.createBufferInfoFromArrays(gl, arrays);

    this.programInfo = programInfo;
    this.bufferInfo = bufferInfo;

    this.onRequestAnimationFrame = this.onRequestAnimationFrame.bind(this);

    this.load(this.props.src);

    requestAnimationFrame(this.onRequestAnimationFrame);
  }

  private updateTexture(formatName: FormatName): void {
    const { gl } = this;

    const basisFile = createBasisFile(this.imageBuffer);
    const width = basisFile.getImageWidth(0, 0);
    const height = basisFile.getImageHeight(0, 0);

    if (!basisFile.startTranscoding()) {
      console.error("failed to startTranscoding.");
      basisFile.close();
      basisFile.delete();
    }

    const textureParam = this.supportedTextureParams.find(x => x.formatName === formatName);
    if (textureParam == null) {
      this.setState({ formatName });
      return;
    }
    const { texFormat, compressed, basisFormat } = textureParam;

    const extractSize = basisFile.getImageTranscodedSizeInBytes(0, 0, basisFormat);
    const textureSource = new Uint8Array(extractSize);

    if (!basisFile.transcodeImage(textureSource, 0, 0, basisFormat, 0, 0)) {
      console.error("failed to transcodeImage.");
    }

    basisFile.close();
    basisFile.delete();

    this.tex = gl.createTexture();

    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    if (compressed) {
      gl.compressedTexImage2D(
        gl.TEXTURE_2D,
        0,
        texFormat,
        width,
        height,
        0,
        textureSource
      );
    } else {
      switch (basisFormat) {
        case BASIS_FORMAT.RGBA32:
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            texFormat,
            width,
            height,
            0,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            textureSource);
          break;
        case BASIS_FORMAT.RGB565:
          gl.texImage2D(
            gl.TEXTURE_2D,
            0,
            texFormat,
            width,
            height,
            0,
            gl.RGB,
            gl.UNSIGNED_SHORT_5_6_5,
            new Uint16Array(textureSource.buffer));
          break;
      }
    }
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    this.setState({
      width,
      height,
      extractSize,
      formatName,
      compressedSize: this.imageBuffer.length,
    });
  }

  private async fetchArrayBuffer(path: string): Promise<Uint8Array> {
    const response = await fetch(path);
    const buffer = await response.arrayBuffer();
    return new Uint8Array(buffer);
  }

  private async load(src: string): Promise<void> {
    this.clearImage();

    if (!src) {
      return;
    }

    this.imageBuffer = await this.fetchArrayBuffer(src);

    this.updateTexture(this.state.formatName);
  }

  public render(): JSX.Element {
    const { width, height, extractSize, compressedSize, formatName } = this.state;
    const textureParams = this.supportedTextureParams;

    const onChangeFormat = (ev: React.ChangeEvent<HTMLSelectElement>): void => {
      this.clearImage();
      this.updateTexture(ev.target.value as FormatName);
    };

    const options: ReadonlyArray<JSX.Element> = textureParams.map((x) => (<option key={x.formatName} value={x.formatName}>{x.formatName}</option>));

    const compressedSizeStr = this.numberWithCommas(compressedSize);
    const extractSizeStr = this.numberWithCommas(extractSize);

    return (
      <Container style={{ width, height }}>
        <canvas width={width} height={height} ref={(el): void => { this.el = el; }} />
        <Dialog style={{ top: 10, left: 10 }}>
          <table>
            <tbody>
              <DialogRow>
                <th>Extract Format</th>
                <td><select value={formatName} onChange={onChangeFormat}>{options}</select></td>
              </DialogRow>
              <DialogRow>
                <th>Resolution</th>
                <td>{width}x{height}</td>
              </DialogRow>
              <DialogRow>
                <th>Basis Size</th>
                <td>{compressedSizeStr} bytes</td>
              </DialogRow>
              <DialogRow>
                <th>{formatName} Size</th>
                <td>{extractSizeStr} bytes</td>
              </DialogRow>
            </tbody>
          </table>
        </Dialog>
      </Container>
    );
  }

  private onRequestAnimationFrame(): void {
    const { gl, tex, programInfo, bufferInfo } = this;
    const { width, height } = this.state;
    const resolution = new Float32Array([width, height]);
    const uniforms = { tex, resolution };

    gl.viewport(0, 0, width, height);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (this.tex != null) {
      gl.useProgram(programInfo.program);
      twgl.setBuffersAndAttributes(gl, programInfo, bufferInfo);
      twgl.setUniforms(programInfo, uniforms);
      twgl.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(this.onRequestAnimationFrame);
  }

  private clearImage(): void {
    const { gl } = this;

    if (this.tex) {
      gl.deleteTexture(this.tex);
      this.tex = null;
    }
  }
}
