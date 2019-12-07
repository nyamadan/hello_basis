declare class BasisFile {
  constructor(x: Uint8Array);
  close(): void;
  getHasAlpha(): number;
  getNumImages(): number;
  getNumLevels(imageIndex: number): number;
  getImageWidth(imageIndex: number, levelImdex: number): number;
  getImageHeight(imageIndex: number, levelImdex: number): number;
  getImageTranscodedSizeInBytes(
    imageIndex: number,
    levelImdex: number,
    format: number
  ): number;
  startTranscoding(): number;
  transcodeImage(
    dst: Uint8Array,
    imageIndex: number,
    levelIndex: number,
    format: number,
    unused: number,
    getAlphaForOpaqueFormats: number
  ): number;
  delete(): void;
}

type BasisTranscoder = {
  BasisFile: new (x: Uint8Array) => BasisFile;
  initializeBasis: () => void;
};

declare function BASIS(): {
  then: (callback: (basisTranscoder: BasisTranscoder) => void) => void;
};
