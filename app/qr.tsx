import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, Button, Alert } from 'react-native';
import { CameraView, Camera } from "expo-camera";
import { useRouter } from 'expo-router';
import { IconButton } from 'react-native-paper';

export default function QRScanner() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const getPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: any) => {
    setScanned(true);
    Alert.alert("QR найден!", `Данные: ${data}`, [{ text: "OK", onPress: () => router.back() }]);
  };

  if (hasPermission === null) return <View />;
  if (hasPermission === false) return <Text>Нет доступа к камере</Text>;

  return (
    <View style={styles.container}>
      <CameraView onBarcodeScanned={scanned ? undefined : handleBarCodeScanned} style={StyleSheet.absoluteFillObject} />
      <View style={styles.overlay}>
        <IconButton icon="close" iconColor="white" size={40} onPress={() => router.back()} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} />
        <Text style={styles.text}>Сканируйте QR код</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'black', justifyContent: 'center' },
  overlay: { position: 'absolute', top: 50, left: 0, right: 0, alignItems: 'center' },
  text: { color: 'white', fontSize: 18, marginTop: 20, fontWeight: 'bold' }
});