import { ActivityLevel, Gender, GoalType } from "../constants/types";

const MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

interface CalcParams {
  gender: Gender;
  weightKg: number;
  heightCm: number;
  age: number;
  activity: ActivityLevel;
  goal: GoalType;
}

export function calcBMR(
  gender: Gender,
  weightKg: number,
  heightCm: number,
  age: number,
): number {
  if (gender === "male") {
    return 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  }
  return 10 * weightKg + 6.25 * heightCm - 5 * age - 161;
}

export function calcTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * MULTIPLIERS[activity]);
}

export function calcDailyCalories(params: CalcParams): number {
  const bmr = calcBMR(
    params.gender,
    params.weightKg,
    params.heightCm,
    params.age,
  );
  let tdee = calcTDEE(bmr, params.activity);
  if (params.goal === "lose") tdee -= 300;
  else if (params.goal === "gain") tdee += 300;
  return tdee;
}

export function calcBMI(weightKg: number, heightCm: number): number {
  return Number((weightKg / Math.pow(heightCm / 100, 2)).toFixed(1));
}

export function getBMICategory(bmi: number): {
  label: string;
  color: string;
  emoji: string;
} {
  if (bmi < 18.5)
    return { label: "Underweight", color: "#56CFE1", emoji: "📉" };
  if (bmi < 25)
    return { label: "Healthy Weight", color: "#06D6A0", emoji: "✨" };
  if (bmi < 30) return { label: "Overweight", color: "#FFB347", emoji: "⚠️" };
  return { label: "Obese", color: "#FF6B6B", emoji: "🔴" };
}

export function calcIdealWeight(heightCm: number): {
  min: number;
  max: number;
} {
  const h = heightCm / 100;
  return {
    min: Math.round(18.5 * h * h),
    max: Math.round(24.9 * h * h),
  };
}
