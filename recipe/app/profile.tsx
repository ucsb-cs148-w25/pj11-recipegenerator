import { Image, View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";

export default function ProfilePage() {
  const savedFriends = [
    { 
      id: '1', 
      name: 'Chappell Roan',
    },
    { 
      id: '2', 
      name: 'Ziad Matni',
    },
    { 
      id: '3', 
      name: 'Tobias Hollerer',
    }
  ];

  return (
    <ScrollView style={styles.container}>
      <Image source={require('../assets/images/defaultprofilepic.png')} style={styles.iconpic} />
      <View style={styles.profileCard}>
        <Text style={styles.name}>Taylor Swift</Text>
        <Text style={styles.username}>@taylorswift</Text>
        <Text style={styles.bio}>I love fries and burgers</Text>
      </View>

      <View style={styles.header}>
        <Text style={styles.sectionTitle}>Friends</Text>
        <Image source={require('../assets/images/addfriend.png')}/>
      </View>
      <View style={styles.friendsContainer}>
        {savedFriends.map((friend) => (
          <View key={friend.id} style={styles.friendsCard}>
            <Image source={require('../assets/images/defaultprofilepic.png')} style={styles.friendIcon}/>
            <Text style={styles.friendName}>{friend.name}</Text>
            <TouchableOpacity style={styles.removeButton}>
              <Text style={styles.removeButtonText}>Remove</Text>
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
  header:{
    flexDirection: 'row',
    marginBottom: 10,
    gap: 10,
  }
});
