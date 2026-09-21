import 'package:flutter/material.dart';
import 'data/database/database.dart';
import 'data/repositories/referral_repository.dart';
import 'features/referrals/referral_list_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  
  final db = AppDatabase();
  final repository = ReferralRepository(db);

  runApp(MyApp(repository: repository));
}

class MyApp extends StatelessWidget {
  final ReferralRepository repository;

  const MyApp({super.key, required this.repository});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'CareBridge AI',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: Colors.teal),
        useMaterial3: true,
      ),
      home: ReferralListScreen(repository: repository),
    );
  }
}
