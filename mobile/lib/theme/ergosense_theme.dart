import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

/// Design system fiel ao protótipo HTML ErgoSense
class ErgoSenseTheme {
  static const bg = Color(0xFF090C11);
  static const bg1 = Color(0xFF0E131C);
  static const amber = Color(0xFFFFA800);
  static const cyan = Color(0xFF00D4FF);
  static const green = Color(0xFF00E676);
  static const red = Color(0xFFFF3D3D);

  static ThemeData get dark => ThemeData(
        brightness: Brightness.dark,
        scaffoldBackgroundColor: bg,
        colorScheme: const ColorScheme.dark(
          primary: amber,
          secondary: cyan,
          surface: bg1,
          error: red,
        ),
        textTheme: GoogleFonts.dmSansTextTheme(
          ThemeData.dark().textTheme,
        ),
        useMaterial3: true,
      );

  static TextStyle get logo => GoogleFonts.barlowCondensed(
        fontSize: 44,
        fontWeight: FontWeight.w900,
        letterSpacing: 6,
      );

  static TextStyle get subtitle => GoogleFonts.barlowCondensed(
        fontSize: 12,
        fontWeight: FontWeight.w600,
        letterSpacing: 4,
        color: const Color(0xFF8A96AA),
      );
}
