export interface QuickFood {
  name: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}

export const QUICK_FOODS: QuickFood[] = [
  { name: "Banana", calories: 89, protein_g: 1.1, carbs_g: 23, fat_g: 0.3 },
  { name: "Apple", calories: 52, protein_g: 0.3, carbs_g: 14, fat_g: 0.2 },
  { name: "Boiled Egg", calories: 78, protein_g: 6, carbs_g: 0.6, fat_g: 5 },
  {
    name: "Greek Yogurt (100g)",
    calories: 59,
    protein_g: 10,
    carbs_g: 3.6,
    fat_g: 0.4,
  },
  {
    name: "Chicken Breast (100g)",
    calories: 165,
    protein_g: 31,
    carbs_g: 0,
    fat_g: 3.6,
  },
  {
    name: "Brown Rice (100g)",
    calories: 111,
    protein_g: 2.6,
    carbs_g: 23,
    fat_g: 0.9,
  },
  { name: "Oats (40g)", calories: 148, protein_g: 5.4, carbs_g: 26, fat_g: 3 },
  { name: "Almonds (30g)", calories: 174, protein_g: 6, carbs_g: 6, fat_g: 15 },
  {
    name: "Whole Milk (200ml)",
    calories: 122,
    protein_g: 6.5,
    carbs_g: 9,
    fat_g: 6.6,
  },
  {
    name: "White Rice (100g)",
    calories: 130,
    protein_g: 2.7,
    carbs_g: 28,
    fat_g: 0.3,
  },
  { name: "Dal (100g)", calories: 116, protein_g: 9, carbs_g: 20, fat_g: 0.4 },
  {
    name: "Roti (1 piece)",
    calories: 71,
    protein_g: 2.6,
    carbs_g: 15,
    fat_g: 0.4,
  },
  {
    name: "Paneer (100g)",
    calories: 265,
    protein_g: 18,
    carbs_g: 1.2,
    fat_g: 20,
  },
  { name: "Orange", calories: 47, protein_g: 0.9, carbs_g: 12, fat_g: 0.1 },
  {
    name: "Salmon (100g)",
    calories: 208,
    protein_g: 20,
    carbs_g: 0,
    fat_g: 13,
  },
  {
    name: "Sweet Potato (100g)",
    calories: 86,
    protein_g: 1.6,
    carbs_g: 20,
    fat_g: 0.1,
  },
  {
    name: "Avocado (100g)",
    calories: 160,
    protein_g: 2,
    carbs_g: 9,
    fat_g: 15,
  },
  {
    name: "Peanut Butter (2tbsp)",
    calories: 188,
    protein_g: 8,
    carbs_g: 6,
    fat_g: 16,
  },
];
