/** Returns an exact pictograph scale that never rounds category values. */
export function getExactPictographUnit(values: number[], maxSymbols = 15): number | null {
  if (!values.length || !Number.isSafeInteger(maxSymbols) || maxSymbols < 1) return null;
  if (values.some((value) => !Number.isSafeInteger(value) || value < 0)) return null;

  const positiveValues = values.filter((value) => value > 0);
  if (!positiveValues.length) return null;

  const gcd = (first: number, second: number): number => {
    let a = first;
    let b = second;
    while (b !== 0) {
      const remainder = a % b;
      a = b;
      b = remainder;
    }
    return a;
  };

  const unit = positiveValues.reduce((current, value) => gcd(current, value));
  const largestSymbolCount = Math.max(...values.map((value) => value / unit));
  return Number.isSafeInteger(largestSymbolCount) && largestSymbolCount <= maxSymbols
    ? unit
    : null;
}
