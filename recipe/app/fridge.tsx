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
  ActivityIndicator,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { FontAwesome } from "@expo/vector-icons";
import { apiRequest } from "./api";
import SwipeableItem from "./SwipeableItem"; // <-- import our custom component
import { useFocusEffect } from "@react-navigation/native";

// Define types for our items and refs
type FridgeItem = {
  id?: string;
  name: string;
  quantity: number;
  selected?: boolean; // Add selected property for batch operations
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

// Tutorial step definitions
enum TutorialStep {
  None = 0,
  AddItem = 1,
  SwipeToDelete = 2,
  UndoDelete = 3,
  SearchFeature = 4,
  SortFeature = 5,
  BatchSelectionFeature1 = 6,
  BatchSelectionFeature2 = 7,
  ImageUpload = 8,
  Completed = 9,
}

// Define sort types with direction built in
enum SortType {
  None = "none",
  NameAZ = "name_az",
  NameZA = "name_za",
  QuantityLowHigh = "quantity_low_high",
  QuantityHighLow = "quantity_high_low",
}

// Define sort option interface for dropdown
interface SortOption {
  label: string;
  value: SortType;
  icon: string; // Using string type to accommodate all icon names
}

const sortOptions: SortOption[] = [
  { label: "Sort by...", value: SortType.None, icon: "sort" },
  { label: "Name (A to Z)", value: SortType.NameAZ, icon: "sort-alpha-asc" },
  { label: "Name (Z to A)", value: SortType.NameZA, icon: "sort-alpha-desc" },
  {
    label: "Quantity (Low to High)",
    value: SortType.QuantityLowHigh,
    icon: "sort-amount-asc",
  },
  {
    label: "Quantity (High to Low)",
    value: SortType.QuantityHighLow,
    icon: "sort-amount-desc",
  },
];

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

function FridgePage() {
  const [items, setItems] = useState<FridgeItem[]>([]);
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [editingQuantity, setEditingQuantity] = useState<{
    [key: string]: string;
  }>({});
  const [deletedItems, setDeletedItems] = useState<{
    [key: string]: DeletedItem;
  }>({});
  // Store the backend response data.
  const [detectedIngredients, setDetectedIngredients] = useState<any>(null);
  const [modalVisible, setModalVisible] = useState(false);
  // Add state for image uploading
  const [isImageUploading, setIsImageUploading] = useState(false);
  const timersRef = useRef<TimerRefs>({});
  const fadeAnimRef = useRef<AnimationRefs>({});

  // Tutorial states
  const [tutorialActive, setTutorialActive] = useState(false);
  const [currentTutorialStep, setCurrentTutorialStep] = useState<TutorialStep>(
    TutorialStep.None
  );
  const [showTutorialTooltip, setShowTutorialTooltip] = useState(false);
  const tooltipAnim = useRef(new Animated.Value(0)).current;

  // Sorting state
  const [sortType, setSortType] = useState<SortType>(SortType.None);
  // New dropdown state
  const [showSortDropdown, setShowSortDropdown] = useState(false);

  // Add search functionality
  const [searchQuery, setSearchQuery] = useState("");

  // Batch selection states
  const [batchMode, setBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Add this effect at the component level, near other useEffect hooks
  useEffect(() => {
    // If we're on batch selection step 1 and batch mode is already active, skip to step 2
    if (
      currentTutorialStep === TutorialStep.BatchSelectionFeature1 &&
      batchMode
    ) {
      setCurrentTutorialStep(TutorialStep.BatchSelectionFeature2);
    }
  }, [currentTutorialStep, batchMode]);

  // Filter items based on search query
  const filterItems = (items: FridgeItem[]): FridgeItem[] => {
    if (!searchQuery.trim()) return items;

    return items.filter((item) =>
      item.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  useEffect(() => {
    fetchItems();

    return () => {
      // Clean up timers on unmount
      Object.values(timersRef.current).forEach((timer) => clearTimeout(timer));
    };
  }, []);

  // Use useFocusEffect to check tutorial status every time the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check if user should see the tutorial when screen is focused
      checkFirstTimeUser();
      return () => {
        // Cleanup if needed when screen loses focus
      };
    }, [])
  );

  // Check if user is a first-time user
  const checkFirstTimeUser = async () => {
    try {
      const hasSeenTutorial = await AsyncStorage.getItem(
        "hasSeenFridgeTutorial"
      );
      if (hasSeenTutorial !== "true") {
        startTutorial();
      }
    } catch (error) {
      console.error("Error checking tutorial status:", error);
    }
  };

  // Start the tutorial sequence
  const startTutorial = () => {
    // Ensure any previous tutorial is fully reset
    setTutorialActive(false);
    setCurrentTutorialStep(TutorialStep.None);
    setShowTutorialTooltip(false);

    // Short delay to ensure clean start
    setTimeout(() => {
      setTutorialActive(true);
      setCurrentTutorialStep(TutorialStep.AddItem);
      setShowTutorialTooltip(true);
    }, 100);
  };

  // Animate tooltip
  useEffect(() => {
    if (showTutorialTooltip) {
      Animated.timing(tooltipAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(tooltipAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [showTutorialTooltip]);

  // Progress to next tutorial step
  const nextTutorialStep = () => {
    setShowTutorialTooltip(false);

    // Short delay before showing next step
    setTimeout(() => {
      if (currentTutorialStep < TutorialStep.Completed) {
        setCurrentTutorialStep(currentTutorialStep + 1);
        setShowTutorialTooltip(true);
      } else {
        completeTutorial();
      }
    }, 300);
  };

  // Mark tutorial as completed
  const completeTutorial = async () => {
    setTutorialActive(false);
    setCurrentTutorialStep(TutorialStep.None);

    try {
      await AsyncStorage.setItem("hasSeenFridgeTutorial", "true");
    } catch (error) {
      console.error("Error saving tutorial status:", error);
    }
  };

  // Skip the tutorial entirely
  const skipTutorial = async () => {
    setTutorialActive(false);
    setCurrentTutorialStep(TutorialStep.None);

    try {
      await AsyncStorage.setItem("hasSeenFridgeTutorial", "true");
    } catch (error) {
      console.error("Error saving tutorial status:", error);
    }
  };

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

      // If on the add item tutorial step, proceed to next step
      if (currentTutorialStep === TutorialStep.AddItem) {
        nextTutorialStep();
      }
    } catch (error) {
      console.error("Error adding item:", error);
    }
  };

  const updateQuantity = async (itemName: string) => {
    if (!(itemName in editingQuantity)) return;
    const newQuantity = editingQuantity[itemName];
    if (newQuantity === "") return;
    try {
      await apiRequest("/fridge/update_quantity", "PUT", {
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
        await apiRequest("/fridge/remove", "DELETE", {
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

    // If on swipe-to-delete tutorial step, proceed to next step
    if (currentTutorialStep === TutorialStep.SwipeToDelete) {
      nextTutorialStep(); // Move to the undo step
    }
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
      const insertIndex = Math.min(
        deletedItem.originalIndex || 0,
        newItems.length
      );
      newItems.splice(insertIndex, 0, deletedItem.item);
      return newItems;
    });

    setDeletedItems((prev) => {
      const updated = { ...prev };
      delete updated[itemName];
      return updated;
    });

    // If on undo tutorial step, proceed to next step
    if (currentTutorialStep === TutorialStep.UndoDelete) {
      nextTutorialStep(); // Move to the image upload step
    }
  };

  const decrementQuantity = async (
    itemName: string,
    currentQuantity: number
  ) => {
    try {
      if (currentQuantity > 1) {
        const newQuantity = currentQuantity - 1;
        await apiRequest("/fridge/update_quantity", "PUT", {
          name: itemName,
          quantity: newQuantity,
        } as any);
        setEditingQuantity((prev) => ({
          ...prev,
          [itemName]: String(newQuantity),
        }));
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

  const incrementQuantity = async (
    itemName: string,
    currentQuantity: number
  ) => {
    try {
      const newQuantity = currentQuantity + 1;
      await apiRequest("/fridge/update_quantity", "PUT", {
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
    const permissionResult =
      await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permissionResult.granted) {
      Alert.alert(
        "Permission Denied",
        "Permission to access the media library is required!"
      );
      return;
    }

    // Launch image picker for images only
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (result.canceled) {
      return;
    }

    // Get the URI from the result (works for both web and native)
    const localUri = result.assets && result.assets[0]?.uri;
    if (!localUri) {
      Alert.alert("Error", "No image URI found.");
      return;
    }

    // Set loading state to true
    setIsImageUploading(true);

    // Set a timeout to handle cases where the backend doesn't respond
    const timeoutId = setTimeout(() => {
      if (isImageUploading) {
        setIsImageUploading(false);
        Alert.alert(
          "Processing Timeout",
          "Image processing is taking longer than expected. Please try again."
        );
      }
    }, 30000); // 30 second timeout

    // Convert the URI to a Blob (needed for web)
    let blob;
    try {
      const response = await fetch(localUri);
      blob = await response.blob();
    } catch (error) {
      console.error("Error converting image to blob:", error);
      Alert.alert("Error", "Could not process the image file.");
      setIsImageUploading(false); // Reset loading state on error
      clearTimeout(timeoutId); // Clear the timeout
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
      const response = await fetch(
        "http://127.0.0.1:8000/fridge/load_from_image",
        {
          method: "POST",
          body: formData,
        }
      );
      const jsonResponse = await response.json();
      // Expecting the backend to return { "ingredients": [ ... ] }
      if (jsonResponse && jsonResponse.ingredients) {
        console.log("Detected ingredients:", jsonResponse.ingredients);
        setDetectedIngredients(jsonResponse.ingredients);
        setModalVisible(true);

        // If on image upload tutorial step, proceed to complete the tutorial
        if (currentTutorialStep === TutorialStep.ImageUpload) {
          nextTutorialStep(); // Complete the tutorial
        }
      } else {
        Alert.alert(
          "Error",
          "No ingredients information was detected in the image."
        );
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      Alert.alert("Upload Error", "There was an error uploading the image.");
    } finally {
      // Always reset loading state when done
      setIsImageUploading(false);
      clearTimeout(timeoutId); // Clear the timeout
    }
  };

  // Update the sorting function to work with the new sort types
  const sortItems = (items: FridgeItem[]): FridgeItem[] => {
    if (sortType === SortType.None) return items;

    const sortedItems = [...items];

    switch (sortType) {
      case SortType.NameAZ:
        sortedItems.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return nameA.localeCompare(nameB);
        });
        break;

      case SortType.NameZA:
        sortedItems.sort((a, b) => {
          const nameA = a.name.toLowerCase();
          const nameB = b.name.toLowerCase();
          return nameB.localeCompare(nameA);
        });
        break;

      case SortType.QuantityLowHigh:
        sortedItems.sort((a, b) => a.quantity - b.quantity);
        break;

      case SortType.QuantityHighLow:
        sortedItems.sort((a, b) => b.quantity - a.quantity);
        break;
    }

    return sortedItems;
  };

  // Get the active sort option
  const getActiveSortOption = (): SortOption => {
    return (
      sortOptions.find((option) => option.value === sortType) || sortOptions[0]
    );
  };

  // Toggle batch selection mode
  const toggleBatchMode = () => {
    if (batchMode) {
      // Clear selections when exiting batch mode
      setSelectedItems([]);
    }
    setBatchMode(!batchMode);
  };

  // Toggle selection of an item
  const toggleItemSelection = (itemName: string) => {
    setSelectedItems((prev) => {
      if (prev.includes(itemName)) {
        return prev.filter((name) => name !== itemName);
      } else {
        return [...prev, itemName];
      }
    });
  };

  // Delete multiple items
  const deleteMultipleItems = async () => {
    if (selectedItems.length === 0) return;

    // Create a map of all selected items with their original data
    const itemsToDelete: { [key: string]: FridgeItem } = {};
    const itemIndices: { [key: string]: number } = {};

    selectedItems.forEach((itemName) => {
      const itemIndex = items.findIndex((i) => i.name === itemName);
      const item = items[itemIndex];
      if (item) {
        itemsToDelete[itemName] = item;
        itemIndices[itemName] = itemIndex;
      }
    });

    // Update deleted items state for undo functionality
    const newDeletedItems = { ...deletedItems };

    selectedItems.forEach((itemName) => {
      newDeletedItems[itemName] = {
        item: itemsToDelete[itemName],
        timestamp: Date.now(),
        originalIndex: itemIndices[itemName] >= 0 ? itemIndices[itemName] : 0,
      };
    });

    setDeletedItems(newDeletedItems);

    // Update UI immediately (optimistic update)
    setItems((prev) =>
      prev.filter((item) => !selectedItems.includes(item.name))
    );

    // Set up fade animations for each item
    selectedItems.forEach((itemName) => {
      fadeAnimRef.current[itemName] = new Animated.Value(1);

      setTimeout(() => {
        Animated.timing(fadeAnimRef.current[itemName], {
          toValue: 0,
          duration: 500,
          useNativeDriver: true,
        }).start();
      }, 4500);
    });

    // Set up deletion timers
    selectedItems.forEach((itemName) => {
      timersRef.current[itemName] = setTimeout(async () => {
        try {
          await apiRequest("/fridge/remove", "DELETE", {
            name: itemName,
            quantity: 1000000000,
          } as any);
          setDeletedItems((prev) => {
            const updated = { ...prev };
            delete updated[itemName];
            return updated;
          });
        } catch (error) {
          console.error(`Error removing item ${itemName}:`, error);
        }
      }, 5000);
    });

    // Exit batch mode after deletion
    setBatchMode(false);
    setSelectedItems([]);

    // If on batch selection tutorial step 2, proceed to next step (image upload)
    if (currentTutorialStep === TutorialStep.BatchSelectionFeature2) {
      nextTutorialStep();
    }
  };

  // Render each item using our custom swipeable row.
  const renderItem = ({ item }: { item: FridgeItem }) => {
    return (
      <SwipeableItem
        onDelete={() => deleteItem(item)}
        borderRadius={20}
        selectMode={batchMode}
        selected={selectedItems.includes(item.name)}
        onToggleSelect={() => toggleItemSelection(item.name)}
      >
        <View style={styles.ingredientItem}>
          <Text style={styles.ingredientText}>{item.name}</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              onPress={() => decrementQuantity(item.name, item.quantity)}
              disabled={batchMode}
            >
              <Text
                style={[
                  styles.quantityButton,
                  batchMode && styles.disabledButton,
                ]}
              >
                -
              </Text>
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
              editable={!batchMode}
            />
            <TouchableOpacity
              onPress={() => incrementQuantity(item.name, item.quantity)}
              disabled={batchMode}
            >
              <Text
                style={[
                  styles.quantityButton,
                  batchMode && styles.disabledButton,
                ]}
              >
                +
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SwipeableItem>
    );
  };

  // Render the tutorial tooltip based on current step
  const renderTutorialTooltip = () => {
    if (!tutorialActive || !showTutorialTooltip) return null;

    let tooltipContent = null;
    let tooltipPosition = {};

    switch (currentTutorialStep) {
      case TutorialStep.AddItem:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>1. Add Ingredients</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Enter an
              ingredient name (like "Apple") and quantity (like "3"), then tap
              the + button to add it to your fridge.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.12,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.SwipeToDelete:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>2. Remove Items</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Swipe an item
              from right to left to delete it from your fridge.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.30,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.UndoDelete:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>3. Undo Deletion</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Tap the UNDO
              button that appears after deleting an item to restore it. You have
              5 seconds before the deletion becomes permanent.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.15,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.SearchFeature:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>4. Search Ingredients</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Use the search
              bar at the top to quickly find ingredients in your fridge. Just
              start typing and the list will automatically filter to match your
              search.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.51,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.SortFeature:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>5. Sort Ingredients</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Tap the sort
              dropdown on the right to organize your ingredients. You can sort
              by name (A-Z or Z-A) or by quantity (low to high or high to low).
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.45,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.BatchSelectionFeature1:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>6. Batch Selection</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Tap "Select
              Multiple" to enter batch mode. You can select several items at
              once and delete them all with a single tap. Perfect for cleaning
              up your fridge!
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.43,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.BatchSelectionFeature2:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>6. Batch Selection</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Now you can
              select multiple items and delete them all with a single tap.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.3,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.ImageUpload:
        tooltipContent = (
          <>
            {/* If select multiple is active, unselect it first */}
            <Text style={styles.tooltipTitle}>7. Upload Images</Text>
            <Text style={styles.tooltipText}>
              <Text style={styles.actionText}>Try it now:</Text> Tap the camera
              icon to upload an image of ingredients and automatically add them
              to your fridge.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.12,
          left: 20,
          right: 20,
        };
        break;

      case TutorialStep.Completed:
        tooltipContent = (
          <>
            <Text style={styles.tooltipTitle}>All Done! 🎉</Text>
            <Text style={styles.tooltipText}>
              You now know how to use all the features of the Fridge page. Enjoy
              tracking your ingredients!
            </Text>
            <Text style={styles.tooltipNote}>
              Tip: You can always view this tutorial again from the Settings
              page by clicking the "Reset Tutorial" button.
            </Text>
          </>
        );
        tooltipPosition = {
          bottom: SCREEN_HEIGHT * 0.5,
          left: 40,
          right: 40,
        };
        break;
    }

    // Previous button should be shown if we're past the first step
    const showPrevButton =
      currentTutorialStep > TutorialStep.AddItem &&
      currentTutorialStep < TutorialStep.Completed;

    // Function to go to previous tutorial step
    const prevTutorialStep = () => {
      setShowTutorialTooltip(false);

      // Short delay before showing previous step
      setTimeout(() => {
        if (currentTutorialStep > TutorialStep.AddItem) {
          setCurrentTutorialStep(currentTutorialStep - 1);
          setShowTutorialTooltip(true);
        }
      }, 300);
    };

    return (
      <Animated.View
        style={[
          styles.tooltipContainer,
          tooltipPosition,
          {
            opacity: tooltipAnim,
            transform: [
              {
                translateY: tooltipAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [10, 0],
                }),
              },
            ],
          },
        ]}
      >
        {tooltipContent}
        <View style={styles.tooltipButtonRow}>
          {currentTutorialStep < TutorialStep.Completed ? (
            <>
              <TouchableOpacity
                style={styles.tooltipSkipButton}
                onPress={skipTutorial}
              >
                <Text style={styles.tooltipSkipButtonText}>Skip Tutorial</Text>
              </TouchableOpacity>

              {showPrevButton && (
                <TouchableOpacity
                  style={styles.tooltipPrevButton}
                  onPress={prevTutorialStep}
                >
                  <Text style={styles.tooltipPrevButtonText}>Previous</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.tooltipNextButton}
                onPress={nextTutorialStep}
              >
                <Text style={styles.tooltipNextButtonText}>
                  {currentTutorialStep === TutorialStep.Completed - 1
                    ? "Finish"
                    : "Next"}
                </Text>
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={styles.tooltipFinishButton}
              onPress={completeTutorial}
            >
              <Text style={styles.tooltipNextButtonText}>Got it!</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>

      {/* Add Search Bar */}
      <View
        style={[
          styles.searchContainer,
          currentTutorialStep === TutorialStep.SearchFeature &&
            styles.highlightedElement,
        ]}
      >
        <FontAwesome
          name="search"
          size={16}
          color="#088F8F"
          style={styles.searchIcon}
        />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
          placeholderTextColor="#AAAAAA"
          value={searchQuery}
          onChangeText={setSearchQuery}
          clearButtonMode="while-editing"
        />
        {searchQuery ? (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <FontAwesome name="times-circle" size={16} color="#088F8F" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* Batch Mode and Sorting Controls */}
      <View style={styles.controlsRow}>
        {/* Batch Mode Toggle */}
        <TouchableOpacity
          style={[
            styles.batchModeButton,
            batchMode && styles.batchModeActiveButton,
            currentTutorialStep === TutorialStep.BatchSelectionFeature1 &&
              styles.highlightedElement,
          ]}
          onPress={toggleBatchMode}
        >
          <FontAwesome
            name={batchMode ? "check-square-o" : "square-o"}
            size={16}
            color="#088F8F"
            style={styles.batchIcon}
          />
          <Text style={styles.batchModeText}>
            {batchMode ? "Done Selecting" : "Select Multiple"}
          </Text>
        </TouchableOpacity>

        {/* Sorting Controls - Dropdown Style */}
        <TouchableOpacity
          style={[
            styles.sortDropdownButton,
            currentTutorialStep === TutorialStep.SortFeature &&
              styles.highlightedElement,
          ]}
          onPress={() => setShowSortDropdown(true)}
        >
          <FontAwesome
            name={getActiveSortOption().icon as any}
            size={16}
            color="#088F8F"
            style={styles.sortIcon}
          />
          <Text style={styles.sortDropdownText}>
            {getActiveSortOption().label}
          </Text>
          <FontAwesome name="chevron-down" size={12} color="#088F8F" />
        </TouchableOpacity>
      </View>

      {/* Sort Options Dropdown Modal */}
      <Modal
        visible={showSortDropdown}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSortDropdown(false)}
      >
        <TouchableOpacity
          style={styles.sortDropdownOverlay}
          activeOpacity={1}
          onPress={() => setShowSortDropdown(false)}
        >
          <View style={styles.sortDropdownMenu}>
            {sortOptions.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.sortDropdownItem,
                  sortType === option.value && styles.sortDropdownItemActive,
                ]}
                onPress={() => {
                  setSortType(option.value);
                  setShowSortDropdown(false);
                }}
              >
                <FontAwesome
                  name={option.icon as any}
                  size={16}
                  color={sortType === option.value ? "#FFFFFF" : "#088F8F"}
                  style={styles.sortIcon}
                />
                <Text
                  style={[
                    styles.sortDropdownItemText,
                    sortType === option.value &&
                      styles.sortDropdownItemTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Custom swipe-to-delete list with sorted and filtered items */}
      <FlatList
        data={filterItems(sortItems(items))}
        keyExtractor={(item) => item.id || item.name}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 5 }}
      />

      {/* Floating Add Ingredient Section */}
      {!batchMode && (
        <View style={styles.floatingAddContainer}>
          <TouchableOpacity
            style={[
              styles.cameraButton,
              currentTutorialStep === TutorialStep.ImageUpload &&
                styles.highlightedElement,
            ]}
            onPress={handleCameraButtonPress}
            disabled={isImageUploading}
          >
            {isImageUploading ? (
              <ActivityIndicator size="small" color="#088F8F" />
            ) : (
              <FontAwesome name="camera" size={22} color="#088F8F" />
            )}
          </TouchableOpacity>

          <View
            style={[
              styles.inputContainer,
              currentTutorialStep === TutorialStep.AddItem &&
                styles.highlightedElement,
            ]}
          >
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

          <TouchableOpacity
            style={[
              styles.floatingAddButton,
              currentTutorialStep === TutorialStep.AddItem &&
                styles.highlightedElement,
            ]}
            onPress={addItem}
          >
            <FontAwesome name="plus" size={22} color="#088F8F" />
          </TouchableOpacity>
        </View>
      )}

      {/* Batch Action Bar - Floating at bottom */}
      {batchMode && selectedItems.length > 0 && (
        <View
          style={[
            styles.floatingBatchActionBar,
            currentTutorialStep === TutorialStep.BatchSelectionFeature2 &&
              styles.highlightedElement,
          ]}
        >
          <Text style={styles.floatingBatchSelectionCount}>
            {selectedItems.length} item{selectedItems.length !== 1 ? "s" : ""}{" "}
            selected
          </Text>
          <TouchableOpacity
            style={styles.batchDeleteButton}
            onPress={deleteMultipleItems}
          >
            <FontAwesome name="trash" size={16} color="white" />
            <Text style={styles.batchDeleteText}>Delete Selected</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Undo Toasts */}
      {Object.keys(deletedItems).map((itemName) => (
        <Animated.View
          key={itemName}
          style={[
            styles.undoToast,
            {
              opacity: fadeAnimRef.current[itemName] || 1,
              bottom:
                (batchMode && selectedItems.length > 0 ? 100 : 70) +
                Object.keys(deletedItems).indexOf(itemName) * 10, // Adjust position based on batch mode
            },
            currentTutorialStep === TutorialStep.UndoDelete &&
              styles.highlightedElement,
          ]}
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
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={async () => {
                  for (const ingredient of detectedIngredients) {
                    let qty = 1;
                    if (
                      ingredient.quantity &&
                      typeof ingredient.quantity === "string"
                    ) {
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
            </View>
          </View>
        </View>
      </Modal>

      {/* Tutorial tooltips */}
      {renderTutorialTooltip()}

      {/* Tutorial overlay - semi-transparent overlay that allows interactions */}
      {tutorialActive && (
        <View style={styles.tutorialOverlay} pointerEvents="none" />
      )}

      {/* Tutorial interaction hint */}
      {tutorialActive && (
        <View
          style={[
            styles.interactionHintContainer,
            { opacity: 0.8, transform: [{ translateY: -5 }] },
          ]}
        >
          <Text style={styles.interactionHintText}>
            <FontAwesome name="hand-pointer-o" size={14} color="#088F8F" />{" "}
            Interact with the app during the tutorial!
          </Text>
        </View>
      )}

      {/* Loading Overlay */}
      {isImageUploading && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#088F8F" />
            <Text style={styles.loadingText}>Processing image...</Text>
            <Text style={styles.loadingSubText}>
              This may take a few moments as we analyze your ingredients.
            </Text>
          </View>
        </View>
      )}
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

  /* Tutorial Styles */
  tutorialOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.2)", // Lighter overlay to see content better
    zIndex: 1,
  },
  tooltipContainer: {
    position: "absolute",
    backgroundColor: "white",
    borderRadius: 12,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    zIndex: 10,
  },
  tooltipTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#088F8F",
    marginBottom: 8,
  },
  tooltipText: {
    fontSize: 15,
    color: "#444",
    lineHeight: 22,
    marginBottom: 15,
  },
  tooltipButtonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  tooltipNextButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  tooltipPrevButton: {
    backgroundColor: "#999",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
  },
  tooltipPrevButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  tooltipSkipButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  tooltipFinishButton: {
    backgroundColor: "#088F8F",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    alignSelf: "center",
    marginTop: 5,
  },
  tooltipNextButtonText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 16,
  },
  tooltipSkipButtonText: {
    color: "#888",
    fontSize: 14,
  },
  tooltipNote: {
    fontSize: 13,
    fontStyle: "italic",
    color: "#088F8F",
    marginTop: 8,
    textAlign: "center",
  },
  highlightedElement: {
    borderWidth: 2,
    borderColor: "#FFD700",
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 10,
    zIndex: 5,
  },
  interactionHintContainer: {
    position: "absolute",
    top: 10,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 12,
  },
  interactionHintText: {
    backgroundColor: "rgba(255,255,255,0.9)",
    color: "#333",
    fontSize: 12,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  actionText: {
    fontWeight: "bold",
    color: "#088F8F",
  },
  /* Sorting Styles */
  sortControlsContainer: {
    flexDirection: "row",
    marginBottom: 15,
    justifyContent: "flex-end",
    paddingRight: 5,
  },
  sortDropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#088F8F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    minWidth: 120,
    maxWidth: 200,
    justifyContent: "space-between",
  },
  sortDropdownText: {
    fontSize: 14,
    color: "#088F8F",
    fontWeight: "500",
    marginRight: 8,
    flex: 1,
    textAlign: "left",
  },
  sortIcon: {
    marginRight: 8,
  },
  sortDropdownOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },
  sortDropdownMenu: {
    backgroundColor: "#FFF",
    borderRadius: 10,
    padding: 5,
    width: "80%",
    maxWidth: 300,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  sortDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 6,
    marginVertical: 2,
  },
  sortDropdownItemActive: {
    backgroundColor: "#088F8F",
  },
  sortDropdownItemText: {
    fontSize: 14,
    color: "#333",
  },
  sortDropdownItemTextActive: {
    color: "#FFF",
    fontWeight: "bold",
  },
  /* Add Search Bar */
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    height: 40,
    fontSize: 16,
    color: "#333",
  },
  controlsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  batchModeButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#088F8F",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  batchModeActiveButton: {
    backgroundColor: "#E6F7F2",
  },
  batchModeText: {
    fontSize: 14,
    color: "#088F8F",
    fontWeight: "500",
  },
  batchIcon: {
    marginRight: 8,
  },
  batchDeleteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF6B6B",
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
  },
  batchDeleteText: {
    color: "white",
    fontWeight: "bold",
    fontSize: 14,
    marginLeft: 8,
  },
  disabledButton: {
    opacity: 0.5,
  },
  // New floating batch action bar style
  floatingBatchActionBar: {
    position: "absolute",
    bottom: 25,
    left: 20,
    right: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#088F8F",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    zIndex: 50,
  },
  floatingBatchSelectionCount: {
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  /* Loading Styles */
  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  loadingContainer: {
    backgroundColor: "white",
    borderRadius: 10,
    padding: 20,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  loadingText: {
    color: "#088F8F",
    marginTop: 10,
    fontSize: 16,
    fontWeight: "500",
  },
  loadingSubText: {
    color: "#666",
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 10,
    maxWidth: 300,
  },
});

export default FridgePage;
