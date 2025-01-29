import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Alert, Image } from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as SecureStore from "expo-secure-store";

export type User = {
  token?: string;
  guest?: boolean;
};

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Login({ setUser }: LoginProps) {
  const [request, response, promptAsync] = Google.useAuthRequest({
    clientId: "1075996537970-g1l2sfgkkg83k5llc8qlbc2ml7g8i2kr.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      const { authentication } = response;
      handleGoogleLogin(authentication.accessToken);
    }
  }, [response]);

  const handleGoogleLogin = async (accessToken: string) => {
    try {
      const response = await fetch("http://localhost:5000/google-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken }),
      });

      const data = await response.json();
      if (response.ok) {
        await SecureStore.setItemAsync("token", data.token);
        setUser({ token: data.token });
        Alert.alert("Success", "Login successful!");
      } else {
        Alert.alert("Error", data.error || "Google login failed");
      }
    } catch (err) {
      Alert.alert("Error", "Something went wrong with Google login");
    }
  };

  const handleGuestLogin = () => {
    setUser({ guest: true });
  };

  return (
    <View style={styles.container}>
      <Image source={require("./../assets/images/icon.png")} style={styles.logo} />
      <Text style={styles.title}>Recipe Generator</Text>
      <Text style={styles.subtitle}>Your personal recipe assistant</Text>
  

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => promptAsync()}
        disabled={!request}
      >
        <Image source={require("./../assets/images/google-icon.png")} style={styles.buttonIcon} />
        <Text style={styles.buttonText}>Login with Google</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.guestButton]} onPress={handleGuestLogin}>
        <Text style={styles.buttonText}>Continue as Guest</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#E0FFFF",
  },
  logo: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#088F8F",
  },
  subtitle: {
    fontSize: 16,
    color: "#666",
    marginBottom: 40,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    width: "80%",
    justifyContent: "center",
    marginBottom: 15,
  },
  googleButton: {
    backgroundColor: "#088F8F",
  },
  guestButton: {
    backgroundColor: "#666",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#fff",
    marginLeft: 10,
  },
  buttonIcon: {
    width: 30,
    height: 30,
  },
});