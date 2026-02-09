## Animal Seek Mobile (Expo)

Offline companion-finding app for outdoor/ski/backcountry use.

### Run

```bash
yarn install
yarn start
```

### iOS Dev Client (required for BLE/UWB ranging)

The **BLE discovery + UWB ranging** feature uses iOS native frameworks (CoreBluetooth + Nearby Interaction),
so it **will not work in Expo Go**. You need a **development build** (Dev Client).

#### One-time setup

- Install CocoaPods (if you don’t have it):

```bash
brew install cocoapods
# or:
sudo gem install cocoapods --no-document
```

#### Build + run on Simulator (recommended)

```bash
# Generate native projects (creates ./ios, ./android)
npx expo prebuild -p ios

cd ios
pod install
cd ..

# Build and install the dev client
npx expo run:ios

# Start Metro in dev-client mode
npx expo start --dev-client
```

Notes:
- If your shell prompt already shows `... animal-seek-mobile %`, then `cd ios` is the correct path (not `cd animal-seek-mobile/ios`).
- If `npx expo start --dev-client` says “No development build installed”, it means the dev client app hasn’t been built/installed yet.

### Backend URL

Defaults:

- **Local/dev**: `http://localhost:3001`
- **Production**: `https://animalsplit.com`

Override (recommended when using a physical phone):

- `EXPO_PUBLIC_API_BASE_URL`

Example:

```bash
EXPO_PUBLIC_API_BASE_URL="http://192.168.1.23:3001" yarn start
```

### Current features (WIP)

- Create / join **Seek Groups**
- Create / claim **Seek Members** per device (`deviceUuid`)
- Group detail with members list + occupied indicator
- GPS location sharing (**Start/Stop**) updates member `lastLatitude/lastLongitude`
- Member detail: shows **last location map** (+ self location dot)
- Ranging UI: directional arrow + distance + quality (mock fallback)
- iOS (Dev Client): BLE discovery + Nearby Interaction (UWB) ranging (early MVP)

---

## Deploy (EAS)

Profiles are defined in `eas.json`.

### Prereqs

```bash
npm i -g eas-cli
eas login
```

### Internal builds

```bash
eas build -p ios --profile internal-ios
eas build -p ios --profile internal-ios-simulator
eas build -p android --profile internal-android
```

### Add an iOS device for Ad Hoc (internal) builds

iOS **internal distribution** builds use an **Ad Hoc provisioning profile**, which must include every tester device’s **UDID**.

#### Option A (recommended): register via EAS CLI

```bash
# Creates a registration link you open on the iPhone to capture UDID
eas device:create
```

After the device is registered, run:

```bash
eas build -p ios --profile internal-ios
```

If EAS says the provisioning profile is missing the device, you typically need to **regenerate** the Ad Hoc profile (delete/recreate via `eas credentials -p ios` or let EAS prompt you during the build).

#### Option B: register manually in Apple Developer

- Apple Developer account → **Certificates, IDs & Profiles** → **Devices** → add the device UDID
- Then update/recreate the **Ad Hoc provisioning profile** to include the new device
- Rebuild with EAS (`internal-ios`)

#### Finding your UDID

- Xcode: **Window → Devices and Simulators** (connect device via USB, then copy the Identifier/UDID)

### Production builds

```bash
eas build -p ios --profile production
eas build -p android --profile production
```

### Submit

```bash
eas submit -p ios --profile production
eas submit -p android --profile production
```

---

## Troubleshooting

### `No development build (...) is installed`

You’re running in dev-client mode but haven’t installed the dev client app yet.
Run `npx expo run:ios` (Simulator) or create an EAS development build and install it on device.

### CocoaPods errors during prebuild / run:ios

If prebuild says CocoaPods couldn’t be installed automatically, install it yourself (see above), then:

```bash
cd ios
pod install
```

