import { useState, useCallback } from "react";

export const useDirtyFlag = <T>(result: T | null) => {
    const [isDirty, setIsDirty] = useState(false);

    const markDirty = useCallback(() => {
        if (result) setIsDirty(true);
    }, [result]);

    const clearDirty = useCallback(() => setIsDirty(false), []);

    return { isDirty, setIsDirty, markDirty, clearDirty };
};
