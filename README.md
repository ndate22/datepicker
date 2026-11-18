# @ndate22/datepicker

Dependency-free Bikram Sambat (BS) datepicker for plain `<input>` elements, plus AD ⇄ BS conversion. Supports BS 1970–2100 (AD 1913-04-13 to 2044-04-14), using the same table as [ndate22/ndate](https://github.com/ndate22/ndate).

## Install

```bash
npm install @ndate22/datepicker
```

## Datepicker

```html
<input id="dob" name="dob">
<input id="dob-ad" name="dob_ad" type="hidden">
```

```js
import { attach } from '@ndate22/datepicker';
import '@ndate22/datepicker/style.css';

const picker = attach(document.getElementById('dob'), {
  lang: 'np',                              // 'en' (default) or 'np'
  weekStart: 1,                            // first weekday column: 0 = Sunday (default) … 6 = Saturday
  weekend: [6],                            // weekdays marked .ndp-weekend (default: Saturday)
  min: '2080-01-01',                       // BS dates; days outside min/max are disabled
  max: '2081-12-30',
  disable: (value, { weekday }) => weekday === 6,  // return true to disable a day
  dayInfo: (value) => holidays[value],             // { label, className } for tooltips / styling
  adInput: document.getElementById('dob-ad'),      // kept in sync with the AD date
  displayFormat: 'j M Y',                  // show '२२ कार्तिक २०८०' in the input
  footer: true,                            // Today / Clear buttons (default true)
  onSelect: (value) => console.log(value), // '2080-07-22', or '' on Clear
});

picker.open(); picker.close(); picker.destroy();
```

The submitted value is always a BS date `YYYY-MM-DD` with ASCII digits, so it posts straight to `Ndate::to_ad()` on the server. Picking or clearing fires a `change` event.

The header has month and year dropdowns plus previous/next arrows, limited to the `min`/`max` range when given. An invalid `min`/`max`, or `min` after `max`, throws `RangeError`. Attaching twice to the same input throws.

The popup opens below the input, or above it when there isn't room below. It stays inside the viewport and follows the input on scroll and resize.

### Disabled days and holidays

Both callbacks get `(value, { year, month, day, weekday })`, where weekday 0 is Sunday, for every visible day.

- `disable` returns `true` to disable the day. It applies on top of `min`/`max`.
- `dayInfo` returns `{ label, className }` or nothing. `label` becomes the tooltip and part of the screen-reader label, and `className` is added to the day button. Style the class yourself.

```js
const holidays = {
  '2080-07-26': { label: 'Laxmi Puja', className: 'holiday' },
  '2080-07-28': { label: 'Bhai Tika', className: 'holiday' },
};
attach(input, { dayInfo: (value) => holidays[value] });
```

```css
.ndp .holiday { color: #dc2626; text-decoration: underline dotted; }
```

### Display format

`displayFormat` shows the date in the input with these tokens:

| Token | Example | |
|---|---|---|
| `d` | `07` | day, 2 digits |
| `j` | `7` | day |
| `m` | `01` | month, 2 digits |
| `n` | `1` | month |
| `Y` | `2080` | year |
| `M` | `Baishak` / `बैशाख` | month name |
| `D` | `Sun` / `आईत` | short weekday |
| `l` | `Sunday` / `आईतवार` | weekday |

Escape a literal letter with `\`. With `lang: 'np'` digits are Devanagari. With `displayFormat` set, the input becomes read-only and its `name` moves to a hidden input inserted after it, which holds the `YYYY-MM-DD` value. `destroy()` undoes this. The same formatter is exported as `formatDate({ year, month, day }, 'j M Y', 'np')`.

### AD value

`adInput` receives the AD date `YYYY-MM-DD` whenever the value changes, whether from the picker or typed in. It's empty while the BS value is invalid. Without `displayFormat` the input still accepts any typed text, so validate on the server.

### From HTML attributes

```html
<input name="dob" data-bs-picker data-lang="np" data-min="2080-01-01" data-format="j M Y" data-ad-input="#dob-ad">
<input id="dob-ad" name="dob_ad" type="hidden">
```

```js
import { attachAll } from '@ndate22/datepicker';

attachAll();                          // every input[data-bs-picker] in the document
attachAll(container, { weekStart: 1 }); // only inside container, with defaults for missing attributes
```

Attributes: `data-lang`, `data-week-start`, `data-weekend="0,6"`, `data-min`, `data-max`, `data-format`, `data-ad-input` (a CSS selector). Inputs that already have a picker are skipped, so call `attachAll()` again after adding inputs. It returns the new pickers. Callback options (`disable`, `dayInfo`, `onSelect`) can only come from `defaults`.

### Classes

`.ndp-today`, `.ndp-selected`, `.ndp-weekend` (day cells and weekday headers), plus any `dayInfo` class.

### Keyboard

| Key | Action |
|---|---|
| `↓` in the input | open and focus the selected day |
| `←` `→` | previous / next day |
| `↑` `↓` | previous / next week |
| `PageUp` `PageDown` | previous / next month |
| `Shift` + `PageUp` `PageDown` | previous / next year |
| `Home` `End` | first / last day of the month |
| `Enter` `Space` | pick the focused day |
| `Esc` | close and return to the input |

Arrow keys skip disabled days.

## Customising

Set any of these variables on `:root` or `.ndp`:

| Variable | Default | Used for |
|---|---|---|
| `--ndp-accent` | `#dc2626` | selected day, today's outline, footer buttons |
| `--ndp-accent-hover` | `#b91c1c` | selected day on hover |
| `--ndp-accent-text` | `#fff` | text on the selected day |
| `--ndp-weekend` | `#dc2626` | weekend day numbers and headers |
| `--ndp-bg` | `#fff` | popup and dropdown background |
| `--ndp-color` | `#111` | text |
| `--ndp-muted` | `#666` | weekday header |
| `--ndp-border` | `#ddd` | popup and dropdown border |
| `--ndp-hover` | `#f1f1f1` | day hover |
| `--ndp-radius` | `6px` | popup corners |
| `--ndp-cell-radius` | `4px` | day and dropdown corners |
| `--ndp-width` | `16rem` | popup width |
| `--ndp-font` | `14px/1.2 system-ui, sans-serif` | font shorthand |
| `--ndp-shadow` | `0 4px 16px rgb(0 0 0 / 0.12)` | popup shadow |
| `--ndp-z-index` | `1000` | stacking |

```css
:root { --ndp-accent: #2563eb; --ndp-accent-hover: #1d4ed8; }

@media (prefers-color-scheme: dark) {
  :root { --ndp-bg: #1f2937; --ndp-color: #f9fafb; --ndp-muted: #9ca3af; --ndp-border: #374151; --ndp-hover: #374151; }
}
```

## Conversion

```js
import { adToBs, bsToAd, daysInMonth, parse, format, toNepaliDigits } from '@ndate22/datepicker';

adToBs(new Date(2023, 10, 8));   // { year: 2080, month: 7, day: 22 }
bsToAd(2080, 7, 22);             // Date 2023-11-08T00:00:00Z
daysInMonth(2080, 7);            // 30
parse('2080-07-31');             // null (invalid)
toNepaliDigits('2080-07-22');    // '२०८०-०७-२२'
```

Out-of-range dates throw `RangeError`.

## Development

```bash
npm test                    # node:test, no dependencies
npx serve .                 # then open demo.html
```

`src/data.js` is generated from `ndate22/ndate`'s `Year::BS`. Regenerate it whenever that table changes.
