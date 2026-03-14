import { Slot, useRouter, useSegments } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import { Animated, Easing, StyleSheet, Text, View } from "react-native";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { COLORS } from "../constants/theme";
import { NotificationService } from "../hooks/notificationService";
import { TaskService } from "../hooks/taskService";
import { useSession } from "../hooks/useSession";

SplashScreen.preventAutoHideAsync();

function RomanticSplashScreen() {
  const fadeAnim = new Animated.Value(0);
  const scaleAnim = new Animated.Value(0.3);
  const heartAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.elastic(1.2),
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(heartAnim, {
            toValue: 1.2,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(heartAnim, {
            toValue: 1,
            duration: 500,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]),
      ).start(),
    ]).start();
  }, []);

  return (
    <View style={styles.splashContainer}>
      <Animated.View
        style={[
          styles.contentContainer,
          {
            opacity: fadeAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      >
        <Text style={styles.title}>Ti-Amour</Text>

        <Animated.Text
          style={[
            styles.heart,
            {
              transform: [{ scale: heartAnim }],
            },
          ]}
        >
          ❤️
        </Animated.Text>

        <Text style={styles.subtitle}>I love you a lot</Text>

        <View style={styles.decorativeContainer}>
          <Text style={styles.decorativeText}>✨</Text>
          <Text style={styles.decorativeText}>💫</Text>
          <Text style={styles.decorativeText}>✨</Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function RootLayout() {
  const { session, loading } = useSession();
  const segments = useSegments();
  const router = useRouter();
  const [showSplash, setShowSplash] = useState(true);

  // Initialize notification services
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        console.log("Initializing notification services...");
        await NotificationService.initialize();
        await TaskService.registerBackgroundTask();
        await TaskService.checkStatus();
        console.log("Notification services initialized successfully");
      } catch (error) {
        console.error("Error initializing notifications:", error);
      }
    };

    initializeNotifications();

    // Cleanup on unmount
    return () => {
      NotificationService.cleanup();
    };
  }, []);

  useEffect(() => {
    if (loading) return;

    SplashScreen.hideAsync();

    const timer = setTimeout(() => {
      setShowSplash(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [loading]);

  useEffect(() => {
    if (loading || showSplash) return;

    const inAuthGroup = segments[0] === "auth";

    if (!session && !inAuthGroup) {
      router.replace("/auth/onboarding");
    } else if (session && inAuthGroup) {
      router.replace("/(tabs)");
    }
  }, [session, loading, showSplash]);

  if (loading || showSplash) {
    return <RomanticSplashScreen />;
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="dark" backgroundColor={COLORS.background} />
      <Slot />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splashContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FFE4E1",
  },
  contentContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  title: {
    fontSize: 48,
    fontWeight: "bold",
    color: "#FF1493",
    fontFamily: "System",
    textShadowColor: "rgba(255, 20, 147, 0.3)",
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 5,
    marginBottom: 20,
  },
  heart: {
    fontSize: 60,
    marginVertical: 20,
  },
  subtitle: {
    fontSize: 28,
    color: "#C71585",
    fontFamily: "System",
    fontStyle: "italic",
    marginBottom: 30,
    textAlign: "center",
  },
  decorativeContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 15,
    marginTop: 20,
  },
  decorativeText: {
    fontSize: 24,
  },
});
