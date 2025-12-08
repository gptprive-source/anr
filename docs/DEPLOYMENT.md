# Guide de Déploiement ANR - Application Native

Ce guide détaille les étapes pour déployer l'application ANR sur Android et iOS.

## Prérequis

- Node.js 18+
- npm ou bun
- Android Studio (pour Android)
- Xcode 15+ (pour iOS, Mac uniquement)
- Compte Apple Developer (pour iOS)
- Compte Google Play Developer (pour Android)

## 1. Préparation du Projet

```bash
# Cloner le projet depuis GitHub
git clone <votre-repo>
cd anr

# Installer les dépendances
npm install

# Build du projet web
npm run build

# Ajouter les plateformes natives
npx cap add android
npx cap add ios

# Synchroniser le projet
npx cap sync
```

## 2. Configuration Android

### 2.1 AndroidManifest.xml

Après `npx cap add android`, éditer `android/app/src/main/AndroidManifest.xml` :

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <!-- Permissions BLE -->
    <uses-permission android:name="android.permission.BLUETOOTH" android:maxSdkVersion="30"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" android:maxSdkVersion="30"/>
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" android:usesPermissionFlags="neverForLocation"/>
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT"/>
    <uses-permission android:name="android.permission.BLUETOOTH_ADVERTISE"/>
    
    <!-- Permissions Localisation (requises pour BLE sur Android < 12) -->
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION"/>
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION"/>
    
    <!-- Permissions Caméra/Microphone pour appels vidéo -->
    <uses-permission android:name="android.permission.CAMERA"/>
    <uses-permission android:name="android.permission.RECORD_AUDIO"/>
    <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS"/>
    
    <!-- Permissions Push Notifications -->
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS"/>
    <uses-permission android:name="android.permission.VIBRATE"/>
    <uses-permission android:name="android.permission.WAKE_LOCK"/>
    
    <!-- Permissions Internet -->
    <uses-permission android:name="android.permission.INTERNET"/>
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE"/>
    
    <!-- Déclaration des fonctionnalités BLE -->
    <uses-feature android:name="android.hardware.bluetooth_le" android:required="true"/>
    <uses-feature android:name="android.hardware.camera" android:required="false"/>
    <uses-feature android:name="android.hardware.camera.autofocus" android:required="false"/>

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/AppTheme"
        android:usesCleartextTraffic="true">

        <activity
            android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
            android:name=".MainActivity"
            android:label="@string/title_activity_main"
            android:theme="@style/AppTheme.NoActionBarLaunch"
            android:launchMode="singleTask"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
            <!-- Deep linking pour ANR -->
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="1863c081-bfa5-4b1f-8736-a4d11035460e.lovableproject.com" />
            </intent-filter>
        </activity>

        <!-- Firebase Cloud Messaging -->
        <service
            android:name="com.google.firebase.messaging.FirebaseMessagingService"
            android:exported="false">
            <intent-filter>
                <action android:name="com.google.firebase.MESSAGING_EVENT" />
            </intent-filter>
        </service>

        <provider
            android:name="androidx.core.content.FileProvider"
            android:authorities="${applicationId}.fileprovider"
            android:exported="false"
            android:grantUriPermissions="true">
            <meta-data
                android:name="android.support.FILE_PROVIDER_PATHS"
                android:resource="@xml/file_paths" />
        </provider>

    </application>
</manifest>
```

### 2.2 Firebase Configuration (Android)

1. Télécharger `google-services.json` depuis la console Firebase
2. Placer le fichier dans `android/app/google-services.json`
3. Vérifier que `android/build.gradle` contient :

```gradle
buildscript {
    dependencies {
        classpath 'com.google.gms:google-services:4.4.0'
    }
}
```

4. Vérifier que `android/app/build.gradle` contient :

```gradle
apply plugin: 'com.google.gms.google-services'

dependencies {
    implementation platform('com.google.firebase:firebase-bom:32.7.0')
    implementation 'com.google.firebase:firebase-messaging'
}
```

### 2.3 Build et Test Android

```bash
# Ouvrir dans Android Studio
npx cap open android

