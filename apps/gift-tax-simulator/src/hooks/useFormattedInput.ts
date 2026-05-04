import { useCallback } from 'react';
import { formatDecimalInputValue, formatInputValue } from '@/lib/utils';

export const useFormattedInput = () =>
    useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
            setter(formatInputValue(e.target.value));
        },
        []
    );

export const useDecimalInput = () =>
    useCallback(
        (e: React.ChangeEvent<HTMLInputElement>, setter: React.Dispatch<React.SetStateAction<string>>) => {
            setter(formatDecimalInputValue(e.target.value));
        },
        []
    );
