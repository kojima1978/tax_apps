// ===== Analysis Transactions Module =====
// Edit/Add/Delete modals, bulk selection, field replace
// Requires: analysis_core.js, utils.js

// ===== 編集モーダル =====

// Modal field mapping: [modalElementId, data-attribute, fallback]
const MODAL_FIELDS = [
    ['modalTxId',          'data-tx-id'],
    ['modalTxDate',        'data-tx-date'],
    ['modalTxDescription', 'data-tx-desc'],
    ['modalTxAmountOut',   'data-tx-amount-out'],
    ['modalTxAmountIn',    'data-tx-amount-in'],
    ['modalTxBalance',     'data-tx-balance',       ''],
    ['modalTxMemo',        'data-tx-memo',           ''],
    ['modalTxBankName',    'data-tx-bank',           ''],
    ['modalTxBranchName',  'data-tx-branch',         ''],
    ['modalTxAccountType', 'data-tx-account-type',   ''],
    ['modalTxAccountNumber',   'data-tx-account',        ''],
];

// data属性のキーマッピング（_updateEditButtonDataで使用）
const EDIT_BTN_DATA_ATTRS = [
    ['data-tx-date',         'date'],
    ['data-tx-desc',         'description'],
    ['data-tx-amount-out',   'amount_out'],
    ['data-tx-amount-in',    'amount_in'],
    ['data-tx-balance',      'balance'],
    ['data-tx-cat',          'category'],
    ['data-tx-memo',         'memo'],
    ['data-tx-bank',         'bank_name'],
    ['data-tx-branch',       'branch_name'],
    ['data-tx-account-type', 'account_type'],
    ['data-tx-account',      'account_number'],
];

const editModal = document.getElementById('editModal');
editModal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;

    MODAL_FIELDS.forEach(([id, attr, fallback]) => {
        document.getElementById(id).value = button.getAttribute(attr) || fallback || '';
    });

    // カテゴリーはインラインセレクトを優先
    const txRow = button.closest('tr');
    const inlineSelect = txRow ? txRow.querySelector('select[name^="cat-"], select[name^="uncat-"]') : null;
    document.getElementById('modalTxCategory').value = inlineSelect ? inlineSelect.value : (button.getAttribute('data-tx-cat') || '未分類');

    // 現在のタブを記録
    const activeTab = document.querySelector('#analysisTabs .nav-link.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-bs-target').replace('#', '');
        document.getElementById('modalSourceTab').value = tabId;
    }

    // フィルター状態をモーダルに転送（動的 hidden input）
    const form = editModal.querySelector('form');
    form.querySelectorAll('.modal-filter-input').forEach(el => el.remove());

    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of params.entries()) {
        if (['bank', 'account', 'category'].includes(key)) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'filter_' + key;
            input.value = value;
            input.className = 'modal-filter-input';
            form.appendChild(input);
        }
    }
    ['keyword', 'page'].forEach(key => {
        const val = params.get(key);
        if (val) {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = 'filter_' + key;
            input.value = val;
            input.className = 'modal-filter-input';
            form.appendChild(input);
        }
    });
});

// ダブルクリックで編集モーダルを開く
document.addEventListener('dblclick', function(e) {
    const row = e.target.closest('tr[data-tx-id]');
    if (!row) return;
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

    const editBtn = row.querySelector('[data-bs-toggle="modal"][data-bs-target="#editModal"]');
    if (editBtn) editBtn.click();
});

// ===== 編集モーダルのAJAX保存 =====

// フィールドラベル定義（差分表示用）
const FIELD_LABELS = {
    description: '摘要', category: '分類', memo: 'メモ',
    date: '日付', amount_out: '払戻', amount_in: 'お預り',
    bank_name: '銀行名', branch_name: '支店名',
    account_type: '種別', account_number: '口座番号', balance: '残高',
};

// 保存前の値を記録するキー（差分表示用）
const DIFF_FIELDS = ['description', 'category', 'memo', 'date', 'amount_out', 'amount_in',
    'bank_name', 'branch_name', 'account_type', 'account_number', 'balance'];

const editTxForm = document.getElementById('editTxForm');
const editTxSubmitBtn = document.getElementById('editTxSubmitBtn');

