import type { Gender } from '@/types';

const MALE_TABLE: Record<number, number> = {
    0: 81.09, 5: 76.26, 10: 71.29, 15: 66.32, 20: 61.39,
    25: 56.51, 30: 51.62, 35: 46.76, 40: 41.93, 45: 37.18,
    50: 32.54, 55: 28.04, 60: 23.72, 65: 19.65, 70: 15.85,
    75: 12.35, 80: 9.22, 85: 6.57, 90: 4.53, 95: 3.07,
};

const FEMALE_TABLE: Record<number, number> = {
    0: 87.14, 5: 82.29, 10: 77.32, 15: 72.34, 20: 67.38,
    25: 62.44, 30: 57.51, 35: 52.59, 40: 47.71, 45: 42.88,
    50: 38.12, 55: 33.44, 60: 28.84, 65: 24.36, 70: 19.98,
    75: 15.82, 80: 12.01, 85: 8.68, 90: 5.99, 95: 4.00,
};

export function getLifeExpectancy(age: number, gender: Gender): number {
    const table = gender === 'male' ? MALE_TABLE : FEMALE_TABLE;
    const bracket = Math.floor(age / 5) * 5;
    const clampedBracket = Math.min(Math.max(bracket, 0), 95);
    return table[clampedBracket] ?? 0;
}

export function getEstimatedDeathAge(age: number, gender: Gender): number {
    return Math.round(age + getLifeExpectancy(age, gender));
}
