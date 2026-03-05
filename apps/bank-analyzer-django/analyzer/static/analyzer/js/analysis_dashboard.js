// ===== Analysis Dashboard Module =====
// Requires: utils.js (createFormData, getApiUrl, showToast, postJson, fadeOutRow, highlightAndRemoveRow, extractKeywordFromDescription, disableButton, enableButton, setButtonLoading, resetButton)

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
    ['modalTxAccountId',   'data-tx-account',        ''],
];

// Modal Logic
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
    // テキスト選択やフォーム要素のダブルクリックは無視
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'A') return;

    const editBtn = row.querySelector('[data-bs-toggle="modal"][data-bs-target="#editModal"]');
    if (editBtn) {
        editBtn.click();
    }
});

// Select All Duplicates
const selectAllDup = document.getElementById('selectAllDup');
if (selectAllDup) {
    selectAllDup.addEventListener('change', function () {
        const checks = document.querySelectorAll('.dup-check');
        checks.forEach(c => c.checked = this.checked);
    });
}

// URLパラメータに応じてタブを切り替え
const urlParams = new URLSearchParams(window.location.search);

// tabパラメータがある場合は指定されたタブを表示
if (urlParams.has('tab')) {
    const tabId = urlParams.get('tab') + '-tab';
    const targetTab = document.getElementById(tabId);
    if (targetTab) {
        const tab = new bootstrap.Tab(targetTab);
        tab.show();
    }
}
// フィルターパラメータがある場合は「取引一覧」タブを表示
else if (urlParams.has('bank') || urlParams.has('account') || urlParams.has('category') || urlParams.has('keyword')) {
    const allTab = document.getElementById('all-tab');
    if (allTab) {
        const tab = new bootstrap.Tab(allTab);
        tab.show();
    }
}

// 付箋ボタンのクリック処理（AJAX - ページ遷移なし）
document.querySelectorAll('.flag-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const button = this;
        const txId = button.getAttribute('data-tx-id');
        const sourceTab = button.getAttribute('data-source-tab');
        const row = button.closest('tr');

        // ボタンを一時的に無効化（二重クリック防止）
        disableButton(button);

        const formData = createFormData({ tx_id: txId });
        const apiUrl = getApiUrl('toggle-flag');

        fetch(apiUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 付箋タブで付箋を外した場合は行をフェードアウト
                if (sourceTab === 'flagged' && !data.is_flagged) {
                    fadeOutRow(row, () => {
                        // 残り件数を確認し、0件ならメッセージ表示
                        const tbody = document.querySelector('#flagged tbody');
                        if (tbody && tbody.querySelectorAll('tr').length === 0) {
                            tbody.innerHTML = `
                                <tr>
                                    <td colspan="9" class="text-center py-4 text-muted">
                                        付箋が付いた取引はありません。
                                    </td>
                                </tr>
                            `;
                        }
                    });
                    showToast('付箋を外しました', 'info');
                } else {
                    // ボタンの見た目を更新
                    if (data.is_flagged) {
                        button.classList.remove('btn-outline-secondary');
                        button.classList.add('btn-info');
                        button.title = '付箋を外す';
                        showToast('付箋を追加しました', 'success');
                    } else {
                        button.classList.remove('btn-info');
                        button.classList.add('btn-outline-secondary');
                        button.title = '付箋を付ける';
                        showToast('付箋を外しました', 'info');
                    }
                    enableButton(button);
                }
            } else {
                showToast('エラー: ' + data.message, 'danger');
                enableButton(button);
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('通信エラーが発生しました', 'danger');
            enableButton(button);
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
const selectAllTx = document.getElementById('selectAllTx');
const bulkActionBar = document.getElementById('bulkActionBar');
const selectedCountText = document.getElementById('selectedCountText');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const applyBulkCategoryBtn = document.getElementById('applyBulkCategoryBtn');
const bulkCategorySelect = document.getElementById('bulkCategorySelect');

// 現在のチェックボックスを都度取得（削除後も正確）
function getTxCheckboxes() {
    return document.querySelectorAll('.tx-select-check');
}

// 選択状態の更新
function updateSelectionUI() {
    const allBoxes = getTxCheckboxes();
    const checkedCount = document.querySelectorAll('.tx-select-check:checked').length;
    if (selectedCountText) {
        selectedCountText.textContent = `${checkedCount}件選択中`;
    }
    if (bulkActionBar) {
        bulkActionBar.style.display = checkedCount > 0 ? 'block' : 'none';
    }
    if (selectAllTx) {
        selectAllTx.checked = checkedCount === allBoxes.length && allBoxes.length > 0;
        selectAllTx.indeterminate = checkedCount > 0 && checkedCount < allBoxes.length;
    }
}

// 全選択チェックボックス
if (selectAllTx) {
    selectAllTx.addEventListener('change', function() {
        getTxCheckboxes().forEach(cb => cb.checked = this.checked);
        updateSelectionUI();
    });
}

// 個別チェックボックス（イベント委譲で削除後も動作）
document.addEventListener('change', function(e) {
    if (e.target.classList.contains('tx-select-check')) {
        updateSelectionUI();
    }
});

// 選択解除ボタン
if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function() {
        getTxCheckboxes().forEach(cb => cb.checked = false);
        if (selectAllTx) selectAllTx.checked = false;
        updateSelectionUI();
    });
}

// 選択を一括変更ボタン（選択された行のセレクトボックスを変更）
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

        // 選択された行のセレクトボックスを変更（自動保存がトリガーされる）
        var changedCount = 0;
        checkedBoxes.forEach(cb => {
            const txId = cb.value;
            const row = cb.closest('tr');
            const categorySelect = row ? row.querySelector('select[name^="cat-"]') : null;
            if (categorySelect) {
                categorySelect.value = selectedCategory;
                categorySelect.dispatchEvent(new Event('change', { bubbles: true }));
                changedCount++;
            }
        });

        showToast(`${checkedBoxes.length}件の分類を「${selectedCategory}」に変更しました`, 'success');
    });
}

// ページ読み込み時に初期状態を確認
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
    ['addTxAccountId',   'account_id',   'data-tx-account',       ''],
    ['addTxCategory',    'category',      null,                   '未分類'],
    ['addTxMemo',        'memo',          null,                   ''],
];

