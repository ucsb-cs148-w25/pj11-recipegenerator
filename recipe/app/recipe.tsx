import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

export default function RecipePage() {
  const generateRecipes = () => {
    alert("Function not yet implemented");
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Recipes</Text>
      
      {/* Scrollable recipe container */}
      <ScrollView style={styles.recipesContainer} contentContainerStyle={styles.recipesContentContainer}>
        {/* Placeholder recipe cards - these will be replaced with actual recipe data */}
        <View style={styles.recipeCard}>
          <Text style={styles.recipeTitle}>Recipe Name</Text>
          <Text style={styles.recipeDescription}>
            This is where the recipe description and ingredients will appear.
          </Text>
        </View>
        
        <View style={styles.recipeCard}>
          <Text style={styles.recipeTitle}>Recipe Name</Text>
          <Text style={styles.recipeDescription}>
            This is where the recipe description and ingredients will appear.
          </Text>
        </View>
      </ScrollView>

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={styles.button}
          onPress={generateRecipes}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>Generate Recipes</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}







/* styles */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E0FFFF',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#088F8F',
    letterSpacing: 0.5,
    padding: 20,
    paddingBottom: 10,
  },
  recipesContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  recipesContentContainer: {
    paddingBottom: 20,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  recipeTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
    color: '#088F8F',
  },
  recipeDescription: {
    fontSize: 16,
    color: '#666',
    lineHeight: 22,
  },
  buttonContainer: {
    padding: 20,
    backgroundColor: '#f5f5f5',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  button: {
    backgroundColor: '#088F8F',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 25,
    width: '100%',
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
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },
});
