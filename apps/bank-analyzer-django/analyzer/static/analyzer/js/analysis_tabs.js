// ===== Analysis Tabs Module =====
// UnclassifiedTab, AISuggestions, GroupedView, TransferView, CleanupView
// Requires: analysis_core.js, analysis_patterns.js, utils.js

// ===== 未分類タブ =====

const UnclassifiedTab = {
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
                select.dispatchEvent(new Event('change', { bubbles: true }));
            }
        });

        showToast(`${checked.length}件の分類を「${category}」に変更しました`, 'success');
        this._showInlinePatternSection(category, checked);
    },

    deleteSelected: function() {
        const checked = Array.from(document.querySelectorAll('.unclassified-select-check:checked'));
        if (checked.length === 0) {
            showToast('削除する未分類取引を選択してください', 'warning');
            return;
        }

        const txIds = checked.map(cb => cb.value);
        ConfirmModal.show({
            title: '未分類取引の削除',
            message: `選択した${txIds.length}件の未分類取引を削除します。この操作は取り消せません。`,
            confirmText: '削除する',
            confirmClass: 'btn-danger',
            onConfirm: () => this._deleteTxIds(txIds),
        });
    },

    deleteOne: function(button) {
        const txId = button.getAttribute('data-tx-id');
        const desc = button.getAttribute('data-tx-desc') || 'この取引';
        ConfirmModal.show({
            title: '未分類取引の削除',
            message: `「${desc}」を削除します。この操作は取り消せません。`,
            confirmText: '削除する',
            confirmClass: 'btn-danger',
            onConfirm: () => this._deleteTxIds([txId], button),
        });
    },

    _deleteTxIds: function(txIds, triggerButton) {
        if (!txIds.length) return;

        const formData = createFormData({});
        txIds.forEach(id => formData.append('tx_ids', id));

        if (triggerButton) disableButton(triggerButton);
        StatusIndicator.saving('削除中...');

        postJson(getApiUrl('delete-unclassified-transactions'), formData, {
            onSuccess: (data) => {
                const deletedIds = data.deleted_ids || txIds;
                this._removeDeletedRows(deletedIds);
                this._afterDelete(data.count || deletedIds.length);
            },
            onError: () => {
                if (triggerButton) enableButton(triggerButton);
                StatusIndicator.failed();
            },
        });
    },

    _removeDeletedRows: function(txIds) {
        txIds.forEach(function(id) {
            const row = document.querySelector(`#unclassifiedTable tr[data-tx-id="${id}"]`);
            if (row) {
                const checkbox = row.querySelector('.unclassified-select-check');
                if (checkbox) checkbox.checked = false;
                fadeOutRow(row);
            }
        });
    },

    _afterDelete: function(count) {
        updateUnclassifiedCount(count);
        if (typeof ProgressBar !== 'undefined' && ProgressBar.removeUnclassified) {
            ProgressBar.removeUnclassified(count);
        }

        const selectAll = document.getElementById('selectAllUnclassified');
        if (selectAll) selectAll.checked = false;
        this.updateSelectionUI();
        this._ensureEmptyState();
        StatusIndicator.saved();
        showToast(`${count}件の未分類取引を削除しました`, 'success');
    },

    _ensureEmptyState: function() {
        const tbody = document.querySelector('#unclassifiedTable tbody');
        if (!tbody) return;
        setTimeout(function() {
            if (tbody.querySelectorAll('tr[data-tx-id]').length > 0) return;
            tbody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="bi bi-check-circle text-success me-1"></i>
                        未分類取引はありません。
                    </td>
                </tr>`;
        }, 320);
    },

    _showInlinePatternSection: function(category, checkedBoxes) {
        var section = document.getElementById('inlinePatternSection');
        if (!section) return;

        section.style.display = 'block';
        section.dataset.category = category;

        if (checkedBoxes.length > 0) {
            var firstRow = checkedBoxes[0].closest('tr');
            var desc = firstRow ? firstRow.dataset.description : '';
            this._populateInlineKeywordCandidates(desc);
        }
    },

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

        if (candidates.length > 0) {
            input.value = candidates[0];
        }
    },

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

        const firstRow = checked[0].closest('tr');
        const description = firstRow.dataset.description || '';

        promptAndRegisterPattern({
            category: category,
            description: description,
            scope: scope,
            action: 'add_pattern',
            confirmText: '追加',
        });
    },

    init: function() {
        const self = this;

        if (document.querySelectorAll('.unclassified-select-check').length === 0) return;

        initSelectAll('selectAllUnclassified', '.unclassified-select-check', function() {
            self.updateSelectionUI();
        });

        const applyBulkBtn = document.getElementById('applyUnclassifiedBulkBtn');
        if (applyBulkBtn) {
            applyBulkBtn.addEventListener('click', () => self.applyBulkCategory());
        }

        const deleteSelectedBtn = document.getElementById('deleteUnclassifiedSelectedBtn');
        if (deleteSelectedBtn) {
            deleteSelectedBtn.addEventListener('click', () => self.deleteSelected());
        }

        document.querySelectorAll('.delete-unclassified-btn').forEach(function(btn) {
            btn.addEventListener('click', function() {
                self.deleteOne(this);
            });
        });

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

        const clearBtn = document.getElementById('clearUnclassifiedSelectionBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', function() {
                const checkboxes = document.querySelectorAll('.unclassified-select-check');
                const selectAllCheckbox = document.getElementById('selectAllUnclassified');
                checkboxes.forEach(cb => cb.checked = false);
                if (selectAllCheckbox) selectAllCheckbox.checked = false;
                self.updateSelectionUI();
                var section = document.getElementById('inlinePatternSection');
                if (section) section.style.display = 'none';
            });
        }

        var inlineAddBtn = document.getElementById('inlinePatternAddBtn');
        if (inlineAddBtn) {
            inlineAddBtn.addEventListener('click', function() {
                var keyword = document.getElementById('inlinePatternKeyword').value.trim();
                var section = document.getElementById('inlinePatternSection');
                var category = section ? section.dataset.category : '';
                var scopeBtn = document.querySelector('#inlinePatternSection .btn-group .btn.active');
                var scope = scopeBtn ? scopeBtn.dataset.scope : 'case';

                if (!keyword) { showToast('キーワードを入力してください', 'warning'); return; }
                if (!category) { showToast('カテゴリーが指定されていません', 'warning'); return; }

                postAction('add_pattern', {
                    category: category,
                    keyword: keyword,
                    scope: scope,
                }, {
                    onSuccess: function() {
                        var scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                        showToast('「' + keyword + '」を「' + category + '」に追加しました' + scopeMsg, 'success');
                        section.style.display = 'none';
                    },
                });
            });
        }

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

    updateFuzzyThreshold: function(value) {
        const el = document.getElementById('fuzzyThresholdValue');
        if (el) el.textContent = value + '%';
    },

    regenerate: function() {
        const slider = document.getElementById('fuzzyThresholdSlider');
        if (!slider) return;
        const threshold = slider.value;
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('fuzzy_threshold', threshold);
        currentUrl.searchParams.set('regenerate_ai', 'true');
        window.location.href = currentUrl.toString();
    },

    apply: function(txId, category) {
        const self = this;
        ConfirmModal.show({
            title: 'AI分類の適用',
            message: `「${category}」に分類しますか？`,
            confirmText: '適用',
            onConfirm: () => self._applyOne(txId, category),
        });
    },

    applyDirect: function(txId, category) {
        this._applyOne(txId, category);
    },

    _applyOne: function(txId, category) {
        const self = this;
        postAction('apply_ai_suggestion', {
            tx_id: txId,
            category: category,
        }, {
            onSuccess: (data) => {
                self.removeRow(txId);
                self.updateBadgeCount(-1);
                ClassificationUndo.show(data.change_group, data.count || 1, category);
                ClassificationWorkbench.rememberCategory(category);
                showToast(`「${category}」に分類しました`, 'success');
            },
        });
    },

    applyGroup: function(row) {
        const self = this;
        const txIds = row.dataset.txIds.split(',').map(Number);
        const category = row.dataset.category;
        const description = row.dataset.description;
        const count = parseInt(row.dataset.count);

        row.style.opacity = '0.5';
        row.style.pointerEvents = 'none';

        const formData = createFormData({
            action: 'bulk_update_categories',
            source_tab: 'unclassified',
        });
        txIds.forEach(function(id) {
            formData.append('uncat-' + id, category);
        });

        postJson(window.location.href, formData, {
            onSuccess: (data) => {
                self.updateBadgeCount(-count);
                ClassificationUndo.show(data.change_group, data.count || count, category);
                ClassificationWorkbench.rememberCategory(category);
                highlightAndRemoveRow(row);
                self._removeRowsByDescription(description);
                showToast(`「${category}」に${count}件分類しました`, 'success');
            },
            onError: () => {
                row.style.opacity = '';
                row.style.pointerEvents = '';
            },
        });
    },

    applyGroupWithPattern: function(row, scope) {
        const self = this;
        const category = row.dataset.category;
        const description = row.dataset.description;
        const count = parseInt(row.dataset.count);

        promptAndRegisterPattern({
            category: category,
            description: description,
            scope: scope,
            extraMessage: '対象: ' + count + '件',
            onSuccess: function(data) {
                var appliedCount = data.count || count;
                ClassificationUndo.show(data.change_group, appliedCount, category);
                self.updateBadgeCount(-appliedCount);
                highlightAndRemoveRow(row);
                self._removeRowsByDescription(description);
            },
        });
    },

    dismiss: function(txId) {
        this.removeRow(txId);
        this.updateBadgeCount(-1);
        showToast('提案を却下しました', 'info');
    },

    dismissGroup: function(row) {
        const count = parseInt(row.dataset.count);
        const description = row.dataset.description;
        this.updateBadgeCount(-count);
        highlightAndRemoveRow(row);
        this._removeFlatRowsByDescription(description);
        showToast(`${count}件の提案を却下しました`, 'info');
    },

    removeRow: function(txId) {
        highlightAndRemoveRow(document.getElementById(`ai-row-${txId}`));
    },

    _removeRowsByDescription: function(description) {
        var removedWorkbenchGroup = false;
        var selectors = [
            '#aiFlatView .ai-flat-row',
            '#aiGroupedView .ai-group-row',
            '.high-confidence-list .ai-group-row',
            '#groupedTable .classification-group-row',
            '#unclassifiedTable .classification-flat-row',
        ];
        selectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(row) {
                if ((row.dataset.description || row.dataset.groupDesc) === description) {
                    if (row.matches('#groupedTable .classification-group-row')) removedWorkbenchGroup = true;
                    highlightAndRemoveRow(row);
                }
            });
        });
        if (removedWorkbenchGroup) {
            ['unclassifiedGroupCount', 'unclassifiedViewGroupCount'].forEach(function(id) {
                var el = document.getElementById(id);
                if (el) el.textContent = Math.max(0, (parseInt(el.textContent.replace(/,/g, ''), 10) || 0) - 1).toLocaleString();
            });
        }
    },

    bulkApply: function(minScore) {
        const scoreText = minScore === 95 ? '95%以上' : '85%以上';
        const candidateRows = Array.from(document.querySelectorAll('.ai-group-row')).filter(row => {
            return parseInt(row.dataset.score) >= minScore;
        });
        const candidateIds = Array.from(new Set(candidateRows.flatMap(row => {
            return (row.dataset.txIds || '').split(',').filter(Boolean);
        })));

        ConfirmModal.show({
            title: 'AI提案の一括適用',
            message: `信頼度${scoreText}のAI提案を一括適用しますか？`,
            confirmText: '一括適用',
            onConfirm: () => {
                showToast('一括適用中...', 'info');
                const self = this;
                postAction('bulk_apply_ai_suggestions', {
                    min_score: minScore,
                }, {
                    onSuccess: function(data) {
                        let removedCount = 0;
                        document.querySelectorAll('#aiGroupedView .ai-group-row').forEach(row => {
                            if (parseInt(row.dataset.score) >= minScore) {
                                removedCount += parseInt(row.dataset.count);
                                highlightAndRemoveRow(row);
                            }
                        });
                        document.querySelectorAll('#aiFlatView .ai-flat-row').forEach(row => {
                            if (parseInt(row.dataset.score) >= minScore) {
                                highlightAndRemoveRow(row);
                            }
                        });
                        Array.from(new Set(candidateRows.map(function(row) {
                            return row.dataset.description;
                        }))).forEach(function(description) {
                            self._removeRowsByDescription(description);
                        });
                        self.updateBadgeCount(-removedCount);
                        const appliedCount = data.count || removedCount;
                        ClassificationUndo.show(
                            data.change_group,
                            appliedCount,
                            '',
                            appliedCount + '件の高信頼度候補を分類しました'
                        );
                        showToast(`${appliedCount}件を一括適用しました（信頼度${scoreText}）`, 'success');
                    },
                });
            },
        });
    },

    applyAndAddPattern: function(txId, category, description, scope) {
        const self = this;
        promptAndRegisterPattern({
            category: category,
            description: description,
            scope: scope,
            onSuccess: function(data) {
                var appliedCount = data.count || 1;
                self.updateBadgeCount(-appliedCount);
                self._removeRowsByDescription(description);
            },
        });
    },

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
        if (typeof ProgressBar !== 'undefined' && ProgressBar.update) {
            ProgressBar.update(-delta);
        }
        if (typeof updateUnclassifiedCount === 'function') {
            updateUnclassifiedCount(-delta);
        }
    },

    _initViewToggle: function() {
        initViewToggle('#aiViewToggle', { grouped: 'aiGroupedView', flat: 'aiFlatView' });
    },

    _initGroupActions: function() {
        const self = this;

        document.querySelectorAll('.ai-apply-group-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.ai-group-row');
                self.applyGroup(row);
            });
        });

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

        document.querySelectorAll('.ai-dismiss-group-btn').forEach(btn => {
            btn.addEventListener('click', function() {
                const row = this.closest('.ai-group-row');
                self.dismissGroup(row);
            });
        });
    },

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

    init: function() {
        const popoverTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="popover"]'));
        popoverTriggerList.map(function (popoverTriggerEl) {
            return new bootstrap.Popover(popoverTriggerEl);
        });

        this._initViewToggle();
        this._initGroupActions();
        this._initFlatOneClick();
    },
};

// ===== 分類ワークベンチ =====

const ClassificationWorkbench = {
    _focusedRow: null,
    _recentKey: 'bankAnalyzerRecentCategories',

    init: function() {
        if (!document.getElementById('classificationQuickBar')) return;
        var self = this;

        document.addEventListener('focusin', function(e) {
            var row = e.target.closest('.classification-group-row, .classification-flat-row');
            if (row) self._setFocusedRow(row);
        });
        document.addEventListener('click', function(e) {
            var row = e.target.closest('.classification-group-row, .classification-flat-row');
            if (row && !e.target.closest('a, button, select, input, summary')) self._setFocusedRow(row);
        });

        document.querySelectorAll('.quick-category-btn').forEach(function(button) {
            button.addEventListener('click', function() {
                self.applyCategory(this.dataset.category);
            });
        });

        document.addEventListener('keydown', function(e) {
            if (!document.querySelector('#unclassified.active, #unclassified.show')) return;
            if (e.target.matches('input, textarea, select') || e.ctrlKey || e.metaKey || e.altKey) return;
            var key = e.key.toLowerCase();
            if (key === 'j' || key === 'k') {
                e.preventDefault();
                self._moveFocus(key === 'j' ? 1 : -1);
                return;
            }
            if (/^[1-6]$/.test(key)) {
                var button = document.querySelector('.quick-category-btn[data-shortcut="' + key + '"]');
                if (button) {
                    e.preventDefault();
                    self.applyCategory(button.dataset.category);
                }
                return;
            }
            if (key === 'enter' && self._focusedRow) {
                var select = self._focusedRow.querySelector('.group-category-select, select[name^="uncat-"]');
                if (select) {
                    e.preventDefault();
                    select.focus();
                }
            }
        });

        var first = this._visibleRows()[0];
        if (first) this._setFocusedRow(first);
        this._promoteRecentButtons();
    },

    _visibleRows: function() {
        var groupedVisible = document.getElementById('groupedView');
        var selector = groupedVisible && groupedVisible.style.display !== 'none'
            ? '.classification-group-row'
            : '.classification-flat-row';
        return Array.from(document.querySelectorAll(selector)).filter(function(row) {
            return row.offsetParent !== null;
        });
    },

    _setFocusedRow: function(row) {
        document.querySelectorAll('.classification-row-focused').forEach(function(item) {
            item.classList.remove('classification-row-focused');
        });
        this._focusedRow = row;
        row.classList.add('classification-row-focused');
    },

    _moveFocus: function(delta) {
        var rows = this._visibleRows();
        if (!rows.length) return;
        var index = Math.max(0, rows.indexOf(this._focusedRow));
        index = Math.min(rows.length - 1, Math.max(0, index + delta));
        this._setFocusedRow(rows[index]);
        rows[index].focus({ preventScroll: true });
        rows[index].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    },

    focusFirst: function() {
        var first = this._visibleRows()[0];
        if (first) this._setFocusedRow(first);
    },

    applyCategory: function(category) {
        if (!this._focusedRow) {
            showToast('分類する行を選択してください', 'warning');
            return;
        }
        var select = this._focusedRow.querySelector('.group-category-select, select[name^="uncat-"]');
        if (!select) return;
        select.value = category;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        this.rememberCategory(category);
    },

    rememberCategory: function(category) {
        var recent = this._getRecent().filter(function(item) { return item !== category; });
        recent.unshift(category);
        localStorage.setItem(this._recentKey, JSON.stringify(recent.slice(0, 6)));
        this._promoteRecentButtons();
    },

    _getRecent: function() {
        try { return JSON.parse(localStorage.getItem(this._recentKey) || '[]'); }
        catch (e) { return []; }
    },

    _promoteRecentButtons: function() {
        var container = document.getElementById('classificationQuickButtons');
        if (!container) return;
        var buttons = Array.from(container.querySelectorAll('.quick-category-btn'));
        var recent = this._getRecent();
        buttons.sort(function(a, b) {
            var ai = recent.indexOf(a.dataset.category);
            var bi = recent.indexOf(b.dataset.category);
            ai = ai < 0 ? 999 : ai;
            bi = bi < 0 ? 999 : bi;
            return ai - bi;
        });
        buttons.forEach(function(button, index) {
            button.dataset.shortcut = String(index + 1);
            var kbd = button.querySelector('kbd');
            if (kbd) kbd.textContent = String(index + 1);
            container.appendChild(button);
        });
    },
};

// ===== グループ表示 =====

const GroupedView = {
    _suggestions: {},

    init: function() {
        var self = this;

        var dataEl = document.getElementById('groupSuggestionsData');
        if (dataEl) {
            try { this._suggestions = JSON.parse(dataEl.textContent); } catch(e) {}
        }

        this._injectSuggestionBadges();

        initViewToggle('#viewToggle', { grouped: 'groupedView', flat: 'flatView' });

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
        updateUnclassifiedCount(delta);
    },

    _classifyGroup: function(row, category, select) {
        var txIds = JSON.parse(row.dataset.txIds || '[]');
        var count = txIds.length;
        if (!row.dataset.confirmed && count > 1) {
            var self = this;
            ConfirmModal.show({
                title: 'グループ分類の確認',
                message: '摘要「' + row.dataset.groupDesc + '」の' + count + '件を「' + category + '」に分類します。',
                confirmText: count + '件を分類',
                onConfirm: function() {
                    row.dataset.confirmed = 'true';
                    self._classifyGroup(row, category, select);
                },
            }).then(function(confirmed) {
                if (!confirmed && select) select.value = '';
            });
            return;
        }
        delete row.dataset.confirmed;

        var self = this;
        var desc = row.dataset.groupDesc;

        if (select) select.disabled = true;
        StatusIndicator.saving();

        var categoryUpdates = {};
        txIds.forEach(function(id) { categoryUpdates[id] = category; });

        var formData = createFormData({
            action: 'bulk_update_categories',
            source_tab: 'unclassified',
        });
        txIds.forEach(function(id) {
            formData.append('uncat-' + id, category);
        });

        postJson(window.location.href, formData, {
            onSuccess: function(data) {
                var updatedCount = data.count || count;

                var applySuccess = function(suffix) {
                    StatusIndicator.saved();
                    ProgressBar.update(updatedCount);
                    self._updateTxTotal(updatedCount);
                    ClassificationUndo.show(data.change_group, updatedCount, category);
                    ClassificationWorkbench.rememberCategory(category);
                    ['unclassifiedGroupCount', 'unclassifiedViewGroupCount'].forEach(function(id) {
                        var groupCount = document.getElementById(id);
                        if (groupCount) groupCount.textContent = Math.max(0, (parseInt(groupCount.textContent.replace(/,/g, ''), 10) || 0) - 1).toLocaleString();
                    });
                    highlightAndRemoveRow(row);
                    showToast('「' + desc + '」' + updatedCount + '件を「' + category + '」に分類しました' + (suffix || ''), 'success');
                    PatternPrompt.show(category, desc);
                };

                verifyTransaction(txIds[0], function(verified) {
                    if (verified.category !== category) {
                        showToast('一括分類の保存結果がDBと不一致です。ページを再読み込みしてください。', 'danger');
                        StatusIndicator.failed();
                        return;
                    }
                    applySuccess('（DB検証済み）');
                }, function() {
                    applySuccess();
                });
            },
            onError: function() {
                if (select) { select.disabled = false; select.value = ''; }
                StatusIndicator.failed();
            },
        });
    }
};

// ===== 資金移動タブ =====

const TransferView = {
    init: function() {
        var self = this;

        initViewToggle('#transferViewToggle', { card: 'transferCardView', table: 'transferTableView' });

        var classifyAllBtn = document.getElementById('classifyAllTransfersBtn');
        if (classifyAllBtn) {
            classifyAllBtn.addEventListener('click', function() {
                self._classifyAllAsTransfer();
            });
        }
    },

    _classifyAllAsTransfer: function() {
        var selects = document.querySelectorAll('#transferCardView select[name^="transfer-"]');
        var count = 0;
        selects.forEach(function(select) {
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

// ===== クレンジングタブ =====

const CleanupView = {
    init: function() {
        const form = document.getElementById('rangeDeleteForm');
        const startId = document.getElementById('start_id');
        const endId = document.getElementById('end_id');
        const preview = document.getElementById('rangeDeletePreview');
        const confirmation = document.getElementById('delete_confirmation');
        const expectedCount = document.getElementById('rangeDeleteExpectedCount');
        const deleteButton = document.getElementById('rangeDeleteBtn');
        let previewCount = 0;
        let previewTimer = null;
        let previewController = null;

        if (form && startId && endId && preview && confirmation && expectedCount && deleteButton) {
            const updateButtonState = () => {
                deleteButton.disabled = !(previewCount > 0 && confirmation.value.trim() === '削除');
            };

            const renderPreview = (data) => {
                preview.replaceChildren();
                const summary = document.createElement('div');
                summary.className = data.count > 0
                    ? 'alert alert-danger py-2 mb-2'
                    : 'alert alert-secondary py-2 mb-0';
                summary.innerHTML = data.count > 0
                    ? '<strong>' + data.count + '件</strong>が削除対象です。内容を確認してください。'
                    : '指定範囲に削除対象はありません。';
                preview.appendChild(summary);

                if (data.sample && data.sample.length) {
                    const list = document.createElement('div');
                    list.className = 'cleanup-delete-sample';
                    data.sample.forEach(function(tx) {
                        const item = document.createElement('div');
                        item.className = 'cleanup-delete-sample-row';
                        const amount = tx.amount_out > 0
                            ? '出金 ' + tx.amount_out.toLocaleString() + '円'
                            : '入金 ' + tx.amount_in.toLocaleString() + '円';
                        item.textContent = 'ID ' + tx.id + '｜' + (tx.date || '日付なし') +
                            '｜' + (tx.description || '摘要なし') + '｜' + amount;
                        list.appendChild(item);
                    });
                    preview.appendChild(list);
                    if (data.count > data.sample.length) {
                        const more = document.createElement('div');
                        more.className = 'small text-muted mt-1';
                        more.textContent = 'ほか ' + (data.count - data.sample.length) + '件';
                        preview.appendChild(more);
                    }
                }
            };

            const loadPreview = () => {
                const s = parseInt(startId.value);
                const e = parseInt(endId.value);
                previewCount = 0;
                expectedCount.value = '-1';
                updateButtonState();

                if (isNaN(s) || isNaN(e) || s < 1 || e < 1) {
                    preview.innerHTML = '<div class="text-muted small">開始IDと終了IDを入力すると、削除対象を確認できます。</div>';
                    return;
                }

                if (previewController) previewController.abort();
                previewController = new AbortController();
                preview.innerHTML = '<div class="text-muted small"><span class="spinner-border spinner-border-sm me-1"></span>対象を確認中...</div>';
                const url = new URL(form.dataset.previewUrl, window.location.origin);
                url.searchParams.set('start_id', s);
                url.searchParams.set('end_id', e);
                fetch(url, { signal: previewController.signal })
                    .then(function(response) {
                        if (!response.ok) throw new Error('preview failed');
                        return response.json();
                    })
                    .then(function(data) {
                        previewCount = data.count || 0;
                        expectedCount.value = String(previewCount);
                        renderPreview(data);
                        updateButtonState();
                    })
                    .catch(function(error) {
                        if (error.name === 'AbortError') return;
                        preview.innerHTML = '<div class="alert alert-warning py-2 mb-0">対象を取得できませんでした。もう一度入力してください。</div>';
                    });
            };

            const schedulePreview = () => {
                clearTimeout(previewTimer);
                previewTimer = setTimeout(loadPreview, 300);
            };

            startId.addEventListener('input', schedulePreview);
            endId.addEventListener('input', schedulePreview);
            confirmation.addEventListener('input', updateButtonState);
            form.addEventListener('submit', function(event) {
                if (previewCount < 1 || confirmation.value.trim() !== '削除') {
                    event.preventDefault();
                    showToast('対象を確認し、確認欄に「削除」と入力してください。', 'warning');
                }
            });
        }
    }
};
