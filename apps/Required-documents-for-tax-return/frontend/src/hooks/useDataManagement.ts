import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchRecords, deleteDocument, updateCustomerName, DataRecord, fetchStaff } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { formatReiwaYear } from '@/utils/date';
import { Staff } from '@/types';

interface EditState {
  id: number | null;
  customerName: string;
  staffId: number | '';
  originalStaffId: number | null;
  customerId: number | null;
}

const initialEditState: EditState = {
  id: null,
  customerName: '',
  staffId: '',
  originalStaffId: null,
  customerId: null,
};

export type SortKey = 'staff_name' | 'customer_name' | 'year' | 'updated_at';
interface SortConfig {
  key: SortKey;
  direction: 'asc' | 'desc';
}

const ITEMS_PER_PAGE = 20;

export function useDataManagement() {
  const [records, setRecords] = useState<DataRecord[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Search State
  const [searchStaff, setSearchStaff] = useState('');
  const [searchCustomer, setSearchCustomer] = useState('');
  const [searchYear, setSearchYear] = useState<number | ''>('');

  // Sort & Pagination State
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'updated_at', direction: 'desc' });
  const [currentPage, setCurrentPage] = useState(1);

  const [editState, setEditState] = useState<EditState>(initialEditState);

  const loadRecords = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recordsData, staffData] = await Promise.all([
        fetchRecords(),
        fetchStaff()
      ]);
      setRecords(recordsData);
      setStaffList(staffData);
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecords();
  }, [loadRecords]);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchStaff, searchCustomer, searchYear]);

  const handleDelete = async (id: number, customerName: string, year: number) => {
    if (!confirm(`「${customerName}」の${formatReiwaYear(year)}のデータを削除しますか？\nこの操作は取り消せません。`)) {
      return;
    }

    try {
      await deleteDocument(id);
      setRecords((prev) => prev.filter((r) => r.id !== id));
    } catch (error) {
      alert(getErrorMessage(error, '削除に失敗しました'));
    }
  };

  const startEdit = (record: DataRecord) => {
    setEditState({
      id: record.id,
      customerName: record.customer_name,
      staffId: record.staff_id || '',
      originalStaffId: record.staff_id,
      customerId: record.customer_id,
    });
  };

  const cancelEdit = () => {
    setEditState(initialEditState);
  };

  const saveEdit = async () => {
    if (!editState.customerId || !editState.customerName.trim() || !editState.staffId) {
      alert('お客様名と担当者は必須です');
      return;
    }

    try {
      await updateCustomerName(
        editState.customerId,
        editState.customerName.trim(),
        Number(editState.staffId)
      );

      const staff = staffList.find(s => s.id === Number(editState.staffId));
      const newStaffName = staff ? staff.staff_name : '';

      setRecords((prev) =>
        prev.map((r) =>
          r.customer_id === editState.customerId
            ? { ...r, customer_name: editState.customerName.trim(), staff_name: newStaffName, staff_id: Number(editState.staffId) }
            : r
        )
      );
      cancelEdit();
    } catch (error) {
      alert(getErrorMessage(error, '更新に失敗しました'));
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const availableYears = useMemo(() => {
    return [...new Set(records.map((r) => r.year))].sort((a, b) => b - a);
  }, [records]);

  // Filter -> Sort -> Pagination
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const staffMatch = !searchStaff || record.staff_name.toLowerCase().includes(searchStaff.toLowerCase());
      const customerMatch = !searchCustomer || record.customer_name.toLowerCase().includes(searchCustomer.toLowerCase());
      const yearMatch = searchYear === '' || record.year === searchYear;
      return staffMatch && customerMatch && yearMatch;
    });
  }, [records, searchStaff, searchCustomer, searchYear]);

  const sortedRecords = useMemo(() => {
    const sorted = [...filteredRecords];
    sorted.sort((a, b) => {
      const aRaw = a[sortConfig.key];
      const bRaw = b[sortConfig.key];

      if (sortConfig.key === 'year') {
        const aNum = Number(aRaw);
        const bNum = Number(bRaw);
        return sortConfig.direction === 'asc' ? aNum - bNum : bNum - aNum;
      }

      const aStr = String(aRaw).toLowerCase();
      const bStr = String(bRaw).toLowerCase();
      if (aStr < bStr) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aStr > bStr) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredRecords, sortConfig]);

  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedRecords, currentPage]);

  const totalPages = Math.ceil(filteredRecords.length / ITEMS_PER_PAGE);
  const hasSearchFilter = searchStaff || searchCustomer || searchYear !== '';

  const clearSearch = () => {
    setSearchStaff('');
    setSearchCustomer('');
    setSearchYear('');
  };

  return {
    // Data
    staffList,
    isLoading,
    filteredRecords,
    paginatedRecords,
    availableYears,
    totalPages,
    hasSearchFilter,

    // Search
    searchStaff,
    setSearchStaff,
    searchCustomer,
    setSearchCustomer,
    searchYear,
    setSearchYear,
    clearSearch,

    // Sort & Pagination
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    itemsPerPage: ITEMS_PER_PAGE,

    // Edit
    editState,
    setEditState,
    startEdit,
    cancelEdit,
    saveEdit,

    // CRUD
    handleDelete,
  };
}
