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
  FlatList,
} from "react-native";
import { apiRequest } from "./api";

// Define proper types to fix TypeScript errors
interface RecipeItem {
  text: string;
}

interface RecipeData {
  name: string;
  ingredients: string[] | string;
  steps?: string;
  detail?: string;
}

interface RecipeProps {
  text: string;
  fetchSavedRecipes: () => void;
}

function Recipe({ text, fetchSavedRecipes }: RecipeProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);

  // Parse the JSON recipe data
  let recipeData: RecipeData;
  try {
    recipeData = JSON.parse(text);
  } catch (error) {
    recipeData = { name: "Unknown Recipe", detail: text, ingredients: [] };
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
      } as any); // Using type assertion to bypass strict typing temporarily
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
        <TouchableOpacity
          onPress={toggleFavorite}
          style={styles.favoriteButton}
        >
          <Image
            source={
              isFavorited
                ? require("../assets/images/favorited.png")
                : require("../assets/images/emptyfavorite.png")
            }
            style={styles.favoriteIcon}
          />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.recipeTitleContainer}
          onPress={() => setIsVisible(!isVisible)}
        >
          <Text style={styles.recipeTitle}>{recipeData.name}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setIsVisible(!isVisible)}
          style={styles.toggleButton}
        >
          <Image
            source={
              isVisible
                ? require("../assets/images/toggleup.png")
                : require("../assets/images/toggledown.png")
            }
            style={styles.toggleIcon}
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

// Define the preferences type
interface RecipePreferences {
  isVegan: boolean;
  isSpicy: boolean;
  cuisines: string[];
  allergens: string[];
  customCuisine: string;
  customAllergen: string;
  useOnlyFridgeIngredients: boolean;
  cookingTime: string;
  difficulty: string;
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState<RecipeItem[]>([]);
  const [loading, setLoading] = useState(false);
  // Add preference visibility state
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [preferences, setPreferences] = useState<RecipePreferences>({
    isVegan: false,
    isSpicy: false,
    cuisines: [],
    allergens: [],
    customCuisine: "",
    customAllergen: "",
    // Add new filter options
    useOnlyFridgeIngredients: false,
    cookingTime: "any", // "any", "quick", "medium", "long"
    difficulty: "any", // "any", "easy", "medium", "hard"
  });

  // Toggle an item in an array helper
  const toggleArrayItem = (array: string[], item: string): string[] => {
    return array.includes(item)
      ? array.filter((i: string) => i !== item)
      : [...array, item];
  };

