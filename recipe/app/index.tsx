import { View, Text, StyleSheet, ScrollView } from "react-native";

export default function Homepage() {
  // Mock data - replace with actual usage history data later
  const usageHistory = [
    {
      id: '1',
      name: 'Spaghetti Carbonara',
      lastCooked: '2024-03-20',
      timesCooked: 3,
      rating: 4.5,
      notes: 'Family favorite, added extra garlic'
    },
    {
      id: '2',
      name: 'Chicken Stir Fry',
      lastCooked: '2024-03-19',
      timesCooked: 1,
      rating: 4,
      notes: 'Quick and easy weeknight dinner'
    }
  ];

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Cooking History</Text>
      <Text style={styles.subtitle}>
        Your previously cooked recipes
      </Text>
      
      <ScrollView style={styles.historyContainer}>
        {usageHistory.map((recipe) => (
          <View key={recipe.id} style={styles.recipeCard}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <View style={styles.statsContainer}>
              <Text style={styles.statText}>Last cooked: {recipe.lastCooked}</Text>
              <Text style={styles.statText}>Times cooked: {recipe.timesCooked}</Text>
              <Text style={styles.statText}>Rating: {recipe.rating}/5</Text>
            </View>
            <Text style={styles.notesTitle}>Notes:</Text>
            <Text style={styles.notes}>{recipe.notes}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
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
  subtitle: { 
    fontSize: 16, 
    textAlign: "center", 
    color: "#666",
    marginBottom: 20,
  },
  historyContainer: {
    flex: 1,
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
  recipeName: {
    fontSize: 20,
    fontWeight: '600',
    color: '#088F8F',
    marginBottom: 10,
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 10,
    marginBottom: 10,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  notesTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#088F8F',
    marginBottom: 5,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    lineHeight: 20,
  }
});
