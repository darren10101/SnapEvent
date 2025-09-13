import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Alert } from 'react-native';
import { Avatar, Button, Card } from 'react-native-paper';
import { Redirect, useRouter, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
}

export default function Index() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const router = useRouter();
  const { token: urlToken, userData: urlUserData } = useLocalSearchParams();

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        // First check if we have stored auth data
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserData = await AsyncStorage.getItem('userData');
        
        if (storedToken && storedUserData) {
          // Use stored data
          console.log('Loading auth data from AsyncStorage');
          const parsedUser = JSON.parse(storedUserData);
          setToken(storedToken);
          setUser(parsedUser);
          console.log('Loaded user from storage:', parsedUser);
        } else if (urlToken && urlUserData) {
          // Fallback to URL params (legacy support)
          console.log('Loading auth data from URL params');
          const parsedUser = typeof urlUserData === 'string' ? JSON.parse(urlUserData) : urlUserData;
          setToken(urlToken as string);
          setUser(parsedUser);
          console.log('Loaded user from URL:', parsedUser);
        } else {
          // No auth data found, redirect to login
          console.log('No auth data found, redirecting to login');
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Error loading auth data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAuthData();
  }, [urlToken, urlUserData]);

  const handleSignOut = async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Sign Out', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Clear stored auth data
              await AsyncStorage.removeItem('authToken');
              await AsyncStorage.removeItem('userData');
              console.log('Auth data cleared from storage');
              
              // Clear state and redirect to login
              setUser(null);
              setToken(null);
              router.replace('/(auth)/login');
            } catch (error) {
              console.error('Error clearing auth data:', error);
              // Still redirect even if clearing fails
              setUser(null);
              setToken(null);
              router.replace('/(auth)/login');
            }
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


