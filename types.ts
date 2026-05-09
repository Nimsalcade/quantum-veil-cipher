export enum CipherMode {
  ENCRYPT = 'ENCRYPT',
  DECRYPT = 'DECRYPT'
}

export interface CipherLayerStep {
  name: string;
  description: string;
  output: string;
  grid?: string[][];
}

export interface CipherResult {
  final: string;
  steps: CipherLayerStep[];
  entropyScore: number;
}

export interface SecurityOptions {
  useAES: boolean;
  useHMAC: boolean;
}
