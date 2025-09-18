import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  StatusBar,
  Vibration,
  Share,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

const RECORDS_KEY = '@qr_records';

interface QRRecord {
  qrcode: string;
  name: string;
  timestamp: string;
  timezoneOffset?: number;
}

export default function RecordsScreen() {
  const [records, setRecords] = useState<QRRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState<QRRecord | null>(null);
  const [editName, setEditName] = useState('');
  const [exporting, setExporting] = useState(false);

  // Load records when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      loadRecords();
    }, [])
  );

  const loadRecords = async () => {
    try {
      setLoading(true);
      const storedRecords = await AsyncStorage.getItem(RECORDS_KEY);
      const parsedRecords = storedRecords ? JSON.parse(storedRecords) : [];
      
      // Sort by timestamp (newest first)
      parsedRecords.sort((a: QRRecord, b: QRRecord) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      
      setRecords(parsedRecords);
    } catch (error) {
      console.error('Error loading records:', error);
      Alert.alert('Error', 'Failed to load records');
    } finally {
      setLoading(false);
    }
  };

  const formatDisplayTime = (timestamp: string) => {
    try {
      if (!timestamp) return 'Unknown date';
      
      const date = new Date(timestamp);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Invalid date';
      
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
      const eatTime = new Date(utcTime + 10800000); // Add 3 hours for EAT

      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                     'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      
      const month = months[eatTime.getMonth()];
      const day = eatTime.getDate();
      const year = eatTime.getFullYear();
      
      let hours = eatTime.getHours();
      const minutes = eatTime.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      
      hours = hours % 12;
      hours = hours ? hours : 12;
      
      return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm} EAT`;
    } catch (error) {
      console.error('Error formatting display time:', error);
      return 'Invalid date';
    }
  };

  const formatCSVTime = (timestamp: string) => {
    try {
      if (!timestamp) return 'N/A';
      
      const date = new Date(timestamp);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'N/A';
      
      const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
      const eatTime = new Date(utcTime + 10800000); // Add 3 hours for EAT
      
      const month = (eatTime.getMonth() + 1).toString().padStart(2, '0');
      const day = eatTime.getDate().toString().padStart(2, '0');
      const year = eatTime.getFullYear();
      const hours = eatTime.getHours().toString().padStart(2, '0');
      const minutes = eatTime.getMinutes().toString().padStart(2, '0');
      const seconds = eatTime.getSeconds().toString().padStart(2, '0');
      
      return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} EAT`;
    } catch (error) {
      console.error('Error formatting CSV time:', error);
      return 'N/A';
    }
  };

  const deleteRecord = async (qrcode: string) => {
    Alert.alert(
      'Delete Record',
      'Are you sure you want to delete this record?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const updatedRecords = records.filter(record => record.qrcode !== qrcode);
              await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
              setRecords(updatedRecords);
              Vibration.vibrate(100);
            } catch (error) {
              console.error('Error deleting record:', error);
              Alert.alert('Error', 'Failed to delete record');
            }
          },
        },
      ]
    );
  };

  const editRecord = (record: QRRecord) => {
    setEditingRecord(record);
    setEditName(record.name);
    setEditModalVisible(true);
  };

  const saveEdit = async () => {
    if (!editingRecord || !editName.trim()) return;

    try {
      const updatedRecords = records.map(record =>
        record.qrcode === editingRecord.qrcode
          ? { ...record, name: editName.trim() }
          : record
      );

      await AsyncStorage.setItem(RECORDS_KEY, JSON.stringify(updatedRecords));
      setRecords(updatedRecords);
      setEditModalVisible(false);
      setEditingRecord(null);
      setEditName('');
      Vibration.vibrate(100);
    } catch (error) {
      console.error('Error editing record:', error);
      Alert.alert('Error', 'Failed to edit record');
    }
  };

  const exportToCSV = async () => {
    if (records.length === 0) {
      Alert.alert('No Data', 'No records to export!');
      return;
    }

    try {
      setExporting(true);
      
      // Create CSV content
      const csvHeader = 'Name,QR Code,Registration Date (EAT)\n';
      const csvRows = records.map(record => {
        const date = formatCSVTime(record.timestamp);
        const escapedName = `"${(record.name || '').replace(/"/g, '""')}"`;
        const escapedQrcode = `"${(record.qrcode || '').replace(/"/g, '""')}"`;
        const escapedDate = `"${date.replace(/"/g, '""')}"`;
        return `${escapedName},${escapedQrcode},${escapedDate}`;
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      
      // Create file
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const filename = `qr-registration-${timestamp}.csv`;
      const fileUri = FileSystem.documentDirectory + filename;
      
      await FileSystem.writeAsStringAsync(fileUri, csvContent, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      // Share the file
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'text/csv',
          dialogTitle: 'Export QR Registration Data',
        });
      } else {
        // Fallback to share text content
        await Share.share({
          message: csvContent,
          title: 'QR Registration Data',
        });
      }

      Vibration.vibrate(200);
      
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Export Failed', 'Unable to export data. Please try again.');
    } finally {
      setExporting(false);
    }
  };

  const renderRecord = ({ item }: { item: QRRecord }) => (
    <View style={styles.recordCard}>
      <View style={styles.recordContent}>
        <View style={styles.qrCodeContainer}>
          <Text style={styles.qrCodeText}>{item.qrcode}</Text>
        </View>
        <Text style={styles.recordName}>{item.name}</Text>
        <Text style={styles.recordDate}>📅 {formatDisplayTime(item.timestamp)}</Text>
      </View>
      
      <View style={styles.recordActions}>
        <TouchableOpacity 
          style={[styles.actionButton, styles.editButton]}
          onPress={() => editRecord(item)}
        >
          <Text style={styles.actionButtonText}>✏️ Edit</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteRecord(item.qrcode)}
        >
          <Text style={styles.actionButtonText}>🗑️ Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <Text style={styles.emptyStateIcon}>📝</Text>
      <Text style={styles.emptyStateText}>
        No QR codes registered yet.{'\n'}Scan your first code in the Scanner tab!
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={['#667eea', '#764ba2']}
        style={styles.gradient}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <Text style={styles.headerTitle}>📋 Registered Records</Text>
            <View style={styles.headerRight}>
              <View style={styles.recordsCount}>
                <Text style={styles.recordsCountText}>{records.length}</Text>
              </View>
              {records.length > 0 && (
                <TouchableOpacity
                  style={styles.exportButton}
                  onPress={exportToCSV}
                  disabled={exporting}
                >
                  {exporting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.exportButtonText}>📊</Text>
                      <Text style={styles.exportButtonText}>Export</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* Records List */}
        <View style={styles.recordsContainer}>
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4CAF50" />
              <Text style={styles.loadingText}>Loading records...</Text>
            </View>
          ) : (
            <FlatList
              data={records}
              keyExtractor={(item) => item.qrcode}
              renderItem={renderRecord}
              ListEmptyComponent={renderEmptyState}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        {/* Edit Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={editModalVisible}
          onRequestClose={() => setEditModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Edit Record</Text>
              
              <View style={styles.modalInputGroup}>
                <Text style={styles.modalLabel}>Person Name</Text>
                <TextInput
                  style={styles.modalInput}
                  value={editName}
                  onChangeText={setEditName}
                  placeholder="Enter person's name"
                  autoFocus
                />
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalCancelButton]}
                  onPress={() => {
                    setEditModalVisible(false);
                    setEditingRecord(null);
                    setEditName('');
                  }}
                >
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalSaveButton]}
                  onPress={saveEdit}
                  disabled={!editName.trim()}
                >
                  <Text style={styles.modalSaveText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  header: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: 'white',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  recordsCount: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  recordsCountText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  exportButton: {
    backgroundColor: '#2196F3',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minWidth: 70,
    justifyContent: 'center',
  },
  exportButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  recordsContainer: {
    flex: 1,
    backgroundColor: 'white',
    marginHorizontal: 16,
    borderRadius: 20,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  listContainer: {
    flexGrow: 1,
  },
  recordCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  recordContent: {
    marginBottom: 12,
  },
  qrCodeContainer: {
    backgroundColor: 'white',
    padding: 8,
    borderRadius: 6,
    marginBottom: 8,
  },
  qrCodeText: {
    fontFamily: 'monospace',
    fontSize: 12,
    color: '#666',
    lineHeight: 16,
  },
  recordName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordDate: {
    fontSize: 12,
    color: '#888',
    lineHeight: 16,
  },
  recordActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#6c757d',
  },
  deleteButton: {
    backgroundColor: '#dc3545',
  },
  actionButtonText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyStateIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  modalInputGroup: {
    marginBottom: 24,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#e1e5e9',
    borderRadius: 12,
    padding: 16,
    fontSize: 16,
    backgroundColor: '#f8f9fa',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  modalCancelButton: {
    backgroundColor: '#6c757d',
  },
  modalSaveButton: {
    backgroundColor: '#4CAF50',
  },
  modalCancelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  modalSaveText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});