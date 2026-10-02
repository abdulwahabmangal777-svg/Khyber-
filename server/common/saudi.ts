// Saudi Arabia Domain Specific Utilities
// - Arabic / English Plate Mapping
// - 10-Digit Iqama / National ID Validation
// - Saudi Phone Number Normalization
// - Hijri Calendar Formatting

export const SAUDI_PLATE_LETTER_MAP: Record<string, string> = {
  'A': 'أ', 'B': 'ب', 'J': 'ح', 'D': 'د', 'R': 'ر',
  'S': 'س', 'X': 'ص', 'T': 'ط', 'E': 'ع', 'G': 'ق',
  'K': 'ك', 'L': 'ل', 'Z': 'م', 'N': 'ن', 'H': 'هـ',
  'U': 'و', 'V': 'ى', 'Y': 'ي'
};

export const REVERSE_SAUDI_PLATE_LETTER_MAP: Record<string, string> = Object.entries(SAUDI_PLATE_LETTER_MAP).reduce(
  (acc, [en, ar]) => {
    acc[ar] = en;
    return acc;
  },
  {} as Record<string, string>
);

export function convertEnglishPlateLettersToArabic(lettersEn: string): string {
  if (!lettersEn) return '';
  return lettersEn
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .split('')
    .map(char => SAUDI_PLATE_LETTER_MAP[char] || char)
    .join(' ');
}

export function convertArabicDigitsToWestern(digitsAr: string): string {
  if (!digitsAr) return '';
  const arDigits = '٠١٢٣٤٥٦٧٨٩';
  return digitsAr.replace(/[٠-٩]/g, d => arDigits.indexOf(d).toString());
}

export function convertWesternDigitsToArabic(digits: string): string {
  if (!digits) return '';
  const arDigits = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
  return digits.split('').map(d => {
    const n = parseInt(d, 10);
    return isNaN(n) ? d : arDigits[n];
  }).join('');
}

export function validateSaudiIqamaNumber(iqama: string): { isValid: boolean; type: 'CITIZEN' | 'RESIDENT' | 'INVALID'; error?: string } {
  if (!iqama) {
    return { isValid: false, type: 'INVALID', error: 'Iqama/National ID is required' };
  }
  const clean = iqama.trim().replace(/\D/g, '');
  if (clean.length !== 10) {
    return { isValid: false, type: 'INVALID', error: 'Saudi ID must be exactly 10 numeric digits' };
  }
  const firstDigit = clean[0];
  if (firstDigit === '1') {
    return { isValid: true, type: 'CITIZEN' }; // Saudi Citizen National ID
  } else if (firstDigit === '2') {
    return { isValid: true, type: 'RESIDENT' }; // Resident Iqama (Muqeem)
  }
  return { isValid: false, type: 'INVALID', error: 'Saudi ID must begin with 1 (National ID) or 2 (Iqama)' };
}

export function normalizeSaudiPhone(phone: string): string {
  if (!phone) return '';
  let clean = phone.replace(/[^\d+]/g, '');
  if (clean.startsWith('05')) {
    clean = '+966' + clean.slice(1);
  } else if (clean.startsWith('5')) {
    clean = '+966' + clean;
  } else if (clean.startsWith('966')) {
    clean = '+' + clean;
  }
  return clean;
}

export function formatHijriDate(date: Date | string): string {
  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime())) return '';
    return new Intl.DateTimeFormat('ar-SA-u-ca-islamic-umalqura', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    }).format(d);
  } catch {
    return '';
  }
}
