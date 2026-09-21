import 'package:drift/drift.dart';

class Patients extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get name => text()();
  TextColumn get phone => text().nullable()();
  TextColumn get dateOfBirth => text().nullable()();
  TextColumn get gender => text().nullable()();
  TextColumn get village => text().nullable()();
  TextColumn get guardianName => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class Referrals extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get referralCode => text().unique()();
  IntColumn get patientId => integer().customConstraint('NOT NULL REFERENCES patients(id)')();
  TextColumn get referringFacility => text()();
  TextColumn get receivingFacility => text()();
  TextColumn get reason => text().nullable()();
  TextColumn get status => text().withDefault(const Constant('CREATED'))();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}

class SyncQueue extends Table {
  IntColumn get id => integer().autoIncrement()();
  TextColumn get operationType => text()();
  TextColumn get payload => text()();
  TextColumn get referenceId => text()();
  TextColumn get status => text().withDefault(const Constant('PENDING'))();
  IntColumn get retryCount => integer().withDefault(const Constant(0))();
  TextColumn get errorMessage => text().nullable()();
  DateTimeColumn get createdAt => dateTime().withDefault(currentDateAndTime)();
  DateTimeColumn get updatedAt => dateTime().withDefault(currentDateAndTime)();
}
