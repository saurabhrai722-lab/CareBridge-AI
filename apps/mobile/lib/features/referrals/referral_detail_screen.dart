import 'package:flutter/material.dart';
import '../../data/repositories/referral_repository.dart';

class ReferralDetailScreen extends StatelessWidget {
  final ReferralWithPatient referralWithPatient;

  const ReferralDetailScreen({super.key, required this.referralWithPatient});

  @override
  Widget build(BuildContext context) {
    final ref = referralWithPatient.referral;
    final pat = referralWithPatient.patient;

    return Scaffold(
      appBar: AppBar(title: Text(ref.referralCode)),
      body: ListView(
        padding: const EdgeInsets.all(16.0),
        children: [
          const Text('Status', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          Text(ref.status, style: const TextStyle(fontSize: 16)),
          const Divider(),
          
          const Text('Patient Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ListTile(title: const Text('Name'), subtitle: Text(pat.name)),
          ListTile(title: const Text('Phone'), subtitle: Text(pat.phone ?? 'N/A')),
          ListTile(title: const Text('DOB/Age'), subtitle: Text(pat.dateOfBirth ?? 'N/A')),
          ListTile(title: const Text('Gender'), subtitle: Text(pat.gender ?? 'N/A')),
          ListTile(title: const Text('Village'), subtitle: Text(pat.village ?? 'N/A')),
          ListTile(title: const Text('Guardian'), subtitle: Text(pat.guardianName ?? 'N/A')),
          const Divider(),
          
          const Text('Referral Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
          ListTile(title: const Text('Code'), subtitle: Text(ref.referralCode)),
          ListTile(title: const Text('From'), subtitle: Text(ref.referringFacility)),
          ListTile(title: const Text('To'), subtitle: Text(ref.receivingFacility)),
          ListTile(title: const Text('Reason'), subtitle: Text(ref.reason ?? 'N/A')),
          ListTile(title: const Text('Created At'), subtitle: Text(ref.createdAt.toString())),
        ],
      ),
    );
  }
}
