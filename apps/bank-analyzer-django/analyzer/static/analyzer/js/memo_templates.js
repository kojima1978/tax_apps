/**
 * メモ定型文コンテキストメニュー
 * メモセルを右クリック → 定型文選択 → AJAX保存
 */
(function() {
    var refDate = window.REFERENCE_DATE_WAREKI || '○○年○月○日';

    var TEMPLATES = {
        expense_usage:
            'こちらの使途はご記憶にありますか？\n(生活費、医療費、娯楽費、物品購入費等)',
        securities:
            '証券会社との取引残高はありませんか？',
        income_source:
            'こちらはどちらからのご入金でしょうか？',
        pre_death_expense:
            'こちらの使途はご記憶にありますか？\n(生活費、医療費、娯楽費、物品購入費等)\n'
            + 'また' + refDate + '時点で手元に残っていた現金はございますか？',
    };

    var menu = document.getElementById('memoTemplateMenu');
    if (!menu) return;

    var activeTxId = null;
    var activeCell = null;

    // 右クリックでメニュー表示
    document.addEventListener('contextmenu', function(e) {
        var cell = e.target.closest('.memo-cell');
        if (!cell) return;
        e.preventDefault();

        activeTxId = cell.dataset.txId;
        activeCell = cell;

        // 位置調整（画面外にはみ出さない）
        menu.style.display = 'block';
        var x = e.clientX, y = e.clientY;
        var mw = menu.offsetWidth, mh = menu.offsetHeight;
        if (x + mw > window.innerWidth) x = window.innerWidth - mw - 8;
        if (y + mh > window.innerHeight) y = window.innerHeight - mh - 8;
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
    });

    // メニュー外クリックで閉じる
    document.addEventListener('click', function(e) {
        if (!menu.contains(e.target)) {
            menu.style.display = 'none';
        }
    });
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') menu.style.display = 'none';
    });

    // 定型文選択
    menu.addEventListener('click', function(e) {
        var btn = e.target.closest('.memo-ctx-item');
        if (!btn || !activeTxId) return;

        var tpl = btn.dataset.tpl;
        var text = TEMPLATES[tpl];
        if (!text) return;

        menu.style.display = 'none';
        saveMemo(activeTxId, text);
    });

    function saveMemo(txId, memo) {
        postAction('update_memo', { tx_id: txId, memo: memo }, {
            onSuccess: function() {
                updateMemoCell(txId, memo);
                showToast('メモを更新しました', 'success');
            }
        });
    }

    function updateMemoCell(txId, memo) {
        // 付箋タブのメモセル更新
        document.querySelectorAll('.memo-cell[data-tx-id="' + txId + '"]').forEach(function(cell) {
            cell.title = memo;
            var display = memo.length > 30 ? memo.substring(0, 27) + '...' : memo;
            cell.innerHTML = '<small class="text-muted">' + escapeHtml(display) + '</small>';
        });

        // 編集モーダルの data-tx-memo も更新
        document.querySelectorAll('[data-tx-id="' + txId + '"][data-tx-memo]').forEach(function(el) {
            el.dataset.txMemo = memo;
        });
    }

    function escapeHtml(str) {
        var d = document.createElement('div');
        d.textContent = str;
        return d.innerHTML;
    }
})();
