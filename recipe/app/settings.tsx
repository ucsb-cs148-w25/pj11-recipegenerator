import { View, Text, Switch, StyleSheet } from "react-native";
import { useState } from "react";

export default function SettingsPage() {
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Settings</Text>
      <View>
        <Text style={styles.sectionTitle}>Notifications</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Notifications</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => setNotificationsEnabled(value)}
          />
        </View>
      </View>
      <View>
        <Text style={styles.sectionTitle}>Friends & Privacy</Text>
        <View style={styles.settingscategory}>
          <Text>Enable Friends Suggestion</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => setNotificationsEnabled(value)}
          />
        </View>
        <View style={styles.settingscategory}>
          <Text>Allow friends to see your activity</Text>
          <Switch
            value={notificationsEnabled}
            onValueChange={(value) => setNotificationsEnabled(value)}
          />
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
    color: '#088F8F',
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
});
