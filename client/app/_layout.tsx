import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from '../theme';
import { useFonts, Montserrat_400Regular, Montserrat_700Bold } from '@expo-google-fonts/montserrat';
import { View } from 'react-native';
import { AuthProvider } from '../contexts/AuthContext';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Montserrat_400Regular,
    Montserrat_700Bold,
  });

  if (!fontsLoaded) {
    return <View />;
  }
  return (
    <AuthProvider>
      <PaperProvider theme={theme}>
        <Stack screenOptions={{ headerShown: false }} />
      </PaperProvider>
    </AuthProvider>
  );
}


