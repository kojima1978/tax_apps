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
