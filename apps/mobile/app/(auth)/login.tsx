import { useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendOtp() {
    if (phone.length !== 10) {
      setError("Enter a valid 10-digit mobile number");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await api.post("/auth/send-otp", { phone });
      router.push({ pathname: "/(auth)/otp", params: { phone } });
    } catch (e: any) {
      setError(e.message ?? "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={styles.inner}>
        <View style={styles.logo}>
          <Text style={styles.logoIcon}>🥛</Text>
        </View>
        <Text style={styles.title}>Varun Dairy Farm</Text>
        <Text style={styles.sub}>Enter your mobile number to continue</Text>

        <View style={styles.inputWrap}>
          <Text style={styles.prefix}>+91</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={(t) => { setPhone(t.replace(/\D/g, "").slice(0, 10)); setError(""); }}
            placeholder="98XXXXXXXX"
            keyboardType="phone-pad"
            placeholderTextColor={colors.faint}
            maxLength={10}
          />
        </View>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <TouchableOpacity style={[styles.btn, phone.length !== 10 && styles.btnDisabled]} onPress={sendOtp} disabled={loading || phone.length !== 10}>
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={styles.btnText}>Send OTP →</Text>}
        </TouchableOpacity>

        <Text style={styles.note}>OTP sent via WhatsApp · Valid for 10 minutes</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  logo: { width: 72, height: 72, borderRadius: 20, backgroundColor: colors.blue, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  logoIcon: { fontSize: 36 },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 6, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 28 },
  inputWrap: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border2, borderRadius: 12, paddingHorizontal: 14, height: 52, marginBottom: 16 },
  prefix: { fontSize: 15, color: colors.muted, marginRight: 8 },
  input: { flex: 1, fontSize: 17, fontWeight: "600", color: colors.ink, letterSpacing: 2 },
  error: { color: colors.red, fontSize: 13, marginBottom: 12 },
  btn: { backgroundColor: colors.blue, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  note: { textAlign: "center", color: colors.faint, fontSize: 12, marginTop: 18 },
});
