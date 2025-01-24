import { useState } from "react";
import { Image, View, Text, StyleSheet, TextInput, FlatList, TouchableOpacity, Button, ScrollView } from "react-native";

export default function FridgePage() {
  const [inventories, setInventories] = useState({
    vegetables: ["Carrots", "Broccoli"],
    dairy: ["Milk", "Eggs", "Butter"],
    frozen: ["Ice Cream", "Frozen Peas"]
  });
  const [newIngredient, setNewIngredient] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"vegetables" | "dairy" | "frozen">("vegetables");

  const addIngredient = () => {
    if (newIngredient.trim()) {
      setInventories({
        ...inventories,
        [selectedCategory]: [...inventories[selectedCategory], newIngredient.trim()]
      });
      setNewIngredient("");
    }
  };

  const removeIngredient = (item: string, category: "vegetables" | "dairy" | "frozen") => {
    setInventories({
      ...inventories,
      [category]: inventories[category].filter((ingredient) => ingredient !== item)
    });
  };

  const renderCategory = (title: string, category: keyof typeof inventories) => (
    <View style={styles.categoryContainer}>
      <Text style={styles.categoryTitle}>{title}</Text>
      <FlatList
        data={inventories[category]}
        keyExtractor={(item, index) => `${category}-${index}`}
        renderItem={({ item }) => (
          <View style={styles.ingredientItem}>
            <Text style={styles.ingredientText}>{item}</Text>
            <TouchableOpacity
              style={styles.removeButton}
              onPress={() => removeIngredient(item, category)}
            >
              <Image source={require('./../assets/images/minus1.png')}/>
            </TouchableOpacity>
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
          <Image source={require('./../assets/images/add3.png')}/>
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
    backgroundColor: '#E0FFFF',
  },
  title: { 
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: '#088F8F',
    letterSpacing: 0.5,
  },
  input: { 
    borderWidth: 1,
    borderColor: '#088F8F',
    padding: 10,
    marginVertical: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: 'white',
    borderRadius: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ingredientText: {
    fontSize: 16,
    color: '#088F8F',
  },
  removeButton: {
    padding: 8,
    paddingHorizontal: 15,
    borderRadius: 25,
  },
  addButton: {
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  categoryContainer: {
    marginBottom: 20,
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  categoryTitle: {
    fontSize: 24,
    fontWeight: "600",
    color: '#088F8F',
    marginBottom: 10,
  },
  addSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  selectedInput: {
    borderColor: '#088F8F',
    borderWidth: 2,
  },
});