if (editTxForm) {
    editTxForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const formData = new FormData(editTxForm);
        setButtonLoading(editTxSubmitBtn, '保存中...');

        // 保存前の値を記録（差分表示用）
        var beforeValues = {};
        var editBtn = document.querySelector('tr[data-tx-id="' + formData.get('tx_id') + '"] [data-bs-target="#editModal"]');
        if (editBtn) {
            EDIT_BTN_DATA_ATTRS.forEach(function([attr, key]) {
                beforeValues[key] = editBtn.getAttribute(attr) || '';
            });
        }

        postJson(window.location.href, formData, {
            onSuccess: function(data) {
                const tx = data.transaction;
                if (!tx) return;

                verifyTransaction(tx.id, function(verified) {
                    // 検証済みデータでDOM更新
                    document.querySelectorAll('tr[data-tx-id="' + tx.id + '"]').forEach(function(row) {
                        _updateRowCells(row, verified);
                        _updateEditButtonData(row, verified);
                        row.style.backgroundColor = 'rgba(25, 135, 84, 0.12)';
                        setTimeout(function() { row.style.backgroundColor = ''; }, 1200);
                    });

                    // モーダルのフォーム値を検証済みデータで更新
                    MODAL_FIELDS.forEach(function([id, attr, fallback]) {
                        var key = EDIT_BTN_DATA_ATTRS.find(function(a) { return a[0] === attr; });
                        if (key) {
                            document.getElementById(id).value = verified[key[1]] != null ? verified[key[1]] : (fallback || '');
                        }
                    });

                    // 差分計算
                    var changes = [];
                    DIFF_FIELDS.forEach(function(key) {
                        var before = String(beforeValues[key] || '');
                        var after = String(verified[key] != null ? verified[key] : '');
                        if (before !== after) {
                            changes.push((FIELD_LABELS[key] || key) + ': ' + (before || '(空)') + ' → ' + (after || '(空)'));
                        }
                    });

                    _showSaveConfirmation(changes);
                }, function() {
                    showToast('保存は成功しましたが、検証リクエストに失敗しました。', 'warning');
                    var modal = bootstrap.Modal.getInstance(editModal);
                    if (modal) modal.hide();
                });
            },
            onFinally: function() { resetButton(editTxSubmitBtn); },
        });
    });

    // モーダルが閉じられたとき、ボタンを元に戻す
    editModal.addEventListener('hidden.bs.modal', function() {
        editTxSubmitBtn.textContent = '保存';
        editTxSubmitBtn.type = 'submit';
        editTxSubmitBtn.onclick = null;
        var existingMsg = editModal.querySelector('.save-confirm-msg');
        if (existingMsg) existingMsg.remove();
    });
}

// モーダル内に保存完了メッセージを表示し、ボタンを「確認して閉じる」に変更
function _showSaveConfirmation(changes) {
    var footer = editModal.querySelector('.modal-footer');
    var existingMsg = footer.querySelector('.save-confirm-msg');
    if (existingMsg) existingMsg.remove();

    var msg = document.createElement('div');
    msg.className = 'save-confirm-msg w-100 mb-2';
    msg.innerHTML = '<div class="alert alert-success py-2 mb-0 small">' +
        '<i class="bi bi-check-circle-fill"></i> <strong>保存完了（DB検証済み）</strong>' +
        (changes.length > 0 ? '<br>' + changes.join('<br>') : '<br>変更なし') +
        '<div class="mt-2"><small class="text-muted">確認して閉じてください</small></div>' +
        '</div>';
    footer.insertBefore(msg, footer.firstChild);

    editTxSubmitBtn.textContent = '確認して閉じる';
    editTxSubmitBtn.type = 'button';
    editTxSubmitBtn.onclick = function() {
        var modal = bootstrap.Modal.getInstance(editModal);
        if (modal) modal.hide();
    };

    if (changes.length > 0) {
        showToast('変更を保存しました: ' + changes.join(', '), 'success');
    } else {
        showToast('取引データを更新しました（変更なし）', 'info');
    }
}

