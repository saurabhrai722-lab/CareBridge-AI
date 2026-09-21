import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:drift/native.dart';
import 'package:mobile/data/database/database.dart';
import 'package:mobile/data/repositories/referral_repository.dart';

import 'package:mobile/features/referrals/referral_create_screen.dart';

void main() {
  late AppDatabase db;
  late ReferralRepository repository;

  setUp(() {
    db = AppDatabase(e: NativeDatabase.memory());
    repository = ReferralRepository(db);
  });

  tearDown(() async {
    await db.close();
  });

  testWidgets('Screen renders correctly', (WidgetTester tester) async {
    await tester.pumpWidget(MaterialApp(
      home: ReferralCreateScreen(repository: repository),
    ));

    await tester.pumpAndSettle();
    expect(find.text('New Referral'), findsOneWidget);
    expect(find.text('Patient Information'), findsOneWidget);
  });
}
