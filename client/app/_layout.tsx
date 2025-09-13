import { Stack } from 'expo-router';
import { Provider as PaperProvider } from 'react-native-paper';
import { theme } from '../theme';

export default function RootLayout() {
  return (
    <PaperProvider theme={theme}>
      <Stack screenOptions={{ headerShown: false }} />
    </PaperProvider>
  );
}


