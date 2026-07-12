import 'package:flutter/material.dart';
import '../theme/ergosense_theme.dart';

class ErgoSenseApp extends StatelessWidget {
  const ErgoSenseApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'ErgoSense AI',
      debugShowCheckedModeBanner: false,
      theme: ErgoSenseTheme.dark,
      home: const _SplashPlaceholder(),
    );
  }
}

class _SplashPlaceholder extends StatelessWidget {
  const _SplashPlaceholder();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: ErgoSenseTheme.bg,
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text('ERGO', style: ErgoSenseTheme.logo.copyWith(color: Colors.white)),
            Text('SENSE', style: ErgoSenseTheme.logo.copyWith(color: ErgoSenseTheme.amber)),
            const SizedBox(height: 8),
            Text('AI · ERGONOMIA INDUSTRIAL', style: ErgoSenseTheme.subtitle),
          ],
        ),
      ),
    );
  }
}
