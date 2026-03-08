import { useMemo } from "react";
import { parseFormattedNumber, parseIntInput } from "@/lib/utils";

export const useCanCalculate = (
    acquisitionCost: string,
    usefulLife: string,
    acquisitionDate: string,
    serviceStartDate: string,
): boolean =>
    useMemo(() => {
        const cost = parseFormattedNumber(acquisitionCost);
        const life = parseIntInput(usefulLife);
        return cost > 0 && life >= 2 && !!acquisitionDate && !!serviceStartDate;
    }, [acquisitionCost, usefulLife, acquisitionDate, serviceStartDate]);
