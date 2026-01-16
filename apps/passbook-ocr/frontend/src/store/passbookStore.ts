/**
 * Zustand store for managing passbook OCR state
 */
import { create } from 'zustand';

export interface Transaction {
  date: string;
  description: string;
  withdrawal: string;
  deposit: string;
  balance: string;
  raw_texts?: string[];
  confidence_scores?: number[];
  confidence_avg?: number;
}

export interface ValidationError {
  row: number;
  type: string;
  severity: 'error' | 'warning';
  message: string;
  field?: string;
  difference?: number;
  confidence?: number;
}

export interface PageData {
  page_id: number;
  page_number: number;
  image_path: string;
  transactions: Transaction[];
  validation_status: 'pending' | 'valid' | 'invalid';
  validation_errors?: ValidationError[];
  error_count?: number;
  warning_count?: number;
  confidence_score?: number;
  processing_time?: number;
}

interface PassbookState {
  // Session
  sessionId: string | null;
  bankName: string;
  accountNumber: string;

  // Pages
  pages: PageData[];
  currentPageId: number | null;
  currentPage: PageData | null;

  // UI State
  isProcessing: boolean;
  error: string | null;

  // Actions
  createSession: (bankName?: string, accountNumber?: string) => Promise<void>;
  uploadImage: (file: File) => Promise<void>;
  setCurrentPage: (pageId: number) => void;
  updateTransaction: (rowIndex: number, field: keyof Transaction, value: string) => Promise<void>;
  refreshCurrentPage: () => Promise<void>;
  reset: () => void;
}

const API_BASE = 'http://localhost:8000/api';

export const usePassbookStore = create<PassbookState>((set, get) => ({
  // Initial state
  sessionId: null,
  bankName: '',
  accountNumber: '',
  pages: [],
  currentPageId: null,
  currentPage: null,
  isProcessing: false,
  error: null,

  // Create a new session
  createSession: async (bankName = '', accountNumber = '') => {
    try {
      set({ isProcessing: true, error: null });

      const response = await fetch(`${API_BASE}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bank_name: bankName, account_number: accountNumber }),
      });

      if (!response.ok) throw new Error('Failed to create session');

      const data = await response.json();
      set({ sessionId: data.session_id, bankName, accountNumber });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isProcessing: false });
    }
  },

  // Upload and process an image
  uploadImage: async (file: File) => {
    const state = get();

    // Create session if not exists
    if (!state.sessionId) {
      await state.createSession();
    }

    try {
      set({ isProcessing: true, error: null });

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE}/sessions/${state.sessionId}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await response.json();

      // Fetch all pages to update the list
      const pagesResponse = await fetch(`${API_BASE}/sessions/${state.sessionId}/pages`);
      const pagesData = await pagesResponse.json();

      set({ pages: pagesData.pages });

      // Set the newly uploaded page as current
      if (data.page_id) {
        await state.setCurrentPage(data.page_id);
      }
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isProcessing: false });
    }
  },

  // Set current page
  setCurrentPage: async (pageId: number) => {
    try {
      set({ isProcessing: true, error: null });

      const response = await fetch(`${API_BASE}/pages/${pageId}`);
      if (!response.ok) throw new Error('Failed to fetch page');

      const data = await response.json();
      set({ currentPageId: pageId, currentPage: data });
    } catch (error) {
      set({ error: (error as Error).message });
      throw error;
    } finally {
      set({ isProcessing: false });
    }
  },

  // Update a transaction field
  updateTransaction: async (rowIndex: number, field: keyof Transaction, value: string) => {
    const state = get();
    if (!state.currentPage) return;

    const oldValue = state.currentPage.transactions[rowIndex][field];

    // Optimistic update
    const updatedTransactions = [...state.currentPage.transactions];
    updatedTransactions[rowIndex] = {
      ...updatedTransactions[rowIndex],
      [field]: value,
    };

    set({
      currentPage: {
        ...state.currentPage,
        transactions: updatedTransactions,
      },
    });

    try {
      // Save to backend
      const response = await fetch(`${API_BASE}/pages/${state.currentPageId}/correct`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: state.currentPageId,
          row_index: rowIndex,
          column_name: field,
          old_value: oldValue,
          new_value: value,
        }),
      });

      if (!response.ok) throw new Error('Failed to save correction');

      const data = await response.json();

      // Update validation status
      if (state.currentPage) {
        set({
          currentPage: {
            ...state.currentPage,
            validation_status: data.validation.is_valid ? 'valid' : 'invalid',
            validation_errors: [...data.validation.errors, ...data.validation.warnings],
          },
        });
      }
    } catch (error) {
      // Revert on error
      set({
        currentPage: state.currentPage,
        error: (error as Error).message,
      });
      throw error;
    }
  },

  // Refresh current page data
  refreshCurrentPage: async () => {
    const state = get();
    if (state.currentPageId) {
      await state.setCurrentPage(state.currentPageId);
    }
  },

  // Reset state
  reset: () => {
    set({
      sessionId: null,
      bankName: '',
      accountNumber: '',
      pages: [],
      currentPageId: null,
      currentPage: null,
      isProcessing: false,
      error: null,
    });
  },
}));
