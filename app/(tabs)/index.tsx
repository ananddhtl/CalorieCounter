import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Card from "../../components/Card";
import ProgressBar from "../../components/ProgressBar";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { FoodLog, Profile, Reminder } from "../../constants/types";
import { calcBMI } from "../../hooks/useHealthCalc";
import { useSession } from "../../hooks/useSession";
import { supabase } from "../../hooks/useSupabase";

const TODAY = new Date().toISOString().split("T")[0];

export default function HomeScreen(): React.JSX.Element {
  const { session } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [foodToday, setFoodToday] = useState<FoodLog[]>([]);
  const [waterToday, setWaterToday] = useState(0);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    const uid = session?.user?.id;
    if (!uid) return;
    const [{ data: prof }, { data: food }, { data: water }, { data: rems }] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", uid).single(),
        supabase
          .from("food_logs")
          .select("*")
          .eq("user_id", uid)
          .eq("log_date", TODAY),
        supabase
          .from("water_logs")
          .select("amount_ml")
          .eq("user_id", uid)
          .eq("log_date", TODAY),
        supabase
          .from("reminders")
          .select("*")
          .eq("user_id", uid)
          .eq("is_active", true)
          .limit(4),
      ]);
    setProfile(prof as Profile);
    setFoodToday((food as FoodLog[]) || []);
    setWaterToday(
      ((water as { amount_ml: number }[]) || []).reduce(
        (s, r) => s + r.amount_ml,
        0,
      ),
    );
    setReminders((rems as Reminder[]) || []);
  }, [session]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const totalCal = foodToday.reduce((s, f) => s + f.calories, 0);
  const calorieGoal = profile?.daily_calorie_goal ?? 2000;
  const waterGoal = profile?.daily_water_goal_ml ?? 2500;
  const bmi =
    profile?.height_cm && profile?.weight_kg
      ? calcBMI(profile.weight_kg, profile.height_cm)
      : null;
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const firstName = profile?.name?.split(" ")[0] ?? "Beautiful";

  return (
    <LinearGradient colors={["#FFF0F5", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={COLORS.primary}
            />
          }
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>{greeting} 🌸</Text>
              <Text style={styles.name}>{firstName}!</Text>
            </View>
            <View style={styles.avatar}>
              <Text style={styles.avatarEmoji}>👸</Text>
            </View>
          </View>
          <Text style={styles.dateText}>
            {new Date().toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </Text>

          {/* Calorie Hero Card */}
          <LinearGradient
            colors={[COLORS.primary, "#FF8FAB"]}
            style={styles.calorieCard}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.calorieTop}>
              <View>
                <Text style={styles.calConsumed}>{totalCal}</Text>
                <Text style={styles.calLabel}>kcal consumed</Text>
              </View>
              <View style={styles.calRing}>
                <Text style={styles.calPct}>
                  {Math.round(Math.min(totalCal / calorieGoal, 1) * 100)}%
                </Text>
                <Text style={styles.calGoalLbl}>of goal</Text>
              </View>
            </View>
            <ProgressBar
              percent={totalCal / calorieGoal}
              height={8}
              color={COLORS.white}
              trackColor="rgba(255,255,255,0.3)"
            />
            <Text style={styles.calRemain}>
              {Math.max(calorieGoal - totalCal, 0)} kcal remaining
            </Text>
          </LinearGradient>

          {/* Stats Row */}
          <View style={styles.statsRow}>
            <Card style={styles.statCard}>
              <Text style={styles.statEmoji}>💧</Text>
              <Text style={styles.statValue}>
                {(waterToday / 1000).toFixed(1)}L
              </Text>
              <Text style={styles.statLabel}>of {waterGoal / 1000}L</Text>
              <ProgressBar
                percent={waterToday / waterGoal}
                height={4}
                color={COLORS.mint}
              />
            </Card>
            <Card style={styles.statCard}>
              <Text style={styles.statEmoji}></Text>
              <Text style={styles.statValue}>{bmi ?? "--"}</Text>
              <Text style={styles.statLabel}>BMI</Text>
              <ProgressBar
                percent={bmi ? Math.min((bmi - 15) / 25, 1) : 0}
                height={4}
                color={bmi && bmi < 25 ? COLORS.green : COLORS.warning}
              />
            </Card>
          </View>

          {/* Macros */}
          {foodToday.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>Todays Macros</Text>
              <View style={styles.macroRow}>
                {[
                  {
                    l: "Protein",
                    k: "protein_g" as keyof FoodLog,
                    c: COLORS.primary,
                    e: "",
                  },
                  {
                    l: "Carbs",
                    k: "carbs_g" as keyof FoodLog,
                    c: COLORS.peach,
                    e: "",
                  },
                  {
                    l: "Fat",
                    k: "fat_g" as keyof FoodLog,
                    c: COLORS.accent,
                    e: "",
                  },
                ].map((m) => (
                  <View key={m.k} style={styles.macroItem}>
                    <Text style={styles.macroEmoji}>{m.e}</Text>
                    <Text style={[styles.macroVal, { color: m.c }]}>
                      {foodToday
                        .reduce((s, f) => s + ((f[m.k] as number) || 0), 0)
                        .toFixed(0)}
                      g
                    </Text>
                    <Text style={styles.macroLabel}>{m.l}</Text>
                  </View>
                ))}
              </View>
            </Card>
          )}

          {/* Meals */}
          <Card>
            <Text style={styles.sectionTitle}>Today's Meals</Text>
            {(["breakfast", "lunch", "dinner", "snack"] as const).map(
              (meal) => {
                const items = foodToday.filter((f) => f.meal_type === meal);
                const cal = items.reduce((s, f) => s + f.calories, 0);
                const emojis = {
                  breakfast: "",
                  lunch: "",
                  dinner: "",
                  snack: "",
                };
                return (
                  <View key={meal} style={styles.mealRow}>
                    <Text style={styles.mealEmoji}>{emojis[meal]}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.mealName}>
                        {meal.charAt(0).toUpperCase() + meal.slice(1)}
                      </Text>
                      <Text style={styles.mealItems} numberOfLines={1}>
                        {items.length > 0
                          ? items.map((i) => i.food_name).join(", ")
                          : "Nothing logged yet"}
                      </Text>
                    </View>
                    <Text style={styles.mealCal}>
                      {cal > 0 ? `${cal} kcal` : "--"}
                    </Text>
                  </View>
                );
              },
            )}
          </Card>

          {/* Reminders */}
          {reminders.length > 0 && (
            <Card>
              <Text style={styles.sectionTitle}>Today's Reminders</Text>
              {reminders.map((rem) => (
                <View key={rem.id} style={styles.remRow}>
                  <View
                    style={[
                      styles.remIcon,
                      { backgroundColor: rem.color + "20" },
                    ]}
                  >
                    <Text style={{ fontSize: 20 }}>{rem.icon}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.remTitle}>{rem.title}</Text>
                    <Text style={styles.remTime}>
                      {rem.reminder_time?.slice(0, 5)}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.remBadge,
                      { backgroundColor: rem.color + "20" },
                    ]}
                  >
                    <Text style={[styles.remBadgeText, { color: rem.color }]}>
                      Active
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}

          <View style={{ height: 90 }} />
        </ScrollView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    marginBottom: 4,
  },
  greeting: { fontSize: 14, color: COLORS.textMid, fontWeight: "500" },
  name: { fontSize: 26, fontWeight: "800", color: COLORS.textDark },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryPale,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarEmoji: { fontSize: 26 },
  dateText: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  calorieCard: {
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    gap: 12,
    ...SHADOW.soft,
  },
  calorieTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  calConsumed: { fontSize: 36, fontWeight: "800", color: COLORS.white },
  calLabel: { fontSize: 13, color: "rgba(255,255,255,0.8)" },
  calRing: {
    backgroundColor: "rgba(255,255,255,0.2)",
    borderRadius: 40,
    width: 80,
    height: 80,
    alignItems: "center",
    justifyContent: "center",
  },
  calPct: { fontSize: 20, fontWeight: "800", color: COLORS.white },
  calGoalLbl: { fontSize: 10, color: "rgba(255,255,255,0.7)" },
  calRemain: { fontSize: 12, color: "rgba(255,255,255,0.8)" },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 0 },
  statCard: { flex: 1, gap: 4 },
  statEmoji: { fontSize: 24, marginBottom: 4 },
  statValue: { fontSize: 22, fontWeight: "800", color: COLORS.textDark },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginBottom: 6 },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 12,
  },
  macroRow: { flexDirection: "row", justifyContent: "space-around" },
  macroItem: { alignItems: "center", gap: 4 },
  macroEmoji: { fontSize: 24 },
  macroVal: { fontSize: 18, fontWeight: "800" },
  macroLabel: { fontSize: 11, color: COLORS.textLight },
  mealRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surface,
    gap: 10,
  },
  mealEmoji: { fontSize: 22, width: 32, textAlign: "center" },
  mealName: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  mealItems: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  mealCal: { fontSize: 13, fontWeight: "600", color: COLORS.primary },
  remRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 8,
  },
  remIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  remTitle: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  remTime: { fontSize: 12, color: COLORS.textLight },
  remBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  remBadgeText: { fontSize: 11, fontWeight: "600" },
});
