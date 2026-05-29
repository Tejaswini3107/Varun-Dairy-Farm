import { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { colors } from "@/lib/theme";

export default function SubscriptionScreen() {
  const [milkQty, setMilkQty] = useState(3);

  return (
    <SafeAreaView style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <Text style={styles.pageTitle}>Subscription</Text>
          <Text style={{ fontSize: 20 }}>📅</Text>
        </View>

        <View style={styles.card}>
          {/* Milk row */}
          <View style={styles.subRow}>
            <View style={styles.subLeft}>
              <Text style={{ fontSize: 20, color: colors.blue }}>🥛</Text>
              <View>
                <Text style={styles.subName}>Toned milk</Text>
                <Text style={styles.subMeta}>Daily · ₹48/L</Text>
              </View>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity onPress={() => setMilkQty(Math.max(1, milkQty - 1))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.stepQty}>{milkQty} L</Text>
              <TouchableOpacity onPress={() => setMilkQty(Math.min(9, milkQty + 1))} style={styles.stepBtn}>
                <Text style={styles.stepBtnText}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
          {/* Curd row */}
          <View style={styles.subRow}>
            <View style={styles.subLeft}>
              <Text style={{ fontSize: 20, color: colors.green }}>🥣</Text>
              <View>
                <Text style={styles.subName}>Curd</Text>
                <Text style={styles.subMeta}>Daily · ₹40</Text>
              </View>
            </View>
            <View style={styles.stepper}>
              <TouchableOpacity style={styles.stepBtn}><Text style={styles.stepBtnText}>−</Text></TouchableOpacity>
              <Text style={styles.stepQty}>1</Text>
              <TouchableOpacity style={styles.stepBtn}><Text style={styles.stepBtnText}>+</Text></TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Delivery controls</Text>
          <View style={styles.ctrlRow}>
            <TouchableOpacity style={styles.ctrlBtn}><Text style={styles.ctrlBtnText}>⏸ Pause delivery</Text></TouchableOpacity>
            <TouchableOpacity style={styles.ctrlBtn}><Text style={styles.ctrlBtnText}>🏖 Vacation mode</Text></TouchableOpacity>
          </View>
          <TouchableOpacity style={[styles.ctrlBtn, { width: "100%", marginTop: 8 }]}>
            <Text style={styles.ctrlBtnText}>⏱ Temporary change for tomorrow</Text>
          </TouchableOpacity>
        </View>

        <View style={[styles.card, { backgroundColor: colors.blueSoft, borderColor: "transparent" }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
            <Text style={{ fontSize: 13, color: colors.blueInk }}>Est. monthly bill</Text>
            <Text style={{ fontSize: 15, fontWeight: "700", color: colors.blueInk }}>
              ₹{((milkQty * 48 + 40) * 30).toLocaleString("en-IN")}
            </Text>
          </View>
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
  card: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 16, padding: 15, marginBottom: 13 },
  subRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: colors.border },
  subLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  subName: { fontSize: 13.5, fontWeight: "600", color: colors.ink },
  subMeta: { fontSize: 11.5, color: colors.muted, marginTop: 1 },
  stepper: { flexDirection: "row", alignItems: "center", gap: 10 },
  stepBtn: { width: 30, height: 30, borderRadius: 9, borderWidth: 1, borderColor: colors.border2, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  stepBtnText: { fontSize: 17, color: colors.ink, lineHeight: 22 },
  stepQty: { fontSize: 15, fontWeight: "700", minWidth: 40, textAlign: "center" },
  sectionTitle: { fontSize: 14, fontWeight: "600", color: colors.ink, marginBottom: 10 },
  ctrlRow: { flexDirection: "row", gap: 8 },
  ctrlBtn: { flex: 1, borderWidth: 1, borderColor: colors.border2, borderRadius: 11, height: 42, alignItems: "center", justifyContent: "center", backgroundColor: colors.surface },
  ctrlBtnText: { fontSize: 12.5, fontWeight: "600", color: colors.ink },
});
