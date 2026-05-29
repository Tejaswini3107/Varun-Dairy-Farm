import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView, Alert } from "react-native";
import { colors } from "@/lib/theme";

const PRODUCTS = [
  { id: "p1", icon: "🥛", name: "Toned milk", price: "₹48 / L", bg: colors.blueSoft, tc: colors.blueInk },
  { id: "p2", icon: "🥣", name: "Curd", price: "₹40", bg: colors.greenSoft, tc: colors.greenInk },
  { id: "p3", icon: "🫙", name: "Pure ghee", price: "₹320", bg: colors.amberSoft, tc: colors.amberInk },
  { id: "p4", icon: "🧀", name: "Paneer", price: "₹80", bg: colors.blueSoft, tc: colors.blueInk },
];

export default function StoreScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Store</Text>
          <Text style={styles.searchIcon}>🔍</Text>
        </View>

        <View style={styles.grid}>
          {PRODUCTS.map((p) => (
            <View key={p.id} style={styles.productCard}>
              <View style={[styles.productIcon, { backgroundColor: p.bg }]}>
                <Text style={{ fontSize: 28 }}>{p.icon}</Text>
              </View>
              <Text style={styles.productName}>{p.name}</Text>
              <Text style={styles.productPrice}>{p.price}</Text>
              <TouchableOpacity
                style={styles.addBtn}
                onPress={() => Alert.alert("Added", `${p.name} added to today's order`)}
              >
                <Text style={styles.addBtnText}>+ Add</Text>
              </TouchableOpacity>
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
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 18 },
  pageTitle: { fontSize: 22, fontWeight: "700", color: colors.ink },
  searchIcon: { fontSize: 22 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  productCard: { width: "47.5%", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 14, alignItems: "center", gap: 4 },
  productIcon: { width: 56, height: 56, borderRadius: 15, alignItems: "center", justifyContent: "center", marginBottom: 4 },
  productName: { fontSize: 14, fontWeight: "600", color: colors.ink },
  productPrice: { fontSize: 12, color: colors.muted, marginBottom: 8 },
  addBtn: { width: "100%", borderWidth: 1, borderColor: colors.border2, borderRadius: 10, height: 36, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface2 },
  addBtnText: { fontSize: 13, fontWeight: "600", color: colors.ink },
});
