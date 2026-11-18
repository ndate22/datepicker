import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adToBs, bsToAd, daysInMonth, format, formatDate, parse, toNepaliDigits } from '../src/bs.js';

const iso = (d) => d.toISOString().slice(0, 10);

test('known dates (match ndate22/ndate)', () => {
  assert.equal(format(adToBs(new Date(2023, 10, 8))), '2080-07-22');
  assert.equal(iso(bsToAd(2080, 7, 22)), '2023-11-08');
  assert.equal(iso(bsToAd(1970, 1, 1)), '1913-04-13');
  assert.equal(bsToAd(2080, 7, 1).getUTCDay(), 3); // Kartik 2080 starts on Wednesday
});

test('round trip over the whole range', () => {
  for (let t = Date.UTC(1913, 3, 13); t < Date.UTC(2044, 3, 14); t += 86400000 * 7) {
    const d = new Date(t);
    const bs = adToBs(new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
    assert.equal(bsToAd(bs.year, bs.month, bs.day).getTime(), t);
  }
});

test('validation and helpers', () => {
  assert.equal(daysInMonth(2080, 7), 30);
  assert.equal(parse('2080-07-31'), null);
  assert.equal(parse('2101-01-01'), null);
  assert.deepEqual(parse('2080-07-22'), { year: 2080, month: 7, day: 22 });
  assert.throws(() => bsToAd(2080, 7, 31), RangeError);
  assert.equal(toNepaliDigits('2080-07-22'), '२०८०-०७-२२');
});

test('formatDate', () => {
  const d = { year: 2080, month: 7, day: 2 };
  assert.equal(formatDate(d, 'Y-m-d'), '2080-07-02');
  assert.equal(formatDate(d, 'j M Y, l'), '2 Kartik 2080, Thursday');
  assert.equal(formatDate(d, 'D \\d\\a\\y j'), 'Thu day 2');
  assert.equal(formatDate(d, 'j M Y', 'np'), '२ कार्तिक २०८०');
});
