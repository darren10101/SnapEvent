import React from 'react';
import { Image, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { Button, Text, useTheme } from 'react-native-paper';
import { loginWithGoogle } from '../../lib/auth';

export default function LoginScreen() {
  const paperTheme = useTheme();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleGoogleLogin = async () => {
    console.log('Google login button pressed');
    setError(null);
    setLoading(true);
    try {
      console.log('Calling loginWithGoogle...');
      const result = await loginWithGoogle();
      console.log('Login result:', result);
      // TODO: Navigate to the app's authenticated area once session is stored.
    } catch (e: any) {
      console.error('Google login error:', e);
      setError(e?.message ?? 'Google login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView style={[styles.container, { backgroundColor: paperTheme.colors.background }]} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.inner}>
        <View style={styles.logoWrap}>
          <Image source={require('../../assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <Text variant="headlineMedium" style={[styles.title, { color: paperTheme.colors.onBackground, fontFamily: 'Montserrat_700Bold' }]}>SnapEvent</Text>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Button
          mode="contained"
          icon="google"
          onPress={handleGoogleLogin}
          disabled={loading}
          buttonColor={paperTheme.colors.primary}
          textColor={paperTheme.colors.onPrimary}
        >
          Continue with Google
        </Button>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center' },
  inner: { padding: 24, gap: 16 },
  logoWrap: { alignItems: 'center', marginBottom: 12 },
  logo: { width: 160, height: 80 },
  title: { marginBottom: 16, textAlign: 'center' },
  error: { color: 'red', marginBottom: 8 },
});


