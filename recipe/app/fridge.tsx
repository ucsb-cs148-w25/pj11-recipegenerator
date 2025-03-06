import { useState, useEffect, useRef } from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  Dimensions,
} from "react-native";
import { SwipeListView } from 'react-native-swipe-list-view';
import { apiRequest } from "./api";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { FontAwesome } from '@expo/vector-icons';

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

// Type for deleted items (for undo)
type DeletedItem = {
  item: FridgeItem;
  timestamp: number;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const DELETE_THRESHOLD = SCREEN_WIDTH * 0.35; // 35% threshold

export default function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<{ [key: string]: string }>({});
  const [deletedItems, setDeletedItems] = useState<{ [key: string]: DeletedItem }>({});
  const [trashJumped, setTrashJumped] = useState(false); // flag to avoid re-triggering jump
  const timersRef = useRef<TimerRefs>({});
  const fadeAnimRef = useRef<AnimationRefs>({});
  const trashAnim = useRef(new Animated.Value(0)); // for trash can jump animation
  const listRef = useRef<SwipeListView<FridgeItem>>(null);

  useEffect(() => {
    fetchItems();
    return () => {
      // Clear timers when component unmounts
      Object.values(timersRef.current).forEach(timer => clearTimeout(timer));
    };
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
    // Store the item for potential undo
    const itemName = item.name;

    // Add to deleted items
    setDeletedItems(prev => ({
      ...prev,
      [itemName]: {
        item: item,
        timestamp: Date.now()
      }
    }));

    // Remove from the current list
    setItems(prevItems => prevItems.filter(i => i.name !== itemName));

    // Clear any existing timer for this item
    if (timersRef.current[itemName]) {
      clearTimeout(timersRef.current[itemName]);
    }

    // Create fade animation for the toast
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

    // Add the item back to the list with a small delay to ensure UI updates properly
    setTimeout(() => {
      setItems(prevItems => [...prevItems, deletedItem.item]);

      // Remove from deleted items state
      setDeletedItems(prev => {
        const updated = { ...prev };
        delete updated[itemName];
        return updated;
      });
    }, 50);
  };

  const decrementQuantity = async (itemName: string, currentQuantity: number) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        await apiRequest("/fridge/update_quantity", "POST", { name: itemName, quantity: newQuantity } as any);
        setEditingQuantity((prev) => ({
          ...prev,
          [itemName]: String(newQuantity),
        }));
        fetchItems();
      } else {
        // Find the item to delete
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

  const renderItem = ({ item }: { item: FridgeItem }) => (
    <View style={styles.ingredientItem}>
      <Text style={styles.ingredientText}>{item.name}</Text>
      <View style={styles.quantityControls}>
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
    </View>
  );

  // Render the hidden row with a red background and trash can icon
  const renderHiddenItem = ({ item }: { item: FridgeItem }) => (
    <View style={styles.rowBack}>
      <Animated.View style={[styles.trashIconContainer, { transform: [{ translateY: trashAnim.current }] }]}>
        <FontAwesome name="trash" size={24} color="white" />
      </Animated.View>
    </View>
  );

  // onSwipeValueChange handles the trash can jump but does not trigger deletion
  const onSwipeValueChange = (swipeData: any) => {
    const { key, value, isOpen } = swipeData;
    if (value < -DELETE_THRESHOLD && !isOpen) {
      const item = items.find(i => (i.id || i.name) === key);
      if (item && !deletedItems[item.name]) { // Only delete if not already in deletedItems
        setTimeout(() => {
          deleteItem(item);
        }, 300);
      }
    }
  };

  // onRowDidOpen is called when the user releases their finger and the row is fully open.
  // At that point, we animate the row (if needed) and trigger deletion.
  const onRowDidOpen = (rowKey: string) => {
    const item = items.find(i => (i.id || i.name) === rowKey);
    if (item && !deletedItems[item.name]) { // Only delete if not already in deletedItems
      // Here you can add an extra animation if desired.
      // For example, you could animate the row's red background sliding fully in.
      // In this example, we simply wait a short duration before deleting.
      setTimeout(() => {
        deleteItem(item);
      }, 300); // delay to let any final animation complete
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>

      <SwipeListView
        ref={listRef}
        data={items}
        keyExtractor={(item) => item.id || item.name}
        renderItem={renderItem}
        renderHiddenItem={renderHiddenItem}
        rightOpenValue={-SCREEN_WIDTH} // row slides fully offscreen
        leftOpenValue={0}
        disableRightSwipe
        friction={15}
        tension={0}
        swipeToOpenPercent={35}
        onSwipeValueChange={onSwipeValueChange}
        onRowDidOpen={onRowDidOpen}  // triggers deletion only after release
        useNativeDriver={true}
        style={styles.list}
      />

      {/* Floating Add Ingredient Section */}
      <View style={styles.floatingAddContainer}>
        <TouchableOpacity style={styles.uploadButton}>
          <FontAwesome name="upload" size={22} color="#088F8F" />
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
          <TouchableOpacity style={styles.cameraButton}>
            <FontAwesome name="camera" size={20} color="#088F8F" />
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.floatingAddButton} onPress={addItem}>
          <FontAwesome name="plus" size={22} color="#088F8F" />
        </TouchableOpacity>
      </View>

      {Object.keys(deletedItems).map(itemName => (
        <Animated.View
          key={itemName}
          style={[styles.undoToast, { opacity: fadeAnimRef.current[itemName] || 1 }]}
        >
          <Text style={styles.undoText}>"{itemName}" removed</Text>
          <TouchableOpacity style={styles.undoButtonContainer} onPress={() => undoDeleteItem(itemName)}>
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
  list: {
    marginBottom: 100, // Increased space for the floating input
    paddingBottom: 20,
  },
  ingredientItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
  rowBack: {
    alignItems: 'center',
    backgroundColor: '#FF6B6B',
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingRight: 15,
    borderRadius: 15,
    marginBottom: 10,
  },
  trashIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    width: 75,
  },
  floatingAddContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
    backgroundColor: 'transparent',
  },
  uploadButton: {
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
    color: '#333',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
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
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderColor: 'transparent',
  },
  cameraButton: {
    marginLeft: 10,
    padding: 5,
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
  }
});
