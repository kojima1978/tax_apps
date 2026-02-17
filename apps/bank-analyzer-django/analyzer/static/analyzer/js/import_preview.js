document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('importForm');
    const tableBody = document.getElementById('tableBody');
    const submitButtons = document.querySelectorAll('.btn-submit');
    const deleteBtn = document.getElementById('deleteSelectedBtn');
    const selectedCountSpan = document.getElementById('selectedCount');
    const totalRowsInput = document.getElementById('totalRows');
    let isSubmitting = false;
    let newRowCounter = parseInt(totalRowsInput.value);

    // 和暦変換関数
    function toWareki(dateStr) {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return '';

        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();

        // Keep in sync with analyzer/lib/constants.py ERA_DATA
        let era, eraYear;
        if (year > 2019 || (year === 2019 && (month > 5 || (month === 5 && day >= 1)))) {
            era = 'R';
            eraYear = year - 2018;
        } else if (year > 1989 || (year === 1989 && (month > 1 || (month === 1 && day >= 8)))) {
            era = 'H';
            eraYear = year - 1988;
        } else if (year > 1926 || (year === 1926 && month === 12 && day >= 25)) {
            era = 'S';
            eraYear = year - 1925;
        } else if (year > 1912 || (year === 1912 && (month > 7 || (month === 7 && day >= 30)))) {
            era = 'T';
            eraYear = year - 1911;
        } else {
            era = 'M';
            eraYear = year - 1867;
        }

        return `${era}${eraYear}.${month}.${day}`;
    }

    // 和暦表示を更新
    function updateWarekiDisplay(dateInput) {
        const warekiSpan = dateInput.closest('td').querySelector('.wareki-display');
        if (warekiSpan) {
            warekiSpan.textContent = toWareki(dateInput.value);
        }
    }

    // 全ての日付入力の和暦表示を初期化
    function initWarekiDisplays() {
        document.querySelectorAll('.date-input').forEach(function(input) {
            updateWarekiDisplay(input);
            input.addEventListener('change', function() {
                updateWarekiDisplay(this);
            });
        });
    }

    // 選択状態の更新
    function updateSelectedState() {
        const checkboxes = document.querySelectorAll('.remove-row-check');
        const checkedCount = document.querySelectorAll('.remove-row-check:checked').length;
        if (deleteBtn) {
            deleteBtn.disabled = checkedCount === 0;
        }
        if (selectedCountSpan) {
            selectedCountSpan.textContent = checkedCount > 0 ? `${checkedCount}件選択中` : '';
        }
    }

    // 新しい行のHTMLを生成
    function createNewRow(index, prevRow) {
        // 前の行から銀行名、支店名等をコピー
        let bankName = '';
        let branchName = '';
        let accountType = '';
        let accountNumber = '';
        let prevDate = '';

        if (prevRow) {
            const bankInput = prevRow.querySelector('input[name$="-bank_name"]');
            const branchInput = prevRow.querySelector('input[name$="-branch_name"]');
            const typeInput = prevRow.querySelector('input[name$="-account_type"]');
            const numInput = prevRow.querySelector('input[name$="-account_number"]');
            const dateInput = prevRow.querySelector('input[name$="-date"]');

            if (bankInput) bankName = bankInput.value;
            if (branchInput) branchName = branchInput.value;
            if (typeInput) accountType = typeInput.value;
            if (numInput) accountNumber = numInput.value;
            if (dateInput) prevDate = dateInput.value;
        }

        const tr = document.createElement('tr');
        tr.className = 'data-row table-warning';
        tr.dataset.rowIndex = index;
        tr.style.transition = 'all 0.2s';

        tr.innerHTML = `
            <td class="text-center drag-handle" title="ドラッグで移動">
                <i class="bi bi-grip-vertical"></i>
            </td>
            <td class="text-center">
                <input class="form-check-input remove-row-check" type="checkbox"
                    name="form-${index}-DELETE" id="del-${index}"
                    style="cursor: pointer;">
            </td>
            <td class="text-center">
                <button type="button" class="btn btn-sm btn-outline-secondary insert-row-btn p-0 px-1"
                    title="この下に行を挿入" data-index="${index}">
                    <i class="bi bi-plus"></i>
                </button>
            </td>
            <td>
                <input type="text" name="form-${index}-bank_name"
                    value="${bankName}"
                    class="form-control form-control-sm border-0 bg-transparent"
                    placeholder="-" style="min-width: 80px;">
            </td>
            <td>
                <input type="text" name="form-${index}-branch_name"
                    value="${branchName}"
                    class="form-control form-control-sm border-0 bg-transparent"
                    placeholder="-" style="min-width: 80px;">
            </td>
            <td>
                <input type="text" name="form-${index}-account_type"
                    value="${accountType}"
                    class="form-control form-control-sm border-0 bg-transparent"
                    placeholder="-" style="min-width: 60px;">
            </td>
            <td>
                <input type="text" name="form-${index}-account_number"
                    value="${accountNumber}"
                    class="form-control form-control-sm border-0 bg-transparent"
                    placeholder="-" style="min-width: 80px;">
            </td>
            <td>
                <div class="d-flex align-items-center">
                    <span class="wareki-display" style="white-space: nowrap;">${toWareki(prevDate)}</span>
                    <input type="date" name="form-${index}-date"
                        value="${prevDate}"
                        class="date-input wareki-picker ms-1">
                </div>
            </td>
            <td>
                <input type="text" name="form-${index}-description"
                    value=""
                    class="form-control form-control-sm border-0 bg-transparent"
                    placeholder="摘要を入力">
            </td>
            <td>
                <input type="number" name="form-${index}-amount_out"
                    value="0"
                    class="form-control form-control-sm border-0 bg-transparent text-end">
            </td>
            <td>
                <input type="number" name="form-${index}-amount_in"
                    value="0"
                    class="form-control form-control-sm border-0 bg-transparent text-end">
            </td>
            <td>
                <input type="number" name="form-${index}-balance"
                    value=""
                    class="form-control form-control-sm border-0 bg-transparent text-end"
                    placeholder="再計算">
            </td>
            <td class="text-end font-monospace calc-balance">
                -
            </td>
            <td class="text-center status-cell">
                <span class="badge bg-warning text-dark">新規</span>
            </td>
        `;

        return tr;
    }

    // 行を挿入
    function insertRowAfter(targetRow) {
        const newIndex = newRowCounter++;
        totalRowsInput.value = newRowCounter;

        const newRow = createNewRow(newIndex, targetRow);
        targetRow.parentNode.insertBefore(newRow, targetRow.nextSibling);

        // 新しい行のイベントリスナーを設定
        setupRowEventListeners(newRow);

        // フォーカスを新しい行の日付フィールドに移動
        const dateInput = newRow.querySelector('input[type="date"]');
        if (dateInput) {
            dateInput.focus();
        }

        updateSelectedState();
    }

    // 行のイベントリスナーを設定
    function setupRowEventListeners(row) {
        const checkbox = row.querySelector('.remove-row-check');
        if (checkbox) {
            checkbox.addEventListener('change', updateSelectedState);
        }

        const insertBtn = row.querySelector('.insert-row-btn');
        if (insertBtn) {
            insertBtn.addEventListener('click', function () {
                insertRowAfter(row);
            });
        }

        // 日付入力の和暦表示
        const dateInput = row.querySelector('.date-input');
        if (dateInput) {
            dateInput.addEventListener('change', function() {
                updateWarekiDisplay(this);
            });
        }
    }

    // 初期状態の更新
    updateSelectedState();

    // 和暦表示を初期化
    initWarekiDisplays();

    // 既存の行にイベントリスナーを設定
    document.querySelectorAll('.remove-row-check').forEach(function (cb) {
        cb.addEventListener('change', updateSelectedState);
    });

    document.querySelectorAll('.insert-row-btn').forEach(function (btn) {
        btn.addEventListener('click', function () {
            const row = btn.closest('tr');
            if (row) {
                insertRowAfter(row);
            }
        });
    });

    // 全選択チェックボックス
    const selectAllCheck = document.getElementById('selectAllCheck');
    if (selectAllCheck) {
        selectAllCheck.addEventListener('change', function () {
            const isChecked = selectAllCheck.checked;
            document.querySelectorAll('.remove-row-check').forEach(function (cb) {
                const row = cb.closest('tr');
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
            const checkedBoxes = document.querySelectorAll('.remove-row-check:checked');
            if (checkedBoxes.length === 0) return;

            if (!confirm(`${checkedBoxes.length}件の行を削除しますか？\n削除後は「再計算」ボタンで残高を再計算してください。`)) {
                return;
            }

            checkedBoxes.forEach(function (cb) {
                const row = cb.closest('tr');
                if (row) {
                    row.style.display = 'none';
                    cb.checked = true;
                }
            });

            updateSelectedState();
            updateErrorNav();
        });
    }

    // 残高再計算（クライアントサイド）
    function recalculateBalances() {
        var visibleRows = Array.from(tableBody.querySelectorAll('tr.data-row')).filter(
            function (row) { return row.style.display !== 'none'; }
        );

        if (visibleRows.length === 0) return 0;

        var prevBalance = 0;
        var errorCount = 0;

        visibleRows.forEach(function (row, index) {
            var amountOut = parseInt(row.querySelector('input[name$="-amount_out"]').value) || 0;
            var amountIn = parseInt(row.querySelector('input[name$="-amount_in"]').value) || 0;
            var balance = parseInt(row.querySelector('input[name$="-balance"]').value) || 0;

            var calcBalance;
            var isError = false;

            if (index === 0) {
                calcBalance = balance;
            } else {
                calcBalance = prevBalance + amountIn - amountOut;
                isError = (calcBalance !== balance);
            }

            // 計算残高セル更新
            var calcCell = row.querySelector('.calc-balance');
            if (calcCell) {
                calcCell.textContent = calcBalance.toLocaleString();
            }

            // 状態バッジ更新（重複バッジを保持）
            var statusCell = row.querySelector('.status-cell');
            if (statusCell) {
                var dupBadge = row.hasAttribute('data-duplicate')
                    ? '<span class="badge bg-warning text-dark">重複</span> ' : '';
                if (isError) {
                    statusCell.innerHTML = dupBadge + '<span class="badge bg-danger">誤差</span>';
                    errorCount++;
                } else {
                    statusCell.innerHTML = dupBadge + '<span class="badge bg-success">OK</span>';
                }
            }

            // 行のスタイル更新
            row.classList.remove('table-danger', 'table-warning', 'table-info');
            if (isError) {
                row.classList.add('table-danger');
            }

            // 残高入力のスタイル更新
            var balanceInput = row.querySelector('input[name$="-balance"]');
            if (balanceInput) {
                balanceInput.classList.toggle('text-danger', isError);
                balanceInput.classList.toggle('fw-bold', isError);
            }

            // 次行の計算基準: エラー時はCSV残高を使用（Python側と同一ロジック）
            prevBalance = isError ? balance : calcBalance;
        });

        return errorCount;
    }

    // 問題行ナビゲーション
    var errorNav = document.getElementById('errorNav');
    var errorCountSpan = document.getElementById('errorCount');
    var currentProblemIndex = -1;

    function getProblemRows() {
        return Array.from(tableBody.querySelectorAll('tr.data-row')).filter(function (row) {
            if (row.style.display === 'none') return false;
            var statusCell = row.querySelector('.status-cell');
            if (!statusCell) return false;
            return statusCell.querySelector('.badge.bg-danger') !== null ||
                   statusCell.querySelector('.badge.bg-warning') !== null;
        });
    }

    function updateErrorNav() {
        var problems = getProblemRows();
        if (errorNav) {
            if (problems.length > 0) {
                errorNav.classList.remove('d-none');
                errorCountSpan.textContent = problems.length + '件の問題';
            } else {
                errorNav.classList.add('d-none');
            }
        }
        currentProblemIndex = -1;
    }

    function navigateToProblem(direction) {
        var problems = getProblemRows();
        if (problems.length === 0) return;

        currentProblemIndex += direction;
        if (currentProblemIndex >= problems.length) currentProblemIndex = 0;
        if (currentProblemIndex < 0) currentProblemIndex = problems.length - 1;

        var targetRow = problems[currentProblemIndex];
        targetRow.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // ハイライト（既存の背景色と干渉しないようbox-shadowを使用）
        targetRow.style.boxShadow = '0 0 0 2px #0d6efd';
        setTimeout(function () { targetRow.style.boxShadow = ''; }, 1500);
    }

    var prevErrorBtn = document.getElementById('prevErrorBtn');
    var nextErrorBtn = document.getElementById('nextErrorBtn');
    if (prevErrorBtn) prevErrorBtn.addEventListener('click', function () { navigateToProblem(-1); });
    if (nextErrorBtn) nextErrorBtn.addEventListener('click', function () { navigateToProblem(1); });

    // 初期表示
    updateErrorNav();

    // 再計算ボタン
    var recalculateBtn = document.getElementById('recalculateBtn');
    if (recalculateBtn) {
        recalculateBtn.addEventListener('click', function () {
            var errorCount = recalculateBalances();
            updateErrorNav();

            // 視覚フィードバック
            var originalHTML = recalculateBtn.innerHTML;
            if (errorCount > 0) {
                recalculateBtn.innerHTML = '<i class="bi bi-exclamation-triangle"></i> ' + errorCount + '件の誤差';
                recalculateBtn.classList.replace('btn-warning', 'btn-danger');
            } else {
                recalculateBtn.innerHTML = '<i class="bi bi-check-lg"></i> OK';
                recalculateBtn.classList.replace('btn-warning', 'btn-success');
            }

            setTimeout(function () {
                recalculateBtn.innerHTML = originalHTML;
                recalculateBtn.classList.remove('btn-danger', 'btn-success');
                recalculateBtn.classList.add('btn-warning');
            }, 2000);
        });
    }

    // Enter キーによるフォーム送信を防止（誤って取り込み実行されないように）
    if (form) {
        form.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
                e.preventDefault();
            }
        });
    }

    // フォーム送信前に行のインデックスを再割り当て（視覚的順序に合わせる）
    function reindexRows() {
        const visibleRows = Array.from(tableBody.querySelectorAll('tr.data-row')).filter(
            row => row.style.display !== 'none'
        );

        visibleRows.forEach(function (row, newIndex) {
            // 全ての入力フィールドの name 属性を更新
            const inputs = row.querySelectorAll('input, select, textarea');
            inputs.forEach(function (input) {
                const name = input.getAttribute('name');
                if (name) {
                    // form-{oldIndex}-{field} → form-{newIndex}-{field}
                    const newName = name.replace(/^form-\d+-/, `form-${newIndex}-`);
                    input.setAttribute('name', newName);
                }
                const id = input.getAttribute('id');
                if (id && id.startsWith('del-')) {
                    input.setAttribute('id', `del-${newIndex}`);
                }
            });

            // data-row-index も更新
            row.dataset.rowIndex = newIndex;

            // 挿入ボタンの data-index も更新
            const insertBtn = row.querySelector('.insert-row-btn');
            if (insertBtn) {
                insertBtn.dataset.index = newIndex;
            }
        });

        // total_rows を更新
        totalRowsInput.value = visibleRows.length;

        return visibleRows.length;
    }

    // 二重送信防止
    if (form) {
        form.addEventListener('submit', function (e) {
            if (isSubmitting) {
                e.preventDefault();
                return false;
            }

            // 送信前に行を再インデックス
            const rowCount = reindexRows();

            if (rowCount === 0) {
                e.preventDefault();
                alert('取り込むデータがありません。');
                return false;
            }

            // 重複チェック確認
            var duplicateRows = Array.from(
                tableBody.querySelectorAll('tr.data-row[data-duplicate="true"]')
            ).filter(function (row) { return row.style.display !== 'none'; });

            if (duplicateRows.length > 0) {
                if (!confirm(duplicateRows.length + '件の重複データが含まれています。取り込みますか？')) {
                    e.preventDefault();
                    return false;
                }
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

                const clickedBtn = document.activeElement;
                if (clickedBtn && clickedBtn.classList.contains('btn-submit')) {
                    clickedBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> 処理中...';
                }
            }, 0);
        });
    }
});
