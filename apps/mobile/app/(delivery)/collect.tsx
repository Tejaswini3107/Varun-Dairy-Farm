import { useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet, SafeAreaView, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useDeliveryStore } from "@/store";
import { enqueueAction } from "@/lib/offline";
import NetInfo from "@react-native-community/netinfo";
import { fmt } from "./utils";

export default function CollectScreen() {
  const { currentOrderId, route, markDelivered } = useDeliveryStore();
  const order = route.find((o) => o.id === currentOrderId);
  const [method, setMethod] = useState<"wallet" | "upi" | "cash" | null>(null);
  const [loading, setLoading] = useState(false);

  async function markPaid() {
    if (!method || !order) return;
    setLoading(true);

    const payload = {
      status: "delivered",
      paymentMethod: method,
      collectedAmount: order.totalAmount,
    };

    try {
      const { isConnected } = await NetInfo.fetch();

      if (!isConnected) {
        // Queue for offline sync
        await enqueueAction({
          endpoint: `/orders/${order.id}/status`,
          method: "PATCH",
          body: payload,
        });
        markDelivered(order.id);
        router.replace("/(delivery)/done" as any);
        return;
      }

      await api.patch(`/orders/${order.id}/status`, payload);
      markDelivered(order.id);
      router.replace("/(delivery)/done" as any);
    } catch (e: any) {
      Alert.alert("Error", e.message ?? "Could not mark as paid. Saved for sync.");
    } finally {
      setLoading(false);
    }
  }

  if (!order) return null;

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.topRow}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Text style={styles.backText}>←</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>Collect payment</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Amount due</Text>
          <Text style={styles.heroAmount}>{fmt(order.totalAmount)}</Text>
        </View>

        <Text style={styles.sectionLabel}>SELECT PAYMENT METHOD</Text>
        <View style={styles.methodGrid}>
          {([
            { key: "upi", icon: "📲", label: "UPI / QR" },
            { key: "cash", icon: "💵", label: "Cash" },
            { key: "wallet", icon: "👝", label: "Wallet" },
          ] as const).map((m) => (
            <TouchableOpacity
              key={m.key}
              style={[styles.methodCard, method === m.key && styles.methodCardActive]}
              onPress={() => setMethod(m.key)}
            >
              <Text style={styles.methodIcon}>{m.icon}</Text>
              <Text style={[styles.methodLabel, method === m.key && { color: colors.blueInk }]}>{m.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity
          style={[styles.payBtn, (!method || loading) && { opacity: 0.5 }]}
          onPress={markPaid}
          disabled={!method || loading}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.payBtnText}>✓ Mark paid</Text>}
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, padding: 16 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
  backBtn: { width: 40, height: 40, borderRadius: 11, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  backText: { fontSize: 20, color: colors.ink },
  pageTitle: { fontSize: 16, fontWeight: "700", color: colors.ink },
  hero: { backgroundColor: colors.green, borderRadius: 18, padding: 20, alignItems: "center", marginBottom: 24 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 6 },
  heroAmount: { color: "#fff", fontSize: 40, fontWeight: "700", letterSpacing: -1 },
  sectionLabel: { fontSize: 11, color: colors.muted, fontWeight: "700", letterSpacing: 1, marginBottom: 12 },
  methodGrid: { flexDirection: "row", gap: 10, marginBottom: 24 },
  methodCard: { flex: 1, backgroundColor: colors.surface, borderWidth: 1.5, borderColor: colors.border, borderRadius: 14, padding: 14, alignItems: "center", gap: 6 },
  methodCardActive: { borderColor: colors.blue, backgroundColor: colors.blueSoft },
  methodIcon: { fontSize: 28 },
  methodLabel: { fontSize: 13, fontWeight: "600", color: colors.muted },
  payBtn: { backgroundColor: colors.green, borderRadius: 14, height: 54, alignItems: "center", justifyContent: "center", marginTop: "auto" },
  payBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
