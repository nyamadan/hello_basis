let BasisFile: new (x: Uint8Array) => BasisFile = null;

export function initializeBasisFile(): Promise<new (x: Uint8Array) => BasisFile> {
  return new Promise<new (x: Uint8Array) => BasisFile>((resolve => {
    BASIS().then(basisTransCoder => {
      const {initializeBasis} = basisTransCoder;
      initializeBasis();
      BasisFile = basisTransCoder.BasisFile;
      resolve(BasisFile);
    });
  }));
}

export function createBasisFile(x: Uint8Array): BasisFile {
  if(BasisFile == null) {
    return null;
  }

  return new BasisFile(x);
}
