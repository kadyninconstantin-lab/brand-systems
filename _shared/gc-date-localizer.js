/**
 * gc-date-localizer — v1.4.0
 * Localizes event dates on GetCourse landing pages.
 *
 * Usage (fixed date):
 *   <span data-gc-date="2025-11-04T11:00" data-gc-tz="Australia/Sydney"></span>
 *
 * Usage (daily recurring — always shows next upcoming occurrence):
 *   <span data-gc-date="daily" data-gc-time="11:00" data-gc-tz="Australia/Sydney" data-gc-format="relative"></span>
 *
 * Usage (daily with early restart — flip to next day at 09:00 even though webinar is at 11:00):
 *   <span data-gc-date="daily" data-gc-time="11:00" data-gc-tz="Europe/Berlin"
 *         data-gc-restart="09:00" data-gc-format="relative"></span>
 *
 * Usage (автовебинар «у всех 20:00 по местному» — час задан в таймзоне ПОСЕТИТЕЛЯ):
 *   <span data-gc-date="daily" data-gc-time="20:00" data-gc-tz="local" data-gc-format="relative"></span>
 *   <span data-gc-date="daily" data-gc-time="20:00" data-gc-tz="local" data-gc-format="zone"></span>
 *
 * data-gc-tz: IANA-зона источника | "local" (= таймзона посетителя). По умолчанию UTC.
 * Formats: datetime (default) | time | date | weekdate | relative | full | city | zone
 */
