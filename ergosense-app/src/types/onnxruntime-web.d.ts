declare module 'onnxruntime-web' {
  export class Tensor {
    constructor(type: string, data: Float32Array, dims: number[]);
    readonly data: Float32Array | Uint8Array;
    readonly dims: number[];
  }

  export class InferenceSession {
    static create(path: string, options?: Record<string, unknown>): Promise<InferenceSession>;
    run(feeds: Record<string, Tensor>): Promise<Record<string, Tensor>>;
    readonly inputNames: string[];
    readonly outputNames: string[];
  }

  export const env: {
    wasm: { wasmPaths: string };
  };
}
