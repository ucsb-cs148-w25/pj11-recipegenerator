import React, { useEffect } from "react";
import { View, Text, TouchableOpacity, StyleSheet, Image, Alert} from "react-native";
import * as Google from "expo-auth-session/providers/google";
import * as WebBrowser from "expo-web-browser";
import { makeRedirectUri } from "expo-auth-session";

WebBrowser.maybeCompleteAuthSession();

export type User = {
  token?: string;
  guest?: boolean;
  name?: string,
};

interface LoginProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

export default function Login({ setUser }: LoginProps) {
  const {
    iosClientId,
    androidClientId,
    webClientId,
  } = {
    iosClientId:
      "1075996537970-k52kpdt259g53acl1k31jf4f22uld8ep.apps.googleusercontent.com",
    androidClientId:
      "1075996537970-fs8hdir9k2bgitt2vkt1am13hfflajvc.apps.googleusercontent.com",
    webClientId:
      "1075996537970-g1l2sfgkkg83k5llc8qlbc2ml7g8i2kr.apps.googleusercontent.com",
  };

  const redirectUri = makeRedirectUri({
    useProxy: true,
  } as any);
  console.log("Redirect URI:", redirectUri);

  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    scopes: ["profile", "email"],
    redirectUri,
    extraParams:{
      prompt: "select_account",
    }
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      if(authentication && authentication.accessToken){
        fetchUserInfo(authentication.accessToken);
      }
    } else if (response?.type === "error") {
      console.error("Authentication error", response.error);
      Alert.alert("Authentication error", response.error || "Unknown error");
    }
  }, [response]);

  const fetchUserInfo = async (token: string) => {
    try {
      const res = await fetch(
        `https://www.googleapis.com/oauth2/v2/userinfo?access_token=${token}`
      );
      const user = await res.json();
      console.log("User info:", user);
      setUser({ token, name: user.name });
    } catch (error) {
      console.error("Failed to fetch user info", error);
    }
  };

  const handleGuestLogin = () => {
    setUser({ guest: true });
  };

  return (
    <View style={styles.container}>
      <Image
        source={require("./../assets/images/icon.png")}
        style={styles.logo}
      />
      <Text style={styles.title}>Recipe Generator</Text>
      <Text style={styles.subtitle}>Your personal recipe assistant</Text>

      <TouchableOpacity
        style={[styles.button, styles.googleButton]}
        onPress={() => {
          promptAsync({ useProxy: true });
        }}
      >
        <Image
          source={require("./../assets/images/google-icon.png")}
          style={styles.buttonIcon}
        />
        <Text style={styles.buttonText}>Login with Google</Text>
      </TouchableOpacity>

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
