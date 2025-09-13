import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const { token, user, error } = useLocalSearchParams();

  useEffect(() => {
    console.log('Auth callback received:', { token, user, error });
    
    if (error) {
      console.error('Authentication error:', error);
      router.replace('/(auth)/login');
      return;
    }

    if (token && user) {
      try {
        const userData = typeof user === 'string' ? JSON.parse(user) : user;
        console.log('Authentication successful:', userData);
        console.log('Token received:', token);
        
        // Store auth data in AsyncStorage
        const storeAuthData = async () => {
          try {
            await AsyncStorage.setItem('authToken', token as string);
            await AsyncStorage.setItem('userData', JSON.stringify(userData));
            console.log('Auth data stored successfully in AsyncStorage');
            
            // Navigate to main page with user data
            router.replace(`/?fromAuth=true`);
          } catch (storeError) {
            console.error('Error storing auth data:', storeError);
            // Even if storage fails, navigate to main page with URL params as fallback
            router.replace(`/?token=${encodeURIComponent(token as string)}&userData=${encodeURIComponent(JSON.stringify(userData))}`);
          }
        };
        
        storeAuthData();
        
      } catch (parseError) {
        console.error('Error parsing user data:', parseError);
        router.replace('/(auth)/login');
      }
    } else {
      console.error('Missing token or user data');
      router.replace('/(auth)/login');
    }
  }, [token, user, error, router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" />
      <Text style={styles.text}>Processing authentication...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    textAlign: 'center',
  },
});