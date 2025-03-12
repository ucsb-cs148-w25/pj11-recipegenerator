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

export default function Homepage() {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);
  const isFocused = useIsFocused();
  // States for undo functionality
  const [removingRecipe, setRemovingRecipe] = useState(null);
  const [showUndo, setShowUndo] = useState(false);
  const undoTimeout = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const fetchSavedRecipes = async () => {
    try {
      const data = await apiRequest("/fridge/get_favorite_recipes");
      setSavedRecipes(data);
    } catch (error) {
      console.error("Error fetching saved recipes:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isFocused) {
      // Each time this page is in focus, fetch the favorites.
      setLoading(true);
      fetchSavedRecipes();
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

  const startRemoveFavorite = (recipe) => {
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
    }, 3000); // 3 seconds to undo

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
    }

    setShowUndo(false);
    setRemovingRecipe(null);
  };

  const finalizeRemoveFavorite = async (title) => {
    try {
      await apiRequest("/fridge/remove_favorite_recipe", "POST", { title });
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
          {savedRecipes.map((recipe) => (
            <View key={recipe.id} style={styles.recipeCard}>
              <View style={styles.header}>
                <Text style={styles.recipeName}>{recipe.title}</Text>
                <TouchableOpacity
                  onPress={() => startRemoveFavorite(recipe)}
                  style={styles.favoriteButton}
                >
                  <Image
                    source={require("../assets/images/favorited.png")}
                    style={styles.favoriteIcon}
                  />
                </TouchableOpacity>
              </View>
              <Text style={styles.notes}>
                {recipe.description || "No description available."}
              </Text>
            </View>
          ))}
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
    width: 24,
    height: 24,
  },
  favoriteButton: {
    padding: 5,
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
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
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
