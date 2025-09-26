import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';

const { height } = Dimensions.get('window');

// API Endpoints
const API_URL = 'http://192.168.100.8:3000/api/staff/bookings';
const FERRIES_URL = 'http://192.168.100.8:3000/api/ferries';
const APPROVE_URL = 'http://192.168.100.8:3000/api/staff/bookings/approve';
const REJECT_URL = 'http://192.168.100.8:3000/api/staff/bookings/reject';
const ASSIGN_FERRY_URL = 'http://192.168.100.8:3000/api/staff/bookings/assign-ferry';

const StaffHome = ({ navigation }) => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ferries, setFerries] = useState([]);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [ferriesLoading, setFerriesLoading] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem('staffToken');
      if (!token) return Alert.alert('Error', 'No token found. Please login again.');
      const response = await axios.get(API_URL, { headers: { Authorization: `Bearer ${token}` } });
      setBookings(response.data.bookings || []);
    } catch (error) {
      console.error('Error fetching bookings:', error.message);
      Alert.alert('Error', 'Failed to fetch bookings from server.');
    } finally {
      setLoading(false);
    }
  };

  const fetchFerries = async () => {
    try {
      setFerriesLoading(true);
      const token = await AsyncStorage.getItem('staffToken');
      const response = await axios.get(FERRIES_URL, { headers: { Authorization: `Bearer ${token}` } });
      setFerries(response.data.ferries || []);
    } catch (error) {
      console.error('Error fetching ferries:', error.message);
      Alert.alert('Error', 'Failed to fetch ferries.');
    } finally {
      setFerriesLoading(false);
    }
  };

  const approveBooking = async (booking) => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      await axios.post(`${APPROVE_URL}/${booking._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Booking approved! Assign a ferry now.');
      setSelectedBooking(booking);
      await fetchFerries();
      setAssignModalVisible(true);
    } catch (error) {
      console.error('Error approving booking:', error.message);
      Alert.alert('Error', 'Failed to approve booking.');
    }
  };

  const rejectBooking = async (booking) => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      await axios.post(`${REJECT_URL}/${booking._id}`, {}, { headers: { Authorization: `Bearer ${token}` } });
      Alert.alert('Success', 'Booking rejected.');
      fetchBookings();
    } catch (error) {
      console.error('Error rejecting booking:', error.message);
      Alert.alert('Error', 'Failed to reject booking.');
    }
  };

  const assignFerry = async (ferry) => {
    try {
      const token = await AsyncStorage.getItem('staffToken');
      await axios.post(
        `${ASSIGN_FERRY_URL}/${selectedBooking._id}`,
        { ferry_name: ferry.name },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      Alert.alert('Success', `Ferry ${ferry.name} assigned!`);
      setAssignModalVisible(false);
      fetchBookings();
    } catch (error) {
      console.error('Error assigning ferry:', error.message);
      Alert.alert('Error', 'Failed to assign ferry.');
    }
  };

  const logout = async () => {
    await AsyncStorage.removeItem('staffToken');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBookings().then(() => setRefreshing(false));
  }, []);

  const renderBooking = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.title}>Booking ID: {item._id}</Text>
      <Text>Passenger ID: {item.user_id?._id || item.user_id}</Text>
      <Text>Type: {item.booking_type}</Text>
      <Text>Status: {item.booking_status}</Text>
      <Text>Travel Date: {new Date(item.travel_date).toLocaleDateString()}</Text>
      <Text>Travel Time: {item.travel_time}</Text>
      <Text>Route: {item.route}</Text>
      <Text>Passengers: {item.num_passengers}</Text>
      <Text>Amount Paid: {item.amount_paid}</Text>
      <Text>Payment Method: {item.payment_method}</Text>
      <Text>Payment Status: {item.payment_status}</Text>
      <Text>Ferry: {item.ferry_name || 'Not assigned'}</Text>

      {item.booking_status === 'pending' && (
        <View style={{ flexDirection: 'row', marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#28a745' }]}
            onPress={() => approveBooking(item)}
          >
            <Text style={styles.buttonText}>Approve</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#dc3545', marginLeft: 10 }]}
            onPress={() => rejectBooking(item)}
          >
            <Text style={styles.buttonText}>Reject</Text>
          </TouchableOpacity>
        </View>
      )}

      {item.booking_status === 'approved' && !item.ferry_name && (
        <View style={{ marginTop: 10 }}>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: '#007bff' }]}
            onPress={async () => {
              setSelectedBooking(item);
              await fetchFerries();
              setAssignModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Assign Ferry</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Dashboard Info */}
      <View style={styles.dashboardInfo}>
        <Text style={styles.dashboardTitle}>Welcome to Mombasa Ferry Services</Text>
        <Text style={styles.dashboardText}>
          Mombasa Ferry Services provides safe, reliable, and efficient ferry transport across Mombasa's waterways.
        </Text>
        <Text style={styles.dashboardText}>
          Our mission is to ensure timely travel for passengers, vehicles, and cargo with top-notch service.
        </Text>
        <Text style={styles.dashboardText}>
          Use this dashboard to manage bookings, approve requests, and assign ferries efficiently.
        </Text>

        {/* Buttons under the dashboard card */}
        <View style={styles.bottomButtons}>
          <TouchableOpacity style={styles.bottomButton} onPress={logout}>
            <Text style={styles.bottomButtonText}>Logout</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('AboutUs')}>
            <Text style={styles.bottomButtonText}>About Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('ContactUs')}>
            <Text style={styles.bottomButtonText}>Contact Us</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.bottomButton} onPress={() => navigation.navigate('FerriesScreen')}>
            <Text style={styles.bottomButtonText}>Ferries</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loader}>
          <ActivityIndicator size="large" color="#007bff" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No bookings found.</Text>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item._id}
          renderItem={renderBooking}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          contentContainerStyle={{ paddingBottom: 20 }}
        />
      )}

      {/* Assign Ferry Modal */}
      <Modal visible={assignModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Assign a Ferry</Text>
            {ferriesLoading ? (
              <ActivityIndicator size="large" color="#007bff" />
            ) : (
              ferries.map((ferry) => (
                <TouchableOpacity key={ferry._id} style={styles.ferryButton} onPress={() => assignFerry(ferry)}>
                  <Text style={styles.ferryText}>{ferry.name}</Text>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity
              style={[styles.button, { backgroundColor: '#6c757d', marginTop: 10 }]}
              onPress={() => setAssignModalVisible(false)}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

export default StaffHome;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingHorizontal: 10 },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  bookingCard: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginVertical: 8,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 5,
    elevation: 3,
  },
  title: { fontWeight: 'bold', fontSize: 16, marginBottom: 5 },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
  emptyText: { fontSize: 16, color: '#888' },
  button: { flex: 1, padding: 10, borderRadius: 8, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#fff', width: '85%', padding: 20, borderRadius: 10, maxHeight: height * 0.8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, textAlign: 'center' },
  ferryButton: { backgroundColor: '#007bff', padding: 10, borderRadius: 8, marginBottom: 10, alignItems: 'center' },
  ferryText: { color: '#fff', fontWeight: 'bold' },
  dashboardInfo: { backgroundColor: '#fff', padding: 15, borderRadius: 10, marginVertical: 10, shadowColor: '#000', shadowOpacity: 0.05, shadowOffset: { width: 0, height: 2 }, shadowRadius: 5, elevation: 2 },
  dashboardTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 8 },
  dashboardText: { fontSize: 14, color: '#555', marginBottom: 4 },
  bottomButtons: { flexDirection: 'column', marginTop: 15 },
  bottomButton: { backgroundColor: '#007bff', padding: 12, borderRadius: 8, marginVertical: 5, alignItems: 'center' },
  bottomButtonText: { color: '#fff', fontWeight: 'bold' },
});
