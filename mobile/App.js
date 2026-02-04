import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View, SafeAreaView, ActivityIndicator, Text, Button } from 'react-native';
import LoginScreen from './src/screens/LoginScreen';
import MainScannerScreen from './src/screens/MainScannerScreen';
import { authService } from './src/services/authService';
import { loadApiBaseUrl, subscribeToAuthError } from './src/services/api';

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error Boundary caught:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorText}>
            {this.state.error?.message || 'Unknown error'}
          </Text>
          <Text style={styles.errorHint}>
            Try reloading the app (Shake device → Reload)
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('App Mounted. Initializing...');

    // Subscribe to Auth Errors (401)
    const unsubscribe = subscribeToAuthError(() => {
      console.log("Auth Error Detected - Forcing Logout");
      handleLogout();
    });

    initApp();

    return () => unsubscribe();
  }, []);

  const initApp = async () => {
    try {
      // 1. Load API URL
      await loadApiBaseUrl();

      // 2. Check Auth
      await checkAuth();
    } catch (e) {
      console.error("Init failed", e);
    } finally {
      console.log('App Loading State set to false');
      setLoading(false);
    }
  };

  const checkAuth = async () => {
    try {
      const authenticated = await authService.isAuthenticated();
      console.log('Auth Check Result:', authenticated);
      setIsAuthenticated(authenticated);
    } catch (error) {
      console.error('Auth Check Error:', error);
      setIsAuthenticated(false);
    }
  };

  const handleLogin = () => {
    console.log('Login successful, setting authenticated to true');
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      console.log('Logging out...');
      await authService.logout();
      setIsAuthenticated(false);
      console.log('Logout complete');
    } catch (error) {
      console.error('Logout Error:', error);
      // Force logout even if there's an error
      setIsAuthenticated(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <SafeAreaView style={styles.container}>
        {isAuthenticated ? (
          <MainScannerScreen onLogout={handleLogout} />
        ) : (
          <LoginScreen onLoginSuccess={handleLogin} />
        )}
        <StatusBar style="auto" />
      </SafeAreaView>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF3B30',
    marginBottom: 10,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  errorHint: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
});
