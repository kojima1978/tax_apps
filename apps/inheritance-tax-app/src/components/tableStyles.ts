/** Common card wrapper */
export const CARD = 'bg-white rounded-xl shadow-md border border-gray-100 p-4 md:p-6';

/** Focus ring for inputs */
export const INPUT_FOCUS = 'focus:ring-2 focus:ring-green-500 focus:border-green-500';

/** Compact table cells — used by summary, heir, year-comparison tables */
export const TH = 'border border-gray-300 px-2 py-1.5 md:px-3 md:py-2 text-center font-semibold text-xs md:text-sm';
export const TD = 'border border-gray-300 px-2 py-1.5 md:px-3 md:py-2 text-right text-xs md:text-sm';

/** Medium table cells — used by ComparisonDetailPanel */
export const TH_MID = 'border border-gray-300 px-2 py-1.5 md:px-4 md:py-2 text-center font-semibold text-xs md:text-sm';
export const TD_MID = 'border border-gray-300 px-2 py-1.5 md:px-4 md:py-2 text-right text-xs md:text-sm';

/** Wide table cells — used by TaxTable, ComparisonTable */
export const TH_WIDE = 'border border-gray-300 px-2 py-2 md:px-4 md:py-3 text-center font-semibold text-xs md:text-sm';
export const TD_WIDE = 'border border-gray-300 px-2 py-2 md:px-5 md:py-2.5 text-right text-xs md:text-sm';

/** Toggle button styles — used by unit switcher etc. */
export const TOGGLE_BTN_BASE = 'px-3 py-1 text-sm font-medium rounded-md transition-colors';
export const TOGGLE_BTN_ACTIVE = `${TOGGLE_BTN_BASE} bg-green-600 text-white`;
export const TOGGLE_BTN_INACTIVE = `${TOGGLE_BTN_BASE} bg-gray-100 text-gray-600 hover:bg-gray-200`;
