# ANR Door Unit - Protocole BLE

## Service GATT ANR

### UUIDs

```
Service ANR:        0000a0a0-0000-1000-8000-00805f9b34fb
ANR_TOKEN_WRITE:    0000a0a1-0000-1000-8000-00805f9b34fb
ANR_RESULT_NOTIFY:  0000a0a2-0000-1000-8000-00805f9b34fb
ANR_TIME_SYNC:      0000a0a3-0000-1000-8000-00805f9b34fb
```

## Flux d'ouverture de porte

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Backend   │                    │  App Mobile │                    │  ESP32 Door │
│  (Supabase) │                    │ (Capacitor) │                    │    Unit     │
└──────┬──────┘                    └──────┬──────┘                    └──────┬──────┘
       │                                  │                                  │
       │  1. POST /generate-door-token    │                                  │
       │<─────────────────────────────────│                                  │
       │                                  │                                  │
       │  2. Return JWS ES256 token       │                                  │
       │─────────────────────────────────>│                                  │
       │                                  │                                  │
       │                                  │  3. Scan BLE, connect            │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │  4. Write token to ANR_TOKEN     │
       │                                  │─────────────────────────────────>│
       │                                  │                                  │
       │                                  │              5. Verify signature │
       │                                  │                 Check constraints│
       │                                  │                 Activate relay   │
       │                                  │                                  │
       │                                  │  6. Notify result (ANR_RESULT)   │
       │                                  │<─────────────────────────────────│
       │                                  │                                  │
       │  7. POST /validate-door-token    │                                  │
       │<─────────────────────────────────│                                  │
       │     (log access event)           │                                  │
       │                                  │                                  │
```

## Caractéristique: ANR_TOKEN_WRITE

### Propriétés
- **UUID**: `0000a0a1-0000-1000-8000-00805f9b34fb`
- **Permissions**: Write with encryption required
- **Format**: UTF-8 string (JWS compact)

### Payload
Token JWS compact format:
```
eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJhbnJfaWQiOiJBTlJfMDEyMzQ1IiwidG9rZW5faWQiOiJ1dWlkLXY0IiwicmVzX2lkIjoicmVzaWRlbnRfdXNlcl9pZCIsImlzc3VlZF9hdCI6MTcxMDAwMDAwMCwidmFsaWRfZnJvbSI6MTcxMDAwMDAwMCwidmFsaWRfdW50aWwiOjE3MTAwMDAwMzAsIm1vZGUiOiJTSU5HTEUiLCJub25jZSI6IjMyLWNoYXItaGV4LXN0cmluZyJ9.SIGNATURE_BASE64URL
```

### Fragmentation
Pour tokens > 512 bytes, utiliser Write Long ou chunked writes.

## Caractéristique: ANR_RESULT_NOTIFY

### Propriétés
- **UUID**: `0000a0a2-0000-1000-8000-00805f9b34fb`
- **Permissions**: Notify
- **Format**: JSON UTF-8

### Payload success
```json
{
  "result": "OK",
  "code": 200,
  "timestamp": 1710000000,
  "token_id": "uuid-from-token",
  "relay_duration_ms": 800
}
```

### Payload error
```json
{
  "result": "EXPIRED",
  "code": 101,
  "timestamp": 1710000000,
  "token_id": "uuid-from-token",
  "error_details": "Token expired 30 seconds ago"
}
```

## Caractéristique: ANR_TIME_SYNC

### Propriétés
- **UUID**: `0000a0a3-0000-1000-8000-00805f9b34fb`
- **Permissions**: Write
- **Format**: ASCII epoch seconds

### Usage
```
Write: "1710000000"
```

Le device ajuste son horloge RTC interne.

## Sécurité BLE

### Pairing
- LE Secure Connections (LESC) requis
- Mode 1 Level 4 (authenticated encryption)
- Bonding optionnel pour devices de confiance

### RSSI Check
```c
// Vérification à la connexion
int8_t rssi;
esp_ble_gap_read_rssi(conn_id, &rssi);
if (rssi < RSSI_THRESHOLD_DBM) {
    reject_connection();
}
```

### Rate Limiting
- Max 1 token write per 2 seconds
- Max 10 failed attempts per minute → 5 min lockout

## Intégration Capacitor

### Plugin recommandé
`@capacitor-community/bluetooth-le`

### Exemple code TypeScript
```typescript
import { BleClient } from '@capacitor-community/bluetooth-le';

const ANR_SERVICE_UUID = '0000a0a0-0000-1000-8000-00805f9b34fb';
const ANR_TOKEN_CHAR_UUID = '0000a0a1-0000-1000-8000-00805f9b34fb';
const ANR_RESULT_CHAR_UUID = '0000a0a2-0000-1000-8000-00805f9b34fb';

async function openDoor(deviceId: string, token: string) {
  // Connect
  await BleClient.connect(deviceId);
  
  // Subscribe to notifications
  await BleClient.startNotifications(
    deviceId,
    ANR_SERVICE_UUID,
    ANR_RESULT_CHAR_UUID,
    (value) => {
      const result = JSON.parse(new TextDecoder().decode(value));
      console.log('Door result:', result);
    }
  );
  
  // Write token
  const tokenBytes = new TextEncoder().encode(token);
  await BleClient.write(
    deviceId,
    ANR_SERVICE_UUID,
    ANR_TOKEN_CHAR_UUID,
    tokenBytes
  );
}
```

## Debugging

### Logs ESP32
```c
ESP_LOGI(TAG, "Token received, length=%d", len);
ESP_LOGI(TAG, "Signature verify: %s", ok ? "PASS" : "FAIL");
ESP_LOGI(TAG, "Relay activated for %d ms", RELAY_PULSE_MS);
```

### nRF Connect (test)
1. Scan for "ANR_XXXXXX"
2. Connect
3. Find service 0000a0a0-...
4. Enable notifications on 0000a0a2-...
5. Write token to 0000a0a1-...
6. Observe notification response