# Ou lancer directement sur device/émulateur
npx cap run android
```

## 3. Configuration iOS

### 3.1 Info.plist

Après `npx cap add ios`, éditer `ios/App/App/Info.plist` et ajouter :

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- ... clés existantes ... -->
    
    <!-- Permissions BLE -->
    <key>NSBluetoothAlwaysUsageDescription</key>
    <string>ANR utilise le Bluetooth pour communiquer avec les modules de porte connectés et permettre l'ouverture à distance.</string>
    <key>NSBluetoothPeripheralUsageDescription</key>
    <string>ANR utilise le Bluetooth pour communiquer avec les modules de porte connectés.</string>
    
    <!-- Permissions Localisation -->
    <key>NSLocationWhenInUseUsageDescription</key>
    <string>ANR utilise votre position pour vérifier que vous êtes à proximité de l'interphone lors des appels et pour l'ouverture de porte sécurisée.</string>
    <key>NSLocationAlwaysUsageDescription</key>
    <string>ANR utilise votre position pour les notifications de proximité et l'accès aux modules de porte.</string>
    <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
    <string>ANR utilise votre position pour vérifier votre proximité à l'interphone et aux modules de porte.</string>
    
    <!-- Permissions Caméra/Microphone -->
    <key>NSCameraUsageDescription</key>
    <string>ANR utilise la caméra pour transmettre votre vidéo lors des appels interphone et pour la vérification d'identité.</string>
    <key>NSMicrophoneUsageDescription</key>
    <string>ANR utilise le microphone pour les appels audio avec les résidents.</string>
    
    <!-- Push Notifications -->
    <key>UIBackgroundModes</key>
    <array>
        <string>fetch</string>
        <string>remote-notification</string>
        <string>audio</string>
        <string>bluetooth-central</string>
    </array>
    
    <!-- NFC -->
    <key>NFCReaderUsageDescription</key>
    <string>ANR utilise le NFC pour scanner les badges d'identification résidentielle.</string>
    <key>com.apple.developer.nfc.readersession.iso7816.select-identifiers</key>
    <array>
        <string>D2760000850101</string>
    </array>
    
    <!-- Deep Linking -->
    <key>CFBundleURLTypes</key>
    <array>
        <dict>
            <key>CFBundleURLSchemes</key>
            <array>
                <string>anr</string>
            </array>
        </dict>
    </array>
    
    <!-- Associated Domains pour Universal Links -->
    <key>com.apple.developer.associated-domains</key>
    <array>
        <string>applinks:1863c081-bfa5-4b1f-8736-a4d11035460e.lovableproject.com</string>
    </array>
</dict>
</plist>
```

### 3.2 Capabilities dans Xcode

1. Ouvrir le projet dans Xcode : `npx cap open ios`
2. Sélectionner le target "App"
3. Aller dans "Signing & Capabilities"
4. Ajouter les capabilities suivantes :
   - **Push Notifications**
   - **Background Modes** (Remote notifications, Background fetch, Audio, Uses Bluetooth LE accessories)
   - **Near Field Communication Tag Reading**
   - **Associated Domains** (applinks:votre-domaine.com)

### 3.3 Firebase Configuration (iOS)

1. Télécharger `GoogleService-Info.plist` depuis la console Firebase
2. Placer le fichier dans `ios/App/App/GoogleService-Info.plist`
3. Dans Xcode, faire glisser le fichier dans le projet et cocher "Copy items if needed"

### 3.4 Build et Test iOS

```bash
# Ouvrir dans Xcode
npx cap open ios

# Ou lancer directement sur simulateur
npx cap run ios
```

## 4. Cron Jobs Supabase

Les jobs planifiés doivent être configurés manuellement dans le SQL Editor de Supabase.

### 4.1 Activer les extensions requises

```sql
-- Dans le SQL Editor Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;
```

