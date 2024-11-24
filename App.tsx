import React, { useRef, useState, useEffect } from 'react';
import {
  View,
  Alert,
  BackHandler,
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  Image,
  Button,
  Animated,
  Easing,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { StatusBar } from 'expo-status-bar';
import * as Location from 'expo-location';
import NetInfo from '@react-native-community/netinfo';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

const App: React.FC = () => {
  const webViewRef = useRef<WebView>(null);
  const [canGoBack, setCanGoBack] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(true);
  const splashAnimation = useRef(new Animated.Value(1)).current; // Opacidad inicial de 1
  const logoScale = useRef(new Animated.Value(0)).current; // Escala inicial del logotipo

  const BASE_URL = 'https://kcero.shop/';

  useEffect(() => {
    console.log('Inicializando la aplicación...');

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsConnected(state.isConnected ?? false);
      console.log('Conexión a internet:', state.isConnected);
      if (!state.isConnected) {
        console.warn('La aplicación ha perdido la conexión a internet.');
      } else {
        console.log('La conexión a internet se ha restablecido.');
      }
    });

    requestLocationPermission();

    const backHandler = BackHandler.addEventListener('hardwareBackPress', onAndroidBackPress);
    console.log('Suscrito al evento de retroceso de Android.');

    // Iniciar animación del logotipo
    Animated.sequence([
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(logoScale, {
        toValue: 1.2,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
      Animated.timing(logoScale, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
        easing: Easing.ease,
      }),
    ]).start();

    return () => {
      unsubscribe();
      backHandler.remove();
      console.log('Desuscrito de los eventos de conectividad y retroceso.');
    };
  }, []);

  useEffect(() => {
    let loadTimeout: NodeJS.Timeout;

    if (loading) {
      loadTimeout = setTimeout(() => {
        console.warn('WebView: La carga está tardando demasiado.');
        Alert.alert('Tiempo de carga excedido', 'La página está tardando demasiado en cargar.');
        hideSplash();
      }, 30000); // 30 segundos
    }

    return () => {
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
    };
  }, [loading]);

  const requestLocationPermission = async () => {
    try {
      console.log('Solicitando permisos de ubicación...');
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permiso de ubicación denegado');
        console.error('Permiso de ubicación denegado por el usuario.');
      } else {
        console.log('Permiso de ubicación otorgado.');
      }
    } catch (error) {
      console.error('Error al solicitar permisos de ubicación:', error);
    }
  };

  const onAndroidBackPress = () => {
    console.log('Botón de retroceso presionado en Android.');
    if (canGoBack && webViewRef.current) {
      console.log('Navegando hacia atrás en WebView.');
      webViewRef.current.goBack();
      return true;
    }
    console.log('No hay historial de navegación para retroceder.');
    return false;
  };

  const handleWebViewNavigationStateChange = (navState: any) => {
    setCanGoBack(navState.canGoBack);
    console.log('Estado de navegación cambiado:', navState);
  };

  const handleMessage = async (event: any) => {
    const { data } = event.nativeEvent;
    console.log('Mensaje recibido desde WebView:', data);
    let message;
    try {
      message = JSON.parse(data);
    } catch (e) {
      console.error('Error parsing message data:', e);
      return;
    }

    if (message.type === 'getLocation') {
      console.log('WebView solicita ubicación.');
      const location = await Location.getCurrentPositionAsync({});
      if (webViewRef.current) {
        const jsCode = `
          (function() {
            if (window.getLocationCallback) {
              window.getLocationCallback({
                coords: {
                  latitude: ${location.coords.latitude},
                  longitude: ${location.coords.longitude},
                },
                timestamp: ${location.timestamp}
              });
            }
          })();
          true;
        `;
        webViewRef.current.injectJavaScript(jsCode);
        console.log('Inyectado código para responder la ubicación.');
      }
    }
  };

  const handleError = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.error('WebView error:', nativeEvent);
    hideSplash();
    Alert.alert('Error al cargar la página', nativeEvent.description);
  };

  const handleLoad = () => {
    console.log('WebView ha terminado de cargar.');
    hideSplash();
  };

  const handleLoadStart = () => {
    console.log('WebView: Inicio de carga.');
    setLoading(true);
    showSplash();
  };

  const handleLoadEnd = () => {
    console.log('WebView: Fin de carga.');
    hideSplash();
  };

  const handleLoadProgress = (syntheticEvent: any) => {
    const { nativeEvent } = syntheticEvent;
    console.log(`WebView: Progreso de carga: ${nativeEvent.progress}`);
  };

  const openExternalLink = (event: any) => {
    const { url } = event;
    console.log('Intentando abrir enlace:', url);

    if (url.startsWith('https://wa.me/')) {
      Linking.openURL(url)
        .then(() => {
          console.log('Enlace abierto exitosamente:', url);
        })
        .catch((err) => {
          console.error('Error al abrir el enlace:', err);
          Alert.alert('Error', 'No se pudo abrir el enlace.');
        });
      return false;
    }
    return true;
  };

  const injectedJavaScript = `
    window.onerror = function(message, source, lineno, colno, error) {
    window.ReactNativeWebView.postMessage(JSON.stringify({ message, source, lineno, colno, error }));
  };
  true;
  `;

  const renderLoading = () => {
    console.log('Mostrando indicador de carga.');
    return (
      <ActivityIndicator
        color="#009688"
        size="large"
        style={styles.loadingIndicator}
      />
    );
  };

  const showSplash = () => {
    Animated.timing(splashAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  };

  const hideSplash = () => {
    Animated.timing(splashAnimation, {
      toValue: 0,
      duration: 1000,
      useNativeDriver: true,
    }).start(() => {
      setLoading(false);
      console.log('Splash screen ocultada.');
    });
  };

  if (!isConnected) {
    console.warn('Mostrando pantalla de sin conexión.');
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.noConnectionContainer}>
          <Image
            source={require('./assets/icon.png')}
            style={styles.logo}
          />
          <Text style={styles.noConnectionText}>
            No hay conexión a internet.
          </Text>
          <Text style={styles.noConnectionSubText}>
            Por favor, verifica tu conexión y vuelve a intentarlo.
          </Text>
          <Button
            title="Reintentar"
            onPress={() => {
              console.log('Usuario presionó Reintentar.');
              NetInfo.fetch().then((state) => {
                setIsConnected(state.isConnected ?? false);
                console.log('Resultado de reintentar conexión:', state.isConnected);
              });
            }}
          />
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <StatusBar style="light" backgroundColor="#000000" />

        {/* Splash Screen Animado */}
        {loading && (
          <Animated.View style={[styles.splashScreen, { opacity: splashAnimation }]}>
            <Animated.Image
              source={require('./assets/icon.png')} // Asegúrate de tener un logotipo en assets
              style={[
                styles.logoImage,
                {
                  transform: [{ scale: logoScale }],
                },
              ]}
              resizeMode="contain"
            />
            <ActivityIndicator color="#009688" size="large" style={{ marginTop: 20 }} />
            <Text style={styles.splashText}>Cargando...</Text>
          </Animated.View>
        )}

        <WebView
          ref={webViewRef}
          source={{ uri: BASE_URL }}
          onNavigationStateChange={handleWebViewNavigationStateChange}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          onMessage={handleMessage}
          onError={handleError}
          onLoad={handleLoad}
          onLoadStart={handleLoadStart}
          onLoadEnd={handleLoadEnd}
          onLoadProgress={handleLoadProgress}
          startInLoadingState={true}
          renderLoading={renderLoading}
          onShouldStartLoadWithRequest={openExternalLink}
          injectedJavaScript={injectedJavaScript}
          mixedContentMode="always"
          allowsBackForwardNavigationGestures
          style={styles.webview}
          geolocationEnabled={true}
          userAgent="Mozilla/5.0 (iPhone; CPU iPhone OS 10_3 like Mac OS X) 
  AppleWebKit/602.1.50 (KHTML, like Gecko) Version/10.0 Mobile/14E5239e 
  Safari/602.1"
          cacheEnabled={true}

        />
      </SafeAreaView>
    </SafeAreaProvider>
  );
};

const styles = StyleSheet.create({
  logoImage: {
    width: 150,
    height: 150,
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  webview: {
    flex: 1,
  },
  loadingIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
  },
  splashScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FFFFFF',
    zIndex: 1000, // Asegura que esté por encima de otros elementos
    justifyContent: 'center',
    alignItems: 'center',
  },
  splashText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000000',
  },
  noConnectionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 20,
  },
  logo: {
    width: 150,
    height: 150,
    marginBottom: 20,
    resizeMode: 'contain',
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
