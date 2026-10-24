export function isCompareAtPriceValid(basePrice: string, compareAtPrice: string | null) {
  if (compareAtPrice === null) return true;
  return toMinorUnits(compareAtPrice) > toMinorUnits(basePrice);
}

function toMinorUnits(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
}
