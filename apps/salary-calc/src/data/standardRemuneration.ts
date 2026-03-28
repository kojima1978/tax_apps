/**
 * 標準報酬月額等級表（令和8年度）
 * 健康保険: 第1級〜第50級（58,000〜1,390,000円）
 * 厚生年金: 上限650,000円
 */

export interface Grade {
  amount: number;
  upper: number;
}

export interface GradeInfo {
  /** 等級番号（1始まり） */
  gradeNumber: number;
  /** 健康保険の標準報酬月額 */
  healthAmount: number;
  /** 厚生年金の標準報酬月額（上限650,000円） */
  pensionAmount: number;
}

/** 健康保険の標準報酬月額等級（50等級） */
export const HEALTH_GRADES: Grade[] = [
  { amount: 58000, upper: 63000 },
  { amount: 68000, upper: 73000 },
  { amount: 78000, upper: 83000 },
  { amount: 88000, upper: 93000 },
  { amount: 98000, upper: 101000 },
  { amount: 104000, upper: 107000 },
  { amount: 110000, upper: 114000 },
  { amount: 118000, upper: 122000 },
  { amount: 126000, upper: 130000 },
  { amount: 134000, upper: 138000 },
  { amount: 142000, upper: 146000 },
  { amount: 150000, upper: 155000 },
  { amount: 160000, upper: 165000 },
  { amount: 170000, upper: 175000 },
  { amount: 180000, upper: 185000 },
  { amount: 190000, upper: 195000 },
  { amount: 200000, upper: 210000 },
  { amount: 220000, upper: 230000 },
  { amount: 240000, upper: 250000 },
  { amount: 260000, upper: 270000 },
  { amount: 280000, upper: 290000 },
  { amount: 300000, upper: 310000 },
  { amount: 320000, upper: 330000 },
  { amount: 340000, upper: 350000 },
  { amount: 360000, upper: 370000 },
  { amount: 380000, upper: 395000 },
  { amount: 410000, upper: 425000 },
  { amount: 440000, upper: 455000 },
  { amount: 470000, upper: 485000 },
  { amount: 500000, upper: 515000 },
  { amount: 530000, upper: 545000 },
  { amount: 560000, upper: 575000 },
  { amount: 590000, upper: 605000 },
  { amount: 620000, upper: 635000 },
  { amount: 650000, upper: 665000 },
  { amount: 680000, upper: 695000 },
  { amount: 710000, upper: 730000 },
  { amount: 750000, upper: 770000 },
  { amount: 790000, upper: 810000 },
  { amount: 830000, upper: 855000 },
  { amount: 880000, upper: 905000 },
  { amount: 930000, upper: 955000 },
  { amount: 980000, upper: 1005000 },
  { amount: 1030000, upper: 1055000 },
  { amount: 1090000, upper: 1115000 },
  { amount: 1150000, upper: 1175000 },
  { amount: 1210000, upper: 1235000 },
  { amount: 1270000, upper: 1295000 },
  { amount: 1330000, upper: 1355000 },
  { amount: 1390000, upper: Infinity },
];

/** 厚生年金の標準報酬月額上限 */
const PENSION_MAX = 650000;

/** 報酬月額から等級番号（1始まり）を取得 */
export function getGradeNumber(salary: number): number {
  for (let i = 0; i < HEALTH_GRADES.length; i++) {
    if (salary <= HEALTH_GRADES[i].upper) return i + 1;
  }
  return HEALTH_GRADES.length;
}

/** 等級番号からGradeInfoを取得 */
export function getGradeInfo(gradeNumber: number): GradeInfo {
  const idx = Math.max(0, Math.min(gradeNumber - 1, HEALTH_GRADES.length - 1));
  const healthAmount = HEALTH_GRADES[idx].amount;
  return {
    gradeNumber: idx + 1,
    healthAmount,
    pensionAmount: Math.min(healthAmount, PENSION_MAX),
  };
}

/** 等級の総数 */
export const GRADE_COUNT = HEALTH_GRADES.length;
