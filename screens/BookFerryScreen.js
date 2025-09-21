import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const BookingScreen = () => {
  const navigation = useNavigation();

  const [bookingType, setBookingType] = useState('passenger');
  const [travelDate, setTravelDate] = useState('');
  const [travelTime, setTravelTime] = useState('');
  const [route, setRoute] = useState('');
  const [numPassengers, setNumPassengers] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [cargoDescription, setCargoDescription] = useState('');
  const [cargoWeight, setCargoWeight] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('mpesa');
  const [transactionId, setTransactionId] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);

  const API_BASE_URL = 'http://192.168.100.8:3000/api';

  const ferryRoutes = [
    'Likoni - Island',
    'Island - Likoni',
    'Mtongwe - Island',
    'Island - Mtongwe',
    'Likoni - Mtongwe',
    'Mtongwe - Likoni',
  ];

  useEffect(() => {
    const now = new Date();
    setTravelDate(now.toISOString().split('T')[0]);
    setTravelTime(now.toTimeString().split(':').slice(0, 2).join(':'));
  }, []);

  useEffect(() => {
    const getUserId = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const res = await axios.get(`${API_BASE_URL}/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUserId(res.data.user.id);
      } catch (error) {
        console.error('Failed to fetch user ID:', error);
      }
    };
    getUserId();
  }, []);

  useEffect(() => {
    if (bookingType === 'vehicle') {
      setAmountPaid('500');
    } else if (bookingType === 'cargo') {
      const weight = parseFloat(cargoWeight);
      if (!isNaN(weight)) {
        setAmountPaid((weight * 20).toFixed(0));
      } else {
        setAmountPaid('');
      }
    } else {
      setAmountPaid('');
    }
  }, [bookingType, cargoWeight]);

  const handleSubmit = async () => {
    if (!route) {
      Alert.alert('Error', 'Please select a route.');
      return;
    }

    setLoading(true);
    try {
      const token = await AsyncStorage.getItem('token');

      // Convert travel date + time into ISO Date object
      const isoDateTime = new Date(`${travelDate}T${travelTime}:00Z`);

      const bookingData = {
        booking_type: bookingType,
        travel_date: isoDateTime, // send as real Date
        travel_time: travelTime,
        route,
        amount_paid: Number(amountPaid),
      };

      if (bookingType === 'passenger') {
        bookingData.num_passengers = numPassengers;
      } else if (bookingType === 'vehicle') {
        bookingData.vehicle_type = vehicleType;
        bookingData.vehicle_plate = vehiclePlate;
        bookingData.payment_method = paymentMethod;
        bookingData.transaction_id = transactionId;
      } else if (bookingType === 'cargo') {
        bookingData.cargo_description = cargoDescription;
        bookingData.cargo_weight_kg = cargoWeight;
        bookingData.payment_method = paymentMethod;
        bookingData.transaction_id = transactionId;
      }

      await axios.post(`${API_BASE_URL}/bookings/create`, bookingData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      Alert.alert('Success', 'Booking submitted successfully', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('MyBookings'),
        },
      ]);
      resetForm();
    } catch (error) {
      console.error('Booking submission failed:', error?.response?.data || error);
      Alert.alert('Error', 'Booking submission failed');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setRoute('');
    setNumPassengers('');
    setVehicleType('');
    setVehiclePlate('');
    setCargoDescription('');
    setCargoWeight('');
    setPaymentMethod('mpesa');
    setTransactionId('');
    setAmountPaid('');

    const now = new Date();
    setTravelDate(now.toISOString().split('T')[0]);
    setTravelTime(now.toTimeString().split(':').slice(0, 2).join(':'));
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.heading}>New Booking</Text>

      <Text style={styles.label}>Booking Type</Text>
      <View style={styles.row}>
        {['passenger', 'vehicle', 'cargo'].map((type) => (
          <TouchableOpacity
            key={type}
            style={[styles.typeBtn, bookingType === type && styles.selectedBtn]}
            onPress={() => setBookingType(type)}
          >
            <Text style={[styles.typeText, bookingType === type && { color: '#fff' }]}>{type}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Travel Date</Text>
      <TextInput
        style={styles.input}
        value={travelDate}
        onChangeText={setTravelDate}
        placeholder="YYYY-MM-DD"
      />

      <Text style={styles.label}>Travel Time</Text>
      <TextInput
        style={styles.input}
        value={travelTime}
        onChangeText={setTravelTime}
        placeholder="HH:MM"
      />

      <Text style={styles.label}>Route</Text>
      <View style={styles.pickerWrapper}>
        <Picker selectedValue={route} onValueChange={(itemValue) => setRoute(itemValue)}>
          <Picker.Item label="Select Route" value="" />
          {ferryRoutes.map((r) => (
            <Picker.Item key={r} label={r} value={r} />
          ))}
        </Picker>
      </View>

      {bookingType === 'passenger' && (
        <>
          <Text style={styles.label}>Number of Passengers</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. 2"
            keyboardType="numeric"
            value={numPassengers}
            onChangeText={setNumPassengers}
          />
        </>
      )}

      {bookingType === 'vehicle' && (
        <>
          <Text style={styles.label}>Vehicle Type</Text>
          <TextInput
            style={styles.input}
            placeholder="Vehicle Type"
            value={vehicleType}
            onChangeText={setVehicleType}
          />
          <Text style={styles.label}>Vehicle Plate</Text>
          <TextInput
            style={styles.input}
            placeholder="Plate Number"
            value={vehiclePlate}
            onChangeText={setVehiclePlate}
          />
        </>
      )}

      {bookingType === 'cargo' && (
        <>
          <Text style={styles.label}>Cargo Description</Text>
          <TextInput
            style={styles.input}
            placeholder="Cargo Description"
            value={cargoDescription}
            onChangeText={setCargoDescription}
          />
          <Text style={styles.label}>Cargo Weight (KG)</Text>
          <TextInput
            style={styles.input}
            placeholder="Weight in KG"
            keyboardType="numeric"
            value={cargoWeight}
            onChangeText={setCargoWeight}
          />
        </>
      )}

      {(bookingType === 'vehicle' || bookingType === 'cargo') && (
        <>
          <Text style={styles.label}>Payment Method</Text>
          <TextInput style={styles.input} value={paymentMethod} onChangeText={setPaymentMethod} />

          <Text style={styles.label}>Transaction ID</Text>
          <TextInput style={styles.input} value={transactionId} onChangeText={setTransactionId} />

          <Text style={styles.label}>Amount (Auto Calculated)</Text>
          <Text style={styles.amount}>{amountPaid} KES</Text>
        </>
      )}

      <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Submit Booking</Text>}
      </TouchableOpacity>
    </ScrollView>
  );
};

export default BookingScreen;

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 50,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  label: {
    marginTop: 15,
    fontWeight: '600',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 10,
    borderRadius: 8,
    marginTop: 5,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    marginTop: 5,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginVertical: 10,
  },
  typeBtn: {
    padding: 10,
    backgroundColor: '#eee',
    borderRadius: 8,
  },
  selectedBtn: {
    backgroundColor: '#007bff',
  },
  typeText: {
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#28a745',
    padding: 15,
    marginTop: 30,
    borderRadius: 10,
    alignItems: 'center',
  },
  submitText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  amount: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 5,
    color: '#007bff',
  },
});
