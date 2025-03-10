import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Image,
  Switch,
  TextInput,
} from "react-native";
import { apiRequest } from "./api";

function Recipe({ text, fetchSavedRecipes }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  // Parse the JSON recipe data
  let recipeData;
  try {
    recipeData = JSON.parse(text);
  } catch (error) {
    recipeData = { name: "Unknown Recipe", detail: text };
  }

  // Prepare ingredients content
  let ingredientsContent = null;
  if (Array.isArray(recipeData.ingredients)) {
    ingredientsContent = (
      <View style={styles.ingredientsContainer}>
        <Text style={styles.sectionTitle}>Ingredients:</Text>
        {recipeData.ingredients.map((ingredient, index) => (
          <Text key={index} style={styles.ingredient}>
            • {ingredient}
          </Text>
        ))}
      </View>
    );
  } else if (recipeData.ingredients) {
    ingredientsContent = (
      <View style={styles.ingredientsContainer}>
        <Text style={styles.sectionTitle}>Ingredients:</Text>
        <Text style={styles.ingredient}>{recipeData.ingredients}</Text>
      </View>
    );
  }

  // Use the steps if available; if not, fallback to detail.
  const stepsContent = recipeData.steps ? (
    <View style={styles.stepsContainer}>
      <Text style={styles.sectionTitle}>Steps:</Text>
      <Text style={styles.stepsText}>{recipeData.steps}</Text>
    </View>
  ) : (
    <Text style={styles.recipeDescription}>{recipeData.detail}</Text>
  );

  // Check if this recipe is favorited using the apiRequest endpoint.
  const checkIfFavorited = async () => {
    try {
      const data = await apiRequest("/fridge/get_favorite_recipes");
      console.log("Favorite recipes:", data);
      if (Array.isArray(data)) {
        const isRecipeFavorited = data.some(
          (recipe) => recipe.title === recipeData.name
        );
        setIsFavorited(isRecipeFavorited);
      } else {
        console.error("Unexpected data format:", data);
        setIsFavorited(false);
      }
    } catch (error) {
      console.error("Error checking favorite status:", error);
    }
  };

  React.useEffect(() => {
    checkIfFavorited();
  }, [text]);

  // Toggle favorite status using the API via apiRequest.
  const toggleFavorite = async () => {
    console.log("toggleFavorite pressed for:", recipeData.name);
    // Build the description from the recipe data fields.
    const description =
      (Array.isArray(recipeData.ingredients)
        ? recipeData.ingredients.join("\n")
        : recipeData.ingredients || "") +
      "\n\n" +
      (recipeData.steps || recipeData.detail || "");
    try {
      await apiRequest("/recipes/favorite", "POST", {
        title: recipeData.name,
        description: description,
        isFavorited: !isFavorited,
      });
      console.log("Favorite toggle successful for:", recipeData.name);
      setIsFavorited(!isFavorited);
      // Removed fetchSavedRecipes() call here so that toggling favorites doesn't regenerate recipes.
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
        <Text style={styles.recipeTitle}>{recipeData.name}</Text>
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
      {isVisible && (
        <View style={styles.recipeContent}>
          {ingredientsContent}
          {stepsContent}
        </View>
      )}
    </View>
  );
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  // Add preference visibility state
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [preferences, setPreferences] = useState({
    isVegan: false,
    isSpicy: false,
    cuisines: [],
    allergens: [],
    customCuisine: "",
    customAllergen: ""
  });

  // Toggle an item in an array helper
  const toggleArrayItem = (array, item) => {
    return array.includes(item) 
      ? array.filter(i => i !== item) 
      : [...array, item];
  };

  // Update your generateRecipes function to hide preferences when generating
  const generateRecipes = async () => {
    setLoading(true);
    setPreferencesVisible(false); // Hide preferences when generating
    try {
      // Pass preferences to the API
      const data = await apiRequest("/fridge/generate_recipes", { preferences });
      console.log("Received recipe data:", data);
      let formattedRecipes = [];

      // Case 1: Backend returns a single recipe object with keys "name", "ingredients", and "steps"
      if (data.name && data.ingredients && data.steps) {
        formattedRecipes.push({
          text: JSON.stringify(data),
        });
      }
      // Case 2: Backend returns multiple recipes in keys "recipe1", "recipe2", "recipe3"
      else if (data.recipe1 || data.recipe2 || data.recipe3) {
        const recipesArray = [];
        if (data.recipe1) recipesArray.push(data.recipe1);
        if (data.recipe2) recipesArray.push(data.recipe2);
        if (data.recipe3) recipesArray.push(data.recipe3);
        formattedRecipes = recipesArray.map((recipe) => ({
          text: typeof recipe === "object" ? JSON.stringify(recipe) : recipe,
        }));
      }
      // Case 3: Backend returns a single string under "recipes"
      else if (data.recipes && typeof data.recipes === "string") {
        formattedRecipes = data.recipes.split("\n\n").map((recipe) => ({
          text: recipe,
        }));
      }
      
      setRecipes(formattedRecipes);
    } catch (error) {
      Alert.alert("Error", "Failed to generate recipes. Please try again later.");
      console.error("Generate recipes error:", error);
    } finally {
      setLoading(false);
    }
  };

  // Add cuisine to preferences
  const addCustomCuisine = () => {
    if (preferences.customCuisine.trim()) {
      setPreferences({
        ...preferences,
        cuisines: [...preferences.cuisines, preferences.customCuisine.trim()],
        customCuisine: ""
      });
    }
  };

  // Add allergen to preferences
  const addCustomAllergen = () => {
    if (preferences.customAllergen.trim()) {
      setPreferences({
        ...preferences,
        allergens: [...preferences.allergens, preferences.customAllergen.trim()],
        customAllergen: ""
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Generated Recipes</Text>

      {/* Preference section toggle button */}
      <TouchableOpacity 
        style={styles.preferencesToggle}
        onPress={() => setPreferencesVisible(!preferencesVisible)}
      >
        <Text style={styles.preferencesToggleText}>
          {preferencesVisible ? "Hide Preferences" : "Show Preferences"}
        </Text>
        <Text style={styles.preferencesToggleIcon}>
          {preferencesVisible ? "▲" : "▼"}
        </Text>
      </TouchableOpacity>

      {/* Collapsible preference section */}
      {preferencesVisible && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filterTitle}>Preferences</Text>
          
          <View style={styles.filterRow}>
            <Text>Vegan</Text>
            <Switch 
              value={preferences.isVegan}
              onValueChange={(value) => setPreferences({...preferences, isVegan: value})}
            />
          </View>
          
          <View style={styles.filterRow}>
            <Text>Spicy</Text>
            <Switch 
              value={preferences.isSpicy}
              onValueChange={(value) => setPreferences({...preferences, isSpicy: value})}
            />
          </View>
          
          {/* Cuisines section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSubtitle}>Cuisines</Text>
            <View style={styles.tagsContainer}>
              {preferences.cuisines.map((cuisine, index) => (
                <View style={styles.tagItem} key={index}>
                  <Text style={styles.tagText}>{cuisine}</Text>
                  <TouchableOpacity
                    onPress={() => setPreferences({
                      ...preferences,
                      cuisines: preferences.cuisines.filter((_, i) => i !== index)
                    })}
                  >
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.cuisineButtons}>
              {["Italian", "Asian", "Mexican", "Indian", "Mediterranean"].map(cuisine => (
                <TouchableOpacity 
                  key={cuisine}
                  style={[
                    styles.cuisineButton, 
                    preferences.cuisines.includes(cuisine) && styles.activeCuisineButton
                  ]}
                  onPress={() => setPreferences({
                    ...preferences, 
                    cuisines: toggleArrayItem(preferences.cuisines, cuisine)
                  })}
                >
                  <Text style={
                    preferences.cuisines.includes(cuisine) 
                      ? styles.activeCuisineText 
                      : styles.cuisineText
                  }>
                    {cuisine}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Add custom cuisine */}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={preferences.customCuisine}
                onChangeText={(text) => setPreferences({...preferences, customCuisine: text})}
                placeholder="Add custom cuisine..."
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addCustomCuisine}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Allergens section */}
          <View style={styles.filterSection}>
            <Text style={styles.filterSubtitle}>Allergens to Avoid</Text>
            <View style={styles.tagsContainer}>
              {preferences.allergens.map((allergen, index) => (
                <View style={styles.tagItem} key={index}>
                  <Text style={styles.tagText}>{allergen}</Text>
                  <TouchableOpacity
                    onPress={() => setPreferences({
                      ...preferences,
                      allergens: preferences.allergens.filter((_, i) => i !== index)
                    })}
                  >
                    <Text style={styles.tagRemove}>×</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
            <View style={styles.cuisineButtons}>
              {["Nuts", "Dairy", "Gluten", "Shellfish", "Eggs", "Soy"].map(allergen => (
                <TouchableOpacity 
                  key={allergen}
                  style={[
                    styles.allergenButton, 
                    preferences.allergens.includes(allergen) && styles.activeAllergenButton
                  ]}
                  onPress={() => setPreferences({
                    ...preferences, 
                    allergens: toggleArrayItem(preferences.allergens, allergen)
                  })}
                >
                  <Text style={
                    preferences.allergens.includes(allergen) 
                      ? styles.activeAllergenText 
                      : styles.allergenText
                  }>
                    {allergen}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            
            {/* Add custom allergen */}
            <View style={styles.customInputRow}>
              <TextInput
                style={styles.customInput}
                value={preferences.customAllergen}
                onChangeText={(text) => setPreferences({...preferences, customAllergen: text})}
                placeholder="Add custom allergen..."
              />
              <TouchableOpacity 
                style={styles.addButton}
                onPress={addCustomAllergen}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Recipe list... */}
      <ScrollView style={styles.recipesContainer} contentContainerStyle={styles.recipesContentContainer}>
        {recipes.length > 0 ? (
          recipes.map((recipe, index) => (
            <Recipe key={index} text={recipe.text} fetchSavedRecipes={generateRecipes} />
          ))
        ) : (
          <Text style={styles.noRecipes}>No recipes available. Generate some!</Text>
        )}
      </ScrollView>
      
      {/* Generate button */}
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
  recipeContent: {
    marginTop: 10,
  },
  ingredientsContainer: {
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  ingredient: {
    fontSize: 16,
    color: "#666",
    marginLeft: 10,
  },
  stepsContainer: {
    marginTop: 10,
  },
  stepsText: {
    fontSize: 16,
    color: "#666",
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
  filtersContainer: {
    padding: 20,
    backgroundColor: "#F6FFF7",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  filterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#088F8F",
    marginBottom: 10,
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  cuisineButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cuisineButton: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  activeCuisine: {
    backgroundColor: "#088F8F",
  },
  cuisineText: {
    color: "#333",
  },
  activeCuisineText: {
    color: "white",
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
  filterSection: {
    marginBottom: 20,
  },
  filterSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#088F8F",
    marginBottom: 10,
  },
  customInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
  },
  customInput: {
    flex: 1,
    borderColor: "#e0e0e0",
    borderWidth: 1,
    borderRadius: 5,
    padding: 10,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 5,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  activeCuisineButton: {
    backgroundColor: "#088F8F",
  },
  activeAllergenButton: {
    backgroundColor: "#088F8F",
  },
  allergenButton: {
    backgroundColor: "#e0e0e0",
    padding: 10,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  allergenText: {
    color: "#333",
  },
  activeAllergenText: {
    color: "white",
  },
  preferencesToggle: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#F6FFF7",
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  preferencesToggleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#088F8F",
  },
  preferencesToggleIcon: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#088F8F",
  },
  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 10,
  },
  tagItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#e0e0e0",
    padding: 5,
    borderRadius: 5,
    marginRight: 10,
    marginBottom: 10,
  },
  tagText: {
    color: "#333",
    marginRight: 5,
  },
  tagRemove: {
    color: "#888",
    fontWeight: "bold",
  },
});
