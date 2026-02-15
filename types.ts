export enum CipherMode {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT'
}

export interface CipherLayerStep {
  name: string;
  description: string;
  output: string;
  grid?: string[][]; // For grid visualization
}

export interface CipherResult {
  final: string;
  steps: CipherLayerStep[];
}
