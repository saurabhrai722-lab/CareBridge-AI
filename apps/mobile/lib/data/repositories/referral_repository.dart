import 'package:drift/drift.dart';
import 'package:sqlite3/sqlite3.dart';
import '../../core/utils/referral_code_generator.dart';
import '../database/database.dart';

class ReferralWithPatient {
  final Referral referral;
  final Patient patient;
  ReferralWithPatient(this.referral, this.patient);
}

class ReferralRepository {
  final AppDatabase _db;

  ReferralRepository(this._db);

  Future<ReferralWithPatient> createReferral({
    required PatientsCompanion patient,
    required ReferralsCompanion referral,
  }) async {
    return _db.transaction(() async {
      final patientId = await _db.into(_db.patients).insert(patient);

      Referral? savedReferral;
      int attempts = 0;
      while (savedReferral == null && attempts < 5) {
        attempts++;
        final code = ReferralCodeGenerator.generate();
        try {
          final refToInsert = referral.copyWith(
            patientId: Value(patientId),
            referralCode: Value(code),
          );
          final referralId = await _db.into(_db.referrals).insert(refToInsert);
          savedReferral = await (_db.select(_db.referrals)..where((r) => r.id.equals(referralId))).getSingle();
        } on SqliteException catch (e) {
          if (e.extendedResultCode == 2067 || e.extendedResultCode == 1555 || e.message.contains("UNIQUE constraint failed")) {
            continue;
          }
          rethrow;
        }
      }

      if (savedReferral == null) {
        throw Exception("Failed to generate a unique referral code after 5 attempts.");
      }

      final savedPatient = await (_db.select(_db.patients)..where((p) => p.id.equals(patientId))).getSingle();
      return ReferralWithPatient(savedReferral, savedPatient);
    });
  }

  Stream<List<ReferralWithPatient>> watchReferrals() {
    final query = _db.select(_db.referrals).join([
      innerJoin(_db.patients, _db.patients.id.equalsExp(_db.referrals.patientId)),
    ])
    ..orderBy([OrderingTerm.desc(_db.referrals.createdAt)]);

    return query.watch().map((rows) {
      return rows.map((row) {
        return ReferralWithPatient(
          row.readTable(_db.referrals),
          row.readTable(_db.patients),
        );
      }).toList();
    });
  }

  Future<ReferralWithPatient?> getReferralByCode(String code) async {
    final query = _db.select(_db.referrals).join([
      innerJoin(_db.patients, _db.patients.id.equalsExp(_db.referrals.patientId)),
    ])..where(_db.referrals.referralCode.equals(code));
    
    final row = await query.getSingleOrNull();
    if (row == null) return null;
    return ReferralWithPatient(
      row.readTable(_db.referrals),
      row.readTable(_db.patients),
    );
  }
  
  Future<ReferralWithPatient?> getReferralById(int id) async {
    final query = _db.select(_db.referrals).join([
      innerJoin(_db.patients, _db.patients.id.equalsExp(_db.referrals.patientId)),
    ])..where(_db.referrals.id.equals(id));
    
    final row = await query.getSingleOrNull();
    if (row == null) return null;
    return ReferralWithPatient(
      row.readTable(_db.referrals),
      row.readTable(_db.patients),
    );
  }
}
