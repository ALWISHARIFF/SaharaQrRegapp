import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Vibration,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';

const RECORDS_KEY = '@qr_records';

interface QRRecord {
  qrcode: string;
  name: string;
  timestamp: string;
}

export default function ScannerScreen() {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [qrValue, setQrValue] = useState('');
  const [personName, setPersonName] = useState('');
  const [showWarning, setShowWarning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  // Reset form when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setQrValue('');
      setPersonName('');
      setShowWarning(false);
      setIsSuccess(false);
    }, [])
  );

  const handleQRCodeScanned = async ({ data }: { data: string }) => {
    if (isProcessing || !data || data.trim() === '') return;
    
    setIsProcessing(true);
    setQrValue(data.trim());
    
    // Check for duplicates
    try {
      const existingRecords = await getRecords();
      const isDuplicate = existingRecords.some(record => record.qrcode === data.trim());
      
      if (isDuplicate) {
        setShowWarning(true);
        Vibration.vibrate([100, 50, 100]);
        setTimeout(() => setShowWarning(false), 4000);
      } else {
        Vibration.vibrate(100);
      }
    } catch (error) {
      console.error('Error checking duplicates:', error);
    }
    
    setIsProcessing(false);
  };

  const getRecords = async (): Promise<QRRecord[]> => {
    try {
      const records = await AsyncStorage.getItem(RECORDS_KEY);
      return records ? JSON.parse(records) : [];
    } catch (error) {
      console.error('Error getting records:', error);
      return [];
    }
  };

  const saveRecord = async (record: QRRecord) => {
    try {
      const existingRecords = await getRecords();
      const updatedRecords = [...existingRecords, record];
      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
    } catch (error) {
      console.error('Error saving record:', error);
      throw error;
    }
  };

  const handleRegister = async () => {
    if (!qrValue.trim()) {
      Alert.alert('Error', 'Please scan a QR code first');
      return;
    }

    const finalName = personName.trim() || 'Unnamed';

    try {
      setIsProcessing(true);
      
      // Check for duplicates again
      const existingRecords = await getRecords();
      const isDuplicate = existingRecords.some(record => record.qrcode === qrValue);
      
      if (isDuplicate) {
        setShowWarning(true);
        Vibration.vibrate([100, 50, 100]);
        setTimeout(() => setShowWarning(false), 4000);
        setIsProcessing(false);
        return;
      }

      // Create EAT timestamp
      const now = new Date();
      const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
      const eatTime = new Date(utcTime + 10800000); // Add 3 hours for EAT

      const newRecord: QRRecord = {
        qrcode: qrValue,
        name: finalName,
        timestamp: eatTime.toISOString(),
      };

      await saveRecord(newRecord);

      // Success feedback
      setIsSuccess(true);
      Vibration.vibrate(200);
      
      // Clear form after success
      setTimeout(() => {
        setQrValue('');
        setPersonName('');
        setIsSuccess(false);
      }, 2000);

    } catch (error) {
      console.error('Registration error:', error);
      Alert.alert('Error', 'Failed to register QR code. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!permission) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#4CAF50" />
        <Text style={styles.loadingText}>Loading camera...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.container}>
        <LinearGradient
          colors={['#667eea', '#764ba2']}
          style={styles.gradient}
        >
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera Access Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan QR codes
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.keyboardAvoid}
        >
          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.headerTitle}>📱 QR Registration</Text>
              <Text style={styles.headerSubtitle}>Scan • Register • Manage</Text>
            </View>

            {/* Scanner Section */}
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>📸 QR Scanner</Text>
                <View style={styles.statusIndicator}>
                  <View style={styles.statusDot} />
                  <Text style={styles.statusText}>Ready to scan</Text>
                </View>
              </View>

              <View style={styles.cameraContainer}>
                <CameraView
                  style={styles.camera}
                  facing={facing}
                  onBarcodeScanned={handleQRCodeScanned}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr'],
                  }}
                >
                  <View style={styles.scannerOverlay}>
                    <View style={styles.scannerBox}>
                      <View style={[styles.corner, styles.topLeft]} />
                      <View style={[styles.corner, styles.topRight]} />
                      <View style={[styles.corner, styles.bottomLeft]} />
                      <View style={[styles.corner, styles.bottomRight]} />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.flipButton}
                      onPress={() => setFacing(current => current === 'back' ? 'front' : 'back')}
                    >
                      <Text style={styles.flipButtonText}>🔄 Flip</Text>
                    </TouchableOpacity>
                  </View>
                </CameraView>
              </View>
            </View>

            {/* Registration Form */}
            <View style={styles.sectionCard}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>🔗 QR Code Value</Text>
                <TextInput
                  style={[styles.input, styles.readOnlyInput]}
                  value={qrValue}
                  placeholder="Scan a QR code above"
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>👤 Person Name</Text>
                <TextInput
                  style={styles.input}
                  value={personName}
                  onChangeText={setPersonName}
                  placeholder="Enter person's name"
                  placeholderTextColor="#999"
                />
              </View>

              {showWarning && (
                <View style={styles.warning}>
                  <Text style={styles.warningText}>⚠️ This QR code is already registered!</Text>
                </View>
              )}

              <TouchableOpacity
                style={[
                  styles.registerButton,
                  (!qrValue || isProcessing) && styles.registerButtonDisabled,
                  isSuccess && styles.registerButtonSuccess
                ]}
                onPress={handleRegister}
                disabled={!qrValue || isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={styles.registerButtonText}>
                    {isSuccess ? '✅ Registered Successfully!' : '✅ Register QR Code'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  gradient: {
    flex: 1,
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 14,
    color: 'rgba(255, 255, 255, 0.8)',
    fontWeight: '500',
  },
  sectionCard: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  sectionHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  statusIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    color: '#666',
  },
  cameraContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    height: 300,
    backgroundColor: '#f8f9fa',
  },
  camera: {
    flex: 1,
  },
  scannerOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  scannerBox: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#4CAF50',
    borderWidth: 3,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
  },
  flipButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  flipButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  readOnlyInput: {
    backgroundColor: '#f1f3f4',
    color: '#666',
  },
  warning: {
    backgroundColor: '#ff9800',
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  warningText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: '600',
  },
  registerButton: {
    backgroundColor: '#4CAF50',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  registerButtonDisabled: {
    backgroundColor: '#ccc',
  },
  registerButtonSuccess: {
    backgroundColor: '#28a745',
  },
  registerButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: 'white',
    textAlign: 'center',
    marginBottom: 12,
  },
  permissionText: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.8)',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: 'white',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 25,
  },
  permissionButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '700',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
});