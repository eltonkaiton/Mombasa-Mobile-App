import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';

const USER_LOGIN_URL = 'http://192.168.100.8:3000/api/users/login';
const SUPPLIER_LOGIN_URL = 'http://192.168.100.8:3000/api/suppliers/login';
const INVENTORY_LOGIN_URL = 'http://192.168.100.8:3000/api/inventory/login';
const FINANCE_LOGIN_URL = 'http://192.168.100.8:3000/api/finance/login';

const LoginScreen = () => {
  const navigation = useNavigation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginType, setLoginType] = useState('user');

  const getLoginUrl = () => {
    switch (loginType) {
      case 'supplier':
        return SUPPLIER_LOGIN_URL;
      case 'inventory':
        return INVENTORY_LOGIN_URL;
      case 'finance':
        return FINANCE_LOGIN_URL;
      default:
        return USER_LOGIN_URL;
    }
  };

  const handleToggleLoginType = () => {
    const types = ['user', 'supplier', 'inventory', 'finance'];
    const currentIndex = types.indexOf(loginType);
    const nextIndex = (currentIndex + 1) % types.length;
    setLoginType(types[nextIndex]);
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Validation Error', 'Please enter both email and password');
      return;
    }

    setLoading(true);
    const BACKEND_URL = getLoginUrl();

    try {
      const response = await fetch(BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error(`Unexpected response format: ${contentType}`);
      }

      const data = await response.json();

      if (response.ok && data.token && data.user) {
        const { full_name, name, role, category } = data.user;

        // 👇 Get the actual role to use in routing
        const userRole = (role || category || loginType).toLowerCase();

        await AsyncStorage.setItem('token', data.token);
        await AsyncStorage.setItem('role', userRole);
        await AsyncStorage.setItem('user', JSON.stringify(data.user));

        Alert.alert('Success', 'Logged in successfully');

        let destination;
        switch (userRole) {
          case 'admin':
            destination = 'AdminHome';
            break;
          case 'staff':
            destination = 'StaffHome';
            break;
          case 'finance':
            destination = 'FinanceHome';
            break;
          case 'inventory':
            destination = 'InventoryHome';
            break;
          case 'passenger':
            destination = 'PassengerHome';
            break;
          case 'supplier':
            destination = 'SupplierHome';
            break;
          default:
            Alert.alert('Login Error', `Unknown user role: ${userRole}`);
            return;
        }

        navigation.reset({
          index: 0,
          routes: [
            {
              name: destination,
              params: { full_name: full_name || name },
            },
          ],
        });
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid credentials');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Error', error.message || 'Something went wrong during login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Login</Text>

      <TouchableOpacity onPress={handleToggleLoginType} style={styles.toggleLoginType}>
        <Text style={styles.toggleText}>
          {loginType === 'user' && 'Switch to Supplier Login'}
          {loginType === 'supplier' && 'Switch to Inventory Login'}
          {loginType === 'inventory' && 'Switch to Finance Login'}
          {loginType === 'finance' && 'Switch to User Login'}
        </Text>
      </TouchableOpacity>

      <TextInput
        style={styles.input}
        placeholder="Email"
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        value={email}
        onChangeText={setEmail}
        editable={!loading}
      />

      <TextInput
        style={styles.input}
        placeholder="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        editable={!loading}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#0077b6" style={{ marginTop: 20 }} />
      ) : (
        <Button title="Log In" onPress={handleLogin} />
      )}

      {loginType === 'user' && (
        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.registerLink}
        >
          <Text style={styles.registerText}>Don't have an account? Create one</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#eef6fa',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 30,
    color: '#0077b6',
    textAlign: 'center',
  },
  toggleLoginType: {
    alignItems: 'center',
    marginBottom: 20,
  },
  toggleText: {
    color: '#0077b6',
    fontSize: 16,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#fff',
    borderColor: '#ccc',
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 20,
    fontSize: 16,
  },
  registerLink: {
    marginTop: 20,
    alignItems: 'center',
  },
  registerText: {
    color: '#0077b6',
    fontSize: 16,
  },
});

export default LoginScreen;
