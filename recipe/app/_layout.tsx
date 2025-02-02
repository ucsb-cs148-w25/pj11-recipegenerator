import React, { useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";

import Homepage from "./index";
import FridgePage from "./fridge";
import RecipePage from "./recipe";
import ProfilePage from "./profile";
import SettingsPage from "./settings";

import Login, { User } from "./login";

const Tab = createBottomTabNavigator();

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);

  if (!user) {
    return <Login setUser={setUser} />
  }
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap = "home-outline";
          if (route.name === "Home") {
            iconName = focused ? "home" : "home-outline";
          } else if (route.name === "Fridge") {
            iconName = focused ? "basket" : "basket-outline";
          } else if (route.name === "Recipes") {
            iconName = focused ? "book" : "book-outline";
          } else if (route.name === "Profile") {
            iconName = focused ? "person" : "person-outline";
          } else if (route.name === "Settings") {
            iconName = focused ? "settings" : "settings-outline";
          }
          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: "tomato",
        tabBarInactiveTintColor: "gray",
      })}
    >
      <Tab.Screen name="Home" component={Homepage} />
      <Tab.Screen name="Fridge" component={FridgePage} />
      <Tab.Screen name="Recipes" component={RecipePage} />
      <Tab.Screen
        name="Profile"
        children={() => <ProfilePage setUser={setUser} />}
      />
      <Tab.Screen name="Settings" component={SettingsPage} />
    </Tab.Navigator>
  );
}