// 口座情報フィールド (続けて追加時に保持)
const ACCOUNT_FIELDS = ['addTxBankName', 'addTxBranchName', 'addTxAccountType', 'addTxAccountId', 'addTxDate'];

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
                data-tx-account-type="${tx.account_type || ''}" data-tx-account="${tx.account_id || ''}"
                title="この下に追加"><i class="bi bi-plus"></i></button>
            <button type="button" class="btn btn-sm btn-outline-danger p-0 px-1 delete-tx-btn"
                data-tx-id="${tx.id}" title="削除"><i class="bi bi-trash"></i></button>
        </td>
        <td>${toWarekiShort(tx.date)}</td>
        <td>${tx.bank_name || '-'}</td>
        <td>${tx.branch_name || '-'}</td>
        <td>${tx.account_type || '-'}</td>
        <td>${tx.account_id || '-'}</td>
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
            data-tx-account-type="${tx.account_type || ''}" data-tx-account="${tx.account_id || ''}">詳細</button></td>
        <td><button type="button" class="btn btn-sm btn-outline-secondary flag-btn"
            data-tx-id="${tx.id}" data-source-tab="all" title="付箋を付ける">📌</button></td>
    `;
    // 先頭に挿入
    tbody.insertBefore(tr, tbody.firstChild);
    // 新しいボタンにイベントリスナーを付与
    tr.querySelector('.insert-tx-btn').addEventListener('click', handleInsertBtnClick);
    tr.querySelector('.delete-tx-btn').addEventListener('click', handleDeleteBtnClick);
    // フェードイン
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
                // 口座情報・日付は保持、摘要・金額・残高・分類・メモをリセット
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

// 追加ボタン（モーダル内）クリック時
if (addTxSubmitBtn) {
    addTxSubmitBtn.addEventListener('click', function() { submitAddTx(this, false); });
}
// 続けて追加ボタン
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

// フィールド名の日本語ラベル
const fieldLabels = {
    'bank_name': '銀行名',
    'branch_name': '支店名',
    'account_id': '口座番号'
};

// 置換フォームの状態を更新
function updateReplaceFormState() {
    const hasOldValue = replaceOldValueSelect.value !== '';
    const hasNewValue = replaceNewValueInput.value.trim() !== '';
    const oldValue = replaceOldValueSelect.value;
    const newValue = replaceNewValueInput.value.trim();
    const isDifferent = oldValue !== newValue;

    // 送信ボタンの有効/無効
    bulkReplaceSubmitBtn.disabled = !(hasOldValue && hasNewValue && isDifferent);

    // プレビュー表示
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
    // フィールド選択時
    replaceFieldSelect.addEventListener('change', function() {
        const fieldName = this.value;

        // UIをリセット
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

        // ローディング表示
        replaceLoadingSpinner.style.display = 'inline-block';

        // APIからユニーク値を取得
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

    // 置換前の値が選択されたとき
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

    // 置換後の値が入力されたとき
    replaceNewValueInput.addEventListener('input', updateReplaceFormState);

    // コピーボタン
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

    // フォーム送信時の確認
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

// ===== パターン追加機能（専用モーダル版） =====

// 現在のパターン登録対象データ
let patternAddData = {
    category: '',
    description: ''
};

// 編集モーダルからパターン登録モーダルを開く
function openPatternAddFromModal(idPrefix) {
    const categorySelect = document.getElementById(idPrefix + 'TxCategory');
    const descriptionInput = document.getElementById(idPrefix + 'TxDescription');

    if (!categorySelect || !descriptionInput) {
        showToast('フォーム要素が見つかりません', 'danger');
        return;
    }

    const category = categorySelect.value;
    const description = descriptionInput.value;

    if (!category || category === '未分類') {
        showToast('先に分類を選択してください', 'warning');
        return;
    }

    if (!description) {
        showToast('摘要が入力されていません', 'warning');
        return;
    }

    // データを保存
    patternAddData = { category, description };

    // モーダルを開く
    openPatternAddModal(category, description);
}

// パターン登録モーダルを開く
function openPatternAddModal(category, description) {
    // 表示を更新
    document.getElementById('patternAddDescription').textContent = description;
    document.getElementById('patternAddCategoryBadge').textContent = category;
    document.getElementById('patternAddKeyword').value = '';
    document.getElementById('scopeGlobal').checked = true;

    // 結果表示をリセット
    const resultDiv = document.getElementById('patternAddResult');
    resultDiv.classList.add('d-none');

    // ボタンをリセット
    const submitBtn = document.getElementById('patternAddSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';

    // キーワード候補を生成
    generateKeywordCandidates(description);

    // 既存キーワードを取得
    fetchExistingKeywords(category);

    // モーダルを表示
    const modal = new bootstrap.Modal(document.getElementById('patternAddModal'));
    modal.show();
}

// 摘要から複数のキーワード候補を抽出
function generateKeywordCandidates(description) {
    const candidatesDiv = document.getElementById('keywordCandidates');
    candidatesDiv.innerHTML = '';

    if (!description) return;

    const candidates = extractMultipleKeywords(description);

    candidates.forEach((kw, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-outline-primary border border-primary text-primary p-2 keyword-candidate';
        badge.style.cursor = 'pointer';
        badge.textContent = kw;
        badge.onclick = () => selectKeywordCandidate(kw);

        // 最初の候補を推奨としてハイライト
        if (index === 0) {
            badge.className = 'badge bg-primary text-white p-2 keyword-candidate';
            badge.innerHTML = '<i class="bi bi-star-fill"></i> ' + kw;
        }

        candidatesDiv.appendChild(badge);
    });
}

// キーワード候補を選択
function selectKeywordCandidate(keyword) {
    document.getElementById('patternAddKeyword').value = keyword;

    // 選択状態を視覚化
    document.querySelectorAll('.keyword-candidate').forEach(badge => {
        badge.classList.remove('bg-success');
        badge.classList.add('bg-primary', 'bg-outline-primary');
    });
}

// 既存キーワードを取得
function fetchExistingKeywords(category) {
    const container = document.getElementById('existingKeywords');
    const countBadge = document.getElementById('existingKeywordsCount');

    container.innerHTML = '<span class="text-muted small">読み込み中...</span>';

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData();
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('action', 'get_category_keywords');
    formData.append('category', category);

    fetch(window.location.href, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const globalKws = data.global_keywords || [];
            const caseKws = data.case_keywords || [];
            const total = globalKws.length + caseKws.length;

            countBadge.textContent = total;

            if (total === 0) {
                container.innerHTML = '<span class="text-muted small">まだキーワードがありません</span>';
                return;
            }

            let html = '';

            if (globalKws.length > 0) {
                html += '<div class="mb-1"><small class="text-muted">グローバル:</small> ';
                html += globalKws.map(k => `<span class="badge bg-light text-dark me-1">${k}</span>`).join('');
                html += '</div>';
            }

            if (caseKws.length > 0) {
                html += '<div><small class="text-muted">案件固有:</small> ';
                html += caseKws.map(k => `<span class="badge bg-warning text-dark me-1">${k}</span>`).join('');
                html += '</div>';
            }

            container.innerHTML = html;
        } else {
            container.innerHTML = '<span class="text-danger small">取得に失敗しました</span>';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        container.innerHTML = '<span class="text-danger small">エラーが発生しました</span>';
    });
}

// パターン登録を実行
function submitPatternAdd() {
    const keyword = document.getElementById('patternAddKeyword').value.trim();
    const scope = document.querySelector('input[name="patternScope"]:checked').value;
    const category = patternAddData.category;

    if (!keyword) {
        showPatternAddResult('warning', 'キーワードを入力してください');
        return;
    }

    const submitBtn = document.getElementById('patternAddSubmitBtn');
    setButtonLoading(submitBtn, '追加中...');

    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    const formData = new FormData();
    formData.append('csrfmiddlewaretoken', csrfToken);
    formData.append('action', 'add_pattern');
    formData.append('category', category);
    formData.append('keyword', keyword);
    formData.append('scope', scope);

    fetch(window.location.href, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            const scopeLabel = scope === 'global' ? 'グローバル' : 'この案件';

            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> 追加完了';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-success');

            // モーダルを閉じる
            const patternModal = bootstrap.Modal.getInstance(document.getElementById('patternAddModal'));
            if (patternModal) {
                setTimeout(() => {
                    patternModal.hide();
                    // トースト通知
                    showToast(`「${keyword}」を「${category}」に追加しました（${scopeLabel}）`, 'success');
                    // ボタンをリセット
                    resetButton(submitBtn);
                    submitBtn.classList.remove('btn-success');
                    submitBtn.classList.add('btn-primary');
                }, 500);
            }
        } else {
            showPatternAddResult('danger', data.error || '追加に失敗しました');
            resetButton(submitBtn);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showPatternAddResult('danger', 'エラーが発生しました');
        resetButton(submitBtn);
    });
}

// パターン登録結果を表示
function showPatternAddResult(type, message) {
    const resultDiv = document.getElementById('patternAddResult');
    const alertDiv = resultDiv.querySelector('.alert');

    resultDiv.classList.remove('d-none');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    // 成功時は3秒後に非表示
    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('d-none');
        }, 3000);
    }
}

// パターン登録モーダルの初期化
document.addEventListener('DOMContentLoaded', function() {
    const patternAddSubmitBtn = document.getElementById('patternAddSubmitBtn');
    if (patternAddSubmitBtn) {
        patternAddSubmitBtn.addEventListener('click', submitPatternAdd);
    }

    // Enterキーで追加
    const patternAddKeyword = document.getElementById('patternAddKeyword');
    if (patternAddKeyword) {
        patternAddKeyword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPatternAdd();
            }
        });
    }

    // 未分類タブの初期化
    UnclassifiedTab.init();

    // AI分類タブの初期化
    AISuggestions.init();
});

// ===== 未分類タブ =====

const UnclassifiedTab = {
    // 選択状態を更新
    updateSelectionUI: function() {
        const checked = document.querySelectorAll('.unclassified-select-check:checked');
        const count = checked.length;

        const selectedCountText = document.getElementById('unclassifiedSelectedCountText');
        const bulkActionBar = document.getElementById('unclassifiedBulkActionBar');

        if (selectedCountText) {
            selectedCountText.textContent = `${count}件選択中`;
        }
        if (bulkActionBar) {
            bulkActionBar.style.display = count > 0 ? 'block' : 'none';
        }
    },

    // 選択された取引のカテゴリを一括変更
    applyBulkCategory: function() {
        const bulkCategorySelect = document.getElementById('unclassifiedBulkCategorySelect');
        const category = bulkCategorySelect ? bulkCategorySelect.value : '';
        if (!category) {
            showToast('分類を選択してください', 'danger');
            return;
        }

        const checked = document.querySelectorAll('.unclassified-select-check:checked');
        checked.forEach(cb => {
            const row = cb.closest('tr');
            const select = row.querySelector('select[name^="uncat-"]');
            if (select) {
                select.value = category;
                // 自動保存をトリガー
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        showToast(`${checked.length}件の分類を「${category}」に変更しました`, 'success');

        // インラインパターン追加セクションを表示
        this._showInlinePatternSection(category, checked);
    },

    // インラインパターンセクションを表示
    _showInlinePatternSection: function(category, checkedBoxes) {
        var section = document.getElementById('inlinePatternSection');
        if (!section) return;

        section.style.display = 'block';
        section.dataset.category = category;

        // 最初の選択項目から摘要を取得してキーワード候補生成
        if (checkedBoxes.length > 0) {
            var firstRow = checkedBoxes[0].closest('tr');
            var desc = firstRow ? firstRow.dataset.description : '';
            this._populateInlineKeywordCandidates(desc);
        }
    },

    // キーワード候補を生成
    _populateInlineKeywordCandidates: function(description) {
        var container = document.getElementById('inlineKeywordCandidates');
        var input = document.getElementById('inlinePatternKeyword');
        if (!container || !input) return;

        container.innerHTML = '';
        var candidates = extractMultipleKeywords(description);
        candidates.slice(0, 5).forEach(function(kw, i) {
            var badge = document.createElement('span');
            badge.className = i === 0
                ? 'badge bg-primary text-white p-2'
                : 'badge bg-light text-dark border p-2';
            badge.textContent = kw;
            badge.onclick = function() { input.value = kw; };
            container.appendChild(badge);
        });

        // 最初の候補を自動入力
        if (candidates.length > 0) {
            input.value = candidates[0];
        }
    },

    // パターンを追加
    addPattern: function(scope) {
        const bulkCategorySelect = document.getElementById('unclassifiedBulkCategorySelect');
        const category = bulkCategorySelect ? bulkCategorySelect.value : '';
        if (!category) {
            showToast('分類を選択してください', 'danger');
            return;
        }

        const checked = document.querySelectorAll('.unclassified-select-check:checked');
        if (checked.length === 0) {
            showToast('取引を選択してください', 'danger');
            return;
        }

        // 最初の選択項目から摘要を取得
        const firstRow = checked[0].closest('tr');
        const description = firstRow.dataset.description || '';
        const defaultKeyword = extractKeywordFromDescription(description);

        const scopeLabel = scope === 'case' ? 'この案件' : '全案件（グローバル）';
        ConfirmModal.prompt({
            title: 'パターン追加',
            message: `「${category}」のパターンに追加するキーワードを入力してください：\n摘要例: ${description}\n適用範囲: ${scopeLabel}`,
            defaultValue: defaultKeyword,
            placeholder: 'キーワードを入力',
            confirmText: '追加',
            onConfirm: (keyword) => {
                const formData = createFormData({
                    action: 'add_pattern',
                    category: category,
                    keyword: keyword,
                    scope: scope
                });

                postJson(window.location.href, formData, {
                    onSuccess: () => {
                        const scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                        showToast(`キーワード「${keyword}」を「${category}」に追加しました${scopeMsg}`, 'success');
                    },
                });
            }
        });
    },

    // 初期化
    init: function() {
        const self = this;
        const checkboxes = document.querySelectorAll('.unclassified-select-check');
        const selectAllCheckbox = document.getElementById('selectAllUnclassified');

        // 要素がなければスキップ
        if (checkboxes.length === 0) return;

        // 個別チェックボックスのイベント
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => self.updateSelectionUI());
        });

        // 全選択チェックボックス
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', function() {
                checkboxes.forEach(cb => {
                    cb.checked = this.checked;
                });
                self.updateSelectionUI();
            });
        }

        // 一括変更ボタン
        const applyBulkBtn = document.getElementById('applyUnclassifiedBulkBtn');
        if (applyBulkBtn) {
            applyBulkBtn.addEventListener('click', () => self.applyBulkCategory());
        }

        // パターン追加ボタン
        const addGlobalBtn = document.getElementById('addGlobalPatternBtn');
        if (addGlobalBtn) {
            addGlobalBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.addPattern('global');
            });
        }

        const addCaseBtn = document.getElementById('addCasePatternBtn');
        if (addCaseBtn) {
            addCaseBtn.addEventListener('click', function(e) {
                e.preventDefault();
                self.addPattern('case');
            });
        }

        // 選択解除ボタン
        const clearBtn = document.getElementById('clearUnclassifiedSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                checkboxes.forEach(cb => cb.checked = false);
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                self.updateSelectionUI();
                // インラインパターンセクションを非表示
                var section = document.getElementById('inlinePatternSection');
                if (section) section.style.display = 'none';
            });
        }

        // インラインパターン追加ボタン
        var inlineAddBtn = document.getElementById('inlinePatternAddBtn');
        if (inlineAddBtn) {
            inlineAddBtn.addEventListener('click', function() {
                var keyword = document.getElementById('inlinePatternKeyword').value.trim();
                var section = document.getElementById('inlinePatternSection');
                var category = section ? section.dataset.category : '';
                var scopeBtn = document.querySelector('#inlinePatternSection .btn-group .btn.active');
                var scope = scopeBtn ? scopeBtn.dataset.scope : 'global';

                if (!keyword) { showToast('キーワードを入力してください', 'warning'); return; }
                if (!category) { showToast('カテゴリーが指定されていません', 'warning'); return; }

                var formData = createFormData({
                    action: 'add_pattern',
                    category: category,
                    keyword: keyword,
                    scope: scope,
                });

                postJson(window.location.href, formData, {
                    onSuccess: function() {
                        var scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                        showToast('「' + keyword + '」を「' + category + '」に追加しました' + scopeMsg, 'success');
                        section.style.display = 'none';
                    },
                });
            });
        }

        // インラインスコープ切替
        document.querySelectorAll('#inlinePatternSection .btn-group .btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                this.parentElement.querySelectorAll('.btn').forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
            });
        });
    }
};

// ===== AI分類タブ =====

const AISuggestions = {
    _pendingApplies: 0,

    // ファジー閾値の更新
    updateFuzzyThreshold: function(value) {
        const el = document.getElementById('fuzzyThresholdValue');
        if (el) el.textContent = value + '%';
    },

    // 提案の再生成
    regenerate: function() {
        const slider = document.getElementById('fuzzyThresholdSlider');
        if (!slider) return;
        const threshold = slider.value;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('fuzzy_threshold', threshold);
        currentUrl.searchParams.set('regenerate_ai', 'true');
        window.location.href = currentUrl.toString();
    },

    // 単一取引の適用（確認あり — 85%未満用）
    apply: function(txId, category) {
        const self = this;
        ConfirmModal.show({
            title: 'AI分類の適用',
            message: `「${category}」に分類しますか？`,
            confirmText: '適用',
            onConfirm: () => self._applyOne(txId, category),
        });
    },

    // 単一取引の即時適用（95%以上用、確認なし）
    applyDirect: function(txId, category) {
        this._applyOne(txId, category);
    },

    _applyOne: function(txId, category) {
        const self = this;
        const formData = createFormData({
            action: 'apply_ai_suggestion',
            tx_id: txId,
            category: category,
        });
        postJson(window.location.href, formData, {
            onSuccess: () => {
                self.removeRow(txId);
                self.updateBadgeCount(-1);
                showToast(`「${category}」に分類しました`, 'success');
            },
        });
    },

    // グループ一括適用 (apply_all を使って同摘要をまとめて適用)
    applyGroup: function(row) {
        const self = this;
        const txIds = row.dataset.txIds.split(',').map(Number);
        const category = row.dataset.category;
        const description = row.dataset.description;
        const count = parseInt(row.dataset.count);

        // apply_all で同摘要を一括更新
        const formData = createFormData({
            action: 'update_category',
            tx_id: txIds[0],
            category: category,
            apply_all: 'true',
        });

        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';

        postJson(window.location.href, formData, {
            onSuccess: () => {
                self.updateBadgeCount(-count);
                highlightAndRemoveRow(row);
                // フラットビューからも同摘要の行を消す
                self._removeFlatRowsByDescription(description);
                showToast(`「${category}」に${count}件分類しました`, 'success');
            },
            onError: () => {
                row.style.opacity = '';
                row.style.pointerEvents = '';
            },
        });
    },

    // グループのパターン追加付き適用
    applyGroupWithPattern: function(row, scope) {
        const self = this;
        const txIds = row.dataset.txIds.split(',').map(Number);
        const category = row.dataset.category;
        const description = row.dataset.description;
        const count = parseInt(row.dataset.count);
        const scopeLabel = scope === 'case' ? 'この案件' : '全案件（グローバル）';
        const defaultKeyword = extractKeywordFromDescription(description);

        ConfirmModal.prompt({
            title: 'パターン追加',
            message: `「${category}」のパターンに追加するキーワード：\n摘要: ${description}\n適用範囲: ${scopeLabel}\n対象: ${count}件`,
            defaultValue: defaultKeyword,
            placeholder: 'キーワードを入力',
            confirmText: '適用＆追加',
            onConfirm: (keyword) => {
                // classify_and_register_pattern で一括適用＋パターン登録
                const formData = createFormData({
                    action: 'classify_and_register_pattern',
                    category: category,
                    keyword: keyword,
                    scope: scope,
                    description: description,
                });
                postJson(window.location.href, formData, {
                    onSuccess: (data) => {
                        const appliedCount = data.count || count;
                        self.updateBadgeCount(-appliedCount);
                        highlightAndRemoveRow(row);
                        self._removeFlatRowsByDescription(description);
                        // 他グループ行からも同摘要を含むものを消す
                        self._removeGroupRowsByDescription(description);
                        const scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                        showToast(`${appliedCount}件を「${category}」に分類し、キーワード「${keyword}」を追加しました${scopeMsg}`, 'success');
                    },
                });
            },
        });
    },

    // AI提案の却下
    dismiss: function(txId) {
        this.removeRow(txId);
        this.updateBadgeCount(-1);
        showToast('提案を却下しました', 'info');
    },

    // グループ却下
    dismissGroup: function(row) {
        const count = parseInt(row.dataset.count);
        const description = row.dataset.description;
        this.updateBadgeCount(-count);
        highlightAndRemoveRow(row);
        this._removeFlatRowsByDescription(description);
        showToast(`${count}件の提案を却下しました`, 'info');
    },

    // 行をフェードアウトして削除
    removeRow: function(txId) {
        highlightAndRemoveRow(document.getElementById(`ai-row-${txId}`));
    },

    // フラットビューの同摘要行を全て消す (D: パターン追加後の自動消去)
    _removeFlatRowsByDescription: function(description) {
        document.querySelectorAll('#aiFlatView .ai-flat-row').forEach(row => {
            if (row.dataset.description === description) {
                highlightAndRemoveRow(row);
            }
        });
    },

    // グループビューの同摘要行を全て消す
    _removeGroupRowsByDescription: function(description) {
        document.querySelectorAll('#aiGroupedView .ai-group-row').forEach(row => {
            if (row.dataset.description === description) {
                highlightAndRemoveRow(row);
            }
        });
    },

    // 一括適用 (C: リロードせずフェードアウト＋サマリー)
    bulkApply: function(minScore) {
        const scoreText = minScore === 95 ? '95%以上' : '85%以上';

        ConfirmModal.show({
            title: 'AI提案の一括適用',
            message: `信頼度${scoreText}のAI提案を一括適用しますか？`,
            confirmText: '一括適用',
            onConfirm: () => {
                const formData = createFormData({
                    action: 'bulk_apply_ai_suggestions',
                    min_score: minScore,
                });
                showToast('一括適用中...', 'info');
                const self = this;
                postJson(window.location.href, formData, {
                    onSuccess: function(data) {
                        // フェードアウトで該当行を消す
                        let removedCount = 0;
                        // グループ行
                        document.querySelectorAll('#aiGroupedView .ai-group-row').forEach(row => {
                            if (parseInt(row.dataset.score) >= minScore) {
                                removedCount += parseInt(row.dataset.count);
                                highlightAndRemoveRow(row);
                            }
                        });
                        // フラット行
                        document.querySelectorAll('#aiFlatView .ai-flat-row').forEach(row => {
                            if (parseInt(row.dataset.score) >= minScore) {
                                highlightAndRemoveRow(row);
                            }
                        });
                        self.updateBadgeCount(-removedCount);
                        const appliedCount = data.count || removedCount;
                        showToast(`${appliedCount}件を一括適用しました（信頼度${scoreText}）`, 'success');
                    },
                });
            },
        });
    },

    // 適用してパターンに追加 (フラットビュー用)
    applyAndAddPattern: function(txId, category, description, scope) {
        const scopeLabel = scope === 'case' ? 'この案件' : '全案件（グローバル）';
        const defaultKeyword = extractKeywordFromDescription(description);
        const self = this;

        ConfirmModal.prompt({
            title: 'パターン追加',
            message: `「${category}」のパターンに追加するキーワードを入力してください：\n摘要: ${description}\n適用範囲: ${scopeLabel}`,
            defaultValue: defaultKeyword,
            placeholder: 'キーワードを入力',
            confirmText: '適用＆追加',
            onConfirm: (keyword) => {
                const formData = createFormData({
                    action: 'classify_and_register_pattern',
                    category: category,
                    keyword: keyword,
                    scope: scope,
                    description: description,
                });
                postJson(window.location.href, formData, {
                    onSuccess: (data) => {
                        const appliedCount = data.count || 1;
                        self.updateBadgeCount(-appliedCount);
                        // (D) 同摘要の行を全て消す
                        self._removeFlatRowsByDescription(description);
                        self._removeGroupRowsByDescription(description);
                        const scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                        showToast(`${appliedCount}件を「${category}」に分類し、キーワード「${keyword}」を追加しました${scopeMsg}`, 'success');
                    },
                });
            },
        });
    },

    // バッジカウント更新
    updateBadgeCount: function(delta) {
        const badge = document.querySelector('#ai-tab .badge');
        if (badge) {
            const count = parseInt(badge.textContent) + delta;
            if (count > 0) {
                badge.textContent = count;
            } else {
                badge.remove();
            }
        }
        // ProgressBar更新（未分類タブにある場合）
        if (typeof ProgressBar !== 'undefined' && ProgressBar.update) {
            ProgressBar.update(-delta);
        }
    },

    // ビュー切替
    _initViewToggle: function() {
        const toggle = document.getElementById('aiViewToggle');
        if (!toggle) return;
        const groupedView = document.getElementById('aiGroupedView');
        const flatView = document.getElementById('aiFlatView');
        if (!groupedView || !flatView) return;

        toggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', function() {
                toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
                const view = this.dataset.view;
                groupedView.style.display = view === 'grouped' ? '' : 'none';
                flatView.style.display = view === 'flat' ? '' : 'none';
            });
        });
    },

    // グループ行のイベントバインド
    _initGroupActions: function() {
        const self = this;

        // ワンクリック適用 (95%以上)
        document.querySelectorAll('.ai-apply-group-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.ai-group-row');
                self.applyGroup(row);
            });
        });

        // 確認付き適用 (95%未満)
        document.querySelectorAll('.ai-apply-group-confirm-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.ai-group-row');
                const category = row.dataset.category;
                const count = row.dataset.count;
                ConfirmModal.show({
                    title: 'AI分類の適用',
                    message: `「${category}」に${count}件分類しますか？`,
                    confirmText: '適用',
                    onConfirm: () => self.applyGroup(row),
                });
            });
        });

        // パターン追加 (グローバル/案件)
        document.querySelectorAll('.ai-pattern-global').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const row = this.closest('.ai-group-row');
                self.applyGroupWithPattern(row, 'global');
            });
        });

        document.querySelectorAll('.ai-pattern-case').forEach(link => {
            link.addEventListener('click', function(e) {
                e.preventDefault();
                const row = this.closest('.ai-group-row');
                self.applyGroupWithPattern(row, 'case');
            });
        });

        // グループ却下
        document.querySelectorAll('.ai-dismiss-group-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.ai-group-row');
                self.dismissGroup(row);
            });
        });
    },

    // フラットビューのワンクリック適用ボタン
    _initFlatOneClick: function() {
        const self = this;
        document.querySelectorAll('.ai-apply-flat-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const txId = parseInt(this.dataset.txId);
                const category = this.dataset.category;
                self.applyDirect(txId, category);
            });
        });
    },

    // 初期化
    init: function() {
        // Popovers初期化
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });

        this._initViewToggle();
        this._initGroupActions();
        this._initFlatOneClick();
    },
};

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

// ===== インライン分類の即時保存 =====

document.addEventListener('change', function(e) {
    var select = e.target;
    if (!select.matches('select[name^="cat-"], select[name^="uncat-"]')) return;

    var name = select.name;
    var txId = name.replace(/^(cat|uncat)-/, '');
    var newCategory = select.value;
    var lastSaved = select.dataset.lastSaved || '';

    // 同じ値なら何もしない
    if (newCategory === lastSaved) return;

    // 元の値を保存（ロールバック用）
    var originalValue = lastSaved;
    var row = select.closest('tr');

    select.disabled = true;
    StatusIndicator.saving();

    var formData = createFormData({
        action: 'update_category',
        tx_id: txId,
        new_category: newCategory,
    });

    postJson(window.location.href, formData, {
        onSuccess: function() {
            select.dataset.lastSaved = newCategory;
            if (row) {
                row.style.backgroundColor = 'rgba(25, 135, 84, 0.1)';
                setTimeout(function() { row.style.backgroundColor = ''; }, 800);
            }
            StatusIndicator.saved();
        },
        onError: function() {
            select.value = originalValue;
            StatusIndicator.failed();
        },
        onFinally: function() {
            select.disabled = false;
        },
    });
});

// ===== キーボードショートカット =====

const KeyboardShortcuts = {
    _focusedRowIndex: -1,

    _getVisibleRows: function() {
        var activePane = document.querySelector('.tab-pane.active');
        if (!activePane) return [];
        return Array.from(activePane.querySelectorAll('tbody tr[data-tx-id]'));
    },

    _setFocusedRow: function(index) {
        var rows = this._getVisibleRows();
        document.querySelectorAll('.row-focused').forEach(function(r) { r.classList.remove('row-focused'); });
        if (index < 0 || index >= rows.length) return;
        this._focusedRowIndex = index;
        rows[index].classList.add('row-focused');
        rows[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },

    _isInputFocused: function() {
        var el = document.activeElement;
        if (!el) return false;
        var tag = el.tagName;
        return tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || el.isContentEditable;
    },

    init: function() {
        var self = this;

        document.addEventListener('keydown', function(e) {
            if (self._isInputFocused()) return;
            if (document.querySelector('.modal.show')) return;

            var rows = self._getVisibleRows();
            var key = e.key;

            switch (key) {
                case 'j':
                case 'ArrowDown':
                    e.preventDefault();
                    self._setFocusedRow(Math.min(self._focusedRowIndex + 1, rows.length - 1));
                    break;

                case 'k':
                case 'ArrowUp':
                    e.preventDefault();
                    self._setFocusedRow(Math.max(self._focusedRowIndex - 1, 0));
                    break;

                case ' ':
                    if (self._focusedRowIndex >= 0 && rows[self._focusedRowIndex]) {
                        e.preventDefault();
                        var cb = rows[self._focusedRowIndex].querySelector('input[type="checkbox"]');
                        if (cb) {
                            cb.checked = !cb.checked;
                            cb.dispatchEvent(new Event('change', { bubbles: true }));
                        }
                    }
                    break;

                case 'e':
                    if (self._focusedRowIndex >= 0 && rows[self._focusedRowIndex]) {
                        e.preventDefault();
                        var editBtn = rows[self._focusedRowIndex].querySelector('[data-bs-toggle="modal"][data-bs-target="#editModal"]');
                        if (editBtn) editBtn.click();
                    }
                    break;

                case 'f':
                    if (self._focusedRowIndex >= 0 && rows[self._focusedRowIndex]) {
                        e.preventDefault();
                        var flagBtn = rows[self._focusedRowIndex].querySelector('.flag-btn');
                        if (flagBtn) flagBtn.click();
                    }
                    break;

                case 'Escape':
                    document.querySelectorAll('.row-focused').forEach(function(r) { r.classList.remove('row-focused'); });
                    self._focusedRowIndex = -1;
                    var clearBtn = document.getElementById('clearSelectionBtn') || document.getElementById('clearUnclassifiedSelectionBtn');
                    if (clearBtn) clearBtn.click();
                    break;

                case '?':
                    e.preventDefault();
                    self._showHelp();
                    break;

                case '1': case '2': case '3': case '4': case '5':
                case '6': case '7': case '8': case '9':
                    if (self._focusedRowIndex >= 0 && rows[self._focusedRowIndex]) {
                        e.preventDefault();
                        var catSelect = rows[self._focusedRowIndex].querySelector('select[name^="cat-"], select[name^="uncat-"]');
                        if (catSelect) {
                            var optIndex = parseInt(key);
                            if (catSelect.options[optIndex]) {
                                catSelect.value = catSelect.options[optIndex].value;
                                catSelect.dispatchEvent(new Event('change', { bubbles: true }));
                            }
                        }
                    }
                    break;
            }

            // Ctrl+S / Cmd+S
            if ((e.ctrlKey || e.metaKey) && key === 's') {
                e.preventDefault();
                var activePane = document.querySelector('.tab-pane.active');
                if (activePane) {
                    var form = activePane.querySelector('form[method="post"]');
                    if (form) form.submit();
                }
            }
        });
    },

    _showHelp: function() {
        ConfirmModal.show({
            title: 'キーボードショートカット',
            message: [
                'j / ↓ : 次の行に移動',
                'k / ↑ : 前の行に移動',
                'Space : チェックボックスのON/OFF',
                'e : 編集モーダルを開く',
                'f : 付箋のON/OFF',
                '1-9 : 分類を即時変更（上から順）',
                'Ctrl+S : 一括保存',
                'Esc : 選択解除',
                '? : このヘルプを表示',
            ].join('\n'),
            confirmText: '閉じる',
        });
    }
};

// ===== 右クリックコンテキストメニュー =====

const ContextMenu = {
    _targetRow: null,

    init: function() {
        var self = this;
        var menu = document.getElementById('contextMenu');
        var catSubmenu = document.getElementById('categorySubmenu');
        if (!menu) return;

        // 右クリックでメニュー表示
        document.addEventListener('contextmenu', function(e) {
            var row = e.target.closest('tr[data-tx-id]');
            if (!row) return;

            e.preventDefault();
            self._targetRow = row;

            // 位置調整（画面外にはみ出さない）
            var x = Math.min(e.clientX, window.innerWidth - 200);
            var y = Math.min(e.clientY, window.innerHeight - 300);
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.display = 'block';

            // タイトル設定
            var descCell = row.querySelector('td[title]');
            var title = menu.querySelector('#contextMenuTitle');
            if (title && descCell) {
                var desc = descCell.title || '';
                title.textContent = desc.length > 20 ? desc.substring(0, 20) + '...' : desc;
            }

            catSubmenu.style.display = 'none';
        });

        // メニュー外クリックで閉じる
        document.addEventListener('click', function(e) {
            if (!menu.contains(e.target) && !catSubmenu.contains(e.target)) {
                menu.style.display = 'none';
                catSubmenu.style.display = 'none';
            }
        });

        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                menu.style.display = 'none';
                catSubmenu.style.display = 'none';
            }
        });

        // メニュー項目クリック
        menu.addEventListener('click', function(e) {
            var item = e.target.closest('[data-action]');
            if (!item) return;
            e.preventDefault();

            var action = item.dataset.action;
            var row = self._targetRow;
            menu.style.display = 'none';

            switch (action) {
                case 'edit':
                    var editBtn = row.querySelector('[data-bs-toggle="modal"][data-bs-target="#editModal"]');
                    if (editBtn) editBtn.click();
                    break;

                case 'flag':
                    var flagBtn = row.querySelector('.flag-btn');
                    if (flagBtn) flagBtn.click();
                    break;

                case 'delete':
                    var deleteBtn = row.querySelector('.delete-tx-btn');
                    if (deleteBtn) deleteBtn.click();
                    break;

                case 'pattern':
                    var catSelect = row.querySelector('select[name^="cat-"], select[name^="uncat-"]');
                    var category = catSelect ? catSelect.value : '';
                    var description = (row.querySelector('td[title]') || {}).title || '';
                    if (category && category !== '未分類') {
                        openPatternAddModal(category, description);
                    } else {
                        showToast('先に分類を選択してください', 'warning');
                    }
                    break;

                case 'category-submenu':
                    var rect = menu.getBoundingClientRect();
                    var subX = Math.min(rect.right - 5, window.innerWidth - 200);
                    catSubmenu.style.left = subX + 'px';
                    catSubmenu.style.top = rect.top + 'px';
                    catSubmenu.style.display = 'block';
                    break;
            }
        });

        // カテゴリーサブメニュークリック
        if (catSubmenu) {
            catSubmenu.addEventListener('click', function(e) {
                var item = e.target.closest('.category-submenu-item');
                if (!item) return;
                e.preventDefault();

                var newCategory = item.dataset.category;
                var row = self._targetRow;
                var catSelect = row.querySelector('select[name^="cat-"], select[name^="uncat-"]');

                if (catSelect) {
                    catSelect.value = newCategory;
                    catSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }

                catSubmenu.style.display = 'none';
                menu.style.display = 'none';
            });
        }
    }
};

// ===== クイックフィルター =====

const QuickFilters = {
    _container: null,

    init: function() {
        this._container = document.getElementById('quickFilters');
        if (!this._container) return;

        var self = this;
        var params = new URLSearchParams(window.location.search);

        // アクティブ状態を反映
        this._updateActiveStates(params);

        this._container.addEventListener('click', function(e) {
            var btn = e.target.closest('[data-quick]');
            if (!btn) return;
            self._handleClick(btn.dataset.quick);
        });
    },

    _updateActiveStates: function(params) {
        var amountType = params.get('amount_type') || 'both';
        var amountMin = params.get('amount_min') || '';

        var buttons = this._container.querySelectorAll('[data-quick]');
        buttons.forEach(function(btn) {
            var isActive = false;
            switch (btn.dataset.quick) {
                case 'outOnly': isActive = amountType === 'out'; break;
                case 'inOnly': isActive = amountType === 'in'; break;
                case 'over300k': isActive = amountMin === '300000'; break;
                case 'over500k': isActive = amountMin === '500000'; break;
                case 'over1m': isActive = amountMin === '1000000'; break;
            }
            btn.classList.toggle('btn-primary', isActive);
            btn.classList.toggle('btn-outline-secondary', !isActive);
        });
    },

    _handleClick: function(action) {
        var params = new URLSearchParams(window.location.search);
        params.set('tab', 'all');

        switch (action) {
            case 'outOnly':
                if (params.get('amount_type') === 'out') params.delete('amount_type');
                else params.set('amount_type', 'out');
                break;
            case 'inOnly':
                if (params.get('amount_type') === 'in') params.delete('amount_type');
                else params.set('amount_type', 'in');
                break;
            case 'over300k':
                if (params.get('amount_min') === '300000') params.delete('amount_min');
                else params.set('amount_min', '300000');
                break;
            case 'over500k':
                if (params.get('amount_min') === '500000') params.delete('amount_min');
                else params.set('amount_min', '500000');
                break;
            case 'over1m':
                if (params.get('amount_min') === '1000000') params.delete('amount_min');
                else params.set('amount_min', '1000000');
                break;
        }

        window.location.search = params.toString();
    }
};

// ===== アクティブフィルター・チップ =====

const FilterChips = {
    _container: null,

    _FILTER_LABELS: {
        date_from: '開始日',
        date_to: '終了日',
        bank: '銀行',
        account: '口座',
        category: '分類',
        category_mode: '分類モード',
        keyword: 'キーワード',
        amount_type: '取引種別',
        amount_min: '最小金額',
        amount_max: '最大金額',
    },

    _AMOUNT_TYPE_LABELS: { out: '出金のみ', 'in': '入金のみ' },

    _SKIP_PARAMS: ['tab', 'page', 'all_page', 'unclassified_page'],

    init: function() {
        this._container = document.getElementById('activeFilterChips');
        if (!this._container) return;
        this._render();
    },

    _render: function() {
        var params = new URLSearchParams(window.location.search);
        var chips = [];
        var self = this;

        for (var pair of params.entries()) {
            var key = pair[0];
            var value = pair[1];

            if (self._SKIP_PARAMS.indexOf(key) >= 0) continue;
            if (!value || value === 'both' || value === 'include') continue;

            var label = self._FILTER_LABELS[key] || key;
            var displayValue = value;

            if (key === 'amount_type') displayValue = self._AMOUNT_TYPE_LABELS[value] || value;
            else if (key === 'category_mode') { if (value === 'exclude') displayValue = '以外'; else continue; }
            else if (key === 'amount_min' || key === 'amount_max') displayValue = Number(value).toLocaleString() + '円';

            chips.push({ key: key, value: value, label: label, displayValue: displayValue });
        }

        if (chips.length === 0) {
            this._container.style.display = 'none';
            return;
        }

        this._container.style.display = 'flex';
        this._container.innerHTML = '<span class="small text-muted me-1"><i class="bi bi-funnel-fill"></i> 適用中:</span>';

        chips.forEach(function(chip) {
            var el = document.createElement('span');
            el.className = 'filter-chip';
            el.innerHTML = '<strong>' + chip.label + '</strong>: ' + chip.displayValue +
                ' <button type="button" class="btn-close" aria-label="削除" data-filter-key="' + chip.key + '" data-filter-value="' + chip.value + '"></button>';
            self._container.appendChild(el);
        });

        // ×ボタンクリック
        this._container.addEventListener('click', function(e) {
            var closeBtn = e.target.closest('.btn-close[data-filter-key]');
            if (!closeBtn) return;

            var key = closeBtn.dataset.filterKey;
            var value = closeBtn.dataset.filterValue;
            var newParams = new URLSearchParams(window.location.search);

            // multi-value パラメータ（bank, account, category）
            var allValues = newParams.getAll(key);
            if (allValues.length > 1) {
                newParams.delete(key);
                allValues.forEach(function(v) { if (v !== value) newParams.append(key, v); });
            } else {
                newParams.delete(key);
            }

            // category_mode は category がなくなったら削除
            if (key === 'category' && newParams.getAll('category').length === 0) {
                newParams.delete('category_mode');
            }

            window.location.search = newParams.toString();
        });
    }
};

// ===== フィルター・プリセット =====

const FilterPresets = {
    _storageKey: null,
    _dropdown: null,

    init: function() {
        var quickFilters = document.getElementById('quickFilters');
        if (!quickFilters) return;

        var casePk = quickFilters.dataset.casePk;
        if (!casePk) return;
        this._storageKey = 'filterPresets_' + casePk;

        this._buildUI(quickFilters);
        this._renderPresets();
    },

    _buildUI: function(container) {
        var self = this;

        // 保存ボタン
        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-outline-secondary btn-sm ms-2';
        saveBtn.innerHTML = '<i class="bi bi-bookmark-plus"></i> 条件を保存';
        saveBtn.addEventListener('click', function() { self._savePreset(); });
        container.appendChild(saveBtn);

        // プリセットドロップダウン
        var wrapper = document.createElement('div');
        wrapper.className = 'dropdown d-inline-block ms-1';
        wrapper.innerHTML =
            '<button class="btn btn-outline-secondary btn-sm dropdown-toggle" type="button" data-bs-toggle="dropdown" id="presetDropdownBtn">' +
            '<i class="bi bi-bookmarks"></i> プリセット</button>' +
            '<ul class="dropdown-menu" id="presetDropdownMenu"></ul>';
        container.appendChild(wrapper);

        this._dropdown = wrapper.querySelector('#presetDropdownMenu');
    },

    _getPresets: function() {
        try { return JSON.parse(localStorage.getItem(this._storageKey) || '[]'); }
        catch (e) { return []; }
    },

    _setPresets: function(presets) {
        localStorage.setItem(this._storageKey, JSON.stringify(presets));
    },

    _savePreset: function() {
        var name = window.prompt('プリセット名を入力してください:');
        if (!name) return;

        var params = new URLSearchParams(window.location.search);
        params.delete('tab');
        params.delete('page');
        params.delete('all_page');

        var presets = this._getPresets();
        presets.push({ name: name, params: params.toString() });
        this._setPresets(presets);
        this._renderPresets();
        showToast('プリセット「' + name + '」を保存しました', 'success');
    },

    _renderPresets: function() {
        if (!this._dropdown) return;
        var presets = this._getPresets();
        var self = this;

        if (presets.length === 0) {
            this._dropdown.innerHTML = '<li><span class="dropdown-item text-muted small">保存済みプリセットなし</span></li>';
            return;
        }

        this._dropdown.innerHTML = '';
        presets.forEach(function(preset, index) {
            var li = document.createElement('li');
            li.innerHTML =
                '<a class="dropdown-item d-flex justify-content-between align-items-center" href="?tab=all&' + preset.params + '">' +
                '<span>' + preset.name + '</span>' +
                '<button type="button" class="btn-close ms-2" style="font-size:0.5rem;" data-preset-index="' + index + '"></button>' +
                '</a>';
            self._dropdown.appendChild(li);
        });

        // 削除ボタン
        this._dropdown.addEventListener('click', function(e) {
            var closeBtn = e.target.closest('[data-preset-index]');
            if (!closeBtn) return;
            e.preventDefault();
            e.stopPropagation();

            var idx = parseInt(closeBtn.dataset.presetIndex);
            var presets = self._getPresets();
            presets.splice(idx, 1);
            self._setPresets(presets);
            self._renderPresets();
            showToast('プリセットを削除しました', 'info');
        });
    }
};

// ===== フィルター自動適用 =====

const AutoFilter = {
    _form: null,
    _overlay: null,
    _debounceTimer: null,
    _DEBOUNCE_MS: 600,

    init: function() {
        this._form = document.getElementById('filterForm');
        if (!this._form) return;
        this._overlay = document.getElementById('filterLoadingOverlay');

        var self = this;

        // チェックボックス・ラジオ・セレクト・日付 → 即時送信
        this._form.addEventListener('change', function(e) {
            var tag = e.target.tagName.toLowerCase();
            var type = (e.target.type || '').toLowerCase();
            if (tag === 'select' || type === 'checkbox' || type === 'radio' || type === 'date') {
                self._submit();
            }
        });

        // テキスト入力 → デバウンス送信
        var textInputs = this._form.querySelectorAll('input[type="text"]');
        textInputs.forEach(function(input) {
            input.addEventListener('input', function() {
                self._debounceSubmit();
            });
            input.addEventListener('keydown', function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    clearTimeout(self._debounceTimer);
                    self._submit();
                }
            });
        });
    },

    _debounceSubmit: function() {
        var self = this;
        clearTimeout(this._debounceTimer);
        this._debounceTimer = setTimeout(function() {
            self._submit();
        }, this._DEBOUNCE_MS);
    },

    _submit: function() {
        if (!this._form) return;
        if (this._overlay) this._overlay.classList.add('active');
        this._form.submit();
    }
};

// ===== フィルターパネル制御 =====

const FilterPanel = {
    _DETAIL_PARAMS: ['bank', 'account', 'category', 'category_mode', 'keyword', 'amount_type', 'amount_min', 'amount_max', 'date_from', 'date_to'],

    init: function() {
        var panel = document.getElementById('filterPanel');
        var clearBtn = document.getElementById('filterClearBtn');
        if (!panel) return;

        var params = new URLSearchParams(window.location.search);
        var hasDetailFilter = this._hasDetailFilters(params);

        // フィルターがアクティブなら自動展開
        if (hasDetailFilter) {
            panel.classList.add('show');
        }

        // クリアボタン表示制御
        if (clearBtn && hasDetailFilter) {
            clearBtn.style.display = '';
        }
    },

    _hasDetailFilters: function(params) {
        for (var i = 0; i < this._DETAIL_PARAMS.length; i++) {
            var key = this._DETAIL_PARAMS[i];
            var val = params.get(key);
            if (val && val !== 'both' && val !== 'include') return true;
        }
        return false;
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

// ===== グループ表示 =====

const GroupedView = {
    _suggestions: {},

    init: function() {
        var self = this;

        // サジェストデータ読み込み
        var dataEl = document.getElementById('groupSuggestionsData');
        if (dataEl) {
            try { this._suggestions = JSON.parse(dataEl.textContent); } catch(e) {}
        }

        // サジェストバッジを注入
        this._injectSuggestionBadges();

        // ビュー切替
        var toggleBtns = document.querySelectorAll('#viewToggle [data-view]');
        toggleBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                toggleBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                var view = this.dataset.view;
                var grouped = document.getElementById('groupedView');
                var flat = document.getElementById('flatView');
                if (grouped) grouped.style.display = view === 'grouped' ? '' : 'none';
                if (flat) flat.style.display = view === 'flat' ? '' : 'none';
            });
        });

        // グループ行のセレクト変更
        document.querySelectorAll('.group-category-select').forEach(function(select) {
            select.addEventListener('change', function() {
                var row = this.closest('tr');
                var category = this.value;
                if (!category || !row) return;
                self._classifyGroup(row, category, this);
            });
        });
    },

    _injectSuggestionBadges: function() {
        var self = this;
        document.querySelectorAll('#groupedTable tbody tr[data-group-desc]').forEach(function(row) {
            var desc = row.dataset.groupDesc;
            var suggestion = self._suggestions[desc];
            if (!suggestion) return;

            var cell = row.querySelector('td:first-child .d-flex');
            if (!cell) return;

            var badge = document.createElement('button');
            badge.type = 'button';
            badge.className = 'suggestion-badge';
            badge.title = 'クリックで「' + suggestion.category + '」に分類';
            badge.innerHTML = '<i class="bi bi-lightbulb"></i> ' + suggestion.category + ' <small>' + suggestion.score + '%</small>';
            badge.addEventListener('click', function() {
                self._applySuggestion(row, suggestion.category);
            });
            cell.appendChild(badge);
        });
    },

    _applySuggestion: function(row, category) {
        var select = row.querySelector('.group-category-select');
        if (select) select.value = category;
        this._classifyGroup(row, category, select);
    },

    _updateTxTotal: function(delta) {
        var el = document.getElementById('unclassifiedTxTotal');
        if (el) {
            var current = parseInt(el.textContent) || 0;
            el.textContent = Math.max(0, current - delta);
        }
        // タブバッジも更新
        var badge = document.querySelector('#unclassified-tab .badge');
        if (badge) {
            var count = parseInt(badge.textContent) || 0;
            count = Math.max(0, count - delta);
            if (count > 0) { badge.textContent = count; }
            else { badge.remove(); }
        }
    },

    _classifyGroup: function(row, category, select) {
        var self = this;
        var txIds = JSON.parse(row.dataset.txIds || '[]');
        var firstTxId = row.dataset.firstTxId;
        var desc = row.dataset.groupDesc;
        var count = txIds.length;

        if (select) select.disabled = true;
        StatusIndicator.saving();

        var formData = createFormData({
            action: 'update_category',
            tx_id: firstTxId,
            new_category: category,
            apply_all: 'true',
        });

        postJson(window.location.href, formData, {
            onSuccess: function() {
                StatusIndicator.saved();
                ProgressBar.update(count);
                self._updateTxTotal(count);

                // 行をフェードアウト
                row.style.transition = 'opacity 0.4s, background-color 0.4s';
                row.style.backgroundColor = 'rgba(25, 135, 84, 0.15)';
                setTimeout(function() {
                    row.style.opacity = '0';
                    setTimeout(function() { row.remove(); }, 400);
                }, 600);

                showToast('「' + desc + '」' + count + '件を「' + category + '」に分類しました', 'success');

                // パターンプロンプト表示
                PatternPrompt.show(row, category, desc, count);
            },
            onError: function() {
                if (select) { select.disabled = false; select.value = ''; }
                StatusIndicator.failed();
            },
        });
    }
};

// ===== パターンプロンプト =====

const PatternPrompt = {
    _el: null,
    _timeout: null,

    show: function(anchorRow, category, description, count) {
        this.hide();

        var keyword = extractKeywordFromDescription(description);
        if (!keyword) return;

        var self = this;
        var div = document.createElement('div');
        div.className = 'pattern-prompt glass-card p-2 mb-2';
        div.innerHTML =
            '<div class="d-flex align-items-center gap-2 flex-wrap">' +
            '<small class="text-muted"><i class="bi bi-bookmark-plus"></i></small>' +
            '<span class="small">「<strong>' + keyword + '</strong>」→「<strong>' + category + '</strong>」を常に適用しますか？</span>' +
            '<button type="button" class="btn btn-success btn-sm pattern-prompt-global"><i class="bi bi-globe"></i> 全案件</button>' +
            '<button type="button" class="btn btn-outline-success btn-sm pattern-prompt-case"><i class="bi bi-folder"></i> この案件</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm pattern-prompt-dismiss"><i class="bi bi-x"></i></button>' +
            '</div>';

        // テーブルの前に挿入
        var table = document.getElementById('groupedTable');
        if (table && table.parentElement) {
            table.parentElement.insertBefore(div, table);
        }
        this._el = div;

        div.querySelector('.pattern-prompt-global').addEventListener('click', function() {
            self._register(category, keyword, 'global', description);
        });
        div.querySelector('.pattern-prompt-case').addEventListener('click', function() {
            self._register(category, keyword, 'case', description);
        });
        div.querySelector('.pattern-prompt-dismiss').addEventListener('click', function() {
            self.hide();
        });

        // 10秒後自動消去
        this._timeout = setTimeout(function() { self.hide(); }, 10000);
    },

    _register: function(category, keyword, scope, description) {
        var self = this;
        var formData = createFormData({
            action: 'classify_and_register_pattern',
            category: category,
            keyword: keyword,
            scope: scope,
            description: description,
        });

        postJson(window.location.href, formData, {
            onSuccess: function(data) {
                var scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                var extra = data.count ? '（追加で' + data.count + '件分類）' : '';
                showToast('パターン「' + keyword + '」→「' + category + '」を登録しました' + scopeMsg + extra, 'success');
                if (data.count > 0) {
                    ProgressBar.update(data.count);
                    GroupedView._updateTxTotal(data.count);
                    // 同じ摘要の行を削除
                    self._removeMatchingRows(keyword);
                }
                self.hide();
            },
        });
    },

    _removeMatchingRows: function(keyword) {
        document.querySelectorAll('#groupedTable tbody tr[data-group-desc]').forEach(function(row) {
            var desc = row.dataset.groupDesc || '';
            if (desc.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(function() { row.remove(); }, 300);
            }
        });
    },

    hide: function() {
        clearTimeout(this._timeout);
        if (this._el) {
            this._el.remove();
            this._el = null;
        }
    }
};

// ===== 資金移動タブ =====

const TransferView = {
    init: function() {
        var self = this;

        // ビュー切替
        var toggleBtns = document.querySelectorAll('#transferViewToggle [data-view]');
        toggleBtns.forEach(function(btn) {
            btn.addEventListener('click', function() {
                toggleBtns.forEach(function(b) { b.classList.remove('active'); });
                this.classList.add('active');
                var view = this.dataset.view;
                var cardView = document.getElementById('transferCardView');
                var tableView = document.getElementById('transferTableView');
                if (cardView) cardView.style.display = view === 'card' ? '' : 'none';
                if (tableView) tableView.style.display = view === 'table' ? '' : 'none';
            });
        });

        // 全て「振替」に分類ボタン
        var classifyAllBtn = document.getElementById('classifyAllTransfersBtn');
        if (classifyAllBtn) {
            classifyAllBtn.addEventListener('click', function() {
                self._classifyAllAsTransfer();
            });
        }
    },

    _classifyAllAsTransfer: function() {
        // カード内の全selectを「振替」に変更
        var selects = document.querySelectorAll('#transferCardView select[name^="transfer-"]');
        var count = 0;
        selects.forEach(function(select) {
            // 「振替」オプションを探す
            for (var i = 0; i < select.options.length; i++) {
                if (select.options[i].value === '振替') {
                    if (select.value !== '振替') {
                        select.value = '振替';
                        select.dispatchEvent(new Event('change', { bubbles: true }));
                        count++;
                    }
                    break;
                }
            }
        });

        if (count > 0) {
            showToast(count + '件の取引を「振替」に分類しました', 'success');
        } else {
            showToast('全て分類済みです', 'info');
        }
    }
};

// ===== クレンジングタブ改善 =====

const CleanupView = {
    init: function() {
        const startId = document.getElementById('start_id');
        const endId = document.getElementById('end_id');
        const preview = document.getElementById('rangeDeletePreview');

        if (startId && endId && preview) {
            const updatePreview = () => {
                const s = parseInt(startId.value);
                const e = parseInt(endId.value);
                if (!isNaN(s) && !isNaN(e) && e >= s) {
                    const count = e - s + 1;
                    preview.textContent = count + '件が対象';
                    preview.style.display = '';
                } else {
                    preview.style.display = 'none';
                }
            };
            startId.addEventListener('input', updatePreview);
            endId.addEventListener('input', updatePreview);
        }
    }
};

// ===== 全モジュール初期化 =====

StatusIndicator.init();
KeyboardShortcuts.init();
ContextMenu.init();
QuickFilters.init();
FilterChips.init();
FilterPresets.init();
AutoFilter.init();
FilterPanel.init();
ProgressBar.init();
GroupedView.init();
TransferView.init();
CleanupView.init();
