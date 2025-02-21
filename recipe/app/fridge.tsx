import { useState, useEffect } from "react";
import { 
  Image, 
  View, 
  Text, 
  StyleSheet, 
  TextInput, 
  FlatList, 
  TouchableOpacity, 
  ScrollView,
  ActivityIndicator,
  Alert 
} from "react-native";
import * as ImagePicker from "expo-image-picker";

export default function FridgePage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState({});
  const [mlResult, setMlResult] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/get");
      const data = await response.json();
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

  const addItem = async () => {
    if (!name || !quantity) return;
    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, quantity: parseInt(quantity) }),
      });
      const data = await response.json();
      setItems(data.all_items);
      setName("");
      setQuantity("");
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
      const response = await fetch("http://127.0.0.1:8000/fridge/update_quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName, quantity: parseInt(newQuantity) || 0 }),
      });
      const data = await response.json();
      setItems(data.all_items);
      fetchItems();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const removeItemCompletely = async (itemName) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/remove", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName, quantity: 1000000000 }), // Remove completely
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
      fetchItems();
    } catch (error) {
      console.error("Error removing item completely:", error);
    }
  };

  const decrementQuantity = async (itemName, currentQuantity) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        const response = await fetch("http://127.0.0.1:8000/fridge/update_quantity", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, quantity: newQuantity }),
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
  
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
      const response = await fetch("http://127.0.0.1:8000/fridge/update_quantity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: itemName, quantity: newQuantity }),
      });
  
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Error ${response.status}: ${errorText}`);
      }
  
      setEditingQuantity((prev) => ({
        ...prev,
        [itemName]: String(newQuantity),
      }));
      fetchItems();
    } catch (error) {
      console.error("Error incrementing quantity:", error);
    }
  };

  // ----- Image Upload Functions -----
  const pickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert("Permission Denied", "Permission to access the gallery is required.");
      return;
    }
  
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 1,
    });
  
    // Use the new property and asset array
    if (!result.canceled) {
      uploadImage(result.assets[0]);
    }
  };
  

  const uploadImage = async (photo) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append("image_file", {
      uri: photo.uri,
      name: "photo.jpg",
      type: "image/jpeg",
    });
  
    try {
      const response = await fetch("http://127.0.0.1:8000/fridge/load_from_image", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) throw new Error("Error uploading image");
      const data = await response.json();
      setMlResult(data.recipes);
    } catch (error) {
      Alert.alert("Upload Error", error.message);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>

      {/* Display ML result if available */}
      {mlResult && (
        <View style={styles.mlResultContainer}>
          <Text style={styles.mlResultTitle}>ML Result:</Text>
          <Text style={styles.mlResultText}>{mlResult}</Text>
        </View>
      )}

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

      {/* Upload Image Section */}
      <View style={styles.uploadSection}>
        <TouchableOpacity
          style={styles.uploadButton}
          onPress={pickImage}
          disabled={isUploading}
        >
          {isUploading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={styles.buttonText}>Upload Image</Text>
          )}
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
    borderWidth: 1,
    borderColor: "#088F8F",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: "white",
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
  buttonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1,
  },
  mlResultContainer: {
    marginVertical: 20,
    padding: 15,
    backgroundColor: "#e8f0fe",
    borderRadius: 10,
  },
  mlResultTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: "#333",
    marginBottom: 10,
  },
  mlResultText: {
    fontSize: 16,
    color: "#333",
  },
});
