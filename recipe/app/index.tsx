import { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from "react-native";
import { apiRequest } from "./api";

export default function Homepage() {
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSavedRecipes();
  }, []);

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

  const removeFavorite = async (title) => {
    try {
      await apiRequest("/fridge/remove_favorite_recipe", "POST", { title });
      // Remove instantly from the UI.
      setSavedRecipes((prevRecipes) =>
        prevRecipes.filter((recipe) => recipe.title !== title)
      );
    } catch (error) {
      console.error("Error removing favorite recipe:", error);
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
                <TouchableOpacity onPress={() => removeFavorite(recipe.title)}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  favoriteIcon: {
    width: 24,
    height: 24,
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
    alignItems: "center",
  },
  recipeName: {
    fontSize: 20,
    fontWeight: "600",
    color: "#088F8F",
    marginBottom: 10,
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
});
