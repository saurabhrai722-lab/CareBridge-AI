import 'dart:io';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'data/database/database.dart';
import 'data/repositories/referral_repository.dart';
import 'features/referrals/referral_list_screen.dart';
import 'core/network/api_client.dart';
import 'core/services/sync_service.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  final db = AppDatabase();
  final repository = ReferralRepository(db);
  
  final baseUrl = const String.fromEnvironment('API_URL', defaultValue: '');
  final defaultBaseUrl = Platform.isAndroid ? 'http://10.0.2.2:8000' : 'http://127.0.0.1:8000';
  final apiClient = ApiClient(baseUrl: baseUrl.isNotEmpty ? baseUrl : defaultBaseUrl);
  
  final syncService = SyncService(db, apiClient);

  // Initial sync on startup
  syncService.syncAll();

  runApp(MyApp(
    repository: repository,
    syncService: syncService,
  ));
}

class MyApp extends StatelessWidget {
  final ReferralRepository repository;
  final SyncService syncService;

  const MyApp({super.key, required this.repository, required this.syncService});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CareBridge AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF1E56A0), // brandBlue
          primary: const Color(0xFF1E56A0),
          secondary: const Color(0xFF047857), // brandGreen
          surface: const Color(0xFFFAFAFC), // bgLight
          onSurface: const Color(0xFF0B1528), // brandNavy
        ),
        scaffoldBackgroundColor: const Color(0xFFFAFAFC),
        textTheme: GoogleFonts.plusJakartaSansTextTheme(
          Theme.of(context).textTheme,
        ).apply(
          bodyColor: const Color(0xFF0B1528),
          displayColor: const Color(0xFF0B1528),
        ),
        appBarTheme: const AppBarTheme(
          backgroundColor: Color(0xFFFAFAFC),
          foregroundColor: Color(0xFF0B1528),
          elevation: 0,
          scrolledUnderElevation: 0,
          iconTheme: IconThemeData(color: Color(0xFF0B1528)),
        ),
        cardTheme: const CardThemeData(
          color: Colors.white,
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.all(Radius.circular(12)),
            side: BorderSide(color: Color(0xFFE2E8F0), width: 1),
          ),
        ),
        useMaterial3: true,
      ),
      home: ReferralListScreen(repository: repository, syncService: syncService),
    );
  }
}