// テーブル行のセルを更新後のデータで書き換え
function _updateRowCells(row, tx) {
    // 摘要セル（td自体がtext-truncateの場合と、子要素の場合を両方対応）
    var descCells = row.querySelectorAll('td.text-truncate');
    if (descCells.length > 0) {
        // 最初のtext-truncateは摘要
        descCells[0].textContent = tx.description;
        descCells[0].title = tx.description;
        // 2番目のtext-truncateがあればメモ
        if (descCells.length > 1) {
            var memoText = tx.memo || '-';
            descCells[1].title = tx.memo || '';
            descCells[1].innerHTML = '<small class="text-muted">' + (memoText.length > 30 ? memoText.substring(0, 27) + '...' : memoText) + '</small>';
        }
    }

    // カテゴリーセレクト
    var catSelect = row.querySelector('select[name^="cat-"], select[name^="uncat-"]');
    if (catSelect) {
        catSelect.value = tx.category;
        catSelect.dataset.lastSaved = tx.category;
    }

    // カテゴリーバッジ（付箋タブ等）
    var catBadge = row.querySelector('.badge');
    if (catBadge && !catSelect) {
        catBadge.textContent = tx.category || '-';
    }
}

// 編集ボタンのdata属性を更新後の値に同期（data-driven）
function _updateEditButtonData(row, tx) {
    var btn = row.querySelector('[data-bs-target="#editModal"]');
    if (!btn) return;
    EDIT_BTN_DATA_ATTRS.forEach(function([attr, key]) {
        btn.setAttribute(attr, tx[key] != null ? tx[key] : '');
    });
}

// Select All Duplicates
initSelectAll('selectAllDup', '.dup-check');

// ===== URLパラメータに応じてタブを切り替え =====

const urlParams = new URLSearchParams(window.location.search);

if (urlParams.has('tab')) {
    const tabId = urlParams.get('tab') + '-tab';
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        const tab = new bootstrap.Tab(targetTab);
        tab.show();
    }
} else if (urlParams.has('bank') || urlParams.has('account') || urlParams.has('category') || urlParams.has('keyword')) {
    const allTab = document.getElementById('all-tab');
    if (allTab) {
        const tab = new bootstrap.Tab(allTab);
        tab.show();
    }
}

// ===== 付箋ボタンのクリック処理（AJAX） =====

document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const button = this;
        const txId = button.getAttribute('data-tx-id');
        const sourceTab = button.getAttribute('data-source-tab');
        const row = button.closest('tr');

        disableButton(button);

        const formData = createFormData({ tx_id: txId });
        const apiUrl = getApiUrl('toggle-flag');

        postJson(apiUrl, formData, {
            onSuccess: (data) => {
                if (sourceTab === 'flagged' && !data.is_flagged) {
                    fadeOutRow(row, () => {
                        const tbody = document.querySelector('#flagged tbody');
                        if (tbody && tbody.querySelectorAll('tr').length === 0) {
                            tbody.innerHTML = `
                                <tr><td colspan="9">
                                    <div class="empty-state">
                                        <div class="empty-state-icon"><i class="bi bi-bookmark"></i></div>
                                        <div class="empty-state-text">付箋が付いた取引はありません</div>
                                    </div>
                                </td></tr>`;
                        }
                    });
                    showToast('付箋を外しました', 'info');
                } else {
                    if (data.is_flagged) {
                        button.classList.remove('btn-outline-secondary');
                        button.classList.add('btn-info');
                        button.title = '付箋を外す';
                        if (row) row.classList.add('table-warning');
                        showToast('付箋を追加しました', 'success');
                    } else {
                        button.classList.remove('btn-info');
                        button.classList.add('btn-outline-secondary');
                        button.title = '付箋を付ける';
                        if (row) row.classList.remove('table-warning');
                        showToast('付箋を外しました', 'info');
                    }
                    enableButton(button);
                }
            },
            onError: () => enableButton(button),
        });
    });
});

// タブ切替時にURLパラメータを更新（状態保持）
document.querySelectorAll('#analysisTabs .nav-link').forEach(tab => {
    tab.addEventListener('shown.bs.tab', function() {
        const tabName = this.id.replace('-tab', '');
        const url = new URL(window.location);
        url.searchParams.set('tab', tabName);
        history.replaceState(null, '', url);
    });
});

// ===== 一括選択機能 =====