  // Update your generateRecipes function to use the new filters
  const generateRecipes = async () => {
    setLoading(true);
    setPreferencesVisible(false); // Hide preferences when generating

    try {
      // Build the request payload with all filter options
      const requestPayload = {
        isVegan: preferences.isVegan,
        isSpicy: preferences.isSpicy,
        cuisines: preferences.cuisines,
        allergens: preferences.allergens,
        // Add new filter options
        useOnlyFridgeIngredients: preferences.useOnlyFridgeIngredients,
        cookingTime: preferences.cookingTime,
        difficulty: preferences.difficulty,
      };

      console.log("Sending recipe request with preferences:", requestPayload);

      // Pass preferences to the API
      const data = await apiRequest(
        "/fridge/generate_recipes",
        "POST",
        requestPayload as any
      );

      console.log("Received recipe data:", data);
      let formattedRecipes: RecipeItem[] = [];

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
        formattedRecipes = recipesArray.map((recipe: any) => ({
          text: typeof recipe === "object" ? JSON.stringify(recipe) : recipe,
        }));
      }
      // Case 3: Backend returns a single string under "recipes"
      else if (data.recipes && typeof data.recipes === "string") {
        formattedRecipes = data.recipes.split("\n\n").map((recipe: string) => ({
          text: recipe,
        }));
      }

      setRecipes(formattedRecipes);
    } catch (error) {
      Alert.alert(
        "Error",
        "Failed to generate recipes. Please try again later."
      );
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
        customCuisine: "",
      });
    }
  };

  // Add allergen to preferences
  const addCustomAllergen = () => {
    if (preferences.customAllergen.trim()) {
      setPreferences({
        ...preferences,
        allergens: [
          ...preferences.allergens,
          preferences.customAllergen.trim(),
        ],
        customAllergen: "",
      });
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recipe Generator</Text>
      <View style={styles.content}>
        {recipes.length > 0 ? (
          <>
            <FlatList
              data={recipes}
              renderItem={({ item }) => (
                <Recipe text={item.text} fetchSavedRecipes={generateRecipes} />
              )}
              keyExtractor={(_, index) => `recipe-${index}`}
              contentContainerStyle={styles.recipeList}
            />
          </>
        ) : (
          <ScrollView style={styles.scrollView}>
            <View style={styles.emptyState}>
              <Image
                source={require("../assets/images/recipe.png")}
                style={styles.emptyStateImage}
              />
              <Text style={styles.emptyStateText}>
                No recipes yet. Use your ingredients from the fridge to generate
                delicious recipes!
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Shared Preferences Overlay for both states */}
        {preferencesVisible && (
          <View style={styles.preferencesOverlay}>
            <ScrollView style={styles.preferencesScrollView}>
              <View style={styles.preferencesSection}>
                <Text style={styles.preferencesTitle}>
                  Customize Your Recipes
                </Text>

                {/* Ingredients Only Toggle */}
                <View style={styles.preferenceRow}>
                  <Text style={styles.preferenceLabel}>
                    Only Use Fridge Ingredients
                  </Text>
                  <Switch
                    value={preferences.useOnlyFridgeIngredients}
                    onValueChange={(value) =>
                      setPreferences({
                        ...preferences,
                        useOnlyFridgeIngredients: value,
                      })
                    }
                    trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
                    thumbColor={
                      preferences.useOnlyFridgeIngredients
                        ? "#088F8F"
                        : "#f4f3f4"
                    }
                  />
                </View>

                {/* Cooking Time Filter */}
                <View style={styles.preferenceSection}>
                  <Text style={styles.preferenceSubtitle}>Cooking Time:</Text>
                  <View style={styles.radioButtonsContainer}>
                    {["any", "quick", "medium", "long"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.radioButton,
                          preferences.cookingTime === option &&
                            styles.radioButtonActive,
                        ]}
                        onPress={() =>
                          setPreferences({
                            ...preferences,
                            cookingTime: option,
                          })
                        }
                      >
                        <Text
                          style={
                            preferences.cookingTime === option
                              ? styles.radioTextActive
                              : styles.radioText
                          }
                        >
                          {option === "any"
                            ? "Any Time"
                            : option === "quick"
                            ? "< 30 mins"
                            : option === "medium"
                            ? "30-60 mins"
                            : "> 60 mins"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Difficulty Filter */}
                <View style={styles.preferenceSection}>
                  <Text style={styles.preferenceSubtitle}>
                    Difficulty Level:
                  </Text>
                  <View style={styles.radioButtonsContainer}>
                    {["any", "easy", "medium", "hard"].map((option) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.radioButton,
                          preferences.difficulty === option &&
                            styles.radioButtonActive,
                        ]}
                        onPress={() =>
                          setPreferences({
                            ...preferences,
                            difficulty: option,
                          })
                        }
                      >
                        <Text
                          style={
                            preferences.difficulty === option
                              ? styles.radioTextActive
                              : styles.radioText
                          }
                        >
                          {option === "any"
                            ? "Any Level"
                            : option === "easy"
                            ? "Easy"
                            : option === "medium"
                            ? "Medium"
                            : "Advanced"}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Existing vegan and spicy preference toggles */}
                <View style={styles.toggleRow}>
                  <View style={[styles.toggleItem, { flex: 1.5 }]}>
                    <Text style={styles.toggleLabel}>Vegan Only:</Text>
                    <Switch
                      value={preferences.isVegan}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, isVegan: value })
                      }
                      trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
                      thumbColor={preferences.isVegan ? "#088F8F" : "#f4f3f4"}
                    />
                  </View>
                  <View style={[styles.toggleItem, { flex: 1 }]}>
                    <Text style={styles.toggleLabel}>Spicy:</Text>
                    <Switch
                      value={preferences.isSpicy}
                      onValueChange={(value) =>
                        setPreferences({ ...preferences, isSpicy: value })
                      }
                      trackColor={{ false: "#D9D9D9", true: "#ADE1BB" }}
                      thumbColor={preferences.isSpicy ? "#088F8F" : "#f4f3f4"}
                    />
                  </View>
                </View>

                {/* Existing cuisines and allergens sections */}
                <View style={styles.filterSection}>
                  <Text style={styles.filterSubtitle}>Cuisines</Text>
                  <View style={styles.tagsContainer}>
                    {preferences.cuisines.map((cuisine, index) => (
                      <View style={styles.tagItem} key={index}>
                        <Text style={styles.tagText}>{cuisine}</Text>
                        <TouchableOpacity
                          onPress={() =>
                            setPreferences({
                              ...preferences,
                              cuisines: preferences.cuisines.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                        >
                          <Text style={styles.tagRemove}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <View style={styles.cuisineButtons}>
                    {[
                      "American",
                      "Italian",
                      "Mexican",
                      "Asian",
                      "Indian",
                      "Mediterranean",
                      "French",
                      "Janpanese",
                    ].map((cuisine) => (
                      <TouchableOpacity
                        key={cuisine}
                        style={[
                          styles.cuisineButton,
                          preferences.cuisines.includes(cuisine) &&
                            styles.activeCuisineButton,
                        ]}
                        onPress={() =>
                          setPreferences({
                            ...preferences,
                            cuisines: toggleArrayItem(
                              preferences.cuisines,
                              cuisine
                            ),
                          })
                        }
                      >
                        <Text
                          style={
                            preferences.cuisines.includes(cuisine)
                              ? styles.activeCuisineText
                              : styles.cuisineText
                          }
                        >
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
                      onChangeText={(text) =>
                        setPreferences({ ...preferences, customCuisine: text })
                      }
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
                          onPress={() =>
                            setPreferences({
                              ...preferences,
                              allergens: preferences.allergens.filter(
                                (_, i) => i !== index
                              ),
                            })
                          }
                        >
                          <Text style={styles.tagRemove}>×</Text>
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                  <View style={styles.cuisineButtons}>
                    {[
                      "Nuts",
                      "Dairy",
                      "Gluten",
                      "Shellfish",
                      "Eggs",
                      "Soy",
                    ].map((allergen) => (
                      <TouchableOpacity
                        key={allergen}
                        style={[
                          styles.allergenButton,
                          preferences.allergens.includes(allergen) &&
                            styles.activeAllergenButton,
                        ]}
                        onPress={() =>
                          setPreferences({
                            ...preferences,
                            allergens: toggleArrayItem(
                              preferences.allergens,
                              allergen
                            ),
                          })
                        }
                      >
                        <Text
                          style={
                            preferences.allergens.includes(allergen)
                              ? styles.activeAllergenText
                              : styles.allergenText
                          }
                        >
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
                      onChangeText={(text) =>
                        setPreferences({ ...preferences, customAllergen: text })
                      }
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
            </ScrollView>
          </View>
        )}

        {/* Fixed Controls Container */}
        <View style={styles.fixedControlsContainer}>
          {/* Preference toggle button */}
          <TouchableOpacity
            style={styles.preferencesToggle}
            onPress={() => setPreferencesVisible(!preferencesVisible)}
          >
            <Text style={styles.preferencesToggleText}>
              {preferencesVisible ? "Hide Preferences" : "Show Preferences"}
            </Text>
            <Text style={styles.preferencesToggleIcon}>
              {preferencesVisible ? "▼" : "▲"}
            </Text>
          </TouchableOpacity>

          {/* Generate button */}
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
  content: {
    flex: 1,
    position: "relative",
  },
  recipeList: {
    paddingHorizontal: 20,
    paddingBottom: 120, // Add bottom padding for fixed controls
  },
  scrollView: {
    padding: 20,
    paddingBottom: 120, // Add bottom padding for fixed controls
  },
  emptyState: {
    alignItems: "center",
    marginTop: 40,
    marginBottom: 20,
  },
  emptyStateImage: {
    width: 100,
    height: 100,
    marginBottom: 20,
  },
  emptyStateText: {
    fontSize: 18,
    color: "#888",
    textAlign: "center",
  },
  fixedControlsContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#F6FFF7",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: "#E0E0E0",
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.1,
    shadowRadius: 5,
    elevation: 5,
    zIndex: 20, // Ensure controls are always on top
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
    alignItems: "center",
  },
  favorite: {
    width: 24,
    height: 24,
  },
  favoriteIcon: {
    width: 20,
    height: 20,
    marginRight: 5,
    marginTop: 5,
  },
  favoriteButton: {
    padding: 5,
  },
  headerButtons: {
    flexDirection: "row",
    alignItems: "center",
  },
  recipeTitleContainer: {
    flex: 1,
  },
  toggleButton: {
    padding: 5,
    marginRight: 5,
  },
  toggleIcon: {
    width: 20,
    height: 18,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: "600",
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
    backgroundColor: "#F6FFF7",
    marginBottom: 15,
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
    borderRadius: 10,
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
    marginTop: 10,
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
    borderRadius: 10,
    padding: 10,
    marginRight: 10,
  },
  addButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
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
    borderRadius: 10,
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
    paddingVertical: 10,
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
  preferencesSection: {
    padding: 15,
    backgroundColor: "rgba(246, 255, 247, 0.5)", // A stronger light green but not as bright as white
    borderRadius: 15,
    marginVertical: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 3,
  },
  preferencesTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#088F8F",
    marginBottom: 10,
  },
  preferenceRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  preferenceLabel: {
    fontSize: 16,
    color: "#333",
  },
  preferenceSection: {
    marginVertical: 10,
  },
  preferenceSubtitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#088F8F",
    marginBottom: 10,
  },
  radioButtonsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
  },
  radioButton: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F0F0F0",
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  radioButtonActive: {
    backgroundColor: "#088F8F",
    borderColor: "#088F8F",
  },
  radioText: {
    color: "#555",
    fontSize: 14,
  },
  radioTextActive: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  toggleItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  toggleLabel: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#088F8F",
    marginRight: 10,
  },
  // New styles for the overlay preferences panel
  preferencesOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 80, // Adjusted to leave more room for the controls
    backgroundColor: "rgba(246, 255, 247, 0.98)", // Light green with opacity
    zIndex: 10,
    borderRadius: 15,
  },
  preferencesScrollView: {
    flex: 1,
    padding: 20,
  },
});
