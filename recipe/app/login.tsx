import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
  Alert,
  Platform,
} from "react-native";
import * as GoogleAuthSession from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";
import {
  GoogleSignin,
  GoogleSigninButton,
} from "@react-native-google-signin/google-signin";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { jwtDecode } from "jwt-decode";

WebBrowser.maybeCompleteAuthSession();

const webClientId =
  "1075996537970-g1l2sfgkkg83k5llc8qlbc2ml7g8i2kr.apps.googleusercontent.com"; // from Google Console (Web type)
const iosClientId =
  "1075996537970-k52kpdt259g53acl1k31jf4f22uld8ep.apps.googleusercontent.com"; // from Google Console (iOS type)

export type User = {
  token?: string; // could be either idToken or accessToken
  tokenType?: string; // "idToken" or "accessToken"
  userId?: string;
  guest?: boolean;
  name?: string;
  email?: string;
  picture?: string; // URL to the user's profile picture
};

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

// Helper function to get the appropriate backend URL based on platform
const getBackendUrl = () => {
  if (Platform.OS === 'web') {
    return 'http://127.0.0.1:8000';
  } else if (Platform.OS === 'android') {
    // Android emulator needs to use 10.0.2.2 to access host machine
    return 'http://10.0.2.2:8000';
  } else {
    // iOS simulator can use localhost
    return 'http://localhost:8000';
  }
};

const sendUserDataToBackend = async (user: User) => {
  console.log("[Login] Sending user data to backend:", {
    tokenType: user.tokenType,
    hasToken: !!user.token,
    name: user.name,
    email: user.email,
    guest: user.guest
  });

  try {
    const backendUrl = getBackendUrl();
    console.log(`[Login] Using backend URL: ${backendUrl}, platform: ${Platform.OS}`);
    console.log("[Login] Making request to /google-login endpoint");
    const response = await fetch(`${backendUrl}/google-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${user?.token}`},
      body: JSON.stringify(user),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[Login] Backend error response:", errorData);
      throw new Error(
        errorData.error || `Backend returned status ${response.status}`
      );
    }

    const result = await response.json();
    console.log("[Login] Backend response successful:", {
      hasToken: !!result.token,
      tokenLength: result.token?.length
    });

    try {
      const decoded: any = jwtDecode(result.token);
      console.log("[Login] Decoded JWT:", {
        sub: decoded.sub,
        exp: decoded.exp,
        iat: decoded.iat,
        expiresIn: decoded.exp ? new Date(decoded.exp * 1000).toISOString() : 'unknown'
      });
    } catch (jwtError) {
      console.error("[Login] Error decoding JWT:", jwtError);
    }

    return result;
  } catch (error) {
    console.error("[Login] Error sending user data to backend:", error);
    throw error;
  }
};

