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
} from "react-native";
import { FontAwesome } from '@expo/vector-icons';
import { apiRequest } from "./api";
import SwipeableItem from "./SwipeableItem";  // <-- import our custom component

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

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: string }>({});
  const [deletedItems, setDeletedItems] = useState<{ [key: string]: DeletedItem }>({});
  const timersRef = useRef<TimerRefs>({});
  const fadeAnimRef = useRef<AnimationRefs>({});

  useEffect(() => {
    fetchItems();
    return () => {
      // Clean up timers on unmount
      Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
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
      await apiRequest("/fridge/add", "POST", { name, quantity: parseInt(quantity) } as any);
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
      await apiRequest("/fridge/update_quantity", "POST", { name: itemName, quantity: parseInt(newQuantity) || 0 } as any);
      fetchItems();
    } catch (error) {
      console.error("Error updating quantity:", error);
    }
  };

  const deleteItem = async (item: FridgeItem) => {
    const itemName = item.name;

    // Find the index of the item before removing it (for restoring position)
    const itemIndex = items.findIndex(i => i.name === itemName);

    // Store for potential undo with original index
    setDeletedItems(prev => ({
      ...prev,
      [itemName]: {
        item,
        timestamp: Date.now(),
        originalIndex: itemIndex >= 0 ? itemIndex : 0 // Store the original position
      }
    }));

    // Remove from the current list
    setItems(prev => prev.filter(i => i.name !== itemName));

    // Fade animation for the toast
    fadeAnimRef.current[itemName] = new Animated.Value(1);

    // Start fade animation after 4.5 seconds
    setTimeout(() => {
      Animated.timing(fadeAnimRef.current[itemName], {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start();
    }, 4500);

    // Set a timer to permanently delete after 5 seconds
    timersRef.current[itemName] = setTimeout(async () => {
      try {
        await apiRequest("/fridge/remove", "POST", { name: itemName, quantity: 1000000000 } as any);
        // Remove from deleted items state
        setDeletedItems(prev => {
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

    // Clear the deletion timer
    if (timersRef.current[itemName]) {
      clearTimeout(timersRef.current[itemName]);
      delete timersRef.current[itemName];
    }

    // Add back to items at the original position
    setItems(prev => {
      const newItems = [...prev];
      // Insert at original position if possible, otherwise at the beginning
      const insertIndex = Math.min(deletedItem.originalIndex || 0, newItems.length);
      newItems.splice(insertIndex, 0, deletedItem.item);
      return newItems;
    });

    // Remove from deleted items
    setDeletedItems(prev => {
      const updated = { ...prev };
      delete updated[itemName];
      return updated;
    });
  };

  const decrementQuantity = async (itemName: string, currentQuantity: number) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        await apiRequest("/fridge/update_quantity", "POST", { name: itemName, quantity: newQuantity } as any);
        setEditingQuantity(prev => ({ ...prev, [itemName]: String(newQuantity) }));
        fetchItems();
      } else {
        // If it goes to 0, just delete
        const itemToDelete = items.find(item => item.name === itemName);
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
      await apiRequest("/fridge/update_quantity", "POST", { name: itemName, quantity: newQuantity } as any);
      setEditingQuantity((prev) => ({
        ...prev,
        [itemName]: String(newQuantity),
      }));
      fetchItems();
    } catch (error) {
      console.error("Error incrementing quantity:", error);
    }
  };

  // The actual UI of a single row (inside the swipeable front card)
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

  // Render each item in the FlatList using our custom swipeable row
  const renderItem = ({ item }: { item: FridgeItem }) => {
    return (
      <SwipeableItem
        onDelete={() => deleteItem(item)}
        borderRadius={10}
      >
        {renderFridgeItemContent(item)}
      </SwipeableItem>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>

      {/* Our custom swipe-to-delete list */}
      <FlatList
        data={items}
        keyExtractor={(item) => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120 }}
      />

      {/* Floating Add Ingredient Section */}
      <View style={styles.floatingAddContainer}>
        <TouchableOpacity style={styles.cameraButton}>
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
      {Object.keys(deletedItems).map(itemName => (
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
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cameraButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
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
    color: '#333',
  },
  quantityFloatingInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: '#333',
    borderLeftWidth: 1,
    borderLeftColor: '#E0E0E0',
    paddingLeft: 10,
    marginLeft: 5,
  },
  floatingAddButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  /* Undo Toast */
  undoToast: {
    position: 'absolute',
    bottom: 70,
    left: 20,
    right: 20,
    backgroundColor: '#333333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  undoText: {
    color: 'white',
    fontSize: 14,
    maxWidth: '70%',
  },
  undoButtonContainer: {
    paddingVertical: 5,
    paddingHorizontal: 8,
  },
  undoButton: {
    color: '#4CBBCE',
    fontWeight: 'bold',
    fontSize: 14,
  },
});
