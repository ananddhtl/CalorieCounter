import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SHADOW } from "../../constants/theme";

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

interface TabIconProps {
  name: IoniconsName;
  focused: boolean;
}

function TabIcon({ name, focused }: TabIconProps): React.JSX.Element {
  return (
    <View style={[styles.tabItem, focused && styles.tabItemActive]}>
      <Ionicons
        name={name}
        size={24}
        color={focused ? COLORS.primary : COLORS.textLight}
      />
    </View>
  );
}

export default function TabLayout(): React.JSX.Element {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: [
          styles.tabBar,
          {
            paddingBottom: Math.max(insets.bottom, 16),
          },
        ],
        tabBarShowLabel: false,
        tabBarItemStyle: styles.tabBarItem,
        tabBarBackground: () => null,
      }}
    >
      {/* Home Tab */}
      <Tabs.Screen
        name="index"
        options={{
          href: "/(tabs)",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "home" : "home-outline"}
              focused={focused}
            />
          ),
        }}
      />

      {/* Calories Tab */}
      <Tabs.Screen
        name="calories"
        options={{
          href: "/(tabs)/calories",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "restaurant" : "restaurant-outline"}
              focused={focused}
            />
          ),
        }}
      />

      {/* Water Tab */}
      <Tabs.Screen
        name="water"
        options={{
          href: "/(tabs)/water",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "water" : "water-outline"}
              focused={focused}
            />
          ),
        }}
      />

      <Tabs.Screen
        name="remainder"
        options={{
          href: "/(tabs)/remainder",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "notifications" : "notifications-outline"}
              focused={focused}
            />
          ),
        }}
      />

      {/* Profile Tab */}
      <Tabs.Screen
        name="profile"
        options={{
          href: "/(tabs)/profile",
          tabBarIcon: ({ focused }) => (
            <TabIcon
              name={focused ? "person" : "person-outline"}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: "absolute",
    bottom: 0,
    left: 16,
    right: 16,
    height: 70,
    borderRadius: 35,
    backgroundColor: COLORS.white,
    borderTopWidth: 0,
    elevation: 10,
    zIndex: 100,
    marginBottom: 0,
    paddingTop: 8,
    paddingHorizontal: 12,
    justifyContent: "space-around",
    alignItems: "center",
    flexDirection: "row",
    ...SHADOW.soft,
  },
  tabBarItem: {
    height: 70,
    paddingVertical: 0,
    paddingHorizontal: 0,
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tabItem: {
    alignItems: "center",
    justifyContent: "center",
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  tabItemActive: {
    backgroundColor: COLORS.primaryPale,
  },
});
