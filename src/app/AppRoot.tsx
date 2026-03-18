import { useState } from "react";
import { HomeScreen } from "../screens/HomeScreen";
import { SignInScreen } from "../screens/SignInScreen";

/**
 * Runs the full app view from one place.
 */
export function AppRoot() {
  const googleMapsApiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";
  const [hasEntered, setHasEntered] = useState(false);

  if (!hasEntered) {
    return <SignInScreen onContinue={() => setHasEntered(true)} />;
  }

  return (
    <HomeScreen
      googleMapsApiKey={googleMapsApiKey}
      onSignOut={() => setHasEntered(false)}
    />
  );
}
