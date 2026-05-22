import { Link } from "expo-router";
import { View, Text } from "react-native";

export default function NotFound() {
  return (
    <View style={{ flex: 1, backgroundColor: "#000", justifyContent: "center", alignItems: "center", gap: 12 }}>
      <Text style={{ color: "#fff", fontSize: 18, fontWeight: "600" }}>
        Page not found
      </Text>
      <Link href="/">
        <Text style={{ color: "#ff2a3b", fontSize: 14 }}>Go home</Text>
      </Link>
    </View>
  );
}
