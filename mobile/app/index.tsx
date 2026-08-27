import { Redirect } from 'expo-router';

export default function Index() {
  // Auth gating in the root layout will bounce to /(auth)/login if not signed in.
  return <Redirect href="/(tabs)" />;
}
