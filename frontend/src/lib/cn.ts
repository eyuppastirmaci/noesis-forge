export function cn(...classes: (string | null | undefined)[]): string {
  return classes
    .filter((cls): cls is string => Boolean(cls) && typeof cls === 'string' && cls.trim() !== '')
    .join(' ');
}
