import { useState } from "react";
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView,
} from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { colors } from "@/lib/theme";
import { api } from "@/lib/api";
import { useAuthStore, useDeliveryStore } from "@/store";
import { fmt } from "./utils";

export default function RouteScreen() {
  const { user } = useAuthStore();
  const { summary, route: orders, setRoute, setCurrentOrder } = useDeliveryStore();

  useQuery({
    queryKey: ["my-route"],
    queryFn: async () => {
      const res = await api.get<{ data: { orders: any[]; summary: any } }>("/delivery/my-route");
      setRoute(res.data.orders, res.data.summary);
      return res.data;
    },
    refetchInterval: 30_000,
  });

  const pending = orders.filter((o) => o.status !== "delivered" && o.status !== "failed");
  const nextStop = pending[0];

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          <View style={styles.heroRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user?.name?.slice(0, 2).toUpperCase() ?? "SK"}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroName}>{user?.name ?? "Delivery Agent"}</Text>
              <Text style={styles.heroSub}>Route 3 · Kondapur</Text>
            </View>
          </View>
          <View style={styles.heroStats}>
            {[
              { label: "Total", value: summary?.total ?? 0 },
              { label: "Done", value: summary?.done ?? 0 },
              { label: "Left", value: summary?.pending ?? 0 },
            ].map((s) => (
              <View key={s.label} style={styles.heroStat}>
                <Text style={styles.heroStatVal}>{s.value}</Text>
                <Text style={styles.heroStatLabel}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Collection pill */}
        <View style={styles.collectionPill}>
          <Text style={styles.collectionLabel}>💰 Collected today</Text>
          <Text style={styles.collectionVal}>{fmt(summary?.totalCollection ?? 0)}</Text>
        </View>

        {/* Next stop */}
        {nextStop && (
          <>
            <Text style={styles.sectionLabel}>NEXT STOP</Text>
            <View style={styles.card}>
              <View style={styles.stopHead}>
                <View>
                  <Text style={styles.stopName}>{(nextStop.customer as any)?.user?.name ?? "—"}</Text>
                  <Text style={styles.stopAddr}>{(nextStop.customer as any)?.address ?? "—"}</Text>
                </View>
                <View style={styles.stopNumBadge}>
                  <Text style={styles.stopNumText}>Stop {nextStop.stopSequence}</Text>
                </View>
              </View>
              <View style={styles.tagRow}>
                {nextStop.items?.map((item: any) => (
                  <View key={item.id} style={styles.tag}>
                    <Text style={styles.tagText}>×{item.quantity}</Text>
                  </View>
                ))}
                <View style={[styles.tag, { backgroundColor: colors.amberSoft }]}>
                  <Text style={[styles.tagText, { color: colors.amberInk }]}>{fmt(nextStop.totalAmount)} to collect</Text>
                </View>
              </View>
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.deliverBtn}
                  onPress={() => { setCurrentOrder(nextStop.id); router.push("/(delivery)/confirm" as any); }}
                >
                  <Text style={styles.deliverBtnText}>✓ Deliver</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} aria-label="Navigate">
                  <Text style={styles.ghostBtnText}>🧭</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.ghostBtn} aria-label="Call">
                  <Text style={styles.ghostBtnText}>📞</Text>
                </TouchableOpacity>
              </View>
            </View>
          </>
        )}

        {/* Upcoming stops */}
        {pending.slice(1, 6).length > 0 && (
          <>
            <Text style={styles.sectionLabel}>UPCOMING</Text>
            <View style={styles.card}>
              {pending.slice(1, 6).map((order, i) => (
                <View key={order.id} style={[styles.upcomingRow, i === pending.slice(1, 6).length - 1 && { borderBottomWidth: 0 }]}>
                  <Text style={styles.stopNum}>{order.stopSequence}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.upcomingName}>{(order.customer as any)?.user?.name ?? "—"}</Text>
                    <Text style={styles.upcomingMeta}>{fmt(order.totalAmount)} · {order.items?.length ?? 0} items</Text>
                  </View>
                  <Text style={styles.chevron}>›</Text>
                </View>
              ))}
            </View>
          </>
        )}

        {pending.length === 0 && (
          <View style={styles.allDone}>
            <Text style={styles.allDoneIcon}>🎉</Text>
            <Text style={styles.allDoneTitle}>Route complete!</Text>
            <Text style={styles.allDoneSub}>All {summary?.total} deliveries done · {fmt(summary?.totalCollection ?? 0)} collected</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { backgroundColor: colors.blue, borderRadius: 18, padding: 16, marginBottom: 13 },
  heroRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 },
  avatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: "rgba(255,255,255,0.22)", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  heroName: { color: "#fff", fontWeight: "700", fontSize: 15 },
  heroSub: { color: "rgba(255,255,255,0.85)", fontSize: 12 },
  heroStats: { flexDirection: "row", gap: 8 },
  heroStat: { flex: 1, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 11, padding: 10 },
  heroStatVal: { color: "#fff", fontSize: 22, fontWeight: "700" },
  heroStatLabel: { color: "rgba(255,255,255,0.85)", fontSize: 11 },
  collectionPill: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.greenSoft, borderRadius: 13, padding: 13, marginBottom: 13 },
  collectionLabel: { fontSize: 13, color: colors.greenInk, fontWeight: "600" },
  collectionVal: { fontSize: 17, fontWeight: "700", color: colors.greenInk },
  sectionLabel: { fontSize: 11, color: colors.muted, fontWeight: "700", letterSpacing: 1, marginBottom: 8, marginTop: 4 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, marginBottom: 13 },
  stopHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 },
  stopName: { fontSize: 15, fontWeight: "700", color: colors.ink },
  stopAddr: { fontSize: 12, color: colors.muted, marginTop: 2 },
  stopNumBadge: { backgroundColor: colors.blueSoft, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  stopNumText: { fontSize: 11, fontWeight: "700", color: colors.blueInk },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
  tag: { backgroundColor: colors.surface2, borderRadius: 7, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 12, color: colors.muted, fontWeight: "500" },
  actionRow: { flexDirection: "row", gap: 8 },
  deliverBtn: { flex: 1, backgroundColor: colors.green, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center" },
  deliverBtnText: { color: "#fff", fontSize: 14, fontWeight: "700" },
  ghostBtn: { width: 44, height: 44, borderRadius: 11, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  ghostBtnText: { fontSize: 18 },
  upcomingRow: { flexDirection: "row", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: colors.border },
  stopNum: { fontSize: 13, color: colors.faint, fontWeight: "600", width: 24 },
  upcomingName: { fontSize: 13.5, fontWeight: "600", color: colors.ink },
  upcomingMeta: { fontSize: 11.5, color: colors.muted },
  chevron: { fontSize: 18, color: colors.faint },
  allDone: { alignItems: "center", paddingVertical: 48 },
  allDoneIcon: { fontSize: 56, marginBottom: 12 },
  allDoneTitle: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  allDoneSub: { fontSize: 13, color: colors.muted, textAlign: "center" },
});
