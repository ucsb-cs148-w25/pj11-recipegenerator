import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { ENV } from '../.env.js';

// Base URL for API requests - empty string means use relative URLs
// which will work in all environments including production
export const API_BASE_URL = '';

// Helper function to construct API URLs - use this instead of hardcoding URLs
export const getApiUrl = (endpoint: string): string => {
  // Always use relative URLs
  return `/${endpoint}`;
};

// Helper function to get the appropriate backend URL based on environment
const getBackendUrl = () => {
  // For production deployment, use the API_URL from environment config
  if (process.env.NODE_ENV === 'production') {
    return ENV.API_URL;
  }
  
  // For development, use local URLs based on platform
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

// Export the function for use in components
export { getBackendUrl };

// Main API request function
export const apiRequest = async (
  endpoint: string,
  method: string = "GET",
  body: any = null
) => {
  try {
    const token = await AsyncStorage.getItem("token");
    const isGuest = await AsyncStorage.getItem("isGuest");
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    };
    
    // Only add Authorization header if token exists and not a guest
    if (token && isGuest !== "true") {
      headers["Authorization"] = `Bearer ${token}`;
    }
    
    const options: RequestInit = {
      method,
      headers,
    };
    
    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }
    
    // Use relative URLs for all requests
    const response = await fetch(getApiUrl(endpoint), options);
    
    // Handle potential errors
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `HTTP error ${response.status}` 
      }));
      throw new Error(
        errorData.detail || errorData.error || `API request failed: ${response.status}`
      );
    }
    
    const data = await response.json();
    return data;
  } catch (error) {
    console.error(`API request error (${endpoint}):`, error);
    throw error;
  }
};
