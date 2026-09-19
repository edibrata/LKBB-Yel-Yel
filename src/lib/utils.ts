import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format angka atau skor penilaian:
 * - Jika bilangan bulat: tampilkan bilangan bulat tanpa desimal (contoh: 100, 85, 0)
 * - Jika memiliki desimal: dibatasi HANYA dua angka di belakang koma (contoh: 85.50, 167.92)
 */
export function formatScore(val: number | string | null | undefined): string {
  if (val === null || val === undefined || val === '') return '-';
  const num = Number(val);
  if (isNaN(num)) return '-';
  const rounded = Math.round((num + Number.EPSILON) * 100) / 100;
  if (Number.isInteger(rounded)) {
    return rounded.toString();
  }
  return rounded.toFixed(2);
}

/**
 * Membulatkan angka ke maksimal 2 angka desimal untuk perhitungan matematis
 */
export function roundTwoDecimals(val: number | null | undefined): number {
  if (val === null || val === undefined || isNaN(val)) return 0;
  return Math.round((Number(val) + Number.EPSILON) * 100) / 100;
}
