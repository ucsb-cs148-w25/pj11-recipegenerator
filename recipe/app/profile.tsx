import React from "react";
import {
  Image,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { useState, useEffect, Dispatch, SetStateAction } from "react";
import { User } from "./login";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";
import { apiRequest } from "./api"; // our helper for API calls
import { useNavigation } from "@react-navigation/native";
import { EventRegister } from "react-native-event-listeners";

interface ProfilePageProps {
  setUser: Dispatch<SetStateAction<User | null>>;
  user: User | null;
}

interface Friend {
  id: string;
  name: string;
  recipes: (string | { title: string; description?: string })[];
  email?: string;
  picture?: string;
}

// Updates profile picture on the backend
const sendUpdatedProfileToBackend = async (user: User): Promise<boolean> => {
  console.log("Sending updated profile to backend:", user);
  try {
    if (!user.token || user.guest) {
      console.log("No token available or guest user, skipping backend update");
      return true;
    }
    const backendUrl =
      Platform.OS === "web" ? "http://127.0.0.1:8000" : "http://10.0.2.2:8000";
    const response = await fetch(`${backendUrl}/user/update-profile-picture`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${user.token}`,
      },
      body: JSON.stringify({ picture_url: user.picture || "" }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Backend error:", errorData);
      throw new Error(
        errorData.detail ||
          `Failed to update profile picture: ${response.status} ${response.statusText}`
      );
    }
    const result = await response.json();
    console.log("Profile update response:", result);
    if (result.profile?.picture) {
      await AsyncStorage.setItem("userPicture", result.profile.picture);
      console.log(
        "Updated profile picture in AsyncStorage:",
        result.profile.picture
      );
    }
    return result.success;
  } catch (error) {
    console.error("Error sending profile update to backend:", error);
    throw error;
  }
};

export default function ProfilePage({ setUser, user }: ProfilePageProps) {
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [suggestedFriendsModalVisible, setSuggestedFriendsModalVisible] =
    useState<boolean>(false);
  const [emailInput, setEmailInput] = useState<string>("");
  const [isProfilePictureModalVisible, setIsProfilePictureModalVisible] =
    useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(
    user?.picture
  );
  const [friendsSuggestionEnabled, setFriendsSuggestionEnabled] =
    useState<boolean>(true);

  // Load settings from AsyncStorage
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const friendsSuggestionValue = await AsyncStorage.getItem(
          "friendsSuggestionEnabled"
        );
        // Default to true if not explicitly set to false
        setFriendsSuggestionEnabled(friendsSuggestionValue !== "false");
      } catch (error) {
        console.error("Error loading friend suggestion settings:", error);
      }
    };

    loadSettings();
  }, []);

  // Listen for settings changes
  useEffect(() => {
    // Create a listener for settings changes
    const listener = EventRegister.addEventListener(
      "settingsChanged",
      (data: any) => {
        if (data.key === "friendsSuggestionEnabled") {
          setFriendsSuggestionEnabled(data.value);
        }
      }
    );

    // Clean up the listener when the component unmounts
    return () => {
      EventRegister.removeEventListener(listener as string);
    };
  }, []);

  // Load stored profile picture if needed
  useEffect(() => {
    if (!user?.picture) {
      AsyncStorage.getItem("userPicture")
        .then((storedPicture) => {
          if (storedPicture) {
            console.log("Found stored profile picture:", storedPicture);
            setProfilePicture(storedPicture);
            if (user) {
              const updatedUser = { ...user, picture: storedPicture };
              setUser(updatedUser);
            }
          }
        })
        .catch((error) => {
          console.error("Error loading profile picture from storage:", error);
        });
    } else {
      setProfilePicture(user.picture);
    }
  }, [user?.picture]);

  useEffect(() => {
    setProfilePicture(user?.picture);
  }, [user]);

  // --- Friends Data ---
  // Instead of using a static placeholder, fetch the friend list from backend
  const [friends, setFriends] = useState<Friend[]>([]);
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  // Fetch friend list from backend
  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const data = await apiRequest("/user/friends");
        if (Array.isArray(data)) {
          setFriends(data);
        } else {
          console.error("Unexpected friend list data", data);
        }
      } catch (error) {
        console.error("Error fetching friends:", error);
      }
    };

    if (user && user.token) {
      fetchFriends();
    }
  }, [user]);

  // For now, use static placeholders for suggested friends (you can later fetch these dynamically)
  const allPossibleFriends: Friend[] = [
    {
      id: "official1",
      name: "Recipe Copilot",
      email: "recipecopilot@recipeai.live",
      picture: "https://img.icons8.com/color/96/000000/chef-hat.png",
      recipes: [
        "Weekly Special: Autumn Squash Soup",
        "Trending: Spicy Chicken Tacos",
        "Staff Pick: Chocolate Lava Cake",
        "Popular: Garlic Butter Shrimp Pasta",
        "New: Vegan Buddha Bowl",
      ],
    },
    {
      id: "daily1",
      name: "Daily Recommendation",
      email: "dailyrecommendation@recipeai.live",
      picture: "https://img.icons8.com/color/96/000000/calendar.png",
      recipes: [
        "Monday Meal Prep: Quinoa Bowls",
        "Quick Lunch: Mediterranean Wrap",
        "Dinner Party: Roasted Salmon",
        "Weekend Brunch: Avocado Toast",
        "Healthy Snack: Greek Yogurt Parfait",
      ],
    },
    {
      id: "theboss1",
      name: "Tobias Hollerer",
      email: "hollerer@cs.ucsb.edu",
      recipes: [
        "Margherita Pizza",
        "Pumpkin Soup",
        "Grilled Salmon",
        "German Pretzel",
        "Apple Strudel",
      ],
    },
  ];

  useEffect(() => {
    // Only set suggested friends if the feature is enabled
    if (friendsSuggestionEnabled) {
      const newSuggestedFriends = allPossibleFriends.filter(
        (possibleFriend) =>
          !friends.some((friend) => friend.id === possibleFriend.id)
      );
      setSuggestedFriends(newSuggestedFriends);
    } else {
      // Clear suggested friends if the feature is disabled
      setSuggestedFriends([]);
    }
  }, [friends, friendsSuggestionEnabled]);

  const backendUrl =
    Platform.OS === "web" ? "http://127.0.0.1:8000" : "http://10.0.2.2:8000";

  // --- Friend-related Functions ---

  // Remove friend
  const handleRemoveFriend = async (friendId: string) => {
    try {
      const response = await fetch(
        `${backendUrl}/user/remove_friend?friend_id=${friendId}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user?.token}`,
          },
        }
      );
      if (response.ok) {
        setFriends(friends.filter((friend) => friend.id !== friendId));
      } else {
        Alert.alert("Error", "Failed to remove friend.");
      }
    } catch (error) {
      console.error("Error removing friend:", error);
      setFriends(friends.filter((friend) => friend.id !== friendId));
    }
  };

  // Add friend by email
  const handleAddFriendByEmail = async () => {
    if (!emailInput) return;
    try {
      const response = await fetch(`${backendUrl}/user/add_friend`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user?.token}`,
        },
        body: JSON.stringify({ email: emailInput }),
      });
      const text = await response.text();
      console.log("Raw response text:", text);
      const newFriend = JSON.parse(text);
      setEmailInput("");
      setFriends([...friends, newFriend]);
    } catch (error) {
      console.error("Error adding friend:", error);
    }
  };

  // Fetch friend's favorite recipes when a friend is selected
  const handleSelectFriend = async (friend: Friend) => {
    try {
      // Special handling for default suggested friends
      if (
        friend.id.startsWith("official") ||
        friend.id.startsWith("daily") ||
        friend.id.startsWith("theboss")
      ) {
        // For default friends, we already have their recipes in the friend object
        setSelectedFriend(friend);
        return;
      }

      // For regular friends, fetch recipes from the backend
      const response = await fetch(
        `${backendUrl}/user/friend_favorites?friend_id=${friend.id}`,
        {
          headers: { Authorization: `Bearer ${user?.token}` },
        }
      );
      if (response.ok) {
        const recipes = await response.json();
        const updatedFriend = { ...friend, recipes };
        setSelectedFriend(updatedFriend);
      } else {
        Alert.alert("Error", "Failed to fetch friend's favorite recipes.");
      }
    } catch (error) {
      console.error("Error fetching friend's favorite recipes:", error);
    }
  };

  // For suggested friends modal (keeping placeholders)
  const handleAddFriend = (friendToAdd: Friend) => {
    // For default friends, we don't need to make an API call
    if (
      friendToAdd.id.startsWith("official") ||
      friendToAdd.id.startsWith("daily") ||
      friendToAdd.id.startsWith("theboss")
    ) {
      // Just add them directly to the friends list
      setFriends([...friends, friendToAdd]);

      // Close the modal if this was the last suggested friend
      if (suggestedFriends.length <= 1) {
        setSuggestedFriendsModalVisible(false);
      }
      return;
    }

    // For regular friends, we would typically make an API call here
    // But for now, just add them to the list
    setFriends([...friends, friendToAdd]);
    if (suggestedFriends.length <= 1) {
      setSuggestedFriendsModalVisible(false);
    }
  };

  // Open the add friend modal
  const handleOpenSuggestedFriendsModal = () => {
    // Always open the modal, but control what's shown inside based on settings
    setSuggestedFriendsModalVisible(true);
  };

  // --- Sign Out & Profile Picture Functions (unchanged) ---
  const handleSignOut = async () => {
    try {
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("isGuest");
      await AsyncStorage.removeItem("userName");
      await AsyncStorage.removeItem("userEmail");
      await AsyncStorage.removeItem("userPicture");
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");
      if (!user?.guest) {
        try {
          await GoogleSignin.revokeAccess();
          await GoogleSignin.signOut();
          console.log("Google user successfully signed out");
        } catch (googleError: any) {
          console.log(
            "Error with Google sign out, proceeding anyway:",
            googleError
          );
        }
      } else {
        console.log("Guest user signed out");
      }
      setUser(null);
    } catch (error: any) {
      console.error("Error signing out:", error);
      setUser(null);
    }
  };

  const handleProfilePictureChange = async () => {
    setIsProfilePictureModalVisible(true);
  };

  const handleUseGooglePhoto = async () => {
    if (user && user.picture) {
      try {
        setIsUploading(true);
        await AsyncStorage.setItem("userPicture", user.picture);
        console.log("Using Google profile photo:", user.picture);
        await sendUpdatedProfileToBackend(user);
        setProfilePicture(user.picture);
        setIsUploading(false);
        setIsProfilePictureModalVisible(false);
      } catch (error) {
        console.error("Error setting Google profile picture:", error);
        setUploadError(
          "Failed to set Google profile picture. Please try again."
        );
        setIsUploading(false);
      }
    } else {
      setIsProfilePictureModalVisible(false);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
        base64: true,
      });
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setIsUploading(true);
        setUploadError(null);
        try {
          if (user) {
            await AsyncStorage.setItem("userPicture", imageUri);
            console.log("Saved profile picture to AsyncStorage:", imageUri);
            const updatedUser = { ...user, picture: imageUri };
            try {
              await sendUpdatedProfileToBackend(updatedUser);
              setUser(updatedUser);
              setProfilePicture(imageUri);
              setIsUploading(false);
              setIsProfilePictureModalVisible(false);
            } catch (error: any) {
              await AsyncStorage.removeItem("userPicture");
              throw error;
            }
          }
        } catch (error: any) {
          console.error("Error updating profile picture:", error);
          setUploadError(
            error.message ||
              "Failed to update profile picture. Please try again."
          );
          setIsUploading(false);
        }
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      setUploadError("Error selecting image. Please try again.");
      setIsUploading(false);
    }
  };

  const handleUseDefaultPhoto = async () => {
    if (user) {
      try {
        setIsUploading(true);
        setUploadError(null);
        await AsyncStorage.removeItem("userPicture");
        console.log("Removed profile picture from AsyncStorage");
        const updatedUser = { ...user };
        delete updatedUser.picture;
        const success = await sendUpdatedProfileToBackend(updatedUser);
        if (success) {
          setUser(updatedUser);
          setProfilePicture(undefined);
          setIsUploading(false);
          setIsProfilePictureModalVisible(false);
        } else {
          throw new Error("Failed to update profile on server");
        }
      } catch (error) {
        console.error("Error removing profile picture:", error);
        setUploadError("Failed to reset profile picture. Please try again.");
        setIsUploading(false);
      }
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.profilePictureContainer}>
        <Image
          source={
            profilePicture
              ? { uri: profilePicture }
              : require("../assets/images/defaultprofilepic.png")
          }
          style={styles.iconpic}
        />
        <TouchableOpacity
          style={styles.changePhotoButton}
          onPress={handleProfilePictureChange}
        >
          <Text style={styles.changePhotoText}>Change Photo</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.profileCard}>
        <Text style={styles.name}>{user?.name ?? "Your Name"}</Text>
        <Text style={styles.username}>
          @
          {user?.name
            ? user.name.replace(/\s+/g, "").toLowerCase()
            : "username"}
        </Text>
        <Text style={styles.bio}>I love fries and burgers</Text>
      </View>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <TouchableOpacity onPress={handleOpenSuggestedFriendsModal}>
          <Image source={require("../assets/images/addfriend.png")} />
        </TouchableOpacity>
      </View>
      <View style={styles.friendsContainer}>
        {friends.length > 0 ? (
          friends.map((friend) => (
            <View key={friend.id} style={styles.friendsCard}>
              <Image
                source={
                  friend.picture
                    ? { uri: friend.picture }
                    : require("../assets/images/defaultprofilepic.png")
                }
                style={styles.friendIcon}
              />
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={() => handleSelectFriend(friend)}>
                  <Text style={styles.friendName}>{friend.name}</Text>
                  {friend.email && (
                    <Text style={styles.friendEmail}>{friend.email}</Text>
                  )}
                  <Text style={styles.friendText}>
                    ❤️️ See their favorites!
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => handleRemoveFriend(friend.id)}
              >
                <Text style={styles.removeButtonText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ))
        ) : (
          <Text style={styles.noFriendsText}>
            You haven't added any friends yet
          </Text>
        )}
      </View>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.buttonText}>Sign Out</Text>
      </TouchableOpacity>
      {/* Friend Favorites Modal */}
      <Modal visible={!!selectedFriend} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.friendModalHeader}>
              <Image
                source={
                  selectedFriend?.picture
                    ? { uri: selectedFriend.picture }
                    : require("../assets/images/defaultprofilepic.png")
                }
                style={styles.friendModalIcon}
              />
              <Text style={styles.modalTitle}>
                {selectedFriend?.name}'s Favorite Recipes
              </Text>
            </View>
            <ScrollView style={styles.recipesScrollView}>
              {selectedFriend?.recipes.map((recipe, index) => (
                <View key={index} style={styles.recipeContainer}>
                  {typeof recipe === "string" ? (
                    <Text style={styles.recipeText}>• {recipe}</Text>
                  ) : (
                    <Text style={styles.recipeText}>• {recipe.title}</Text>
                  )}
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setSelectedFriend(null)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Suggested Friends Modal */}
      <Modal
        visible={suggestedFriendsModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {friendsSuggestionEnabled ? "Suggested Friends" : "Add Friend"}
            </Text>

            {/* Only show suggested friends if the feature is enabled */}
            {friendsSuggestionEnabled && suggestedFriends.length > 0 && (
              <>
                {suggestedFriends.map((suggestedFriend) => (
                  <View
                    key={suggestedFriend.id}
                    style={styles.suggestedFriendCard}
                  >
                    <Image
                      source={
                        suggestedFriend.picture
                          ? { uri: suggestedFriend.picture }
                          : require("../assets/images/defaultprofilepic.png")
                      }
                      style={styles.suggestedFriendIcon}
                    />
                    <View style={styles.suggestedFriendInfo}>
                      <Text style={styles.suggestedFriendName}>
                        {suggestedFriend.name}
                      </Text>
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
                ))}
              </>
            )}

            {/* Show message if suggestions are enabled but none are available */}
            {friendsSuggestionEnabled && suggestedFriends.length === 0 && (
              <Text style={styles.noFriendsText}>
                No more suggested friends available
              </Text>
            )}

            {/* Show message if suggestions are disabled */}
            {!friendsSuggestionEnabled && (
              <View style={styles.settingMessageContainer}>
                <Text style={styles.settingMessage}>
                  Friend suggestions are currently disabled.
                </Text>
                {/* <TouchableOpacity
                  style={styles.settingsButton}
                  onPress={() => {
                    setSuggestedFriendsModalVisible(false);
                    // Navigate to settings
                    const navigation = useNavigation();
                    navigation.navigate("Settings" as never);
                  }}
                >
                  <Text style={styles.settingsButtonText}>Go to Settings</Text>
                </TouchableOpacity> */}
              </View>
            )}

            {/* Email Add Friend Section - always visible */}
            <View style={styles.suggestedFriendCard}>
              <TextInput
                style={styles.emailInput}
                placeholder="Enter friend's email"
                placeholderTextColor="#AAAAAA"
                value={emailInput}
                onChangeText={setEmailInput}
              />
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddFriendByEmail}
              >
                <Text style={styles.addButtonText}>Add</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={[styles.closeButton, { marginTop: 20 }]}
              onPress={() => setSuggestedFriendsModalVisible(false)}
            >
              <Text style={styles.closeButtonText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* Profile Picture Modal */}
      <Modal
        visible={isProfilePictureModalVisible}
        transparent
        animationType="slide"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Profile Picture</Text>
            {uploadError && <Text style={styles.errorText}>{uploadError}</Text>}
            {isUploading ? (
              <View style={styles.uploadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.uploadingText}>Processing image...</Text>
              </View>
            ) : (
              <>
                {profilePicture && !user?.guest && (
                  <View style={styles.currentPhotoContainer}>
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.currentPhoto}
                      onError={() => {
                        console.log("Error loading profile picture");
                        setUploadError(
                          "Could not load current profile picture"
                        );
                      }}
                    />
                    <Text style={styles.currentPhotoText}>Current Photo</Text>
                  </View>
                )}
                {profilePicture && !user?.guest && (
                  <TouchableOpacity
                    style={styles.photoOption}
                    onPress={handleUseGooglePhoto}
                  >
                    <Text style={styles.photoOptionText}>
                      Keep Current Photo
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={handlePickImage}
                >
                  <Text style={styles.photoOptionText}>
                    Choose from Library
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={handleUseDefaultPhoto}
                >
                  <Text style={styles.photoOptionText}>Use Default Photo</Text>
                </TouchableOpacity>
              </>
            )}
            <TouchableOpacity
              style={[styles.closeButton, isUploading && styles.disabledButton]}
              disabled={isUploading}
              onPress={() => {
                if (!isUploading) {
                  setIsProfilePictureModalVisible(false);
                  setUploadError(null);
                }
              }}
            >
              <Text style={styles.closeButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#F6FFF7" },
  profileCard: { padding: 10, marginBottom: 20, alignItems: "center" },
  sectionTitle: {
    fontSize: 25,
    fontWeight: "600",
    color: "#088F8F",
    marginBottom: 15,
  },
  statsContainer: {
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
    padding: 15,
    marginTop: 10,
  },
  statText: { fontSize: 14, color: "#666", marginBottom: 5 },
  friendsContainer: { marginBottom: 20, display: "flex" },
  friendsCard: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 15,
    padding: 15,
    marginBottom: 10,
    backgroundColor: "#F7CE45",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  friendName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1A535C",
    marginBottom: 2,
  },
  friendText: { fontSize: 14, color: "#1A535C" },
  removeButton: {
    backgroundColor: "#1A535C",
    padding: 8,
    borderRadius: 20,
    alignSelf: "center",
    justifyContent: "center",
  },
  removeButtonText: { color: "white", fontSize: 14, fontWeight: "500" },
  signOutButton: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    letterSpacing: 1,
  },
  iconpic: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    padding: 10,
  },
  name: { fontSize: 30, fontWeight: "bold", marginBottom: 5 },
  username: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "bold",
    color: "#1A535C",
  },
  bio: { fontSize: 16, color: "#1A535C", marginBottom: 10 },
  friendIcon: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  header: { flexDirection: "row", marginBottom: 10, gap: 10 },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContent: {
    width: "85%",
    backgroundColor: "white",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1A535C",
    alignSelf: "center",
  },
  recipeText: {
    fontSize: 16,
    marginBottom: 8,
    color: "#1A535C",
    paddingLeft: 10,
    paddingRight: 10,
  },
  closeButton: {
    backgroundColor: "#1A535C",
    padding: 10,
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 10,
    width: "30%",
  },
  closeButtonText: { color: "white", fontWeight: "bold", textAlign: "center" },
  suggestedFriendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6FFF7",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: "100%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
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
  suggestedFriendInfo: { flex: 1 },
  suggestedFriendName: { fontSize: 16, fontWeight: "bold", color: "#1A535C" },
  suggestedFriendRecipeCount: { fontSize: 14, color: "#666", marginTop: 3 },
  addButton: {
    backgroundColor: "#1A535C",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  addButtonText: { color: "white", fontWeight: "bold" },
  noFriendsText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  emailInput: {
    flex: 1,
    borderWidth: 0,
    padding: 10,
    fontSize: 16,
    color: "#1A535C",
  },
  friendEmail: { fontSize: 14, color: "#666", marginBottom: 2 },
  profilePictureContainer: { alignItems: "center", marginTop: 20 },
  changePhotoButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#007AFF",
    borderRadius: 20,
  },
  changePhotoText: { color: "white", fontSize: 14, fontWeight: "600" },
  photoOption: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  photoOptionText: { fontSize: 16, color: "#007AFF", fontWeight: "500" },
  uploadingContainer: { padding: 20, alignItems: "center" },
  uploadingText: { marginTop: 10, fontSize: 16, color: "#555" },
  errorText: { color: "red", marginBottom: 15, textAlign: "center" },
  friendModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  friendModalIcon: { width: 50, height: 50, borderRadius: 25, marginRight: 10 },
  currentPhotoContainer: {
    alignItems: "center",
    marginBottom: 10,
    width: "100%",
    alignSelf: "center",
  },
  currentPhoto: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: "center",
    alignItems: "center",
  },
  currentPhotoText: { fontSize: 14, color: "#666", marginTop: 5 },
  disabledButton: { opacity: 0.5 },
  recipeContainer: {
    marginVertical: 4,
  },
  recipeDescription: {
    fontSize: 14,
    color: "#555",
    marginLeft: 10,
  },
  recipesScrollView: {
    maxHeight: 300,
    width: "100%",
    marginBottom: 15,
  },
  settingMessageContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    width: "100%",
  },
  settingMessage: {
    fontSize: 16,
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  settingsButton: {
    backgroundColor: "#088F8F",
    padding: 10,
    borderRadius: 25,
  },
  settingsButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
    marginHorizontal: 5,
  },
});
