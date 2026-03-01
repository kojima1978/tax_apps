/**
 * 和暦変換ユーティリティ
 *
 * direct_input.js, import_wizard.html 等で共有される和暦関連の関数。
 * 各ページで <script src="wareki.js"> として読み込むこと。
 */

/**
 * 西暦日付文字列を和暦に変換する
 * @param {string} dateStr - "YYYY-MM-DD" 形式の日付文字列
 * @returns {string} "R7.3.1" のような和暦文字列（空文字列の場合は空）
 */
function toWareki(dateStr) {
    if (!dateStr) return '';
    var date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    var era, eraYear;
    if (year > 2019 || (year === 2019 && (month > 5 || (month === 5 && day >= 1)))) {
        era = 'R'; eraYear = year - 2018;
    } else if (year > 1989 || (year === 1989 && (month > 1 || (month === 1 && day >= 8)))) {
        era = 'H'; eraYear = year - 1988;
    } else if (year > 1926 || (year === 1926 && month === 12 && day >= 25)) {
        era = 'S'; eraYear = year - 1925;
    } else if (year > 1912 || (year === 1912 && (month > 7 || (month === 7 && day >= 30)))) {
        era = 'T'; eraYear = year - 1911;
    } else {
        era = 'M'; eraYear = year - 1867;
    }
    return era + eraYear + '.' + month + '.' + day;
}

/**
 * 日付input要素に対応する和暦表示spanを更新する
 * @param {HTMLInputElement} dateInput - type="date" のinput要素
 */
function updateWarekiDisplay(dateInput) {
    var warekiSpan = dateInput.closest('td').querySelector('.wareki-display');
    if (warekiSpan) {
        warekiSpan.textContent = toWareki(dateInput.value);
    }
}

/**
 * ページ内の全 .date-input 要素に和暦表示を初期化する
 */
function initWarekiDisplays() {
    document.querySelectorAll('.date-input').forEach(function (input) {
        updateWarekiDisplay(input);
        input.addEventListener('change', function () {
            updateWarekiDisplay(this);
        });
    });
}
