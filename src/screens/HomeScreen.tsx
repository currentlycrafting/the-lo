import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

type HomeScreenProps = {
  onSignOut: () => void;
  googleMapsApiKey: string;
};

type LiveMarker = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
};

const CAMPUS_CENTER_LATITUDE = 44.9802;
const CAMPUS_CENTER_LONGITUDE = -93.2362;
const CAMPUS_RADIUS_METERS = 2000;
const SEARCH_RADIUS_MILES = 3;
const SEARCH_RADIUS_METERS = SEARCH_RADIUS_MILES * 1609.34;
const MAP_MIN_ZOOM = 13;
const MAP_MAX_ZOOM = 17;
const MAP_INITIAL_ZOOM = 14;

type PlaceSearchCandidate = {
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  distanceMeters: number;
  score: number;
};

type PlaceSuggestion = {
  name: string;
  address: string;
  lat: number;
  lng: number;
};

function getDistanceMeters(
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number
): number {
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(toLat - fromLat);
  const dLng = toRadians(toLng - fromLng);
  const lat1 = toRadians(fromLat);
  const lat2 = toRadians(toLat);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1) * Math.cos(lat2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function scorePlaceMatch(queryText: string, candidate: Omit<PlaceSearchCandidate, "score">): number {
  const normalizedQuery = normalizeSearchText(queryText);
  const normalizedName = normalizeSearchText(candidate.name);

  let score = 0;

  if (normalizedName === normalizedQuery) score += 100;
  else if (normalizedName.startsWith(normalizedQuery)) score += 65;
  else if (normalizedName.includes(normalizedQuery)) score += 35;

  const relevantTypes = ["university", "school", "premise", "point_of_interest", "establishment"];
  if (candidate.types.some((type) => relevantTypes.includes(type))) score += 20;

  // Closer matches score higher.
  score += Math.max(0, 40 - candidate.distanceMeters / 100);

  return score;
}

async function searchLocalPlace(
  queryText: string,
  googleMapsApiKey: string
): Promise<PlaceSearchCandidate[]> {
  const endpoint =
    "https://maps.googleapis.com/maps/api/place/textsearch/json?" +
    `query=${encodeURIComponent(queryText)}&` +
    `location=${CAMPUS_CENTER_LATITUDE},${CAMPUS_CENTER_LONGITUDE}&` +
    `radius=${Math.round(SEARCH_RADIUS_METERS)}&` +
    `key=${encodeURIComponent(googleMapsApiKey)}`;

  const response = await fetch(endpoint);
  const data = await response.json();
  const results = Array.isArray(data?.results) ? data.results : [];

  const localCandidates = results
    .map((result: any) => {
      const lat = result?.geometry?.location?.lat;
      const lng = result?.geometry?.location?.lng;
      if (typeof lat !== "number" || typeof lng !== "number") return null;

      const distanceMeters = getDistanceMeters(
        CAMPUS_CENTER_LATITUDE,
        CAMPUS_CENTER_LONGITUDE,
        lat,
        lng
      );

      return {
        name: result?.name || "UNTITLED",
        address: result?.formatted_address || "Address unavailable",
        lat,
        lng,
        types: Array.isArray(result?.types) ? result.types : [],
        distanceMeters
      };
    })
    .filter((candidate: any) => candidate && candidate.distanceMeters <= SEARCH_RADIUS_METERS)
    .map((candidate: Omit<PlaceSearchCandidate, "score">) => ({
      ...candidate,
      score: scorePlaceMatch(queryText, candidate)
    }))
    .sort((a: PlaceSearchCandidate, b: PlaceSearchCandidate) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.distanceMeters - b.distanceMeters;
    });

  return localCandidates;
}

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
        const geocoder = new google.maps.Geocoder();
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

        function postToApp(type, payload) {
          if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
            window.ReactNativeWebView.postMessage(
              JSON.stringify({
                type: type,
                payload: payload
              })
            );
          }
        }

        function postMarkerToApp(marker) {
          postToApp("marker_added", marker);
        }

        function addUserMarker(markerData, shouldPost) {
          new google.maps.Marker({
            position: { lat: markerData.lat, lng: markerData.lng },
            map: map,
            title: markerData.name
          });
          if (shouldPost !== false) {
            postMarkerToApp(markerData);
          }
        }

        window.addMarkerFromNative = function(markerData) {
          addUserMarker(markerData, false);
        };

        map.addListener("click", function(event) {
          const lat = event.latLng.lat();
          const lng = event.latLng.lng();

          geocoder.geocode({ location: { lat: lat, lng: lng } }, function(results, status) {
            let address = "Address unavailable";
            if (status === "OK" && results && results.length > 0) {
              address = results[0].formatted_address;
            }

            postToApp("map_tapped_candidate", {
              lat: lat,
              lng: lng,
              address: address
            });
          });
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
  const [liveMarkers, setLiveMarkers] = useState<LiveMarker[]>([]);
  const [newMarkerName, setNewMarkerName] = useState("");
  const [newMarkerAddress, setNewMarkerAddress] = useState("");
  const [isAddingMarker, setIsAddingMarker] = useState(false);
  const [isMapFullScreen, setIsMapFullScreen] = useState(false);
  const [localSearchMessage, setLocalSearchMessage] = useState("");
  const [didYouMeanSuggestions, setDidYouMeanSuggestions] = useState<PlaceSuggestion[]>([]);
  const [tapMarkerNameInput, setTapMarkerNameInput] = useState("");
  const [pendingMapTapMarker, setPendingMapTapMarker] = useState<{
    lat: number;
    lng: number;
    address: string;
  } | null>(null);
  const mapWebViewRef = useRef<WebView>(null);
  const mapHtml = buildMapHtml(googleMapsApiKey);

  const handleOpenMarkerAddress = useCallback(async (marker: LiveMarker) => {
    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${marker.lat},${marker.lng}`;
    await Linking.openURL(mapsUrl);
  }, []);

  const handleMapMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data);
      if (message?.type === "marker_added" && message.payload) {
        const payload = message.payload as LiveMarker;
        if (!payload.id || !payload.name) return;
        setLiveMarkers((prev) => [payload, ...prev]);
        return;
      }

      if (message?.type === "map_tapped_candidate" && message.payload) {
        const payload = message.payload as { lat: number; lng: number; address: string };
        if (typeof payload.lat !== "number" || typeof payload.lng !== "number") return;
        setPendingMapTapMarker({
          lat: payload.lat,
          lng: payload.lng,
          address: payload.address || "Address unavailable"
        });
        setTapMarkerNameInput("");
      }
    } catch {
      // Ignore malformed bridge messages from the webview.
    }
  }, []);

  const addMarkerToListAndMap = useCallback((marker: LiveMarker) => {
    setLiveMarkers((prev) => [marker, ...prev]);

    const markerJson = JSON.stringify(marker)
      .replace(/\\/g, "\\\\")
      .replace(/'/g, "\\'");

    mapWebViewRef.current?.injectJavaScript(`
      if (window.addMarkerFromNative) {
        window.addMarkerFromNative(JSON.parse('${markerJson}'));
      }
      true;
    `);
  }, []);

  const handleAddMarkerFromAddress = useCallback(async () => {
    const markerName = (newMarkerName.trim() || "UNTITLED").toUpperCase();
    const queryText = newMarkerAddress.trim();
    if (!queryText || !googleMapsApiKey) return;

    setIsAddingMarker(true);
    try {
      const candidates = await searchLocalPlace(queryText, googleMapsApiKey);

      if (candidates.length === 0) {
        setDidYouMeanSuggestions([]);
        setLocalSearchMessage(
          `NO LOCAL MATCH FOUND WITHIN ${SEARCH_RADIUS_MILES} MILES.`
        );
        return;
      }

      const best = candidates[0];
      const alternatives = candidates.slice(1, 3).map((candidate) => ({
        name: candidate.name,
        address: candidate.address,
        lat: candidate.lat,
        lng: candidate.lng
      }));
      setDidYouMeanSuggestions(alternatives);
      setLocalSearchMessage(
        alternatives.length > 0 ? "LOCAL MATCH FOUND. SEE ALTERNATIVES BELOW." : "LOCAL MATCH FOUND."
      );

      const marker: LiveMarker = {
        id: `marker_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
        name: markerName,
        address: best.address,
        lat: best.lat,
        lng: best.lng
      };
      addMarkerToListAndMap(marker);

      setNewMarkerName("");
      setNewMarkerAddress("");
      Alert.alert("Marker Added", `${marker.name} added near Dinkytown.`);
    } finally {
      setIsAddingMarker(false);
    }
  }, [addMarkerToListAndMap, googleMapsApiKey, newMarkerAddress, newMarkerName]);

  const handleSuggestionPress = useCallback((suggestion: PlaceSuggestion) => {
    const markerName = (newMarkerName.trim() || suggestion.name || "UNTITLED").toUpperCase();
    const marker: LiveMarker = {
      id: `marker_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: markerName,
      address: suggestion.address,
      lat: suggestion.lat,
      lng: suggestion.lng
    };

    addMarkerToListAndMap(marker);
    setDidYouMeanSuggestions([]);
    setLocalSearchMessage("ADDED SUGGESTED LOCAL MATCH.");
    setNewMarkerName("");
    setNewMarkerAddress("");
  }, [addMarkerToListAndMap, newMarkerName]);

  const handleCancelTapMarkerModal = useCallback(() => {
    setPendingMapTapMarker(null);
    setTapMarkerNameInput("");
  }, []);

  const handleConfirmTapMarkerModal = useCallback(() => {
    if (!pendingMapTapMarker) return;

    const marker: LiveMarker = {
      id: `marker_${Date.now()}_${Math.floor(Math.random() * 100000)}`,
      name: (tapMarkerNameInput.trim() || "UNTITLED").toUpperCase(),
      address: pendingMapTapMarker.address,
      lat: pendingMapTapMarker.lat,
      lng: pendingMapTapMarker.lng
    };

    addMarkerToListAndMap(marker);
    handleCancelTapMarkerModal();
  }, [addMarkerToListAndMap, handleCancelTapMarkerModal, pendingMapTapMarker, tapMarkerNameInput]);

  return (
    <SafeAreaView style={styles.screen}>
      {!isMapFullScreen ? (
        <View style={styles.header}>
          <Text style={styles.wordmark}>THE LO</Text>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={() => setIsMapFullScreen(true)}
              style={styles.headerButton}
            >
              <Text style={styles.headerButtonText}>FULL MAP</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onSignOut} style={styles.headerButton}>
              <Text style={styles.headerButtonText}>SIGN OUT</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      <View style={[styles.mapContainer, isMapFullScreen && styles.mapContainerFullScreen]}>
        <WebView
          ref={mapWebViewRef}
          source={{ html: mapHtml }}
          originWhitelist={["*"]}
          javaScriptEnabled
          domStorageEnabled
          onMessage={handleMapMessage}
        />
        {isMapFullScreen ? (
          <TouchableOpacity
            style={styles.fullScreenExitButton}
            onPress={() => setIsMapFullScreen(false)}
          >
            <Text style={styles.fullScreenExitButtonText}>EXIT FULL MAP</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {!isMapFullScreen ? (
        <View style={styles.sheet}>
        <Text style={styles.sectionLabel}>LIVE SIGNALS</Text>
        <View style={styles.addMarkerContainer}>
          <TextInput
            value={newMarkerName}
            onChangeText={setNewMarkerName}
            style={styles.markerInput}
            placeholder="MARKER NAME"
            placeholderTextColor="#6b7280"
            autoCapitalize="characters"
          />
          <TextInput
            value={newMarkerAddress}
            onChangeText={setNewMarkerAddress}
            style={styles.markerInput}
            placeholder="PLACE OR ADDRESS (E.G. TATE HALL)"
            placeholderTextColor="#6b7280"
            autoCapitalize="none"
          />
          <TouchableOpacity
            style={[styles.addMarkerButton, (!newMarkerAddress.trim() || isAddingMarker) && styles.addMarkerButtonDisabled]}
            disabled={!newMarkerAddress.trim() || isAddingMarker}
            onPress={() => {
              void handleAddMarkerFromAddress();
            }}
          >
            {isAddingMarker ? (
              <ActivityIndicator color="#000000" />
            ) : (
              <Text style={styles.addMarkerButtonText}>ADD MARKER</Text>
            )}
          </TouchableOpacity>
          {localSearchMessage ? (
            <Text style={styles.localSearchMessage}>{localSearchMessage}</Text>
          ) : null}
          {didYouMeanSuggestions.length > 0 ? (
            <View style={styles.suggestionContainer}>
              <Text style={styles.suggestionTitle}>DID YOU MEAN:</Text>
              {didYouMeanSuggestions.map((suggestion) => (
                <TouchableOpacity
                  key={`${suggestion.name}_${suggestion.lat}_${suggestion.lng}`}
                  style={styles.suggestionButton}
                  onPress={() => {
                    handleSuggestionPress(suggestion);
                  }}
                >
                  <Text style={styles.suggestionItem}>{suggestion.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {liveMarkers.length === 0 ? (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>NO MARKERS YET</Text>
              <Text style={styles.cardMeta}>TAP THE MAP TO ADD A MARKER.</Text>
            </View>
          ) : (
            liveMarkers.map((marker) => (
              <View key={marker.id} style={styles.card}>
                <Text style={styles.cardTitle}>{marker.name.toUpperCase()}</Text>
                <TouchableOpacity
                  onPress={() => {
                    void handleOpenMarkerAddress(marker);
                  }}
                >
                  <Text style={[styles.cardMeta, styles.cardAddressLink]}>{marker.address}</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </ScrollView>
        </View>
      ) : null}

      <Modal
        transparent
        animationType="fade"
        visible={Boolean(pendingMapTapMarker)}
        onRequestClose={handleCancelTapMarkerModal}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>NAME THIS MARKER</Text>
            <Text style={styles.modalAddress} numberOfLines={2}>
              {pendingMapTapMarker?.address}
            </Text>
            <TextInput
              value={tapMarkerNameInput}
              onChangeText={setTapMarkerNameInput}
              style={styles.modalInput}
              placeholder="ENTER MARKER NAME"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
              autoFocus
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={handleCancelTapMarkerModal}
              >
                <Text style={styles.modalCancelButtonText}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalConfirmButton}
                onPress={handleConfirmTapMarkerModal}
              >
                <Text style={styles.modalConfirmButtonText}>ADD MARKER</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerActions: {
    flexDirection: "row",
    gap: 8
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
  mapContainerFullScreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0
  },
  fullScreenExitButton: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8
  },
  fullScreenExitButtonText: {
    color: "#ffffff",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  sheet: {
    height: 320,
    backgroundColor: "#0a0a0a",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.05)",
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  addMarkerContainer: {
    marginBottom: 12,
    gap: 8
  },
  markerInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    paddingHorizontal: 12,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.6
  },
  addMarkerButton: {
    height: 40,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    alignItems: "center",
    justifyContent: "center"
  },
  addMarkerButtonDisabled: {
    opacity: 0.5
  },
  addMarkerButtonText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  localSearchMessage: {
    color: "#9ca3af",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8
  },
  suggestionContainer: {
    marginTop: 2
  },
  suggestionTitle: {
    color: "#6b7280",
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.2,
    marginBottom: 2
  },
  suggestionItem: {
    color: "#e5e7eb",
    fontSize: 11,
    fontWeight: "600"
  },
  suggestionButton: {
    backgroundColor: "#161616",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 6
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
  cardAddressLink: {
    color: "white",
    textDecorationLine: "underline",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(5,5,5,0.82)",
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: "#0a0a0a",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    padding: 16
  },
  modalTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.6,
    marginBottom: 8
  },
  modalAddress: {
    color: "#6b7280",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.4,
    marginBottom: 10
  },
  modalInput: {
    height: 42,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "#1c1c1e",
    color: "#ffffff",
    paddingHorizontal: 14,
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.8
  },
  modalActions: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8
  },
  modalCancelButton: {
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "#1c1c1e",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14
  },
  modalCancelButtonText: {
    color: "#9ca3af",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
  modalConfirmButton: {
    height: 36,
    borderRadius: 999,
    backgroundColor: "#ffffff",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14
  },
  modalConfirmButtonText: {
    color: "#000000",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2
  },
});
