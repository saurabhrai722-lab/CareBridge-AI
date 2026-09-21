import 'dart:io';
import 'package:flutter/material.dart';
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
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: ReferralListScreen(repository: repository, syncService: syncService),
    );
  }
}
