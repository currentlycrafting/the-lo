import { useMemo } from 'react';
import { SafeAreaView, StyleSheet } from 'react-native';
import { WebView } from 'react-native-webview';
import { CAMPUS_MAP_CONFIG } from './mapConfig.js';
import { createMapHtml } from './web/createMapHtml.js';

export type MapMarker = {
  id?: string;
  lat: number;
  lng: number;
  name: string;
  address: string;
  notes?: string;
  size?: 'small' | 'medium' | 'large';
};

type Props = { markers?: MapMarker[] };

export function CampusMapView({ markers = [] }: Props) {
  const mapHtml = useMemo(() => {
    const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY ?? '';
    return createMapHtml({ ...CAMPUS_MAP_CONFIG, apiKey }, markers);
  }, [markers]);

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        source={{ html: mapHtml }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        style={styles.webview}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  webview: {
    flex: 1,
  },
});
