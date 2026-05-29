import { Redirect } from "expo-router";
import { useAuthStore } from "@/store";

export default function Index() {
  const { user } = useAuthStore();

  if (!user) return <Redirect href="/(auth)/login" />;
  if (user.role === "delivery_staff") return <Redirect href="/(delivery)/route" />;
  return <Redirect href="/(customer)/home" />;
}
