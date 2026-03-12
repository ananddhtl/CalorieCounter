export type Gender = "female" | "male" | "other";
export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "active"
  | "very_active";
export type GoalType = "lose" | "maintain" | "gain";
export type MealType = "breakfast" | "lunch" | "dinner" | "snack";
export type ReminderType =
  | "medicine"
  | "water"
  | "meal"
  | "exercise"
  | "custom";
export type ReminderStatus = "taken" | "skipped" | "snoozed";

export interface Profile {
  id: string;
  name: string;
  avatar_url: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  height_cm: number | null;
  weight_kg: number | null;
  activity_level: ActivityLevel;
  goal: GoalType;
  daily_calorie_goal: number;
  daily_water_goal_ml: number;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  meal_type: MealType;
  food_name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g: number;
  serving_size: string;
  log_date: string;
  logged_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  log_date: string;
  logged_at: string;
}

export interface Reminder {
  id: string;
  user_id: string;
  type: ReminderType;
  title: string;
  description: string | null;
  icon: string;
  color: string;
  reminder_time: string;
  days_of_week: number[];
  is_active: boolean;
  dosage: string | null;
  unit: string | null;
  created_at: string;
}

export interface ReminderLog {
  id: string;
  reminder_id: string;
  user_id: string;
  status: ReminderStatus;
  log_date: string;
  logged_at: string;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  note: string | null;
  log_date: string;
  logged_at: string;
}
export interface QuickFood {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export interface QuickWaterAmount {
  label: string;
  ml: number;
  emoji: string;
}

export interface ReminderTypeOption {
  key: ReminderType;
  label: string;
  emoji: string;
  color: string;
}
