import 'dart:convert';
import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:drift/drift.dart';
import '../../data/database/database.dart';
import '../network/api_client.dart';

class SyncService {
  final AppDatabase _db;
  final ApiClient _apiClient;
  final Connectivity _connectivity;
  bool _isSyncing = false;

  SyncService(this._db, this._apiClient, {Connectivity? connectivity})
      : _connectivity = connectivity ?? Connectivity() {
    _connectivity.onConnectivityChanged.listen((List<ConnectivityResult> results) {
      if (results.isNotEmpty && results.first != ConnectivityResult.none) {
        syncAll();
      }
    });
  }

  Future<void> syncAll() async {
    if (_isSyncing) return;
    _isSyncing = true;

    try {
      final now = DateTime.now();
      // Recover IN_PROGRESS items older than 10 minutes
      final timeoutThreshold = now.subtract(const Duration(minutes: 10));

      final items = await (_db.select(_db.syncQueue)
            ..where((t) =>
                t.status.equals('PENDING') |
                t.status.equals('FAILED_RETRY') |
                (t.status.equals('IN_PROGRESS') & t.updatedAt.isSmallerThanValue(timeoutThreshold)))
            ..orderBy([(t) => OrderingTerm.asc(t.createdAt)]))
          .get();

      for (final item in items) {
        // Backoff for FAILED_RETRY: wait (retryCount * 2) minutes before retrying
        if (item.status == 'FAILED_RETRY' && item.retryCount > 0) {
          final waitDuration = Duration(minutes: item.retryCount * 2);
          if (item.updatedAt.add(waitDuration).isAfter(now)) {
            continue; // Skip, not enough time has passed
          }
        }
        await _syncItem(item);
      }
    } finally {
      _isSyncing = false;
    }
  }

  Future<void> _syncItem(SyncQueueData item) async {
    await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
        .write(SyncQueueCompanion(
            status: const Value('IN_PROGRESS'),
            updatedAt: Value(DateTime.now())));

    try {
      if (item.operationType == 'CREATE_REFERRAL') {
        final payload = jsonDecode(item.payload);
        await _apiClient.post('/api/v1/referrals', payload);
      }
      
      await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
          .write(SyncQueueCompanion(
              status: const Value('COMPLETED'),
              updatedAt: Value(DateTime.now())));
    } on ApiException catch (e) {
      await _handleApiException(e, item);
    } catch (e) {
      // Network exceptions (SocketException, TimeoutException) or other unhandled errors -> FAILED_RETRY
      await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
          .write(SyncQueueCompanion(
              status: const Value('FAILED_RETRY'),
              retryCount: Value(item.retryCount + 1),
              errorMessage: Value(e.toString()),
              updatedAt: Value(DateTime.now())));
    }
  }

  Future<void> _handleApiException(ApiException e, SyncQueueData item) async {
    final status = e.statusCode;
    if (status == 408 || status == 429 || status >= 500) {
      // Retryable errors
      await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
          .write(SyncQueueCompanion(
              status: const Value('FAILED_RETRY'),
              retryCount: Value(item.retryCount + 1),
              errorMessage: Value(e.message),
              updatedAt: Value(DateTime.now())));
    } else if (status == 400 || status == 422 || status == 401 || status == 403 || status == 409) {
      // Permanent errors
      await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
          .write(SyncQueueCompanion(
              status: const Value('FAILED_PERMANENT'),
              errorMessage: Value(e.message),
              updatedAt: Value(DateTime.now())));
    } else {
      // Treat other 4xx statuses as permanent errors unless they fit the retry profile
      await (_db.update(_db.syncQueue)..where((t) => t.id.equals(item.id)))
          .write(SyncQueueCompanion(
              status: const Value('FAILED_PERMANENT'),
              errorMessage: Value(e.message),
              updatedAt: Value(DateTime.now())));
    }
  }
}
