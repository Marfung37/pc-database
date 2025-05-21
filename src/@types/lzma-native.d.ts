interface LZMAOptions {
  preset?: number;
  memlimit?: number;
}

type LZMACallback = (result: Buffer | null, error: Error | null) => void;

declare module 'lzma-native' {
  export function compress(
    input: string | Buffer | Uint8Array | number[],
    options?: LZMAOptions | LZMACallback,
    callback?: LZMACallback
  ): Promise<Buffer> | undefined;

  export function decompress(
    input: string | Buffer | Uint8Array | number[],
    options?: LZMAOptions | LZMACallback,
    callback?: LZMACallback
  ): Promise<Buffer> | undefined;
}
