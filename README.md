# QR Registration App

A comprehensive QR code registration system available in both web and mobile versions.

## Features

- **QR Code Scanning**: Real-time QR code scanning using device camera
- **Registration System**: Register QR codes with person names
- **Duplicate Detection**: Prevents duplicate QR code registrations
- **Records Management**: View, edit, and delete registered records
- **Data Export**: Export data to CSV format with East African Time (EAT)
- **Responsive Design**: Works on desktop and mobile devices
- **Offline Storage**: Data persists locally (IndexedDB for web, AsyncStorage for mobile)

## Available Versions

### 1. Web Version (JavaScript)

**Files:**
- `index.html` - Main web application
- `app.js` - JavaScript functionality
- `qr-manager.html` - Original standalone version

**Usage:**
1. Open `index.html` in a web browser
2. Allow camera permissions when prompted
3. Point camera at QR code to scan
4. Enter person's name and register
5. View and manage records in the bottom section

**Deployment:**
- Simply upload `index.html` and `app.js` to any web server
- No build process required
- Works offline after initial load

### 2. Mobile Version (React Native/Expo)

**Files:**
- `app/(tabs)/index.tsx` - Scanner screen
- `app/(tabs)/records.tsx` - Records management screen
- `app/(tabs)/_layout.tsx` - Tab navigation
- `app/_layout.tsx` - Root layout

**Usage:**
1. Install dependencies: `npm install`
2. Start development server: `npm run dev`
3. Use Expo Go app to scan QR code or run on simulator
4. Build for production: `npm run build:web`

## Technical Details

### Data Storage
- **Web**: IndexedDB with database name "qrRegistrationDB"
- **Mobile**: AsyncStorage with key "@qr_records"
- **Structure**: `{ qrcode: string, name: string, timestamp: string, timezoneOffset: number }`

### Timezone Handling
- All timestamps stored in UTC
- Displayed in East African Time (EAT/GMT+3)
- Consistent formatting across both versions

### Export Format
CSV with columns: Name, QR Code, Registration Date (EAT)

## Dependencies

### Web Version
- Html5-QRCode library (loaded from CDN)
- Modern browser with camera support

### Mobile Version
- React Native 0.79.1
- Expo SDK 53
- Expo Camera for QR scanning
- AsyncStorage for data persistence
- Various Expo modules (see package.json)

## Browser Compatibility

### Web Version
- Chrome 87+
- Firefox 85+
- Safari 14+
- Edge 87+
- Mobile browsers with camera support

### Features by Platform
- **Camera Access**: All modern browsers
- **Vibration**: Mobile browsers and PWA
- **File Download**: Desktop browsers
- **File Sharing**: Mobile browsers with Web Share API

## Security Considerations

- Camera permissions required for QR scanning
- Data stored locally on device
- No external data transmission
- HTTPS recommended for camera access in browsers

## Troubleshooting

### Camera Issues
- Ensure camera permissions are granted
- Check if camera is not being used by other apps
- Try refreshing the page/app
- Verify HTTPS connection for web version

### Data Issues
- Check browser storage settings
- Ensure sufficient storage space
- Clear browser cache if needed

### Export Issues
- Modern browsers support direct download
- Mobile devices may use share functionality
- Fallback to data URL if other methods fail

## Development

### Web Version
No build process required. Edit `app.js` directly.

### Mobile Version
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for web
npm run build:web

# Lint code
npm run lint
```

## License

This project is available for educational and personal use.