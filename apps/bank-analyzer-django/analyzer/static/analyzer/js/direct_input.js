document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('directInputForm');
    const tableBody = document.getElementById('tableBody');
    const submitButtons = document.querySelectorAll('.btn-submit');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectedCountSpan = document.getElementById('selectedCount');
    const totalRowsInput = document.getElementById('totalRows');
    let isSubmitting = false;
    let newRowCounter = parseInt(totalRowsInput.value);

    // ===== 口座情報ヘッダー =====
    const accountSelect = document.getElementById('accountSelect');
    const headerBankName = document.getElementById('headerBankName');
    const headerBranchName = document.getElementById('headerBranchName');
    const headerAccountType = document.getElementById('headerAccountType');
    const headerAccountId = document.getElementById('headerAccountId');
    const accountFields = document.getElementById('accountFields');

    function setAccountFieldsReadonly(readonly) {
        [headerBankName, headerBranchName, headerAccountType, headerAccountId].forEach(function (input) {
            input.readOnly = readonly;
            input.style.background = readonly ? '#f5f5f0' : '';
        });
    }

    if (accountSelect) {
        accountSelect.addEventListener('change', function () {
            const option = accountSelect.selectedOptions[0];
            if (accountSelect.value === 'new') {
                headerBankName.value = '';
                headerBranchName.value = '';
                headerAccountType.value = '';
                headerAccountId.value = '';
                setAccountFieldsReadonly(false);
                headerBankName.focus();
            } else {
                headerBankName.value = option.dataset.bank || '';
                headerBranchName.value = option.dataset.branch || '';
                headerAccountType.value = option.dataset.type || '';
                headerAccountId.value = option.dataset.id || '';
                setAccountFieldsReadonly(true);
            }
        });
    }

    // 和暦関数は wareki.js から読み込み（toWareki, updateWarekiDisplay, initWarekiDisplays）

    // ===== 選択状態 =====
    function updateSelectedState() {
        var checkedCount = document.querySelectorAll('.remove-row-check:checked').length;
        if (deleteBtn) {
            deleteBtn.disabled = checkedCount === 0;
        }
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checkedCount > 0 ? checkedCount + '件選択中' : '';
        }
    }

    // ===== 新規行生成 =====
    function createNewRow(index, prevRow) {
        var prevDate = '';
        if (prevRow) {
            var dateInput = prevRow.querySelector('input[name$="-date"]');
            if (dateInput) prevDate = dateInput.value;
        }

        var tr = document.createElement('tr');
        tr.className = 'data-row table-warning';
        tr.dataset.rowIndex = index;
        tr.style.transition = 'all 0.2s';

        tr.innerHTML =
            '<td class="text-center">' +
                '<input class="form-check-input remove-row-check" type="checkbox" ' +
                    'name="form-' + index + '-DELETE" id="del-' + index + '" style="cursor: pointer;">' +
            '</td>' +
            '<td class="text-center">' +
                '<button type="button" class="btn btn-sm btn-outline-secondary insert-row-btn p-0 px-1" ' +
                    'title="この下に行を挿入" data-index="' + index + '">' +
                    '<i class="bi bi-plus"></i>' +
                '</button>' +
            '</td>' +
            '<td>' +
                '<div class="d-flex align-items-center">' +
                    '<span class="wareki-display" style="white-space: nowrap;">' + toWareki(prevDate) + '</span>' +
                    '<input type="date" name="form-' + index + '-date" value="' + prevDate + '" ' +
                        'class="date-input wareki-picker ms-1">' +
                '</div>' +
            '</td>' +
            '<td>' +
                '<input type="text" name="form-' + index + '-description" value="" ' +
                    'class="form-control form-control-sm border-0 bg-transparent" placeholder="摘要を入力">' +
            '</td>' +
            '<td>' +
                '<input type="number" name="form-' + index + '-amount_out" value="" ' +
                    'class="form-control form-control-sm border-0 bg-transparent text-end" placeholder="0">' +
            '</td>' +
            '<td>' +
                '<input type="number" name="form-' + index + '-amount_in" value="" ' +
                    'class="form-control form-control-sm border-0 bg-transparent text-end" placeholder="0">' +
            '</td>' +
            '<td>' +
                '<input type="number" name="form-' + index + '-balance" value="" ' +
                    'class="form-control form-control-sm border-0 bg-transparent text-end" placeholder="残高">' +
            '</td>' +
            '<input type="hidden" name="form-' + index + '-bank_name" value="">' +
            '<input type="hidden" name="form-' + index + '-branch_name" value="">' +
            '<input type="hidden" name="form-' + index + '-account_type" value="">' +
            '<input type="hidden" name="form-' + index + '-account_number" value="">';

        return tr;
    }

    function insertRowAfter(targetRow) {
        var newIndex = newRowCounter++;
        totalRowsInput.value = newRowCounter;

        var newRow = createNewRow(newIndex, targetRow);
        targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);
        setupRowEventListeners(newRow);

        var dateInput = newRow.querySelector('input[type="date"]');
        if (dateInput) dateInput.focus();

        updateSelectedState();
    }

    // ===== 行イベントリスナー =====
    function setupRowEventListeners(row) {
        var checkbox = row.querySelector('.remove-row-check');
        if (checkbox) {
            checkbox.addEventListener('change', updateSelectedState);
        }
        var insertBtn = row.querySelector('.insert-row-btn');
        if (insertBtn) {
            insertBtn.addEventListener('click', function () {
                insertRowAfter(row);
            });
        }
        var dateInput = row.querySelector('.date-input');
        if (dateInput) {
            dateInput.addEventListener('change', function () {
                updateWarekiDisplay(this);
            });
        }
    }

    // ===== 初期設定 =====
    updateSelectedState();
    initWarekiDisplays();

    document.querySelectorAll('.remove-row-check').forEach(function (cb) {
        cb.addEventListener('change', updateSelectedState);
    });

    document.querySelectorAll('.insert-row-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var row = btn.closest('tr');
            if (row) insertRowAfter(row);
        });
    });

    // 全選択
    var selectAllCheck = document.getElementById('selectAllCheck');
    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            var isChecked = selectAllCheck.checked;
            document.querySelectorAll('.remove-row-check').forEach(function (cb) {
                var row = cb.closest('tr');
                if (row && row.style.display !== 'none') {
                    cb.checked = isChecked;
                }
            });
            updateSelectedState();
        });
    }

    // 選択行を削除
    if (deleteBtn) {
        deleteBtn.addEventListener('click', function () {
            var checkedBoxes = document.querySelectorAll('.remove-row-check:checked');
            if (checkedBoxes.length === 0) return;
            if (!confirm(checkedBoxes.length + '件の行を削除しますか？')) return;

            checkedBoxes.forEach(function (cb) {
                var row = cb.closest('tr');
                if (row) {
                    row.style.display = 'none';
                    cb.checked = true;
                }
            });
            updateSelectedState();
        });
    }

    // ===== reindexRows =====
    function reindexRows() {
        var visibleRows = Array.from(tableBody.querySelectorAll('tr.data-row')).filter(
            function (row) { return row.style.display !== 'none'; }
        );

        visibleRows.forEach(function (row, newIndex) {
            var inputs = row.querySelectorAll('input, select, textarea');
            inputs.forEach(function (input) {
                var name = input.getAttribute('name');
                if (name) {
                    input.setAttribute('name', name.replace(/^form-\d+-/, 'form-' + newIndex + '-'));
                }
                var id = input.getAttribute('id');
                if (id && id.startsWith('del-')) {
                    input.setAttribute('id', 'del-' + newIndex);
                }
            });
            row.dataset.rowIndex = newIndex;
            var insertBtn = row.querySelector('.insert-row-btn');
            if (insertBtn) insertBtn.dataset.index = newIndex;
        });

        totalRowsInput.value = visibleRows.length;
        return visibleRows.length;
    }

    // ===== ヘッダー口座情報を各行に反映 =====
    function applyAccountInfoToRows() {
        var bankName = headerBankName.value;
        var branchName = headerBranchName.value;
        var accountType = headerAccountType.value;
        var accountId = headerAccountId.value;

        tableBody.querySelectorAll('tr.data-row').forEach(function (row) {
            if (row.style.display === 'none') return;
            var bn = row.querySelector('input[name$="-bank_name"]');
            var br = row.querySelector('input[name$="-branch_name"]');
            var at = row.querySelector('input[name$="-account_type"]');
            var an = row.querySelector('input[name$="-account_number"]');
            if (bn) bn.value = bankName;
            if (br) br.value = branchName;
            if (at) at.value = accountType;
            if (an) an.value = accountId;
        });
    }

    // ===== Enter防止 =====
    if (form) {
        form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
            }
        });
    }

    // ===== フォーム送信 =====
    if (form) {
        form.addEventListener('submit', function (e) {
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }

            // 口座情報を各行に反映
            applyAccountInfoToRows();

            // 行を再インデックス
            var rowCount = reindexRows();

            if (rowCount === 0) {
                e.preventDefault();
                alert('登録するデータがありません。');
                return false;
            }

            // 口座情報チェック
            if (!headerBankName.value) {
                e.preventDefault();
                alert('銀行名を入力してください。');
                headerBankName.focus();
                return false;
            }

            isSubmitting = true;

            setTimeout(function () {
                isSubmitting = false;
                submitButtons.forEach(function (btn) {
                    btn.disabled = false;
                    btn.style.opacity = '1';
                });
            }, 10000);

            setTimeout(function () {
                submitButtons.forEach(function (btn) {
                    btn.disabled = true;
                    btn.style.opacity = '0.6';
                });
                var clickedBtn = document.activeElement;
                if (clickedBtn && clickedBtn.classList.contains('btn-submit')) {
                    clickedBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> 処理中...';
                }
            }, 0);
        });
    }
});
