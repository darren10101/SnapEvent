import React, { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const storedToken = await AsyncStorage.getItem('authToken');
        const storedUserData = await AsyncStorage.getItem('userData');
        setIsLoggedIn(!!storedToken && !!storedUserData);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return null;

  return <Redirect href={isLoggedIn ? '/(dashboard)/home' : '/(auth)/login'} />;
}


