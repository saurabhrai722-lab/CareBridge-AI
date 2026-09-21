import 'package:flutter/material.dart';
import '../../data/repositories/referral_repository.dart';
import 'referral_create_screen.dart';
import 'referral_detail_screen.dart';

class ReferralListScreen extends StatelessWidget {
  final ReferralRepository repository;

  const ReferralListScreen({super.key, required this.repository});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Offline Referrals')),
      body: StreamBuilder<List<ReferralWithPatient>>(
        stream: repository.watchReferrals(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          
          final referrals = snapshot.data ?? [];
          if (referrals.isEmpty) {
            return const Center(child: Text('No referrals saved locally.'));
          }

          return ListView.builder(
            itemCount: referrals.length,
            itemBuilder: (context, index) {
              final item = referrals[index];
              return ListTile(
                title: Text('${item.patient.name} (${item.referral.referralCode})'),
                subtitle: Text('${item.referral.referringFacility} -> ${item.referral.receivingFacility} \nStatus: ${item.referral.status}'),
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ReferralDetailScreen(referralWithPatient: item),
                    ),
                  );
                },
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton(
        child: const Icon(Icons.add),
        onPressed: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => ReferralCreateScreen(repository: repository),
            ),
          );
        },
      ),
    );
  }
}
