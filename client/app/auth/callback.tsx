import React, { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator } from 'react-native-paper';

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
        
        // Navigate to main page with user data as query params
        router.replace(`/?token=${encodeURIComponent(token as string)}&userData=${encodeURIComponent(JSON.stringify(userData))}`);
        
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