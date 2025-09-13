import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect to login by default for now.
  return <Redirect href="/(auth)/login" />;
}


