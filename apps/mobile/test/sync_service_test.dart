import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:drift/native.dart';
import 'package:drift/drift.dart';
import 'package:mobile/core/network/api_client.dart';
import 'package:mobile/core/services/sync_service.dart';
import 'package:mobile/data/database/database.dart';
import 'package:mocktail/mocktail.dart';
import 'package:connectivity_plus/connectivity_plus.dart';

class MockApiClient extends Mock implements ApiClient {}
class MockConnectivity extends Mock implements Connectivity {}

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();
  late AppDatabase db;
  late MockApiClient mockApiClient;
  late MockConnectivity mockConnectivity;
  late SyncService syncService;

  setUp(() {
    db = AppDatabase(e: NativeDatabase.memory());
    mockApiClient = MockApiClient();
    mockConnectivity = MockConnectivity();
    when(() => mockConnectivity.onConnectivityChanged).thenAnswer((_) => const Stream.empty());
    
    syncService = SyncService(db, mockApiClient, connectivity: mockConnectivity);
  });

  tearDown(() async {
    await db.close();
  });

  test('SyncService successful sync marks item COMPLETED', () async {
    final payload = jsonEncode({"test": "data"});
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-123',
    ));

    when(() => mockApiClient.post(any(), any())).thenAnswer((_) async => {"status": "ok"});

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'COMPLETED');
  });

  test('SyncService 500 error marks item FAILED_RETRY', () async {
    final payload = jsonEncode({"test": "data"});
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-123',
    ));

    when(() => mockApiClient.post(any(), any())).thenThrow(ApiException("Server error", 500));

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'FAILED_RETRY');
    expect(items.first.retryCount, 1);
  });

  test('SyncService 400 error marks item FAILED_PERMANENT', () async {
    final payload = jsonEncode({"test": "data"});
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-123',
    ));

    when(() => mockApiClient.post(any(), any())).thenThrow(ApiException("Bad request", 400));

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'FAILED_PERMANENT');
  });

  test('SyncService recovers stale IN_PROGRESS items', () async {
    final payload = jsonEncode({"test": "data"});
    // Insert item stuck IN_PROGRESS from 11 minutes ago
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-STALE',
      status: const Value('IN_PROGRESS'),
      updatedAt: Value(DateTime.now().subtract(const Duration(minutes: 11))),
    ));

    when(() => mockApiClient.post(any(), any())).thenAnswer((_) async => {"status": "ok"});

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'COMPLETED');
  });

  test('SyncService skips recent IN_PROGRESS items', () async {
    final payload = jsonEncode({"test": "data"});
    // Insert item stuck IN_PROGRESS from 2 minutes ago
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-FRESH',
      status: const Value('IN_PROGRESS'),
      updatedAt: Value(DateTime.now().subtract(const Duration(minutes: 2))),
    ));

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'IN_PROGRESS'); // Still in progress, not recovered
  });

  test('SyncService honors retry backoff', () async {
    final payload = jsonEncode({"test": "data"});
    // Retry count 2 -> requires 4 minutes wait. We set it to 2 minutes ago, so it should skip.
    await db.into(db.syncQueue).insert(SyncQueueCompanion.insert(
      operationType: 'CREATE_REFERRAL',
      payload: payload,
      referenceId: 'REF-BACKOFF',
      status: const Value('FAILED_RETRY'),
      retryCount: const Value(2),
      updatedAt: Value(DateTime.now().subtract(const Duration(minutes: 2))),
    ));

    await syncService.syncAll();

    final items = await db.select(db.syncQueue).get();
    expect(items.length, 1);
    expect(items.first.status, 'FAILED_RETRY'); // Still FAILED_RETRY
  });
}
