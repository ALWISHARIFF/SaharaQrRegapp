// QR Registration Web App - JavaScript Version
// This file replicates the functionality from qr-manager.html

// Global variables
let db;
let scanner;
let isScanning = false;

// Initialize IndexedDB
function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("qrRegistrationDB", 2);
    
    request.onupgradeneeded = function(event) {
      db = event.target.result;
      if (!db.objectStoreNames.contains("records")) {
        const store = db.createObjectStore("records", { keyPath: "qrcode" });
        store.createIndex("name", "name", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
    };
    
    request.onsuccess = function(event) {
      db = event.target.result;
      resolve(db);
    };
    
    request.onerror = function(event) {
      reject(event.target.error);
    };
  });
}

// Initialize Scanner
async function initScanner() {
  try {
    // Check if Html5Qrcode is available
    if (typeof Html5Qrcode === 'undefined') {
      throw new Error('Html5Qrcode library not loaded');
    }

    scanner = new Html5Qrcode("scanner");
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
      aspectRatio: 1.0
    };

    await scanner.start(
      { facingMode: "environment" },
      config,
      onScanSuccess,
      onScanFailure
    );

    isScanning = true;
    updateScannerStatus("Ready to scan", true);
    
  } catch (error) {
    console.error("Scanner initialization failed:", error);
    showCameraError("Unable to access camera. Please check permissions.");
    updateScannerStatus("Camera unavailable", false);
  }
}

// Scan success handler
function onScanSuccess(qrCodeMessage) {
  if (qrCodeMessage && qrCodeMessage.trim()) {
    const qrValueInput = document.getElementById("qrcodeValue");
    if (qrValueInput) {
      qrValueInput.value = qrCodeMessage.trim();
      updateRegisterButton();
      
      // Vibrate on successful scan (if supported)
      if (navigator.vibrate) {
        navigator.vibrate(100);
      }
      
      // Visual feedback
      const scannerElement = document.getElementById("scanner");
      if (scannerElement) {
        scannerElement.style.borderColor = "#4CAF50";
        setTimeout(() => {
          scannerElement.style.borderColor = "#4CAF50";
        }, 1000);
      }
    }
  }
}

// Scan failure handler (silent)
function onScanFailure(error) {
  // Silent - scanning failures are normal when no QR code is in view
}

// Update scanner status
function updateScannerStatus(message, isActive) {
  const statusElement = document.querySelector('.scanner-status span');
  const dotElement = document.querySelector('.status-dot');
  
  if (statusElement) {
    statusElement.textContent = message;
  }
  
  if (dotElement) {
    dotElement.style.backgroundColor = isActive ? '#4CAF50' : '#dc3545';
  }
}

// Show camera error
function showCameraError(message) {
  const errorElement = document.getElementById("camera-error");
  const scannerElement = document.getElementById("scanner");
  
  if (errorElement && scannerElement) {
    errorElement.textContent = message;
    errorElement.style.display = "block";
    scannerElement.innerHTML = '<div style="padding: 40px; text-align: center; color: #666;">Camera not available</div>';
  }
}

// Update register button state
function updateRegisterButton() {
  const qrValueInput = document.getElementById("qrcodeValue");
  const registerBtn = document.getElementById("registerBtn");
  
  if (qrValueInput && registerBtn) {
    const qrValue = qrValueInput.value.trim();
    registerBtn.disabled = !qrValue;
    registerBtn.textContent = qrValue ? "✅ Register QR Code" : "⏳ Waiting for scan...";
  }
}

