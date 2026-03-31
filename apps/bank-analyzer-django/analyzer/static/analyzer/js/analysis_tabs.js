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
                var scope = scopeBtn ? scopeBtn.dataset.scope : 'global';

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
            onSuccess: () => {
                self.removeRow(txId);
                self.updateBadgeCount(-1);
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

        postAction('update_category', {
            tx_id: txIds[0],
            category: category,
            apply_all: 'true',
        }, {
            onSuccess: () => {
                self.updateBadgeCount(-count);
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
        var selectors = ['#aiFlatView .ai-flat-row', '#aiGroupedView .ai-group-row'];
        selectors.forEach(function(sel) {
            document.querySelectorAll(sel).forEach(function(row) {
                if (row.dataset.description === description) {
                    highlightAndRemoveRow(row);
                }
            });
        });
    },

    bulkApply: function(minScore) {
        const scoreText = minScore === 95 ? '95%以上' : '85%以上';

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
                        self.updateBadgeCount(-removedCount);
                        const appliedCount = data.count || removedCount;
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
        var self = this;
        var txIds = JSON.parse(row.dataset.txIds || '[]');
        var desc = row.dataset.groupDesc;
        var count = txIds.length;

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
