export function isKnownAdminRange<T extends Record<string, number>>(
  ranges: T,
  value: string | undefined,
): value is Extract<keyof T, string> {
  return value !== undefined && Object.prototype.hasOwnProperty.call(ranges, value);
}