### 4.2 Créer les Cron Jobs

Exécuter dans le SQL Editor de Supabase (remplacer `YOUR_ANON_KEY` par la vraie clé) :

```sql
-- 1. Nettoyage des appels bloqués (toutes les 5 minutes)
SELECT cron.schedule(
  'cleanup-stale-calls',
  '*/5 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/cleanup-stale-calls',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renBkbXl5bWFiZ3NudHdtbWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzkxNjUsImV4cCI6MjA3OTg1NTE2NX0.mNNdq165aH8VP10MidxuRLM2_Ea3ZV85NjfobN7Ams0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 2. Purge RGPD quotidienne (à 3h du matin)
SELECT cron.schedule(
  'data-retention-cleanup',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/data-retention-cleanup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renBkbXl5bWFiZ3NudHdtbWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzkxNjUsImV4cCI6MjA3OTg1NTE2NX0.mNNdq165aH8VP10MidxuRLM2_Ea3ZV85NjfobN7Ams0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 3. Audit de sécurité quotidien (à 4h du matin)
SELECT cron.schedule(
  'security-audit',
  '0 4 * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/security-audit',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renBkbXl5bWFiZ3NudHdtbWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzkxNjUsImV4cCI6MjA3OTg1NTE2NX0.mNNdq165aH8VP10MidxuRLM2_Ea3ZV85NjfobN7Ams0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- 4. Sync Daily.co usage (toutes les heures)
SELECT cron.schedule(
  'sync-daily-usage',
  '0 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://mkzpdmyymabgsntwmmir.supabase.co/functions/v1/sync-daily-usage',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1renBkbXl5bWFiZ3NudHdtbWlyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNzkxNjUsImV4cCI6MjA3OTg1NTE2NX0.mNNdq165aH8VP10MidxuRLM2_Ea3ZV85NjfobN7Ams0"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
```

### 4.3 Vérifier les jobs créés

```sql
SELECT * FROM cron.job ORDER BY jobname;
```

## 5. Variables d'Environnement Production

Pour le déploiement en production, mettre à jour `.env` :

```env
VITE_SUPABASE_PROJECT_ID=mkzpdmyymabgsntwmmir
VITE_SUPABASE_URL=https://mkzpdmyymabgsntwmmir.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## 6. Build Production

### Android (AAB pour Play Store)

```bash
# Build web
npm run build

# Sync Capacitor
npx cap sync android

# Dans Android Studio : Build > Generate Signed Bundle
```

### iOS (Archive pour App Store)

```bash
# Build web
npm run build

# Sync Capacitor
npx cap sync ios

# Dans Xcode : Product > Archive
```

## 7. Checklist Pré-Déploiement

- [ ] Tous les secrets Supabase configurés
- [ ] `google-services.json` en place (Android)
- [ ] `GoogleService-Info.plist` en place (iOS)
- [ ] Permissions déclarées dans `AndroidManifest.xml`
- [ ] Permissions déclarées dans `Info.plist`
- [ ] Capabilities activées dans Xcode
- [ ] Cron jobs créés dans Supabase
- [ ] Icons et splash screens configurés
- [ ] Deep links testés
- [ ] Push notifications testées sur device réel
- [ ] BLE testé sur device réel
- [ ] Appels vidéo testés

## 8. Dépannage

### BLE ne fonctionne pas sur Android
- Vérifier que les permissions sont accordées dans les paramètres de l'app
- Sur Android 12+, les permissions BLUETOOTH_SCAN et BLUETOOTH_CONNECT sont requises
- Le Bluetooth et la localisation doivent être activés

### Push notifications ne marchent pas
- Vérifier la configuration Firebase
- Vérifier que le token est bien envoyé à Supabase (table `push_tokens`)
- Tester avec la console Firebase

### Appels vidéo échouent
- Vérifier les permissions caméra/micro
- Vérifier la connectivité réseau
- Consulter les logs Daily.co dans l'admin panel

---

**Dernière mise à jour :** Décembre 2024
