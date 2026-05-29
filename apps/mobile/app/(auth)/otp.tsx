import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store";

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];
  const { setAuth } = useAuthStore();

  function onDigit(index: number, value: string) {
    const d = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = d;
    setOtp(next);
    if (d && index < 3) refs[index + 1].current?.focus();
  }

  function onKey(index: number, key: string) {
    if (key === "Backspace" && !otp[index] && index > 0) {
      refs[index - 1].current?.focus();
    }
  }

  async function verify() {
    const code = otp.join("");
    if (code.length < 4) return;
    setLoading(true);
    try {
      const res = await api.post<{ data: { token: string; user: any } }>("/auth/verify-otp", { phone, code });
      await setAuth(res.data.token, res.data.user);
      const role = res.data.user.role;
      if (role === "delivery_staff") router.replace("/(delivery)/route");
      else router.replace("/(customer)/home");
    } catch (e: any) {
      Alert.alert("Invalid OTP", e.message ?? "Please try again");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.inner}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>Enter OTP</Text>
        <Text style={styles.sub}>Sent via WhatsApp to +91 {phone}</Text>

        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              style={[styles.box, d ? styles.boxFilled : null]}
              value={d}
              onChangeText={(v) => onDigit(i, v)}
              onKeyPress={({ nativeEvent }) => onKey(i, nativeEvent.key)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <TouchableOpacity
          style={[styles.btn, otp.join("").length < 4 && styles.btnDisabled]}
          onPress={verify}
          disabled={loading || otp.join("").length < 4}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Verify &amp; continue</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  inner: { flex: 1, padding: 24, justifyContent: "center" },
  back: { position: "absolute", top: 56, left: 24 },
  backText: { color: colors.blue, fontSize: 15, fontWeight: "600" },
  title: { fontSize: 24, fontWeight: "700", color: colors.ink, marginBottom: 6, letterSpacing: -0.5 },
  sub: { fontSize: 14, color: colors.muted, marginBottom: 32 },
  otpRow: { flexDirection: "row", gap: 12, marginBottom: 28 },
  box: { width: 64, height: 72, textAlign: "center", fontSize: 28, fontWeight: "700", borderWidth: 1.5, borderColor: colors.border2, borderRadius: 14, backgroundColor: colors.surface2, color: colors.ink },
  boxFilled: { borderColor: colors.blue, backgroundColor: colors.surface },
  btn: { backgroundColor: colors.green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
