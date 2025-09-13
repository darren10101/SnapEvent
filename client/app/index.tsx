import React from 'react';
import { Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import { View } from 'react-native';

export default function Index() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <View />;

  return <Redirect href={user ? '/(dashboard)/home' : '/(auth)/login'} />;
}


