/**
 * Bank Analyzer - Shared Utilities
 * Common functions used across multiple modules
 */

// ===== Form Data Utilities =====

/**
 * Create FormData with CSRF token
 * @param {Object} data - Key-value pairs to add to FormData
 * @returns {FormData}
 */
function createFormData(data) {
    const formData = new FormData();
    const csrfToken = document.querySelector('[name=csrfmiddlewaretoken]').value;
    formData.append('csrfmiddlewaretoken', csrfToken);
    for (const [key, value] of Object.entries(data)) {
        formData.append(key, value);
    }
    return formData;
}

/**
 * Get API URL by replacing /analysis/ with /api/{endpoint}/
 * @param {string} endpoint - API endpoint name
 * @returns {string}
 */
function getApiUrl(endpoint) {
    return window.location.pathname.replace('/analysis/', `/api/${endpoint}/`);
}

// ===== Toast Notifications =====

/**
 * Show a toast notification (Bootstrap-based)
 * @param {string} message - Message to display
 * @param {string} type - 'success', 'danger', 'info', or 'warning'
 */
function showToast(message, type = 'success') {
    const toastContainer = document.getElementById('toastContainer');

    // Use Bootstrap toast container if available
    if (toastContainer) {
        const toastId = 'toast-' + Date.now();
        const bgClass = type === 'success' ? 'bg-success' :
                        type === 'danger' ? 'bg-danger' :
                        type === 'warning' ? 'bg-warning' : 'bg-info';
        const textClass = type === 'warning' ? 'text-dark' : 'text-white';
        const icon = type === 'success' ? 'bi-check-circle' :
                     type === 'danger' ? 'bi-exclamation-circle' :
                     type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle';

        const toastHtml = `
            <div id="${toastId}" class="toast align-items-center ${textClass} ${bgClass} border-0" role="alert">
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

        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });
    } else {
        // Fallback: simple alert-style notification
        const alertClass = type === 'success' ? 'alert-success' :
                          type === 'danger' ? 'alert-danger' :
                          type === 'warning' ? 'alert-warning' : 'alert-info';

        const toast = document.createElement('div');
        toast.className = `alert ${alertClass} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.style.transition = 'opacity 0.3s';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}

// ===== Text Utilities =====

/**
 * Extract keyword from transaction description
 * @param {string} description - Transaction description
 * @returns {string} Extracted keyword
 */
function extractKeywordFromDescription(description) {
    if (!description) return '';
    const parts = description.split(/[\s　]+/);
    if (parts.length > 0) {
        if (parts[0].length <= 2 && parts.length > 1) {
            return parts[0] + ' ' + parts[1];
        }
        return parts[0];
    }
    return description.substring(0, 10);
}

/**
 * Extract multiple keyword candidates from description
 * @param {string} description - Transaction description
 * @returns {string[]} Array of keyword candidates
 */
function extractMultipleKeywords(description) {
    if (!description) return [];

    const candidates = new Set();
    const parts = description.split(/[\s　・／/\-－―]+/).filter(p => p.length > 0);

    parts.forEach(part => {
        if (part.length >= 2) {
            candidates.add(part);
        }
    });

    if (parts.length >= 2) {
        candidates.add(parts[0] + parts[1]);
    }

    if (description.length <= 15 && description.length >= 2) {
        candidates.add(description);
    }

    const katakana = description.match(/[ァ-ヶー]+/g);
    if (katakana) {
        katakana.forEach(k => {
            if (k.length >= 2) candidates.add(k);
        });
    }

    const alphanumeric = description.match(/[A-Za-z0-9]+/g);
    if (alphanumeric) {
        alphanumeric.forEach(a => {
            if (a.length >= 2) candidates.add(a);
        });
    }

    return Array.from(candidates)
        .filter(c => c.length >= 2 && c.length <= 20)
        .sort((a, b) => Math.abs(a.length - 5) - Math.abs(b.length - 5))
        .slice(0, 6);
}

// ===== AJAX Utilities =====

/**
 * POST JSON request with standard error handling
 * @param {string} url - Request URL
 * @param {FormData} formData - Form data to send
 * @param {Object} callbacks - { onSuccess, onError, onFinally }
 */
function postJson(url, formData, { onSuccess, onError, onFinally } = {}) {
    fetch(url, {
        method: 'POST',
        body: formData,
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            if (onSuccess) onSuccess(data);
        } else {
            showToast(data.error || data.message || 'エラーが発生しました', 'danger');
            if (onError) onError(data);
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('通信エラーが発生しました', 'danger');
        if (onError) onError(error);
    })
    .finally(() => {
        if (onFinally) onFinally();
    });
}

// ===== Save Queue (sequential request processing with retry) =====

/**
 * Sequential request queue to ensure all saves complete reliably.
 * Prevents data loss from rapid concurrent requests.
 */
var SaveQueue = {
    _queue: [],
    _processing: false,
    _maxRetries: 3,
    _failedItems: [],

    /**
     * Add a save task to the queue
     * @param {Object} task - { url, formData, select, originalValue, onSuccess, onError }
     */
    enqueue: function(task) {
        task._retryCount = 0;
        this._queue.push(task);
        this._updateStatus();
        this._processNext();
    },

    /**
     * Get total pending count (queue + currently processing)
     */
    pendingCount: function() {
        return this._queue.length + (this._processing ? 1 : 0);
    },

    _updateStatus: function() {
        var total = this._queue.length + (this._processing ? 1 : 0);
        if (total > 0) {
            StatusIndicator.show('saving', '保存中... (残り' + total + '件)');
        }
    },

    _processNext: function() {
        if (this._processing || this._queue.length === 0) {
            if (!this._processing && this._queue.length === 0) {
                if (this._failedItems.length > 0) {
                    StatusIndicator.show('error', this._failedItems.length + '件の保存に失敗しました');
                } else {
                    StatusIndicator.show('success');
                }
            }
            return;
        }

        this._processing = true;
        var self = this;
        var task = this._queue.shift();

        this._updateStatus();

        fetch(task.url, {
            method: 'POST',
            body: task.formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
        .then(function(response) { return response.json(); })
        .then(function(data) {
            if (data.success) {
                if (task.select) {
                    task.select.dataset.lastSaved = task.select.value;
                }
                if (task.onSuccess) task.onSuccess(data);
            } else {
                throw new Error(data.error || data.message || 'サーバーエラー');
            }
        })
        .catch(function(error) {
            console.error('Save error:', error);
            task._retryCount++;
            if (task._retryCount < self._maxRetries) {
                // Retry: re-add to front of queue
                self._queue.unshift(task);
            } else {
                // Max retries exceeded: rollback
                if (task.select && task.originalValue !== undefined) {
                    task.select.value = task.originalValue;
                }
                self._failedItems.push(task);
                if (task.onError) task.onError(error);
                showToast('保存に失敗しました（3回リトライ済み）', 'danger');
            }
        })
        .finally(function() {
            if (task.select) task.select.disabled = false;
            self._processing = false;
            self._processNext();
        });
    },

    /**
     * Retry all failed items
     */
    retryFailed: function() {
        if (this._failedItems.length === 0) return;
        var items = this._failedItems.slice();
        this._failedItems = [];
        var self = this;
        items.forEach(function(task) {
            task._retryCount = 0;
            // Re-set the select to the intended value
            if (task.select && task.intendedValue !== undefined) {
                task.select.value = task.intendedValue;
                task.select.disabled = true;
            }
            self.enqueue(task);
        });
    },

    /**
     * Check if there are unsaved changes
     */
    hasPending: function() {
        return this._queue.length > 0 || this._processing || this._failedItems.length > 0;
    }
};

// ページ離脱時の未保存警告
window.addEventListener('beforeunload', function(e) {
    if (SaveQueue.hasPending()) {
        e.preventDefault();
        e.returnValue = '';
    }
});

// ===== Pattern Registration Utility =====

/**
 * パターン追加の共通処理（ConfirmModal.prompt → classify_and_register_pattern or add_pattern）
 * @param {Object} opts
 * @param {string} opts.category - 分類カテゴリ
 * @param {string} opts.description - 摘要テキスト
 * @param {string} opts.scope - 'global' or 'case'
 * @param {string} [opts.action] - サーバーアクション（デフォルト: 'classify_and_register_pattern'）
 * @param {string} [opts.confirmText] - 確認ボタンテキスト（デフォルト: '適用＆追加'）
 * @param {string} [opts.extraMessage] - メッセージに追加するテキスト
 * @param {Function} [opts.onSuccess] - 成功時コールバック (data) => {}
 */
function promptAndRegisterPattern(opts) {
    var category = opts.category;
    var description = opts.description;
    var scope = opts.scope;
    var action = opts.action || 'classify_and_register_pattern';
    var confirmText = opts.confirmText || '適用＆追加';
    var scopeLabel = scope === 'case' ? 'この案件' : '全案件（グローバル）';
    var defaultKeyword = extractKeywordFromDescription(description);
    var message = '「' + category + '」のパターンに追加するキーワード：\n摘要: ' + description + '\n適用範囲: ' + scopeLabel;
    if (opts.extraMessage) message += '\n' + opts.extraMessage;

    ConfirmModal.prompt({
        title: 'パターン追加',
        message: message,
        defaultValue: defaultKeyword,
        placeholder: 'キーワードを入力',
        confirmText: confirmText,
        onConfirm: function(keyword) {
            var formData = createFormData({
                action: action,
                category: category,
                keyword: keyword,
                scope: scope,
                description: description,
            });
            postJson(window.location.href, formData, {
                onSuccess: function(data) {
                    var scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                    var count = data.count || 1;
                    if (action === 'add_pattern') {
                        showToast('キーワード「' + keyword + '」を「' + category + '」に追加しました' + scopeMsg, 'success');
                    } else {
                        showToast(count + '件を「' + category + '」に分類し、キーワード「' + keyword + '」を追加しました' + scopeMsg, 'success');
                    }
                    if (opts.onSuccess) opts.onSuccess(data);
                },
            });
        },
    });
}

// ===== Select-All Checkbox Utility =====

/**
 * Initialize a select-all checkbox for a group of checkboxes
 * @param {string} selectAllId - ID of the select-all checkbox
 * @param {string} checkboxSelector - CSS selector for the individual checkboxes
 * @param {Function} [onUpdate] - Optional callback after state change
 */
function initSelectAll(selectAllId, checkboxSelector, onUpdate) {
    var selectAll = document.getElementById(selectAllId);
    if (!selectAll) return;

    function getCheckboxes() {
        return document.querySelectorAll(checkboxSelector);
    }

    function updateState() {
        var boxes = getCheckboxes();
        var checked = document.querySelectorAll(checkboxSelector + ':checked').length;
        selectAll.checked = checked === boxes.length && boxes.length > 0;
        selectAll.indeterminate = checked > 0 && checked < boxes.length;
        if (onUpdate) onUpdate(checked, boxes.length);
    }

    selectAll.addEventListener('change', function() {
        getCheckboxes().forEach(function(cb) { cb.checked = selectAll.checked; });
        updateState();
    });

    // Delegate individual checkbox changes
    document.addEventListener('change', function(e) {
        if (e.target.matches(checkboxSelector)) updateState();
    });

    return { updateState: updateState };
}

// ===== Button State Utilities =====

/**
 * Disable a button with reduced opacity
 * @param {HTMLElement} btn - Button element
 */
function disableButton(btn) {
    btn.disabled = true;
    btn.style.opacity = '0.5';
}

/**
 * Enable a button with full opacity
 * @param {HTMLElement} btn - Button element
 */
function enableButton(btn) {
    btn.disabled = false;
    btn.style.opacity = '1';
}

/**
 * Set a button to loading state with spinner
 * @param {HTMLElement} btn - Button element
 * @param {string} text - Loading text to display
 */
function setButtonLoading(btn, text) {
    btn.disabled = true;
    btn._originalHtml = btn.innerHTML;
    btn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> ${text}`;
}

/**
 * Reset a button from loading state
 * @param {HTMLElement} btn - Button element
 */
function resetButton(btn) {
    btn.disabled = false;
    if (btn._originalHtml) {
        btn.innerHTML = btn._originalHtml;
    }
}

// ===== Row Animation Utilities =====

/**
 * Fade out and remove a table row
 * @param {HTMLElement} row - Table row element
 * @param {Function} callback - Optional callback after removal
 */
function fadeOutRow(row, callback) {
    if (!row) return;

    row.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    row.style.opacity = '0';
    row.style.transform = 'translateX(-20px)';

    setTimeout(() => {
        row.remove();
        if (callback) callback();
    }, 300);
}

/**
 * Highlight row as success then fade out
 * @param {HTMLElement} row - Table row element
 * @param {Function} callback - Optional callback after removal
 */
function highlightAndRemoveRow(row, callback) {
    if (!row) return;

    row.classList.add('table-success');
    setTimeout(() => {
        fadeOutRow(row, callback);
    }, 500);
}
