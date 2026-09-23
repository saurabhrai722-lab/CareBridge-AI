import 'package:flutter/material.dart';
import 'package:drift/drift.dart' as drift;
import '../../data/database/database.dart';
import '../../data/repositories/referral_repository.dart';

class ReferralCreateScreen extends StatefulWidget {
  final ReferralRepository repository;

  const ReferralCreateScreen({super.key, required this.repository});

  @override
  State<ReferralCreateScreen> createState() => _ReferralCreateScreenState();
}

class _ReferralCreateScreenState extends State<ReferralCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  
  final _nameController = TextEditingController();
  final _phoneController = TextEditingController();
  final _dobController = TextEditingController();
  final _genderController = TextEditingController();
  final _villageController = TextEditingController();
  final _guardianController = TextEditingController();
  
  final _referringFacilityController = TextEditingController();
  final _receivingFacilityController = TextEditingController();
  final _reasonController = TextEditingController();

  bool _isSaving = false;

  void _save() async {
    if (_formKey.currentState!.validate()) {
      setState(() => _isSaving = true);
      
      try {
        final patient = PatientsCompanion.insert(
          name: _nameController.text.trim(),
          phone: drift.Value(_phoneController.text.trim()),
          dateOfBirth: drift.Value(_dobController.text.trim()),
          gender: drift.Value(_genderController.text.trim()),
          village: drift.Value(_villageController.text.trim()),
          guardianName: drift.Value(_guardianController.text.trim()),
        );

        final referral = ReferralsCompanion.insert(
          referringFacility: _referringFacilityController.text.trim(),
          receivingFacility: _receivingFacilityController.text.trim(),
          reason: drift.Value(_reasonController.text.trim()),
          referralCode: '', // Auto-generated in repository
          patientId: 0, // Will be replaced in repository
        );

        final saved = await widget.repository.createReferral(
          patient: patient,
          referral: referral,
        );

        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Referral Created: ${saved.referral.referralCode}', style: const TextStyle(fontWeight: FontWeight.bold)),
            backgroundColor: const Color(0xFF047857),
            behavior: SnackBarBehavior.floating,
          ),
        );
        Navigator.pop(context);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('Error saving referral: $e'),
            backgroundColor: Colors.red.shade700,
            behavior: SnackBarBehavior.floating,
          ),
        );
      } finally {
        if (mounted) {
          setState(() => _isSaving = false);
        }
      }
    }
  }

  Widget _buildSectionTitle(String title, IconData icon) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16, top: 8),
      child: Row(
        children: [
          Icon(icon, size: 20, color: const Color(0xFF1E56A0)),
          const SizedBox(width: 8),
          Text(
            title,
            style: const TextStyle(
              fontSize: 15,
              fontWeight: FontWeight.bold,
              color: Color(0xFF1E56A0),
              letterSpacing: 1.2,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildTextField({
    required TextEditingController controller,
    required String labelText,
    bool required = false,
    TextInputType keyboardType = TextInputType.text,
    int maxLines = 1,
  }) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 16),
      child: TextFormField(
        controller: controller,
        keyboardType: keyboardType,
        maxLines: maxLines,
        style: const TextStyle(fontWeight: FontWeight.w500, color: Color(0xFF0B1528)),
        decoration: InputDecoration(
          labelText: labelText + (required ? ' *' : ''),
          labelStyle: TextStyle(
            color: Colors.grey.shade600,
            fontWeight: FontWeight.w500,
            fontSize: 14,
          ),
          filled: true,
          fillColor: Colors.white,
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: Colors.grey.shade300),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: Color(0xFF1E56A0), width: 2),
          ),
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
        ),
        validator: required
            ? (value) => value == null || value.trim().isEmpty ? 'This field is required' : null
            : null,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFFAFAFC),
      appBar: AppBar(
        title: const Text('New Referral', style: TextStyle(fontWeight: FontWeight.bold, letterSpacing: -0.5)),
      ),
      body: _isSaving 
          ? const Center(child: CircularProgressIndicator(color: Color(0xFF1E56A0)))
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(24.0),
                children: [
                  _buildSectionTitle('PATIENT INFORMATION', Icons.person_add_alt_1),
                  _buildTextField(
                    controller: _nameController,
                    labelText: 'Patient Name',
                    required: true,
                  ),
                  _buildTextField(
                    controller: _phoneController,
                    labelText: 'Phone Number',
                    keyboardType: TextInputType.phone,
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: _buildTextField(
                          controller: _dobController,
                          labelText: 'DOB or Age',
                        ),
                      ),
                      const SizedBox(width: 16),
                      Expanded(
                        child: _buildTextField(
                          controller: _genderController,
                          labelText: 'Gender',
                        ),
                      ),
                    ],
                  ),
                  _buildTextField(
                    controller: _villageController,
                    labelText: 'Village/Location',
                  ),
                  _buildTextField(
                    controller: _guardianController,
                    labelText: 'Guardian Name',
                  ),
                  
                  const SizedBox(height: 16),
                  const Divider(color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 16),
                  
                  _buildSectionTitle('REFERRAL DETAILS', Icons.medical_services_rounded),
                  _buildTextField(
                    controller: _referringFacilityController,
                    labelText: 'Referring Facility',
                    required: true,
                  ),
                  _buildTextField(
                    controller: _receivingFacilityController,
                    labelText: 'Receiving Facility',
                    required: true,
                  ),
                  _buildTextField(
                    controller: _reasonController,
                    labelText: 'Reason for Referral',
                    maxLines: 3,
                  ),
                  
                  const SizedBox(height: 24),
                  
                  ElevatedButton(
                    onPressed: _save,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF1E56A0),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Text(
                      'Save & Sync Offline',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ),
                  const SizedBox(height: 40),
                ],
              ),
            ),
    );
  }
}
