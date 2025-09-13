import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Avatar, Button, Card } from 'react-native-paper';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { token, userData } = useLocalSearchParams();

  useEffect(() => {
    // Check if we received user data from auth callback
    if (token && userData) {
      try {
        const parsedUserData = typeof userData === 'string' ? JSON.parse(userData) : userData;
        console.log('Received user data on main page:', parsedUserData);
        setUser(parsedUserData);
      } catch (error) {
        console.error('Error parsing user data on main page:', error);
      }
    }
    setLoading(false);
  }, [token, userData]);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: () => {
            // Clear auth data and redirect to login
            setUser(null);
            router.replace('/(auth)/login');
          }
        }
      ]
    );
  };

  // If still loading, show loading state
  if (loading) {
    return (
      <View style={styles.container}>
        <Text>Loading...</Text>
      </View>
    );
  }

  // If no user data, redirect to login
  if (!user) {
    // For now, we'll show a default welcome screen since auth is working
    // In the logs we can see the user data is being received
    return (
      <View style={styles.container}>
        <Card style={styles.card}>
          <Card.Content style={styles.cardContent}>
            <Avatar.Icon size={80} icon="account" style={styles.avatar} />
            <Text style={styles.welcomeText}>Welcome to SnapEvent!</Text>
            <Text style={styles.subText}>
              Authentication successful! User data will be displayed here once storage is implemented.
            </Text>
            <Button 
              mode="outlined" 
              onPress={() => router.push('/(auth)/login')}
              style={styles.button}
            >
              Go to Login
            </Button>
          </Card.Content>
        </Card>
      </View>
    );
  }

  // Show user profile (this will be used once we have proper auth storage)
  return (
    <View style={styles.container}>
      <Card style={styles.card}>
        <Card.Content style={styles.cardContent}>
          <Avatar.Image size={80} source={{ uri: user.picture }} style={styles.avatar} />
          <Text style={styles.userName}>{user.name}</Text>
          <Text style={styles.userEmail}>{user.email}</Text>
          <Button 
            mode="contained" 
            onPress={handleSignOut}
            style={styles.button}
          >
            Sign Out
          </Button>
        </Card.Content>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    elevation: 4,
  },
  cardContent: {
    alignItems: 'center',
    padding: 20,
  },
  avatar: {
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 10,
  },
});


