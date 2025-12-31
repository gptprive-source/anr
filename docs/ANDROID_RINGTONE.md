# Sonnerie personnalisée pour appels entrants Android

## Configuration requise

Le fichier de sonnerie doit être placé dans le dossier des ressources Android natif.

### Étape 1 : Créer le dossier raw

Dans votre projet Android exporté, créez le dossier suivant s'il n'existe pas :
```
android/app/src/main/res/raw/
```

### Étape 2 : Ajouter le fichier audio

Placez votre fichier MP3 nommé **exactement** `ringtone.mp3` dans ce dossier :
```
android/app/src/main/res/raw/ringtone.mp3
```

**Contraintes du fichier :**
- Format : MP3 ou OGG
- Nom : `ringtone` (sans majuscules, sans espaces, sans caractères spéciaux)
- Durée recommandée : 5-15 secondes
- Taille recommandée : < 500 KB

### Étape 3 : Créer le canal de notification

Ajoutez ce code dans `android/app/src/main/java/.../MainActivity.java` :

```java
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.media.AudioAttributes;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        createNotificationChannels();
    }
    
    private void createNotificationChannels() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            
            // Canal pour les appels entrants avec sonnerie personnalisée
            NotificationChannel callChannel = new NotificationChannel(
                "incoming_calls",
                "Appels entrants",
                NotificationManager.IMPORTANCE_HIGH
            );
            callChannel.setDescription("Notifications pour les appels vidéo entrants");
            callChannel.enableVibration(true);
            callChannel.setVibrationPattern(new long[]{0, 500, 200, 500});
            
            // Définir la sonnerie personnalisée
            Uri soundUri = Uri.parse("android.resource://" + getPackageName() + "/raw/ringtone");
            AudioAttributes audioAttributes = new AudioAttributes.Builder()
                .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
                .setUsage(AudioAttributes.USAGE_NOTIFICATION_RINGTONE)
                .build();
            callChannel.setSound(soundUri, audioAttributes);
            
            notificationManager.createNotificationChannel(callChannel);
            
            // Canal par défaut
            NotificationChannel defaultChannel = new NotificationChannel(
                "default",
                "Notifications",
                NotificationManager.IMPORTANCE_DEFAULT
            );
            notificationManager.createNotificationChannel(defaultChannel);
        }
    }
}
```

### Étape 4 : Synchroniser et recompiler

```bash
npx cap sync android
npx cap run android
```

## Vérification

1. L'application doit être fermée (pas en arrière-plan)
2. Un visiteur scanne le code ANR
3. Vous devriez recevoir une notification avec votre sonnerie personnalisée
4. La vibration accompagne la sonnerie

## Dépannage

### La sonnerie par défaut joue au lieu de la personnalisée
- Vérifiez que le fichier s'appelle exactement `ringtone.mp3`
- Vérifiez qu'il est dans `res/raw/`
- Désinstallez l'app et réinstallez (les canaux sont créés à l'installation)

### Pas de son du tout
- Vérifiez que le volume de notification n'est pas en silencieux
- Vérifiez les permissions de notification dans les paramètres Android

### Le canal n'apparaît pas
- Le canal est créé au premier lancement de l'app après installation
- Allez dans Paramètres > Apps > ANR > Notifications pour vérifier
