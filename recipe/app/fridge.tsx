import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
  FlatList,
  Alert,
  Modal,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import { apiRequest } from "./api";
import SwipeableItem from "./SwipeableItem"; // <-- import our custom component

// Define types for our items and refs
type FridgeItem = {
  id?: string;
  name: string;
  quantity: number;
};

type TimerRefs = {
  [key: string]: NodeJS.Timeout;
};

type AnimationRefs = {
  [key: string]: Animated.Value;
};

type DeletedItem = {
  item: FridgeItem;
  timestamp: number;
  originalIndex?: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: string }>({});
  const [deletedItems, setDeletedItems] = useState<{ [key: string]: DeletedItem }>({});
  // Store the backend response data.
  const [detectedIngredients, setDetectedIngredients] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const timersRef = useRef<TimerRefs>({});
  const fadeAnimRef = useRef<AnimationRefs>({});

  useEffect(() => {
    fetchItems();
    return () => {
      // Clean up timers on unmount
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  const fetchItems = async () => {
    try {
      const data = await apiRequest("/fridge/get");
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const addItem = async () => {
    if (!name || !quantity) return;
    try {
      await apiRequest("/fridge/add", "POST", {
        name,
        quantity: parseInt(quantity),
      } as any);
      setName("");
      setQuantity("");
      fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const updateQuantity = async (itemName: string) => {
    if (!(itemName in editingQuantity)) return;
    const newQuantity = editingQuantity[itemName];
    if (newQuantity === "") return;
    try {
      await apiRequest("/fridge/update_quantity", "POST", {
        name: itemName,
        quantity: parseInt(newQuantity) || 0,
      } as any);
      fetchItems();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const deleteItem = async (item: FridgeItem) => {
    const itemName = item.name;
    const itemIndex = items.findIndex((i) => i.name === itemName);

    setDeletedItems((prev) => ({
      ...prev,
      [itemName]: {
        item,
        timestamp: Date.now(),
        originalIndex: itemIndex >= 0 ? itemIndex : 0,
      },
    }));

    setItems((prev) => prev.filter((i) => i.name !== itemName));
    fadeAnimRef.current[itemName] = new Animated.Value(1);

    setTimeout(() => {
      Animated.timing(fadeAnimRef.current[itemName], {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 4500);

    timersRef.current[itemName] = setTimeout(async () => {
      try {
        await apiRequest("/fridge/remove", "POST", {
          name: itemName,
          quantity: 1000000000,
        } as any);
        setDeletedItems((prev) => {
          const updated = { ...prev };
          delete updated[itemName];
          return updated;
        });
      } catch (error) {
        console.error("Error removing item completely:", error);
      }
    }, 5000);
  };

  const undoDeleteItem = (itemName: string) => {
    const deletedItem = deletedItems[itemName];
    if (!deletedItem) return;

    if (timersRef.current[itemName]) {
      clearTimeout(timersRef.current[itemName]);
      delete timersRef.current[itemName];
    }

    setItems((prev) => {
      const newItems = [...prev];
      const insertIndex = Math.min(deletedItem.originalIndex || 0, newItems.length);
      newItems.splice(insertIndex, 0, deletedItem.item);
      return newItems;
    });

    setDeletedItems((prev) => {
      const updated = { ...prev };
      delete updated[itemName];
      return updated;
    });
  };

  const decrementQuantity = async (itemName: string, currentQuantity: number) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        await apiRequest("/fridge/update_quantity", "POST", {
          name: itemName,
          quantity: newQuantity,
        } as any);
        setEditingQuantity((prev) => ({ ...prev, [itemName]: String(newQuantity) }));
        fetchItems();
      } else {
        const itemToDelete = items.find((item) => item.name === itemName);
        if (itemToDelete) {
          deleteItem(itemToDelete);
        }
      }
    } catch (error) {
      console.error("Error decrementing item:", error);
    }
  };

  const incrementQuantity = async (itemName: string, currentQuantity: number) => {
    try {
      const newQuantity = currentQuantity + 1;
      await apiRequest("/fridge/update_quantity", "POST", {
        name: itemName,
        quantity: newQuantity,
      } as any);
      setEditingQuantity((prev) => ({
        ...prev,
        [itemName]: String(newQuantity),
      }));
      fetchItems();
    } catch (error) {
      console.error("Error incrementing quantity:", error);
    }
  };

  // Function to handle image picking and display the modal with returned ingredients.
  const handleCameraButtonPress = async () => {
    // Request permission to access media library
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Permission to access the media library is required!");
      return;
    }

    // Launch image picker for images only
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.cancelled) {
      return;
    }

    // Get the URI from the result (works for both web and native)
    const localUri = result.uri || (result.assets && result.assets[0]?.uri);
    if (!localUri) {
      Alert.alert("Error", "No image URI found.");
      return;
    }

    // Convert the URI to a Blob (needed for web)
    let blob;
    try {
      const response = await fetch(localUri);
      blob = await response.blob();
    } catch (error) {
      console.error("Error converting image to blob:", error);
      Alert.alert("Error", "Could not process the image file.");
      return;
    }

    // Ensure a valid filename with an allowed extension.
    let filename = localUri.split("/").pop() || "photo.jpg";
    if (!/\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i.test(filename)) {
      filename += ".jpg";
    }

    const formData = new FormData();
    formData.append("image_file", blob, filename);

    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/load_from_image", {
        method: "POST",
        body: formData,
      });
      const jsonResponse = await response.json();
      // Expecting the backend to return { "ingredients": [ ... ] }
      if (jsonResponse && jsonResponse.ingredients) {
        console.log("Detected ingredients:", jsonResponse.ingredients);
        setDetectedIngredients(jsonResponse.ingredients);
        setModalVisible(true);
      } else {
        Alert.alert("Error", "No ingredients information was detected in the image.");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Error", "There was an error uploading the image.");
    }
  };

  // The UI for a single fridge item.
  const renderFridgeItemContent = (item: FridgeItem) => {
    return (
      <View style={styles.ingredientItem}>
        <Text style={styles.ingredientText}>{item.name}</Text>
        <View style={styles.quantityControls}>
          <TouchableOpacity onPress={() => decrementQuantity(item.name, item.quantity)}>
            <Text style={styles.quantityButton}>-</Text>
          </TouchableOpacity>
          <TextInput
            style={styles.quantityInput}
            keyboardType="numeric"
            value={
              editingQuantity[item.name] !== undefined
                ? editingQuantity[item.name]
                : String(item.quantity)
            }
            onChangeText={(text) =>
              setEditingQuantity({ ...editingQuantity, [item.name]: text })
            }
            onSubmitEditing={() => updateQuantity(item.name)}
          />
          <TouchableOpacity onPress={() => incrementQuantity(item.name, item.quantity)}>
            <Text style={styles.quantityButton}>+</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render each item using our custom swipeable row.
  const renderItem = ({ item }: { item: FridgeItem }) => {
    return (
      <SwipeableItem onDelete={() => deleteItem(item)} borderRadius={10}>
        {renderFridgeItemContent(item)}
      </SwipeableItem>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>

      {/* Custom swipe-to-delete list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Floating Add Ingredient Section */}
      <View style={styles.floatingAddContainer}>
        <TouchableOpacity style={styles.cameraButton} onPress={handleCameraButtonPress}>
          <FontAwesome name="camera" size={22} color="#088F8F" />
        </TouchableOpacity>

        <View style={styles.inputContainer}>
          <TextInput
            style={styles.floatingInput}
            placeholder="Add ingredient"
            placeholderTextColor="#AAAAAA"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.quantityFloatingInput}
            placeholder="Qty"
            placeholderTextColor="#AAAAAA"
            value={quantity}
            onChangeText={setQuantity}
            keyboardType="numeric"
          />
        </View>

        <TouchableOpacity style={styles.floatingAddButton} onPress={addItem}>
          <FontAwesome name="plus" size={22} color="#088F8F" />
        </TouchableOpacity>
      </View>

      {/* Undo Toasts */}
      {Object.keys(deletedItems).map((itemName) => (
        <Animated.View
          key={itemName}
          style={[styles.undoToast, { opacity: fadeAnimRef.current[itemName] || 1 }]}
        >
          <Text style={styles.undoText}>"{itemName}" removed</Text>
          <TouchableOpacity
            style={styles.undoButtonContainer}
            onPress={() => undoDeleteItem(itemName)}
          >
            <Text style={styles.undoButton}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      ))}

      {/* Modal Pop Up for Detected Ingredients */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Detected Ingredients</Text>
            <Text style={styles.modalText}>
              Do you want to add these ingredients to your fridge?
            </Text>
            {detectedIngredients && Array.isArray(detectedIngredients) ? (
              detectedIngredients.map((ingredient: any, index: number) => (
                <View key={index} style={styles.modalIngredientRow}>
                  <Text style={styles.modalIngredientItem}>
                    {ingredient.name}: {ingredient.quantity}
                  </Text>
                  <TouchableOpacity
                    onPress={() =>
                      setDetectedIngredients((prev: any) =>
                        prev.filter((_: any, i: number) => i !== index)
                      )
                    }
                  >
                    <Text style={styles.removeButton}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.modalText}>No ingredients detected.</Text>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  for (const ingredient of detectedIngredients) {
                    let qty = 1;
                    if (ingredient.quantity && typeof ingredient.quantity === "string") {
                      const match = ingredient.quantity.match(/\d+/);
                      qty = match ? parseInt(match[0]) : 1;
                    }
                    await apiRequest("/fridge/add", "POST", {
                      name: ingredient.name,
                      quantity: qty,
                    } as any);
                  }
                  fetchItems();
                  setModalVisible(false);
                }}
              >
                <Text style={styles.modalButtonText}>Yes</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F6FFF7",
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#088F8F",
    letterSpacing: 0.5,
  },
  ingredientItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "white",
    borderRadius: 10,
    padding: 15,
  },
  ingredientText: {
    fontSize: 16,
    color: "#088F8F",
    flex: 1,
  },
  quantityControls: {
    flexDirection: "row",
    alignItems: "center",
  },
  quantityButton: {
    fontSize: 20,
    color: "#088F8F",
    paddingHorizontal: 10,
  },
  quantityInput: {
    width: 50,
    height: 30,
    borderWidth: 1,
    borderColor: "#088F8F",
    textAlign: "center",
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: "white",
  },
  /* Floating Add Section */
  floatingAddContainer: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  inputContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 22,
    paddingHorizontal: 15,
    paddingVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  floatingInput: {
    flex: 2,
    height: 40,
    fontSize: 16,
    paddingLeft: 5,
    color: "#333",
  },
  quantityFloatingInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
    borderLeftWidth: 1,
    borderLeftColor: "#E0E0E0",
    paddingLeft: 10,
    marginLeft: 5,
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  /* Undo Toast */
  undoToast: {
    position: "absolute",
    bottom: 70,
    left: 20,
    right: 20,
    backgroundColor: "#333333",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
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
    fontSize: 14,
    maxWidth: "70%",
  },
  undoButtonContainer: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  undoButton: {
    color: "#4CBBCE",
    fontWeight: "bold",
    fontSize: 14,
  },
  /* Modal Styles */
  modalContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#333",
  },
  modalText: {
    fontSize: 16,
    marginBottom: 15,
    textAlign: "center",
    color: "#555",
  },
  modalIngredientRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  modalIngredientItem: {
    fontSize: 16,
    flex: 1,
    color: "#333",
  },
  removeButton: {
    fontSize: 18,
    color: "#ff4444",
    marginLeft: 10,
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    marginHorizontal: 10,
    paddingVertical: 12,
    backgroundColor: "#088F8F",
    borderRadius: 10,
    alignItems: "center",
  },
  modalButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default FridgePage;
