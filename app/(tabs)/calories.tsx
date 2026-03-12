import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { FoodLog, MealType, QuickFood } from "../../constants/types";
import { supabase } from "../../hooks/useSupabase";

const TODAY = new Date().toISOString().split("T")[0];

const GEMINI_API_KEY = "AIzaSyBZyC9GpWvICN-v85uE49MJswF3YtMb8lo";
const NUTRITIONIX_APP_ID = "YOUR_APP_ID";
const NUTRITIONIX_APP_KEY = "YOUR_APP_KEY";

interface MealConfig {
  key: MealType;
  label: string;
  iconName: keyof typeof Ionicons.glyphMap;
  color: string;
}

interface AIAnalysisResult {
  total_calories: number;
  calorie_range: string;
  confidence: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  items: Array<{ name: string; portion: string; calories: number }>;
  notes: string;
}

interface GeminiAnalysisResult {
  food_name: string;
  estimated_calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  confidence_level: string;
  items: Array<{ name: string; estimated_calories: number }>;
}

const MEALS: MealConfig[] = [
  {
    key: "breakfast",
    label: "Breakfast",
    iconName: "sunny-outline",
    color: COLORS.peach,
  },
  {
    key: "lunch",
    label: "Lunch",
    iconName: "restaurant-outline",
    color: COLORS.green,
  },
  {
    key: "dinner",
    label: "Dinner",
    iconName: "moon-outline",
    color: COLORS.accent,
  },
  {
    key: "snack",
    label: "Snack",
    iconName: "cafe-outline",
    color: COLORS.primary,
  },
];

const QUICK_FOODS: QuickFood[] = [
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
];

type TabType = "quick" | "custom" | "image";

