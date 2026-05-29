import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { colors } from "@/lib/theme";

export default function DoneScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.checkCircle}>
          <Text style={styles.checkIcon}>✓</Text>
        </View>
        <Text style={styles.title}>Delivered &amp; synced</Text>
        <Text style={styles.sub}>
          Customer notified · payment recorded · admin collections updated in real time.
        </Text>
        <TouchableOpacity style={styles.nextBtn} onPress={() => router.replace("/(delivery)/route" as any)}>
          <Text style={styles.nextBtnText}>Next stop →</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  checkCircle: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.greenSoft, alignItems: "center", justifyContent: "center", marginBottom: 20 },
  checkIcon: { fontSize: 48, color: colors.green },
  title: { fontSize: 22, fontWeight: "700", color: colors.ink, marginBottom: 10, textAlign: "center" },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", maxWidth: 260, lineHeight: 21 },
  nextBtn: { marginTop: 28, backgroundColor: colors.blue, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 36 },
  nextBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
});