// Form submission handler
async function handleFormSubmission(e) {
  e.preventDefault();
  
  const qrcodeInput = document.getElementById("qrcodeValue");
  const nameInput = document.getElementById("personName");
  
  if (!qrcodeInput || !nameInput) return;
  
  const qrcode = qrcodeInput.value.trim();
  const name = nameInput.value.trim() || "Unnamed";
  
  if (!qrcode) return;

  try {
    const tx = db.transaction("records", "readwrite");
    const store = tx.objectStore("records");
    
    // Check for duplicate
    const existingRecord = await new Promise((resolve, reject) => {
      const request = store.get(qrcode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (existingRecord) {
      showWarning();
      return;
    }

    // Add new record with proper East African Time (GMT+3)
    const now = new Date();
    const newRecord = {
      qrcode: qrcode,
      name: name,
      timestamp: now.toISOString(),
      timezoneOffset: 180 // Store GMT+3 offset in minutes
    };

    await new Promise((resolve, reject) => {
      const request = store.put(newRecord);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Success feedback
    showSuccess();
    loadRecords();
    clearForm();
    
  } catch (error) {
    console.error("Registration error:", error);
    alert("Error registering QR code. Please try again.");
  }
}

// Show warning for duplicates
function showWarning() {
  const warningElement = document.getElementById("warning");
  if (warningElement) {
    warningElement.style.display = "block";
    
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }
    
    setTimeout(() => {
      warningElement.style.display = "none";
    }, 4000);
  }
}

// Show success feedback
function showSuccess() {
  const registerBtn = document.getElementById("registerBtn");
  if (registerBtn) {
    const originalText = registerBtn.textContent;
    
    registerBtn.textContent = "✅ Registered Successfully!";
    registerBtn.style.background = "linear-gradient(135deg, #28a745, #20c997)";
    
    setTimeout(() => {
      registerBtn.textContent = originalText;
      registerBtn.style.background = "linear-gradient(135deg, #4CAF50, #45a049)";
    }, 2000);

    if (navigator.vibrate) {
      navigator.vibrate(200);
    }
  }
}

// Clear form
function clearForm() {
  const qrcodeInput = document.getElementById("qrcodeValue");
  const nameInput = document.getElementById("personName");
  
  if (qrcodeInput) qrcodeInput.value = "";
  if (nameInput) nameInput.value = "";
  updateRegisterButton();
}

// Load and display records
async function loadRecords() {
  try {
    const tx = db.transaction("records", "readonly");
    const store = tx.objectStore("records");
    
    const records = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const recordsList = document.getElementById("recordsList");
    const recordsCount = document.getElementById("recordsCount");
    const exportBtn = document.getElementById("exportBtn");
    
    if (recordsCount) {
      recordsCount.textContent = records.length;
    }

    if (!recordsList) return;

    if (records.length === 0) {
      recordsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">📝</div>
          <p>No QR codes registered yet.<br>Scan your first code above!</p>
        </div>
      `;
      if (exportBtn) exportBtn.style.display = "none";
      return;
    }

    // Show export button when there are records
    if (exportBtn) exportBtn.style.display = "flex";

    // Sort by timestamp (newest first)
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    recordsList.innerHTML = records.map(record => {
      const displayDate = formatDisplayTime(record.timestamp);
      
      return `
        <div class="record-card">
          <div class="record-info">
            <div class="record-qr">${record.qrcode}</div>
            <div class="record-name">${record.name}</div>
            <div style="font-size: 11px; color: #888; margin-top: 3px; line-height: 1.3;">📅 ${displayDate}</div>
          </div>
          <div class="record-actions">
            <button class="btn btn-secondary" onclick="editRecord('${record.qrcode}')">
              ✏️ Edit
            </button>
            <button class="btn btn-danger" onclick="deleteRecord('${record.qrcode}')">
              🗑️ Delete
            </button>
          </div>
        </div>
      `;
    }).join("");

  } catch (error) {
    console.error("Error loading records:", error);
  }
}

// Edit record
window.editRecord = async function(qrcode) {
  try {
    const tx = db.transaction("records", "readwrite");
    const store = tx.objectStore("records");
    
    const record = await new Promise((resolve, reject) => {
      const request = store.get(qrcode);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!record) return;

    const newName = prompt("Edit name:", record.name);
    if (newName !== null && newName.trim() !== "") {
      record.name = newName.trim();
      
      await new Promise((resolve, reject) => {
        const request = store.put(record);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      
      loadRecords();
    }
  } catch (error) {
    console.error("Error editing record:", error);
    alert("Error editing record. Please try again.");
  }
};

// Delete record
window.deleteRecord = async function(qrcode) {
  if (!confirm("Are you sure you want to delete this record?")) return;

  try {
    const tx = db.transaction("records", "readwrite");
    const store = tx.objectStore("records");
    
    await new Promise((resolve, reject) => {
      const request = store.delete(qrcode);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
    
    loadRecords();
    
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
    
  } catch (error) {
    console.error("Error deleting record:", error);
    alert("Error deleting record. Please try again.");
  }
};

// Helper function to convert any timestamp to East African Time
function toEATTime(timestamp) {
  const date = timestamp ? new Date(timestamp) : new Date();
  
  // Create a new date object representing the same moment in EAT (UTC+3)
  // Get UTC time in milliseconds
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  // Add 3 hours (10800000 ms) for EAT
  const eatTime = new Date(utcTime + 10800000);
  
  return eatTime;
}

// Helper function to format time for display (12-hour format)
function formatDisplayTime(timestamp) {
  if (!timestamp) return 'Unknown date';
  
  const eatDate = toEATTime(timestamp);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 
                 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  
  const month = months[eatDate.getMonth()];
  const day = eatDate.getDate();
  const year = eatDate.getFullYear();
  
  let hours = eatDate.getHours();
  const minutes = eatDate.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  
  hours = hours % 12;
  hours = hours ? hours : 12; // 0 should be 12
  
  return `${month} ${day}, ${year}, ${hours}:${minutes} ${ampm} EAT`;
}

// Helper function to format time for CSV (24-hour format)
function formatCSVTime(timestamp) {
  if (!timestamp) return 'N/A';
  
  const eatDate = toEATTime(timestamp);
  
  const month = (eatDate.getMonth() + 1).toString().padStart(2, '0');
  const day = eatDate.getDate().toString().padStart(2, '0');
  const year = eatDate.getFullYear();
  const hours = eatDate.getHours().toString().padStart(2, '0');
  const minutes = eatDate.getMinutes().toString().padStart(2, '0');
  const seconds = eatDate.getSeconds().toString().padStart(2, '0');
  
  return `${month}/${day}/${year} ${hours}:${minutes}:${seconds} EAT`;
}

// Export to CSV function
window.exportToCSV = async function() {
  try {
    const exportBtn = document.getElementById("exportBtn");
    if (!exportBtn) return;
    
    const originalText = exportBtn.innerHTML;
    
    // Show loading state
    exportBtn.innerHTML = "⏳ Exporting...";
    exportBtn.disabled = true;
    
    const tx = db.transaction("records", "readonly");
    const store = tx.objectStore("records");
    
    const records = await new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (records.length === 0) {
      alert("No records to export!");
      exportBtn.innerHTML = originalText;
      exportBtn.disabled = false;
      return;
    }

    // Sort by timestamp (newest first)
    records.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Create CSV content with proper East African Time formatting
    const csvHeader = "Name,QR Code,Registration Date (EAT)\n";
    const csvRows = records.map(record => {
      const date = formatCSVTime(record.timestamp);
      // Escape commas and quotes in the data
      const escapedName = `"${(record.name || '').replace(/"/g, '""')}"`;
      const escapedQrcode = `"${(record.qrcode || '').replace(/"/g, '""')}"`;
      const escapedDate = `"${date.replace(/"/g, '""')}"`;
      return `${escapedName},${escapedQrcode},${escapedDate}`;
    }).join('\n');

    const csvContent = csvHeader + csvRows;

    // Multiple export methods for better compatibility including WebView APK
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `qr-registration-${timestamp}.csv`;

    // Method 1: Android WebView File API (for APK)
    if (window.Android && window.Android.saveFile) {
      try {
        const success = window.Android.saveFile(filename, csvContent, 'text/csv');
        if (success) {
          showExportSuccess(exportBtn, originalText);
          return;
        }
      } catch (e) {
        console.log("Android file API failed, trying other methods");
      }
    }

    // Method 2: Cordova/PhoneGap File API (for hybrid apps)
    if (window.cordova && window.cordova.file) {
      try {
        const writeFile = (fileEntry) => {
          fileEntry.createWriter((fileWriter) => {
            fileWriter.onwriteend = () => {
              showExportSuccess(exportBtn, originalText);
            };
            fileWriter.onerror = (e) => {
              console.error("File write failed: " + e.toString());
            };
            const blob = new Blob([csvContent], {type: 'text/csv'});
            fileWriter.write(blob);
          });
        };

        window.resolveLocalFileSystemURL(cordova.file.externalDownloadsDirectory || cordova.file.documentsDirectory, 
          (dirEntry) => {
            dirEntry.getFile(filename, {create: true, exclusive: false}, writeFile);
          }
        );
        return;
      } catch (e) {
        console.log("Cordova file API failed, trying other methods");
      }
    }

    // Method 3: Web Share API (for mobile sharing)
    if (navigator.share && navigator.canShare) {
      try {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const file = new File([blob], filename, { type: 'text/csv' });
        
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            title: 'QR Registration Data',
            text: 'QR codes registration data export',
            files: [file]
          });
          showExportSuccess(exportBtn, originalText);
          return;
        }
      } catch (e) {
        console.log("Web Share API failed, trying other methods");
      }
    }

    // Method 4: Try modern download API
    if (window.showSaveFilePicker) {
      try {
        const fileHandle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [{
            description: 'CSV files',
            accept: { 'text/csv': ['.csv'] }
          }]
        });
        const writable = await fileHandle.createWritable();
        await writable.write(csvContent);
        await writable.close();
        
        showExportSuccess(exportBtn, originalText);
        return;
      } catch (e) {
        // User cancelled or API not supported, try next method
        console.log("File picker not used, trying blob download");
      }
    }

    // Method 5: Blob download (most common)
    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      
      // For mobile Safari and other browsers that might not support download attribute
      if (navigator.userAgent.match(/iPhone|iPad|iPod/i)) {
        const reader = new FileReader();
        reader.onload = function() {
          const url = reader.result;
          const link = document.createElement('a');
          link.href = url;
          link.download = filename;
          link.target = '_blank';
          
          // Trigger download
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          showExportSuccess(exportBtn, originalText);
        };
        reader.readAsDataURL(blob);
        return;
      }

      // Standard blob download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      
      // Force click even if download attribute isn't supported
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      
      showExportSuccess(exportBtn, originalText);
      return;
      
    } catch (e) {
      console.error("Blob download failed:", e);
    }

    // Method 6: Data URL fallback
    try {
      const dataUrl = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent);
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.target = '_blank';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showExportSuccess(exportBtn, originalText);
      return;
      
    } catch (e) {
      console.error("Data URL download failed:", e);
    }

    // Method 7: Open in new window as last resort
    const encodedContent = encodeURIComponent(csvContent);
    const dataUrl = 'data:text/csv;charset=utf-8,' + encodedContent;
    window.open(dataUrl, '_blank');
    
    exportBtn.innerHTML = "✅ Opened in new tab";
    exportBtn.style.background = "linear-gradient(135deg, #28a745, #20c997)";
    
    setTimeout(() => {
      exportBtn.innerHTML = originalText;
      exportBtn.style.background = "linear-gradient(135deg, #2196F3, #1976D2)";
      exportBtn.disabled = false;
    }, 3000);

  } catch (error) {
    console.error("Export error:", error);
    alert(`Export failed: ${error.message}. Please try again or copy the data manually.`);
    
    const exportBtn = document.getElementById("exportBtn");
    if (exportBtn) {
      exportBtn.innerHTML = "📊 Export CSV";
      exportBtn.disabled = false;
      exportBtn.style.background = "linear-gradient(135deg, #2196F3, #1976D2)";
    }
  }
};

