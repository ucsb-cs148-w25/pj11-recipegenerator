import React, { useState } from "react";

import {
  Image,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";

function Recipe({ title, description }) {
  const [isVisible, setIsVisible] = useState(true);
  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  return (
    <View style={styles.recipeCard}>
      <View style={styles.header}>
        <Image
          source={require("../assets/images/favorited.png")}
          style={styles.favorite}
        />
        <Text style={styles.recipeTitle}>{title}</Text>
        <TouchableOpacity onPress={toggleVisibility} style={styles.toggle}>
          <Image source={isVisible?require("../assets/images/toggleup.png"):require("../assets/images/toggledown.png")}/>
        </TouchableOpacity>
      </View>
      {isVisible && <Text style={styles.recipeDescription}>{description}</Text>}
    </View>
  );
}

export default function RecipePage() {
  const generateRecipes = () => {
    alert("Function not yet implemented");
  };
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Saved Recipes</Text>

      {/* Scrollable recipe container */}
      <ScrollView
        style={styles.recipesContainer}
        contentContainerStyle={styles.recipesContentContainer}
      >
        <Recipe
          title="Omlette"
          description="This is where the recipe description and ingredients will appear."
        />
        <Recipe
          title="Fried Rice with Spam"
          description="This is where the recipe description and ingredients will appear."
        />
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={generateRecipes}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Generate Recipes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

/* styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    color: "#1A535C",
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
  buttonContainer: {
    padding: 20,
    backgroundColor: "#f5f5f5",
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
  },
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
});
