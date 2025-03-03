import { useState, useEffect } from "react";
import { Image, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView } from "react-native";
import { apiRequest } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";


export default function FridgePage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState({});

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const userId = await AsyncStorage.getItem("userId");
      if (!userId) {
        console.log("No user logged in.");
        return;
      }
  
      const data = await apiRequest(`/fridge/${userId}/get`);
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
      fetchItems(); // 🔹 Refresh the item list to prevent clearing all items
    } catch (error) {
      console.error("Error removing item completely:", error);
    }
  };

  const decrementQuantity = async (itemName, currentQuantity) => {
    try {
      if (currentQuantity > 1) {
        const response = await fetch("http://127.0.0.1:8000/fridge/remove", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: itemName, quantity: 1 }), // Decrement by 1
        });
  
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Error ${response.status}: ${errorText}`);
        }
  
        fetchItems(); // 🔹 Ensure we fetch the updated list
      } else {
        removeItemCompletely(itemName); // If last item, remove it entirely
      }
    } catch (error) {
      console.error("Error decrementing item:", error);
    }
  };

  
  const incrementQuantity = async (itemName, currentQuantity) => {
    try {
      const newQuantity = currentQuantity + 1; // Increment quantity by 1
  
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
        [itemName]: String(newQuantity), // Ensure UI reflects updated quantity
      }));
  
      fetchItems(); // Refresh the item list after update
    } catch (error) {
      console.error("Error incrementing quantity:", error);
    }
  };
  

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
              value={editingQuantity[item.name] !== undefined ? editingQuantity[item.name] : String(item.quantity)}
              onChangeText={(text) => setEditingQuantity({ ...editingQuantity, [item.name]: text })}
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
});
