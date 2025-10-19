import { Redirect } from 'expo-router';

export default function Index() {
  // Redirect ke Login screen sebagai landing page
  return <Redirect href="/screens/auth/Login" />;
}
