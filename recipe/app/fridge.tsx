import { useState } from "react";
import { Image, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView } from "react-native";

export default function FridgePage() {
  const [inventories, setInventories] = useState({
    "Ice Cream": 1,
    "Frozen Peas": 1,
  });
  const [newIngredient, setNewIngredient] = useState("");

  const addIngredient = async () => {
    if (!newIngredient.trim()) return; // Prevent empty submissions
  
    const newItem = { name: newIngredient.trim(), quantity: 1 };
  
    try {
      const response = await fetch("https://127.0.0.1:8000/fridge/add", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newItem),
      });
  
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
  
      const data = await response.json(); // Parse JSON response
  
      setInventories((prevInventories) => [...prevInventories, data]); // Safe state update
      setNewIngredient(""); // Clear input field
  
    } catch (error) {
      if (error instanceof Error) {
        console.error("Error adding item:", error.message);
      } else {
        console.error("Error adding item:", error);
      }
    }

  };
  
  const removeIngredient = (item: string) => {
    const updatedInventories = { ...inventories };
    delete updatedInventories[item];
    setInventories(updatedInventories);
  };

  const updateQuantity = (item: string, value: number) => {
    setInventories({
      ...inventories,
      [item]: isNaN(value) ? 0 : value,
    });
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>
      <FlatList
        data={Object.keys(inventories)}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <TouchableOpacity onPress={() => removeIngredient(item)}>
              <Text style={styles.removeButton}>×</Text>
            </TouchableOpacity>
            <Text style={styles.ingredientText}>{item}</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity onPress={() => updateQuantity(item, inventories[item] - 1)}>
                <Text style={styles.button}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={inventories[item] === 0 ? "" : String(inventories[item])}
                onChangeText={(text) => {
                  const num = text === "" ? 0 : parseInt(text) || 0;
                  updateQuantity(item, num);
                }}
              />
              <TouchableOpacity onPress={() => updateQuantity(item, inventories[item] + 1)}>
                <Text style={styles.button}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.addSection}>
        <TextInput
          style={styles.input}
          placeholder="Add Ingredient"
          value={newIngredient}
          onChangeText={setNewIngredient}
        />
        <TouchableOpacity style={styles.addButton} onPress={addIngredient}>
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
    backgroundColor: "#E0FFFF",
  },
  title: { 
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#088F8F",
    letterSpacing: 0.5,
  },
  input: { 
    borderWidth: 1,
    borderColor: "#088F8F",
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: "white",
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
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
  },
  quantityContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  button: {
    fontSize: 20,
    color: "#088F8F",
    paddingHorizontal: 10,
  },
  quantityInput: {
    width: 40,
    height: 30,
    borderWidth: 1,
    borderColor: "#088F8F",
    textAlign: "center",
    marginHorizontal: 5,
    borderRadius: 5,
    backgroundColor: "white",
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
  categoryContainer: {
    marginBottom: 20,
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: "#088F8F",
    marginBottom: 10,
  },
  addSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedInput: {
    borderColor: "#088F8F",
    borderWidth: 2,
  },
});
