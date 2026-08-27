# BILL4PE — Mobile App (Expo / React Native)

Cross-platform (Android + iOS) client for the existing BILL4PE FastAPI backend.
One codebase, maximum shared code, native support for both platforms.

## Stack
- Expo SDK 51 + expo-router (file-based navigation, typed routes)
- TypeScript (strict)
- axios + expo-secure-store (Bearer token, never AsyncStorage for the token)
- expo-camera (UPI QR scan), expo-image-picker (proof screenshot),
  expo-file-system + expo-sharing + expo-web-browser (receipt PDF)
- react-native-safe-area-context (notch / Dynamic Island / gesture bar)

## Configure the API
The API base URL is read from (in order): `EXPO_PUBLIC_API_BASE_URL` env → `app.json > extra.apiBaseUrl` → default.
- Dev/preview (default): `https://invoice-locked.preview.emergentagent.com/api`
- Production: set in `.env` → `EXPO_PUBLIC_API_BASE_URL=https://api.bill4pay.com/api`

## Install
```bash
cd mobile
yarn install
```

## Run — Android
```bash
# Expo Go (fastest) — scan the QR with the Expo Go app
yarn android
# or a full native dev build (needed for camera/secure-store outside Expo Go)
npx expo run:android
```

## Run — iOS (macOS + Xcode required)
```bash
yarn ios
# or a full native dev build
npx expo run:ios
```

## Validate (no device needed)
```bash
yarn typecheck        # tsc --noEmit
npx expo-doctor       # 17/17 checks
npx expo export --platform web --output-dir /tmp/webcheck   # full bundle check
```

## Production builds (EAS)
```bash
npm i -g eas-cli && eas login
eas build:configure

# Android (.aab for Play Store / .apk for testing)
eas build --platform android --profile production

# iOS (.ipa for App Store / TestFlight — needs an Apple Developer account)
eas build --platform ios --profile production

# Submit
eas submit -p android
eas submit -p ios
```

## Identifiers (change before publishing)
- iOS `bundleIdentifier`: `com.bill4pe.app` (app.json)
- Android `package`: `com.bill4pe.app` (app.json)

## Permissions (configured in app.json, both platforms)
- Camera — scan merchant UPI QR
- Photo library — upload payment screenshot
- Microphone — voice expense entry (reserved)

## Screens
Auth: Login, Register, Phone-OTP (demo OTP `123456`).
Tabs: Home/Dashboard, Wallet, History, Profile.
Stack: New Expense, Pay (single-scan flow), Receipt (`bill/[id]`).

## Payment flow (single-scan, matches backend)
Scan merchant QR → firstScan → **awaiting_merchant_payment** → open UPI app & pay →
"Yes, payment done" → proof (12-digit UTR, or upload screenshot to auto-read the UTR
via Gemini) → generate (wallet-first fee) → receipt. `transaction_id` is persisted in
SecureStore and the flow resumes on app relaunch.
