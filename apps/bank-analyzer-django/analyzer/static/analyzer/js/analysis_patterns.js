// ===== Analysis Patterns Module =====
// Pattern add modal, PatternPrompt
// Requires: utils.js, analysis_core.js

// ===== パターン追加機能（専用モーダル版） =====

let patternAddData = {
    category: '',
    description: ''
};

// 編集モーダルからパターン登録モーダルを開く
function openPatternAddFromModal(idPrefix) {
    const categorySelect = document.getElementById(idPrefix + 'TxCategory');
    const descriptionInput = document.getElementById(idPrefix + 'TxDescription');

    if (!categorySelect || !descriptionInput) {
        showToast('フォーム要素が見つかりません', 'danger');
        return;
    }

    const category = categorySelect.value;
    const description = descriptionInput.value;

    if (!category || category === '未分類') {
        showToast('先に分類を選択してください', 'warning');
        return;
    }

    if (!description) {
        showToast('摘要が入力されていません', 'warning');
        return;
    }

    patternAddData = { category, description };
    openPatternAddModal(category, description);
}

// パターン登録モーダルを開く
function openPatternAddModal(category, description) {
    document.getElementById('patternAddDescription').textContent = description;
    document.getElementById('patternAddCategoryBadge').textContent = category;
    document.getElementById('patternAddKeyword').value = '';
    document.getElementById('scopeGlobal').checked = true;

    const resultDiv = document.getElementById('patternAddResult');
    resultDiv.classList.add('d-none');

    const submitBtn = document.getElementById('patternAddSubmitBtn');
    submitBtn.disabled = false;
    submitBtn.innerHTML = '<i class="bi bi-plus-lg"></i> 追加';

    generateKeywordCandidates(description);
    fetchExistingKeywords(category);

    const modal = new bootstrap.Modal(document.getElementById('patternAddModal'));
    modal.show();
}

// 摘要から複数のキーワード候補を抽出
function generateKeywordCandidates(description) {
    const candidatesDiv = document.getElementById('keywordCandidates');
    candidatesDiv.innerHTML = '';

    if (!description) return;

    const candidates = extractMultipleKeywords(description);

    candidates.forEach((kw, index) => {
        const badge = document.createElement('span');
        badge.className = 'badge bg-outline-primary border border-primary text-primary p-2 keyword-candidate';
        badge.style.cursor = 'pointer';
        badge.textContent = kw;
        badge.onclick = () => selectKeywordCandidate(kw);

        if (index === 0) {
            badge.className = 'badge bg-primary text-white p-2 keyword-candidate';
            badge.innerHTML = '<i class="bi bi-star-fill"></i> ' + kw;
        }

        candidatesDiv.appendChild(badge);
    });
}

// キーワード候補を選択
function selectKeywordCandidate(keyword) {
    document.getElementById('patternAddKeyword').value = keyword;

    document.querySelectorAll('.keyword-candidate').forEach(badge => {
        badge.classList.remove('bg-success');
        badge.classList.add('bg-primary', 'bg-outline-primary');
    });
}

// 既存キーワードを取得
function fetchExistingKeywords(category) {
    const container = document.getElementById('existingKeywords');
    const countBadge = document.getElementById('existingKeywordsCount');

    container.innerHTML = '<span class="text-muted small">読み込み中...</span>';

    postAction('get_category_keywords', { category }, {
        onSuccess: (data) => {
            const globalKws = data.global_keywords || [];
            const caseKws = data.case_keywords || [];
            const total = globalKws.length + caseKws.length;

            countBadge.textContent = total;

            if (total === 0) {
                container.innerHTML = '<span class="text-muted small">まだキーワードがありません</span>';
                return;
            }

            let html = '';
            if (globalKws.length > 0) {
                html += '<div class="mb-1"><small class="text-muted">グローバル:</small> ';
                html += globalKws.map(k => `<span class="badge bg-light text-dark me-1">${k}</span>`).join('');
                html += '</div>';
            }
            if (caseKws.length > 0) {
                html += '<div><small class="text-muted">案件固有:</small> ';
                html += caseKws.map(k => `<span class="badge bg-warning text-dark me-1">${k}</span>`).join('');
                html += '</div>';
            }
            container.innerHTML = html;
        },
        onError: () => {
            container.innerHTML = '<span class="text-danger small">取得に失敗しました</span>';
        },
    });
}

