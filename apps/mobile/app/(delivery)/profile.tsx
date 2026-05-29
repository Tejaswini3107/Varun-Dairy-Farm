import { View, Text, TouchableOpacity, StyleSheet, SafeAreaView } from "react-native";
import { router } from "expo-router";
import { colors } from "@/lib/theme";
import { useAuthStore } from "@/store";

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();

  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{user?.name?.slice(0, 2).toUpperCase() ?? "SK"}</Text>
        </View>
        <Text style={styles.name}>{user?.name ?? "Delivery Agent"}</Text>
        <Text style={styles.phone}>{user?.phone ?? "—"}</Text>

        <TouchableOpacity
          style={styles.logoutBtn}
          onPress={async () => { await logout(); router.replace("/(auth)/login" as any); }}
        >
          <Text style={styles.logoutText}>Sign out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.blueSoft, alignItems: "center", justifyContent: "center", marginBottom: 14 },
  avatarText: { fontSize: 26, fontWeight: "700", color: colors.blueInk },
  name: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 4 },
  phone: { fontSize: 14, color: colors.muted, marginBottom: 28 },
  logoutBtn: { backgroundColor: colors.redSoft, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  logoutText: { color: colors.redInk, fontSize: 14, fontWeight: "600" },
});
