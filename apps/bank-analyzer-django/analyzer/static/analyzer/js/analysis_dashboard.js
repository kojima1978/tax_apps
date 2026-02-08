// ===== ユーティリティ =====

function createFormData(data) {
    const formData = new FormData();
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    formData.append('csrfmiddlewaretoken', csrfToken);
    for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
    }
    return formData;
}

function getApiUrl(endpoint) {
    return window.location.pathname.replace('/analysis/', `/api/${endpoint}/`);
}

// Modal Logic
const editModal = document.getElementById('editModal');
editModal.addEventListener('show.bs.modal', function (event) {
    const button = event.relatedTarget;

    const txId = button.getAttribute('data-tx-id');
    const txDate = button.getAttribute('data-tx-date');
    const txDesc = button.getAttribute('data-tx-desc');
    const txAmountOut = button.getAttribute('data-tx-amount-out');
    const txAmountIn = button.getAttribute('data-tx-amount-in');
    const txBalance = button.getAttribute('data-tx-balance');
    const txCat = button.getAttribute('data-tx-cat');
    const txMemo = button.getAttribute('data-tx-memo');
    const txBank = button.getAttribute('data-tx-bank');
    const txBranch = button.getAttribute('data-tx-branch');
    const txAccountType = button.getAttribute('data-tx-account-type');
    const txAccount = button.getAttribute('data-tx-account');

    document.getElementById('modalTxId').value = txId;
    document.getElementById('modalTxDate').value = txDate;
    document.getElementById('modalTxDescInput').value = txDesc;
    document.getElementById('modalTxAmountOut').value = txAmountOut;
    document.getElementById('modalTxAmountIn').value = txAmountIn;
    document.getElementById('modalTxBalance').value = txBalance || '';
    document.getElementById('modalTxCat').value = txCat || '未分類';
    document.getElementById('modalTxMemo').value = txMemo || '';
    document.getElementById('modalTxBankName').value = txBank || '';
    document.getElementById('modalTxBranchName').value = txBranch || '';
    document.getElementById('modalTxAccountType').value = txAccountType || '';
    document.getElementById('modalTxAccountId').value = txAccount || '';

    // 現在のタブを記録
    const activeTab = document.querySelector('#analysisTabs .nav-link.active');
    if (activeTab) {
        const tabId = activeTab.getAttribute('data-bs-target').replace('#', '');
        document.getElementById('modalSourceTab').value = tabId;
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
        button.disabled = true;
        button.style.opacity = '0.5';

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
                    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    row.style.opacity = '0';
                    row.style.transform = 'translateX(-20px)';
                    setTimeout(() => {
                        row.remove();
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
                    }, 300);
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
                    // ボタンを再有効化
                    button.disabled = false;
                    button.style.opacity = '1';
                }
            } else {
                showToast('エラー: ' + data.message, 'danger');
                button.disabled = false;
                button.style.opacity = '1';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('通信エラーが発生しました', 'danger');
            button.disabled = false;
            button.style.opacity = '1';
        });
    });
});

// 付箋タブクリック時にページリロード（最新データ取得）
const flaggedTab = document.getElementById('flagged-tab');
if (flaggedTab) {
    flaggedTab.addEventListener('click', function(e) {
        e.preventDefault();
        window.location.href = window.location.pathname + '?tab=flagged';
    });
}

