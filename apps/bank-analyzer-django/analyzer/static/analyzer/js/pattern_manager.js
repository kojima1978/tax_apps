/**
 * Bank Analyzer - Pattern Manager
 * Handles classification pattern management with staging and drag-drop support
 */

const PatternManager = {
    // Configuration (set by template)
    config: {
        showCase: false,
        caseId: null,
        saveUrl: window.location.href
    },

    // Pending changes storage
    pendingChanges: [],

    // ===== Initialization =====

    init: function(config) {
        if (config) {
            this.config = { ...this.config, ...config };
        }

        // Setup drag end cleanup
        document.addEventListener('dragend', () => {
            this.cleanupDrag();
            document.querySelectorAll('.pattern-drop-zone').forEach(zone => {
                zone.classList.remove('drag-over');
            });
        });

        // Page leave warning
        window.addEventListener('beforeunload', (e) => {
            if (this.pendingChanges.length > 0) {
                e.preventDefault();
                e.returnValue = '未保存の変更があります。本当にページを離れますか？';
                return e.returnValue;
            }
        });
    },

    // ===== Staging Functions =====

    stageAddPattern: function(category, keyword, scope) {
        const exists = this.pendingChanges.some(c =>
            c.action === 'add' && c.category === category && c.keyword === keyword && c.scope === scope
        );
        if (exists) {
            this.showToast('このキーワードは既に追加予定です', 'info');
            return false;
        }

        this.pendingChanges.push({
            action: 'add',
            category: category,
            keyword: keyword,
            scope: scope,
            id: Date.now()
        });

        this.updatePendingChangesUI();
        this.addPendingBadgeToUI(category, keyword, scope);
        return true;
    },

    stageDeletePattern: function(category, keyword, scope) {
        const addIndex = this.pendingChanges.findIndex(c =>
            c.action === 'add' && c.category === category && c.keyword === keyword && c.scope === scope
        );
        if (addIndex >= 0) {
            this.pendingChanges.splice(addIndex, 1);
            this.removePendingBadgeFromUI(category, keyword, scope);
            this.updatePendingChangesUI();
            return true;
        }

        this.pendingChanges.push({
            action: 'delete',
            category: category,
            keyword: keyword,
            scope: scope,
            id: Date.now()
        });

        this.updatePendingChangesUI();
        this.markBadgeAsDeleted(category, keyword, scope);
        return true;
    },

    stageMovePattern: function(category, keyword, fromScope, toScope) {
        this.pendingChanges.push({
            action: 'move',
            category: category,
            keyword: keyword,
            fromScope: fromScope,
            toScope: toScope,
            id: Date.now()
        });

        this.updatePendingChangesUI();
        this.markBadgeAsMoved(category, keyword, fromScope, toScope);
        return true;
    },

    // ===== UI Update Functions =====

    updatePendingChangesUI: function() {
        const bar = document.getElementById('pendingChangesBar');
        const countSpan = document.getElementById('pendingChangesCount');

        if (this.pendingChanges.length > 0) {
            bar.classList.remove('d-none');
            countSpan.textContent = this.pendingChanges.length;
        } else {
            bar.classList.add('d-none');
        }
    },

    addPendingBadgeToUI: function(category, keyword, scope) {
        const accordionId = scope === 'global' ? 'globalPatternsAccordion' : 'casePatternsAccordion';
        const accordion = document.getElementById(accordionId);

        if (!accordion) return;

        const buttons = accordion.querySelectorAll('.accordion-button');
        let targetBody = null;

        buttons.forEach(btn => {
            if (btn.textContent.includes(category)) {
                const targetId = btn.getAttribute('data-bs-target');
                const collapse = document.querySelector(targetId);
                if (collapse) {
                    targetBody = collapse.querySelector('.accordion-body');
                }
            }
        });

        if (targetBody) {
            const badge = document.createElement('span');
            badge.className = `badge me-1 mb-1 pattern-badge pattern-pending-add ${scope === 'global' ? 'bg-light text-dark' : 'bg-warning text-dark'}`;
            badge.dataset.category = category;
            badge.dataset.keyword = keyword;
            badge.dataset.scope = scope;
            badge.dataset.pending = 'add';
            badge.innerHTML = `
                <i class="bi bi-plus-circle"></i> ${keyword}
                <button type="button" class="btn-close btn-close-sm ms-1"
                    onclick="PatternManager.undoPendingAdd('${category}', '${keyword}', '${scope}')"
                    title="取り消し"></button>
            `;

            const addBtn = targetBody.querySelector('.btn-outline-primary, .btn-outline-warning');
            if (addBtn && addBtn.parentElement) {
                addBtn.parentElement.insertBefore(badge, addBtn);
            } else {
                targetBody.appendChild(badge);
            }
        }

        this.showToast(`「${keyword}」を追加予定にしました（保存ボタンで確定）`, 'info');
    },

    undoPendingAdd: function(category, keyword, scope) {
        const index = this.pendingChanges.findIndex(c =>
            c.action === 'add' && c.category === category && c.keyword === keyword && c.scope === scope
        );
        if (index >= 0) {
            this.pendingChanges.splice(index, 1);
            this.removePendingBadgeFromUI(category, keyword, scope);
            this.updatePendingChangesUI();
            this.showToast('追加を取り消しました', 'info');
        }
    },

    removePendingBadgeFromUI: function(category, keyword, scope) {
        const badges = document.querySelectorAll('.pattern-badge[data-pending="add"]');
        badges.forEach(badge => {
            if (badge.dataset.category === category &&
                badge.dataset.keyword === keyword &&
                badge.dataset.scope === scope) {
                badge.remove();
            }
        });
    },

    markBadgeAsDeleted: function(category, keyword, scope) {
        const badges = document.querySelectorAll(`.pattern-badge[data-category="${category}"][data-keyword="${keyword}"][data-scope="${scope}"]`);
        const self = this;
        badges.forEach(badge => {
            if (!badge.dataset.pending) {
                badge.classList.add('pattern-pending-delete');
                badge.dataset.pendingDelete = 'true';

                const closeBtn = badge.querySelector('.btn-close');
                if (closeBtn) {
                    closeBtn.onclick = () => self.undoPendingDelete(category, keyword, scope);
                    closeBtn.title = '削除を取り消し';
                }
            }
        });
        this.showToast(`「${keyword}」を削除予定にしました（保存ボタンで確定）`, 'info');
    },

    undoPendingDelete: function(category, keyword, scope) {
        const index = this.pendingChanges.findIndex(c =>
            c.action === 'delete' && c.category === category && c.keyword === keyword && c.scope === scope
        );
        if (index >= 0) {
            this.pendingChanges.splice(index, 1);
            const badges = document.querySelectorAll(`.pattern-badge[data-category="${category}"][data-keyword="${keyword}"][data-scope="${scope}"]`);
            const self = this;
            badges.forEach(badge => {
                badge.classList.remove('pattern-pending-delete');
                delete badge.dataset.pendingDelete;

                const closeBtn = badge.querySelector('.btn-close');
                if (closeBtn) {
                    closeBtn.onclick = () => self.deletePattern(category, keyword, scope);
                    closeBtn.title = '削除';
                }
            });
            this.updatePendingChangesUI();
            this.showToast('削除を取り消しました', 'info');
        }
    },

    markBadgeAsMoved: function(category, keyword, fromScope, toScope) {
        const badges = document.querySelectorAll(`.pattern-badge[data-category="${category}"][data-keyword="${keyword}"][data-scope="${fromScope}"]`);
        badges.forEach(badge => {
            badge.classList.add('pattern-pending-move-out');
        });

        const toLabel = toScope === 'global' ? 'グローバル' : 'この案件';
        this.showToast(`「${keyword}」を${toLabel}に移動予定（保存ボタンで確定）`, 'info');
    },

    // ===== Public API Functions =====

    deletePattern: function(category, keyword, scope) {
        this.stageDeletePattern(category, keyword, scope);
    },

    addPatternPrompt: function(category, scope) {
        const scopeLabel = scope === 'case' ? '案件固有' : 'グローバル';
        const keyword = prompt(
            `「${category}」に追加するキーワードを入力してください：\n\n` +
            `適用範囲: ${scopeLabel}\n\n` +
            `（このキーワードを含む取引が自動的に「${category}」に分類されます）`
        );

        if (!keyword || !keyword.trim()) {
            return;
        }

        this.stageAddPattern(category, keyword.trim(), scope);
    },

    addNewCategoryPattern: function(scope) {
        const scopeLabel = scope === 'case' ? '案件固有' : 'グローバル';
        const category = prompt(
            `新しいカテゴリー名を入力してください：\n\n適用範囲: ${scopeLabel}`
        );

        if (!category || !category.trim()) {
            return;
        }

        const keyword = prompt(
            `「${category}」に追加する最初のキーワードを入力してください：\n\n` +
            `（このキーワードを含む取引が自動的に「${category}」に分類されます）`
        );

        if (!keyword || !keyword.trim()) {
            return;
        }

        this.stageAddPattern(category.trim(), keyword.trim(), scope);
    },

    // ===== Save/Discard Functions =====

    saveAllChanges: function() {
        if (this.pendingChanges.length === 0) {
            this.showToast('保存する変更がありません', 'info');
            return;
        }

        if (!confirm(`${this.pendingChanges.length}件の変更を保存しますか？`)) {
            return;
        }

        const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
        const formData = new FormData();
        formData.append('csrfmiddlewaretoken', csrfToken);
        formData.append('action', 'bulk_pattern_changes');
        formData.append('changes', JSON.stringify(this.pendingChanges));

        const bar = document.getElementById('pendingChangesBar');
        bar.innerHTML = `
            <div class="text-center py-2">
                <span class="spinner-border spinner-border-sm"></span> 保存中...
            </div>
        `;

        const self = this;
        fetch(this.config.saveUrl, {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                self.showToast(`${data.saved_count || self.pendingChanges.length}件の変更を保存しました`, 'success');
                self.pendingChanges = [];
                setTimeout(() => window.location.reload(), 500);
            } else {
                self.showToast(data.error || '保存に失敗しました', 'danger');
                self.updatePendingChangesUI();
            }
        })
        .catch(error => {
            console.error('Error:', error);
            self.showToast('エラーが発生しました', 'danger');
            self.updatePendingChangesUI();
        });
    },

    discardAllChanges: function() {
        if (this.pendingChanges.length === 0) {
            return;
        }

        if (!confirm(`${this.pendingChanges.length}件の未保存の変更を破棄しますか？`)) {
            return;
        }

        this.pendingChanges = [];
        this.showToast('変更を破棄しました', 'info');
        window.location.reload();
    },

    // ===== Drag & Drop Functions =====

    draggedElement: null,
    draggedData: null,

    handleDragStart: function(event) {
        this.draggedElement = event.target;
        this.draggedElement.classList.add('dragging');

        this.draggedData = {
            category: this.draggedElement.dataset.category,
            keyword: this.draggedElement.dataset.keyword,
            scope: this.draggedElement.dataset.scope
        };

        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', JSON.stringify(this.draggedData));
    },

    handleDragOver: function(event) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const dropZone = event.currentTarget;
        dropZone.classList.add('drag-over');
    },

    handleDragLeave: function(event) {
        const dropZone = event.currentTarget;
        dropZone.classList.remove('drag-over');
    },

    handleDrop: function(event, targetScope) {
        event.preventDefault();

        const dropZone = event.currentTarget;
        dropZone.classList.remove('drag-over');

        if (!this.draggedData) return;

        if (this.draggedData.scope === targetScope) {
            this.showToast('同じ場所にはドロップできません', 'info');
            this.cleanupDrag();
            return;
        }

        this.stageMovePattern(this.draggedData.category, this.draggedData.keyword, this.draggedData.scope, targetScope);
        this.cleanupDrag();
    },

    cleanupDrag: function() {
        if (this.draggedElement) {
            this.draggedElement.classList.remove('dragging');
        }
        this.draggedElement = null;
        this.draggedData = null;
    },

    // ===== Utility Functions =====

    showToast: function(message, type) {
        // Use global showToast if available
        if (typeof showToast === 'function') {
            showToast(message, type);
        } else {
            // Fallback
            const alertClass = type === 'success' ? 'alert-success' :
                               type === 'danger' ? 'alert-danger' : 'alert-info';

            const toast = document.createElement('div');
            toast.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`;
            toast.style.zIndex = '9999';
            toast.textContent = message;

            document.body.appendChild(toast);

            setTimeout(() => {
                toast.style.opacity = '0';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }
    }
};