(function () {

  // ── Constants ─────────────────────────────────────────────────────────────
  var ATTR_DATE    = 'data-gc-date';
  var ATTR_TIME    = 'data-gc-time';
  var ATTR_TZ      = 'data-gc-tz';
  var ATTR_FORMAT  = 'data-gc-format';
  var ATTR_OFFSET  = 'data-gc-offset';
  var ATTR_RESTART = 'data-gc-restart';
  var ATTR_DONE    = 'data-gc-date-done';
  var SELECTOR    = '[' + ATTR_DATE + ']:not([' + ATTR_DONE + '])';

  // ── Locale ────────────────────────────────────────────────────────────────
  // По умолчанию — язык браузера. Страница может форсировать язык подписей
  // (window.GC_DATE_LANG='ru' перед подключением скрипта): у русскоязычного
  // посетителя за границей navigator.language часто en, а лендинг русский.
  var forcedLang = (window.GC_DATE_LANG || '').toLowerCase();
  var isRu   = forcedLang
                 ? forcedLang.indexOf('ru') === 0
                 : (navigator.language || '').toLowerCase().indexOf('ru') === 0;
  var locale = isRu ? 'ru-RU' : 'en-US';

  var labels = {
    today:          isRu ? 'сегодня в'       : 'today at',
    tomorrow:       isRu ? 'завтра в'        : 'tomorrow at',
    dayAfter:       isRu ? 'послезавтра в'   : 'the day after tomorrow at',
  };

  // ── Known city short names (for datetime/full formats) ────────────────────
  // Intl.DateTimeFormat 'long' names are verbose — use a curated map instead.
  var CITY_MAP = {
    // Россия — все 11 зон (UTC+2…+12)
    'Europe/Kaliningrad':     isRu ? 'Калининград'   : 'Kaliningrad',
    'Europe/Moscow':          isRu ? 'Москва'        : 'Moscow',
    'Europe/Simferopol':      isRu ? 'Симферополь'   : 'Simferopol',
    'Europe/Kirov':           isRu ? 'Киров'         : 'Kirov',
    'Europe/Volgograd':       isRu ? 'Волгоград'     : 'Volgograd',
    'Europe/Astrakhan':       isRu ? 'Астрахань'     : 'Astrakhan',
    'Europe/Saratov':         isRu ? 'Саратов'       : 'Saratov',
    'Europe/Ulyanovsk':       isRu ? 'Ульяновск'     : 'Ulyanovsk',
    'Europe/Samara':          isRu ? 'Самара'        : 'Samara',
    'Asia/Yekaterinburg':     isRu ? 'Екатеринбург'  : 'Yekaterinburg',
    'Asia/Omsk':              isRu ? 'Омск'          : 'Omsk',
    'Asia/Novosibirsk':       isRu ? 'Новосибирск'   : 'Novosibirsk',
    'Asia/Barnaul':           isRu ? 'Барнаул'       : 'Barnaul',
    'Asia/Tomsk':             isRu ? 'Томск'         : 'Tomsk',
    'Asia/Novokuznetsk':      isRu ? 'Новокузнецк'   : 'Novokuznetsk',
    'Asia/Krasnoyarsk':       isRu ? 'Красноярск'    : 'Krasnoyarsk',
    'Asia/Irkutsk':           isRu ? 'Иркутск'       : 'Irkutsk',
    'Asia/Chita':             isRu ? 'Чита'          : 'Chita',
    'Asia/Yakutsk':           isRu ? 'Якутск'        : 'Yakutsk',
    'Asia/Khandyga':          isRu ? 'Хандыга'       : 'Khandyga',
    'Asia/Vladivostok':       isRu ? 'Владивосток'   : 'Vladivostok',
    'Asia/Ust-Nera':          isRu ? 'Усть-Нера'     : 'Ust-Nera',
    'Asia/Magadan':           isRu ? 'Магадан'       : 'Magadan',
    'Asia/Sakhalin':          isRu ? 'Южно-Сахалинск': 'Yuzhno-Sakhalinsk',
    'Asia/Srednekolymsk':     isRu ? 'Среднеколымск' : 'Srednekolymsk',
    'Asia/Kamchatka':         isRu ? 'Камчатка'      : 'Kamchatka',
    'Asia/Anadyr':            isRu ? 'Анадырь'       : 'Anadyr',
    // СНГ и соседи
    'Europe/Kyiv':            isRu ? 'Киев'          : 'Kyiv',
    'Europe/Kiev':            isRu ? 'Киев'          : 'Kyiv',
    'Europe/Minsk':           isRu ? 'Минск'         : 'Minsk',
    'Europe/Chisinau':        isRu ? 'Кишинёв'       : 'Chisinau',
    'Europe/Riga':            isRu ? 'Рига'          : 'Riga',
    'Europe/Vilnius':         isRu ? 'Вильнюс'       : 'Vilnius',
    'Europe/Tallinn':         isRu ? 'Таллин'        : 'Tallinn',
    'Asia/Almaty':            isRu ? 'Алматы'        : 'Almaty',
    'Europe/Almaty':          isRu ? 'Алматы'        : 'Almaty',
    'Asia/Aqtobe':            isRu ? 'Актобе'        : 'Aqtobe',
    'Asia/Atyrau':            isRu ? 'Атырау'        : 'Atyrau',
    'Asia/Oral':              isRu ? 'Уральск'       : 'Oral',
    'Asia/Qostanay':          isRu ? 'Костанай'      : 'Qostanay',
    'Asia/Qyzylorda':         isRu ? 'Кызылорда'     : 'Qyzylorda',
    'Asia/Bishkek':           isRu ? 'Бишкек'        : 'Bishkek',
    'Asia/Tashkent':          isRu ? 'Ташкент'       : 'Tashkent',
    'Asia/Samarkand':         isRu ? 'Самарканд'     : 'Samarkand',
    'Asia/Dushanbe':          isRu ? 'Душанбе'       : 'Dushanbe',
    'Asia/Ashgabat':          isRu ? 'Ашхабад'       : 'Ashgabat',
    'Asia/Tbilisi':           isRu ? 'Тбилиси'       : 'Tbilisi',
    'Asia/Baku':              isRu ? 'Баку'          : 'Baku',
    'Asia/Yerevan':           isRu ? 'Ереван'        : 'Yerevan',
    // Частые страны релокации / диаспоры
    'Europe/Istanbul':        isRu ? 'Стамбул'       : 'Istanbul',
    'Asia/Nicosia':           isRu ? 'Никосия'       : 'Nicosia',
    'Europe/Nicosia':         isRu ? 'Никосия'       : 'Nicosia',
    'Asia/Jerusalem':         isRu ? 'Тель-Авив'     : 'Tel Aviv',
    'Asia/Bangkok':           isRu ? 'Бангкок'       : 'Bangkok',
    'Asia/Ho_Chi_Minh':       isRu ? 'Хошимин'       : 'Ho Chi Minh City',
    'Asia/Jakarta':           isRu ? 'Джакарта'      : 'Jakarta',
    'Asia/Makassar':          isRu ? 'Бали'          : 'Bali',
    'Europe/Belgrade':        isRu ? 'Белград'       : 'Belgrade',
    'Europe/Prague':          isRu ? 'Прага'         : 'Prague',
    'Europe/Budapest':        isRu ? 'Будапешт'      : 'Budapest',
    'Europe/Madrid':          isRu ? 'Мадрид'        : 'Madrid',
    'Europe/Lisbon':          isRu ? 'Лиссабон'      : 'Lisbon',
    'Europe/Amsterdam':       isRu ? 'Амстердам'     : 'Amsterdam',
    'Europe/Vienna':          isRu ? 'Вена'          : 'Vienna',
    'Europe/Zurich':          isRu ? 'Цюрих'         : 'Zurich',
    'Europe/Athens':          isRu ? 'Афины'         : 'Athens',
    'Europe/London':          isRu ? 'Лондон'        : 'London',
    'Europe/Paris':           isRu ? 'Париж'         : 'Paris',
    'Europe/Berlin':          isRu ? 'Берлин'        : 'Berlin',
    'Europe/Rome':            isRu ? 'Рим'           : 'Rome',
    'Europe/Warsaw':          isRu ? 'Варшава'       : 'Warsaw',
    'America/New_York':       isRu ? 'Нью-Йорк'      : 'New York',
    'America/Chicago':        isRu ? 'Чикаго'        : 'Chicago',
    'America/Los_Angeles':    isRu ? 'Лос-Анджелес'  : 'Los Angeles',
    'America/Toronto':        isRu ? 'Торонто'       : 'Toronto',
    'Australia/Sydney':       isRu ? 'Сидней'        : 'Sydney',
    'Australia/Melbourne':    isRu ? 'Мельбурн'      : 'Melbourne',
    'Asia/Tokyo':             isRu ? 'Токио'         : 'Tokyo',
    'Asia/Shanghai':          isRu ? 'Шанхай'        : 'Shanghai',
    'Asia/Dubai':             isRu ? 'Дубай'         : 'Dubai',
    'America/Denver':         isRu ? 'Денвер'        : 'Denver',
    'America/Vancouver':      isRu ? 'Ванкувер'      : 'Vancouver',
  };

  // ── Intl availability ─────────────────────────────────────────────────────
  var intlOk = typeof Intl !== 'undefined' &&
               typeof Intl.DateTimeFormat !== 'undefined' &&
               typeof Intl.DateTimeFormat.prototype.formatToParts !== 'undefined';

  // ── Core: parse naive datetime string in source timezone → UTC Date ───────
  // Uses "formatter probe" technique — DST-safe, never does ±ms arithmetic.
  function parseInTz(dateStr, tzName) {
    // Step 1: parse dateStr as UTC to get a probe instant.
    // Normalize to "YYYY-MM-DDTHH:MM" — strip seconds if already present,
    // then append ':00Z' to force UTC parse (avoids "T11:00:00:00Z" corruption).
    var normalized = dateStr.slice(0, 16);
    var probeDate = new Date(normalized + ':00Z');

    // Step 2: format that probe instant in the source timezone
    var fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: tzName,
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false
    });
    var parts = fmt.formatToParts(probeDate).reduce(function (acc, p) {
      acc[p.type] = p.value;
      return acc;
    }, {});

    // hour12:false can give '24' for midnight in some browsers — normalize it
    var h = +parts.hour === 24 ? 0 : +parts.hour;

    // Step 3: reconstruct wall-clock time as a UTC Date for offset calculation
    var wallUTC = new Date(Date.UTC(+parts.year, +parts.month - 1, +parts.day, h, +parts.minute, +parts.second));

    // Step 4: offset between what we fed in (probeDate) and what the tz clock shows
    var offsetMs = probeDate.getTime() - wallUTC.getTime();

    // Step 5: the true UTC instant where tz wall clock == dateStr
    return new Date(probeDate.getTime() + offsetMs);
  }

  // ── Get user's local timezone ─────────────────────────────────────────────
  var userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  // ── Get calendar date string "YYYY-MM-DD" in local timezone ───────────────
  // en-CA locale reliably gives ISO format — a known cross-browser idiom.
  function localDateStr(date) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: userTz }).format(date);
  }

  // ── Format: time only — "06:00" / "6:00 AM" ──────────────────────────────
  function formatTime(date) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: userTz,
      hour: '2-digit',
      minute: '2-digit',
      hour12: !isRu
    }).format(date);
  }

  // ── Format: date only — "4 ноября" / "November 4" ────────────────────────
  function formatDate(date) {
    return new Intl.DateTimeFormat(locale, {
      timeZone: userTz,
      day: 'numeric',
      month: 'long'
    }).format(date);
  }

  // ── Get city label for user's timezone ───────────────────────────────────
  function cityLabel() {
    if (CITY_MAP[userTz]) return CITY_MAP[userTz];
    // Fallback: extract last segment of IANA name, replace underscores
    return userTz.split('/').pop().replace(/_/g, ' ');
  }

  // ── Get UTC offset string "UTC+3" / "UTC-5:30" ───────────────────────────
  function utcOffsetLabel(date) {
    try {
      var parts = new Intl.DateTimeFormat('en-US', {
        timeZone: userTz,
        timeZoneName: 'shortOffset'
      }).formatToParts(date);
      var tzPart = parts.find(function (p) { return p.type === 'timeZoneName'; });
      if (tzPart) return tzPart.value.replace('GMT', 'UTC');
    } catch (e) { /* ignore */ }
    return '';
  }

  // ── Format: datetime — "4 нояб., 06:00 — Москва" / "Nov 4, 6:00 AM — Moscow" ──
  function formatDatetime(date) {
    var datePart = new Intl.DateTimeFormat(locale, {
      timeZone: userTz,
      day: 'numeric',
      month: 'short'
    }).format(date);
    var timePart = formatTime(date);
    return datePart + ', ' + timePart + ' — ' + cityLabel();
  }

  // ── Format: weekdate — "Четверг, 22 августа" / "Thursday, August 22" ─────
  function formatWeekdate(date) {
    var s = new Intl.DateTimeFormat(locale, {
      timeZone: userTz,
      weekday: 'long',
      day: 'numeric',
      month: 'long'
    }).format(date);
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  // ── Format: relative — "завтра в 06:00" / "tomorrow at 6:00 AM" ──────────
  function formatRelative(date) {
    var eventDay = localDateStr(date);
    var today    = localDateStr(new Date());

    // Compare calendar dates by parsing YYYY-MM-DD strings
    var todayMs = new Date(today + 'T00:00:00Z').getTime();
    var eventMs = new Date(eventDay + 'T00:00:00Z').getTime();
    var diffDays = Math.round((eventMs - todayMs) / 86400000);

    var timePart = formatTime(date);
    if (diffDays === 0)  return labels.today    + ' ' + timePart;
    if (diffDays === 1)  return labels.tomorrow + ' ' + timePart;
    if (diffDays === 2)  return labels.dayAfter + ' ' + timePart;
    // For anything else fall back to datetime
    return formatDatetime(date);
  }

  // ── Format: full — "4 ноября, 06:00 — Москва (UTC+3)" ────────────────────
  function formatFull(date) {
    var datePart   = formatDate(date);
    var timePart   = formatTime(date);
    var city       = cityLabel();
    var offset     = utcOffsetLabel(date);
    return datePart + ', ' + timePart + ' — ' + city + (offset ? ' (' + offset + ')' : '');
  }

  // ── Daily mode: resolve "next upcoming occurrence of HH:MM in tzName" ──────
  // offset=0 (default): today if not yet passed, otherwise tomorrow.
  //   restartStr (HH:MM in tzName): flip to tomorrow at restart time, not at event time.
  //   E.g. event=11:00, restart=09:00 → switches at 09:00 so "tomorrow" shows 2h early.
  // offset=N>0: always N calendar days from today in tzName (fixed shift, restart ignored).
  // DST-safe: uses calendar date arithmetic via Intl, never raw ±ms.
  function resolveDaily(timeStr, tzName, offset, restartStr) {
    var hm = (timeStr || '00:00').split(':');
    var h = +hm[0] || 0, m = +hm[1] || 0;
    offset = +offset || 0;

    var now = new Date();
    var srcFmt = new Intl.DateTimeFormat('en-CA', { timeZone: tzName });
    var pad = function(n) { return n < 10 ? '0' + n : '' + n; };

    var todayInSrc = srcFmt.format(now);
    var candidate = parseInTz(todayInSrc + 'T' + pad(h) + ':' + pad(m), tzName);

    if (offset > 0) {
      // Fixed N-day offset from today — advance candidate by N calendar days
      for (var i = 0; i < offset; i++) {
        var next = srcFmt.format(new Date(candidate.getTime() + 25 * 3600000));
        candidate = parseInTz(next + 'T' + pad(h) + ':' + pad(m), tzName);
      }
    } else {
      // offset === 0: today-or-tomorrow, boundary is either restart time or event time
      var boundaryMs;
      if (restartStr) {
        var rhm = restartStr.split(':');
        var rh = +rhm[0] || 0, rm = +rhm[1] || 0;
        boundaryMs = parseInTz(todayInSrc + 'T' + pad(rh) + ':' + pad(rm), tzName).getTime();
      } else {
        boundaryMs = candidate.getTime();
      }

      if (now.getTime() >= boundaryMs) {
        var tomorrowInSrc = srcFmt.format(new Date(candidate.getTime() + 25 * 3600000));
        candidate = parseInTz(tomorrowInSrc + 'T' + pad(h) + ':' + pad(m), tzName);
      }
    }

    return candidate;
  }

  // ── Render one element ────────────────────────────────────────────────────
  function renderEl(el) {
    el.setAttribute(ATTR_DONE, '1');

    var dateStr = el.getAttribute(ATTR_DATE);
    var tzName  = el.getAttribute(ATTR_TZ) || 'UTC';
    var format  = el.getAttribute(ATTR_FORMAT) || 'datetime';

    // "local" — час события задан в таймзоне посетителя (автовебинар «у всех 20:00 по местному»)
    if (tzName === 'local') tzName = userTz;

    if (!dateStr) {
      console.warn('[gc-date-localizer] Missing data-gc-date on element', el);
      return;
    }

    if (!intlOk) {
      el.textContent = dateStr;
      console.warn('[gc-date-localizer] Intl not supported, showing raw value');
      return;
    }

    try {
      var utcDate;
      if (dateStr === 'daily') {
        var timeStr    = el.getAttribute(ATTR_TIME)    || '00:00';
        var offset     = el.getAttribute(ATTR_OFFSET)  || '0';
        var restartStr = el.getAttribute(ATTR_RESTART) || null;
        utcDate = resolveDaily(timeStr, tzName, offset, restartStr);
      } else {
        utcDate = parseInTz(dateStr, tzName);
      }
      // parseInTz returns Invalid Date if dateStr is malformed
      if (isNaN(utcDate.getTime())) {
        throw new Error('Invalid date: ' + dateStr);
      }
      var result;
      if      (format === 'time')     result = formatTime(utcDate);
      else if (format === 'date')     result = formatDate(utcDate);
      else if (format === 'relative') result = formatRelative(utcDate);
      else if (format === 'full')     result = formatFull(utcDate);
      else if (format === 'weekdate') result = formatWeekdate(utcDate);
      else if (format === 'city')     result = cityLabel();
      else if (format === 'zone')     result = cityLabel() + (utcOffsetLabel(utcDate) ? ' (' + utcOffsetLabel(utcDate) + ')' : '');
      else                            result = formatDatetime(utcDate);

      el.textContent = result;
    } catch (e) {
      // Show a visible dash so content editors notice the error (not a raw broken string)
      el.textContent = '—';
      console.error('[gc-date-localizer] Error rendering element. Check data-gc-date format (expected YYYY-MM-DDTHH:MM). Element:', el, 'Error:', e);
    }
  }

  // ── Process all unrendered elements ──────────────────────────────────────
  function processAll() {
    var els = document.querySelectorAll(SELECTOR);
    for (var i = 0; i < els.length; i++) {
      renderEl(els[i]);
    }
  }

  // ── MutationObserver — handles GetCourse AJAX-loaded blocks ──────────────
  // Debounced: GetCourse pages can fire hundreds of mutations/sec (chat widgets,
  // countdowns, animations). We collapse bursts into a single processAll call.
  // The observer is intentionally never disconnected — page-lifetime operation.
  var debounceTimer;
  var observer = new MutationObserver(function () {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(processAll, 50);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  // ── Initial scan ──────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', processAll);
  } else {
    processAll();
  }

})();
