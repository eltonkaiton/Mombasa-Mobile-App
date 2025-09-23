// InventoryScreen.jsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { SafeAreaView } from "react-native-safe-area-context";
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';

// ✅ API URLs
const DELIVERIES_URL = 'http://192.168.100.8:3000/api/inventory/deliveries';

export default function InventoryScreen({ navigation }) {
  const [deliveries, setDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchText, setSearchText] = useState('');

  // ===========================
  // Axios instance with token
  // ===========================
  const axiosAuth = async () => {
    const token = await AsyncStorage.getItem('token');
    return axios.create({
      headers: { Authorization: `Bearer ${token}` },
    });
  };

  // ===========================
  // Fetch deliveries
  // ===========================
  const fetchDeliveries = async () => {
    try {
      const api = await axiosAuth();
      const res = await api.get(DELIVERIES_URL);
      const data = Array.isArray(res.data) ? res.data : [];
      setDeliveries(data);
    } catch (err) {
      console.error('Failed to load deliveries:', err);
      Alert.alert('Error', 'Failed to load deliveries.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.reset({ index: 0, routes: [{ name: 'Login' }] });
  };

  // ===========================
  // Group deliveries by item
  // ===========================
  const groupDeliveries = () => {
    const grouped = {};
    deliveries.forEach((d) => {
      if (!d?.item_id) return;
      const key = d.item_id.item_name;
      if (!grouped[key]) {
        grouped[key] = {
          item: d.item_id,
          deliveries: [],
          total: 0,
        };
      }
      grouped[key].deliveries.push(d);
      grouped[key].total += d.quantity ?? 0;
    });

    // filter by search text
    const filtered = Object.values(grouped).filter((g) =>
      g.item.item_name.toLowerCase().includes(searchText.toLowerCase())
    );

    return filtered;
  };

  // ===========================
  // Render grouped deliveries
  // ===========================
  const renderDeliveryGroup = ({ item }) => {
    return (
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.itemName}>{item.item.item_name}</Text>
          <Text style={styles.totalText}>Total: {item.total} {item.item.unit}</Text>
        </View>
        {item.deliveries.map((d) => (
          <View key={d._id} style={styles.deliveryRow}>
            <Text style={styles.deliveryText}>
              • {d.quantity} {item.item.unit} from {d.supplier_id?.name || 'Unknown'}
            </Text>
            <Text style={styles.deliveryDate}>
              {new Date(d.createdAt).toLocaleDateString()}
            </Text>
          </View>
        ))}
      </View>
    );
  };

  if (loading) return <ActivityIndicator size="large" style={{ marginTop: 30 }} />;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={styles.header}>🚚 Deliveries Dashboard</Text>
        <View style={{ flexDirection: 'row' }}>
          {/* Chat */}
          <TouchableOpacity
            onPress={() => navigation.navigate('InventoryChat')}
            style={[styles.logoutButton, { marginRight: 10, backgroundColor: '#28a745' }]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={24} color="#fff" />
          </TouchableOpacity>

          {/* Logout */}
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Ionicons name="log-out-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Navigation */}
      <View style={styles.navRow}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('UploadInventory')}
        >
          <Ionicons name="add-circle-outline" size={24} color="#0077b6" />
          <Text style={styles.navButtonText}>Upload</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.navigate('StockDeliveries')}
        >
          <Ionicons name="cube-outline" size={24} color="#0077b6" />
          <Text style={styles.navButtonText}>Deliveries</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <TextInput
        placeholder="🔍 Search Deliveries"
        value={searchText}
        onChangeText={setSearchText}
        style={styles.searchInput}
      />

      {/* Deliveries List */}
      <FlatList
        data={groupDeliveries()}
        keyExtractor={(item, index) => item.item._id || `group-${index}`}
        renderItem={renderDeliveryGroup}
        contentContainerStyle={{ paddingBottom: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 30 }}>
            No deliveries found.
          </Text>
        }
      />
    </SafeAreaView>
  );
}

// ===========================
// Styles
// ===========================
const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, backgroundColor: '#f5faff' },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
  },
  header: { fontSize: 22, fontWeight: 'bold', color: '#0077b6' },
  logoutButton: {
    backgroundColor: '#0077b6',
    padding: 8,
    borderRadius: 20,
  },
  navRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e0f7fa',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 8,
  },
  navButtonText: {
    marginLeft: 6,
    fontSize: 15,
    color: '#0077b6',
    fontWeight: '500',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 10,
    marginBottom: 12,
    backgroundColor: '#fff',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 6,
    borderLeftColor: '#0077b6',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  itemName: { fontSize: 18, fontWeight: 'bold', color: '#023e8a' },
  totalText: { fontSize: 14, fontWeight: '600', color: '#0077b6' },
  deliveryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#f0f9ff',
    padding: 6,
    borderRadius: 6,
    marginBottom: 4,
  },
  deliveryText: { fontSize: 14, color: '#333' },
  deliveryDate: { fontSize: 12, color: '#666' },
});
