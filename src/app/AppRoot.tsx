import { useState } from "react";
import { HomeScreen } from "../screens/HomeScreen";
import { SignInScreen } from "../screens/SignInScreen";

/**
 * Runs the full app view from one place.
 */
export function AppRoot() {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [isSignedIn, setIsSignedIn] = useState(false);

  if (!isSignedIn) {
    return <SignInScreen onSignIn={() => setIsSignedIn(true)} />;
  }

  return (
    <HomeScreen
      googleMapsApiKey={googleMapsApiKey}
      onSignOut={() => setIsSignedIn(false)}
    />
  );
}
