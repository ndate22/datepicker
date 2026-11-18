import { BS_START_YEAR, MONTH_DAYS } from './data.js';

export const BS_END_YEAR = BS_START_YEAR + MONTH_DAYS.length - 1;

// BS 1970-01-01 = AD 1913-04-13
const EPOCH = Date.UTC(1913, 3, 13);
const DAY = 86400000;

export const MONTHS = {
  en: ['Baishak', 'Jestha', 'Ashad', 'Shrawn', 'Bhadra', 'Ashwin', 'Kartik', 'Mangshir', 'Poush', 'Magh', 'Falgun', 'Chaitra'],
  np: ['बैशाख', 'जेठ', 'आषाढ', 'साउन', 'भाद्र', 'आश्विन', 'कार्तिक', 'मंसिर', 'पौष', 'माघ', 'फाल्गुण', 'चैत्र'],
};

export const WEEKDAYS = {
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  np: ['आईत', 'सोम', 'मंगल', 'बुध', 'बिही', 'शुक्र', 'शनि'],
};

export const WEEKDAYS_FULL = {
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  np: ['आईतवार', 'सोमबार', 'मंगलवार', 'बुधवार', 'बिहीवार', 'शुक्रबार', 'शनिबार'],
};

export function daysInMonth(year, month) {
  const row = MONTH_DAYS[year - BS_START_YEAR];
  if (!row || month < 1 || month > 12) throw new RangeError(`Invalid BS month: ${year}-${month}`);
  return row[month - 1];
}

/** BS date -> AD Date (UTC midnight) */
export function bsToAd(year, month, day) {
  if (day < 1 || day > daysInMonth(year, month)) throw new RangeError(`Invalid BS date: ${year}-${month}-${day}`);
  let days = day - 1;
  for (let y = BS_START_YEAR; y < year; y++) days += MONTH_DAYS[y - BS_START_YEAR].reduce((a, b) => a + b, 0);
  for (let m = 1; m < month; m++) days += daysInMonth(year, m);
  return new Date(EPOCH + days * DAY);
}

/** AD Date (its local calendar day) -> { year, month, day } in BS */
export function adToBs(date) {
  let days = Math.round((Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) - EPOCH) / DAY);
  if (days < 0) throw new RangeError('Date before BS 1970');
  for (let y = 0; y < MONTH_DAYS.length; y++) {
    for (let m = 0; m < 12; m++) {
      if (days < MONTH_DAYS[y][m]) return { year: BS_START_YEAR + y, month: m + 1, day: days + 1 };
      days -= MONTH_DAYS[y][m];
    }
  }
  throw new RangeError(`Date after BS ${BS_END_YEAR}`);
}

export function toNepaliDigits(value) {
  return String(value).replace(/\d/g, (d) => '०१२३४५६७८९'[d]);
}

export function format({ year, month, day }) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

/** 'YYYY-MM-DD' -> { year, month, day } or null if not a valid BS date */
export function parse(value) {
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(value || '');
  if (!m) return null;
  const d = { year: +m[1], month: +m[2], day: +m[3] };
  try {
    return d.day >= 1 && d.day <= daysInMonth(d.year, d.month) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Format a BS date with ndate-style tokens: d (07) j (7) m (07) n (7) Y (2080) M (month name) D (short weekday) l (weekday).
 * Backslash escapes a character. 'np' also converts digits to Devanagari.
 */
export function formatDate(d, pattern, lang = 'en') {
  const weekday = bsToAd(d.year, d.month, d.day).getUTCDay();
  const pad = (n) => String(n).padStart(2, '0');
  const tokens = {
    d: pad(d.day), j: d.day, m: pad(d.month), n: d.month, Y: d.year,
    M: MONTHS[lang][d.month - 1], D: WEEKDAYS[lang][weekday], l: WEEKDAYS_FULL[lang][weekday],
  };
  const out = pattern.replace(/\\(.)|([djmnYMDl])/g, (_, escaped, token) => escaped ?? String(tokens[token]));
  return lang === 'np' ? toNepaliDigits(out) : out;
}
