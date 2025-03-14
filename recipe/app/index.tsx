import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
  Animated,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { apiRequest } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

// Define types for our recipe data
interface Recipe {
  id?: string;
  title: string;
  description?: string;
}

export default function Homepage() {
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  // States for undo functionality
  const [removingRecipe, setRemovingRecipe] = useState<Recipe | null>(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeout = useRef<NodeJS.Timeout | null>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  // Add a ref to track if this is the first load
  const isFirstLoad = useRef(true);

  // State to track expanded/collapsed state of each recipe
  const [expandedRecipes, setExpandedRecipes] = useState<Record<string, boolean>>({});

  const fetchSavedRecipes = async () => {
    try {
      // Check if token exists before making the request
      // console.log("[Homepage] Starting to fetch saved recipes");
      const startTime = Date.now();

      const token = await AsyncStorage.getItem("token");
      const isGuest = await AsyncStorage.getItem("isGuest");
      // console.log("[Homepage] Token available:", !!token);
      // console.log("[Homepage] Is guest user:", !!isGuest);

      if (token) {
        try {
          // Log a portion of the token for debugging (first 10 chars)
          const tokenPreview = token.substring(0, 10) + "...";
          // console.log(`[Homepage] Token preview: ${tokenPreview}`);
        } catch (error) {
          // console.log("[Homepage] Could not preview token:", error);
        }
      }

      // console.log("[Homepage] Making API request to get favorite recipes");
      try {
        const data = await apiRequest("/fridge/get_favorite_recipes");
        // console.log("[Homepage] API request successful, recipes count:", data?.length || 0);

        // Check if data is an array before using it
        if (Array.isArray(data)) {
          setSavedRecipes(data);

          // Initialize all recipes as expanded
          const initialExpandState: Record<string, boolean> = {};
          data.forEach((recipe: Recipe) => {
            initialExpandState[recipe.id || recipe.title] = true;
          });
          setExpandedRecipes(initialExpandState);
        } else {
          console.warn("[Homepage] API returned non-array data:", data);
          // Set empty recipes array if data is not an array
          setSavedRecipes([]);
          setExpandedRecipes({});
        }
      } catch (apiError) {
        console.error("[Homepage] API request failed:", apiError);
        // If we got a 401, check if token was cleared during the request
        const tokenAfterRequest = await AsyncStorage.getItem("token");
        // console.log("[Homepage] Token after failed request:", !!tokenAfterRequest);
        throw apiError;
      }

      const endTime = Date.now();
      // console.log(`[Homepage] Total fetch operation took ${endTime - startTime}ms`);
    } catch (error) {
      console.error("[Homepage] Error fetching saved recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  // Toggle recipe expansion
  const toggleRecipeExpansion = (recipeId: string) => {
    setExpandedRecipes(prev => ({
      ...prev,
      [recipeId]: !prev[recipeId]
    }));
  };

  useEffect(() => {
    if (isFocused) {
      // Each time this page is in focus, fetch the favorites.
      setLoading(true);

      if (isFirstLoad.current) {
        // Add a delay on first load to ensure token is set
        // console.log("[Homepage] First load of homepage, adding delay before fetching recipes");
        isFirstLoad.current = false;

        // Simple delay to allow login process to complete
        setTimeout(() => {
          // Check token type before fetching
          AsyncStorage.getItem("token").then(token => {
            if (token) {
              const isGoogleToken = token.startsWith("ya29.");
              const isJwtToken = token.startsWith("ey");

              if (isGoogleToken) {
                // console.log("[Homepage] Google token detected, waiting for JWT token...");
                // Add a longer delay if we have a Google token
                setTimeout(fetchSavedRecipes, 2000);
              } else if (isJwtToken) {
                // console.log("[Homepage] JWT token detected, proceeding with fetch");
                fetchSavedRecipes();
              } else {
                // console.log("[Homepage] Unknown token type, proceeding with fetch");
                fetchSavedRecipes();
              }
            } else {
              // No token, check if guest
              AsyncStorage.getItem("isGuest").then(isGuest => {
                if (isGuest === "true") {
                  // console.log("[Homepage] Guest user detected, proceeding with fetch");
                  fetchSavedRecipes();
                } else {
                  // console.log("[Homepage] No token or guest status, proceeding with fetch anyway");
                  fetchSavedRecipes();
                }
              });
            }
          });
        }, 1000);
      } else {
        // On subsequent loads, fetch immediately
        fetchSavedRecipes();
      }
    }
  }, [isFocused]);

  // Animation for the undo popup
  useEffect(() => {
    if (showUndo) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showUndo, fadeAnim]);

  // Clean up timeout when component unmounts
  useEffect(() => {
    return () => {
      if (undoTimeout.current) {
        clearTimeout(undoTimeout.current);
      }
    };
  }, []);

  const startRemoveFavorite = (recipe: Recipe) => {
    // Save the recipe being removed
    setRemovingRecipe(recipe);
    setShowUndo(true);

    // Set a timeout to actually remove if undo is not clicked
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }

    undoTimeout.current = setTimeout(() => {
      finalizeRemoveFavorite(recipe.title);
      setShowUndo(false);
      setRemovingRecipe(null);
    }, 3000) as NodeJS.Timeout; // 3 seconds to undo

    // Immediately update UI (optimistic update)
    setSavedRecipes((prevRecipes) =>
      prevRecipes.filter(
        (r) =>
          r.title.trim().toLowerCase() !== recipe.title.trim().toLowerCase()
      )
    );
  };

  const undoRemove = () => {
    // Cancel the timeout
    if (undoTimeout.current) {
      clearTimeout(undoTimeout.current);
    }

    // Add the recipe back to the list
    if (removingRecipe) {
      setSavedRecipes((prevRecipes) => [removingRecipe, ...prevRecipes]);

      // Make sure the expanded state is set
      setExpandedRecipes(prev => ({
        ...prev,
        [removingRecipe.id || removingRecipe.title]: true
      }));
    }

    setShowUndo(false);
    setRemovingRecipe(null);
  };

  const finalizeRemoveFavorite = async (title: string) => {
    try {
      await apiRequest("/fridge/remove_favorite_recipe", "POST", { title } as any);
      console.log("Recipe removed from favorites:", title);
    } catch (error) {
      console.error("Error removing favorite recipe:", error);
      // If API call fails, fetch fresh data
      fetchSavedRecipes();
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Recipes</Text>
      <Text style={styles.subtitle}>
        Your favorited recipes are stored here.
      </Text>

      {loading ? (
        <ActivityIndicator size="large" color="#088F8F" />
      ) : savedRecipes.length > 0 ? (
        <ScrollView style={styles.historyContainer}>
          {savedRecipes.map((recipe) => {
            const recipeId = recipe.id || recipe.title;
            const isExpanded = expandedRecipes[recipeId] ?? true; // Default to expanded if state not found

            return (
              <View key={recipeId} style={styles.recipeCard}>
                <View style={styles.header}>
                  <TouchableOpacity
                    onPress={() => startRemoveFavorite(recipe)}
                    style={styles.favoriteButton}
                  >
                    <Image
                      source={require("../assets/images/favorited.png")}
                      style={styles.favoriteIcon}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.recipeTitleContainer}
                    onPress={() => toggleRecipeExpansion(recipeId)}
                  >
                    <Text style={styles.recipeName}>{recipe.title}</Text>
                  </TouchableOpacity>
                  <View style={styles.headerButtons}>

                    <TouchableOpacity
                      onPress={() => toggleRecipeExpansion(recipeId)}
                      style={styles.toggleButton}
                    >
                      <Image
                        source={
                          isExpanded
                            ? require("../assets/images/toggleup.png")
                            : require("../assets/images/toggledown.png")
                        }
                        style={styles.toggleIcon}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
                {isExpanded && (
                  <Text style={styles.notes}>
                    {recipe.description || "No description available."}
                  </Text>
                )}
              </View>
            );
          })}
        </ScrollView>
      ) : (
        <Text style={styles.noRecipes}>No saved recipes yet.</Text>
      )}

      {/* Undo popup */}
      {showUndo && (
        <Animated.View
          style={[
            styles.undoContainer,
            {
              opacity: fadeAnim,
              transform: [
                {
                  translateY: fadeAnim.interpolate({
                    inputRange: [0, 1],
                    outputRange: [20, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.undoText}>Recipe removed from favorites</Text>
          <TouchableOpacity onPress={undoRemove} style={styles.undoButton}>
            <Text style={styles.undoButtonText}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  favoriteIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    marginTop: 5,
  },
  favoriteButton: {
    padding: 5,
  },
  toggleIcon: {
    width: 20,
    height: 18,
  },
  toggleButton: {
    padding: 5,
    marginRight: 5,
  },
  recipeTitleContainer: {
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#F6FFF7",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#088F8F",
    letterSpacing: 0.5,
  },
  subtitle: {
    fontSize: 16,
    textAlign: "center",
    color: "#666",
    marginBottom: 20,
  },
  historyContainer: {
    flex: 1,
  },
  recipeCard: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    marginHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    width: "100%",
    marginBottom: 5,
  },
  recipeName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#088F8F",
    flex: 1,
    marginRight: 10,
  },
  notes: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
    lineHeight: 20,
    marginTop: 8,
  },
  noRecipes: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  // Undo popup styles
  undoContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "rgba(51, 51, 51, 0.9)",
    borderRadius: 10,
    padding: 15,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  undoText: {
    color: "white",
    fontSize: 16,
    flex: 1,
  },
  undoButton: {
    marginLeft: 10,
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  undoButtonText: {
    color: "#4ECDC4",
    fontWeight: "bold",
    fontSize: 16,
  },
});
