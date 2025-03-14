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
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as ImagePicker from "expo-image-picker";

interface ProfilePageProps {
  setUser: Dispatch<SetStateAction<User | null>>;
  user: User | null;
}

interface Friend {
  id: string;
  name: string;
  recipes: string[];
  email?: string; // optional email property
  picture?: string; // optional picture URL property
}

// This would be an actual API call in a real app
const sendUpdatedProfileToBackend = async (user: User, imageFile?: any): Promise<boolean> => {
  console.log("Sending updated profile to backend:", user);

  try {
    // Only proceed if we have a token (non-guest users)
    if (!user.token || user.guest) {
      console.log("No token available or guest user, skipping backend update");
      return true; // Return success for guest users
    }

    // Use the correct backend URL based on the environment
    const backendUrl = Platform.OS === 'web'
      ? 'http://localhost:8000'
      : 'http://10.0.2.2:8000';

    let apiResponse;
    if (imageFile) {
      // If we have an image file, use the upload endpoint
      const formData = new FormData();

      // Handle the image file differently based on platform
      if (Platform.OS === 'web') {
        try {
          // For web, we need to fetch the image and create a blob
          const imageResponse = await fetch(imageFile);
          const blob = await imageResponse.blob();

          // Ensure a valid filename with an allowed extension
          let filename = 'profile-picture.jpg';
          formData.append('image_file', blob, filename);
        } catch (error) {
          console.error("Error creating blob from image:", error);
          throw new Error("Failed to process image for upload");
        }
      } else {
        // For native platforms, we can use the URI directly
        const filename = imageFile.split('/').pop() || 'profile-picture.jpg';
        // Ensure the filename has a valid extension
        const validFilename = /\.(jpg|jpeg|png|gif|bmp|webp|tiff)$/i.test(filename)
          ? filename
          : `${filename}.jpg`;

        const match = /\.(\w+)$/.exec(validFilename);
        const type = match ? `image/${match[1]}` : 'image/jpeg';

        formData.append('image_file', {
          uri: imageFile,
          name: validFilename,
          type,
        } as any);
      }

      console.log("Uploading image with FormData");

      // Important: Do NOT set Content-Type header for multipart/form-data
      // The browser/fetch will set it automatically with the correct boundary
      apiResponse = await fetch(
        `${backendUrl}/user/upload-profile-picture`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${user.token}`,
          },
          body: formData,
        }
      );
    } else {
      // If we just have a URL (e.g., from Google), use the update endpoint
      apiResponse = await fetch(
        `${backendUrl}/user/update-profile-picture`,
        {
          method: "PUT", // Changed from POST to PUT to match backend endpoint
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`,
          },
          body: JSON.stringify({
            picture_url: user.picture || "",
          }),
        }
      );
    }

    if (!apiResponse.ok) {
      const errorData = await apiResponse.json();
      console.error("Backend error:", errorData);
      throw new Error(
        errorData.detail || `Failed to update profile picture: ${apiResponse.status} ${apiResponse.statusText}`
      );
    }

    const result = await apiResponse.json();
    console.log("Profile update response:", result);

    // Update AsyncStorage with the new picture URL from the backend response
    if (result.profile?.picture) {
      await AsyncStorage.setItem("userPicture", result.profile.picture);
      console.log("Updated profile picture in AsyncStorage:", result.profile.picture);
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
  const [emailInput, setEmailInput] = useState<string>(""); // Track email input
  const [isProfilePictureModalVisible, setIsProfilePictureModalVisible] =
    useState<boolean>(false);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string | undefined>(
    user?.picture
  );
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isConfirmEnabled, setIsConfirmEnabled] = useState(false);

  // Check for stored profile picture if not in user object
  useEffect(() => {
    const loadProfilePicture = async () => {
      try {
        // First try to get the picture from AsyncStorage
        const storedPicture = await AsyncStorage.getItem("userPicture");

        if (storedPicture) {
          // console.log("Found stored profile picture:", storedPicture);
          setProfilePicture(storedPicture);

          // Update the user object if possible
          if (user) {
            const updatedUser = { ...user, picture: storedPicture };
            setUser(updatedUser);
          }
        } else if (user?.picture) {
          // If no stored picture but user has a picture, store it
          await AsyncStorage.setItem("userPicture", user.picture);
          setProfilePicture(user.picture);
        }
      } catch (error) {
        console.error("Error loading profile picture:", error);
      }
    };

    loadProfilePicture();
  }, [user?.picture]);

  // Update profile picture when user changes
  useEffect(() => {
    setProfilePicture(user?.picture);
  }, [user]);

  // All possible friends (both current and potential)
  const allPossibleFriends: Friend[] = [
    {
      id: "1",
      name: "Chappell Roan",
      recipes: [
        "Spaghetti Carbonara",
        "Avocado Toast",
        "Blueberry Pancakes",
        "Iced Latte",
      ],
    },
    {
      id: "2",
      name: "Ziad Matni",
      recipes: ["Chicken Curry", "Beef Tacos"],
    },
    {
      id: "3",
      name: "Tobias Hollerer",
      recipes: ["Margherita Pizza", "Pumpkin Soup", "Grilled Salmon"],
    }
  ];

  // Current friends list - initially showing first 6 friends
  const [friends, setFriends] = useState<Friend[]>(
    allPossibleFriends.slice(0, 6)
  );

  // Suggested friends - calculated based on who is not in current friends
  const [suggestedFriends, setSuggestedFriends] = useState<Friend[]>([]);

  // Update suggested friends whenever the friends list changes
  useEffect(() => {
    const newSuggestedFriends = allPossibleFriends.filter(
      (possibleFriend) =>
        !friends.some((friend) => friend.id === possibleFriend.id)
    );
    setSuggestedFriends(newSuggestedFriends);
  }, [friends]);

  const handleRemoveFriend = (friendId: string) => {
    setFriends(friends.filter((friend) => friend.id !== friendId));
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
    const friend = allPossibleFriends.find((f) => f.email === emailInput);
    if (friend) {
      handleAddFriend(friend);
      setEmailInput(""); // Reset email input after adding
    } else {
      Alert.alert("Friend not found", "No friend with this email exists.");
    }
  };

  const handleSignOut = async () => {
    try {
      // Clean up AsyncStorage
      await AsyncStorage.removeItem("token");
      await AsyncStorage.removeItem("userId");
      await AsyncStorage.removeItem("isGuest");
      await AsyncStorage.removeItem("userName");
      await AsyncStorage.removeItem("userEmail");
      await AsyncStorage.removeItem("userPicture");

      // Reset tutorial state for the next user
      await AsyncStorage.removeItem("hasSeenFridgeTutorial");

      // If not a guest user, also revoke Google access
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

      // Setting user to null will redirect to login screen based on _layout.tsx logic
      setUser(null);
    } catch (error: any) {
      console.error("Error signing out:", error);
      // Even if there's an error, try to reset the user state
      setUser(null);
    }
  };

  const handleProfilePictureChange = async () => {
    setIsProfilePictureModalVisible(true);
  };

  const handleUseGooglePhoto = async () => {
    try {
      setIsUploading(true);
      setUploadError(null);

      // Get the Google profile photo
      let googlePhotoUrl = null;

      // First check if we have a Google photo in the user object
      if (user?.picture && user.picture.includes('googleusercontent.com')) {
        googlePhotoUrl = user.picture;
      } else {
        // Try to get the current Google user info
        try {
          // Check if user is signed in with Google
          const currentUser = await GoogleSignin.getCurrentUser();
          if (currentUser && currentUser.user && currentUser.user.photo) {
            googlePhotoUrl = currentUser.user.photo;
          }
        } catch (googleError) {
          console.error("Error getting Google user info:", googleError);
        }
      }

      if (!googlePhotoUrl) {
        setUploadError("No Google profile picture available");
        setIsUploading(false);
        return;
      }

      // Store the Google profile picture in AsyncStorage
      await AsyncStorage.setItem("userPicture", googlePhotoUrl);
      console.log("Using Google profile photo:", googlePhotoUrl);

      // Update the user object
      const updatedUser = { ...user!, picture: googlePhotoUrl };

      // Send confirmation to the backend
      await sendUpdatedProfileToBackend(updatedUser);

      // Update the UI
      setUser(updatedUser);
      setProfilePicture(googlePhotoUrl);
      setIsUploading(false);
      setIsProfilePictureModalVisible(false);
    } catch (error) {
      console.error("Error setting Google profile picture:", error);
      setUploadError(
        "Failed to set Google profile picture. Please try again."
      );
      setIsUploading(false);
    }
  };

  const handlePickImage = async () => {
    try {
      // Check for permissions
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Permission required",
          "Sorry, we need camera roll permissions to make this work!"
        );
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const imageUri = result.assets[0].uri;
        setSelectedImage(imageUri);
        setIsConfirmEnabled(true);
        setUploadError(null);
      }
    } catch (error: any) {
      console.error("Error picking image:", error);
      setUploadError("Error selecting image. Please try again.");
    }
  };

  const handleConfirmImage = async () => {
    if (!selectedImage || !user) return;

    try {
      setIsUploading(true);
      setUploadError(null);

      // Send the image file to the backend
      await sendUpdatedProfileToBackend(user, selectedImage);

      // Update the local user state
      const updatedUser = { ...user, picture: selectedImage };
      setUser(updatedUser);
      setProfilePicture(selectedImage);
      setSelectedImage(null);
      setIsConfirmEnabled(false);

      setIsUploading(false);
      setIsProfilePictureModalVisible(false);
    } catch (error: any) {
      console.error("Error updating profile picture:", error);
      setUploadError(error.message || "Failed to update profile picture. Please try again.");
      setIsUploading(false);
    }
  };

  const handleUseDefaultPhoto = async () => {
    if (user) {
      try {
        setIsUploading(true);
        setUploadError(null);

        // Remove the profile picture URL from AsyncStorage
        await AsyncStorage.removeItem("userPicture");
        console.log("Removed profile picture from AsyncStorage");

        // Remove the picture URL from the user object
        const updatedUser = { ...user };
        delete updatedUser.picture;

        // Send the updated profile to the backend
        const success = await sendUpdatedProfileToBackend(updatedUser);

        if (success) {
          // Update the local user state
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
        <TouchableOpacity onPress={() => setSuggestedFriendsModalVisible(true)}>
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
                <TouchableOpacity onPress={() => setSelectedFriend(friend)}>
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
            <View style={styles.recipeContainer}>
              {selectedFriend?.recipes.map((recipe, index) => (
                <Text key={index} style={styles.recipeText}>
                  • {recipe}
                </Text>
              ))}
            </View>
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
            <Text style={styles.modalTitle}>Suggested Friends</Text>

            {suggestedFriends.length > 0 ? (
              suggestedFriends.map((suggestedFriend) => (
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
              ))
            ) : (
              <Text style={styles.noFriendsText}>
                No more suggested friends available
              </Text>
            )}

            {/* Email Add Friend Section */}

            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <TextInput
                style={[styles.emailInput, { flex: 1 }]}
                placeholder="Enter friend's email"
                value={emailInput}
                onChangeText={setEmailInput}
              />
              <TouchableOpacity
                style={[styles.addButton, { marginLeft: 10, marginBottom: 15 }]}
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
                {selectedImage && (
                  <View style={styles.currentPhotoContainer}>
                    <Image
                      source={{ uri: selectedImage }}
                      style={styles.currentPhoto}
                      onError={() => {
                        console.log("Error loading selected image");
                        setUploadError("Could not load selected image");
                      }}
                    />
                    <Text style={styles.currentPhotoText}>Selected Photo</Text>
                  </View>
                )}

                {profilePicture && !user?.guest && !selectedImage && (
                  <View style={styles.currentPhotoContainer}>
                    <Image
                      source={{ uri: profilePicture }}
                      style={styles.currentPhoto}
                      onError={() => {
                        console.log("Error loading profile picture");
                        setUploadError("Could not load current profile picture");
                      }}
                    />
                    <Text style={styles.currentPhotoText}>Current Photo</Text>
                  </View>
                )}

                {profilePicture && !user?.guest && !selectedImage && (
                  <TouchableOpacity
                    style={styles.photoOption}
                    onPress={() => setIsProfilePictureModalVisible(false)}
                  >
                    <Text style={styles.photoOptionText}>Keep Current Photo</Text>
                  </TouchableOpacity>
                )}

                {!user?.guest && (
                  <TouchableOpacity
                    style={[styles.photoOption, { backgroundColor: '#4285F4' }]}
                    onPress={handleUseGooglePhoto}
                  >
                    <Text style={[styles.photoOptionText, { color: 'white' }]}>Use Google Photo</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={handlePickImage}
                >
                  <Text style={styles.photoOptionText}>Choose from Library</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.photoOption}
                  onPress={handleUseDefaultPhoto}
                >
                  <Text style={styles.photoOptionText}>Use Default Photo</Text>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.cancelButton]}
                    onPress={() => {
                      setIsProfilePictureModalVisible(false);
                      setUploadError(null);
                      setSelectedImage(null);
                      setIsConfirmEnabled(false);
                    }}
                  >
                    <Text style={styles.modalButtonText}>Cancel</Text>
                  </TouchableOpacity>

                  {isConfirmEnabled && (
                    <TouchableOpacity
                      style={[styles.modalButton, styles.confirmButton]}
                      onPress={handleConfirmImage}
                    >
                      <Text style={styles.modalButtonText}>Confirm</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}
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
    backgroundColor: "#F6FFF7",
  },
  profileCard: {
    padding: 10,
    marginBottom: 20,
    alignItems: "center",
  },
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
  statText: {
    fontSize: 14,
    color: "#666",
    marginBottom: 5,
  },
  friendsContainer: {
    marginBottom: 20,
    display: "flex",
  },
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
    fontWeight: "600",
    color: "#1A535C",
    marginBottom: 2,
  },
  friendText: {
    fontSize: 14,
    color: "#1A535C",
  },
  removeButton: {
    backgroundColor: "#1A535C",
    padding: 8,
    borderRadius: 20,
    alignSelf: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "500",
  },
  signOutButton: {
    backgroundColor: "#FF6B6B",
    padding: 15,
    borderRadius: 25,
    alignItems: "center",
    marginTop: 20,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
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
  name: {
    fontSize: 30,
    fontWeight: "bold",
    marginBottom: 5,
    // For custom font, make sure it's loaded properly with useFonts hook from expo-font
    // fontFamily: "MoulRegular",
  },
  username: {
    fontSize: 16,
    marginBottom: 5,
    fontWeight: "bold",
    color: "#1A535C",
  },
  bio: {
    fontSize: 16,
    color: "#1A535C",
    marginBottom: 10,
  },
  friendIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
  header: {
    flexDirection: "row",
    marginBottom: 10,
    gap: 10,
  },
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
    alignItems: "stretch",
    maxHeight: "80%",
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 15,
    color: "#1A535C",
    alignSelf: "center",
    textAlign: "center",
  },
  recipeText: {
    fontSize: 16,
    marginBottom: 5,
    color: "#1A535C",
    paddingLeft: 30,
    textAlign: "left",
    alignSelf: "flex-start",
    width: "100%",
  },
  closeButton: {
    backgroundColor: "#1A535C",
    padding: 10,
    borderRadius: 10,
    alignSelf: "center",
    marginTop: 10,
    width: "30%",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
  suggestedFriendCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F6FFF7",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    width: "100%",
    shadowColor: "#000",
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
    fontWeight: "bold",
    color: "#1A535C",
  },
  suggestedFriendRecipeCount: {
    fontSize: 14,
    color: "#666",
    marginTop: 3,
  },
  addButton: {
    backgroundColor: "#1A535C",
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  noFriendsText: {
    fontSize: 16,
    color: "#666",
    fontStyle: "italic",
    textAlign: "center",
    marginVertical: 20,
  },
  emailInput: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 10,
    borderRadius: 5,
    marginBottom: 15,
    width: "80%",
  },
  friendEmail: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  profilePictureContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  changePhotoButton: {
    marginTop: 8,
    padding: 8,
    backgroundColor: "#007AFF",
    borderRadius: 20,
  },
  changePhotoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  photoOption: {
    width: "100%",
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    marginBottom: 10,
    alignItems: "center",
    alignSelf: "center",
  },
  photoOptionText: {
    fontSize: 16,
    color: "#007AFF",
    fontWeight: "500",
  },
  uploadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  uploadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#555",
  },
  errorText: {
    color: "red",
    marginBottom: 15,
    textAlign: "center",
  },
  friendModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    alignSelf: "center",
    justifyContent: "center",
  },
  friendModalIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 10,
  },
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
  currentPhotoText: {
    fontSize: 14,
    color: "#666",
    marginTop: 5,
  },
  disabledButton: {
    opacity: 0.5,
  },
  recipeContainer: {
    width: "100%",
    flexDirection: "column",
    alignItems: "flex-start",
    alignSelf: "flex-start",
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 10,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#FF6B6B',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  modalButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
