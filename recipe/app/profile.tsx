import { Image, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal} from "react-native";
import { router } from 'expo-router';
import { useState } from "react";
import { User } from './login';
import {GoogleSignin, statusCodes} from "@react-native-google-signin/google-signin";

interface ProfilePageProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  user: User | null;
}

export default function ProfilePage({ setUser, user }: ProfilePageProps) {
  const [selectedFriend, setSelectedFriend] = useState<any>(null);
  
  const savedFriends = [
    {
      id: '1',
      name: 'Chappell Roan',
      recipes: ['Spaghetti Carbonara', 'Avocado Toast', 'Blueberry Pancakes', 'Iced Latte']
    },
    {
      id: '2',
      name: 'Ziad Matni',
      recipes: ['Chicken Curry', 'Beef Tacos']
    },
    {
      id: '3',
      name: 'Tobias Hollerer',
      recipes: ['Margherita Pizza', 'Pumpkin Soup', 'Grilled Salmon']
    }
  ];

  const handleSignOut = async () => {
    try {
      await GoogleSignin.revokeAccess();
      await GoogleSignin.signOut();
      console.log("User successfully signed out");
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_REQUIRED || 
          (error.message && error.message.includes("sign_in_required"))) {
        console.log("User not signed in, proceeding to clear state");
      } else {
        console.error("Error signing out:", error);
        Alert.alert("Sign Out Error", error.message || JSON.stringify(error));
        return;
      }
    } finally {
      setUser(null);
      router.replace("/login");
    }
  };
  return (
    <ScrollView style={styles.container}>
      <Image source={require('../assets/images/defaultprofilepic.png')} style={styles.iconpic} />
      <View style={styles.profileCard}>
        <Text style={styles.name}>{user?.name ?? "Your Name"}</Text>
        <Text style={styles.username}>@{user?.name ? user.name.replace(/\s+/g, '').toLowerCase() : "username"}</Text>
        <Text style={styles.bio}>I love fries and burgers</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <TouchableOpacity>
          <Image source={require('../assets/images/addfriend.png')} />
        </TouchableOpacity>
      </View>
      <View style={styles.friendsContainer}>
        {savedFriends.map((friend) => (
          <View key={friend.id} style={styles.friendsCard}>
            <Image source={require('../assets/images/defaultprofilepic.png')} style={styles.friendIcon} />
            <TouchableOpacity key={friend.id} onPress={() => setSelectedFriend(friend)}>
             <Text style={styles.friendName}>{friend.name} </Text>
             <Text style={styles.friendText}>See what they're cooking here!</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
          
        ))}
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
      <Modal visible={!!selectedFriend} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selectedFriend?.name}'s Favorite Recipes</Text>
            {selectedFriend?.recipes.map((recipe, index) => (
              <Text key={index} style={styles.recipeText}>• {recipe}</Text>
            ))}
            <TouchableOpacity style={styles.closeButton} onPress={() => setSelectedFriend(null)}>
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F6FFF7',
  },
  profileCard: {
    padding: 10,
    marginBottom: 20,
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 25,
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
  friendsContainer: {
    marginBottom: 20,
    display: 'flex',
  },
  friendsCard: {
    display: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    backgroundColor: '#F7CE45',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1A535C',
    marginBottom: 8,
  },
  friendText: {
    fontSize: 14,
    color: '#1A535C',
    paddingRight: 15,
  },
  removeButton: {
    backgroundColor: '#1A535C',
    padding: 8,
    borderRadius: 20,
    alignSelf: 'center',
    justifyContent: "center"
  },
  removeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  signOutButton: {
    backgroundColor: '#FF6B6B',
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
  iconpic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    padding: 10,
  },
  name: {
    fontSize: 30,
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
  friendIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  header: {
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '80%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'flex-start',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  recipeText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#1A535C',
  },
  closeButton: {
    marginTop: 15,
    backgroundColor: '#1A535C',
    padding: 15,
    borderRadius: 10,
    alignSelf: 'flex-end',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  }
});
