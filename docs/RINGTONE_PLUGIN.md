# Plugin Capacitor pour les Sonneries Natives

Ce plugin permet aux utilisateurs de sélectionner des sonneries depuis leur téléphone Android.

## Installation côté Android

Après avoir exporté le projet sur GitHub et synchronisé avec Capacitor, vous devez ajouter le code natif suivant.

### Étape 1 : Créer le plugin natif

Créez le fichier `android/app/src/main/java/app/lovable/.../RingtonePlugin.java` :

```java
package app.lovable.YOUR_APP_ID;

import android.content.Intent;
import android.database.Cursor;
import android.media.Ringtone;
import android.media.RingtoneManager;
import android.net.Uri;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.ActivityCallback;

import org.json.JSONException;

@CapacitorPlugin(name = "RingtonePlugin")
public class RingtonePlugin extends Plugin {
    
    private Ringtone currentRingtone;
    private static final int RINGTONE_PICKER_REQUEST = 999;
    
    @PluginMethod
    public void getRingtones(PluginCall call) {
        try {
            RingtoneManager ringtoneManager = new RingtoneManager(getActivity());
            ringtoneManager.setType(RingtoneManager.TYPE_RINGTONE);
            Cursor cursor = ringtoneManager.getCursor();
            
            JSArray ringtones = new JSArray();
            
            while (cursor.moveToNext()) {
                String title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX);
                String uri = cursor.getString(RingtoneManager.URI_COLUMN_INDEX);
                String id = cursor.getString(RingtoneManager.ID_COLUMN_INDEX);
                
                JSObject ringtone = new JSObject();
                ringtone.put("id", id);
                ringtone.put("title", title);
                ringtone.put("uri", uri + "/" + id);
                ringtones.put(ringtone);
            }
            
            cursor.close();
            
            JSObject result = new JSObject();
            result.put("ringtones", ringtones);
            call.resolve(result);
            
        } catch (Exception e) {
            call.reject("Failed to get ringtones: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void playRingtone(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null) {
            call.reject("URI is required");
            return;
        }
        
        try {
            // Stop any currently playing ringtone
            if (currentRingtone != null && currentRingtone.isPlaying()) {
                currentRingtone.stop();
            }
            
            Uri ringtoneUri = Uri.parse(uriString);
            currentRingtone = RingtoneManager.getRingtone(getContext(), ringtoneUri);
            
            if (currentRingtone != null) {
                currentRingtone.play();
            }
            
            call.resolve();
            
        } catch (Exception e) {
            call.reject("Failed to play ringtone: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void stopRingtone(PluginCall call) {
        try {
            if (currentRingtone != null && currentRingtone.isPlaying()) {
                currentRingtone.stop();
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("Failed to stop ringtone: " + e.getMessage());
        }
    }
    
    @PluginMethod
    public void pickRingtone(PluginCall call) {
        Intent intent = new Intent(RingtoneManager.ACTION_RINGTONE_PICKER);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TYPE, RingtoneManager.TYPE_RINGTONE);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_TITLE, "Choisir une sonnerie");
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_SILENT, false);
        intent.putExtra(RingtoneManager.EXTRA_RINGTONE_SHOW_DEFAULT, true);
        
        startActivityForResult(call, intent, "handleRingtonePicker");
    }
    
    @ActivityCallback
    private void handleRingtonePicker(PluginCall call, android.app.ActivityResult result) {
        if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            Intent data = result.getData();
            if (data != null) {
                Uri ringtoneUri = data.getParcelableExtra(RingtoneManager.EXTRA_RINGTONE_PICKED_URI);
                if (ringtoneUri != null) {
                    Ringtone ringtone = RingtoneManager.getRingtone(getContext(), ringtoneUri);
                    String title = ringtone.getTitle(getContext());
                    
                    JSObject ringtoneObj = new JSObject();
                    ringtoneObj.put("id", ringtoneUri.getLastPathSegment());
                    ringtoneObj.put("title", title);
                    ringtoneObj.put("uri", ringtoneUri.toString());
                    
                    JSObject result2 = new JSObject();
                    result2.put("ringtone", ringtoneObj);
                    call.resolve(result2);
                    return;
                }
            }
        }
        
        JSObject result2 = new JSObject();
        result2.put("ringtone", null);
        call.resolve(result2);
    }
}
```

### Étape 2 : Enregistrer le plugin

Dans `android/app/src/main/java/.../MainActivity.java`, ajoutez :

```java
import app.lovable.YOUR_APP_ID.RingtonePlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        // Enregistrer le plugin
        registerPlugin(RingtonePlugin.class);
        
        super.onCreate(savedInstanceState);
    }
}
```

### Étape 3 : Synchroniser et recompiler

```bash
npx cap sync android
npx cap run android
```

## Fonctionnement

1. **Sur Web/PWA** : Le plugin utilise des sonneries prédéfinies simulées avec l'API Web Audio
2. **Sur Android** : Le plugin accède aux vraies sonneries du téléphone via `RingtoneManager`
3. **Prévisualisation** : L'utilisateur peut écouter un aperçu avant de sélectionner
4. **Sauvegarde** : La préférence est stockée dans la base de données

## Limitations

- La sonnerie personnalisée ne fonctionne que quand l'app est **ouverte**
- Quand l'app est fermée, c'est la notification système FCM qui gère le son
- iOS nécessite une implémentation différente avec `AVAudioPlayer`

## Interface utilisateur

Le composant `RingtoneSettingsCard` s'affiche dans la page "Mon compte" et permet :
- Voir la liste des sonneries disponibles
- Prévisualiser chaque sonnerie
- Sélectionner et sauvegarder sa préférence
- Ouvrir le sélecteur natif Android
