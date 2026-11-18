import { adToBs, BS_END_YEAR, bsToAd, daysInMonth, format, formatDate, MONTHS, parse, toNepaliDigits, WEEKDAYS } from './bs.js';
import { BS_START_YEAR } from './data.js';

const DAY_STEP = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
const LABELS = { en: { today: 'Today', clear: 'Clear' }, np: { today: 'आज', clear: 'हटाउनुहोस्' } };
const attached = new WeakSet();
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/**
 * Attach a BS datepicker popup to a text input. The submitted value is a BS date 'YYYY-MM-DD'.
 *
 * @typedef {{ year: number, month: number, day: number, weekday: number }} DayDate  weekday 0 = Sunday
 * @param {HTMLInputElement} input
 * @param {{
 *   lang?: 'en'|'np',
 *   weekStart?: number,
 *   weekend?: number[],
 *   min?: string,
 *   max?: string,
 *   disable?: (value: string, date: DayDate) => boolean,
 *   dayInfo?: (value: string, date: DayDate) => ({ label?: string, className?: string } | null | undefined),
 *   adInput?: HTMLInputElement,
 *   displayFormat?: string,
 *   footer?: boolean,
 *   onSelect?: (value: string) => void,
 * }} [options]
 *   weekStart: first column of the week, 0 = Sunday (default) … 6 = Saturday
 *   weekend: weekdays marked .ndp-weekend, default [6] (Saturday)
 *   min / max: BS dates 'YYYY-MM-DD'; days outside are disabled
 *   disable: return true to disable a day
 *   dayInfo: label (tooltip) and/or extra CSS class for a day, e.g. holidays
 *   adInput: kept in sync with the AD date 'YYYY-MM-DD' (empty when the BS value is invalid)
 *   displayFormat: show the date in the input with formatDate() tokens (e.g. 'j M Y'); the input becomes
 *     read-only and its name moves to a hidden input that holds the 'YYYY-MM-DD' value
 *   footer: show Today / Clear buttons (default true)
 *   onSelect: called with the picked value, or '' on Clear
 * @returns {{ open: () => void, close: () => void, destroy: () => void }}
 */
