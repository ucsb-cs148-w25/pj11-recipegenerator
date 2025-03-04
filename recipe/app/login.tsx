import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Platform } from "react-native";
import * as GoogleAuthSession from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import { GoogleSignin, GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";


WebBrowser.maybeCompleteAuthSession();

const webClientId = "1075996537970-g1l2sfgkkg83k5llc8qlbc2ml7g8i2kr.apps.googleusercontent.com";

export type User = {
  token?: string;
  userId?: string;
  guest?: boolean;
  name?: string;
  email?: string;
};

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}


const sendUserDataToBackend = async (idToken: string) => {
  try {
    const response = await fetch("http://localhost:8000/google-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: idToken }),
    });

    if (!response.ok) {
      throw new Error(`Backend returned status ${response.status}`);
    }

    const result = await response.json();
    console.log("Backend response:", result);

    const decoded: any = jwtDecode(result.token);
    console.log("Decoded JWT:", decoded);

    await AsyncStorage.setItem("token", result.token);
    await AsyncStorage.setItem("userId", decoded.sub);
    
    return result;
  } catch (error) {
    console.error("Error sending user data to backend:", error);
    throw error;
  }
};

export default function Login({ setUser }: LoginProps) {
  const navigation = useNavigation();
  const [error, setError] = useState<any>();

  useEffect(() => {
    GoogleSignin.configure({
      webClientId,
      offlineAccess: true,
    });
  }, []);


  const nativeSignIn = async () => {
    try {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

      const info = await GoogleSignin.signIn();
      if (info && info.user) {
        const idToken = info.idToken;
        const backendResponse = await sendUserDataToBackend(idToken);

        const userData = {
          token: backendResponse.token,
          userId: backendResponse.userId,
          name: backendResponse.name,
          email: backendResponse.email,
        };

        setUser(userData);
      } else {
        Alert.alert("Sign In Error", "No user information returned from Google sign-in");
      }
    } catch (error: any) {
      Alert.alert("Native sign-in error", error.message || JSON.stringify(error));
      setError(error);
    }
  };

  const redirectUri = makeRedirectUri({ useProxy: true });


  const [request, response, promptAsync] = GoogleAuthSession.useAuthRequest({
    clientId: webClientId,
    scopes: ["profile", "email"],
    redirectUri,
    extraParams: { prompt: "select_account" },
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        handleAuthSession(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      Alert.alert("Authentication error", response.error || "Unknown error");
    }
  }, [response]);


  const handleAuthSession = async (accessToken: string) => {
    try {
      const backendResponse = await sendUserDataToBackend(accessToken);

      const userData = {
        token: backendResponse.token,
        userId: backendResponse.userId,
        name: backendResponse.name,
        email: backendResponse.email,
      };

      setUser(userData);
    } catch (error) {
      console.error("Failed to authenticate user:", error);
    }
  };

  const handleGuestLogin = () => {
    const guestUser = { guest: true, name: "Guest" };
    setUser(guestUser);
  };

  const renderGoogleSignInButton = () => {
    if (Platform.OS === "web") {
      return (
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => promptAsync({ useProxy: true })}
        >
          <Image source={require("./../assets/images/google-icon.png")} style={styles.buttonIcon} />
          <Text style={styles.buttonText}>Login with Google (Web)</Text>
        </TouchableOpacity>
      );
    } else {
      return (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Standard}
          color={GoogleSigninButton.Color.Dark}
          onPress={nativeSignIn}
        />
      );
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require("./../assets/images/icon.png")} style={styles.logo} />
      <Text style={styles.title}>Recipe Generator</Text>
      <Text style={styles.subtitle}>Your personal recipe assistant</Text>
      {renderGoogleSignInButton()}
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