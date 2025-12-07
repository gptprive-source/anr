# ANR Door Unit - Spécifications Firmware ESP32

## 1. Résumé exécutif

Dispositif ANR Door Unit : reçoit un JWS ES256 (token signé par backend) via BLE, vérifie signature & contraintes (ANR_ID, fenêtres temporelles, nonce unique, RSSI), active un relais contact-sec, journalise l'événement (log chiffré), supporte OTA signée et stocke clés en ATECC608B + Secure Boot / Flash Encryption activés.

## 2. Choix techniques recommandés (production)

| Composant | Choix | Notes |
|-----------|-------|-------|
| MCU | ESP32-S3 | Crypto accel, BLE5, support IDF |
| Secure Element | Microchip ATECC608B | I²C |
| Signature token | JWS ES256 | ECDSA P-256 |
| OTA | esp_https_ota | Signature ECDSA vérifiée |
| Relay | SRD-05VDC-SL-C | Contact sec, MOSFET driver |
| Stockage local | NVS / LittleFS | Logs chiffrés |
| Build system | ESP-IDF v4.4+ ou 5.x | CI signing step |

## 3. Structure du repo firmware

```
anr-door-firmware/
├─ CMakeLists.txt
├─ sdkconfig.defaults
├─ README.md
├─ components/
│  ├─ anr_ble/
│  │   ├─ include/anr_ble.h
│  │   └─ anr_ble.c
│  ├─ anr_crypto/
│  │   ├─ include/anr_crypto.h
│  │   └─ anr_crypto.c
│  ├─ anr_nvs/
│  │   ├─ include/anr_nvs.h
│  │   └─ anr_nvs.c
│  ├─ anr_relay/
│  │   ├─ include/anr_relay.h
│  │   └─ anr_relay.c
│  └─ anr_ota/
│      ├─ include/anr_ota.h
│      └─ anr_ota.c
└─ main/
   ├─ main.c
   └─ anr_config.h
provisioning/
  ├─ provision_device.py
  └─ README_provisioning.md
tools/
  └─ sign_token.py
```

## 4. Format Token JWS ES256

### Header
```json
{"alg":"ES256","typ":"JWT"}
```

### Payload
```json
{
  "anr_id": "ANR_012345",
  "token_id": "uuid-v4",
  "res_id": "resident_user_id",
  "issued_at": 1710000000,
  "valid_from": 1710000000,
  "valid_until": 1710000030,
  "mode": "SINGLE",
  "nonce": "32-char-hex-string"
}
```

### Signature
- ECDSA P-256 (secp256r1)
- Format: raw r||s (64 bytes) encodé base64url

## 5. Spécifications BLE / GATT

### Service ANR
- **UUID**: `0000a0a0-0000-1000-8000-00805f9b34fb`

### Caractéristiques

| Nom | UUID | Type | Description |
|-----|------|------|-------------|
| ANR_TOKEN_WRITE | `0000a0a1-...` | WriteEncrypted | Client écrit token JWS compact |
| ANR_RESULT_NOTIFY | `0000a0a2-...` | Notify | Serveur notifie résultat JSON |
| ANR_TIME_SYNC | `0000a0a3-...` | Write | Sync horloge (epoch seconds) |

### Sécurité BLE
- Require LE Secure Connections
- Encryption obligatoire
- RSSI threshold: -75 dBm (configurable)

## 6. Codes de résultat NOTIFY

| Code | Nom | Description |
|------|-----|-------------|
| 200 | OK | Porte ouverte avec succès |
| 100 | SIGN_ERR | Signature invalide |
| 101 | EXPIRED | Token expiré |
| 102 | NOT_YET | Token pas encore valide |
| 103 | REPLAY | Nonce déjà utilisé |
| 104 | ANR_ID_MISMATCH | ANR_ID ne correspond pas |
| 105 | RSSI_FAIL | Signal BLE trop faible |

### Format réponse
```json
{
  "result": "OK",
  "code": 200,
  "timestamp": 1710000000,
  "token_id": "..."
}
```

## 7. Configuration hardware

```c
#define ANR_DEVICE_ID        "ANR_012345"   // provision per device
#define RELAY_GPIO           23             // pin relais
#define RELAY_PULSE_MS       800            // durée impulsion
#define RSSI_THRESHOLD_DBM   -75            // seuil RSSI
#define NONCE_RING_SIZE      512            // taille ring buffer nonces
```

## 8. BOM & Coûts estimés

| Composant | Qté | PU (€) | Notes |
|-----------|-----|--------|-------|
| ESP32-S3 module | 1 | 28-35 | ou DevKit tests |
| ATECC608B (SMD) | 1 | 2.5-5 | breakout ~8€ |
| Relay 1ch | 1 | 2-4 | SRD-05VDC |
| MOSFET driver | 1 | 0.5-2 | |
| Buck 12→5V | 1 | 3-8 | |
| PCB | 1 | 6-12 | small run |
| Boîtier IP54 | 1 | 2-6 | 120×80×40 |
| Antenne | 1 | 0.5-2 | |
| Borniers, visserie | - | 1-3 | |

**Total estimé**: ~50-75 € / unité (volumes faibles)

## 9. Secure Boot & Flash Encryption

### Provisioning (usine)
1. Hardware assemblé
2. Connect provisioning station
3. Run `provision_device.py`:
   - Générer clé device dans ATECC
   - Écrire signer_pubkey dans slot
   - Écrire ota_pubkey
   - Écrire ANR_DEVICE_ID dans NVS
4. Burn efuse (production uniquement)

### Activation Secure Boot
1. Générer keypair secure boot
2. Signer bootloader & app
3. Burn digest dans efuse
4. Activer Flash Encryption

⚠️ **ATTENTION**: Burning efuses est IRRÉVERSIBLE

## 10. Plan de livraison firmware

| Semaine | Livrables |
|---------|-----------|
| 0 | Kickoff, choix hardware, config CI |
| 1-2 | BLE + JWS verify + relay + NVS (MVP) |
| 3-4 | ATECC, provisioning, time sync, logs |
| 5-6 | OTA signée, Secure Boot, tests terrain |
| 7-8 | Pen-test, documentation, pilote |
