import React, { useState } from "react";
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

function Recipe({ title, description }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  const toggleFavorite = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/recipes/favorite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, isFavorited: !isFavorited }),
      });

      if (!response.ok) {
        throw new Error("Failed to update favorite status.");
      }

      setIsFavorited(!isFavorited);
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  return (
    <View style={styles.recipeCard}>
      <View style={styles.header}>
        <TouchableOpacity onPress={toggleFavorite}>
          <Image
            source={
              isFavorited
                ? require("../assets/images/favorited.png")
                : require("../assets/images/emptyfavorite.png")
            }
            style={styles.favorite}
          />
        </TouchableOpacity>
        <Text style={styles.recipeTitle}>{title}</Text>
        <TouchableOpacity onPress={toggleVisibility} style={styles.toggle}>
          <Image
            source={
              isVisible
                ? require("../assets/images/toggleup.png")
                : require("../assets/images/toggledown.png")
            }
          />
        </TouchableOpacity>
      </View>
      {isVisible && <Text style={styles.recipeDescription}>{description}</Text>}
    </View>
  );
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);

  const generateRecipes = async () => {
    setLoading(true);
    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/generate_recipes", {
        method: "GET",
        headers: {
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      if (data.recipes) {
        const recipeList = data.recipes.split("\n\n").map((recipe) => {
          const [title, description] = recipe.split(": ");
          return { title: title.replace(/\d+\)\s*/, ""), description };
        });
        setRecipes(recipeList);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to generate recipes. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Recipes</Text>

      <ScrollView
        style={styles.recipesContainer}
        contentContainerStyle={styles.recipesContentContainer}
      >
        {recipes.length > 0 ? (
          recipes.map((recipe, index) => (
            <Recipe key={index} title={recipe.title} description={recipe.description} />
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
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Generate Recipes</Text>
          )}
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
  header: {
    flexDirection: "row",
  },
  favorite: {
    width: 24,
    height: 24,
    marginRight: 10,
  },
  toggle: {
    marginLeft: "auto",
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 10,
    color: "#088F8F",
  },
  recipeDescription: {
    fontSize: 16,
    color: "#666",
    lineHeight: 22,
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
    shadowOffset: {
      width: 0,
      height: 2,
    },
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