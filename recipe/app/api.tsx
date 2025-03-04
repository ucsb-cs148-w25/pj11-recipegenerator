import AsyncStorage from "@react-native-async-storage/async-storage";

export const apiRequest = async (endpoint: string, method = "GET", body = null) => {
    const token = await AsyncStorage.getItem("token");

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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
      await AsyncStorage.removeItem("userId"); // ✅ Remove userId too
    }

    return response.json();
};