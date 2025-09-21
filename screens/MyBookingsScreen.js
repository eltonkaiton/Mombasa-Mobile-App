import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

// ✅ Direct API URL
const API_BASE_URL = "http://192.168.100.8:3000";

const MyBookingsScreen = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = useCallback(async () => {
    try {
      setLoading(true);
      const token = await AsyncStorage.getItem("token");
      if (!token) {
        Alert.alert("Error", "User not authenticated. Please log in again.");
        return;
      }

      const response = await fetch(`${API_BASE_URL}/api/bookings/mybookings`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP error! status: ${response.status}, body: ${errorText}`
        );
      }

      const data = await response.json();
      setBookings(data.bookings || []);
    } catch (error) {
      console.error("Fetch bookings error:", error);
      Alert.alert("Error", "Failed to fetch bookings. Please try again later.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  const generateReceipt = async (booking) => {
    try {
      const html = `
        <html>
          <head>
            <link
              href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css"
              rel="stylesheet"
            />
          </head>
          <body class="p-4">
            <div class="container">
              <h2 class="text-center mb-4">Mombasa Ferry Services</h2>
              <h4 class="text-center mb-3">Booking Receipt</h4>
              
              <table class="table table-bordered">
                <tbody>
                  <tr>
                    <th scope="row">Booking ID</th>
                    <td>${booking._id}</td>
                  </tr>
                  <tr>
                    <th scope="row">Ferry</th>
                    <td>${booking.ferry_name || "Not assigned"}</td>
                  </tr>
                  <tr>
                    <th scope="row">Date</th>
                    <td>${new Date(booking.travel_date).toLocaleDateString()}</td>
                  </tr>
                  <tr>
                    <th scope="row">Time</th>
                    <td>${booking.travel_time}</td>
                  </tr>
                  <tr>
                    <th scope="row">Route</th>
                    <td>${booking.route}</td>
                  </tr>
                  <tr>
                    <th scope="row">Status</th>
                    <td>${booking.booking_status}</td>
                  </tr>
                  <tr>
                    <th scope="row">Payment Status</th>
                    <td>${booking.payment_status}</td>
                  </tr>
                  <tr>
                    <th scope="row">Amount Paid</th>
                    <td>KES ${booking.amount_paid}</td>
                  </tr>
                </tbody>
              </table>

              <p class="text-center mt-4">Thank you for booking with Mombasa Ferry Services.</p>
            </div>
          </body>
        </html>
      `;

      const { uri } = await Print.printToFileAsync({ html });
      await Sharing.shareAsync(uri);
    } catch (error) {
      console.error("Receipt generation error:", error);
      Alert.alert("Error", "Failed to generate receipt.");
    }
  };

  const renderBooking = ({ item }) => (
    <View style={styles.bookingCard}>
      <Text style={styles.bookingText}>
        Ferry: {item.ferry_name || "Not assigned"}
      </Text>
      <Text style={styles.bookingText}>
        Date: {new Date(item.travel_date).toLocaleDateString()}
      </Text>
      <Text style={styles.bookingText}>Time: {item.travel_time}</Text>
      <Text style={styles.bookingText}>Route: {item.route}</Text>
      <Text style={styles.bookingText}>Status: {item.booking_status}</Text>
      <Text style={styles.bookingText}>Payment: {item.payment_status}</Text>
      <Text style={styles.bookingText}>Amount Paid: KES {item.amount_paid}</Text>

      {item.payment_status === "paid" && item.booking_status === "assigned" ? (
        <TouchableOpacity
          style={styles.receiptButton}
          onPress={() => generateReceipt(item)}
        >
          <Text style={styles.receiptButtonText}>Download Receipt</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.disabledButton}>
          <Text style={styles.disabledButtonText}>Receipt Unavailable</Text>
        </View>
      )}
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#007BFF" />
      </View>
    );
  }

  if (bookings.length === 0) {
    return (
      <View style={styles.center}>
        <Text>No bookings found.</Text>
      </View>
    );
  }

  return (
    <FlatList
      data={bookings}
      keyExtractor={(item) => item._id}
      renderItem={renderBooking}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
      contentContainerStyle={styles.list}
    />
  );
};

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  list: {
    padding: 16,
    paddingTop: 40,
  },
  bookingCard: {
    backgroundColor: "#fff",
    padding: 16,
    marginBottom: 16,
    borderRadius: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
  },
  bookingText: {
    fontSize: 16,
    marginBottom: 4,
  },
  receiptButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#007BFF",
    borderRadius: 6,
  },
  receiptButtonText: {
    color: "#fff",
    textAlign: "center",
  },
  disabledButton: {
    marginTop: 10,
    padding: 10,
    backgroundColor: "#ccc",
    borderRadius: 6,
  },
  disabledButtonText: {
    color: "#666",
    textAlign: "center",
  },
});

export default MyBookingsScreen;
