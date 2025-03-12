import AsyncStorage from "@react-native-async-storage/async-storage";

export const apiRequest = async (endpoint: string, method = "GET", body = null) => {
  const token = await AsyncStorage.getItem("token");
  const isGuest = await AsyncStorage.getItem("isGuest");

  // Don't include auth token for guest users, even if one exists in storage
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(token && !isGuest ? { Authorization: `Bearer ${token}` } : {}),
  };

  const options: RequestInit = {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  };

  const response = await fetch(`http://localhost:8000${endpoint}`, options);

  if (response.status === 401) {
    console.error("Unauthorized - Invalid or expired token.");
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("userId");
    await AsyncStorage.removeItem("isGuest");
  }

  return response.json();
};