// Helper function for export success feedback
function showExportSuccess(exportBtn, originalText) {
  exportBtn.innerHTML = "✅ Exported!";
  exportBtn.style.background = "linear-gradient(135deg, #28a745, #20c997)";
  
  if (navigator.vibrate) {
    navigator.vibrate(200);
  }

  setTimeout(() => {
    exportBtn.innerHTML = originalText;
    exportBtn.style.background = "linear-gradient(135deg, #2196F3, #1976D2)";
    exportBtn.disabled = false;
  }, 2000);
}

// Initialize app
async function initApp() {
  try {
    await initDB();
    await initScanner();
    await loadRecords();
    updateRegisterButton();
    
    // Listen for input changes
    const qrValueInput = document.getElementById("qrcodeValue");
    if (qrValueInput) {
      qrValueInput.addEventListener("input", updateRegisterButton);
    }
    
    // Listen for form submission
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
      registerForm.addEventListener("submit", handleFormSubmission);
    }
    
  } catch (error) {
    console.error("App initialization error:", error);
  }
}

// Cleanup on page unload
window.addEventListener("beforeunload", function() {
  if (scanner && isScanning) {
    scanner.stop().catch(console.error);
  }
});

// Start the app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener("DOMContentLoaded", initApp);
} else {
  initApp();
}

// Export functions for external use
window.QRRegistrationApp = {
  initApp,
  initDB,
  initScanner,
  loadRecords,
  editRecord: window.editRecord,
  deleteRecord: window.deleteRecord,
  exportToCSV: window.exportToCSV
};