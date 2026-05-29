import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore, useCustomerStore } from "@/store";

function fmt(n: number) { return `₹${Math.abs(n).toLocaleString("en-IN")}`; }

export default function HomeScreen() {
  const { user } = useAuthStore();
  const { walletBalance } = useCustomerStore();
  const [qty, setQty] = useState(3);
  const qc = useQueryClient();

  const { data: homeData } = useQuery({
    queryKey: ["customer-home"],
    queryFn: () => api.get<{ data: any }>("/customers/home"),
    enabled: false,
  });

  const changeMutation = useMutation({
    mutationFn: (newQty: number) =>
      api.patch(`/subscriptions/my/milk`, { quantity: newQty }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customer-home"] }),
  });

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Top */}
        <View style={styles.topRow}>
          <View>
            <Text style={styles.greeting}>Good morning</Text>
            <Text style={styles.name}>{user?.name ?? "Meera Reddy"}</Text>
          </View>
          <View style={styles.walletBadge}>
            <Text style={styles.walletIcon}>👝</Text>
            <Text style={styles.walletAmt}>{fmt(walletBalance || 676)}</Text>
          </View>
        </View>

        {/* Today's delivery hero */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Text style={styles.heroLabel}>Today's delivery</Text>
            <View style={styles.statusBadge}>
              <Text style={styles.statusText}>🚚 On the way</Text>
            </View>
          </View>
          <View style={styles.heroItem}>
            <View style={styles.heroItemIcon}><Text style={{ fontSize: 24 }}>🥛</Text></View>
            <View>
              <Text style={styles.heroItemName}>Milk ×{qty}, Curd ×1</Text>
              <Text style={styles.heroItemMeta}>Arriving by 7:25 AM · Sanjay</Text>
            </View>
          </View>
        </View>

        {/* Subscription card */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>My subscription</Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/subscription" as any)}>
              <Text style={styles.cardAction}>Manage</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.subRow}>
            <View style={styles.subLeft}>
              <Text style={{ fontSize: 20 }}>🥛</Text>
              <Text style={styles.subName}>Toned milk · daily</Text>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setQty(Math.max(1, qty - 1))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepQty}>{qty} L</Text>
              <TouchableOpacity onPress={() => setQty(Math.min(9, qty + 1))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.ghostBtn}><Text style={styles.ghostBtnText}>⏸ Pause</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ghostBtn}><Text style={styles.ghostBtnText}>🏖 Vacation</Text></TouchableOpacity>
          </View>
        </View>

        {/* Quick add */}
        <View style={styles.card}>
          <View style={styles.cardHead}>
            <Text style={styles.cardTitle}>Add to today</Text>
            <TouchableOpacity onPress={() => router.push("/(customer)/store" as any)}>
              <Text style={styles.cardAction}>Store</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quickGrid}>
            {[
              { icon: "🥣", name: "Curd", price: "₹40" },
              { icon: "🫙", name: "Ghee", price: "₹320" },
              { icon: "🧀", name: "Paneer", price: "₹80" },
            ].map((p) => (
              <TouchableOpacity key={p.name} style={styles.quickItem}>
                <Text style={styles.quickIcon}>{p.icon}</Text>
                <Text style={styles.quickName}>{p.name}</Text>
                <Text style={styles.quickPrice}>{p.price}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 16 },
  greeting: { fontSize: 12, color: colors.muted },
  name: { fontSize: 19, fontWeight: "700", color: colors.ink, letterSpacing: -0.4 },
  walletBadge: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: colors.greenSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 7 },
  walletIcon: { fontSize: 16 },
  walletAmt: { fontSize: 15, fontWeight: "700", color: colors.greenInk },
  hero: { backgroundColor: colors.blue, borderRadius: 18, padding: 16, marginBottom: 13 },
  heroTop: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  heroLabel: { color: "rgba(255,255,255,0.9)", fontSize: 13 },
  statusBadge: { backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { fontSize: 11, fontWeight: "600", color: colors.greenInk },
  heroItem: { flexDirection: "row", alignItems: "center", gap: 12 },
  heroItemIcon: { width: 46, height: 46, borderRadius: 13, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center" },
  heroItemName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  heroItemMeta: { color: "rgba(255,255,255,0.85)", fontSize: 12, marginTop: 2 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 13 },
  cardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  cardTitle: { fontSize: 14, fontWeight: "600", color: colors.ink },
  cardAction: { fontSize: 13, color: colors.blue, fontWeight: "600" },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.border },
  subLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  subName: { fontSize: 13.5, color: colors.ink },
  stepper: { flexDirection: "row", alignItems: "center", gap: 12 },
  stepBtn: { width: 32, height: 32, borderRadius: 9, borderWidth: 1, borderColor: colors.border2, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  stepBtnText: { fontSize: 18, color: colors.ink, lineHeight: 22 },
  stepQty: { fontSize: 16, fontWeight: "700", color: colors.ink, minWidth: 42, textAlign: "center" },
  actionRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  ghostBtn: { flex: 1, borderWidth: 1, borderColor: colors.border2, borderRadius: 11, height: 40, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  ghostBtnText: { fontSize: 13, fontWeight: "600", color: colors.ink },
  quickGrid: { flexDirection: "row", gap: 10 },
  quickItem: { flex: 1, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 12, alignItems: "center", gap: 4 },
  quickIcon: { fontSize: 26 },
  quickName: { fontSize: 13, fontWeight: "600", color: colors.ink },
  quickPrice: { fontSize: 12, color: colors.muted },
});
