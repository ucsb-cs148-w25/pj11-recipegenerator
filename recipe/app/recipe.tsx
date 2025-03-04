import React, { useState, useEffect } from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { apiRequest } from "./api";

function Recipe({ text, fetchSavedRecipes }) {
  // For debugging, we simply display the entire recipe text on one line.
  return (
    <View style={styles.recipeCard}>
      <Text style={styles.recipeText}>{text}</Text>
    </View>
  );
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateRecipes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/fridge/generate_recipes");
      console.log("Received recipe data:", data);
      let formattedRecipes = [];

      // If the backend returns separate keys (recipe1, recipe2, recipe3)
      if (data.recipe1 || data.recipe2 || data.recipe3) {
        const recipesArray = [];
        if (data.recipe1) recipesArray.push(data.recipe1);
        if (data.recipe2) recipesArray.push(data.recipe2);
        if (data.recipe3) recipesArray.push(data.recipe3);
        formattedRecipes = recipesArray.map((recipe) => {
          // If it's an object, convert it to a string; otherwise use it directly.
          return { text: typeof recipe === "object" ? JSON.stringify(recipe) : recipe };
        });
      }
      // Else if the backend returns a single string under "recipes"
      else if (data.recipes && typeof data.recipes === "string") {
        formattedRecipes = data.recipes.split("\n\n").map((recipe) => {
          return { text: recipe };
        });
      }
      setRecipes(formattedRecipes);
    } catch (error) {
      Alert.alert("Error", "Failed to generate recipes. Please try again later.");
      console.error("Generate recipes error:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Recipes</Text>
      <ScrollView
        style={styles.recipesContainer}
        contentContainerStyle={styles.recipesContentContainer}
      >
        {recipes.length > 0 ? (
          recipes.map((recipe, index) => (
            <Recipe key={index} text={recipe.text} fetchSavedRecipes={generateRecipes} />
          ))
        ) : (
          <Text style={styles.noRecipes}>No recipes available. Generate some!</Text>
        )}
      </ScrollView>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={generateRecipes}
          activeOpacity={0.8}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="white" /> : <Text style={styles.buttonText}>Generate Recipes</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FFF7",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#088F8F",
    letterSpacing: 0.5,
    padding: 20,
    paddingBottom: 10,
  },
  recipesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipesContentContainer: {
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
  },
  recipeText: {
    fontSize: 16,
    color: "#666",
  },
  noRecipes: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
    marginTop: 20,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: "#F6FFF7",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  button: {
    backgroundColor: "#088F8F",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    alignItems: "center",
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
});
