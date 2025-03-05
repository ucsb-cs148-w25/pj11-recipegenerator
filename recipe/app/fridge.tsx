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
  Animated,
} from "react-native";
import { apiRequest } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function FridgePage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState({});
  const [pendingDeletion, setPendingDeletion] = useState(null);
  const [fadeAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    // When pendingDeletion is set, animate the banner in
    if (pendingDeletion) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Fade out when no pending deletion
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [pendingDeletion, fadeAnim]);

  const fetchItems = async () => {
    try {
      // Call the endpoint without a user ID in the URL.
      const data = await apiRequest("/fridge/get");
      console.log("User-specific fridge items:", data);
      if (Array.isArray(data)) {
        setItems(data);
      } else {
        console.error("Unexpected data format:", data);
        setItems([]);
      }
    } catch (error) {
      console.error("Error fetching fridge items:", error);
    }
  };

  const addItem = async () => {
    if (!name || !quantity) return;
    try {
      const data = await apiRequest("/fridge/add", "POST", {
        name,
        quantity: parseInt(quantity),
      });
      setItems(data.all_items);
      setName("");
      setQuantity("");
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

  const startDeleteItem = (itemName, itemQuantity) => {
    // Store the item details for potential restoration
    setPendingDeletion({
      name: itemName,
      quantity: itemQuantity,
      timerId: setTimeout(() => {
        finalizeDelete(itemName);
      }, 5000), // Changed from 10000 to 5000 (5 seconds)
    });

    // Also add a timer to start fading the banner slightly before deletion
    setTimeout(() => {
      // Start fading out the banner 0.5 seconds before final deletion
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 4500); // Start fading 0.5s before deletion (at 4.5s)

    // Hide the item in UI but don't delete from backend yet
    setItems(items.filter((item) => item.name !== itemName));
  };

  const undoDelete = () => {
    if (!pendingDeletion) return;

    // Clear the timeout to prevent actual deletion
    clearTimeout(pendingDeletion.timerId);

    // Restore the item to the list
    setItems((prevItems) => [
      ...prevItems,
      { name: pendingDeletion.name, quantity: pendingDeletion.quantity },
    ]);

    // Clear the pending deletion
    setPendingDeletion(null);
  };

  const finalizeDelete = async (itemName) => {
    try {
      await apiRequest("/fridge/remove", "POST", {
        name: itemName,
        quantity: 1000000000,
      });
      // Already removed from UI, just clear the pending state
      setPendingDeletion(null);
    } catch (error) {
      console.error("Error removing item completely:", error);
      // In case of error, refresh to get current state
      fetchItems();
      setPendingDeletion(null);
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
        startDeleteItem(itemName, currentQuantity);
      }
    } catch (error) {
      console.error("Error decrementing quantity:", error);
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Fridge</Text>

      {/* Ingredient input form */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Add new ingredient..."
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
          <Text style={styles.buttonText}>Add</Text>
        </TouchableOpacity>
      </View>

      {/* Ingredient list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id || item.name}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <Text style={styles.ingredientText}>{item.name}</Text>
            <TouchableOpacity
              onPress={() => decrementQuantity(item.name, item.quantity)}
            >
              <Text style={styles.quantityAdjustButton}>-</Text>
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
            <TouchableOpacity
              onPress={() => incrementQuantity(item.name, item.quantity)}
            >
              <Text style={styles.quantityAdjustButton}>+</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => startDeleteItem(item.name, item.quantity)}
            >
              <Text style={styles.removeButton}>🗑</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Undo deletion banner */}
      {pendingDeletion && (
        <Animated.View style={[styles.undoBanner, { opacity: fadeAnim }]}>
          <Text style={styles.undoText}>Item deleted</Text>
          <TouchableOpacity onPress={undoDelete}>
            <Text style={styles.undoButton}>UNDO</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f8f9fa",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#343a40",
    letterSpacing: 0.5,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "white",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientText: {
    flex: 1,
    fontSize: 16,
    color: "#495057",
  },
  quantityInput: {
    width: 40,
    textAlign: "center",
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    marginHorizontal: 8,
    paddingVertical: 2,
  },
  quantityAdjustButton: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#6c757d",
    paddingHorizontal: 8,
  },
  removeButton: {
    fontSize: 18,
    color: "#dc3545",
    marginLeft: 8,
  },
  form: {
    flexDirection: "row",
    marginBottom: 16,
  },
  input: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: "#ced4da",
    borderRadius: 4,
    marginRight: 8,
    paddingHorizontal: 8,
    backgroundColor: "white",
  },
  addButton: {
    backgroundColor: "#28a745",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderRadius: 4,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  undoBanner: {
    position: "absolute",
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: "#333",
    padding: 12,
    borderRadius: 4,
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
  },
  undoButton: {
    color: "#4dabf7",
    fontWeight: "bold",
    fontSize: 14,
  },
});
