import { Image, View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Modal, TextInput } from "react-native";
import { router } from 'expo-router';
import { useState, useEffect } from "react";
import { User } from './login';
import { GoogleSignin, statusCodes } from "@react-native-google-signin/google-signin";
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ProfilePageProps {
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  user: User | null;
}

interface Friend {
  id: string;
  name: string;
  recipes: string[];
  email?: string; // optional email property
}

export default function ProfilePage({ setUser, user }: ProfilePageProps) {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [suggestedFriendsModalVisible, setSuggestedFriendsModalVisible] = useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>(''); // Track email input

  // All possible friends (both current and potential)
  const allPossibleFriends: Friend[] = [
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
    },
    {
      id: '4',
      name: 'Taylor Swift',
      recipes: ['Vegetable Stir Fry', 'Chocolate Chip Cookies', 'Mushroom Risotto']
    },
    {
      id: '5',
      name: 'Ariana Grande',
      recipes: ['Chicken Alfredo', 'Greek Salad', 'Banana Bread']
    },
    {
      id: '6',
      name: 'Minecraft Steve',
      recipes: ['Suspicious Stew', 'Milk Bucket', 'Awkward Potion']
    }
  ];

  // Current friends list - initially showing first 6 friends
  const [friends, setFriends] = useState<Friend[]>(allPossibleFriends.slice(0, 6));

  // Suggested friends - calculated based on who is not in current friends
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  // Update suggested friends whenever the friends list changes
  useEffect(() => {
    const newSuggestedFriends = allPossibleFriends.filter(
      possibleFriend => !friends.some(friend => friend.id === possibleFriend.id)
    );
    setSuggestedFriends(newSuggestedFriends);
  }, [friends]);

  const handleRemoveFriend = (friendId: string) => {
    setFriends(friends.filter(friend => friend.id !== friendId));
    // Note: We don't need to update suggestedFriends here as the useEffect will handle it
  };

  const handleAddFriend = (friendToAdd: Friend) => {
    setFriends([...friends, friendToAdd]);
    // Close modal if there are no more suggested friends
    if (suggestedFriends.length === 1) {
      setSuggestedFriendsModalVisible(false);
    }
  };

  const handleAddFriendByEmail = () => {
    // Logic to handle adding a friend by email
    const friend = allPossibleFriends.find(f => f.email === emailInput);
    if (friend) {
      handleAddFriend(friend);
      setEmailInput(''); // Reset email input after adding
    } else {
      Alert.alert('Friend not found', 'No friend with this email exists.');
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up AsyncStorage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("isGuest");

      // Reset tutorial state for the next user
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");

      // If not a guest user, also revoke Google access
      if (!user?.guest) {
        try {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          console.log("Google user successfully signed out");
        } catch (googleError: any) {
          console.log("Error with Google sign out, proceeding anyway:", googleError);
        }
      } else {
        console.log("Guest user signed out");
      }

      setUser(null);
      router.replace("/login");
    } catch (error: any) {
      console.error("Error signing out:", error);
      // Even if there's an error, try to reset the user state
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
        <TouchableOpacity
          onPress={() => setSuggestedFriendsModalVisible(true)}
        >
          <Image
            source={require('../assets/images/addfriend.png')}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.friendsContainer}>
        {friends.length > 0 ? (
          friends.map((friend) => (
            <View key={friend.id} style={styles.friendsCard}>
              <Image source={require('../assets/images/defaultprofilepic.png')} style={styles.friendIcon} />
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => setSelectedFriend(friend)}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  <Text style={styles.friendText}>❤️️ See their favorites!</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFriend(friend.id)}>
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noFriendsText}>You haven't added any friends yet</Text>
        )}
      </View>

      <TouchableOpacity
        style={styles.signOutButton}
        onPress={handleSignOut}
      >
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>

      {/* Friend Favorites Modal */}
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

      {/* Suggested Friends Modal */}
      <Modal visible={suggestedFriendsModalVisible} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Suggested Friends</Text>

            {suggestedFriends.length > 0 ? (
              suggestedFriends.map((suggestedFriend) => (
                <View key={suggestedFriend.id} style={styles.suggestedFriendCard}>
                  <Image
                    source={require('../assets/images/defaultprofilepic.png')}
                    style={styles.suggestedFriendIcon}
                  />
                  <View style={styles.suggestedFriendInfo}>
                    <Text style={styles.suggestedFriendName}>{suggestedFriend.name}</Text>
                    <Text style={styles.suggestedFriendRecipeCount}>
                      {suggestedFriend.recipes.length} favorite recipes
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => handleAddFriend(suggestedFriend)}
                  >
                    <Text style={styles.addButtonText}>Add</Text>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <Text style={styles.noFriendsText}>No more suggested friends available</Text>
            )}

            {/* Email Add Friend Section */}
            <TextInput
              style={styles.emailInput}
              placeholder="Enter friend's email"
              value={emailInput}
              onChangeText={setEmailInput}
            />
            <TouchableOpacity
              style={styles.addButton}
              onPress={handleAddFriendByEmail}
            >
              <Text style={styles.addButtonText}>Add</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.closeButton, { marginTop: 20 }]}
              onPress={() => setSuggestedFriendsModalVisible(false)}
            >
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
    marginBottom: 2,
  },
  friendText: {
    fontSize: 14,
    color: '#1A535C',
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
    marginTop: 20,
    marginBottom: 10,
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
    // For custom font, make sure it's loaded properly with useFonts hook from expo-font
    // fontFamily: "MoulRegular", 
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
    width: '85%',
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 10,
    alignItems: 'flex-start',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1A535C',
    alignSelf: 'center',
  },
  recipeText: {
    fontSize: 16,
    marginBottom: 5,
    color: '#1A535C',
    paddingLeft: 30,
  },
  closeButton: {
    backgroundColor: '#1A535C',
    padding: 10,
    borderRadius: 10,
    alignSelf: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  suggestedFriendCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F6FFF7',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  suggestedFriendIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  suggestedFriendInfo: {
    flex: 1,
  },
  suggestedFriendName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1A535C',
  },
  suggestedFriendRecipeCount: {
    fontSize: 14,
    color: '#666',
    marginTop: 3,
  },
  addButton: {
    backgroundColor: '#1A535C',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  noFriendsText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginVertical: 20,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    width: '100%',
  },
});