import 'package:flutter/material.dart';
import '../../data/repositories/referral_repository.dart';
import '../../core/services/sync_service.dart';
import 'referral_create_screen.dart';
import 'referral_detail_screen.dart';

class ReferralListScreen extends StatelessWidget {
  final ReferralRepository repository;
  final SyncService syncService;

  const ReferralListScreen({super.key, required this.repository, required this.syncService});

  Color _getStatusColor(String status) {
    switch (status) {
      case 'CREATED': return Colors.grey.shade600;
      case 'SENT': return const Color(0xFF1E56A0);
      case 'RECEIVED': return const Color(0xFF7C3AED);
      case 'UNDER_REVIEW': return Colors.orange.shade700;
      case 'ADMITTED': return const Color(0xFF047857);
      case 'DISCHARGED': return Colors.lightBlue.shade700;
      case 'COMPLETED': return Colors.grey.shade600;
      default: return Colors.grey.shade600;
    }
  }

  Color _getStatusBgColor(String status) {
    switch (status) {
      case 'CREATED': return Colors.grey.shade100;
      case 'SENT': return const Color(0xFFEFF6FF);
      case 'RECEIVED': return const Color(0xFFF5F3FF);
      case 'UNDER_REVIEW': return Colors.orange.shade50;
      case 'ADMITTED': return const Color(0xFFECFDF5);
      case 'DISCHARGED': return Colors.lightBlue.shade50;
      case 'COMPLETED': return Colors.grey.shade100;
      default: return Colors.grey.shade100;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        title: const Text('PHC Care Grid', style: TextStyle(fontWeight: FontWeight.w800, letterSpacing: -0.5)),
        centerTitle: false,
        actions: [
          IconButton(
            icon: const Icon(Icons.sync_rounded),
            onPressed: () {
              syncService.syncAll(force: true);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Synchronizing with hospital node...', style: TextStyle(fontWeight: FontWeight.w600)),
                  backgroundColor: Color(0xFF0B1528),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
          ),
        ],
      ),
      body: StreamBuilder<List<ReferralWithPatient>>(
        stream: repository.watchReferrals(),
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator(color: Color(0xFF1E56A0)));
          }
          if (snapshot.hasError) {
            return Center(child: Text('Error: ${snapshot.error}'));
          }
          
          final referrals = snapshot.data ?? [];
          if (referrals.isEmpty) {
            return Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.folder_open_rounded, size: 64, color: Colors.grey.shade300),
                  const SizedBox(height: 16),
                  Text(
                    'No referrals saved locally.',
                    style: TextStyle(color: Colors.grey.shade600, fontWeight: FontWeight.w600),
                  ),
                ],
              ),
            );
          }

          return ListView.separated(
            padding: const EdgeInsets.all(16),
            itemCount: referrals.length,
            separatorBuilder: (context, index) => const SizedBox(height: 12),
            itemBuilder: (context, index) {
              final item = referrals[index];
              final hasOutcome = item.referral.outcomeNote != null;
              final statusColor = _getStatusColor(item.referral.status);
              final statusBgColor = _getStatusBgColor(item.referral.status);
              
              return InkWell(
                onTap: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(
                      builder: (context) => ReferralDetailScreen(referralWithPatient: item),
                    ),
                  );
                },
                borderRadius: BorderRadius.circular(12),
                child: Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.02),
                        blurRadius: 4,
                        offset: const Offset(0, 2),
                      )
                    ]
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Text(
                              item.patient.name,
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w800,
                                color: Color(0xFF0B1528),
                              ),
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                            decoration: BoxDecoration(
                              color: statusBgColor,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: statusColor.withOpacity(0.2)),
                            ),
                            child: Text(
                              item.referral.status.replaceAll('_', ' '),
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: statusColor,
                                letterSpacing: 0.5,
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        item.referral.referralCode.toUpperCase(),
                        style: TextStyle(
                          fontSize: 12,
                          fontFamily: 'monospace',
                          color: Colors.grey.shade500,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Icon(Icons.business_rounded, size: 14, color: Colors.grey.shade400),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              '${item.referral.referringFacility} → ${item.referral.receivingFacility}',
                              style: TextStyle(
                                fontSize: 13,
                                color: Colors.grey.shade700,
                                fontWeight: FontWeight.w500,
                              ),
                            ),
                          ),
                        ],
                      ),
                      if (hasOutcome) ...[
                        const SizedBox(height: 8),
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: Colors.grey.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.grey.shade200),
                          ),
                          child: Row(
                            children: [
                              const Icon(Icons.check_circle_outline, size: 14, color: Color(0xFF047857)),
                              const SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Outcome synced to hospital',
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey.shade600,
                                    fontWeight: FontWeight.w600,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
              );
            },
          );
        },
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: const Color(0xFF1E56A0),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('New Referral', style: TextStyle(fontWeight: FontWeight.bold)),
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
