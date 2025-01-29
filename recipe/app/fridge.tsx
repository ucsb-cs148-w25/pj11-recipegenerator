import { useState } from "react";
import { Image, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, ScrollView } from "react-native";

export default function FridgePage() {
  const [inventories, setInventories] = useState({
    vegetables: { Carrots: 1, Broccoli: 2 },
    dairy: { Milk: 1, Eggs: 12, Butter: 1 },
    frozen: { "Ice Cream": 1, "Frozen Peas": 1 },
  });
  const [newIngredient, setNewIngredient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"vegetables" | "dairy" | "frozen">("vegetables");

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setInventories({
        ...inventories,
        [selectedCategory]: {
          ...inventories[selectedCategory],
          [newIngredient.trim()]: 1,
        },
      });
      setNewIngredient("");
    }
  };

  const removeIngredient = (item: string, category: keyof typeof inventories) => {
    const updatedCategory = { ...inventories[category] };
    delete updatedCategory[item];
    setInventories({
      ...inventories,
      [category]: updatedCategory,
    });
  };

  const updateQuantity = (item: string, category: keyof typeof inventories, value: number) => {
    if (value <= 0) {
      removeIngredient(item, category);
    } else {
      setInventories({
        ...inventories,
        [category]: {
          ...inventories[category],
          [item]: value,
        },
      });
    }
  };

  const renderCategory = (title: string, category: keyof typeof inventories) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <FlatList
        data={Object.keys(inventories[category])}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <TouchableOpacity onPress={() => removeIngredient(item, category)}>
              <Text style={styles.removeButton}>×</Text>
            </TouchableOpacity>
            <Text style={styles.ingredientText}>{item}</Text>
            <View style={styles.quantityContainer}>
              <TouchableOpacity onPress={() => updateQuantity(item, category, inventories[category][item] - 1)}>
                <Text style={styles.button}>-</Text>
              </TouchableOpacity>
              <TextInput
                style={styles.quantityInput}
                keyboardType="numeric"
                value={String(inventories[category][item])}
                onChangeText={(text) => {
                  const num = parseInt(text) || 0;
                  updateQuantity(item, category, num);
                }}
              />
              <TouchableOpacity onPress={() => updateQuantity(item, category, inventories[category][item] + 1)}>
                <Text style={styles.button}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      />
      <View style={styles.addSection}>
        <TextInput
          style={[styles.input, selectedCategory === category && styles.selectedInput]}
          placeholder={`Add ${title}`}
          value={selectedCategory === category ? newIngredient : ""}
          onChangeText={setNewIngredient}
          onFocus={() => setSelectedCategory(category)}
        />
        <TouchableOpacity 
          style={[styles.addButton, { opacity: selectedCategory === category ? 1 : 0.5 }]}
          onPress={selectedCategory === category ? addIngredient : undefined}
        >
          <Image source={require("./../assets/images/add3.png")} />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Fridge Inventory</Text>
      {renderCategory("Vegetables", "vegetables")}
      {renderCategory("Dairy", "dairy")}
      {renderCategory("Frozen", "frozen")}
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