export default function CaloriesScreen(): React.JSX.Element {
  const [logs, setLogs] = useState<FoodLog[]>([]);
  const [calorieGoal, setCalorieGoal] = useState<number>(2000);
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [aiModalVisible, setAiModalVisible] = useState<boolean>(false);
  const [activeMeal, setActiveMeal] = useState<MealType>("breakfast");
  const [loading, setLoading] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [tab, setTab] = useState<TabType>("quick");

  // Nutritionix search states
  const [foodQuery, setFoodQuery] = useState<string>("");
  const [analyzing, setAnalyzing] = useState<boolean>(false);
  const [aiResult, setAiResult] = useState<AIAnalysisResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Gemini image analysis states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [analyzeImage, setAnalyzeImage] = useState<boolean>(false);
  const [geminiResult, setGeminiResult] = useState<GeminiAnalysisResult | null>(
    null,
  );
  const [geminiError, setGeminiError] = useState<string | null>(null);

  // Custom food form states
  const [foodName, setFoodName] = useState("");
  const [calories, setCalories] = useState("");
  const [protein, setProtein] = useState("");
  const [carbs, setCarbs] = useState("");
  const [fat, setFat] = useState("");
  const [serving, setServing] = useState("1 serving");

  const fetchLogs = useCallback(async (): Promise<void> => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }

      const [{ data: logsData }, { data: prof }] = await Promise.all([
        supabase
          .from("food_logs")
          .select("*")
          .eq("user_id", user.id)
          .eq("log_date", TODAY)
          .order("logged_at", { ascending: false }),
        supabase
          .from("profiles")
          .select("daily_calorie_goal")
          .eq("id", user.id)
          .single(),
      ]);

      setLogs((logsData as FoodLog[]) || []);
      if (prof?.daily_calorie_goal) setCalorieGoal(prof.daily_calorie_goal);
    } catch (error) {
      console.error("Error fetching logs:", error);
      Alert.alert("Error", "Failed to load your food logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const openModal = (meal: MealType): void => {
    setActiveMeal(meal);
    setModalVisible(true);
    setSearch("");
    setTab("quick");
    resetForm();
  };

  const openAiModal = (meal: MealType): void => {
    setActiveMeal(meal);
    setAiModalVisible(true);
    setFoodQuery("");
    setAiResult(null);
    setAiError(null);
  };

  const resetForm = (): void => {
    setFoodName("");
    setCalories("");
    setProtein("");
    setCarbs("");
    setFat("");
    setServing("1 serving");
  };

  // ─── Pick image from library ─────────────────────────────────────────
  const pickImage = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Pick image error:", err);
      Alert.alert("Error", "Failed to pick image");
    }
  };

  // ─── Take photo from camera ─────────────────────────────────────────
  const takePhoto = async (): Promise<void> => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
        base64: false,
      });

      if (!result.canceled && result.assets[0].uri) {
        setSelectedImage(result.assets[0].uri);
      }
    } catch (err) {
      console.error("Take photo error:", err);
      Alert.alert("Error", "Failed to take photo");
    }
  };

  // ─── Analyze image with Gemini AI ───────────────────────────────────
  const analyzeFoodImage = async (): Promise<void> => {
    if (!selectedImage) {
      setGeminiError("Please select an image first");
      return;
    }

    if (!GEMINI_API_KEY || GEMINI_API_KEY.includes("YOUR_")) {
      setGeminiError(
        "Gemini API key not configured. Please add your API key to the code.",
      );
      return;
    }

    setAnalyzeImage(true);
    setGeminiError(null);

    try {
      // Convert image URI to base64
      const response = await fetch(selectedImage);
      const blob = await response.blob();
      const reader = new FileReader();

      reader.onload = async () => {
        try {
          const base64String = (reader.result as string).split(",")[1];

          const geminiResponse = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                contents: [
                  {
                    parts: [
                      {
                        text: `You are a nutrition analyst. Analyze this food image and provide ONLY a valid JSON response with this exact structure (no markdown, no explanation, just JSON):
{
  "food_name": "name of the dish",
  "estimated_calories": number (estimate total calories for the visible portion),
  "protein_g": number (grams),
  "carbs_g": number (grams),
  "fat_g": number (grams),
  "confidence_level": "high" or "medium" or "low",
  "items": [
    {"name": "item name", "estimated_calories": number},
    {"name": "item name", "estimated_calories": number}
  ]
}

Be specific about portion sizes. If you cannot identify the food, set confidence_level to "low" and provide your best estimate.`,
                      },
                      {
                        inlineData: {
                          mimeType: "image/jpeg",
                          data: base64String,
                        },
                      },
                    ],
                  },
                ],
              }),
            },
          );

          const data = await geminiResponse.json();

          if (!geminiResponse.ok) {
            throw new Error(
              data.error?.message || "Failed to analyze image with Gemini",
            );
          }

          // Extract text from response
          const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!textContent) {
            throw new Error("No response from Gemini API");
          }

          // Parse JSON from response (strip markdown if present)
          let jsonString = textContent.trim();
          if (jsonString.startsWith("```json")) {
            jsonString = jsonString
              .replace(/^```json\n?/, "")
              .replace(/\n?```$/, "");
          } else if (jsonString.startsWith("```")) {
            jsonString = jsonString
              .replace(/^```\n?/, "")
              .replace(/\n?```$/, "");
          }

          const result: GeminiAnalysisResult = JSON.parse(jsonString);

          // Validate required fields
          if (
            !result.food_name ||
            !result.estimated_calories ||
            result.protein_g === undefined ||
            result.carbs_g === undefined ||
            result.fat_g === undefined
          ) {
            throw new Error(
              "Invalid response format - missing required nutrition data",
            );
          }

          setGeminiResult(result);
        } catch (parseErr: any) {
          console.error("Parse error:", parseErr);
          setGeminiError(
            parseErr?.message || "Failed to parse nutrition data from image",
          );
          setAnalyzeImage(false);
        }
      };

      reader.onerror = () => {
        setGeminiError("Failed to read image file");
        setAnalyzeImage(false);
      };

      reader.readAsDataURL(blob);
    } catch (err: any) {
      console.error("Analysis error:", err);
      setGeminiError(
        err?.message || "Failed to analyze image. Please try again.",
      );
      setAnalyzeImage(false);
    }
  };

  // ─── Add Gemini result to log ────────────────────────────────────────
  const addGeminiResultToLog = async (): Promise<void> => {
    if (!geminiResult || !activeMeal) return;

    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        Alert.alert("Error", "User not authenticated");
        setSaving(false);
        return;
      }

      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_type: activeMeal,
        food_name: geminiResult.food_name,
        calories: geminiResult.estimated_calories,
        protein_g: geminiResult.protein_g,
        carbs_g: geminiResult.carbs_g,
        fat_g: geminiResult.fat_g,
        fiber_g: 0,
        serving_size: "1 serving (from image)",
        log_date: TODAY,
      });

      if (error) {
        Alert.alert("Error", `Failed to save: ${error.message}`);
        console.error("Database error:", error);
      } else {
        await fetchLogs();
        setModalVisible(false);
        setSelectedImage(null);
        setGeminiResult(null);
        setTab("quick");
        Alert.alert("Success", "Food logged successfully!");
      }
    } catch (err: any) {
      console.error("Save error:", err);
      Alert.alert("Error", "Failed to save food log");
    } finally {
      setSaving(false);
    }
  };

  // ─── Nutritionix natural language lookup ─────────────────────────────
  const analyzeFoodByText = async (): Promise<void> => {
    if (!foodQuery.trim()) {
      setAiError("Please describe what you ate (e.g. '2 rotis and dal').");
      return;
    }

    if (!NUTRITIONIX_APP_ID || NUTRITIONIX_APP_ID.includes("YOUR_")) {
      setAiError(
        "Nutritionix API not configured. Text search is optional. Use image analysis instead.",
      );
      return;
    }

    setAnalyzing(true);
    setAiError(null);

    try {
      const response = await fetch(
        "https://trackapi.nutritionix.com/v2/natural/nutrients",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-app-id": NUTRITIONIX_APP_ID,
            "x-app-key": NUTRITIONIX_APP_KEY,
          },
          body: JSON.stringify({ query: foodQuery }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not find nutrition data.");
      }

      const foods: any[] = data.foods || [];
      if (foods.length === 0) {
        throw new Error("No food found. Try describing it differently.");
      }

      const items = foods.map((f) => ({
        name: f.food_name,
        portion: `${f.serving_qty} ${f.serving_unit}`,
        calories: Math.round(f.nf_calories),
      }));

      const total_calories = items.reduce((s, i) => s + i.calories, 0);
      const protein_g =
        Math.round(foods.reduce((s, f) => s + (f.nf_protein || 0), 0) * 10) /
        10;
      const carbs_g =
        Math.round(
          foods.reduce((s, f) => s + (f.nf_total_carbohydrate || 0), 0) * 10,
        ) / 10;
      const fat_g =
        Math.round(foods.reduce((s, f) => s + (f.nf_total_fat || 0), 0) * 10) /
        10;

      setAiResult({
        total_calories,
        calorie_range: `${Math.round(total_calories * 0.9)}–${Math.round(
          total_calories * 1.1,
        )}`,
        confidence: 92,
        protein_g,
        carbs_g,
        fat_g,
        items,
        notes: "Data from Nutritionix database.",
      });
    } catch (err: any) {
      console.error("Nutritionix error:", err);
      setAiError(
        err?.message || "Could not fetch nutrition data. Please try again.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

  const addAiResultToLog = async (): Promise<void> => {
    if (!aiResult || !activeMeal) return;
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }

      for (const item of aiResult.items) {
        const ratio =
          aiResult.total_calories > 0
            ? item.calories / aiResult.total_calories
            : 0;
        const { error } = await supabase.from("food_logs").insert({
          user_id: user.id,
          meal_type: activeMeal,
          food_name: item.name,
          calories: item.calories,
          protein_g: Math.round(aiResult.protein_g * ratio * 10) / 10 || 0,
          carbs_g: Math.round(aiResult.carbs_g * ratio * 10) / 10 || 0,
          fat_g: Math.round(aiResult.fat_g * ratio * 10) / 10 || 0,
          fiber_g: 0,
          serving_size: item.portion,
          log_date: TODAY,
        });
        if (error) {
          Alert.alert("Error", error.message);
          break;
        }
      }

      await fetchLogs();
      setAiModalVisible(false);
      setFoodQuery("");
      setAiResult(null);
      setSaving(false);
    } catch (err: any) {
      console.error("Error:", err);
      Alert.alert("Error", "Failed to save food log");
      setSaving(false);
    }
  };

  const addQuickFood = async (food: QuickFood): Promise<void> => {
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_type: activeMeal,
        food_name: food.name,
        calories: food.calories,
        protein_g: food.protein_g,
        carbs_g: food.carbs_g,
        fat_g: food.fat_g,
        fiber_g: 0,
        serving_size: "1 serving",
        log_date: TODAY,
      });
      if (!error) {
        await fetchLogs();
        setModalVisible(false);
        Alert.alert("Success", `${food.name} added!`);
      } else Alert.alert("Error", error.message);
    } catch (err: any) {
      Alert.alert("Error", "Failed to add food");
    } finally {
      setSaving(false);
    }
  };

  const addCustomFood = async (): Promise<void> => {
    if (!foodName || !calories) {
      Alert.alert("Required", "Enter food name and calories");
      return;
    }
    setSaving(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setSaving(false);
        return;
      }
      const { error } = await supabase.from("food_logs").insert({
        user_id: user.id,
        meal_type: activeMeal,
        food_name: foodName,
        calories: parseInt(calories) || 0,
        protein_g: parseFloat(protein) || 0,
        carbs_g: parseFloat(carbs) || 0,
        fat_g: parseFloat(fat) || 0,
        fiber_g: 0,
        serving_size: serving,
        log_date: TODAY,
      });
      if (!error) {
        await fetchLogs();
        setModalVisible(false);
        resetForm();
        Alert.alert("Success", `${foodName} added!`);
      } else Alert.alert("Error", error.message);
    } catch (err: any) {
      Alert.alert("Error", "Failed to add food");
    } finally {
      setSaving(false);
    }
  };

  const deleteLog = async (id: string): Promise<void> => {
    try {
      await supabase.from("food_logs").delete().eq("id", id);
      fetchLogs();
    } catch (err: any) {
      Alert.alert("Error", "Failed to delete entry");
    }
  };

  const totalCal = logs.reduce((s, f) => s + f.calories, 0);
  const pct = Math.min(totalCal / calorieGoal, 1);
  const filteredFoods = search
    ? QUICK_FOODS.filter((f) =>
        f.name.toLowerCase().includes(search.toLowerCase()),
      )
    : QUICK_FOODS;

  return (
    <LinearGradient colors={["#FFF0F5", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <View style={styles.header}>
            <MaterialCommunityIcons
              name="food-apple-outline"
              size={32}
              color={COLORS.primary}
            />
            <Text style={styles.heading}>Calorie Tracker</Text>
          </View>
          <Text style={styles.subheading}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {/* Summary Card */}
          <LinearGradient
            colors={[COLORS.primary, "#FF8FAB"]}
            style={styles.summaryCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.summaryRow}>
              <View>
                <Text style={styles.sumTitle}>Today's Calories</Text>
                <Text style={styles.sumCalories}>
                  {totalCal} <Text style={styles.sumUnit}>kcal</Text>
                </Text>
                <Text style={styles.sumGoal}>Goal: {calorieGoal} kcal</Text>
              </View>
              <View style={styles.ringArea}>
                <Text style={styles.ringPct}>{Math.round(pct * 100)}%</Text>
                <Text style={styles.ringLabel}>of goal</Text>
              </View>
            </View>
            <View style={styles.progressBg}>
              <View style={[styles.progressFill, { width: `${pct * 100}%` }]} />
            </View>
            <View style={styles.macroSumRow}>
              {[
                {
                  l: "Protein",
                  key: "protein_g" as keyof FoodLog,
                  icon: "food-steak" as const,
                },
                {
                  l: "Carbs",
                  key: "carbs_g" as keyof FoodLog,
                  icon: "bread-slice" as const,
                },
                {
                  l: "Fat",
                  key: "fat_g" as keyof FoodLog,
                  icon: "oil" as const,
                },
              ].map((m) => (
                <View key={m.key} style={styles.macroSumItem}>
                  <MaterialCommunityIcons
                    name={m.icon}
                    size={16}
                    color={COLORS.white}
                  />
                  <Text style={styles.macroSumVal}>
                    {logs
                      .reduce((s, f) => s + ((f[m.key] as number) || 0), 0)
                      .toFixed(0)}
                    g
                  </Text>
                  <Text style={styles.macroSumLabel}>{m.l}</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Meal Cards */}
          {MEALS.map((meal) => {
            const mealLogs = logs.filter((l) => l.meal_type === meal.key);
            const mealCal = mealLogs.reduce((s, f) => s + f.calories, 0);
            return (
              <View key={meal.key} style={styles.mealCard}>
                <View style={styles.mealHeader}>
                  <View style={styles.mealHeaderLeft}>
                    <View
                      style={[
                        styles.mealIconBg,
                        { backgroundColor: meal.color + "20" },
                      ]}
                    >
                      <Ionicons
                        name={meal.iconName}
                        size={22}
                        color={meal.color}
                      />
                    </View>
                    <View>
                      <Text style={styles.mealTitle}>{meal.label}</Text>
                      <Text style={styles.mealCalText}>{mealCal} kcal</Text>
                    </View>
                  </View>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    <TouchableOpacity
                      style={[
                        styles.cameraBtn,
                        { backgroundColor: meal.color + "20" },
                      ]}
                      onPress={() => {
                        setActiveMeal(meal.key);
                        setTab("image");
                        setSelectedImage(null);
                        setGeminiResult(null);
                        setGeminiError(null);
                        setModalVisible(true);
                      }}
                    >
                      <Ionicons
                        name="camera-outline"
                        size={18}
                        color={meal.color}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.addBtn,
                        { backgroundColor: meal.color + "20" },
                      ]}
                      onPress={() => openModal(meal.key)}
                    >
                      <Ionicons name="add" size={18} color={meal.color} />
                      <Text style={[styles.addBtnText, { color: meal.color }]}>
                        Add
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
                {mealLogs.map((log) => (
                  <View key={log.id} style={styles.logRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.logName}>{log.food_name}</Text>
                      <Text style={styles.logMacros}>
                        P: {log.protein_g}g · C: {log.carbs_g}g · F: {log.fat_g}
                        g
                      </Text>
                    </View>
                    <Text style={styles.logCal}>{log.calories} kcal</Text>
                    <TouchableOpacity
                      onPress={() => deleteLog(log.id)}
                      style={styles.deleteBtn}
                    >
                      <Ionicons
                        name="close-outline"
                        size={16}
                        color={COLORS.textLight}
                      />
                    </TouchableOpacity>
                  </View>
                ))}
                {mealLogs.length === 0 && (
                  <Text style={styles.emptyMeal}>No items logged</Text>
                )}
              </View>
            );
          })}
          <View style={{ height: 90 }} />
        </ScrollView>

        {/* ─── Main Modal (Quick Add, Custom, Image) ──────────────────── */}
        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <LinearGradient colors={["#FFF0F5", "#FFFFFF"]} style={{ flex: 1 }}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons
                      name={
                        MEALS.find((m) => m.key === activeMeal)?.iconName ||
                        "restaurant-outline"
                      }
                      size={24}
                      color={COLORS.primary}
                    />
                    <Text style={styles.modalTitle}>
                      Add to{" "}
                      {activeMeal.charAt(0).toUpperCase() + activeMeal.slice(1)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setModalVisible(false);
                      setSelectedImage(null);
                      setGeminiResult(null);
                      setTab("quick");
                    }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textMid} />
                  </TouchableOpacity>
                </View>
                <View style={styles.tabSwitch}>
                  {(["quick", "custom", "image"] as TabType[]).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
                      onPress={() => setTab(t)}
                    >
                      <Text
                        style={[
                          styles.tabBtnText,
                          tab === t && styles.tabBtnTextActive,
                        ]}
                      >
                        {t === "quick"
                          ? "Quick Add"
                          : t === "custom"
                            ? "Custom"
                            : "Photo"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  {tab === "quick" && (
                    <>
                      <View style={styles.searchBar}>
                        <Ionicons
                          name="search-outline"
                          size={18}
                          color={COLORS.textLight}
                        />
                        <TextInput
                          style={styles.searchInput}
                          placeholder="Search food..."
                          placeholderTextColor={COLORS.textLight}
                          value={search}
                          onChangeText={setSearch}
                        />
                      </View>
                      {filteredFoods.map((food, i) => (
                        <TouchableOpacity
                          key={i}
                          style={styles.quickFoodRow}
                          onPress={() => addQuickFood(food)}
                          disabled={saving}
                        >
                          <View style={{ flex: 1 }}>
                            <Text style={styles.quickFoodName}>
                              {food.name}
                            </Text>
                            <Text style={styles.quickFoodMacros}>
                              P: {food.protein_g}g · C: {food.carbs_g}g · F:{" "}
                              {food.fat_g}g
                            </Text>
                          </View>
                          <Text style={styles.quickFoodCal}>
                            {food.calories} kcal
                          </Text>
                          {saving && (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.primary}
                            />
                          )}
                        </TouchableOpacity>
                      ))}
                    </>
                  )}

                  {tab === "custom" && (
                    <View style={styles.customForm}>
                      <ModalInput
                        label="Food Name *"
                        placeholder="e.g. Homemade Khichdi"
                        value={foodName}
                        onChangeText={setFoodName}
                      />
                      <ModalInput
                        label="Calories (kcal) *"
                        placeholder="0"
                        value={calories}
                        onChangeText={setCalories}
                        keyboardType="numeric"
                      />
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                          <ModalInput
                            label="Protein (g)"
                            placeholder="0"
                            value={protein}
                            onChangeText={setProtein}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ModalInput
                            label="Carbs (g)"
                            placeholder="0"
                            value={carbs}
                            onChangeText={setCarbs}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>
                      <View style={styles.row2}>
                        <View style={{ flex: 1 }}>
                          <ModalInput
                            label="Fat (g)"
                            placeholder="0"
                            value={fat}
                            onChangeText={setFat}
                            keyboardType="numeric"
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <ModalInput
                            label="Serving"
                            placeholder="1 serving"
                            value={serving}
                            onChangeText={setServing}
                          />
                        </View>
                      </View>
                      <TouchableOpacity
                        style={styles.saveBtn}
                        onPress={addCustomFood}
                        disabled={saving}
                        activeOpacity={0.85}
                      >
                        <LinearGradient
                          colors={[COLORS.primary, "#FF8FAB"]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.saveBtnGrad}
                        >
                          {saving ? (
                            <ActivityIndicator color={COLORS.white} />
                          ) : (
                            <Text style={styles.saveBtnText}>Add Food</Text>
                          )}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  )}

                  {tab === "image" && (
                    <View style={styles.imageTab}>
                      {!selectedImage ? (
                        <View style={styles.imagePicker}>
                          <MaterialCommunityIcons
                            name="food-camera"
                            size={48}
                            color={COLORS.primary}
                          />
                          <Text style={styles.imageTitle}>
                            Analyze Food Photo
                          </Text>
                          <Text style={styles.imageSubtitle}>
                            Take or upload a photo of your meal
                          </Text>

                          <View style={styles.imageActions}>
                            <TouchableOpacity
                              style={styles.imageActionBtn}
                              onPress={takePhoto}
                            >
                              <Ionicons
                                name="camera"
                                size={32}
                                color={COLORS.primary}
                              />
                              <Text style={styles.imageActionLabel}>
                                Take Photo
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.imageActionBtn}
                              onPress={pickImage}
                            >
                              <Ionicons
                                name="images-outline"
                                size={32}
                                color={COLORS.primary}
                              />
                              <Text style={styles.imageActionLabel}>
                                Choose Photo
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ) : (
                        <View style={styles.imagePreview}>
                          <Image
                            source={{ uri: selectedImage }}
                            style={styles.selectedImage}
                          />
                          <TouchableOpacity
                            style={styles.changeImageBtn}
                            onPress={() => {
                              setSelectedImage(null);
                              setGeminiResult(null);
                              setGeminiError(null);
                            }}
                          >
                            <Text style={styles.changeImageText}>
                              Change Photo
                            </Text>
                          </TouchableOpacity>

                          {!geminiResult && !geminiError && (
                            <TouchableOpacity
                              style={[
                                styles.analyzeBtn,
                                analyzeImage && { opacity: 0.6 },
                              ]}
                              onPress={analyzeFoodImage}
                              disabled={analyzeImage}
                            >
                              <LinearGradient
                                colors={[COLORS.primary, "#FF8FAB"]}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                                style={styles.analyzeBtnGrad}
                              >
                                {analyzeImage ? (
                                  <ActivityIndicator color={COLORS.white} />
                                ) : (
                                  <Text style={styles.analyzeBtnText}>
                                    Analyze with AI
                                  </Text>
                                )}
                              </LinearGradient>
                            </TouchableOpacity>
                          )}

                          {geminiError && (
                            <View style={styles.errorCard}>
                              <Text style={styles.errorTitle}>
                                ⚠ {geminiError}
                              </Text>
                              <TouchableOpacity
                                onPress={() => {
                                  setGeminiError(null);
                                  setSelectedImage(null);
                                }}
                                style={styles.errorBtn}
                              >
                                <Text style={styles.errorBtnText}>
                                  Try Again
                                </Text>
                              </TouchableOpacity>
                            </View>
                          )}

                          {geminiResult && (
                            <View style={styles.geminiResultCard}>
                              <Text style={styles.resultFoodName}>
                                {geminiResult.food_name}
                              </Text>
                              <LinearGradient
                                colors={[COLORS.primary, "#FF8FAB"]}
                                style={styles.resultCalories}
                              >
                                <Text style={styles.resultCalLabel}>
                                  Estimated Calories
                                </Text>
                                <Text style={styles.resultCalValue}>
                                  {geminiResult.estimated_calories}
                                </Text>
                              </LinearGradient>

                              <View style={styles.resultMacros}>
                                {[
                                  {
                                    label: "Protein",
                                    value: geminiResult.protein_g,
                                    icon: "food-steak" as const,
                                  },
                                  {
                                    label: "Carbs",
                                    value: geminiResult.carbs_g,
                                    icon: "bread-slice" as const,
                                  },
                                  {
                                    label: "Fat",
                                    value: geminiResult.fat_g,
                                    icon: "oil" as const,
                                  },
                                ].map((m) => (
                                  <View
                                    key={m.label}
                                    style={styles.resultMacroItem}
                                  >
                                    <MaterialCommunityIcons
                                      name={m.icon}
                                      size={18}
                                      color={COLORS.primary}
                                    />
                                    <Text style={styles.macroItemValue}>
                                      {m.value}g
                                    </Text>
                                    <Text style={styles.macroItemLabel}>
                                      {m.label}
                                    </Text>
                                  </View>
                                ))}
                              </View>

                              <Text style={styles.confidenceLabel}>
                                Confidence:{" "}
                                <Text style={styles.confidenceValue}>
                                  {geminiResult.confidence_level.toUpperCase()}
                                </Text>
                              </Text>

                              <TouchableOpacity
                                style={styles.continueBtn}
                                onPress={addGeminiResultToLog}
                                disabled={saving}
                              >
                                <LinearGradient
                                  colors={[COLORS.primary, "#FF8FAB"]}
                                  style={styles.continueBtnGrad}
                                >
                                  {saving ? (
                                    <ActivityIndicator color={COLORS.white} />
                                  ) : (
                                    <Text style={styles.continueBtnText}>
                                      Continue
                                    </Text>
                                  )}
                                </LinearGradient>
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          </KeyboardAvoidingView>
        </Modal>

        {/* ─── Nutritionix Search Modal ────────────────────────────────── */}
        <Modal
          visible={aiModalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <LinearGradient colors={["#FFF0F5", "#FFFFFF"]} style={{ flex: 1 }}>
              <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.modalHeader}>
                  <View style={styles.modalTitleContainer}>
                    <Ionicons
                      name="search-outline"
                      size={24}
                      color={COLORS.primary}
                    />
                    <Text style={styles.modalTitle}>Search Nutrition</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setAiModalVisible(false);
                      setFoodQuery("");
                      setAiResult(null);
                      setAiError(null);
                    }}
                  >
                    <Ionicons name="close" size={24} color={COLORS.textMid} />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  contentContainerStyle={styles.modalScroll}
                  keyboardShouldPersistTaps="handled"
                >
                  <Text style={styles.searchHint}>
                    Describe what you ate in plain words
                  </Text>
                  <View style={styles.nutriSearchBox}>
                    <TextInput
                      style={styles.nutriSearchInput}
                      placeholder='e.g. "2 rotis with dal" or "bowl of oats with milk"'
                      placeholderTextColor={COLORS.textLight}
                      value={foodQuery}
                      onChangeText={setFoodQuery}
                      multiline
                      returnKeyType="search"
                      onSubmitEditing={analyzeFoodByText}
                    />
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.nutriSearchBtn,
                      (!foodQuery.trim() || analyzing) && { opacity: 0.5 },
                    ]}
                    onPress={analyzeFoodByText}
                    disabled={!foodQuery.trim() || analyzing}
                  >
                    <LinearGradient
                      colors={[COLORS.primary, "#FF8FAB"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.nutriSearchBtnGrad}
                    >
                      {analyzing ? (
                        <ActivityIndicator color={COLORS.white} />
                      ) : (
                        <Text style={styles.nutriSearchBtnText}>
                          Get Nutrition Info
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>

                  {!aiResult && !analyzing && (
                    <View style={styles.examplesSection}>
                      <Text style={styles.examplesTitle}>
                        Try these examples
                      </Text>
                      <View style={styles.examplesWrap}>
                        {[
                          "2 rotis and dal",
                          "1 cup rice with chicken curry",
                          "bowl of oats with banana",
                          "3 idli with sambar",
                          "chicken breast 150g",
                          "paneer butter masala",
                        ].map((ex) => (
                          <TouchableOpacity
                            key={ex}
                            style={styles.exampleChip}
                            onPress={() => setFoodQuery(ex)}
                          >
                            <Text style={styles.exampleChipText}>{ex}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {aiError && (
                    <View style={styles.errorCard}>
                      <Text style={styles.errorTitle}>⚠ {aiError}</Text>
                      <TouchableOpacity
                        onPress={() => setAiError(null)}
                        style={styles.errorBtn}
                      >
                        <Text style={styles.errorBtnText}>Try Again</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {aiResult && (
                    <View style={styles.resultsSection}>
                      <LinearGradient
                        colors={[COLORS.primary, "#FF8FAB"]}
                        style={styles.calHero}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <Text style={styles.calHeroLabel}>Total Calories</Text>
                        <Text style={styles.calHeroNumber}>
                          {aiResult.total_calories}
                        </Text>
                        <Text style={styles.calHeroUnit}>
                          kcal · range {aiResult.calorie_range}
                        </Text>
                      </LinearGradient>

                      <View style={styles.macrosRow}>
                        {[
                          {
                            label: "Protein",
                            value: aiResult.protein_g,
                            color: "#7dd3fc",
                            icon: "food-steak" as const,
                          },
                          {
                            label: "Carbs",
                            value: aiResult.carbs_g,
                            color: "#fbbf24",
                            icon: "bread-slice" as const,
                          },
                          {
                            label: "Fat",
                            value: aiResult.fat_g,
                            color: "#f472b6",
                            icon: "oil" as const,
                          },
                        ].map((m) => (
                          <View key={m.label} style={styles.macroCard}>
                            <MaterialCommunityIcons
                              name={m.icon}
                              size={20}
                              color={m.color}
                            />
                            <Text style={[styles.macroVal, { color: m.color }]}>
                              {m.value}g
                            </Text>
                            <Text style={styles.macroLbl}>{m.label}</Text>
                          </View>
                        ))}
                      </View>

                      <Text style={styles.itemsTitle}>Identified Items</Text>
                      <View style={styles.itemsList}>
                        {aiResult.items.map((item, i) => (
                          <View
                            key={i}
                            style={[
                              styles.itemRow,
                              i === aiResult.items.length - 1 && {
                                borderBottomWidth: 0,
                              },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <Text style={styles.itemName}>{item.name}</Text>
                              <Text style={styles.itemPortion}>
                                {item.portion}
                              </Text>
                            </View>
                            <Text style={styles.itemCal}>
                              {item.calories} kcal
                            </Text>
                          </View>
                        ))}
                      </View>

                      {aiResult.notes ? (
                        <View style={styles.notesCard}>
                          <Text style={styles.notesText}>{aiResult.notes}</Text>
                        </View>
                      ) : null}

                      <Text style={styles.disclaimer}>
                        Values are estimates. Actual nutrition may vary by
                        portion size.
                      </Text>

                      <View style={styles.actionRow}>
                        <TouchableOpacity
                          style={styles.retryBtn}
                          onPress={() => {
                            setAiResult(null);
                            setFoodQuery("");
                          }}
                        >
                          <Text style={styles.retryBtnText}>New Search</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.addLogBtn,
                            { opacity: saving ? 0.6 : 1 },
                          ]}
                          onPress={addAiResultToLog}
                          disabled={saving}
                        >
                          <LinearGradient
                            colors={[COLORS.primary, "#FF8FAB"]}
                            style={styles.addLogBtnGrad}
                          >
                            {saving ? (
                              <ActivityIndicator color={COLORS.white} />
                            ) : (
                              <Text style={styles.addLogBtnText}>
                                Add to Log
                              </Text>
                            )}
                          </LinearGradient>
                        </TouchableOpacity>
                      </View>
                    </View>
                  )}
                </ScrollView>
              </SafeAreaView>
            </LinearGradient>
          </KeyboardAvoidingView>
        </Modal>
      </SafeAreaView>
    </LinearGradient>
  );
}

interface ModalInputProps extends TextInputProps {
  label: string;
}
function ModalInput({ label, ...props }: ModalInputProps): React.JSX.Element {
  return (
    <View style={{ gap: 6, marginBottom: 4 }}>
      <Text style={styles.modalLabel}>{label}</Text>
      <View style={styles.modalInputWrap}>
        <TextInput
          style={styles.modalInput}
          placeholderTextColor={COLORS.textLight}
          {...props}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 12,
    marginBottom: 2,
  },
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
  },
  subheading: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  summaryCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    ...SHADOW.soft,
  },
  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  sumTitle: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginBottom: 4 },
  sumCalories: { fontSize: 38, fontWeight: "800", color: COLORS.white },
  sumUnit: { fontSize: 18, fontWeight: "400" },
  sumGoal: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  ringArea: { alignItems: "center" },
  ringPct: { fontSize: 28, fontWeight: "800", color: COLORS.white },
  ringLabel: { fontSize: 12, color: "rgba(255,255,255,0.7)" },
  progressBg: {
    height: 8,
    backgroundColor: "rgba(255,255,255,0.3)",
    borderRadius: 4,
    marginBottom: 16,
  },
  progressFill: { height: 8, backgroundColor: COLORS.white, borderRadius: 4 },
  macroSumRow: { flexDirection: "row", justifyContent: "space-around" },
  macroSumItem: { alignItems: "center", gap: 4 },
  macroSumVal: { fontSize: 16, fontWeight: "700", color: COLORS.white },
  macroSumLabel: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  mealCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  mealIconBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textDark },
  mealCalText: { fontSize: 12, color: COLORS.textLight },
  cameraBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
  },
  addBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  addBtnText: { fontSize: 13, fontWeight: "700" },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    gap: 8,
  },
  logName: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  logMacros: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  logCal: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  deleteBtn: { padding: 4 },
  emptyMeal: {
    fontSize: 13,
    color: COLORS.textLight,
    textAlign: "center",
    paddingVertical: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  modalTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textDark },
  tabSwitch: {
    flexDirection: "row",
    marginHorizontal: 20,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    padding: 4,
    marginBottom: 16,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
    alignItems: "center",
  },
  tabBtnActive: { backgroundColor: COLORS.white, ...SHADOW.card },
  tabBtnText: { fontSize: 14, fontWeight: "600", color: COLORS.textLight },
  tabBtnTextActive: { color: COLORS.primary },
  modalScroll: { paddingHorizontal: 20, paddingBottom: 40 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 8,
    marginBottom: 12,
    ...SHADOW.card,
  },
  searchInput: { flex: 1, fontSize: 15, color: COLORS.textDark },
  quickFoodRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 8,
    gap: 8,
    ...SHADOW.card,
  },
  quickFoodName: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  quickFoodMacros: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  quickFoodCal: { fontSize: 14, fontWeight: "700", color: COLORS.primary },
  customForm: { gap: 12 },
  row2: { flexDirection: "row", gap: 12 },
  modalLabel: { fontSize: 13, fontWeight: "600", color: COLORS.textDark },
  modalInputWrap: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    ...SHADOW.card,
  },
  modalInput: { fontSize: 15, color: COLORS.textDark },
  saveBtn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginTop: 8,
    ...SHADOW.soft,
  },
  saveBtnGrad: { paddingVertical: 16, alignItems: "center" },
  saveBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  // Image tab styles
  imageTab: { gap: 16, paddingTop: 16 },
  imagePicker: { alignItems: "center", gap: 24, paddingTop: 40 },
  imageTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textDark,
    textAlign: "center",
  },
  imageSubtitle: {
    fontSize: 14,
    color: COLORS.textMid,
    textAlign: "center",
    lineHeight: 20,
  },
  imageActions: {
    width: "100%",
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 20,
  },
  imageActionBtn: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 24,
    alignItems: "center",
    gap: 12,
    ...SHADOW.card,
  },
  imageActionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textDark,
    textAlign: "center",
  },
  imagePreview: { paddingHorizontal: 20 },
  selectedImage: {
    width: "100%",
    height: 300,
    borderRadius: RADIUS.lg,
    marginBottom: 16,
    ...SHADOW.card,
  },
  changeImageBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 12,
  },
  changeImageText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textMid,
  },
  analyzeBtn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginBottom: 12,
    ...SHADOW.soft,
  },
  analyzeBtnGrad: { paddingVertical: 16, alignItems: "center" },
  analyzeBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  geminiResultCard: { gap: 12, marginBottom: 20 },
  resultFoodName: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 8,
  },
  resultCalories: {
    borderRadius: RADIUS.lg,
    padding: 20,
    alignItems: "center",
  },
  resultCalLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  resultCalValue: {
    fontSize: 42,
    fontWeight: "800",
    color: COLORS.white,
  },
  resultMacros: {
    flexDirection: "row",
    gap: 10,
  },
  resultMacroItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 12,
    alignItems: "center",
    gap: 4,
    ...SHADOW.card,
  },
  macroItemValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  macroItemLabel: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: "600",
  },
  confidenceLabel: {
    fontSize: 12,
    color: COLORS.textMid,
    marginBottom: 12,
  },
  confidenceValue: { fontWeight: "600", color: COLORS.primary },
  continueBtn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    ...SHADOW.soft,
  },
  continueBtnGrad: { paddingVertical: 16, alignItems: "center" },
  continueBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },

  // Nutritionix modal
  searchHint: {
    fontSize: 14,
    color: COLORS.textMid,
    marginBottom: 12,
    fontWeight: "500",
  },
  nutriSearchBox: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    marginBottom: 12,
    minHeight: 60,
    ...SHADOW.card,
  },
  nutriSearchInput: { fontSize: 15, color: COLORS.textDark, lineHeight: 22 },
  nutriSearchBtn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginBottom: 24,
    ...SHADOW.soft,
  },
  nutriSearchBtnGrad: { paddingVertical: 16, alignItems: "center" },
  nutriSearchBtnText: { color: COLORS.white, fontSize: 16, fontWeight: "700" },
  examplesSection: { marginBottom: 16 },
  examplesTitle: {
    fontSize: 12,
    color: COLORS.textLight,
    fontWeight: "600",
    marginBottom: 10,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  examplesWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  exampleChip: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: COLORS.primary + "40",
    ...SHADOW.card,
  },
  exampleChipText: { fontSize: 13, color: COLORS.primary, fontWeight: "500" },
  errorCard: {
    backgroundColor: "#FFF0F0",
    borderRadius: RADIUS.md,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#ffcccc",
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 13,
    color: "#cc0000",
    textAlign: "center",
    marginBottom: 10,
  },
  errorBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: RADIUS.full,
  },
  errorBtnText: { color: COLORS.white, fontSize: 13, fontWeight: "600" },
  resultsSection: { gap: 16 },
  calHero: { borderRadius: RADIUS.xl, padding: 24, alignItems: "center" },
  calHeroLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 4,
  },
  calHeroNumber: {
    fontSize: 56,
    fontWeight: "800",
    color: COLORS.white,
    lineHeight: 60,
  },
  calHeroUnit: { fontSize: 12, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  macrosRow: { flexDirection: "row", gap: 12 },
  macroCard: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    padding: 14,
    alignItems: "center",
    gap: 4,
    ...SHADOW.card,
  },
  macroVal: { fontSize: 20, fontWeight: "800" },
  macroLbl: {
    fontSize: 10,
    color: COLORS.textLight,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  itemsTitle: {
    fontSize: 11,
    color: COLORS.textLight,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemsList: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.md,
    overflow: "hidden",
    ...SHADOW.card,
  },
  itemRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
  },
  itemName: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  itemPortion: { fontSize: 11, color: COLORS.textLight, marginTop: 2 },
  itemCal: { fontSize: 13, fontWeight: "700", color: COLORS.primary },
  notesCard: {
    backgroundColor: COLORS.primaryPale,
    borderRadius: RADIUS.md,
    padding: 14,
  },
  notesText: { fontSize: 12, color: COLORS.textMid, lineHeight: 18 },
  disclaimer: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
    lineHeight: 16,
  },
  actionRow: { flexDirection: "row", gap: 12 },
  retryBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: "center",
  },
  retryBtnText: { fontSize: 15, fontWeight: "600", color: COLORS.textMid },
  addLogBtn: {
    flex: 1,
    borderRadius: RADIUS.full,
    overflow: "hidden",
    ...SHADOW.soft,
  },
  addLogBtnGrad: { paddingVertical: 16, alignItems: "center" },
  addLogBtnText: { color: COLORS.white, fontSize: 15, fontWeight: "700" },
});