// トースト通知を表示
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');
    if (!toastContainer) return;

    const toastId = 'toast-' + Date.now();
    const bgClass = type === 'success' ? 'bg-success' : type === 'danger' ? 'bg-danger' : 'bg-info';
    const icon = type === 'success' ? 'bi-check-circle' : type === 'danger' ? 'bi-exclamation-circle' : 'bi-info-circle';

    const toastHtml = `
        <div id="${toastId}" class="toast align-items-center text-white ${bgClass} border-0" role="alert">
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi ${icon} me-2"></i>${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();

    // 非表示後に要素を削除
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// ===== 一括選択機能 =====
const selectAllTx = document.getElementById('selectAllTx');
const txCheckboxes = document.querySelectorAll('.tx-select-check');
const bulkActionBar = document.getElementById('bulkActionBar');
const selectedCountText = document.getElementById('selectedCountText');
const clearSelectionBtn = document.getElementById('clearSelectionBtn');
const applyBulkCategoryBtn = document.getElementById('applyBulkCategoryBtn');
const bulkCategorySelect = document.getElementById('bulkCategorySelect');

// 選択状態の更新
function updateSelectionUI() {
    const checkedCount = document.querySelectorAll('.tx-select-check:checked').length;
    if (selectedCountText) {
        selectedCountText.textContent = `${checkedCount}件選択中`;
    }
    if (bulkActionBar) {
        bulkActionBar.style.display = checkedCount > 0 ? 'block' : 'none';
    }
    // 全選択チェックボックスの状態を更新
    if (selectAllTx) {
        selectAllTx.checked = checkedCount === txCheckboxes.length && txCheckboxes.length > 0;
        selectAllTx.indeterminate = checkedCount > 0 && checkedCount < txCheckboxes.length;
    }
}

// 全選択チェックボックス
if (selectAllTx) {
    selectAllTx.addEventListener('change', function() {
        txCheckboxes.forEach(cb => cb.checked = this.checked);
        updateSelectionUI();
    });
}

// 個別チェックボックス
txCheckboxes.forEach(cb => {
    cb.addEventListener('change', updateSelectionUI);
});

// 選択解除ボタン
if (clearSelectionBtn) {
    clearSelectionBtn.addEventListener('click', function() {
        txCheckboxes.forEach(cb => cb.checked = false);
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

        // 選択された行のセレクトボックスを変更
        checkedBoxes.forEach(cb => {
            const txId = cb.value;
            const categorySelect = document.querySelector(`select[name="cat-${txId}"]`);
            if (categorySelect) {
                categorySelect.value = selectedCategory;
            }
        });

        showToast(`${checkedBoxes.length}件の分類を「${selectedCategory}」に変更しました（保存ボタンを押してください）`, 'info');
    });
}

// ページ読み込み時に初期状態を確認
updateSelectionUI();

// ===== 取引追加・削除機能 =====
const addTxModal = document.getElementById('addTxModal');
const addTxSubmitBtn = document.getElementById('addTxSubmitBtn');

// 追加ボタンクリック時 - モーダルを開く
document.querySelectorAll('.insert-tx-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const txDate = this.getAttribute('data-tx-date');
        const txBank = this.getAttribute('data-tx-bank');
        const txBranch = this.getAttribute('data-tx-branch');
        const txAccountType = this.getAttribute('data-tx-account-type');
        const txAccount = this.getAttribute('data-tx-account');

        // フォームをリセット
        document.getElementById('addTxDate').value = txDate || '';
        document.getElementById('addTxDescription').value = '';
        document.getElementById('addTxAmountOut').value = '0';
        document.getElementById('addTxAmountIn').value = '0';
        document.getElementById('addTxBalance').value = '';
        document.getElementById('addTxBankName').value = txBank || '';
        document.getElementById('addTxBranchName').value = txBranch || '';
        document.getElementById('addTxAccountType').value = txAccountType || '';
        document.getElementById('addTxAccountId').value = txAccount || '';
        document.getElementById('addTxCategory').value = '未分類';
        document.getElementById('addTxMemo').value = '';

        // モーダルを表示
        const modal = new bootstrap.Modal(addTxModal);
        modal.show();
    });
});

// 追加ボタン（モーダル内）クリック時 - APIに送信
if (addTxSubmitBtn) {
    addTxSubmitBtn.addEventListener('click', function() {
        const formData = createFormData({
            date: document.getElementById('addTxDate').value,
            description: document.getElementById('addTxDescription').value,
            amount_out: document.getElementById('addTxAmountOut').value || '0',
            amount_in: document.getElementById('addTxAmountIn').value || '0',
            balance: document.getElementById('addTxBalance').value || '',
            bank_name: document.getElementById('addTxBankName').value,
            branch_name: document.getElementById('addTxBranchName').value,
            account_type: document.getElementById('addTxAccountType').value,
            account_id: document.getElementById('addTxAccountId').value,
            category: document.getElementById('addTxCategory').value,
            memo: document.getElementById('addTxMemo').value,
        });

        // ボタンを無効化
        addTxSubmitBtn.disabled = true;
        addTxSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 追加中...';

        const apiUrl = getApiUrl('create-transaction');

        fetch(apiUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast('取引を追加しました', 'success');
                // モーダルを閉じる
                const modal = bootstrap.Modal.getInstance(addTxModal);
                modal.hide();
                // ページをリロードして最新データを表示
                window.location.reload();
            } else {
                showToast('エラー: ' + data.message, 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('通信エラーが発生しました', 'danger');
        })
        .finally(() => {
            addTxSubmitBtn.disabled = false;
            addTxSubmitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';
        });
    });
}

// 削除ボタンクリック時
document.querySelectorAll('.delete-tx-btn').forEach(btn => {
    btn.addEventListener('click', function() {
        const txId = this.getAttribute('data-tx-id');
        const row = this.closest('tr');

        if (!confirm('この取引を削除しますか？')) {
            return;
        }

        const formData = createFormData({ tx_id: txId });

        // ボタンを無効化
        this.disabled = true;
        this.style.opacity = '0.5';

        const apiUrl = getApiUrl('delete-transaction');

        fetch(apiUrl, {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 行をフェードアウトして削除
                row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                row.style.opacity = '0';
                row.style.transform = 'translateX(-20px)';
                setTimeout(() => {
                    row.remove();
                }, 300);
                showToast('取引を削除しました', 'success');
            } else {
                showToast('エラー: ' + data.message, 'danger');
                this.disabled = false;
                this.style.opacity = '1';
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('通信エラーが発生しました', 'danger');
            this.disabled = false;
            this.style.opacity = '1';
        });
    });
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

        const confirmMsg = `${fieldLabel}「${oldValue}」を「${newValue}」に置換します。\n\n対象: ${count}件\n\nこの操作は取り消せません。実行しますか？`;
        if (!confirm(confirmMsg)) {
            e.preventDefault();
            return;
        }

        // 送信中の表示
        bulkReplaceSubmitBtn.disabled = true;
        bulkReplaceSubmitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 処理中...';
    });
}
