/**
 * gc-timezone-field — v1.1.0
 *
 * Кладёт часовой пояс посетителя в дополнительное поле пользователя GetCourse.
 * Значение — смещение от UTC без плюса: 3, 0, -5 (для получасовых зон 5.5).
 * Семантика совпадает с системным «Часовым поясом» GC («отсчёт от Гринвича»),
 * писать в системный атрибут снаружи нельзя — только в своё доп. поле.
 *
 * Настройка (один раз, в GetCourse):
 *   1. Создать доп. поле пользователя (напр. «timezone») в разделе «Пользователи».
 *   2. Добавить поле в форму (лид-форму / модальный блок / виджет).
 *   3. В настройках поля в форме прописать CSS-класс `gc-tz` (+ класс скрытия,
 *      напр. `hide`, либо правило `.gc-tz{display:none}` на странице).
 *   4. Этот скрипт вставить инлайном в конец <body> лендинга
 *      (внешние <script src> GetCourse вырезает).
 *
 * Если класс задать не получается — до подключения скрипта объявить id поля:
 *   <script>window.GC_TZ_FIELD_ID=539755;</script>
 * тогда поле адресуется как input[name="formParams[userCustomFields][539755]"].
 * ⚠️ id меняется при пересборке формы — класс надёжнее.
 *
 * Необязательно: второе поле с IANA-зоной («Europe/Moscow») — класс `gc-tz-name`
 * или window.GC_TZNAME_FIELD_ID. Нужно только для писем/отладки: по строке
 * не сравнить диапазон, ветвить процесс по ней нельзя.
 *
 * Форма приезжает AJAX'ом (модалка, виджет), поэтому заполняем по
 * MutationObserver и ещё раз прямо перед отправкой.
 */
(function () {
  // getTimezoneOffset() отдаёт минуты отставания от UTC: Москва = -180 → 3.
  // Значение всегда актуальное, поэтому летнее время учитывается само.
  var off = -new Date().getTimezoneOffset() / 60;
  var TZ  = String(off % 1 === 0 ? off : Math.round(off * 10) / 10);

  var TZ_NAME = '';
  try { TZ_NAME = Intl.DateTimeFormat().resolvedOptions().timeZone || ''; } catch (e) { /* ignore */ }

  function byField(cls, id) {
    var sel = '.' + cls + ' input, input.' + cls;
    if (id) sel += ', input[name="formParams[userCustomFields][' + id + ']"]';
    return document.querySelectorAll(sel);
  }

  function put(els, value) {
    if (!value) return;
    for (var i = 0; i < els.length; i++) {
      if (els[i].value === value) continue;      // уже заполнено — не дёргаем
      els[i].value = value;
      els[i].dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  function fill() {
    put(byField('gc-tz', window.GC_TZ_FIELD_ID), TZ);
    put(byField('gc-tz-name', window.GC_TZNAME_FIELD_ID), TZ_NAME);
  }

  var t;
  new MutationObserver(function () {
    clearTimeout(t);
    t = setTimeout(fill, 50); // страницы GetCourse дают сотни мутаций в секунду
  }).observe(document.documentElement, { childList: true, subtree: true });

  document.addEventListener('submit', fill, true);
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', fill);
  } else {
    fill();
  }
})();
