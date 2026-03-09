import { SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { WebView } from "react-native-webview";

type HomeScreenProps = {
  onSignOut: () => void;
  googleMapsApiKey: string;
};

const CAMPUS_CENTER_LATITUDE = 44.9802;
const CAMPUS_CENTER_LONGITUDE = -93.2362;
const CAMPUS_RADIUS_METERS = 2000;
const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 17;
const MAP_INITIAL_ZOOM = 14;

function buildMapHtml(googleMapsApiKey: string): string {
  return `
<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
    <style>
      html, body, #map { height: 100%; margin: 0; padding: 0; background: #050505; }
    </style>
    <script src="https://maps.googleapis.com/maps/api/js?key=${googleMapsApiKey}"></script>
    <script>
      function initializeMap() {
        const center = { lat: ${CAMPUS_CENTER_LATITUDE}, lng: ${CAMPUS_CENTER_LONGITUDE} };
        const radiusMeters = ${CAMPUS_RADIUS_METERS};
        const latitudeDelta = radiusMeters / 111320;
        const longitudeDelta = radiusMeters / (111320 * Math.cos(center.lat * Math.PI / 180));
        const allowedBounds = {
          north: center.lat + latitudeDelta,
          south: center.lat - latitudeDelta,
          east: center.lng + longitudeDelta,
          west: center.lng - longitudeDelta
        };

        const map = new google.maps.Map(document.getElementById("map"), {
          center: center,
          zoom: ${MAP_INITIAL_ZOOM},
          minZoom: ${MAP_MIN_ZOOM},
          maxZoom: ${MAP_MAX_ZOOM},
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          styles: [
            { elementType: "geometry", stylers: [{ color: "#121316" }] },
            { elementType: "labels.text.fill", stylers: [{ color: "#8d939b" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#121316" }] },
            { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2b2f36" }] },
            { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#15171c" }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "geometry", stylers: [{ color: "#2a2f36" }] },
            { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#1d2128" }] },
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b0d11" }] }
          ],
          restriction: { latLngBounds: allowedBounds, strictBounds: true }
        });

        new google.maps.Marker({
          position: center,
          map: map,
          title: "Dinkytown Center"
        });

        new google.maps.Rectangle({
          bounds: allowedBounds,
          strokeColor: "#ffffff",
          strokeOpacity: 0.2,
          strokeWeight: 1,
          fillOpacity: 0,
          clickable: false,
          map: map
        });
      }
      window.onload = initializeMap;
    </script>
  </head>
  <body>
    <div id="map"></div>
  </body>
</html>
`;
}

export function HomeScreen({ onSignOut, googleMapsApiKey }: HomeScreenProps) {
  const mapHtml = buildMapHtml(googleMapsApiKey);

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.wordmark}>THE LO</Text>
        <TouchableOpacity onPress={onSignOut} style={styles.headerButton}>
          <Text style={styles.headerButtonText}>SIGN OUT</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.mapContainer}>
        <WebView source={{ html: mapHtml }} originWhitelist={["*"]} javaScriptEnabled domStorageEnabled />
      </View>

      <View style={styles.sheet}>
        <Text style={styles.sectionLabel}>LIVE SIGNALS</Text>
        <ScrollView showsVerticalScrollIndicator={false}>
          {[
            { title: "Coffman Union", meta: "0.4 MI :: ACTIVE" },
            { title: "Dinkytown", meta: "0.8 MI :: BUILDING" },
            { title: "Stadium Village", meta: "1.1 MI :: WATCH" },
          ].map((item) => (
            <View key={item.title} style={styles.card}>
              <Text style={styles.cardTitle}>{item.title.toUpperCase()}</Text>
              <Text style={styles.cardMeta}>{item.meta}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#050505",
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    color: "#ffffff",
    fontSize: 30,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  headerButton: {
    backgroundColor: "black",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  headerButtonText: {
    color: "white",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  mapContainer: {
    flex: 1,
    backgroundColor: "#020202",
  },
  sheet: {
    height: 240,
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  sectionLabel: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#161616",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    padding: 14,
    marginBottom: 10,
  },
  cardTitle: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  cardMeta: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.8,
  },
});
