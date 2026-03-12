import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";
import { QuickWaterAmount, WaterLog } from "../../constants/types";
import { supabase } from "../../hooks/useSupabase";

const TODAY = new Date().toISOString().split("T")[0];

const QUICK_AMOUNTS: QuickWaterAmount[] = [
  { label: "Small glass", ml: 150, emoji: "🥛" },
  { label: "Glass", ml: 250, emoji: "🥤" },
  { label: "Large glass", ml: 350, emoji: "🫗" },
  { label: "Bottle", ml: 500, emoji: "💧" },
  { label: "Large bottle", ml: 750, emoji: "🍶" },
  { label: "1L bottle", ml: 1000, emoji: "🫙" },
];

export default function WaterScreen(): React.JSX.Element {
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [goal, setGoal] = useState<number>(2500);
  const [customMl, setCustomMl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const totalMl = logs.reduce((s, l) => s + l.amount_ml, 0);
  const pct = Math.min(totalMl / goal, 1);
  const glasses = Math.floor(totalMl / 250);

  const fetchData = useCallback(async (): Promise<void> => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
    const [{ data: waterData }, { data: prof }] = await Promise.all([
      supabase
        .from("water_logs")
        .select("*")
        .eq("user_id", user.id)
        .eq("log_date", TODAY)
        .order("logged_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("daily_water_goal_ml")
        .eq("id", user.id)
        .single(),
    ]);
    setLogs((waterData as WaterLog[]) || []);
    if (prof?.daily_water_goal_ml) setGoal(prof.daily_water_goal_ml);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const addWater = async (ml: number): Promise<void> => {
    if (!ml || ml <= 0) {
      Alert.alert(" Oops!", "Enter a valid amount");
      return;
    }
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }
    const { error } = await supabase
      .from("water_logs")
      .insert({ user_id: user.id, amount_ml: ml, log_date: TODAY });
    if (!error) {
      await fetchData();
      setCustomMl("");
    } else Alert.alert("Error", error.message);
    setLoading(false);
  };

  const deleteLog = async (id: string): Promise<void> => {
    await supabase.from("water_logs").delete().eq("id", id);
    fetchData();
  };

  return (
    <LinearGradient colors={["#E4F8FF", "#FFF8FB"]} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scroll}
        >
          <Text style={styles.heading}>💧 Water Tracker</Text>
          <Text style={styles.subheading}>Hydration keeps you glowing</Text>

          <View style={styles.waterCard}>
            <View style={styles.bottleOuter}>
              <View style={[styles.waterFill, { height: `${pct * 100}%` }]}>
                <LinearGradient
                  colors={[COLORS.mint, "#43B8CD"]}
                  style={{ flex: 1 }}
                />
              </View>
              <Text style={styles.bottleAmount}>
                {(totalMl / 1000).toFixed(2)}L
              </Text>
              <Text style={styles.bottleGoal}>of {goal / 1000}L goal</Text>
            </View>
            <View style={styles.waterStats}>
              {[
                { val: String(glasses), lbl: "Glasses" },
                { val: `${Math.round(pct * 100)}%`, lbl: "of goal" },
                { val: String(Math.max(goal - totalMl, 0)), lbl: "ml left" },
              ].map((s, i) => (
                <React.Fragment key={i}>
                  {i > 0 && <View style={styles.statDivider} />}
                  <View style={styles.waterStat}>
                    <Text style={styles.waterStatVal}>{s.val}</Text>
                    <Text style={styles.waterStatLabel}>{s.lbl}</Text>
                  </View>
                </React.Fragment>
              ))}
            </View>
            <View
              style={[
                styles.hydrationBadge,
                {
                  backgroundColor:
                    pct >= 1
                      ? COLORS.greenLight
                      : pct >= 0.5
                        ? COLORS.mintLight
                        : COLORS.primaryPale,
                },
              ]}
            >
              <Text
                style={[
                  styles.hydrationText,
                  {
                    color:
                      pct >= 1
                        ? COLORS.green
                        : pct >= 0.5
                          ? COLORS.mint
                          : COLORS.primary,
                  },
                ]}
              >
                {pct >= 1
                  ? "Fully Hydrated!"
                  : pct >= 0.75
                    ? " Almost there!"
                    : pct >= 0.5
                      ? "Halfway hydrated"
                      : " Need more water!"}
              </Text>
            </View>
          </View>

          <View style={styles.quickCard}>
            <Text style={styles.sectionTitle}>Quick Add</Text>
            <View style={styles.quickGrid}>
              {QUICK_AMOUNTS.map((a) => (
                <TouchableOpacity
                  key={a.ml}
                  style={styles.quickBtn}
                  onPress={() => addWater(a.ml)}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[COLORS.mint + "30", COLORS.mintLight]}
                    style={styles.quickBtnGrad}
                  >
                    <Text style={styles.quickBtnMl}>{a.ml}ml</Text>
                    <Text style={styles.quickBtnLabel}>{a.label}</Text>
                  </LinearGradient>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.customCard}>
            <Text style={styles.sectionTitle}>Custom Amount</Text>
            <View style={styles.customRow}>
              <View style={styles.customInput}>
                <TextInput
                  style={styles.customInputField}
                  placeholder="Enter ml..."
                  placeholderTextColor={COLORS.textLight}
                  value={customMl}
                  onChangeText={setCustomMl}
                  keyboardType="numeric"
                />
                <Text style={styles.customUnit}>ml</Text>
              </View>
              <TouchableOpacity
                style={styles.customAddBtn}
                onPress={() => addWater(parseInt(customMl) || 0)}
                disabled={loading}
              >
                <LinearGradient
                  colors={[COLORS.mint, "#43B8CD"]}
                  style={styles.customAddGrad}
                >
                  <Text style={styles.customAddText}>+ Add</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>

          {logs.length > 0 && (
            <View style={styles.historyCard}>
              <Text style={styles.sectionTitle}>Today's Log</Text>
              {logs.map((log) => (
                <View key={log.id} style={styles.logRow}>
                  <Text style={styles.logEmoji}>💧</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logAmt}>{log.amount_ml} ml</Text>
                    <Text style={styles.logTime}>
                      {new Date(log.logged_at).toLocaleTimeString("en-US", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => deleteLog(log.id)}>
                    <Text style={styles.logDelete}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
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
  heading: {
    fontSize: 26,
    fontWeight: "800",
    color: COLORS.textDark,
    paddingTop: 12,
    marginBottom: 2,
  },
  subheading: { fontSize: 13, color: COLORS.textLight, marginBottom: 16 },
  waterCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.xl,
    padding: 20,
    marginBottom: 16,
    ...SHADOW.card,
    alignItems: "center",
    gap: 16,
  },
  bottleOuter: {
    width: 130,
    height: 200,
    borderRadius: 65,
    backgroundColor: COLORS.mintLight,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  waterFill: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    borderRadius: 65,
    minHeight: 10,
  },
  bottleAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.textDark,
    zIndex: 2,
  },
  bottleGoal: { fontSize: 12, color: COLORS.textMid, zIndex: 2 },
  waterStats: {
    flexDirection: "row",
    width: "100%",
    justifyContent: "space-around",
    alignItems: "center",
  },
  waterStat: { alignItems: "center", gap: 4 },
  waterStatVal: { fontSize: 20, fontWeight: "800", color: COLORS.textDark },
  waterStatLabel: {
    fontSize: 10,
    color: COLORS.textLight,
    textAlign: "center",
  },
  statDivider: { width: 1, height: 40, backgroundColor: COLORS.surface },
  hydrationBadge: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: RADIUS.full,
  },
  hydrationText: { fontSize: 14, fontWeight: "700" },
  quickCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textDark,
    marginBottom: 12,
  },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  quickBtn: { width: "30%", borderRadius: RADIUS.md, overflow: "hidden" },
  quickBtnGrad: { padding: 12, alignItems: "center", gap: 4 },
  quickBtnEmoji: { fontSize: 22 },
  quickBtnMl: { fontSize: 13, fontWeight: "700", color: "#43B8CD" },
  quickBtnLabel: { fontSize: 10, color: COLORS.textLight, textAlign: "center" },
  customCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  customRow: { flexDirection: "row", gap: 12 },
  customInput: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface,
    borderRadius: RADIUS.md,
    paddingHorizontal: 14,
    gap: 6,
  },
  customInputField: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textDark,
    paddingVertical: 12,
  },
  customUnit: { fontSize: 14, color: COLORS.textMid, fontWeight: "600" },
  customAddBtn: { borderRadius: RADIUS.md, overflow: "hidden" },
  customAddGrad: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  customAddText: { color: COLORS.white, fontWeight: "700", fontSize: 15 },
  historyCard: {
    backgroundColor: COLORS.white,
    borderRadius: RADIUS.lg,
    padding: 16,
    marginBottom: 12,
    ...SHADOW.card,
  },
  logRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.surface,
    gap: 10,
  },
  logEmoji: { fontSize: 20 },
  logAmt: { fontSize: 14, fontWeight: "600", color: COLORS.textDark },
  logTime: { fontSize: 12, color: COLORS.textLight },
  logDelete: { fontSize: 16, color: COLORS.textLight, padding: 4 },
});
