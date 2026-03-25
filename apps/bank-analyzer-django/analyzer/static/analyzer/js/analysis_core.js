// ===== Analysis Core Module =====
// Shared utilities, StatusIndicator, ProgressBar, inline category save
// Requires: utils.js

// ===== ユーティリティ =====

// ビュー切替の共通初期化（グループ/フラット/カード切替など）
// toggleSelector: トグルボタンの親セレクタ, viewIdMap: { viewName: elementId }
function initViewToggle(toggleSelector, viewIdMap) {
    var btns = document.querySelectorAll(toggleSelector + ' [data-view]');
    if (!btns.length) return;
    btns.forEach(function(btn) {
        btn.addEventListener('click', function() {
            btns.forEach(function(b) { b.classList.remove('active'); });
            this.classList.add('active');
            var view = this.dataset.view;
            Object.keys(viewIdMap).forEach(function(name) {
                var el = document.getElementById(viewIdMap[name]);
                if (el) el.style.display = view === name ? '' : 'none';
            });
        });
    });
}

// 取引一覧タブ: 現在のカテゴリーフィルター状態をPOSTに追加（still_visible判定用）
function appendActiveCategoryFilter(formData) {
    document.querySelectorAll('input[name="category"]:checked').forEach(function(cb) {
        formData.append('filter_category', cb.value);
    });
    var modeEl = document.querySelector('input[name="category_mode"]:checked');
    if (modeEl) formData.append('filter_category_mode', modeEl.value);
}

// 未分類件数（ヘッダー合計 + タブバッジ）を delta 分減らす
function updateUnclassifiedCount(delta) {
    var countEl = document.getElementById('unclassifiedTxTotal');
    if (countEl) countEl.textContent = Math.max(0, (parseInt(countEl.textContent) || 0) - delta);
    var badge = document.querySelector('#unclassified-tab .badge');
    if (badge) {
        var count = Math.max(0, (parseInt(badge.textContent) || 0) - delta);
        if (count > 0) badge.textContent = count;
        else badge.remove();
    }
}

// ===== フローティングステータスインジケーター =====

const StatusIndicator = {
    _bar: null,
    _icon: null,
    _text: null,
    _retryBtn: null,
    _hideTimeout: null,
    _pendingCount: 0,

    init: function() {
        this._bar = document.getElementById('floatingStatusBar');
        this._icon = document.getElementById('statusIcon');
        this._text = document.getElementById('statusText');
        this._retryBtn = document.getElementById('statusRetryBtn');

        // 再試行ボタンのクリックハンドラー
        if (this._retryBtn) {
            this._retryBtn.addEventListener('click', function() {
                SaveQueue.retryFailed();
            });
        }
    },

    show: function(state, message) {
        if (!this._bar) return;
        clearTimeout(this._hideTimeout);
        this._bar.style.display = 'block';
        this._retryBtn.style.display = 'none';

        switch (state) {
            case 'saving':
                this._icon.innerHTML = '<span class="spinner-border spinner-border-sm text-primary"></span>';
                this._text.textContent = message || '保存中...';
                break;
            case 'success':
                this._icon.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
                this._text.textContent = message || '保存完了';
                this._hideTimeout = setTimeout(function() { StatusIndicator.hide(); }, 2000);
                break;
            case 'error':
                this._icon.innerHTML = '<i class="bi bi-exclamation-circle-fill text-danger"></i>';
                this._text.textContent = message || '保存に失敗しました';
                this._retryBtn.style.display = 'inline-block';
                break;
        }
    },

    hide: function() {
        if (this._bar) this._bar.style.display = 'none';
    },

    saving: function() {
        this._pendingCount++;
        this.show('saving', '保存中... (' + this._pendingCount + '件)');
    },

    saved: function() {
        this._pendingCount = Math.max(0, this._pendingCount - 1);
        if (this._pendingCount === 0) this.show('success');
        else this.show('saving', '保存中... (' + this._pendingCount + '件)');
    },

    failed: function() {
        this._pendingCount = Math.max(0, this._pendingCount - 1);
        this.show('error');
    }
};

// ===== 進捗バー =====

const ProgressBar = {
    _bar: null,
    _countEl: null,
    _pctEl: null,
    _totalEl: null,
    _classified: 0,
    _total: 0,

    init: function() {
        this._bar = document.getElementById('classifiedProgressBar');
        this._countEl = document.getElementById('classifiedCount');
        this._pctEl = document.getElementById('classifiedPct');
        this._totalEl = document.getElementById('totalTxCount');
        if (this._countEl) this._classified = parseInt(this._countEl.textContent) || 0;
        if (this._totalEl) this._total = parseInt(this._totalEl.textContent) || 0;
    },

    update: function(delta) {
        if (!this._bar || !this._total) return;
        this._classified += delta;
        var pct = Math.round(this._classified / this._total * 10) / 10;
        if (pct > 100) pct = 100;

        this._bar.style.width = pct + '%';
        this._bar.setAttribute('aria-valuenow', pct);
        if (this._countEl) this._countEl.textContent = this._classified;
        if (this._pctEl) {
            this._pctEl.textContent = pct + '%';
            this._pctEl.style.color = pct >= 80 ? '#16a34a' : pct >= 50 ? '#d97706' : '#dc2626';
        }

        // バークラス更新
        this._bar.className = 'progress-bar ' + (pct >= 80 ? 'bg-success' : pct >= 50 ? 'bg-warning' : 'bg-danger');
    }
};

// ===== インライン分類の即時保存（SaveQueue使用） =====

var _categorySelectPattern = /^(cat-|uncat-|transfer-src-|transfer-dest-|transfer-src-tbl-|transfer-dest-tbl-)/;

document.addEventListener('change', function(e) {
    var select = e.target;
    if (!select.matches('select') || !_categorySelectPattern.test(select.name)) return;

    var name = select.name;
    var txId = name.replace(_categorySelectPattern, '');
    var newCategory = select.value;
    var lastSaved = select.dataset.lastSaved || '';

    // 同じ値なら何もしない
    if (newCategory === lastSaved) return;

    // 元の値を保存（ロールバック用）
    var originalValue = lastSaved;
    var row = select.closest('tr') || select.closest('.transfer-side');

    select.disabled = true;

    var formData = createFormData({
        action: 'update_category',
        tx_id: txId,
        new_category: newCategory,
    });

    var isUnclassifiedRow = name.startsWith('uncat-');
    var isAllTabRow = name.startsWith('cat-');

    if (isAllTabRow) appendActiveCategoryFilter(formData);

    SaveQueue.enqueue({
        url: window.location.href,
        formData: formData,
        select: select,
        originalValue: originalValue,
        intendedValue: newCategory,
        onSuccess: function(data) {
            if (isUnclassifiedRow && row) {
                ProgressBar.update(1);
                updateUnclassifiedCount(1);
                fadeOutRow(row);
            } else if (isAllTabRow && row && data.still_visible === false) {
                fadeOutRow(row);
            } else if (row) {
                row.style.backgroundColor = 'rgba(25, 135, 84, 0.1)';
                setTimeout(function() { row.style.backgroundColor = ''; }, 800);
            }
        },
    });
});
