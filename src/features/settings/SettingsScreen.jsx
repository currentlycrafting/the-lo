import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

const GOOGLE_GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';
const SIZES = ['small', 'medium', 'large'];

async function geocodeAddress(address, apiKey) {
  const res = await fetch(
    `${GOOGLE_GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${apiKey}`
  );
  const data = await res.json();
  if (data.status !== 'OK' || !data.results || !data.results.length) {
    throw new Error(data.error_message || 'Address not found');
  }
  const loc = data.results[0].geometry.location;
  const formattedAddress = data.results[0].formatted_address || address;
  return { lat: loc.lat, lng: loc.lng, formattedAddress };
}

function MarkerForm({
  name,
  setName,
  address,
  setAddress,
  notes,
  setNotes,
  size,
  setSize,
  loading,
  submitLabel,
  onSubmit,
  onCancel,
}) {
  return (
    <View style={styles.formBlock}>
      <Text style={styles.label}>Name</Text>
      <TextInput
        style={styles.input}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Coffee shop"
        placeholderTextColor="#666"
        editable={!loading}
      />
      <Text style={styles.label}>Address</Text>
      <TextInput
        style={styles.input}
        value={address}
        onChangeText={setAddress}
        placeholder="e.g. 123 Church St SE, Minneapolis, MN"
        placeholderTextColor="#666"
        editable={!loading}
      />
      <Text style={styles.label}>Notes (optional)</Text>
      <TextInput
        style={[styles.input, styles.inputMultiline]}
        value={notes}
        onChangeText={setNotes}
        placeholder="Any extra details"
        placeholderTextColor="#666"
        multiline
        numberOfLines={2}
        editable={!loading}
      />
      <Text style={styles.label}>Dot size</Text>
      <View style={styles.sizeRow}>
        {SIZES.map((s) => (
          <TouchableOpacity
            key={s}
            style={[styles.sizeChip, size === s && styles.sizeChipActive]}
            onPress={() => setSize(s)}
            disabled={loading}
          >
            <Text style={[styles.sizeChipText, size === s && styles.sizeChipTextActive]}>{s}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.formButtons}>
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={loading}
        >
          {loading ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.buttonText}>{submitLabel}</Text>}
        </TouchableOpacity>
        {onCancel && (
          <TouchableOpacity style={styles.cancelButton} onPress={onCancel} disabled={loading}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function SettingsScreen({ markers = [], onAddMarker, onUpdateMarker, onDeleteMarker, onOpenMap }) {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [size, setSize] = useState('medium');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || '';

  const resetForm = () => {
    setName('');
    setAddress('');
    setNotes('');
    setSize('medium');
    setEditingId(null);
  };

  const startEdit = (m) => {
    setName(m.name);
    setAddress(m.address);
    setNotes(m.notes || '');
    setSize(m.size || 'medium');
    setEditingId(m.id);
  };

  const handleAddMarker = async () => {
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a name for the place.');
      return;
    }
    if (!trimmedAddress) {
      Alert.alert('Missing address', 'Please enter an address to place the marker.');
      return;
    }
    if (!apiKey) {
      Alert.alert('Config error', 'Google Maps API key is not set. Check your .env file.');
      return;
    }
    setLoading(true);
    try {
      const { lat, lng, formattedAddress } = await geocodeAddress(trimmedAddress, apiKey);
      onAddMarker({
        id: Date.now().toString(),
        lat,
        lng,
        name: trimmedName,
        address: formattedAddress,
        notes: notes.trim() || undefined,
        size,
      });
      resetForm();
      Alert.alert('Marker added', 'Opening the map.', [{ text: 'OK', onPress: onOpenMap }]);
    } catch (e) {
      Alert.alert('Geocoding failed', e.message || 'Could not find that address.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateMarker = async () => {
    if (!editingId) return;
    const trimmedName = name.trim();
    const trimmedAddress = address.trim();
    if (!trimmedName) {
      Alert.alert('Missing name', 'Please enter a name.');
      return;
    }
    if (!trimmedAddress) {
      Alert.alert('Missing address', 'Please enter an address.');
      return;
    }
    setLoading(true);
    try {
      const { lat, lng, formattedAddress } = await geocodeAddress(trimmedAddress, apiKey);
      onUpdateMarker(editingId, {
        lat,
        lng,
        name: trimmedName,
        address: formattedAddress,
        notes: notes.trim() || undefined,
        size,
      });
      resetForm();
      Alert.alert('Saved', 'Marker updated.');
    } catch (e) {
      Alert.alert('Geocoding failed', e.message || 'Could not find that address.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMarker = (id, markerName) => {
    Alert.alert('Delete marker', `Delete "${markerName}"?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => onDeleteMarker(id) },
    ]);
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Placed markers</Text>
        <Text style={styles.hint}>Add, edit, or delete markers. Change dot size in the form.</Text>

        {editingId ? (
          <>
            <Text style={styles.sectionTitle}>Edit marker</Text>
            <MarkerForm
              name={name}
              setName={setName}
              address={address}
              setAddress={setAddress}
              notes={notes}
              setNotes={setNotes}
              size={size}
              setSize={setSize}
              loading={loading}
              submitLabel="Save changes"
              onSubmit={handleUpdateMarker}
              onCancel={resetForm}
            />
          </>
        ) : (
          <>
            <Text style={styles.sectionTitle}>Add new marker</Text>
            <MarkerForm
              name={name}
              setName={setName}
              address={address}
              setAddress={setAddress}
              notes={notes}
              setNotes={setNotes}
              size={size}
              setSize={setSize}
              loading={loading}
              submitLabel="Add marker to map"
              onSubmit={handleAddMarker}
            />
          </>
        )}

        <Text style={[styles.sectionTitle, { marginTop: 28 }]}>Your markers</Text>
        {markers.length === 0 ? (
          <Text style={styles.emptyText}>No markers yet. Add one above.</Text>
        ) : (
          markers.map((m) => (
            <View key={m.id} style={styles.markerRow}>
              <TouchableOpacity style={styles.markerInfo} onPress={() => startEdit(m)}>
                <Text style={styles.markerName} numberOfLines={1}>{m.name}</Text>
                <Text style={styles.markerAddress} numberOfLines={1}>{m.address}</Text>
                <View style={styles.markerMeta}>
                  <View style={[styles.sizeBadge, m.size === 'large' && styles.sizeBadgeLarge, m.size === 'small' && styles.sizeBadgeSmall]}>
                    <Text style={styles.sizeBadgeText}>{m.size || 'medium'}</Text>
                  </View>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={styles.editBtn} onPress={() => startEdit(m)}>
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteBtn}
                onPress={() => handleDeleteMarker(m.id, m.name)}
              >
                <Text style={styles.deleteBtnText}>Delete</Text>
              </TouchableOpacity>
            </View>
          ))
        )}

        <TouchableOpacity style={styles.linkButton} onPress={onOpenMap}>
          <Text style={styles.linkText}>Open map</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f1116',
  },
  scroll: {
    padding: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#fff',
    marginBottom: 6,
  },
  hint: {
    fontSize: 14,
    color: '#8a99ad',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#8a99ad',
    marginBottom: 10,
  },
  formBlock: {
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6a7a8d',
    marginBottom: 4,
  },
  input: {
    backgroundColor: '#1a1f2a',
    borderRadius: 10,
    padding: 12,
    fontSize: 16,
    color: '#fff',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#273142',
  },
  inputMultiline: {
    minHeight: 60,
    textAlignVertical: 'top',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  sizeChip: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: '#1a1f2a',
    borderWidth: 1,
    borderColor: '#273142',
  },
  sizeChipActive: {
    borderColor: '#8a99ad',
    backgroundColor: '#273142',
  },
  sizeChipText: {
    color: '#6a7a8d',
    fontSize: 14,
    fontWeight: '600',
  },
  sizeChipTextActive: {
    color: '#fff',
  },
  formButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  button: {
    backgroundColor: '#273142',
    padding: 14,
    borderRadius: 10,
    minWidth: 140,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  cancelButton: {
    padding: 14,
  },
  cancelButtonText: {
    color: '#8a99ad',
    fontSize: 15,
  },
  emptyText: {
    color: '#6a7a8d',
    fontSize: 14,
    marginBottom: 16,
  },
  markerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1a1f2a',
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#273142',
  },
  markerInfo: {
    flex: 1,
    minWidth: 0,
  },
  markerName: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  markerAddress: {
    color: '#8a99ad',
    fontSize: 13,
    marginBottom: 4,
  },
  markerMeta: {
    flexDirection: 'row',
  },
  sizeBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: '#273142',
  },
  sizeBadgeSmall: { backgroundColor: '#1d2533' },
  sizeBadgeLarge: { backgroundColor: '#3a4250' },
  sizeBadgeText: {
    color: '#8a99ad',
    fontSize: 11,
    fontWeight: '600',
  },
  editBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginRight: 4,
  },
  editBtnText: {
    color: '#8a99ad',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  deleteBtnText: {
    color: '#c94a4a',
    fontSize: 14,
    fontWeight: '600',
  },
  linkButton: {
    marginTop: 24,
    alignItems: 'center',
  },
  linkText: {
    color: '#8a99ad',
    fontSize: 15,
  },
});
