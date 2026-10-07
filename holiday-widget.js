// Kazakhstan school calendar 2026/27. Inclusive holidays; school resumes
// on the following date. Explicit UTC+05 avoids the visitor's device timezone.
// Source: https://www.gov.kz/memleket/entities/edu/press/news/details/1266458?lang=ru
(() => {
  const seasons = [
    { id: 'autumn', title: 'Осенние каникулы!', start: '2026-10-26', resume: '2026-11-02', date: '2 ноября', message: 'Лови листья и хорошие моменты!', color: '#ffbd67' },
    { id: 'winter', title: 'Зимние каникулы!', start: '2026-12-28', resume: '2027-01-11', date: '11 января', message: 'Санки, снежки и море улыбок!', color: '#92ddff' },
    { id: 'first-grade', art: 'winter', title: 'Каникулы первоклассников!', start: '2027-02-08', resume: '2027-02-15', date: '15 февраля', message: 'Неделя отдыха для маленьких открывателей!', color: '#92ddff' },
    { id: 'spring', title: 'Весенние каникулы!', start: '2027-03-22', resume: '2027-03-29', date: '29 марта', message: 'Пусть настроение расцветает!', color: '#a9f4b8' }
  ].map(season => ({ ...season, from: Date.parse(`${season.start}T00:00:00+05:00`), until: Date.parse(`${season.resume}T00:00:00+05:00`) }));
  const current = (date = new Date()) => seasons.find(season => +date >= season.from && +date < season.until) || null;
  window.schoolHolidays = { current };
  const card = document.createElement('aside');
  card.className = 'holiday-card';
  card.hidden = true;
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-modal', 'false');
  card.setAttribute('aria-labelledby', 'holiday-title');
  card.innerHTML = `<button class="holiday-close" type="button" aria-label="Закрыть окно каникул">×</button>
    <img class="holiday-art" alt="" width="600" height="400">
    <div class="holiday-content"><span class="holiday-label">УРА! МОЖНО ОТДОХНУТЬ</span>
    <h2 id="holiday-title"></h2><p class="holiday-message"></p>
    <span class="holiday-count-label">До учебного дня осталось</span>
    <div class="holiday-count" role="timer" aria-live="off"><span><b data-unit="days"></b><small>дней</small></span><span><b data-unit="hours"></b><small>часов</small></span><span><b data-unit="minutes"></b><small>минут</small></span><span><b data-unit="seconds"></b><small>секунд</small></span></div>
    <p class="holiday-return"></p></div>`;
  document.body.append(card);
  let dismissed = null;
  let displayed = null;
  card.querySelector('button').addEventListener('click', () => {
    dismissed = displayed;
    card.hidden = true;
  });
  const units = Object.fromEntries([...card.querySelectorAll('[data-unit]')].map(node => [node.dataset.unit, node]));
  function refresh() {
    const now = new Date();
    const season = current(now);
    card.hidden = !season || season.id === dismissed;
    if (!season || card.hidden) return;
    if (displayed !== season.id) {
      displayed = season.id;
      card.style.setProperty('--holiday-accent', season.color);
      card.querySelector('img').src = `./assets/holidays/${season.art || season.id}.jpg`;
      card.querySelector('h2').textContent = season.title;
      card.querySelector('.holiday-message').textContent = season.message;
      card.querySelector('.holiday-return').textContent = `В школу — ${season.date} • время Астаны`;
    }
    const total = Math.max(0, Math.ceil((season.until - now) / 1000));
    const values = { days: Math.floor(total / 86400), hours: Math.floor(total / 3600) % 24, minutes: Math.floor(total / 60) % 60, seconds: total % 60 };
    for (const [unit, value] of Object.entries(values)) units[unit].textContent = String(value).padStart(2, '0');
  }
  refresh();
  setInterval(refresh, 1000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
})();
