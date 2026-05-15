/**
 * 通帳有無一覧表 — セル編集・自動保存
 */
const PassbookInventory = (() => {
    let _config = {};

    function init(config) {
        _config = config;
        _bindYearToggles();
        _bindInputs();
        _bindCheckboxes();
    }

    // -------------------------------------------------------
    // 年セル ○/空 トグル
    // -------------------------------------------------------
    function _bindYearToggles() {
        document.querySelectorAll('.year-toggle').forEach(td => {
            td.addEventListener('click', () => _toggleYear(td));
            td.addEventListener('keydown', e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    _toggleYear(td);
                }
            });
        });
    }

    function _toggleYear(td) {
        const current = td.dataset.value === 'true';
        const next = !current;
        td.dataset.value = String(next);
        td.textContent = next ? '○' : '';

        const accountId = td.closest('tr').dataset.accountId;
        _save(accountId, 'passbook_year', next, { year: td.dataset.year });
    }

    // -------------------------------------------------------
    // テキスト入力 (残高・備考) — blur で保存
    // -------------------------------------------------------
    function _bindInputs() {
        document.querySelectorAll('.inv-input').forEach(input => {
            const original = input.value;
            input.addEventListener('focus', () => {
                if (input.dataset.field.includes('balance')) {
                    input.value = input.value.replace(/,/g, '');
                }
            });
            input.addEventListener('blur', () => {
                const field = input.dataset.field;
                let raw = input.value.replace(/,/g, '').trim();

                if (field.includes('balance')) {
                    if (raw && !/^\d+$/.test(raw)) {
                        input.classList.add('is-invalid');
                        return;
                    }
                    input.classList.remove('is-invalid');
                    if (raw) input.value = Number(raw).toLocaleString();
                }

                if (input.value !== original) {
                    const accountId = input.closest('tr').dataset.accountId;
                    const value = field.includes('balance') ? (raw || null) : raw;
                    _save(accountId, field, value);
                }
            });
        });
    }

    // -------------------------------------------------------
    // チェックボックス (既経過利息)
    // -------------------------------------------------------
    function _bindCheckboxes() {
        document.querySelectorAll('.inv-checkbox').forEach(cb => {
            cb.addEventListener('change', () => {
                const accountId = cb.closest('tr').dataset.accountId;
                _save(accountId, cb.dataset.field, cb.checked);
            });
        });
    }

    // -------------------------------------------------------
    // AJAX保存
    // -------------------------------------------------------
    function _save(accountId, field, value, extra) {
        const body = { account_id: Number(accountId), field, value, ...extra };
        fetch(_config.apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': _config.csrfToken,
            },
            body: JSON.stringify(body),
        })
        .then(r => r.json())
        .then(data => {
            if (data.ok) {
                _updateBalanceMatch(accountId, data.balance_match);
                _updateTotals();
            }
        })
        .catch(err => console.error('Save error:', err));
    }

    // -------------------------------------------------------
    // 残高一致セル更新
    // -------------------------------------------------------
    function _updateBalanceMatch(accountId, status) {
        const row = document.querySelector(`tr[data-account-id="${accountId}"]`);
        if (!row) return;
        const cell = row.querySelector('.balance-match-cell span');
        if (!cell) return;
        cell.textContent = status;
        cell.className = '';
        if (status === '○') cell.className = 'text-success fw-bold';
        else if (status === '×') cell.className = 'text-danger fw-bold';
        else cell.className = 'text-muted small';
    }

    // -------------------------------------------------------
    // 合計再計算
    // -------------------------------------------------------
    function _updateTotals() {
        let totalPb = 0, totalCert = 0;
        document.querySelectorAll('#inventoryTable tbody tr').forEach(tr => {
            const pbInput = tr.querySelector('[data-field="passbook_balance"]');
            const certInput = tr.querySelector('[data-field="certificate_balance"]');
            if (pbInput) {
                const v = parseInt(pbInput.value.replace(/,/g, ''), 10);
                if (!isNaN(v)) totalPb += v;
            }
            if (certInput) {
                const v = parseInt(certInput.value.replace(/,/g, ''), 10);
                if (!isNaN(v)) totalCert += v;
            }
        });
        const pbEl = document.getElementById('totalPassbook');
        const certEl = document.getElementById('totalCertificate');
        if (pbEl) pbEl.textContent = totalPb.toLocaleString();
        if (certEl) certEl.textContent = totalCert.toLocaleString();
    }

    return { init };
})();
