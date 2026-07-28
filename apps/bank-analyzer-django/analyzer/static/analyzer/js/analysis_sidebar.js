// ===== Analysis Sidebar Module =====
// Responsive sidebar, mobile drawer, persisted collapse state, and keyboard navigation.

(function () {
    'use strict';

    const MOBILE_BREAKPOINT = 768;
    const STORAGE_KEY = 'bankAnalyzer.analysisSidebarCollapsed';
    const shell = document.getElementById('analysisShell');
    const sidebar = document.getElementById('analysisSidebar');
    const collapseButton = document.getElementById('analysisSidebarToggle');
    const openButton = document.getElementById('analysisMobileMenuOpen');
    const closeButton = document.getElementById('analysisMobileMenuClose');
    const backdrop = document.getElementById('analysisSidebarBackdrop');
    const currentLabel = document.getElementById('analysisMobileCurrentLabel');
    const nav = document.getElementById('analysisTabs');

    if (!shell || !sidebar || !nav) return;

    function readStoredCollapsed() {
        try {
            const value = localStorage.getItem(STORAGE_KEY);
            return value === null ? null : value === 'true';
        } catch (error) {
            return null;
        }
    }

    function storeCollapsed(collapsed) {
        try {
            localStorage.setItem(STORAGE_KEY, String(collapsed));
        } catch (error) {
            // The layout remains usable when storage is unavailable.
        }
    }

    function resizeChartAfterLayout() {
        const chart = document.getElementById('monthlyBarChart');
        if (!chart || typeof Plotly === 'undefined') return;
        window.setTimeout(function () {
            Plotly.Plots.resize(chart);
        }, 220);
    }

    function setCollapsed(collapsed, persist) {
        const shouldCollapse = window.innerWidth >= MOBILE_BREAKPOINT && collapsed;
        shell.classList.toggle('is-sidebar-collapsed', shouldCollapse);
        sidebar.classList.toggle('is-collapsed', shouldCollapse);

        if (collapseButton) {
            collapseButton.setAttribute('aria-expanded', String(!shouldCollapse));
            collapseButton.setAttribute(
                'aria-label',
                shouldCollapse ? 'サイドバーを展開' : 'サイドバーを折りたたむ'
            );
            collapseButton.title = shouldCollapse ? 'サイドバーを展開' : 'サイドバーを折りたたむ';
        }

        if (persist) storeCollapsed(shouldCollapse);
        resizeChartAfterLayout();
    }

    function openMobileMenu() {
        if (window.innerWidth >= MOBILE_BREAKPOINT) return;
        sidebar.classList.add('is-open');
        backdrop.hidden = false;
        document.body.classList.add('analysis-sidebar-open');
        openButton?.setAttribute('aria-expanded', 'true');
        closeButton?.focus();
    }

    function closeMobileMenu(options) {
        const shouldRestoreFocus = options?.restoreFocus !== false;
        sidebar.classList.remove('is-open');
        backdrop.hidden = true;
        document.body.classList.remove('analysis-sidebar-open');
        openButton?.setAttribute('aria-expanded', 'false');
        if (shouldRestoreFocus && window.innerWidth < MOBILE_BREAKPOINT) openButton?.focus();
    }

    function updateCurrentLabel(tab) {
        const label = tab?.dataset.sectionLabel || tab?.textContent.trim() || '概要';
        if (currentLabel) currentLabel.textContent = label;
    }

    const storedCollapsed = readStoredCollapsed();
    const initialCollapsed = storedCollapsed === null
        ? window.innerWidth < 1280
        : storedCollapsed;
    setCollapsed(initialCollapsed, false);
    updateCurrentLabel(nav.querySelector('.analysis-nav-link.active'));

    collapseButton?.addEventListener('click', function () {
        setCollapsed(!shell.classList.contains('is-sidebar-collapsed'), true);
    });
    openButton?.addEventListener('click', openMobileMenu);
    closeButton?.addEventListener('click', function () {
        closeMobileMenu();
    });
    backdrop?.addEventListener('click', function () {
        closeMobileMenu();
    });

    nav.querySelectorAll('.analysis-nav-link').forEach(function (tab) {
        tab.addEventListener('click', function(event) {
            var tabName = tab.id.replace('-tab', '');
            var currentTab = new URL(window.location.href).searchParams.get('tab') || 'overview';
            if (currentTab === tabName) {
                event.preventDefault();
                return;
            }

            event.preventDefault();
            event.stopImmediatePropagation();
            var url = new URL(window.location.pathname, window.location.origin);
            url.searchParams.set('tab', tabName);
            window.location.assign(url.toString());
        });

        tab.addEventListener('shown.bs.tab', function () {
            updateCurrentLabel(tab);
            if (window.innerWidth < MOBILE_BREAKPOINT) {
                closeMobileMenu({ restoreFocus: false });
            }
            if (tab.id === 'overview-tab') resizeChartAfterLayout();
        });
    });

    nav.addEventListener('keydown', function (event) {
        if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;
        const tabs = Array.from(nav.querySelectorAll('.analysis-nav-link'));
        const currentIndex = tabs.indexOf(document.activeElement);
        if (currentIndex < 0) return;

        event.preventDefault();
        let nextIndex = currentIndex;
        if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % tabs.length;
        if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + tabs.length) % tabs.length;
        if (event.key === 'Home') nextIndex = 0;
        if (event.key === 'End') nextIndex = tabs.length - 1;
        tabs[nextIndex].focus();
        tabs[nextIndex].click();
    });

    document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && sidebar.classList.contains('is-open')) {
            closeMobileMenu();
            return;
        }

        if (event.key === 'Tab' && sidebar.classList.contains('is-open')) {
            const focusable = Array.from(
                sidebar.querySelectorAll(
                    'button:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
                )
            ).filter(function (element) {
                return element.getClientRects().length > 0;
            });
            if (!focusable.length) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    window.addEventListener('resize', function () {
        if (window.innerWidth >= MOBILE_BREAKPOINT) {
            closeMobileMenu({ restoreFocus: false });
            const stored = readStoredCollapsed();
            setCollapsed(stored === null ? window.innerWidth < 1280 : stored, false);
        } else {
            shell.classList.remove('is-sidebar-collapsed');
            sidebar.classList.remove('is-collapsed');
        }
    });
})();
