import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  ScrollView,
  TextInput,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { SafeAreaView } from 'react-native-safe-area-context';

// API Endpoint
const FERRIES_URL = 'http://192.168.100.8:3000/api/ferries';

const FerriesScreen = () => {
  const [ferries, setFerries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('');

  const fetchFerries = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) return Alert.alert('Error', 'No token found. Please login again.');
      const response = await axios.get(FERRIES_URL, { headers: { Authorization: `Bearer ${token}` } });
      setFerries(response.data.ferries || []);
    } catch (error) {
      console.error('Error fetching ferries:', error.message);
      Alert.alert('Error', 'Failed to fetch ferries.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFerries();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchFerries().then(() => setRefreshing(false));
  }, []);

  const addFerry = async () => {
    if (!name || !capacity) return Alert.alert('Error', 'Please enter all fields.');
    try {
      setAdding(true);
      const token = await AsyncStorage.getItem('staffToken');
      await axios.post(
        FERRIES_URL,
        { name, capacity: Number(capacity) },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', 'Ferry added successfully!');
      setName('');
      setCapacity('');
      fetchFerries();
    } catch (error) {
      console.error('Error adding ferry:', error.message);
      Alert.alert('Error', 'Failed to add ferry. It might already exist.');
    } finally {
      setAdding(false);
    }
  };

  const renderFerry = ({ item, index }) => (
    <View style={[styles.row, index % 2 === 0 ? styles.evenRow : styles.oddRow]}>
      <Text style={[styles.cell, { flex: 1 }]}>{index + 1}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{item.name}</Text>
      <Text style={[styles.cell, { flex: 2 }]}>{item.capacity}</Text>
      <Text style={[styles.cell, { flex: 3 }]}>{item.status}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Add Ferry Form */}
      <View style={styles.addForm}>
        <Text style={styles.formTitle}>Add New Ferry</Text>
        <TextInput
          placeholder="Ferry Name"
          style={styles.input}
          value={name}
          onChangeText={setName}
        />
        <TextInput
          placeholder="Capacity"
          style={styles.input}
          value={capacity}
          onChangeText={setCapacity}
          keyboardType="numeric"
        />
        <TouchableOpacity style={styles.addButton} onPress={addFerry} disabled={adding}>
          <Text style={styles.addButtonText}>{adding ? 'Adding...' : 'Add Ferry'}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : ferries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No ferries found.</Text>
        </View>
      ) : (
        <ScrollView horizontal>
          <View>
            {/* Table Header */}
            <View style={[styles.row, styles.headerRow]}>
              <Text style={[styles.cell, { flex: 1, fontWeight: 'bold' }]}>#</Text>
              <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Name</Text>
              <Text style={[styles.cell, { flex: 2, fontWeight: 'bold' }]}>Capacity</Text>
              <Text style={[styles.cell, { flex: 3, fontWeight: 'bold' }]}>Status</Text>
            </View>

            <FlatList
              data={ferries}
              keyExtractor={(item) => item._id}
              renderItem={renderFerry}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};

export default FerriesScreen;

const styles = StyleSheet.create({
  container: { flex: 1, padding: 10, backgroundColor: '#f5f5f5' },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  addForm: { backgroundColor: '#fff', padding: 15, borderRadius: 8, marginBottom: 15, elevation: 2 },
  formTitle: { fontSize: 16, fontWeight: 'bold', marginBottom: 10 },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  addButton: {
    backgroundColor: '#28a745',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  addButtonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  row: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 5,
    borderBottomWidth: 1,
    borderColor: '#ddd',
    alignItems: 'center',
  },
  headerRow: { backgroundColor: '#007bff' },
  cell: { paddingHorizontal: 5, color: '#000' },
  evenRow: { backgroundColor: '#fff' },
  oddRow: { backgroundColor: '#f0f0f0' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888' },
});
