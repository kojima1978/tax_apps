// ===== Analysis Filters & Interactions Module =====
// KeyboardShortcuts, ContextMenu, QuickFilters, FilterChips, FilterPresets,
// BankAccountFilter, AutoFilter, FilterPanel + all module initialization
// Requires: analysis_core.js, analysis_transactions.js, analysis_patterns.js, analysis_tabs.js, utils.js

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

        document.addEventListener('contextmenu', function(e) {
            var row = e.target.closest('tr[data-tx-id]');
            if (!row) return;

            e.preventDefault();
            self._targetRow = row;

            var x = Math.min(e.clientX, window.innerWidth - 200);
            var y = Math.min(e.clientY, window.innerHeight - 300);
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
            menu.style.display = 'block';

            var descCell = row.querySelector('td[title]');
            var title = menu.querySelector('#contextMenuTitle');
            if (title && descCell) {
                var desc = descCell.title || '';
                title.textContent = desc.length > 20 ? desc.substring(0, 20) + '...' : desc;
            }

            catSubmenu.style.display = 'none';
        });

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

        this._container.addEventListener('click', function(e) {
            var closeBtn = e.target.closest('.btn-close[data-filter-key]');
            if (!closeBtn) return;

            var key = closeBtn.dataset.filterKey;
            var value = closeBtn.dataset.filterValue;
            var newParams = new URLSearchParams(window.location.search);

            var allValues = newParams.getAll(key);
            if (allValues.length > 1) {
                newParams.delete(key);
                allValues.forEach(function(v) { if (v !== value) newParams.append(key, v); });
            } else {
                newParams.delete(key);
            }

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

        var saveBtn = document.createElement('button');
        saveBtn.type = 'button';
        saveBtn.className = 'btn btn-outline-secondary btn-sm ms-2';
        saveBtn.innerHTML = '<i class="bi bi-bookmark-plus"></i> 条件を保存';
        saveBtn.addEventListener('click', function() { self._savePreset(); });
        container.appendChild(saveBtn);

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

// ===== 銀行→口座 連動フィルター =====

const BankAccountFilter = {
    _bankToAccounts: {},
    _bankCheckboxes: [],
    _accountItems: [],

    init: function() {
        this._bankToAccounts = window.BANK_TO_ACCOUNTS || {};
        this._bankCheckboxes = Array.from(document.querySelectorAll('input[name="bank"]'));
        this._accountItems = Array.from(document.querySelectorAll('#accountFilterList .account-filter-item'));
        if (!this._bankCheckboxes.length || !this._accountItems.length) return;

        var self = this;
        this._bankCheckboxes.forEach(function(cb) {
            cb.addEventListener('change', function() { self._filter(); });
        });
        this._filter();
    },

    _filter: function() {
        var selectedBanks = this._bankCheckboxes
            .filter(function(cb) { return cb.checked; })
            .map(function(cb) { return cb.value; });

        if (selectedBanks.length === 0) {
            this._accountItems.forEach(function(item) { item.style.display = ''; });
            return;
        }

        var allowedAccounts = new Set();
        var map = this._bankToAccounts;
        selectedBanks.forEach(function(bank) {
            (map[bank] || []).forEach(function(acc) { allowedAccounts.add(acc); });
        });

        this._accountItems.forEach(function(item) {
            var cb = item.querySelector('input[name="account"]');
            if (!cb) return;
            if (allowedAccounts.has(cb.value)) {
                item.style.display = '';
            } else {
                item.style.display = 'none';
                cb.checked = false;
            }
        });
    }
};

// ===== フィルター自動適用 =====

const AutoFilter = {
    _form: null,
    _overlay: null,

    init: function() {
        this._form = document.getElementById('filterForm');
        if (!this._form) return;
        this._overlay = document.getElementById('filterLoadingOverlay');

        var self = this;

        this._form.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                self._submit();
            }
        });

        this._form.addEventListener('submit', function() {
            if (self._overlay) self._overlay.classList.add('active');
        });
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
        if (!panel) return;

        var params = new URLSearchParams(window.location.search);
        var hasDetailFilter = this._hasDetailFilters(params);

        if (hasDetailFilter) {
            panel.classList.add('show');
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

// ===== 全モジュール初期化 =====

StatusIndicator.init();
KeyboardShortcuts.init();
ContextMenu.init();
QuickFilters.init();
FilterChips.init();
FilterPresets.init();
BankAccountFilter.init();
AutoFilter.init();
FilterPanel.init();
ProgressBar.init();
GroupedView.init();
TransferView.init();
CleanupView.init();
