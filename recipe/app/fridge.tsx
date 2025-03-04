import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, FlatList, TextInput,Alert} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { apiRequest } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FridgePage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const data = await apiRequest("/fridge/get");
      console.log("User-specific fridge items:", data);
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("Unexpected data format:", data);
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching items:", error);
    }
  };

  const addItem = async (ingredient) => {
    // ingredient should be an object with name and quantity
    try {
      const data = await apiRequest("/fridge/add", "POST", {
        name: ingredient.name,
        quantity: parseInt(ingredient.quantity),
      });
      setItems(data.all_items);
      fetchItems();
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const updateQuantity = async (itemName) => {
    if (!(itemName in editingQuantity)) return;
    const newQuantity = editingQuantity[itemName];
    if (newQuantity === "") return;
    try {
      const data = await apiRequest("/fridge/update_quantity", "POST", {
        name: itemName,
        quantity: parseInt(newQuantity) || 0,
      });
      setItems(data.all_items);
      fetchItems();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const removeItemCompletely = async (itemName) => {
    try {
      await apiRequest("/fridge/remove", "POST", {
        name: itemName,
        quantity: 1000000000,
      });
      fetchItems();
    } catch (error) {
      console.error("Error removing item completely:", error);
    }
  };

  const decrementQuantity = async (itemName, currentQuantity) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        await apiRequest("/fridge/update_quantity", "POST", {
          name: itemName,
          quantity: newQuantity,
        });
        setEditingQuantity((prev) => ({
          ...prev,
          [itemName]: String(newQuantity),
        }));
        fetchItems();
      } else {
        removeItemCompletely(itemName);
      }
    } catch (error) {
      console.error("Error decrementing item:", error);
    }
  };

  const incrementQuantity = async (itemName, currentQuantity) => {
    try {
      const newQuantity = currentQuantity + 1;
      await apiRequest("/fridge/update_quantity", "POST", {
        name: itemName,
        quantity: newQuantity,
      });
      setEditingQuantity((prev) => ({
        ...prev,
        [itemName]: String(newQuantity),
      }));
      fetchItems();
    } catch (error) {
      console.error("Error incrementing quantity:", error);
    }
  };

  // ---------- New: Upload Image and Add Ingredients ----------

  const pickImage = async () => {
    // Request permission first
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission required", "Permission to access camera roll is required!");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.cancelled) {
      uploadImage(result.uri);
    }
  };

  const uploadImage = async (uri) => {
  try {
    setLoading(true);
    // Extract the file name from the URI
    const uriParts = uri.split('/');
    const fileName = uriParts[uriParts.length - 1] || "image.jpg";
    // Determine the file type from the extension (you can add more types as needed)
    const match = /\.(\w+)$/.exec(fileName);
    const type = match ? `image/${match[1]}` : `image`;

    // Prepare a FormData object since the endpoint expects multipart/form-data.
    const formData = new FormData();
    formData.append("image_file", {
      uri,
      name: fileName,
      type,
    });

    // Do not manually set Content-Type; let fetch set it automatically.
    const token = await AsyncStorage.getItem("token");
    const headers = {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };

    const response = await fetch(`http://localhost:8000/fridge/load_from_image`, {
      method: "POST",
      headers,
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Error: ${response.status}`);
    }
    const data = await response.json();
    console.log("Image to ingredients response:", data);
    // Ask user if they want to add these ingredients to the fridge.
    Alert.alert(
      "Add Ingredients?",
      "Do you want to add the detected ingredients to your fridge?",
      [
        {
          text: "No",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: () => {
            if (data.ingredients && Array.isArray(data.ingredients)) {
              data.ingredients.forEach((ingredient) => {
                addItem(ingredient);
              });
            } else {
              Alert.alert("Error", "No ingredients detected.");
            }
          },
        },
      ]
    );
  } catch (error) {
    console.error("Error uploading image:", error);
    Alert.alert("Error", "Failed to process image. Please try again later.");
  } finally {
    setLoading(false);
  }
};


  // -----------------------------------------------------------

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <TouchableOpacity onPress={() => removeItemCompletely(item.name)}>
              <Text style={styles.removeButton}>🗑</Text>
            </TouchableOpacity>
            <Text style={styles.ingredientText}>{item.name}</Text>
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
        )}
      />
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          placeholder="Add Ingredient"
          value={name}
          onChangeText={setName}
        />
        <TextInput
          style={styles.input}
          placeholder="Quantity"
          value={quantity}
          onChangeText={setQuantity}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addItem}>
          <Image source={require("./../assets/images/add3.png")} />
        </TouchableOpacity>
      </View>
      {/* New Upload Image Button */}
      <View style={styles.uploadSection}>
        <TouchableOpacity style={styles.uploadButton} onPress={pickImage}>
          <Text style={styles.uploadButtonText}>Upload Fridge Image</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
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
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: "white",
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ingredientText: {
    fontSize: 16,
    color: "#088F8F",
    flex: 1,
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
  removeButton: {
    fontSize: 20,
    color: "#dc3545",
    paddingHorizontal: 10,
  },
  addButton: {
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  addSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  input: { 
    flex: 1,
    borderWidth: 1,
    borderColor: "#088F8F",
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: "white",
    padding: 10,
  },
  uploadSection: {
    marginTop: 20,
    alignItems: "center",
  },
  uploadButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  uploadButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    letterSpacing: 1,
  },
});
