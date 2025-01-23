import { Image, View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

export default function ProfilePage() {
  const savedRecipes = [
    { 
      id: '1', 
      name: 'Beef Stir Fry',
      savedDate: '2024-03-20',
      difficulty: 'Medium'
    },
    { 
      id: '2', 
      name: 'Classic Pancakes',
      savedDate: '2024-03-19',
      difficulty: 'Easy'
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <Image source={require('./../assets/images/defaultprofilepic.png')} style={styles.image} />
      <View style={styles.profileCard}>
        <Text style={styles.name}>Taylor Swift</Text>
        <Text style={styles.username}>@taylorswift</Text>
        <Text style={styles.bio}>I love fries and burgers</Text>

        {/* <View style={styles.statsContainer}>
          <Text style={styles.statText}>Saved: {savedRecipes.length}</Text>
        </View> */}
        {/* personally not sure if I like this feature bc its kinda clutter, but if we wanna add it back ill design a more intuitive way to display recipe count - Christy */}
      </View>

      <Text style={styles.sectionTitle}>Saved Recipes</Text>
      <View style={styles.recipesContainer}>
        {savedRecipes.map((recipe) => (
          <View key={recipe.id} style={styles.recipeCard}>
            <Text style={styles.recipeName}>{recipe.name}</Text>
            <View style={styles.recipeDetails}>
              <Text style={styles.detailText}>Saved: {recipe.savedDate}</Text>
              <Text style={styles.detailText}>Difficulty: {recipe.difficulty}</Text>
            </View>
            <TouchableOpacity style={styles.viewButton}>
              <Text style={styles.viewButtonText}>View Recipe</Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>

      <TouchableOpacity 
        style={styles.signOutButton}
        onPress={() => alert("feature not implemented yet")}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: 20,
    backgroundColor: '#E0FFFF',
  },
  profileCard: {
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#088F8F',
    marginBottom: 15,
  },
  statsContainer: {
    backgroundColor: '#f5f5f5',
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  statText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
  },
  recipesContainer: {
    marginBottom: 20,
  },
  recipeCard: {
    backgroundColor: 'white',
    borderRadius: 15,
    padding: 15,
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
  recipeName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#088F8F',
    marginBottom: 8,
  },
  recipeDetails: {
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 8,
    marginBottom: 10,
  },
  detailText: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  viewButton: {
    backgroundColor: '#088F8F',
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
  },
  viewButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#088F8F',
    padding: 15,
    borderRadius: 25,
    alignItems: 'center',
    marginBottom: 20,
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
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    padding: 10,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
    fontFamily: "MoulRegular",
    // why is this not working???
  },
  username: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: 'bold',
    color: "#1A535C",
  },
  bio: {
    fontSize: 16,
    color: '#1A535C',
    marginBottom: 10,
  },
});
