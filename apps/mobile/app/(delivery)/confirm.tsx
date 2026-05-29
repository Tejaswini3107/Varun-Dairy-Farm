import { useState, useRef } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  SafeAreaView, ScrollView, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useDeliveryStore } from "@/store";
import { fmt } from "./utils";

export default function ConfirmScreen() {
  const { currentOrderId, route } = useDeliveryStore();
  const order = route.find((o) => o.id === currentOrderId);
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [loading, setLoading] = useState(false);
  const refs = [useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null), useRef<TextInput>(null)];

  function onDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[i] = d;
    setOtp(next);
    if (d && i < 3) refs[i + 1].current?.focus();
  }

  async function confirm() {
    const code = otp.join("");
    if (code.length < 4) return;
    setLoading(true);
    try {
      await api.post(`/orders/${currentOrderId}/verify-otp`, { otp: code });
      router.push("/(delivery)/collect" as any);
    } catch (e: any) {
      Alert.alert("Wrong OTP", "Please check with the customer and try again.");
    } finally {
      setLoading(false);
    }
  }

  if (!order) return null;

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Confirm delivery</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.card, { alignItems: "center" }]}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{((order.customer as any)?.user?.name ?? "?").slice(0, 2).toUpperCase()}</Text>
          </View>
          <Text style={styles.custName}>{(order.customer as any)?.user?.name ?? "—"}</Text>
          <Text style={styles.custAddr}>{(order.customer as any)?.address ?? "—"} · Stop {order.stopSequence}</Text>
        </View>

        <View style={styles.card}>
          {order.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <Text style={styles.itemLabel}>{(item as any).product?.name ?? "—"}</Text>
              <Text style={styles.itemVal}>×{item.quantity}</Text>
            </View>
          ))}
          <View style={styles.itemRow}>
            <Text style={styles.itemLabel}>Amount</Text>
            <Text style={[styles.itemVal, { fontFamily: "monospace" }]}>{fmt(order.totalAmount)}</Text>
          </View>
        </View>

        <Text style={styles.otpLabel}>ENTER OTP SENT TO CUSTOMER</Text>
        <View style={styles.otpRow}>
          {otp.map((d, i) => (
            <TextInput
              key={i}
              ref={refs[i]}
              style={[styles.otpBox, d ? styles.otpBoxFilled : null]}
              value={d}
              onChangeText={(v) => onDigit(i, v)}
              keyboardType="number-pad"
              maxLength={1}
              selectTextOnFocus
            />
          ))}
        </View>

        <View style={styles.proofRow}>
          <TouchableOpacity style={styles.ghostBtn}><Text style={styles.ghostBtnText}>📷 Photo proof</Text></TouchableOpacity>
          <TouchableOpacity style={styles.ghostBtn}><Text style={styles.ghostBtnText}>📱 QR scan</Text></TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.confirmBtn, otp.join("").length < 4 && { opacity: 0.5 }]}
          onPress={confirm}
          disabled={loading || otp.join("").length < 4}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.confirmBtnText}>✓ Confirm &amp; collect</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  backText: { fontSize: 20, color: colors.ink },
  pageTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 13 },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  avatarText: { color: colors.blueInk, fontWeight: "700", fontSize: 16 },
  custName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  custAddr: { fontSize: 12, color: colors.muted, marginTop: 2 },
  itemRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  itemLabel: { fontSize: 13, color: colors.muted },
  itemVal: { fontSize: 14, fontWeight: "600", color: colors.ink },
  otpLabel: { fontSize: 11, color: colors.muted, fontWeight: "700", letterSpacing: 1, textAlign: "center", marginBottom: 10 },
  otpRow: { flexDirection: "row", gap: 10, justifyContent: "center", marginBottom: 16 },
  otpBox: { width: 56, height: 66, textAlign: "center", fontSize: 26, fontWeight: "700", borderWidth: 1.5, borderColor: colors.border2, borderRadius: 12, backgroundColor: colors.surface2, color: colors.ink },
  otpBoxFilled: { borderColor: colors.blue, backgroundColor: colors.surface },
  proofRow: { flexDirection: "row", gap: 10, marginBottom: 16 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: colors.border2, borderRadius: 11, height: 44, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  ghostBtnText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  confirmBtn: { backgroundColor: colors.green, borderRadius: 14, height: 52, alignItems: "center", justifyContent: "center" },
  confirmBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
