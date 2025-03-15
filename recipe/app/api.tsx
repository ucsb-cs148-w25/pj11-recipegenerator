import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Helper function to get the appropriate backend URL based on platform
const getBackendUrl = () => {
  if (Platform.OS === "web") {
    return "http://127.0.0.1:8000";
  } else if (Platform.OS === "android") {
    // Android emulator needs to use 10.0.2.2 to access host machine
    return "http://10.0.2.2:8000";
  } else {
    // iOS simulator can use localhost
    return "http://127.0.0.1:8000";
  }
};

export const apiRequest = async (
  endpoint: string,
  method = "GET",
  body = null
): Promise<any> => {
  // console.log(`[API] Starting request to ${endpoint}`);

  // Get token and check if user is guest
  const token = await AsyncStorage.getItem("token");
  const isGuestStr = await AsyncStorage.getItem("isGuest");
  const isGuest = isGuestStr === "true";

  // Check if the token is a Google token or a JWT token
  let isGoogleToken = false;
  let isJwtToken = false;

  if (token) {
    isGoogleToken = token.startsWith("ya29.");
    isJwtToken = token.startsWith("ey");

    // const tokenType = isGoogleToken ? "Google" : (isJwtToken ? "JWT" : "Unknown");
    // console.log(`[API] Token type: ${tokenType}`);

    if (isGoogleToken) {
      // console.warn("[API] Google token detected - will not use for API request");

      // Try to wait for JWT token if we have a Google token
      // This handles the race condition where the JWT token is being set but not yet available
      let retryCount = 0;
      const maxRetries = 3;

      while (isGoogleToken && retryCount < maxRetries) {
        // console.log(`[API] Waiting for JWT token (attempt ${retryCount + 1}/${maxRetries})...`);

        // Wait for 500ms
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Check if token has been updated to JWT
        const newToken = await AsyncStorage.getItem("token");
        if (newToken && newToken.startsWith("ey")) {
          // console.log("[API] JWT token now available, will use for request");
          isJwtToken = true;
          isGoogleToken = false;
          return apiRequest(endpoint, method, body); // Retry with new token
        }

        retryCount++;
      }
    }
  }

  // Don't include auth token for guest users or if using Google token
  // Only use JWT tokens for authorization
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && !isGuest && isJwtToken
      ? { Authorization: `Bearer ${token}` }
      : {}),
  };

  const options: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const backendUrl = getBackendUrl();
  // console.log(`[API] Request to ${backendUrl}${endpoint} with auth: ${!!headers.Authorization}`);

  try {
    const response = await fetch(`${backendUrl}${endpoint}`, options);

    if (response.status === 401) {
      console.error("[API] Unauthorized - Invalid or expired token");

      // Try to get error details
      try {
        const errorBody = await response.clone().json();
        console.error("[API] Error details:", errorBody);
      } catch (e) {
        // Ignore error parsing errors
      }

      // Only clear tokens if we're getting 401 with a JWT token
      // This prevents clearing tokens during the login process
      if (isJwtToken) {
        // console.log("[API] Clearing invalid JWT token from storage");
        await AsyncStorage.removeItem("token");
        await AsyncStorage.removeItem("userId");
      }
    }

    return await response.json();
  } catch (error) {
    console.error(`[API] Error during fetch:`, error);
    throw error;
  }
};
