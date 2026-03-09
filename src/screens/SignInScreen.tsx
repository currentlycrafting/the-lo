import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

type SignInScreenProps = {
  onSignIn: () => void;
};

export function SignInScreen({ onSignIn }: SignInScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const canSignIn = useMemo(() => email.trim().length > 0 && password.trim().length > 0, [email, password]);

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView
        style={styles.keyboardContainer}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.content}>
          <Text style={styles.wordmark}>THE LO</Text>
          <Text style={styles.tagline}>KNOW THE LO.</Text>

          <View style={styles.formCard}>
            <Text style={styles.formLabel}>EMAIL</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.formLabel}>PASSWORD</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor="#6b7280"
              secureTextEntry
            />

            <TouchableOpacity
              style={[styles.signInButton, !canSignIn && styles.signInButtonDisabled]}
              onPress={onSignIn}
              disabled={!canSignIn}
            >
              <View style={styles.signInButtonContent}>
                <Ionicons name="log-in-outline" size={14} color="#000000" />
                <Text style={styles.signInButtonText}>SIGN IN</Text>
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
  formLabel: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderRadius: 999,
    backgroundColor: "#0a0a0a",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    color: "#ffffff",
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  signInButton: {
    marginTop: 6,
    height: 44,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center",
  },
  signInButtonDisabled: {
    opacity: 0.45,
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
