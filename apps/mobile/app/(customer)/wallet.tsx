import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native";
import { colors } from "@/lib/theme";

function fmt(n: number, signed = false) {
  const abs = Math.abs(n).toLocaleString("en-IN");
  if (signed) return n < 0 ? `−₹${abs}` : `+₹${abs}`;
  return `₹${abs}`;
}

const TXNS = [
  { id: "1", name: "Milk delivery", meta: "Today · auto-debit", amount: -144 },
  { id: "2", name: "Wallet recharge", meta: "28 May · UPI", amount: 500 },
  { id: "3", name: "Curd delivery", meta: "27 May · auto-debit", amount: -40 },
  { id: "4", name: "Wallet recharge", meta: "25 May · UPI", amount: 1000 },
];

export default function WalletScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Wallet</Text>

        <View style={styles.hero}>
          <Text style={styles.heroLabel}>Available balance</Text>
          <Text style={styles.heroAmount}>₹676</Text>
          <TouchableOpacity style={styles.rechargeBtn} onPress={() => Alert.alert("Coming soon", "Razorpay integration")}>
            <Text style={styles.rechargeBtnText}>+ Recharge wallet</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.autoPayCard}>
          <View>
            <Text style={styles.autoPayTitle}>Auto-pay</Text>
            <Text style={styles.autoPaySub}>UPI mandate · ₹2,000 cap</Text>
          </View>
          <View style={styles.onBadge}><Text style={styles.onBadgeText}>On</Text></View>
        </View>

        <Text style={styles.sectionLabel}>RECENT TRANSACTIONS</Text>
        <View style={styles.card}>
          {TXNS.map((t, i) => (
            <View key={t.id} style={[styles.txnRow, i === TXNS.length - 1 && { borderBottomWidth: 0 }]}>
              <View>
                <Text style={styles.txnName}>{t.name}</Text>
                <Text style={styles.txnMeta}>{t.meta}</Text>
              </View>
              <Text style={[styles.txnAmt, { color: t.amount < 0 ? colors.redInk : colors.greenInk }]}>
                {fmt(t.amount, true)}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 16 },
  hero: { backgroundColor: colors.green, borderRadius: 18, padding: 20, alignItems: "center", marginBottom: 13 },
  heroLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 6 },
  heroAmount: { color: "#fff", fontSize: 40, fontWeight: "700", letterSpacing: -1, marginBottom: 16 },
  rechargeBtn: { backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 24, width: "100%" , alignItems:"center" },
  rechargeBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  autoPayCard: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 14, padding: 15, flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  autoPayTitle: { fontSize: 13.5, fontWeight: "600", color: colors.ink },
  autoPaySub: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  onBadge: { backgroundColor: colors.greenSoft, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  onBadgeText: { color: colors.greenInk, fontSize: 12, fontWeight: "700" },
  sectionLabel: { fontSize: 11, color: colors.muted, fontWeight: "700", letterSpacing: 1, marginBottom: 10 },
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, paddingHorizontal: 15 },
  txnRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  txnName: { fontSize: 13.5, fontWeight: "600", color: colors.ink },
  txnMeta: { fontSize: 11.5, color: colors.muted, marginTop: 2 },
  txnAmt: { fontSize: 14, fontWeight: "700" },
});
