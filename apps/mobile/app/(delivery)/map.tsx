import { View, Text, StyleSheet, SafeAreaView } from "react-native";
import { colors } from "@/lib/theme";

export default function MapScreen() {
  return (
    <SafeAreaView style={styles.root}>
      <View style={styles.content}>
        <Text style={styles.icon}>🗺️</Text>
        <Text style={styles.title}>Live Map</Text>
        <Text style={styles.sub}>
          Integrate Google Maps SDK here.{"\n"}Use expo-location for real-time GPS tracking.
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { flex: 1, alignItems: "center", justifyContent: "center", padding: 24 },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: "700", color: colors.ink, marginBottom: 8 },
  sub: { fontSize: 14, color: colors.muted, textAlign: "center", lineHeight: 22 },
});
