import { useCallback } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SignInScreenProps = {
  onContinue: () => void;
};

export function SignInScreen({ onContinue }: SignInScreenProps) {
  const handleContinue = useCallback(() => {
    Alert.alert("Guest Mode", "Authentication is coming soon. For now, you’re continuing as a guest.");
    onContinue();
  }, [onContinue]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text accessibilityRole="header" style={styles.wordmark}>
            THE LO
          </Text>
          <Text style={styles.tagline}>KNOW THE LO.</Text>

          <View style={styles.formCard}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Continue as guest"
              style={styles.signInButton}
              onPress={handleContinue}
            >
              <View style={styles.signInButtonContent}>
                <Ionicons name="log-in-outline" size={14} color="#000000" />
                <Text style={styles.signInButtonText}>CONTINUE</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  keyboardContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: "center",
    gap: 16,
  },
  wordmark: {
    color: "#ffffff",
    fontSize: 42,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: -0.5,
  },
  tagline: {
    color: "#6b7280",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 2,
  },
  formCard: {
    marginTop: 10,
    backgroundColor: "#1c1c1e",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 16,
  },
  signInButton: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonText: {
    color: "#000000",
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  signInButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6
  },
});
