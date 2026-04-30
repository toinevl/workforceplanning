export function sumFte(ftes: number[]): number {
  return Math.round(ftes.reduce((a, b) => a + b, 0) * 10) / 10;
}

export function formatFte(fte: number): string {
  return fte % 1 === 0 ? `${fte}.0` : `${fte}`;
}

export function fteVariance(actual: number, target: number): number {
  return Math.round((actual - target) * 10) / 10;
}
