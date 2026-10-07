const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const project = path.resolve(__dirname, '..');

function fixture(iso) {
  let now = Date.parse(iso);
  const nodes = new Map();
  const callbacks = [];
  function node(name) {
    if (!nodes.has(name)) nodes.set(name, {
      hidden: true, innerHTML: '', textContent: '', dataset: { unit: name },
      style: { setProperty() {} }, classList: { toggle() {} },
      setAttribute() {}, addEventListener(event, handler) { this[event] = handler; },
      querySelector: node, querySelectorAll() { return ['days', 'hours', 'minutes', 'seconds'].map(node); }
    });
    return nodes.get(name);
  }
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const context = vm.createContext({ Date: Clock, Intl,
    window: { addEventListener() {}, innerWidth: 390, innerHeight: 780 },
    document: { createElement: () => node('card'), body: { append() {} },
      getElementById: node, querySelectorAll: () => [], addEventListener() {} },
    setInterval: callback => callbacks.push(callback)
  });
  vm.runInContext(fs.readFileSync(path.join(project, 'holiday-widget.js'), 'utf8'), context);
  vm.runInContext(fs.readFileSync(path.join(project, 'script.js'), 'utf8'), context);
  return { context, node, advance(iso) { now = Date.parse(iso); callbacks.forEach(fn => fn()); } };
}

for (const [season, start, resume, art = season] of [
  ['autumn', '2026-10-26', '2026-11-02'],
  ['winter', '2026-12-28', '2027-01-11'],
  ['first-grade', '2027-02-08', '2027-02-15', 'winter'],
  ['spring', '2027-03-22', '2027-03-29']
]) {
  const f = fixture(`${start}T00:00:00+05:00`);
  assert.equal(f.context.window.schoolHolidays.current().id, season);
  assert.equal(f.node('card').hidden, false);
  assert.match(f.node('img').src, new RegExp(`${art}.jpg$`));
  assert.equal(f.context.window.schoolHolidays.current(new Date(Date.parse(`${start}T00:00:00+05:00`) - 1)), null);
  f.advance(`${start}T08:42:00+05:00`);
  assert.equal(f.node('break-card').hidden, true, 'No school-break popup during holidays');
  assert.doesNotMatch(f.node('schedule').innerHTML, /is-current/);
  f.advance(`${resume}T00:00:00+05:00`);
  assert.equal(f.node('card').hidden, true);
  assert.equal(f.context.window.schoolHolidays.current(), null);
  f.advance(`${resume}T08:10:00+05:00`);
  assert.match(f.node('schedule').innerHTML, /is-current/, 'School highlighting returns');
}
const f = fixture('2026-11-01T23:59:59+05:00');
assert.equal(f.node('days').textContent, '00');
assert.equal(f.node('seconds').textContent, '01');
f.node('button').click();
f.advance('2026-11-01T23:59:59.500+05:00');
assert.equal(f.node('card').hidden, true, 'Closed window stays closed');
assert.equal(fixture('2026-11-01T23:59:59+05:00').node('card').hidden, false, 'Reload shows it again');
assert.equal(fixture('2026-10-06T08:42:00+05:00').node('card').hidden, true, 'No popup outside holidays');
assert.equal(fixture('2027-02-08T08:10:00+05:00').node('card').hidden, false, 'First-grade holidays apply');
console.log('Holiday boundaries, countdown, dismissal/reload and timetable integration passed.');

// Check every bell boundary for all five school days.
const starts = ['08:00', '08:45', '09:40', '10:25'];
const ends = ['08:40', '09:25', '10:20', '11:05'];
const counts = [4, 4, 4, 4, 4];
for (let day = 0; day < 5; day++) {
  const date = `2026-10-${String(5 + day).padStart(2, '0')}`;
  const f = fixture(`${date}T07:59:59+05:00`);
  const state = () => vm.runInContext('astanaState()', f.context);
  assert.equal(state().period, null);
  for (let slot = 0; slot < counts[day]; slot++) {
    f.advance(`${date}T${starts[slot]}:00+05:00`);
    assert.equal(state().period, slot + 1, `Day ${day}, lesson ${slot + 1}`);
    assert.equal(f.node('break-card').hidden, true);
    assert.equal((f.node('schedule').innerHTML.match(/aria-current="true"/g) || []).length, 1);
    f.advance(`${date}T${ends[slot]}:00+05:00`);
    assert.equal(state().period, null);
    assert.equal(f.node('break-card').hidden, slot === counts[day] - 1);
    assert.doesNotMatch(f.node('schedule').innerHTML, /is-current/);
  }
  f.advance(`${date}T12:10:00+05:00`);
  assert.equal(state().period, null);
}
const pause = fixture('2026-10-06T09:25:00+05:00');
assert.equal(pause.node('break-clock').textContent, '15:00');
assert.match(pause.node('break-next').textContent, /Букварь/);
pause.node('break-close').click();
pause.advance('2026-10-06T09:38:59+05:00');
assert.equal(pause.node('break-card').hidden, true);
pause.advance('2026-10-06T09:39:00+05:00');
assert.equal(pause.node('break-card').hidden, false, 'One-minute reminder reopens');
assert.equal(pause.node('break-clock').textContent, '01:00');
assert.equal(pause.node('break-title').textContent, 'Скоро звонок!');
pause.node('break-close').click();
pause.advance('2026-10-06T09:39:30+05:00');
assert.equal(pause.node('break-card').hidden, true);
pause.advance('2026-10-06T10:20:00+05:00');
assert.equal(pause.node('break-card').hidden, false, 'Next break is visible');
assert.equal(pause.node('break-clock').textContent, '05:00');
for (const date of ['2026-10-10', '2026-10-11']) {
  const weekend = fixture(`${date}T08:42:00+05:00`);
  assert.equal(weekend.node('break-card').hidden, true);
  assert.doesNotMatch(weekend.node('schedule').innerHTML, /is-current/);
}
console.log('All 20 lesson boundaries, 5/15-minute breaks, dismissal, urgent reminder and weekends passed.');

const data = fixture('2026-10-05T07:00:00+05:00');
assert.equal(vm.runInContext('days.flatMap(day => day.lessons).length', data.context), 20);
assert.equal(vm.runInContext("days.every(day => day.lessons.every(lesson => lesson[3] === '232'))", data.context), true);
assert.equal(vm.runInContext('lessonCountLabel(4)', data.context), '4 урока');
assert.match(pause.node('break-room').textContent, /Каб. 232/);
assert.equal(fixture('2027-02-07T23:59:59+05:00').node('card').hidden, true);
assert.equal(fixture('2027-02-14T23:59:59+05:00').node('seconds').textContent, '01');