const bulkActionBar = document.getElementById('bulkActionBar');
const selectedCountText = document.getElementById('selectedCountText');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const applyBulkCategoryBtn = document.getElementById('applyBulkCategoryBtn');
const bulkCategorySelect = document.getElementById('bulkCategorySelect');

function updateSelectionUI() {
    const checkedCount = document.querySelectorAll('.tx-select-check:checked').length;
    if (selectedCountText) selectedCountText.textContent = `${checkedCount}件選択中`;
    if (bulkActionBar) bulkActionBar.style.display = checkedCount > 0 ? 'block' : 'none';
}

initSelectAll('selectAllTx', '.tx-select-check', updateSelectionUI);

if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function() {
        getTxCheckboxes().forEach(cb => cb.checked = false);
        if (selectAllTx) selectAllTx.checked = false;
        updateSelectionUI();
    });
}

if (applyBulkCategoryBtn) {
    applyBulkCategoryBtn.addEventListener('click', function() {
        const selectedCategory = bulkCategorySelect.value;
        if (!selectedCategory) {
            showToast('分類を選択してください', 'danger');
            return;
        }

        const checkedBoxes = document.querySelectorAll('.tx-select-check:checked');
        if (checkedBoxes.length === 0) {
            showToast('取引が選択されていません', 'danger');
            return;
        }

        checkedBoxes.forEach(cb => {
            const row = cb.closest('tr');
            const categorySelect = row ? row.querySelector('select[name^="cat-"]') : null;
            if (categorySelect) {
                categorySelect.value = selectedCategory;
                categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        showToast(`${checkedBoxes.length}件の分類を「${selectedCategory}」に変更しました`, 'success');
    });
}

updateSelectionUI();

// ===== 取引追加・削除機能 =====

const addTxModal = document.getElementById('addTxModal');
const addTxSubmitBtn = document.getElementById('addTxSubmitBtn');
const addTxContinueBtn = document.getElementById('addTxContinueBtn');

// Add transaction field mapping: [elementId, formKey, data-attribute (for reset), resetDefault, readDefault]
const ADD_TX_FIELDS = [
    ['addTxDate',        'date',         'data-tx-date',         ''],
    ['addTxDescription', 'description',   null,                   ''],
    ['addTxAmountOut',   'amount_out',    null,                   '0',  '0'],
    ['addTxAmountIn',    'amount_in',     null,                   '0',  '0'],
    ['addTxBalance',     'balance',       null,                   ''],
    ['addTxBankName',    'bank_name',    'data-tx-bank',          ''],
    ['addTxBranchName',  'branch_name',  'data-tx-branch',        ''],
    ['addTxAccountType', 'account_type', 'data-tx-account-type',  ''],
    ['addTxAccountNumber',   'account_number',   'data-tx-account',       ''],
    ['addTxCategory',    'category',      null,                   '未分類'],
    ['addTxMemo',        'memo',          null,                   ''],
];

const ACCOUNT_FIELDS = ['addTxBankName', 'addTxBranchName', 'addTxAccountType', 'addTxAccountNumber', 'addTxDate'];

// 和暦短縮変換 (JS版)
function toWarekiShort(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr + 'T00:00:00');
    const y = d.getFullYear(), m = d.getMonth() + 1, day = d.getDate();
    if (y >= 2019) return 'R' + (y - 2018) + '.' + m + '.' + day;
    if (y >= 1989) return 'H' + (y - 1988) + '.' + m + '.' + day;
    return y + '/' + m + '/' + day;
}

// カテゴリ選択肢をDOMから取得
function getCategoryOptions() {
    const sel = document.querySelector('select[name^="cat-"]');
    if (!sel) return '';
    return Array.from(sel.options).map(o => `<option value="${o.value}">${o.text}</option>`).join('');
}

// 新しい行をテーブルに挿入
function insertTxRow(tx) {
    const tbody = document.querySelector('#allTxForm table tbody');
    if (!tbody) return;
    const catOptions = getCategoryOptions();
    const amtOut = tx.amount_out > 0 ? Number(tx.amount_out).toLocaleString() : '';
    const amtIn = tx.amount_in > 0 ? Number(tx.amount_in).toLocaleString() : '';
    const tr = document.createElement('tr');
    tr.setAttribute('data-tx-id', tx.id);
    tr.style.opacity = '0';
    tr.innerHTML = `
        <td><input type="checkbox" value="${tx.id}" class="form-check-input tx-select-check"></td>
        <td class="text-nowrap">
            <button type="button" class="btn btn-sm btn-outline-success p-0 px-1 insert-tx-btn"
                data-tx-id="${tx.id}" data-tx-date="${tx.date || ''}"
                data-tx-bank="${tx.bank_name || ''}" data-tx-branch="${tx.branch_name || ''}"
                data-tx-account-type="${tx.account_type || ''}" data-tx-account="${tx.account_number || ''}"
                title="この下に追加"><i class="bi bi-plus"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger p-0 px-1 delete-tx-btn"
                data-tx-id="${tx.id}" title="削除"><i class="bi bi-trash"></i></button>
        </td>
        <td>${toWarekiShort(tx.date)}</td>
        <td>${tx.bank_name || '-'}</td>
        <td>${tx.branch_name || '-'}</td>
        <td>${tx.account_type || '-'}</td>
        <td>${tx.account_number || '-'}</td>
        <td style="max-width:200px;" class="text-truncate" title="${tx.description || ''}">${tx.description || ''}</td>
        <td class="text-end">${amtOut}</td>
        <td class="text-end">${amtIn}</td>
        <td><select name="cat-${tx.id}" class="form-select form-select-sm" data-last-saved="${tx.category || '未分類'}">${catOptions.replace(`value="${tx.category || '未分類'}"`, `value="${tx.category || '未分類'}" selected`)}</select></td>
        <td><button type="button" class="btn btn-sm btn-outline-info"
            data-bs-toggle="modal" data-bs-target="#editModal"
            data-tx-id="${tx.id}" data-tx-date="${tx.date || ''}"
            data-tx-desc="${tx.description || ''}" data-tx-amount-out="${tx.amount_out}"
            data-tx-amount-in="${tx.amount_in}" data-tx-balance="${tx.balance || ''}"
            data-tx-cat="${tx.category || ''}" data-tx-memo="${tx.memo || ''}"
            data-tx-bank="${tx.bank_name || ''}" data-tx-branch="${tx.branch_name || ''}"
            data-tx-account-type="${tx.account_type || ''}" data-tx-account="${tx.account_number || ''}">詳細</button></td>
        <td><button type="button" class="btn btn-sm btn-outline-secondary flag-btn"
            data-tx-id="${tx.id}" data-source-tab="all" title="付箋を付ける"><i class="bi bi-bookmark-fill" aria-hidden="true"></i></button></td>
    `;
    tbody.insertBefore(tr, tbody.firstChild);
    tr.querySelector('.insert-tx-btn').addEventListener('click', handleInsertBtnClick);
    tr.querySelector('.delete-tx-btn').addEventListener('click', handleDeleteBtnClick);
    requestAnimationFrame(() => { tr.style.transition = 'opacity 0.3s'; tr.style.opacity = '1'; });
}

// 追加ボタンクリック時 - モーダルを開く
function handleInsertBtnClick() {
    ADD_TX_FIELDS.forEach(([id, , attr, resetDefault]) => {
        document.getElementById(id).value = (attr ? this.getAttribute(attr) : null) || resetDefault;
    });
    const modal = new bootstrap.Modal(addTxModal);
    modal.show();
}
document.querySelectorAll('.insert-tx-btn').forEach(btn => {
    btn.addEventListener('click', handleInsertBtnClick);
});

// ヘッダーの追加ボタン
const addTxTopBtn = document.getElementById('addTxTopBtn');
if (addTxTopBtn) {
    addTxTopBtn.addEventListener('click', function() {
        ADD_TX_FIELDS.forEach(([id, , , resetDefault]) => {
            document.getElementById(id).value = resetDefault;
        });
        const modal = new bootstrap.Modal(addTxModal);
        modal.show();
    });
}

// 取引追加の共通送信処理
function submitAddTx(triggerBtn, keepOpen) {
    const data = {};
    ADD_TX_FIELDS.forEach(([id, key, , , readDefault]) => {
        data[key] = document.getElementById(id).value || readDefault || '';
    });
    const formData = createFormData(data);
    setButtonLoading(triggerBtn, '追加中...');

    const apiUrl = getApiUrl('create-transaction');
    postJson(apiUrl, formData, {
        onSuccess: (resp) => {
            showToast('取引を追加しました', 'success');
            if (resp && resp.transaction) insertTxRow(resp.transaction);
            if (keepOpen) {
                ['addTxDescription', 'addTxMemo'].forEach(id => { document.getElementById(id).value = ''; });
                document.getElementById('addTxAmountOut').value = '0';
                document.getElementById('addTxAmountIn').value = '0';
                document.getElementById('addTxBalance').value = '';
                document.getElementById('addTxCategory').value = '未分類';
                document.getElementById('addTxDescription').focus();
            } else {
                const modal = bootstrap.Modal.getInstance(addTxModal);
                modal.hide();
            }
        },
        onFinally: () => resetButton(triggerBtn),
    });
}

if (addTxSubmitBtn) {
    addTxSubmitBtn.addEventListener('click', function() { submitAddTx(this, false); });
}
if (addTxContinueBtn) {
    addTxContinueBtn.addEventListener('click', function() { submitAddTx(this, true); });
}

// 削除ボタンクリック時
function handleDeleteBtnClick() {
    const txId = this.getAttribute('data-tx-id');
    const row = this.closest('tr');
    const button = this;

    ConfirmModal.show({
        title: '取引の削除',
        message: 'この取引を削除しますか？',
        confirmText: '削除',
        confirmClass: 'btn-danger',
        onConfirm: () => {
            const formData = createFormData({ tx_id: txId });
            disableButton(button);
            const apiUrl = getApiUrl('delete-transaction');
            postJson(apiUrl, formData, {
                onSuccess: () => {
                    fadeOutRow(row, () => updateSelectionUI());
                    showToast('取引を削除しました', 'success');
                },
                onError: () => enableButton(button),
            });
        }
    });
}
document.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', handleDeleteBtnClick);
});

