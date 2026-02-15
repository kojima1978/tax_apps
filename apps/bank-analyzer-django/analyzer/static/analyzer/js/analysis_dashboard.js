// ===== Analysis Dashboard Module =====
// Requires: utils.js (createFormData, getApiUrl, showToast, extractKeywordFromDescription)

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
    document.getElementById('modalTxDescription').value = txDesc;
    document.getElementById('modalTxAmountOut').value = txAmountOut;
    document.getElementById('modalTxAmountIn').value = txAmountIn;
    document.getElementById('modalTxBalance').value = txBalance || '';
    document.getElementById('modalTxCategory').value = txCat || '未分類';
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

        // 選択された行のセレクトボックスを変更
        var changedCount = 0;
        checkedBoxes.forEach(cb => {
            const txId = cb.value;
            const row = cb.closest('tr');
            const categorySelect = row ? row.querySelector('select[name^="cat-"]') : null;
            if (categorySelect) {
                categorySelect.value = selectedCategory;
                changedCount++;
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
                    updateSelectionUI();
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
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> 追加中...';

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
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';
                    submitBtn.classList.remove('btn-success');
                    submitBtn.classList.add('btn-primary');
                }, 500);
            }
        } else {
            showPatternAddResult('danger', data.error || '追加に失敗しました');
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showPatternAddResult('danger', 'エラーが発生しました');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';
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
            }
        });

        showToast(`${checked.length}件の分類を「${category}」に変更しました（保存ボタンで確定）`, 'info');
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
        const keyword = prompt(
            `「${category}」のパターンに追加するキーワードを入力してください：\n\n` +
            `摘要例: ${description}\n` +
            `適用範囲: ${scopeLabel}\n\n` +
            `（このキーワードを含む取引が自動的に「${category}」に分類されます）`,
            defaultKeyword
        );

        if (!keyword) return;

        const formData = createFormData({
            action: 'add_pattern',
            category: category,
            keyword: keyword,
            scope: scope
        });

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                const scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                showToast(`キーワード「${keyword}」を「${category}」に追加しました${scopeMsg}`, 'success');
            } else {
                showToast(data.error || 'パターン追加に失敗しました', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('エラーが発生しました', 'danger');
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
            });
        }
    }
};

// ===== AI分類タブ =====

const AISuggestions = {
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

    // AI提案の適用
    apply: function(txId, category) {
        if (!confirm(`「${category}」に分類しますか？`)) {
            return;
        }

        const formData = createFormData({
            action: 'apply_ai_suggestion',
            tx_id: txId,
            category: category
        });

        const self = this;

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                self.removeRow(txId);
                self.updateBadgeCount(-1);
                showToast(`「${category}」に分類しました`, 'success');
            } else {
                showToast('エラーが発生しました', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('ネットワークエラーが発生しました', 'danger');
        });
    },

    // AI提案の却下
    dismiss: function(txId) {
        this.removeRow(txId);
        this.updateBadgeCount(-1);
        showToast('提案を却下しました', 'info');
    },

    // 行をフェードアウトして削除
    removeRow: function(txId) {
        const row = document.getElementById(`ai-row-${txId}`);
        if (row) {
            row.classList.add('table-success');
            setTimeout(() => {
                row.style.opacity = '0';
                row.style.transition = 'opacity 0.3s';
                setTimeout(() => row.remove(), 300);
            }, 500);
        }
    },

    // 一括適用
    bulkApply: function(minScore) {
        const scoreText = minScore === 95 ? '95%以上' : '85%以上';

        if (!confirm(`信頼度${scoreText}のAI提案を一括適用しますか？`)) {
            return;
        }

        const formData = createFormData({
            action: 'bulk_apply_ai_suggestions',
            min_score: minScore
        });

        showToast('一括適用中...', 'info');

        fetch(window.location.href, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => {
            if (response.redirected) {
                window.location.href = response.url;
            } else {
                return response.json();
            }
        })
        .then(data => {
            if (data && data.success) {
                window.location.reload();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('エラーが発生しました', 'danger');
        });
    },

    // 適用してパターンに追加
    applyAndAddPattern: function(txId, category, description, scope) {
        const scopeLabel = scope === 'case' ? 'この案件' : '全案件（グローバル）';
        const defaultKeyword = extractKeywordFromDescription(description);
        const keyword = prompt(
            `「${category}」のパターンに追加するキーワードを入力してください：\n\n` +
            `摘要: ${description}\n` +
            `適用範囲: ${scopeLabel}\n\n` +
            `（このキーワードを含む取引が自動的に「${category}」に分類されます）`,
            defaultKeyword
        );

        if (!keyword) {
            return;
        }

        const self = this;

        // 1. まずAI提案を適用
        const applyFormData = createFormData({
            action: 'apply_ai_suggestion',
            tx_id: txId,
            category: category
        });

        fetch(window.location.href, {
            method: 'POST',
            body: applyFormData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (!data.success) {
                showToast('分類の適用に失敗しました', 'danger');
                return;
            }

            // 2. パターンに追加
            const patternFormData = createFormData({
                action: 'add_pattern',
                category: category,
                keyword: keyword,
                scope: scope
            });

            return fetch(window.location.href, {
                method: 'POST',
                body: patternFormData,
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
        })
        .then(response => {
            if (response) return response.json();
        })
        .then(data => {
            if (data && data.success) {
                self.removeRow(txId);
                const scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                showToast(`「${category}」に分類し、キーワード「${keyword}」を追加しました${scopeMsg}`, 'success');
            } else if (data) {
                showToast(data.error || 'パターン追加に失敗しました', 'danger');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showToast('エラーが発生しました', 'danger');
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
    },

    // 初期化
    init: function() {
        // Popovers初期化
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });
    }
};
