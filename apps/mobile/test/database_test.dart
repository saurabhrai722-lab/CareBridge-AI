import 'package:flutter_test/flutter_test.dart';
import 'package:drift/native.dart';
import 'package:mobile/data/database/database.dart';
import 'package:drift/drift.dart';

void main() {
  late AppDatabase db;

  setUp(() {
    db = AppDatabase(e: NativeDatabase.memory());
  });

  tearDown(() async {
    await db.close();
  });

  test('Patient can be inserted', () async {
    final id = await db.into(db.patients).insert(
      PatientsCompanion.insert(name: 'John Doe', phone: const Value('1234567890')),
    );
    
    final pat = await (db.select(db.patients)..where((p) => p.id.equals(id))).getSingle();
    expect(pat.name, 'John Doe');
    expect(pat.phone, '1234567890');
  });

  test('Referral can be inserted and joined', () async {
    final patientId = await db.into(db.patients).insert(
      PatientsCompanion.insert(name: 'Jane Doe'),
    );

    final refId = await db.into(db.referrals).insert(
      ReferralsCompanion.insert(
        referralCode: 'CB-123456',
        patientId: patientId,
        referringFacility: 'F1',
        receivingFacility: 'F2',
      ),
    );

    final ref = await (db.select(db.referrals)..where((r) => r.id.equals(refId))).getSingle();
    expect(ref.referralCode, 'CB-123456');
    expect(ref.status, 'CREATED');

    final query = db.select(db.referrals).join([
      innerJoin(db.patients, db.patients.id.equalsExp(db.referrals.patientId)),
    ])..where(db.referrals.id.equals(refId));

    final row = await query.getSingle();
    expect(row.readTable(db.patients).name, 'Jane Doe');
    expect(row.readTable(db.referrals).referringFacility, 'F1');
  });

  test('Referral code uniqueness is enforced', () async {
    final patientId = await db.into(db.patients).insert(
      PatientsCompanion.insert(name: 'Test'),
    );

    await db.into(db.referrals).insert(
      ReferralsCompanion.insert(
        referralCode: 'DUP123',
        patientId: patientId,
        referringFacility: 'F1',
        receivingFacility: 'F2',
      ),
    );

    expect(
      () => db.into(db.referrals).insert(
        ReferralsCompanion.insert(
          referralCode: 'DUP123',
          patientId: patientId,
          referringFacility: 'F3',
          receivingFacility: 'F4',
        ),
      ),
      throwsA(isA<Exception>()),
    );
  });
}
