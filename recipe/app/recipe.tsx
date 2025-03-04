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
import { apiRequest } from "./api";

function Recipe({ title, description, fetchSavedRecipes }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  // The favorite functionality remains unchanged.
  const checkIfFavorited = async () => {
    try {
      const data = await apiRequest("/fridge/get_favorite_recipes");
      const isRecipeFavorited = data.some((recipe) => recipe.title === title);
      setIsFavorited(isRecipeFavorited);
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  React.useEffect(() => {
    checkIfFavorited();
  }, []);

  const toggleFavorite = async () => {
    try {
      await apiRequest("/recipes/favorite", "POST", {
        title,
        description,
        isFavorited: !isFavorited,
      });
      setIsFavorited(!isFavorited);
      fetchSavedRecipes();
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
        <TouchableOpacity onPress={() => setIsVisible(!isVisible)} style={styles.toggle}>
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
      const responseData = await apiRequest("/fridge/generate_recipes");
      console.log("Raw response from apiRequest:", responseData);
      // If the response is a string, attempt to parse it.
      let data;
      if (typeof responseData === "string") {
        try {
          data = JSON.parse(responseData);
        } catch (parseError) {
          console.error("Error parsing response JSON:", parseError);
          data = responseData;
        }
      } else {
        data = responseData;
      }
      console.log("Parsed recipe data:", data);
      
      let formattedRecipes = [];
      // Case 1: Backend returns a single recipe object with keys: name, ingredients, and steps.
      if (data.name && data.ingredients && data.steps) {
        formattedRecipes.push({
          title: data.name,
          description: `Ingredients:\n${data.ingredients}\n\nSteps:\n${data.steps}`,
        });
      }
      // Case 2: Backend returns multiple recipes under keys: recipe1, recipe2, recipe3.
      else if (data.recipe1 || data.recipe2 || data.recipe3) {
        const recipesArray = [];
        if (data.recipe1) recipesArray.push(data.recipe1);
        if (data.recipe2) recipesArray.push(data.recipe2);
        if (data.recipe3) recipesArray.push(data.recipe3);
        formattedRecipes = recipesArray.map((recipe) => {
          if (typeof recipe === "string") {
            const splitIndex = recipe.indexOf("\n");
            const title = recipe.substring(0, splitIndex);
            const description = recipe.substring(splitIndex + 1).trim();
            return { title, description };
          }
          // If recipe is already an object.
          return recipe;
        });
      }
      // Case 3: Backend returns a single string under "recipes".
      else if (data.recipes && typeof data.recipes === "string") {
        formattedRecipes = data.recipes.split("\n\n").map((recipe) => {
          const splitIndex = recipe.indexOf("\n");
          const title = recipe.substring(0, splitIndex);
          const description = recipe.substring(splitIndex + 1).trim();
          return { title, description };
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
            <Recipe
              key={index}
              title={recipe.title}
              description={recipe.description}
              fetchSavedRecipes={generateRecipes}
            />
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
    alignItems: "center",
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
