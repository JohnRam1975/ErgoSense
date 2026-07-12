# ErgoSense Mobile V2 (Flutter)

Aplicativo nativo Android e iOS — Módulo 18.

## Funções

- Captura foto e vídeo nativa
- MediaPipe / TFLite (MoveNet, BlazePose) offline
- ARCore / ARKit para medição ±2 cm
- SQLite local + sincronização automática com API ErgoSense

## Estrutura planejada

```
mobile/
  lib/
    main.dart
    screens/camera_screen.dart
    services/pose_service.dart
    services/sync_service.dart
```

## Desenvolvimento

Requer Flutter SDK 3.16+:

```bash
cd mobile
flutter create ergosense_mobile --org br.com.ergosense
flutter run
```

O PWA em `ergosense-app/` permanece como cliente web até o build Flutter estar completo.
