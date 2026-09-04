import { router } from "expo-router";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { Venue } from "../lib/types";

interface Props {
  venues: Venue[];
}

export default function VenueMapView({ venues }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.webHeader}>
        <Text style={styles.webHeaderTitle}>🗺️ Visualização em Mapa (Web)</Text>
        <Text style={styles.webHeaderSub}>
          Locais mapeados com coordenadas GPS:
        </Text>
      </View>
      <View style={styles.pinGrid}>
        {venues
          .filter((v) => v.lat !== null && v.lng !== null)
          .map((venue) => (
            <TouchableOpacity
              key={venue.id}
              style={styles.venueCard}
              onPress={() => router.push(`/business/${venue.id}`)}
            >
              <Text style={styles.emoji}>{venue.emoji || "📍"}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.name}>{venue.name}</Text>
                <Text style={styles.sub}>
                  {venue.neighborhood || "São Paulo"} • {venue.category}
                </Text>
              </View>
              <Text style={styles.link}>Ver no mapa →</Text>
            </TouchableOpacity>
          ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 14, backgroundColor: "#EFF6FF", borderRadius: 16, marginBottom: 12 },
  webHeader: { marginBottom: 12 },
  webHeaderTitle: { fontSize: 16, fontWeight: "bold", color: "#1E40AF" },
  webHeaderSub: { fontSize: 13, color: "#1E3A8A", marginTop: 2 },
  pinGrid: { gap: 8 },
  venueCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    padding: 12,
    borderRadius: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: "#DBEAFE",
  },
  emoji: { fontSize: 22 },
  name: { fontWeight: "bold", fontSize: 15, color: "#1E293B" },
  sub: { fontSize: 12, color: "#64748B", marginTop: 2 },
  link: { fontSize: 13, color: "#2563EB", fontWeight: "600" },
});
