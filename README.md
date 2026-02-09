## Animal Seek Mobile (Expo)

Offline companion-finding app for outdoor/ski/backcountry use.

### Run

```bash
yarn install
yarn start
```

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
- Mock ranging UI (direction + distance + connection quality)

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

