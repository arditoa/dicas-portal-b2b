import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import MapView, { Callout, Marker } from "react-native-maps";
import { Venue } from "../lib/types";

interface Props {
  venues: Venue[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
}

export default function VenueMapView({
  venues,
  initialRegion = {
    latitude: -23.5583,
    longitude: -46.6565,
    latitudeDelta: 0.06,
    longitudeDelta: 0.06,
  },
}: Props) {
  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={initialRegion}>
        {venues
          .filter((v) => v.lat !== null && v.lng !== null)
          .map((venue) => (
            <Marker
              key={venue.id}
              coordinate={{ latitude: venue.lat!, longitude: venue.lng! }}
            >
              <View style={styles.markerPin}>
                <Text style={styles.markerEmoji}>{venue.emoji || "📍"}</Text>
              </View>
              <Callout onPress={() => router.push(`/business/${venue.id}`)}>
                <View style={styles.callout}>
                  <Text style={styles.calloutTitle}>{venue.name}</Text>
                  <Text style={styles.calloutSub}>
                    {venue.specialty || venue.category} • {venue.neighborhood}
                  </Text>
                  <Text style={styles.calloutAction}>Ver Detalhes →</Text>
                </View>
              </Callout>
            </Marker>
          ))}
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, borderRadius: 16, overflow: "hidden", marginBottom: 10 },
  map: { width: "100%", height: "100%" },
  markerPin: {
    backgroundColor: "#FFF",
    padding: 6,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "#007AFF",
    shadowColor: "#000",
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  markerEmoji: { fontSize: 18 },
  callout: { padding: 8, minWidth: 140 },
  calloutTitle: { fontWeight: "bold", fontSize: 14, color: "#111827" },
  calloutSub: { fontSize: 12, color: "#6B7280", marginVertical: 2 },
  calloutAction: { fontSize: 12, color: "#007AFF", fontWeight: "600", marginTop: 4 },
});
