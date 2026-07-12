// ErgoSense Mobile V2 — scaffold Flutter (Módulo 18)
// Execute: flutter create . && flutter run

import 'package:flutter/material.dart';

void main() {
  runApp(const ErgoSenseMobileApp());
}

class ErgoSenseMobileApp extends StatelessWidget {
  const ErgoSenseMobileApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ErgoSense V2',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFFE8A317)),
        useMaterial3: true,
      ),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatelessWidget {
  const HomeScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('ErgoSense V2')),
      body: const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: Text(
            'App mobile nativo — câmera, pose TFLite, AR e sync offline.\n'
            'Configure o projeto com: flutter create .',
            textAlign: TextAlign.center,
          ),
        ),
      ),
    );
  }
}
