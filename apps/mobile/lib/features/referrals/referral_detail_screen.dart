import 'package:flutter/material.dart';
import '../../data/repositories/referral_repository.dart';

class ReferralDetailScreen extends StatelessWidget {
  final ReferralWithPatient referralWithPatient;

  const ReferralDetailScreen({super.key, required this.referralWithPatient});

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

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12, top: 24),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF1E56A0)),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E56A0),
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildInfoRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: TextStyle(
              fontSize: 10,
              fontWeight: FontWeight.bold,
              color: Colors.grey.shade500,
              letterSpacing: 0.5,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.w600,
              color: Color(0xFF0B1528),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCard({required Widget child}) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 8,
            offset: const Offset(0, 4),
          )
        ],
      ),
      child: child,
    );
  }

  @override
  Widget build(BuildContext context) {
    final ref = referralWithPatient.referral;
    final pat = referralWithPatient.patient;
    
    final statusColor = _getStatusColor(ref.status);
    final statusBgColor = _getStatusBgColor(ref.status);

    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        title: Text(
          ref.referralCode.toUpperCase(),
          style: const TextStyle(
            fontWeight: FontWeight.w600, 
            fontFamily: 'monospace',
            letterSpacing: 1,
            fontSize: 16,
          ),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(20.0),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            
            // Header Card
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0B1528), Color(0xFF1E293B)],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(16),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                        decoration: BoxDecoration(
                          color: statusBgColor,
                          borderRadius: BorderRadius.circular(20),
                        ),
                        child: Text(
                          ref.status.replaceAll('_', ' '),
                          style: TextStyle(
                            fontSize: 11,
                            fontWeight: FontWeight.w900,
                            color: statusColor,
                            letterSpacing: 1,
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    pat.name,
                    style: const TextStyle(
                      fontSize: 24,
                      fontWeight: FontWeight.w800,
                      color: Colors.white,
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    children: [
                      const Icon(Icons.business, color: Colors.white70, size: 14),
                      const SizedBox(width: 6),
                      Text(
                        '${ref.referringFacility} → ${ref.receivingFacility}',
                        style: const TextStyle(
                          fontSize: 14,
                          color: Colors.white70,
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),

            if (ref.outcomeNote != null) ...[
              const SizedBox(height: 24),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(12),
                  border: Border.all(color: const Color(0xFF047857).withOpacity(0.2)),
                ),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check_circle, color: Color(0xFF047857)),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Hospital Outcome Available',
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF047857),
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            ref.outcomeNote!,
                            style: TextStyle(
                              fontSize: 14,
                              color: const Color(0xFF047857).withOpacity(0.8),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ],
            
            _buildSectionTitle('PATIENT INFORMATION', Icons.person),
            _buildCard(
              child: Column(
                children: [
                  Row(
                    children: [
                      Expanded(child: _buildInfoRow('Date of Birth / Age', pat.dateOfBirth ?? 'N/A')),
                      Expanded(child: _buildInfoRow('Gender', pat.gender ?? 'N/A')),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(child: _buildInfoRow('Phone', pat.phone ?? 'N/A')),
                      Expanded(child: _buildInfoRow('Village', pat.village ?? 'N/A')),
                    ],
                  ),
                  Row(
                    children: [
                      Expanded(child: _buildInfoRow('Guardian Name', pat.guardianName ?? 'N/A')),
                    ],
                  ),
                ],
              ),
            ),
            
            _buildSectionTitle('REFERRAL DETAILS', Icons.description),
            _buildCard(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  _buildInfoRow('Reason for Referral', ref.reason ?? 'N/A'),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 16),
                  _buildInfoRow('Created At', ref.createdAt.toString()),
                ],
              ),
            ),
            
            const SizedBox(height: 40),
          ],
        ),
      ),
    );
  }
}