// ===== フィールド一括置換機能 =====

const replaceFieldSelect = document.getElementById('replace_field_name');
const replaceOldValueSelect = document.getElementById('replace_old_value');
const replaceNewValueInput = document.getElementById('replace_new_value');
const replacePreviewCount = document.getElementById('replace_preview_count');
const replaceLoadingSpinner = document.getElementById('replace_loading_spinner');
const copyOldValueBtn = document.getElementById('copyOldValueBtn');
const bulkReplaceSubmitBtn = document.getElementById('bulkReplaceSubmitBtn');
const replacePreviewArea = document.getElementById('replacePreviewArea');
const replacePreviewText = document.getElementById('replacePreviewText');
const bulkReplaceForm = document.getElementById('bulkReplaceForm');

const fieldLabels = {
    'bank_name': '銀行名',
    'branch_name': '支店名',
    'account_number': '口座番号'
};

function updateReplaceFormState() {
    const hasOldValue = replaceOldValueSelect.value !== '';
    const hasNewValue = replaceNewValueInput.value.trim() !== '';
    const oldValue = replaceOldValueSelect.value;
    const newValue = replaceNewValueInput.value.trim();
    const isDifferent = oldValue !== newValue;

    bulkReplaceSubmitBtn.disabled = !(hasOldValue && hasNewValue && isDifferent);

    if (hasOldValue && hasNewValue) {
        const selectedOption = replaceOldValueSelect.options[replaceOldValueSelect.selectedIndex];
        const count = selectedOption.dataset.count || '?';
        const fieldLabel = fieldLabels[replaceFieldSelect.value] || replaceFieldSelect.value;

        if (!isDifferent) {
            replacePreviewText.innerHTML = `<span class="text-warning"><i class="bi bi-exclamation-triangle"></i> 置換前と置換後の値が同じです</span>`;
        } else {
            replacePreviewText.innerHTML = `${fieldLabel}を「<strong>${oldValue}</strong>」から「<strong>${newValue}</strong>」に置換します（<strong>${count}件</strong>が対象）`;
        }
        replacePreviewArea.style.display = 'block';
    } else {
        replacePreviewArea.style.display = 'none';
    }
}

