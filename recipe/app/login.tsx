import React, { useState, useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert, Platform } from "react-native";
import * as GoogleAuthSession from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import {GoogleSignin, GoogleSigninButton } from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";

WebBrowser.maybeCompleteAuthSession();

const webClientId =
  "1075996537970-g1l2sfgkkg83k5llc8qlbc2ml7g8i2kr.apps.googleusercontent.com";

export type User = {
  token?: string;
  serverAuthCode?: string;
  guest?: boolean;
  name?: string;
  email?: string;
};

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const sendUserDataToBackend = async (user: { token?: string; serverAuthCode?: string; name?: string; email?: string }) => {
  console.log("Sending user data to backend:", user);
  console.log("User data payload (JSON):", JSON.stringify(user, null, 2));
  
  // try {
  //   const response = await fetch("http://localhost:8000/", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify(user),
  //   });
    
  //   if (!response.ok) {
  //     throw new Error(`Backend returned status ${response.status}`);
  //   }
    
  //   const result = await response.json();
  //   console.log("Backend response:", result);
  //   return result;
  // } catch (error) {
  //   console.error("Error sending user data to backend:", error);
  //   throw error;
  // }
};

export default function Login({ setUser }: LoginProps) {
  const navigation = useNavigation();
  const [error, setError] = useState<any>();
  const [userInfo, setUserInfo] = useState<any>();

  const configureGoogleSignin = () => {
    GoogleSignin.configure({
      webClientId,
      iosClientId: "1075996537970-k52kpdt259g53acl1k31jf4f22uld8ep.apps.googleusercontent.com",
      offlineAccess: true,
    });
  };

  useEffect(() => {
    configureGoogleSignin();
  }, []);

  const nativeSignIn = async () => {
    console.log("Pressed native sign in");
    try {
      console.log("Checking for Google Play Services...");
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      console.log("Google Play Services are available.");

      console.log("Attempting native Google sign in...");
      const info = await GoogleSignin.signIn();
      console.log("Native sign in success:", info);

      const result = info.data ? info.data : info;
      if (result && result.user) {
        const userData = {
          token: result.idToken,
          serverAuthCode: result.serverAuthCode,
          name: result.user.name,
          email: result.user.email,
        };
        setUserInfo(info);
        setUser(userData);

        await sendUserDataToBackend(userData);
      } else {
        console.error("No user information returned. Full info:", info);
        Alert.alert("Sign In Error", "No user information returned from Google sign in");
      }
    } catch (error: any) {
      console.error("Native sign in error:", error);
      Alert.alert("Native sign in error", error.message || JSON.stringify(error));
      setError(error);
    }
  };

  const redirectUri = makeRedirectUri({ useProxy: true });
  console.log("Redirect URI:", redirectUri);

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
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      console.error("Expo AuthSession error", response.error);
      Alert.alert("Authentication error", response.error || "Unknown error");
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`
      );
      const user = await res.json();
      console.log("User info (Expo AuthSession):", user);
      const userData = { token, name: user.name, email: user.email };
      setUser(userData);
      await sendUserDataToBackend(userData);
    } catch (error) {
      console.error("Failed to fetch user info", error);
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
          <Text style={styles.buttonText}>Login with Google (AuthSession)</Text>
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
