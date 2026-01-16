import { useState } from 'react';

type ToastHandler = {
  success: (message: string) => void;
  error: (message: string) => void;
};

type CrudConfig<T> = {
  apiEndpoint: string;
  entityName: string;
  getDisplayName: (item: T) => string;
  sortData?: (data: T[]) => T[];
  toast?: ToastHandler;
};

export function useCrudSettings<T extends { id: string }>(config: CrudConfig<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch(config.apiEndpoint);
      if (response.ok) {
        const result = await response.json();
        const sortedData = config.sortData ? config.sortData(result) : result;
        setData(sortedData);
      }
    } catch (error) {
      console.error('読み込みエラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, displayName: string) => {
    if (!confirm(`${displayName}を削除しますか？`)) {
      return;
    }

    try {
      const response = await fetch(`${config.apiEndpoint}?id=${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('削除に失敗しました');
      }

      if (config.toast) {
        config.toast.success('データを削除しました');
      }
      loadData();
    } catch (error) {
      console.error('削除エラー:', error);
      if (config.toast) {
        config.toast.error('削除に失敗しました');
      }
    }
  };

  const filterData = (items: T[], searchField: (item: T) => string) => {
    return items.filter((item) =>
      searchField(item).toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  return {
    data,
    loading,
    searchTerm,
    setSearchTerm,
    loadData,
    handleDelete,
    filterData,
  };
}