if (replaceFieldSelect) {
    replaceFieldSelect.addEventListener('change', function() {
        const fieldName = this.value;

        replaceOldValueSelect.innerHTML = '<option value="">-- 読み込み中... --</option>';
        replaceOldValueSelect.disabled = true;
        replacePreviewCount.style.display = 'none';
        copyOldValueBtn.disabled = true;
        bulkReplaceSubmitBtn.disabled = true;
        replacePreviewArea.style.display = 'none';
        replaceNewValueInput.value = '';
        replaceNewValueInput.placeholder = '正しい値を入力';

        if (!fieldName) {
            replaceOldValueSelect.innerHTML = '<option value="">-- フィールドを選択してください --</option>';
            replaceLoadingSpinner.style.display = 'none';
            return;
        }

        replaceLoadingSpinner.style.display = 'inline-block';

        const apiUrl = getApiUrl('field-values') + '?field_name=' + encodeURIComponent(fieldName);

        fetch(apiUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            replaceLoadingSpinner.style.display = 'none';

            if (data.success && data.values.length > 0) {
                replaceOldValueSelect.innerHTML = '<option value="">-- 選択してください --</option>';
                data.values.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item.value;
                    option.textContent = `${item.value} (${item.count}件)`;
                    option.dataset.count = item.count;
                    replaceOldValueSelect.appendChild(option);
                });
                replaceOldValueSelect.disabled = false;
            } else if (data.success && data.values.length === 0) {
                replaceOldValueSelect.innerHTML = '<option value="">-- データがありません --</option>';
                showToast('このフィールドにはデータがありません', 'info');
            } else {
                replaceOldValueSelect.innerHTML = '<option value="">-- エラー --</option>';
                showToast('データの取得に失敗しました: ' + (data.message || '不明なエラー'), 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            replaceLoadingSpinner.style.display = 'none';
            replaceOldValueSelect.innerHTML = '<option value="">-- 取得エラー --</option>';
            showToast('通信エラーが発生しました。ページを再読み込みしてください。', 'danger');
        });
    });

    replaceOldValueSelect.addEventListener('change', function() {
        const selectedOption = this.options[this.selectedIndex];
        if (selectedOption && selectedOption.value) {
            replacePreviewCount.textContent = selectedOption.dataset.count + '件';
            replacePreviewCount.style.display = 'inline-block';
            replaceNewValueInput.placeholder = selectedOption.value;
            copyOldValueBtn.disabled = false;
        } else {
            replacePreviewCount.style.display = 'none';
            copyOldValueBtn.disabled = true;
        }
        updateReplaceFormState();
    });

    replaceNewValueInput.addEventListener('input', updateReplaceFormState);

    copyOldValueBtn.addEventListener('click', function() {
        const oldValue = replaceOldValueSelect.value;
        if (oldValue) {
            replaceNewValueInput.value = oldValue;
            replaceNewValueInput.focus();
            replaceNewValueInput.setSelectionRange(0, oldValue.length);
            showToast('値をコピーしました。修正してください。', 'info');
            updateReplaceFormState();
        }
    });

    bulkReplaceForm.addEventListener('submit', function(e) {
        const oldValue = replaceOldValueSelect.value;
        const newValue = replaceNewValueInput.value.trim();
        const selectedOption = replaceOldValueSelect.options[replaceOldValueSelect.selectedIndex];
        const count = selectedOption.dataset.count || '?';
        const fieldLabel = fieldLabels[replaceFieldSelect.value] || replaceFieldSelect.value;

        if (!oldValue || !newValue) {
            e.preventDefault();
            showToast('置換前と置換後の値を入力してください', 'danger');
            return;
        }

        if (oldValue === newValue) {
            e.preventDefault();
            showToast('置換前と置換後の値が同じです', 'warning');
            return;
        }

        e.preventDefault();
        ConfirmModal.show({
            title: 'フィールド一括置換',
            message: `${fieldLabel}「${oldValue}」を「${newValue}」に置換します。\n\n対象: ${count}件\n\nこの操作は取り消せません。実行しますか？`,
            confirmText: '置換実行',
            confirmClass: 'btn-danger',
            onConfirm: () => {
                setButtonLoading(bulkReplaceSubmitBtn, '処理中...');
                bulkReplaceForm.submit();
            }
        });
    });
}
