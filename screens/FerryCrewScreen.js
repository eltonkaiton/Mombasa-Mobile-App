// screens/FerryCrewScreen.js
import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
  Alert,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
} from 'react-native';
import {
  fetchPaidBookings,
  fetchFerries,
  approveBooking,
  assignFerryToBooking,
} from '../api/ferryCrewApi';

const BookingCard = ({ booking, onApprovePress, onAssignPress }) => {
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Text style={styles.bookingTitle}>#{booking.id} - {booking.type || 'Passenger'}</Text>
        <Text style={styles.status}>Status: {booking.status || 'N/A'}</Text>
      </View>

      <Text>Customer: {booking.user?.full_name || booking.customer_name || 'Unknown'}</Text>
      <Text>Phone: {booking.user?.phone || booking.customer_phone || 'N/A'}</Text>
      <Text>Vehicle: {booking.vehicle ? booking.vehicle.model || booking.vehicle_type : 'No'}</Text>
      <Text>Payment status: {booking.payment_status || 'N/A'}</Text>
      <Text>Assigned Ferry: {booking.assigned_ferry?.name || booking.ferry?.name || 'None'}</Text>

      <View style={styles.cardButtons}>
        <TouchableOpacity
          style={[styles.btn, styles.approveBtn]}
          onPress={() => onApprovePress(booking)}
        >
          <Text style={styles.btnText}>Approve</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.btn, styles.assignBtn]}
          onPress={() => onAssignPress(booking)}
        >
          <Text style={styles.btnText}>Assign Ferry</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function FerryCrewScreen() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [ferries, setFerries] = useState([]);
  const [ferriesLoading, setFerriesLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPaidBookings();
      setBookings(Array.isArray(data) ? data : data.bookings || []);
    } catch (err) {
      console.error('fetchPaidBookings error', err);
      Alert.alert('Error', 'Could not load bookings. Check your network or API.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadBookings();
    setRefreshing(false);
  }, [loadBookings]);

  const handleApprove = async (booking) => {
    Alert.alert(
      'Confirm approval',
      `Approve booking #${booking.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Approve',
          onPress: async () => {
            try {
              setBookings((prev) =>
                prev.map((b) => (b.id === booking.id ? { ...b, status: 'approving' } : b))
              );
              await approveBooking(booking.id);
              Alert.alert('Success', 'Booking approved.');
              await loadBookings();
            } catch (err) {
              console.error('approveBooking error', err);
              Alert.alert('Error', 'Could not approve booking.');
              await loadBookings();
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const openAssignModal = async (booking) => {
    setSelectedBooking(booking);
    setModalVisible(true);
    setFerriesLoading(true);
    try {
      const ferriesData = await fetchFerries();
      setFerries(Array.isArray(ferriesData) ? ferriesData : ferriesData.ferries || []);
    } catch (err) {
      console.error('fetchFerries error', err);
      Alert.alert('Error', 'Could not load ferries.');
      setFerries([]);
    } finally {
      setFerriesLoading(false);
    }
  };

  const handleAssign = async (ferry) => {
    if (!selectedBooking) return;
    Alert.alert(
      'Confirm assignment',
      `Assign ferry "${ferry.name}" to booking #${selectedBooking.id}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Assign',
          onPress: async () => {
            setAssigning(true);
            try {
              await assignFerryToBooking(selectedBooking.id, ferry.id);
              Alert.alert('Success', `Ferry ${ferry.name} assigned.`);
              setModalVisible(false);
              setSelectedBooking(null);
              await loadBookings();
            } catch (err) {
              console.error('assignFerryToBooking error', err);
              Alert.alert('Error', 'Could not assign ferry.');
            } finally {
              setAssigning(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  };

  const renderBooking = ({ item }) => (
    <BookingCard
      booking={item}
      onApprovePress={handleApprove}
      onAssignPress={openAssignModal}
    />
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Ferry Crew — Operations</Text>
        <Text style={styles.headerSubtitle}>Bookings with paid payments</Text>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" />
        </View>
      ) : bookings.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.emptyText}>No paid bookings available.</Text>
          <TouchableOpacity style={styles.reloadBtn} onPress={loadBookings}>
            <Text style={styles.reloadText}>Reload</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={bookings}
          keyExtractor={(item) => item.id?.toString() || Math.random().toString()}
          renderItem={renderBooking}
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Assign Ferry Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => {
          setModalVisible(false);
          setSelectedBooking(null);
        }}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Assign Ferry</Text>
            <Pressable
              onPress={() => {
                setModalVisible(false);
                setSelectedBooking(null);
              }}
              style={styles.modalClose}
            >
              <Text style={styles.modalCloseText}>Close</Text>
            </Pressable>
          </View>

          <View style={{ padding: 12 }}>
            <Text style={{ marginBottom: 8 }}>
              Booking: #{selectedBooking?.id} — {selectedBooking?.user?.full_name || 'Customer'}
            </Text>

            {ferriesLoading ? (
              <ActivityIndicator />
            ) : ferries.length === 0 ? (
              <View>
                <Text>No ferries available to assign.</Text>
              </View>
            ) : (
              <FlatList
                data={ferries}
                keyExtractor={(f) => f.id?.toString() || Math.random().toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.ferryItem}
                    onPress={() => handleAssign(item)}
                    disabled={assigning}
                  >
                    <View>
                      <Text style={styles.ferryName}>{item.name}</Text>
                      <Text style={styles.ferryMeta}>Capacity: {item.capacity || 'N/A'}</Text>
                      <Text style={styles.ferryMeta}>Status: {item.status || 'unknown'}</Text>
                    </View>
                    <View style={{ justifyContent: 'center' }}>
                      <Text style={styles.selectText}>Select</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
              />
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f2f4f8' },
  header: { padding: 16, borderBottomWidth: 1, borderColor: '#e6e9ef', backgroundColor: '#fff' },
  headerTitle: { fontSize: 18, fontWeight: '700' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 4 },

  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontSize: 16, marginBottom: 12 },

  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  bookingTitle: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 13, color: '#333' },

  cardButtons: { flexDirection: 'row', marginTop: 12, justifyContent: 'flex-end' },
  btn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, marginLeft: 8 },
  approveBtn: { backgroundColor: '#2ecc71' },
  assignBtn: { backgroundColor: '#3498db' },
  btnText: { color: '#fff', fontWeight: '600' },

  reloadBtn: {
    marginTop: 8,
    backgroundColor: '#3498db',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  reloadText: { color: '#fff' },

  modalContainer: { flex: 1, backgroundColor: '#fff' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 12, borderBottomWidth: 1, borderColor: '#eee' },
  modalTitle: { fontSize: 18, fontWeight: '700' },
  modalClose: { padding: 8 },
  modalCloseText: { color: '#e74c3c', fontWeight: '600' },

  ferryItem: {
    backgroundColor: '#f7f9fc',
    padding: 12,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  ferryName: { fontSize: 16, fontWeight: '700' },
  ferryMeta: { fontSize: 13, color: '#555' },
  selectText: { color: '#2d6cdf', fontWeight: '600' },
});
