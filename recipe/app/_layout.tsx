import React, { useState, useEffect } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

import Homepage from "./index";
import FridgePage from "./fridge";
import RecipePage from "./recipe";
import ProfilePage from "./profile";
import SettingsPage, { initializeDefaultSettings } from "./settings";

import Login, { User } from "./login";

const Tab = createBottomTabNavigator();

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Initialize app settings on first load
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Initialize default settings
        await initializeDefaultSettings();
      } catch (error) {
        console.error("Error initializing app settings:", error);
      }
    };

    initializeApp();
  }, []);

  // Check for existing user session on app start
  useEffect(() => {
    const checkUserSession = async () => {
      try {
        const token = await AsyncStorage.getItem("token");
        const userId = await AsyncStorage.getItem("userId");
        const isGuest = await AsyncStorage.getItem("isGuest");
        const userName = await AsyncStorage.getItem("userName");
        const userEmail = await AsyncStorage.getItem("userEmail");
        const userPicture = await AsyncStorage.getItem("userPicture");

        if (token || isGuest === "true") {
          const userData: User = {
            token: token || undefined,
            userId: userId || undefined,
            guest: isGuest === "true",
            name: userName || undefined,
            email: userEmail || undefined,
            picture: userPicture || undefined,
          };
          setUser(userData);
        }
      } catch (error) {
        console.error("Error restoring user session:", error);
      } finally {
        setIsLoading(false);
      }
    };

    checkUserSession();
  }, []);

  // Save user data to AsyncStorage when it changes
  useEffect(() => {
    const saveUserData = async () => {
      if (user) {
        try {
          // Store user data
          if (user.token) await AsyncStorage.setItem("token", user.token);
          if (user.userId) await AsyncStorage.setItem("userId", user.userId);
          if (user.guest) await AsyncStorage.setItem("isGuest", "true");
          if (user.name) await AsyncStorage.setItem("userName", user.name);
          if (user.email) await AsyncStorage.setItem("userEmail", user.email);
          if (user.picture)
            await AsyncStorage.setItem("userPicture", user.picture);
          else await AsyncStorage.removeItem("userPicture");
        } catch (error) {
          console.error("Error saving user data:", error);
        }
      }
    };

    saveUserData();
  }, [user]);

  if (isLoading) {
    // You could return a loading screen here
    return null;
  }

  if (!user) {
    return <Login setUser={setUser} />;
  }

  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        // headerShown: false,
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
      <Tab.Screen name="Profile">
        {() => <ProfilePage setUser={setUser} user={user} />}
      </Tab.Screen>
      <Tab.Screen name="Settings" component={SettingsPage} />
    </Tab.Navigator>
  );
}
