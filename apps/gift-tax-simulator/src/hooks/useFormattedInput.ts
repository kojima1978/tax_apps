import { useCallback } from 'react';
import { formatInputValue } from '@/lib/utils';

export const useFormattedInput = () =>
    useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
            setter(formatInputValue(e.target.value));
        },
        []
    );
