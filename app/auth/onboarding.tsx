import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, RADIUS, SHADOW } from "../../constants/theme";

interface Slide {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  bg: [string, string];
}

const SLIDES: Slide[] = [
  {
    icon: "flower-outline",
    title: "Welcome to\n For Ti Amour ",
    subtitle:
      "Your personal wellness companion,\ndesigned with love just for you by Your Loved One💕",
    bg: ["#FFF0F5", "#FFE4EE"],
  },
  {
    icon: "restaurant-outline",
    title: "Track Every\nDelicious Bite",
    subtitle:
      "Log meals, count calories, and reach\nyour health goals beautifully",
    bg: ["#FFF5E4", "#FFE8D6"],
  },
  {
    icon: "water-outline",
    title: "Stay Hydrated\n& Glowing",
    subtitle:
      "Track water intake with gentle\nreminders to sip throughout the day",
    bg: ["#E4F8FF", "#C8F4FA"],
  },
  {
    icon: "medical-outline",
    title: "Never Miss a\nMedicine Again",
    subtitle: "Smart reminders for medicines,\nvitamins, and wellness routines",
    bg: ["#F3E4FF", "#E8BAFF"],
  },
];

export default function OnboardingScreen(): React.JSX.Element {
  const [index, setIndex] = useState(0);
  const router = useRouter();
  const slide = SLIDES[index];

  const next = () => {
    if (index < SLIDES.length - 1) setIndex(index + 1);
    else router.push("/auth/signup");
  };

  const getIconSize = (iconName: string) => {
    // Make specific icons larger if needed
    return 80;
  };

  return (
    <LinearGradient colors={slide.bg} style={styles.container}>
      <SafeAreaView style={styles.safe}>
        {index < SLIDES.length - 1 && (
          <TouchableOpacity
            style={styles.skipBtn}
            onPress={() => router.push("/auth/signup")}
          >
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>
        )}

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <View style={styles.iconContainer}>
              <Ionicons
                name={slide.icon}
                size={getIconSize(slide.icon)}
                color={COLORS.primary}
              />
            </View>
            <View style={[styles.blob, styles.blob1]} />
            <View style={[styles.blob, styles.blob2]} />
            <View style={[styles.blob, styles.blob3]} />
          </View>
          <Text style={styles.title}>{slide.title}</Text>
          <Text style={styles.subtitle}>{slide.subtitle}</Text>
          <View style={styles.dots}>
            {SLIDES.map((_, i) => (
              <View
                key={i}
                style={[styles.dot, i === index && styles.dotActive]}
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={styles.btn}
          onPress={next}
          activeOpacity={0.85}
        >
          <LinearGradient
            colors={[COLORS.primary, "#FF8FAB"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.btnGrad}
          >
            <View style={styles.btnContent}>
              <Text style={styles.btnText}>
                {index < SLIDES.length - 1 ? "Continue" : "Let's Bloom"}
              </Text>
              <Ionicons
                name={
                  index < SLIDES.length - 1
                    ? "arrow-forward-outline"
                    : "flower-outline"
                }
                size={20}
                color="white"
                style={styles.btnIcon}
              />
            </View>
          </LinearGradient>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.loginLink}
          onPress={() => router.push("/auth/login")}
        >
          <Text style={styles.loginText}>
            Already have an account?{" "}
            <Text style={styles.loginBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safe: { flex: 1, paddingHorizontal: 28 },
  skipBtn: { alignSelf: "flex-end", paddingVertical: 12 },
  skipText: { fontSize: 15, color: COLORS.textMid, fontWeight: "500" },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  iconWrap: {
    width: 240,
    height: 240,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  blob: {
    position: "absolute",
    borderRadius: 999,
    opacity: 0.25,
  },
  blob1: {
    width: 160,
    height: 160,
    backgroundColor: COLORS.primary,
    top: 20,
    left: 20,
    transform: [{ scale: 1.2 }],
  },
  blob2: {
    width: 120,
    height: 120,
    backgroundColor: COLORS.accentLight,
    bottom: 10,
    right: 15,
    transform: [{ scale: 1.1 }],
  },
  blob3: {
    width: 90,
    height: 90,
    backgroundColor: COLORS.peachLight,
    top: 40,
    right: 10,
    transform: [{ scale: 1.3 }],
  },
  title: {
    fontSize: 32,
    fontWeight: "800",
    color: COLORS.textDark,
    textAlign: "center",
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.textMid,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 40,
  },
  dots: { flexDirection: "row", gap: 8 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primaryLight,
  },
  dotActive: { width: 24, backgroundColor: COLORS.primary },
  btn: {
    borderRadius: RADIUS.full,
    overflow: "hidden",
    marginBottom: 16,
    ...SHADOW.soft,
  },
  btnGrad: {
    paddingVertical: 18,
    paddingHorizontal: 32,
    alignItems: "center",
  },
  btnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  btnText: {
    color: COLORS.white,
    fontSize: 17,
    fontWeight: "700",
  },
  btnIcon: {
    marginLeft: 4,
  },
  loginLink: { alignItems: "center", paddingBottom: 12 },
  loginText: { fontSize: 14, color: COLORS.textMid },
  loginBold: { color: COLORS.primary, fontWeight: "700" },
});