// パターン登録を実行
function submitPatternAdd() {
    const keyword = document.getElementById('patternAddKeyword').value.trim();
    const scope = document.querySelector('input[name="patternScope"]:checked').value;
    const category = patternAddData.category;

    if (!keyword) {
        showPatternAddResult('warning', 'キーワードを入力してください');
        return;
    }

    const submitBtn = document.getElementById('patternAddSubmitBtn');
    setButtonLoading(submitBtn, '追加中...');

    postAction('add_pattern', { category, keyword, scope }, {
        onSuccess: () => {
            const scopeLabel = scope === 'global' ? 'グローバル' : 'この案件';
            submitBtn.innerHTML = '<i class="bi bi-check-lg"></i> 追加完了';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-success');

            const patternModal = bootstrap.Modal.getInstance(document.getElementById('patternAddModal'));
            if (patternModal) {
                setTimeout(() => {
                    patternModal.hide();
                    showToast(`「${keyword}」を「${category}」に追加しました（${scopeLabel}）`, 'success');
                    resetButton(submitBtn);
                    submitBtn.classList.remove('btn-success');
                    submitBtn.classList.add('btn-primary');
                }, 500);
            }
        },
        onError: (data) => {
            showPatternAddResult('danger', (data && data.error) || '追加に失敗しました');
            resetButton(submitBtn);
        },
    });
}

// パターン登録結果を表示
function showPatternAddResult(type, message) {
    const resultDiv = document.getElementById('patternAddResult');
    const alertDiv = resultDiv.querySelector('.alert');

    resultDiv.classList.remove('d-none');
    alertDiv.className = `alert alert-${type}`;
    alertDiv.textContent = message;

    if (type === 'success') {
        setTimeout(() => {
            resultDiv.classList.add('d-none');
        }, 3000);
    }
}

// ===== パターンプロンプト =====

const PatternPrompt = {
    _el: null,
    _timeout: null,

    show: function(category, description) {
        this.hide();

        var keyword = extractKeywordFromDescription(description);
        if (!keyword) return;

        var self = this;
        var div = document.createElement('div');
        div.className = 'pattern-prompt glass-card p-2 mb-2';
        div.innerHTML =
            '<div class="d-flex align-items-center gap-2 flex-wrap">' +
            '<small class="text-muted"><i class="bi bi-bookmark-plus"></i></small>' +
            '<span class="small">「<strong>' + keyword + '</strong>」→「<strong>' + category + '</strong>」を常に適用しますか？</span>' +
            '<button type="button" class="btn btn-success btn-sm pattern-prompt-global"><i class="bi bi-globe"></i> 全案件</button>' +
            '<button type="button" class="btn btn-outline-success btn-sm pattern-prompt-case"><i class="bi bi-folder"></i> この案件</button>' +
            '<button type="button" class="btn btn-outline-secondary btn-sm pattern-prompt-dismiss"><i class="bi bi-x"></i></button>' +
            '</div>';

        var table = document.getElementById('groupedTable');
        if (table && table.parentElement) {
            table.parentElement.insertBefore(div, table);
        }
        this._el = div;

        div.querySelector('.pattern-prompt-global').addEventListener('click', function() {
            self._register(category, keyword, 'global', description);
        });
        div.querySelector('.pattern-prompt-case').addEventListener('click', function() {
            self._register(category, keyword, 'case', description);
        });
        div.querySelector('.pattern-prompt-dismiss').addEventListener('click', function() {
            self.hide();
        });

        this._timeout = setTimeout(function() { self.hide(); }, 10000);
    },

    _register: function(category, keyword, scope, description) {
        var self = this;
        postAction('classify_and_register_pattern', {
            category: category,
            keyword: keyword,
            scope: scope,
            description: description,
        }, {
            onSuccess: function(data) {
                var scopeMsg = scope === 'case' ? '（案件固有）' : '（グローバル）';
                var extra = data.count ? '（追加で' + data.count + '件分類）' : '';
                showToast('パターン「' + keyword + '」→「' + category + '」を登録しました' + scopeMsg + extra, 'success');
                if (data.count > 0) {
                    ProgressBar.update(data.count);
                    GroupedView._updateTxTotal(data.count);
                    self._removeMatchingRows(keyword);
                }
                self.hide();
            },
        });
    },

    _removeMatchingRows: function(keyword) {
        document.querySelectorAll('#groupedTable tbody tr[data-group-desc]').forEach(function(row) {
            var desc = row.dataset.groupDesc || '';
            if (desc.toLowerCase().indexOf(keyword.toLowerCase()) !== -1) {
                row.style.transition = 'opacity 0.3s';
                row.style.opacity = '0';
                setTimeout(function() { row.remove(); }, 300);
            }
        });
    },

    hide: function() {
        clearTimeout(this._timeout);
        if (this._el) {
            this._el.remove();
            this._el = null;
        }
    }
};

// パターン登録モーダルの初期化
document.addEventListener('DOMContentLoaded', function() {
    const patternAddSubmitBtn = document.getElementById('patternAddSubmitBtn');
    if (patternAddSubmitBtn) {
        patternAddSubmitBtn.addEventListener('click', submitPatternAdd);
    }

    const patternAddKeyword = document.getElementById('patternAddKeyword');
    if (patternAddKeyword) {
        patternAddKeyword.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                submitPatternAdd();
            }
        });
    }

    // 未分類タブの初期化
    UnclassifiedTab.init();

    // AI分類タブの初期化
    AISuggestions.init();
});
