import { View, StyleSheet, SafeAreaView } from 'react-native';
import { CampusMapView } from './src/features/campusMap/CampusMapView';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <CampusMapView markers={[]} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
});