export default function Login({ setUser }: LoginProps) {
  const navigation = useNavigation();
  const [error, setError] = useState<any>();

  // For iOS/Android native config
  const configureGoogleSignin = () => {
    GoogleSignin.configure({
      webClientId, // optional for Android offline access
      iosClientId, // crucial for iOS native sign-in
      offlineAccess: true,
    });
  };

  useEffect(() => {
    configureGoogleSignin();
  }, []);

  // ========== NATIVE SIGN-IN (iOS/Android) ==========
  const nativeSignIn = async () => {
    // console.log("Pressed native sign in");
    try {
      // Clear any previous user data
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");
      await AsyncStorage.removeItem("isGuest");
      // Clear any existing token to avoid confusion
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      await GoogleSignin.hasPlayServices({
        showPlayServicesUpdateDialog: true,
      });
      // console.log("Attempting native (iOS/Android) Google sign in...");

      const info = await GoogleSignin.signIn();
      // console.log("Native sign in success, info from GoogleSignIn is:", info);

      const result = info.data;
      if (result && result.user) {
        // Save Google profile picture URL to AsyncStorage immediately
        if (result.user.photo) {
          await AsyncStorage.setItem("userPicture", result.user.photo);
          // console.log("Saved Google profile picture URL:", result.user.photo);
        }

        // First set user with Google token (temporary)
        const userData: User = {
          token: result.idToken || undefined,
          tokenType: "idToken",
          name: result.user.name || undefined,
          email: result.user.email || undefined,
          picture: result.user.photo || undefined,
        };

        setUser(userData);

        try {
          // Exchange Google token for JWT token
          // console.log("[Login] Exchanging Google token for JWT token");
          const backendResponse = await sendUserDataToBackend(userData);

          // After backend authentication, update the user object with the JWT token
          if (backendResponse && backendResponse.token) {
            // console.log("[Login] Received JWT token from backend");

            // Store JWT token in AsyncStorage
            const decoded: any = jwtDecode(backendResponse.token);
            await AsyncStorage.setItem("token", backendResponse.token);
            await AsyncStorage.setItem("userId", decoded.sub);

            // Verify token was stored correctly
            const storedToken = await AsyncStorage.getItem("token");
            // console.log("[Login] Token stored successfully:", !!storedToken);
            if (storedToken) {
              const tokenPreview = storedToken.substring(0, 10) + "...";
              // console.log(`[Login] Stored token preview: ${tokenPreview}`);
            } else {
              console.error("[Login] Failed to store JWT token in AsyncStorage");
            }

            // Update user object with JWT token
            const updatedUserData: User = {
              ...userData,
              token: backendResponse.token,
              tokenType: "jwt" // Change token type to JWT
            };
            setUser(updatedUserData);

            // console.log("[Login] User object updated with JWT token");
          } else {
            console.error("[Login] No token received from backend");
          }
        } catch (error) {
          console.error("[Login] Backend authentication failed:", error);
          // Keep the user logged in with Google token if backend fails
        }
      } else {
        console.error("No user info returned. Full info:", info);
        Alert.alert(
          "Sign In Error",
          "No user information returned from Google sign-in"
        );
      }
    } catch (error: any) {
      console.error("Native sign in error:", error);
      Alert.alert(
        "Native sign-in error",
        error.message || JSON.stringify(error)
      );
      setError(error);
    }
  };

  // ========== WEB SIGN-IN (Expo AuthSession) ==========
  const redirectUri = makeRedirectUri();
  const [request, response, promptAsync] = GoogleAuthSession.useAuthRequest({
    clientId: webClientId,
    scopes: ["profile", "email"],
    redirectUri,
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if (authentication?.accessToken) {
        // console.log(
        //   "Got access token from Expo AuthSession:",
        //   authentication.accessToken
        // );
        handleAuthSession(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      console.error("Expo AuthSession error", response.error);
      Alert.alert(
        "Authentication error",
        response.error?.toString() || "Unknown error"
      );
    }
  }, [response]);

  const handleAuthSession = async (accessToken: string) => {
    try {
      // Clear any previous user data including tutorial states
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");
      await AsyncStorage.removeItem("isGuest");
      // Clear any existing token to avoid confusion
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");

      const res = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${accessToken}`
      );
      const user = await res.json();
      // console.log("User info (Expo AuthSession):", user);

      // Save Google profile picture URL to AsyncStorage immediately
      if (user.picture) {
        await AsyncStorage.setItem("userPicture", user.picture);
        // console.log("Saved Google profile picture URL (web):", user.picture);
      }

      // First set user with Google token (temporary)
      const userData: User = {
        token: accessToken,
        tokenType: "accessToken",
        name: user.name || undefined,
        email: user.email || undefined,
        picture: user.picture || undefined,
      };
      setUser(userData);

      try {
        // Exchange Google token for JWT token
        // console.log("[Login] Exchanging Google token for JWT token");
        const backendResponse = await sendUserDataToBackend(userData);

        // After backend authentication, update the user object with the JWT token
        if (backendResponse && backendResponse.token) {
          // console.log("[Login] Received JWT token from backend");

          // Store JWT token in AsyncStorage
          const decoded: any = jwtDecode(backendResponse.token);
          await AsyncStorage.setItem("token", backendResponse.token);
          await AsyncStorage.setItem("userId", decoded.sub);

          // Verify token was stored correctly
          const storedToken = await AsyncStorage.getItem("token");
          // console.log("[Login] Token stored successfully:", !!storedToken);
          if (storedToken) {
            const tokenPreview = storedToken.substring(0, 10) + "...";
            // console.log(`[Login] Stored token preview: ${tokenPreview}`);
          } else {
            console.error("[Login] Failed to store JWT token in AsyncStorage");
          }

          // Update user object with JWT token
          const updatedUserData: User = {
            ...userData,
            token: backendResponse.token,
            tokenType: "jwt" // Change token type to JWT
          };
          setUser(updatedUserData);

          // console.log("[Login] User object updated with JWT token");
        } else {
          console.error("[Login] No token received from backend");
        }
      } catch (error) {
        console.error("[Login] Backend authentication failed:", error);
        // Keep the user logged in with Google token if backend fails
      }
    } catch (error) {
      console.error("Failed to authenticate user:", error);
    }
  };

  // For guests
  const handleGuestLogin = async () => {
    // Clear any existing Google user tokens to prevent data leakage
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userId");

    // Reset tutorial state for new users
    await AsyncStorage.removeItem("hasSeenFridgeTutorial");

    // Create a temporary guest user without authentication tokens
    const guestUser: User = {
      guest: true,
      name: "Guest",
      tokenType: "none" // Explicitly set token type for guests
    };
    setUser(guestUser);

    // Set guest flag to ensure API requests don't use any existing tokens
    await AsyncStorage.setItem("isGuest", "true");
  };

  // Decide which button to render
  const renderGoogleSignInButton = () => {
    if (Platform.OS === "web") {
      return (
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={() => promptAsync()}
        >
          <Image
            source={require("./../assets/images/google-icon.png")}
            style={styles.buttonIcon}
          />
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
      <Image
        source={require("./../assets/images/icon.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>Recipe Generator</Text>
      <Text style={styles.subtitle}>Your personal recipe assistant</Text>
      {renderGoogleSignInButton()}
      <TouchableOpacity
        style={[styles.button, styles.guestButton]}
        onPress={handleGuestLogin}
      >
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
