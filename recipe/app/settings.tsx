import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { EventRegister } from "react-native-event-listeners";

// Initialize default settings if they don't exist
export const initializeDefaultSettings = async () => {
  try {
    // Check if friendsSuggestionEnabled has been set
    const friendsSuggestionValue = await AsyncStorage.getItem(
      "friendsSuggestionEnabled"
    );

    // If it hasn't been set, set it to true (default)
    if (friendsSuggestionValue === null) {
      await AsyncStorage.setItem("friendsSuggestionEnabled", "true");
      console.log("Initialized friendsSuggestionEnabled to true (default)");
    }

    // Initialize other settings with defaults as needed
    const notificationsValue = await AsyncStorage.getItem(
      "notificationsEnabled"
    );
    if (notificationsValue === null) {
      await AsyncStorage.setItem("notificationsEnabled", "true");
    }

    const friendsActivityValue = await AsyncStorage.getItem(
      "friendsActivityEnabled"
    );
    if (friendsActivityValue === null) {
      await AsyncStorage.setItem("friendsActivityEnabled", "true");
    }
  } catch (error) {
    console.error("Error initializing default settings:", error);
  }
};

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [friendsSuggestionEnabled, setFriendsSuggestionEnabled] =
    useState(true);
  const [friendsActivityEnabled, setFriendsActivityEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load settings from AsyncStorage on component mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // Initialize default settings first
        await initializeDefaultSettings();

        const notificationsValue = await AsyncStorage.getItem(
          "notificationsEnabled"
        );
        const friendsSuggestionValue = await AsyncStorage.getItem(
          "friendsSuggestionEnabled"
        );
        const friendsActivityValue = await AsyncStorage.getItem(
          "friendsActivityEnabled"
        );

        // Set notifications (default to false)
        setNotificationsEnabled(notificationsValue === "true");

        // Set friends suggestion (default to true if not set)
        setFriendsSuggestionEnabled(friendsSuggestionValue !== "false");

        // Set friends activity (default to false)
        setFriendsActivityEnabled(friendsActivityValue === "true");

        setIsLoading(false);
      } catch (error) {
        console.error("Error loading settings:", error);
        setIsLoading(false);
      }
    };

    loadSettings();
  }, []);

  const saveSettings = async (key: string, value: boolean) => {
    try {
      await AsyncStorage.setItem(key, value.toString());
      console.log(`Saved setting ${key}: ${value}`);

      EventRegister.emit("settingsChanged", { key, value });
    } catch (error) {
      console.error(`Error saving setting ${key}:`, error);
      Alert.alert("Error", "Failed to save settings. Please try again.");
    }
  };

  const handleNotificationsToggle = (value: boolean) => {
    setNotificationsEnabled(value);
    saveSettings("notificationsEnabled", value);
  };

  const handleFriendsSuggestionToggle = (value: boolean) => {
    setFriendsSuggestionEnabled(value);
    saveSettings("friendsSuggestionEnabled", value);
  };

  const handleFriendsActivityToggle = (value: boolean) => {
    setFriendsActivityEnabled(value);
    saveSettings("friendsActivityEnabled", value);
  };

  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");

      Alert.alert(
        "Tutorial Reset",
        "The tutorial has been reset. It will appear the next time you visit the Fridge page."
      );
    } catch (error) {
      console.error("Error resetting tutorial:", error);
      Alert.alert("Error", "Failed to reset tutorial. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <Text>Loading settings...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.settingscard}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={handleNotificationsToggle}
            trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
            thumbColor={notificationsEnabled ? "#088F8F" : "#f4f3f4"}
          />
        </View>
      </View>
      <View style={styles.settingscard}>
        <Text style={styles.sectionTitle}>Friends & Privacy</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Friends Suggestion</Text>
          <Switch
            value={friendsSuggestionEnabled}
            onValueChange={handleFriendsSuggestionToggle}
            trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
            thumbColor={friendsSuggestionEnabled ? "#088F8F" : "#f4f3f4"}
          />
        </View>
        <View style={styles.settingscategory}>
          <Text>Allow friends to see your activity</Text>
          <Switch
            value={friendsActivityEnabled}
            onValueChange={handleFriendsActivityToggle}
            trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
            thumbColor={friendsActivityEnabled ? "#088F8F" : "#f4f3f4"}
          />
        </View>
      </View>
      <View style={styles.settingscard}>
        <Text style={styles.sectionTitle}>Help & Tutorials</Text>
        <View style={styles.tutorialButtonContainer}>
          <Text style={styles.settingDescription}>
            Reset the tutorial to see it again the next time you visit the
            Fridge page
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={resetTutorial}>
            <Text style={styles.resetButtonText}>Reset Tutorial</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F6FFF7",
  },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    marginBottom: 15,
    color: "#088F8F",
    fontWeight: "bold",
    letterSpacing: 0.5,
  },
  settingscategory: {
    flexDirection: "row",
    color: "#F6FFF7",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 3,
  },
  sectionTitle: {
    fontSize: 25,
    color: "#088F8F",
  },
  settingscard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
  },
  tutorialButtonContainer: {
    marginTop: 10,
    alignItems: "center",
  },
  settingDescription: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  resetButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginTop: 5,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  resetButtonText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
  },
});
