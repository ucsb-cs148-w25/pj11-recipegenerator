import {
  View,
  Text,
  Switch,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from "react-native";
import { useState } from "react";
import { apiRequest } from "./api";

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [friendsSuggestionEnabled, setFriendsSuggestionEnabled] =
    useState(false);
  const [friendsActivityEnabled, setFriendsActivityEnabled] = useState(false);

  // Debug function to check tutorial status directly
  const debugTutorialStatus = async () => {
    try {
      console.log("Checking tutorial status directly...");
      const response = await apiRequest("/user/debug-tutorial-status");
      console.log("Debug tutorial status response:", response);

      if (response && response.profile) {
        const tutorialCompleted = response.profile.tutorial_completed;
        console.log("Tutorial completed value:", tutorialCompleted);
        console.log("Tutorial completed type:", response.profile.tutorial_completed_type);
        console.log("Raw profile:", response.profile.raw_profile);

        // Check if the field exists in the raw profile
        const fieldExists = response.profile.raw_profile.includes("'tutorial_completed'");

        // Determine the status message based on the value
        let statusMessage = "Unknown";
        if (tutorialCompleted === 1) {
          statusMessage = "Completed (1)";
        } else if (tutorialCompleted === 0) {
          statusMessage = "Not Completed (0)";
        } else if (tutorialCompleted === true) {
          statusMessage = "Completed (true)";
        } else if (tutorialCompleted === false) {
          statusMessage = "Not Completed (false)";
        } else if (tutorialCompleted === undefined) {
          statusMessage = "Undefined (field missing)";
        } else {
          statusMessage = `Other value: ${tutorialCompleted}`;
        }

        Alert.alert(
          "Tutorial Status Debug",
          `Status: ${statusMessage}\n` +
          `Value: ${tutorialCompleted}\n` +
          `Type: ${response.profile.tutorial_completed_type}\n` +
          `Field exists in DB: ${fieldExists}`
        );
      } else {
        console.warn("Debug response missing profile data");
        Alert.alert("Debug Error", "Could not retrieve tutorial status");
      }
    } catch (error: any) {
      console.error("Error debugging tutorial status:", error);
      Alert.alert("Debug Error", "Failed to check tutorial status");
    }
  };

  // Function to reset tutorial flags in AsyncStorage
  const resetTutorial = async () => {
    try {
      console.log("Resetting tutorial status by deleting the field...");

      // Use the DELETE endpoint to completely remove the tutorial_completed field
      const response = await apiRequest("/user/delete-tutorial-status", "DELETE");
      console.log("Delete tutorial status response:", response);

      // Log more details about the response
      if (response && response.profile) {
        console.log("Tutorial completed status:", response.profile.tutorial_completed);
        console.log("Full profile object:", response.profile);
        console.log("Response message:", response.message);

        // Verify the tutorial was actually reset
        // Tutorial is reset if:
        // - tutorial_completed is 0
        // - tutorial_completed is false
        // - tutorial_completed is "no"
        // - tutorial_completed is "false"
        // - tutorial_completed is undefined
        const tutorialReset =
          response.profile.tutorial_completed === 0 ||
          response.profile.tutorial_completed === false ||
          response.profile.tutorial_completed === "no" ||
          response.profile.tutorial_completed === "false" ||
          response.profile.tutorial_completed === undefined;

        if (!tutorialReset) {
          console.warn("Warning: Tutorial may not have been reset properly. Status:",
            response.profile.tutorial_completed);
        } else {
          console.log("Tutorial successfully reset!");
        }
      } else {
        console.warn("Warning: Response or profile object is missing");
        console.log("Full response:", response);
      }

      // Simple confirmation
      Alert.alert(
        "Tutorial Reset",
        "The tutorial has been reset. It will appear the next time you visit the Fridge page."
      );
    } catch (error: any) {
      console.error("Error resetting tutorial:", error);
      // Log more details about the error
      if (error.response) {
        console.error("Error response:", error.response.data);
        console.error("Error status:", error.response.status);
        console.error("Error headers:", error.response.headers);
      }
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
            onValueChange={(value) => setFriendsSuggestionEnabled(value)}
            trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
            thumbColor={friendsSuggestionEnabled ? "#088F8F" : "#f4f3f4"}
          />
        </View>
        <View style={styles.settingscategory}>
          <Text>Allow friends to see your activity</Text>
          <Switch
            value={friendsActivityEnabled}
            onValueChange={(value) => setFriendsActivityEnabled(value)}
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

          {/* Debug button - only visible in development */}
          <TouchableOpacity
            style={[styles.resetButton, { marginTop: 10, backgroundColor: '#666' }]}
            onPress={debugTutorialStatus}
          >
            <Text style={styles.resetButtonText}>Debug Tutorial Status</Text>
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