export function attach(input, options = {}) {
  const { lang = 'en', weekStart = 0, weekend = [6], min, max, disable, dayInfo, adInput, displayFormat, footer = true, onSelect } = options;
  if (attached.has(input)) throw new Error('@ndate22/datepicker is already attached to this input');
  if (!Number.isInteger(weekStart) || weekStart < 0 || weekStart > 6) throw new RangeError('weekStart must be an integer 0–6');
  const lo = min == null ? { year: BS_START_YEAR, month: 1, day: 1 } : parse(min);
  const hi = max == null ? { year: BS_END_YEAR, month: 12, day: daysInMonth(BS_END_YEAR, 12) } : parse(max);
  if (!lo || !hi || format(lo) > format(hi)) throw new RangeError(`Invalid min/max: ${min} – ${max}`);
  const [minStr, maxStr] = [format(lo), format(hi)];
  const ym = (d) => d.year * 12 + d.month;
  const clamp = (v) => (ym(v) < ym(lo) ? { year: lo.year, month: lo.month } : ym(v) > ym(hi) ? { year: hi.year, month: hi.month } : v);
  const num = (n) => (lang === 'np' ? toNepaliDigits(n) : String(n));
  const withWeekday = (value) => {
    const d = parse(value);
    return { ...d, weekday: bsToAd(d.year, d.month, d.day).getUTCDay() };
  };
  const isDisabled = (value, date) => value < minStr || value > maxStr || Boolean(disable?.(value, date || withWeekday(value)));

  /** value moved by n days, or null if that leaves the supported range */
  const shift = (value, n) => {
    const ad = bsToAd(...value.split('-').map(Number));
    try {
      return format(adToBs(new Date(ad.getUTCFullYear(), ad.getUTCMonth(), ad.getUTCDate() + n)));
    } catch {
      return null;
    }
  };

  // With displayFormat the visible input shows text; a hidden input carries the name and the real value.
  let valueInput = input;
  const originalName = input.getAttribute('name');
  const originalReadOnly = input.readOnly;
  if (displayFormat) {
    valueInput = document.createElement('input');
    valueInput.type = 'hidden';
    valueInput.value = input.value;
    if (originalName) valueInput.name = originalName;
    input.removeAttribute('name');
    input.readOnly = true;
    input.after(valueInput);
  }

  const popup = document.createElement('div');
  popup.className = 'ndp';
  popup.hidden = true;
  popup.setAttribute('role', 'dialog');
  document.body.append(popup);

  let view; // { year, month } being shown
  let focusDate; // day button that is tabbable / keyboard-focused
  let refocusing = false; // input.focus() after picking must not reopen the popup
  const years = Array.from({ length: hi.year - lo.year + 1 }, (_, i) => lo.year + i);
  const option = (value, label, current, disabled = false) =>
    `<option value="${value}"${value === current ? ' selected' : ''}${disabled ? ' disabled' : ''}>${label}</option>`;

  function render() {
    const today = format(adToBs(new Date()));
    const selected = valueInput.value;
    const firstWeekday = bsToAd(view.year, view.month, 1).getUTCDay();
    const offset = (firstWeekday - weekStart + 7) % 7;
    const days = daysInMonth(view.year, view.month);
    const columns = [0, 1, 2, 3, 4, 5, 6].map((i) => (i + weekStart) % 7);

    let html = `<div class="ndp-head">
      <button type="button" data-nav="-1" aria-label="Previous month" ${ym(view) <= ym(lo) ? 'disabled' : ''}>‹</button>
      <select data-pick="month" aria-label="Month">${MONTHS[lang].map((name, i) => {
        const m = ym({ year: view.year, month: i + 1 });
        return option(i + 1, name, view.month, m < ym(lo) || m > ym(hi));
      }).join('')}</select>
      <select data-pick="year" aria-label="Year">${years.map((y) => option(y, num(y), view.year)).join('')}</select>
      <button type="button" data-nav="1" aria-label="Next month" ${ym(view) >= ym(hi) ? 'disabled' : ''}>›</button>
    </div><div class="ndp-grid">`;
    html += columns.map((w) => `<span class="ndp-wd${weekend.includes(w) ? ' ndp-weekend' : ''}">${WEEKDAYS[lang][w]}</span>`).join('');
    html += '<span></span>'.repeat(offset);
    for (let d = 1; d <= days; d++) {
      const value = format({ year: view.year, month: view.month, day: d });
      const date = { year: view.year, month: view.month, day: d, weekday: (firstWeekday + d - 1) % 7 };
      const info = dayInfo?.(value, date) || {};
      const cls = [
        value === today && 'ndp-today',
        weekend.includes(date.weekday) && 'ndp-weekend',
        value === selected && 'ndp-selected',
        info.className,
      ].filter(Boolean).join(' ');
      html += `<button type="button" data-date="${value}" class="${esc(cls)}" tabindex="${value === focusDate ? 0 : -1}"`
        + ` aria-label="${esc(info.label ? `${value}, ${info.label}` : value)}"${info.label ? ` title="${esc(info.label)}"` : ''}`
        + `${isDisabled(value, date) ? ' disabled' : ''}>${num(d)}</button>`;
    }
    html += '</div>';
    if (footer) {
      html += `<div class="ndp-foot">
        <button type="button" data-act="today"${isDisabled(today) ? ' disabled' : ''}>${LABELS[lang].today}</button>
        <button type="button" data-act="clear">${LABELS[lang].clear}</button>
      </div>`;
    }
    popup.innerHTML = html;
    if (!popup.hidden) position();
  }

  /** Below the input, or above it when there is no room below; kept inside the viewport horizontally */
  function position() {
    const r = input.getBoundingClientRect();
    const h = popup.offsetHeight;
    const above = r.bottom + h + 4 > innerHeight && r.top >= h + 4;
    const left = Math.max(0, Math.min(r.left, document.documentElement.clientWidth - popup.offsetWidth));
    popup.style.left = `${left + scrollX}px`;
    popup.style.top = `${(above ? r.top - h - 4 : r.bottom + 4) + scrollY}px`;
  }

  /** Show the month of `value` with that day focusable; focus it when `focus` is true */
  function goTo(value, focus = false) {
    const d = parse(value);
    view = clamp({ year: d.year, month: d.month });
    focusDate = value;
    render();
    if (focus) popup.querySelector(`[data-date="${value}"]`)?.focus();
  }

  function open() {
    if (refocusing || !popup.hidden) return;
    popup.hidden = false;
    goTo(format(parse(valueInput.value) || adToBs(new Date())));
    addEventListener('scroll', position, { capture: true, passive: true });
    addEventListener('resize', position);
  }

  function close() {
    popup.hidden = true;
    removeEventListener('scroll', position, { capture: true });
    removeEventListener('resize', position);
  }

  function showValue() {
    if (!displayFormat) return;
    const d = parse(valueInput.value);
    input.value = d ? formatDate(d, displayFormat, lang) : '';
  }

  function syncAd() {
    if (!adInput) return;
    const d = parse(valueInput.value);
    adInput.value = d ? bsToAd(d.year, d.month, d.day).toISOString().slice(0, 10) : '';
  }

  function refocusInput() {
    refocusing = true;
    input.focus();
    refocusing = false;
  }

  /** Set the value ('' clears), fire change, close */
  function pick(value) {
    valueInput.value = value;
    showValue();
    valueInput.dispatchEvent(new Event('change', { bubbles: true }));
    if (valueInput !== input) input.dispatchEvent(new Event('change', { bubbles: true }));
    onSelect?.(value);
    close();
    refocusInput();
  }

  function onPopupChange(e) {
    const key = e.target.dataset.pick;
    if (!key) return;
    view = clamp({ ...view, [key]: Number(e.target.value) });
    render();
    popup.querySelector(`[data-pick="${key}"]`).focus();
  }

  function onPopupClick(e) {
    const btn = e.target.closest('button');
    if (!btn) return;
    if (btn.dataset.nav) {
      const m = view.month - 1 + Number(btn.dataset.nav);
      view = { year: view.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 + 1 };
      render();
    } else if (btn.dataset.act) {
      pick(btn.dataset.act === 'today' ? format(adToBs(new Date())) : '');
    } else {
      pick(btn.dataset.date);
    }
  }

  /** Arrow keys move by day/week, PageUp/PageDown by month (Shift: year), Home/End to month start/end */
  function onGridKey(e) {
    const from = e.target.dataset?.date;
    if (!from) return;
    const d = parse(from);
    let target;
    let step;

    if (e.key in DAY_STEP) {
      step = DAY_STEP[e.key];
      target = shift(from, step);
    } else if (e.key === 'PageUp' || e.key === 'PageDown') {
      step = e.key === 'PageUp' ? -1 : 1;
      const m = d.month - 1 + step * (e.shiftKey ? 12 : 1);
      const year = d.year + Math.floor(m / 12);
      const month = ((m % 12) + 12) % 12 + 1;
      if (year < BS_START_YEAR || year > BS_END_YEAR) return e.preventDefault();
      target = format({ year, month, day: Math.min(d.day, daysInMonth(year, month)) });
      target = target < minStr ? minStr : target > maxStr ? maxStr : target;
    } else if (e.key === 'Home' || e.key === 'End') {
      step = e.key === 'Home' ? 1 : -1;
      target = format({ ...d, day: step === 1 ? 1 : daysInMonth(d.year, d.month) });
    } else {
      return;
    }
    e.preventDefault();

    // ponytail: gives up after a year of disabled days rather than scanning the whole range
    const dir = Math.sign(step);
    for (let i = 0; i < 366 && target && isDisabled(target) && target >= minStr && target <= maxStr; i++) target = shift(target, dir);
    if (target && !isDisabled(target)) goTo(target, true);
  }

  const onDocClick = (e) => {
    if (e.target !== input && !popup.contains(e.target)) close();
  };
  const onInputKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      open();
      const btn = popup.querySelector(`[data-date="${focusDate}"]:not(:disabled)`) || popup.querySelector('[data-date]:not(:disabled)');
      btn?.focus();
    }
  };
  const onPopupKey = (e) => {
    if (e.key === 'Escape') {
      close();
      refocusInput();
    } else {
      onGridKey(e);
    }
  };

  input.setAttribute('autocomplete', 'off');
  input.addEventListener('focus', open);
  input.addEventListener('click', open);
  input.addEventListener('keydown', onInputKey);
  valueInput.addEventListener('change', syncAd);
  popup.addEventListener('keydown', onPopupKey);
  popup.addEventListener('click', onPopupClick);
  popup.addEventListener('change', onPopupChange);
  document.addEventListener('mousedown', onDocClick);
  attached.add(input);
  showValue();
  syncAd();

  return {
    open,
    close,
    destroy() {
      close();
      input.removeEventListener('focus', open);
      input.removeEventListener('click', open);
      input.removeEventListener('keydown', onInputKey);
      valueInput.removeEventListener('change', syncAd);
      document.removeEventListener('mousedown', onDocClick);
      popup.remove();
      if (valueInput !== input) {
        input.value = valueInput.value;
        input.readOnly = originalReadOnly;
        if (originalName) input.setAttribute('name', originalName);
        valueInput.remove();
      }
      attached.delete(input);
    },
  };
}

/**
 * Attach to every `[data-bs-picker]` input under `root` that has no picker yet. Options come from data attributes
 * (data-lang, data-week-start, data-weekend="0,6", data-min, data-max, data-format, data-ad-input="#selector"),
 * falling back to `defaults`.
 *
 * @returns {ReturnType<typeof attach>[]}
 */
export function attachAll(root = document, defaults = {}) {
  return [...root.querySelectorAll('input[data-bs-picker]')]
    .filter((input) => !attached.has(input))
    .map((input) => {
      const ds = input.dataset;
      const fromData = {
        lang: ds.lang,
        weekStart: ds.weekStart == null ? undefined : Number(ds.weekStart),
        weekend: ds.weekend == null ? undefined : ds.weekend.split(',').filter(Boolean).map(Number),
        min: ds.min,
        max: ds.max,
        displayFormat: ds.format,
        adInput: ds.adInput ? document.querySelector(ds.adInput) : undefined,
      };
      Object.keys(fromData).forEach((k) => fromData[k] === undefined && delete fromData[k]);
      return attach(input, { ...defaults, ...fromData });
    });
}

export * from './bs.js';
