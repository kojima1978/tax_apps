import { useState, useCallback } from 'react';
import { addStaff } from '@/utils/api';
import { getErrorMessage } from '@/utils/error';
import { Staff } from '@/types';

interface UseInlineStaffCreationOptions {
  onCreated: (staff: Staff) => void;
}

export function useInlineStaffCreation({ onCreated }: UseInlineStaffCreationOptions) {
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const open = useCallback(() => setShowForm(true), []);

  const close = useCallback(() => {
    setShowForm(false);
    setError(null);
    setName('');
    setCode('');
    setMobile('');
  }, []);

  const submit = useCallback(async () => {
    if (!name.trim()) return;
    setIsCreating(true);
    setError(null);
    try {
      const staff = await addStaff(name.trim(), mobile.trim() || undefined, code.trim() || undefined);
      onCreated(staff);
      close();
    } catch (e: unknown) {
      setError(getErrorMessage(e, '担当者の登録に失敗しました'));
    } finally {
      setIsCreating(false);
    }
  }, [name, code, mobile, onCreated, close]);

  return { showForm, name, setName, code, setCode, mobile, setMobile, isCreating, error, open, close, submit };
}
