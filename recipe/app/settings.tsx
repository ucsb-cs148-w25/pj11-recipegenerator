import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [friendsSuggestionEnabled, setFriendsSuggestionEnabled] =
    useState(false);
  const [friendsActivityEnabled, setFriendsActivityEnabled] = useState(false);

  // Function to reset tutorial flags in AsyncStorage
  const resetTutorial = async () => {
    try {
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");

      // Simple confirmation
      Alert.alert(
        "Tutorial Reset",
        "The tutorial has been reset. It will appear the next time you visit the Fridge page."
      );
    } catch (error) {
      console.error("Error resetting tutorial:", error);
      Alert.alert("Error", "Failed to reset tutorial. Please try again.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View style={styles.settingscard}>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => setNotificationsEnabled(value)}
          />
        </View>
      </View>
      <View style={styles.settingscard}>
        <Text style={styles.sectionTitle}>Friends & Privacy</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Friends Suggestion</Text>
          <Switch
            value={friendsSuggestionEnabled}
            onValueChange={(value) => setFriendsSuggestionEnabled(value)}
          />
        </View>
        <View style={styles.settingscategory}>
          <Text>Allow friends to see your activity</Text>
          <Switch
            value={friendsActivityEnabled}
            onValueChange={(value) => setFriendsActivityEnabled(value)}
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
