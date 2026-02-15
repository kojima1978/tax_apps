/**
 * Bank Analyzer - Classify Preview
 * Handles the classification preview page functionality
 */

const ClassifyPreview = {
    // DOM element references
    elements: {
        checkboxes: null,
        selectAll: null,
        tableSelectAll: null,
        selectHighConfidence: null,
        categoryFilter: null,
        selectedCountEl: null,
        applyCountEl: null,
        applyBtn: null,
        selectedIdsInput: null,
        rows: null
    },

    // Initialize the preview functionality
    init: function() {
        this.elements.checkboxes = document.querySelectorAll('.row-checkbox');
        this.elements.selectAll = document.getElementById('selectAll');
        this.elements.tableSelectAll = document.getElementById('tableSelectAll');
        this.elements.selectHighConfidence = document.getElementById('selectHighConfidence');
        this.elements.categoryFilter = document.getElementById('categoryFilter');
        this.elements.selectedCountEl = document.getElementById('selectedCount');
        this.elements.applyCountEl = document.getElementById('applyCount');
        this.elements.applyBtn = document.getElementById('applyBtn');
        this.elements.selectedIdsInput = document.getElementById('selectedIds');
        this.elements.rows = document.querySelectorAll('#previewTable tbody tr');

        // Skip if elements not found
        if (!this.elements.checkboxes.length) return;

        this.bindEvents();
    },

    // Bind event listeners
    bindEvents: function() {
        const self = this;

        // Individual checkboxes
        this.elements.checkboxes.forEach(cb => {
            cb.addEventListener('change', () => self.updateSelectedCount());
        });

        // Select all (header)
        if (this.elements.selectAll) {
            this.elements.selectAll.addEventListener('change', function() {
                self.selectVisibleRows(this.checked);
                if (self.elements.tableSelectAll) {
                    self.elements.tableSelectAll.checked = this.checked;
                }
                self.updateSelectedCount();
            });
        }

        // Select all (table)
        if (this.elements.tableSelectAll) {
            this.elements.tableSelectAll.addEventListener('change', function() {
                self.selectVisibleRows(this.checked);
                if (self.elements.selectAll) {
                    self.elements.selectAll.checked = this.checked;
                }
                self.updateSelectedCount();
            });
        }

        // High confidence only
        if (this.elements.selectHighConfidence) {
            this.elements.selectHighConfidence.addEventListener('change', function() {
                self.selectHighConfidenceRows(this.checked);
                self.updateSelectedCount();
            });
        }

        // Category filter
        if (this.elements.categoryFilter) {
            this.elements.categoryFilter.addEventListener('change', function() {
                self.filterRows();
                self.clearSelection();
                self.updateSelectedCount();
            });
        }

        // Form submit
        const applyForm = document.getElementById('applyForm');
        if (applyForm) {
            applyForm.addEventListener('submit', function(e) {
                self.handleFormSubmit(e);
            });
        }
    },

    // Update selected count display
    updateSelectedCount: function() {
        const checked = document.querySelectorAll('.row-checkbox:checked');
        const count = checked.length;

        if (this.elements.selectedCountEl) {
            this.elements.selectedCountEl.textContent = count;
        }
        if (this.elements.applyCountEl) {
            this.elements.applyCountEl.textContent = count;
        }
        if (this.elements.applyBtn) {
            this.elements.applyBtn.disabled = count === 0;
        }

        // Update selected IDs
        if (this.elements.selectedIdsInput) {
            const ids = Array.from(checked).map(cb => cb.value);
            this.elements.selectedIdsInput.value = ids.join(',');
        }

        // Highlight rows
        this.elements.rows.forEach(row => {
            const cb = row.querySelector('.row-checkbox');
            row.classList.toggle('selected-row', cb && cb.checked);
        });
    },

    // Filter rows by category
    filterRows: function() {
        const categoryValue = this.elements.categoryFilter.value;

        this.elements.rows.forEach(row => {
            const rowCategory = row.dataset.category;
            const show = !categoryValue || rowCategory === categoryValue;
            row.style.display = show ? '' : 'none';
        });
    },

    // Select all visible rows
    selectVisibleRows: function(checked) {
        const visibleRows = Array.from(this.elements.rows).filter(r => r.style.display !== 'none');
        visibleRows.forEach(row => {
            const cb = row.querySelector('.row-checkbox');
            if (cb) cb.checked = checked;
        });
    },

    // Select high confidence rows (score >= 90)
    selectHighConfidenceRows: function(checked) {
        const visibleRows = Array.from(this.elements.rows).filter(r => r.style.display !== 'none');
        visibleRows.forEach(row => {
            const cb = row.querySelector('.row-checkbox');
            const score = parseInt(row.dataset.score);
            if (cb) {
                if (checked) {
                    cb.checked = score >= 90;
                } else {
                    cb.checked = false;
                }
            }
        });
    },

    // Clear all selections
    clearSelection: function() {
        this.elements.checkboxes.forEach(cb => cb.checked = false);
        if (this.elements.selectAll) this.elements.selectAll.checked = false;
        if (this.elements.tableSelectAll) this.elements.tableSelectAll.checked = false;
        if (this.elements.selectHighConfidence) this.elements.selectHighConfidence.checked = false;
    },

    // Handle form submission
    handleFormSubmit: function(e) {
        const count = document.querySelectorAll('.row-checkbox:checked').length;
        if (count === 0) {
            e.preventDefault();
            alert('適用する取引を選択してください。');
            return;
        }
        if (!confirm(`${count}件の取引に分類を適用しますか？`)) {
            e.preventDefault();
        }
    }
};

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', function() {
    ClassifyPreview.init();
});
