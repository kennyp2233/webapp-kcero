import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Platform,
  Alert,
  BackHandler,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  Image,
  Button,
} from 'react-native';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const App: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [splashVisible, setSplashVisible] = useState(true);
  const [isConnected, setIsConnected] = useState(true); // Estado de conexión

  const BASE_URL = 'https://kcero.shop/';

  useEffect(() => {
    // Suscribirse al estado de conectividad
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
    });

    requestLocationPermission();
    BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);

    return () => {
      unsubscribe(); // Cancelar suscripción
      BackHandler.removeEventListener('hardwareBackPress', onAndroidBackPress);
    };
  }, []);

  const requestLocationPermission = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permiso de ubicación denegado');
    }
  };

  const onAndroidBackPress = () => {
    if (canGoBack && webViewRef.current) {
      webViewRef.current.goBack();
      return true;
    }
    return false;
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
  };

  const handleMessage = async (event: any) => {
    const { data } = event.nativeEvent;
    console.log('Mensaje desde WebView:', data);
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.warn('WebView error: ', nativeEvent);
    setLoading(false);
    Alert.alert('Error al cargar la página');
  };

  const handleLoad = () => {
    setLoading(false);
    setSplashVisible(false);
  };

  const openExternalLink = (event: any) => {
    const { url } = event;
    if (url.startsWith('https://wa.me/')) {
      Linking.openURL(url).catch((err) =>
        console.error('Error al abrir el enlace:', err),
      );
      return false;
    }
    return true;
  };

  const renderLoading = () => (
    <ActivityIndicator
      color="#009688"
      size="large"
      style={styles.loadingIndicator}
    />
  );

  if (!isConnected) {
    // Pantalla de "Sin conexión"
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.noConnectionContainer}>
          <Image
            source={require('./assets/kcero.webp')} // Asegúrate de tener un logo en tu carpeta de assets
            style={styles.logo}
          />
          <Text style={styles.noConnectionText}>
            No hay conexión a internet.
          </Text>
          <Text style={styles.noConnectionSubText}>
            Por favor, verifica tu conexión y vuelve a intentarlo.
          </Text>
          <Button title="Reintentar" onPress={() => NetInfo.fetch()} />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor="#000000" />
        
        {splashVisible && (
          <View style={styles.splashScreen}>
            {/* Aquí puedes colocar tu Splash Screen personalizado */}
          </View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: BASE_URL }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          cacheEnabled={true}
          thirdPartyCookiesEnabled={true}
          allowUniversalAccessFromFileURLs={true}
          allowFileAccessFromFileURLs={true}
          cacheMode="LOAD_DEFAULT"
          geolocationEnabled={true}
          onMessage={handleMessage}
          onError={handleError}
          onLoad={handleLoad}
          startInLoadingState={true}
          renderLoading={renderLoading}
          allowFileAccess={true}
          onShouldStartLoadWithRequest={openExternalLink}
          mixedContentMode="always"
          allowsBackForwardNavigationGestures
        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000', // Fondo negro para el área del notch
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
  },
  splashScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1,
  },
  noConnectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
  },
  noConnectionText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    marginBottom: 10,
  },
  noConnectionSubText: {
    fontSize: 16,
    color: '#555555',
    textAlign: 'center',
    marginBottom: 20,
  },
});

export default App;
