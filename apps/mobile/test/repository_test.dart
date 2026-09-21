import 'package:flutter_test/flutter_test.dart';
import 'package:drift/native.dart';
import 'package:mobile/data/database/database.dart';
import 'package:mobile/data/repositories/referral_repository.dart';

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

  test('Create referral through repository', () async {
    final result = await repository.createReferral(
      patient: PatientsCompanion.insert(name: 'Alice'),
      referral: ReferralsCompanion.insert(
        referringFacility: 'Clinic A',
        receivingFacility: 'Hospital B',
        referralCode: '',
        patientId: 0,
      ),
    );

    expect(result.patient.name, 'Alice');
    expect(result.referral.referralCode.startsWith('CB-'), isTrue);
    expect(result.referral.status, 'CREATED');
  });

  test('Retrieve referral through repository', () async {
    final result = await repository.createReferral(
      patient: PatientsCompanion.insert(name: 'Bob'),
      referral: ReferralsCompanion.insert(
        referringFacility: 'F1',
        receivingFacility: 'F2',
        referralCode: '',
        patientId: 0,
      ),
    );

    final retrieved = await repository.getReferralByCode(result.referral.referralCode);
    expect(retrieved, isNotNull);
    expect(retrieved!.patient.name, 'Bob');
  });
  
  test('List referrals', () async {
    await repository.createReferral(
      patient: PatientsCompanion.insert(name: 'P1'),
      referral: ReferralsCompanion.insert(
        referringFacility: 'F1',
        receivingFacility: 'F2',
        referralCode: '',
        patientId: 0,
      ),
    );

    final stream = repository.watchReferrals();
    final firstEmission = await stream.first;
    expect(firstEmission.length, 1);
    expect(firstEmission[0].patient.name, 'P1');
  });
}
