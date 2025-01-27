import React, { useState, useEffect } from "react";
import { View, Text, TextInput, Button, StyleSheet, Alert } from "react-native";

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
  //google login
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
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Login</Text>
      {/* <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
      /> */}
      {/* <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      /> */}
      <View style={styles.googleButton}>
        <Button title="Login with Google" onPress={() => promptAsync()} disabled={!request} />
      </View>
      <View style={styles.guestButton}>
        <Button title="Continue as guest" onPress={handleGuestLogin} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", padding: 20 },
  title: { fontSize: 28, fontWeight: "bold", marginBottom: 20 },
  input: {
    width: "80%",
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderRadius: 5,
  },
  googleButton: {
    width: "80%",
    marginBottom: 10,
  },
  guestButton: {
    width: "auto",
    marginBottom: 10,
  }
});