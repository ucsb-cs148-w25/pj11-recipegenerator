import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Image,
  Modal,
} from "react-native";
import { apiRequest } from "./api";

function Recipe({ text, fetchSavedRecipes, fridgeItems, setFridgeItems }) {
  const [isVisible, setIsVisible] = useState(true);
  const [isFavorited, setIsFavorited] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // Parse the JSON recipe data
  let recipeData;
  try {
    recipeData = JSON.parse(text);
  } catch (error) {
    recipeData = { name: "Unknown Recipe", detail: text };
  }

  // Helper: Extract the backend key from an ingredient.
  // For an object ingredient, we assume ingredient.name matches the key.
  // For a string, we use a heuristic: split by spaces and return the first token
  // that does not include digits or measurement words.
  const extractBackendKey = (ingredient) => {
    if (typeof ingredient === "object" && ingredient.name) {
      return ingredient.name.toLowerCase();
    } else if (typeof ingredient === "string") {
      const tokens = ingredient.split(" ");
      const measurements = [
        "g",
        "kg",
        "cup",
        "cups",
        "tablespoon",
        "tablespoons",
        "teaspoon",
        "teaspoons",
        "clove",
        "cloves",
        "ml",
        "l",
      ];
      for (let token of tokens) {
        token = token.replace(/[(),]/g, "");
        if (/\d/.test(token)) continue;
        if (measurements.includes(token.toLowerCase())) continue;
        return token.toLowerCase();
      }
      return ingredient.toLowerCase();
    }
    return "";
  };

  // Prepare ingredients content for the recipe card
  let ingredientsContent = null;
  if (Array.isArray(recipeData.ingredients)) {
    ingredientsContent = (
      <View style={styles.ingredientsContainer}>
        <Text style={styles.sectionTitle}>Ingredients:</Text>
        {recipeData.ingredients.map((ingredient, index) => (
          <Text key={index} style={styles.ingredient}>
            •{" "}
            {typeof ingredient === "object"
              ? `${ingredient.name}: ${ingredient.quantity}`
              : ingredient}
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

  // Use steps if available; otherwise fallback to detail.
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
    const description =
      (Array.isArray(recipeData.ingredients)
        ? recipeData.ingredients
            .map((ingredient) =>
              typeof ingredient === "object"
                ? `${ingredient.name}: ${ingredient.quantity}`
                : ingredient
            )
            .join("\n")
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
    } catch (error) {
      console.error("Error updating favorite status:", error);
    }
  };

  // Decrement the quantity of an item using the backend update_quantity endpoint.
  const decrementQuantity = async (itemName, currentQuantity) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        const response = await apiRequest("/fridge/update_quantity", "POST", {
          name: itemName,
          quantity: newQuantity,
        });
        console.log(response.message);
        setFridgeItems((prev) => ({
          ...prev,
          [itemName]: newQuantity,
        }));
      } else {
        // Remove item completely if quantity drops to 0
        const response = await apiRequest("/fridge/remove_item", "POST", {
          name: itemName,
        });
        console.log(response.message);
        setFridgeItems((prev) => {
          const newState = { ...prev };
          delete newState[itemName];
          return newState;
        });
      }
    } catch (error) {
      console.error("Error decrementing item:", error);
    }
  };

  // When "Cook" is pressed, show the modal.
  const handleCookPress = () => {
    setModalVisible(true);
  };

  // On confirmation, update each ingredient's quantity.
  const handleConfirmCook = async () => {
    if (Array.isArray(recipeData.ingredients)) {
      for (const ingredient of recipeData.ingredients) {
        const key = extractBackendKey(ingredient);
        const currentQuantity = fridgeItems[key];
        if (currentQuantity !== undefined) {
          await decrementQuantity(key, currentQuantity);
        } else {
          console.warn(`Item "${key}" not found in fridge.`);
        }
      }
    }
    setModalVisible(false);
  };

  const handleCancelCook = () => {
    console.log("Cooking cancelled");
    setModalVisible(false);
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
      {/* Cook Button */}
      <TouchableOpacity style={styles.cookButton} onPress={handleCookPress}>
        <Text style={styles.cookButtonText}>Cook</Text>
      </TouchableOpacity>

      {/* Modal: displays fridge ingredients and asks for confirmation */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Cooking Confirmation</Text>
            {recipeData.ingredients && (
              <View style={styles.modalIngredientsContainer}>
                <Text style={styles.modalSectionTitle}>Fridge Ingredients:</Text>
                {Array.isArray(recipeData.ingredients) ? (
                  recipeData.ingredients.map((ingredient, index) => {
                    const key = extractBackendKey(ingredient);
                    const qty =
                      fridgeItems[key] !== undefined ? fridgeItems[key] : "N/A";
                    return (
                      <Text key={index} style={styles.modalIngredientText}>
                        • {key}: {qty}
                      </Text>
                    );
                  })
                ) : (
                  <Text style={styles.modalIngredientText}>
                    {recipeData.ingredients}
                  </Text>
                )}
              </View>
            )}
            <Text style={styles.modalText}>Do you want to cook this?</Text>
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity style={styles.modalButton} onPress={handleCancelCook}>
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalButton} onPress={handleConfirmCook}>
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

export default function RecipePage() {
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  // Example fridge items state; keys should match the backend names (e.g., "beef", "corn")
  const [fridgeItems, setFridgeItems] = useState({
    beef: 2,
    corn: 10,
    onion: 5,
    garlic: 4,
    "red bell pepper": 3,
    "soy sauce": 1,
    "olive oil": 2,
    salt: 10,
    pepper: 8,
  });

  const generateRecipes = async () => {
    setLoading(true);
    try {
      const data = await apiRequest("/fridge/generate_recipes");
      console.log("Received recipe data:", data);
      let formattedRecipes = [];

      // Case 1: Single recipe object with "name", "ingredients", and "steps"
      if (data.name && data.ingredients && data.steps) {
        formattedRecipes.push({
          text: JSON.stringify(data),
        });
      }
      // Case 2: Multiple recipes under keys "recipe1", "recipe2", "recipe3"
      else if (data.recipe1 || data.recipe2 || data.recipe3) {
        const recipesArray = [];
        if (data.recipe1) recipesArray.push(data.recipe1);
        if (data.recipe2) recipesArray.push(data.recipe2);
        if (data.recipe3) recipesArray.push(data.recipe3);
        formattedRecipes = recipesArray.map((recipe) => ({
          text: typeof recipe === "object" ? JSON.stringify(recipe) : recipe,
        }));
      }
      // Case 3: A single string under "recipes"
      else if (data.recipes && typeof data.recipes === "string") {
        formattedRecipes = data.recipes.split("\n\n").map((recipe) => ({
          text: recipe,
        }));
      }
      
      setRecipes(formattedRecipes);
    } catch (error) {
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
              text={recipe.text}
              fetchSavedRecipes={generateRecipes}
              fridgeItems={fridgeItems}
              setFridgeItems={setFridgeItems}
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
  cookButton: {
    backgroundColor: "#FF6347",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "flex-end",
    marginTop: 10,
  },
  cookButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "80%",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },
  modalIngredientsContainer: {
    width: "100%",
    marginBottom: 15,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  modalIngredientText: {
    fontSize: 16,
    color: "#666",
    marginLeft: 10,
  },
  modalText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: "center",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 10,
    marginHorizontal: 5,
    backgroundColor: "#088F8F",
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
});
