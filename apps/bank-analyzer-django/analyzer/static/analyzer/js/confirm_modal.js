/**
 * Bank Analyzer - Confirm Modal
 * Bootstrap 5 modal-based replacement for native confirm() and prompt() dialogs.
 * Requires: Bootstrap 5 JS bundle
 */

const ConfirmModal = {
    _modal: null,
    _resolve: null,

    /**
     * Initialize the modal element (auto-creates if missing).
     */
    _ensureModal: function() {
        if (this._modal) return;

        let el = document.getElementById('confirmModal');
        if (!el) {
            el = document.createElement('div');
            el.id = 'confirmModal';
            el.className = 'modal fade';
            el.tabIndex = -1;
            el.innerHTML = `
                <div class="modal-dialog modal-dialog-centered">
                    <div class="modal-content glass-card">
                        <div class="modal-header border-bottom-0">
                            <h5 class="modal-title" id="confirmModalTitle"></h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body" id="confirmModalBody"></div>
                        <div class="modal-footer border-top-0" id="confirmModalFooter">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal" id="confirmModalCancel">キャンセル</button>
                            <button type="button" class="btn" id="confirmModalOk">OK</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(el);
        }

        this._modal = new bootstrap.Modal(el, { backdrop: 'static' });

        // Cancel on dismiss
        el.addEventListener('hidden.bs.modal', () => {
            if (this._resolve) {
                this._resolve(null);
                this._resolve = null;
            }
        });
    },

    /**
     * Show a confirmation dialog (replaces confirm()).
     * @param {Object} opts
     * @param {string} opts.title - Modal title
     * @param {string} opts.message - Message (supports HTML)
     * @param {string} [opts.confirmText='OK'] - Confirm button text
     * @param {string} [opts.confirmClass='btn-primary'] - Confirm button class
     * @param {string} [opts.cancelText='キャンセル'] - Cancel button text
     * @param {Function} [opts.onConfirm] - Called when confirmed (callback style)
     * @returns {Promise<boolean>} - true if confirmed, false if cancelled
     */
    show: function(opts) {
        this._ensureModal();

        const el = document.getElementById('confirmModal');
        const title = el.querySelector('#confirmModalTitle');
        const body = el.querySelector('#confirmModalBody');
        const okBtn = el.querySelector('#confirmModalOk');
        const cancelBtn = el.querySelector('#confirmModalCancel');

        title.textContent = opts.title || '確認';
        body.innerHTML = `<p class="mb-0">${this._escapeHtml(opts.message || '')}</p>`;
        okBtn.textContent = opts.confirmText || 'OK';
        okBtn.className = `btn ${opts.confirmClass || 'btn-primary'}`;
        cancelBtn.textContent = opts.cancelText || 'キャンセル';

        // Add danger icon for destructive actions
        if (opts.confirmClass && opts.confirmClass.includes('btn-danger')) {
            title.innerHTML = `<i class="bi bi-exclamation-triangle-fill text-danger me-2"></i>${this._escapeHtml(opts.title || '確認')}`;
        }

        return new Promise((resolve) => {
            this._resolve = resolve;

            const handler = () => {
                okBtn.removeEventListener('click', handler);
                this._resolve = null;
                this._modal.hide();
                if (opts.onConfirm) opts.onConfirm();
                resolve(true);
            };
            okBtn.addEventListener('click', handler);

            this._modal.show();
        });
    },

    /**
     * Show a prompt dialog (replaces prompt()).
     * @param {Object} opts
     * @param {string} opts.title - Modal title
     * @param {string} opts.message - Message (supports HTML)
     * @param {string} [opts.defaultValue=''] - Default input value
     * @param {string} [opts.placeholder=''] - Input placeholder
     * @param {string} [opts.confirmText='OK'] - Confirm button text
     * @param {Function} [opts.onConfirm] - Called with input value when confirmed
     * @returns {Promise<string|null>} - Input value or null if cancelled
     */
    prompt: function(opts) {
        this._ensureModal();

        const el = document.getElementById('confirmModal');
        const title = el.querySelector('#confirmModalTitle');
        const body = el.querySelector('#confirmModalBody');
        const okBtn = el.querySelector('#confirmModalOk');
        const cancelBtn = el.querySelector('#confirmModalCancel');

        title.textContent = opts.title || '入力';
        body.innerHTML = `
            <p>${this._escapeHtml(opts.message || '')}</p>
            <input type="text" class="form-control" id="confirmModalInput"
                value="${this._escapeAttr(opts.defaultValue || '')}"
                placeholder="${this._escapeAttr(opts.placeholder || '')}">
        `;
        okBtn.textContent = opts.confirmText || 'OK';
        okBtn.className = 'btn btn-primary';
        cancelBtn.textContent = opts.cancelText || 'キャンセル';

        return new Promise((resolve) => {
            this._resolve = resolve;

            const input = body.querySelector('#confirmModalInput');

            const handler = () => {
                okBtn.removeEventListener('click', handler);
                input.removeEventListener('keypress', keypressHandler);
                const value = input.value.trim();
                this._resolve = null;
                this._modal.hide();
                if (value && opts.onConfirm) opts.onConfirm(value);
                resolve(value || null);
            };

            const keypressHandler = (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    handler();
                }
            };

            okBtn.addEventListener('click', handler);
            input.addEventListener('keypress', keypressHandler);

            this._modal.show();

            // Focus input after modal is shown
            el.addEventListener('shown.bs.modal', function focusInput() {
                input.focus();
                input.select();
                el.removeEventListener('shown.bs.modal', focusInput);
            });
        });
    },

    _escapeHtml: function(str) {
        const div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    },

    _escapeAttr: function(str) {
        return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }
};
