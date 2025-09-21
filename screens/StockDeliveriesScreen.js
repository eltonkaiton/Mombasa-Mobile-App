import React, { useEffect, useState, useCallback } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  ActivityIndicator, 
  StyleSheet, 
  RefreshControl, 
  TouchableOpacity, 
  Alert, 
  TextInput 
} from 'react-native';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as Print from 'expo-print';

const BASE_URL = 'http://192.168.100.8:3000/api/inventory';

const StockDeliveryScreen = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [filteredDeliveries, setFilteredDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [markingId, setMarkingId] = useState(null);
  const [searchText, setSearchText] = useState('');

  const fetchDeliveries = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.get(`${BASE_URL}/deliveries`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeliveries(res.data || []);
      setFilteredDeliveries(res.data || []);
    } catch (err) {
      console.error('Fetch deliveries error:', err);
      setError('Failed to fetch deliveries. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDeliveries();
  }, [fetchDeliveries]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };

  const markAsReceived = async (orderId) => {
    try {
      setMarkingId(orderId);
      const token = await AsyncStorage.getItem('token');
      const res = await axios.patch(
        `${BASE_URL}/deliveries/${orderId}/received`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state permanently
      setDeliveries(prev =>
        prev.map(item =>
          item.order_id === orderId
            ? { ...item, delivered_at: res.data.order.delivered_at, delivery_status: 'delivered' }
            : item
        )
      );

      setFilteredDeliveries(prev =>
        prev.map(item =>
          item.order_id === orderId
            ? { ...item, delivered_at: res.data.order.delivered_at, delivery_status: 'delivered' }
            : item
        )
      );

      Alert.alert('Success', 'Delivery marked as received.');
    } catch (err) {
      console.error('Mark as received error:', err);
      Alert.alert('Error', 'Failed to mark as received.');
    } finally {
      setMarkingId(null);
    }
  };

  const handleSearch = (text) => {
    setSearchText(text);
    const filtered = deliveries.filter(d => {
      const itemName = d.item_name ? d.item_name.toLowerCase() : '';
      const supplierName = d.supplier_name ? d.supplier_name.toLowerCase() : '';
      return itemName.includes(text.toLowerCase()) || supplierName.includes(text.toLowerCase());
    });
    setFilteredDeliveries(filtered);
  };

  const exportPDF = async () => {
    if (filteredDeliveries.length === 0) {
      Alert.alert('No data', 'There are no deliveries to export.');
      return;
    }

    // Generate HTML table for PDF
    const html = `
      <html>
        <head>
          <style>
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #333; padding: 8px; text-align: left; }
            th { background-color: #0077b6; color: #fff; }
          </style>
        </head>
        <body>
          <h2>Delivery Receipts</h2>
          <table>
            <tr>
              <th>Item Name</th>
              <th>Supplier</th>
              <th>Quantity</th>
              <th>Amount</th>
              <th>Delivered At</th>
              <th>Status</th>
            </tr>
            ${filteredDeliveries.map(d => `
              <tr>
                <td>${d.item_name || ''}</td>
                <td>${d.supplier_name || ''}</td>
                <td>${d.quantity ?? ''}</td>
                <td>${d.amount ?? ''}</td>
                <td>${d.delivered_at ? new Date(d.delivered_at).toLocaleString() : ''}</td>
                <td>${d.delivery_status || ''}</td>
              </tr>
            `).join('')}
          </table>
        </body>
      </html>
    `;

    try {
      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Share PDF Receipt' });
    } catch (err) {
      console.error('Export PDF error:', err);
      Alert.alert('Error', 'Failed to generate PDF.');
    }
  };

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <Text style={styles.text}>Item: {item.item_name || 'N/A'}</Text>
      <Text style={styles.text}>Supplier: {item.supplier_name || 'N/A'}</Text>
      <Text style={styles.text}>Quantity: {item.quantity ?? 'N/A'}</Text>
      <Text style={styles.text}>Amount: {item.amount ?? 'N/A'}</Text>
      <Text style={styles.text}>
        Delivered At: {item.delivered_at ? new Date(item.delivered_at).toLocaleString() : 'N/A'}
      </Text>

      <TouchableOpacity
        style={[
          styles.button,
          item.delivery_status === 'delivered' && { backgroundColor: 'green' }
        ]}
        onPress={() => markAsReceived(item.order_id)}
        disabled={item.delivery_status === 'delivered' || markingId === item.order_id}
      >
        {markingId === item.order_id ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>
            {item.delivery_status === 'delivered' ? '✅ Received' : 'Mark as Received'}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );

  if (loading && !refreshing) {
    return <ActivityIndicator size="large" color="#0077b6" style={{ marginTop: 40 }} />;
  }

  if (error) {
    return <Text style={{ textAlign: 'center', marginTop: 50, color: 'red' }}>{error}</Text>;
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={{ padding: 10 }}>
        <TextInput
          placeholder="Search by item or supplier"
          style={styles.searchInput}
          value={searchText}
          onChangeText={handleSearch}
        />
        <TouchableOpacity style={styles.exportButton} onPress={exportPDF}>
          <Text style={styles.exportButtonText}>Download Receipts PDF</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={filteredDeliveries}
        keyExtractor={(item, index) => (item.order_id ? item.order_id.toString() : index.toString())}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 20 }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <Text style={{ textAlign: 'center', marginTop: 50 }}>No deliveries yet.</Text>
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    elevation: 2,
  },
  text: {
    fontSize: 14,
    marginBottom: 5,
  },
  button: {
    marginTop: 10,
    backgroundColor: '#0077b6',
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#0077b6',
    borderRadius: 5,
    padding: 8,
    marginBottom: 10,
  },
  exportButton: {
    backgroundColor: '#00b894',
    padding: 10,
    borderRadius: 5,
    alignItems: 'center',
    marginBottom: 10,
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
});

export default StockDeliveryScreen;
