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
          SnackBar(content: Text('Referral Created: ${saved.referral.referralCode}')),
        );
        Navigator.pop(context);
      } catch (e) {
        if (!mounted) return;
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error saving referral: $e')),
        );
      } finally {
        if (mounted) {
          setState(() => _isSaving = false);
        }
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New Referral')),
      body: _isSaving 
          ? const Center(child: CircularProgressIndicator())
          : Form(
              key: _formKey,
              child: ListView(
                padding: const EdgeInsets.all(16.0),
                children: [
                  const Text('Patient Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextFormField(
                    controller: _nameController,
                    decoration: const InputDecoration(labelText: 'Patient Name *'),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Patient Name is required' : null,
                  ),
                  TextFormField(
                    controller: _phoneController,
                    decoration: const InputDecoration(labelText: 'Phone Number'),
                    keyboardType: TextInputType.phone,
                  ),
                  TextFormField(
                    controller: _dobController,
                    decoration: const InputDecoration(labelText: 'DOB or Age'),
                  ),
                  TextFormField(
                    controller: _genderController,
                    decoration: const InputDecoration(labelText: 'Gender'),
                  ),
                  TextFormField(
                    controller: _villageController,
                    decoration: const InputDecoration(labelText: 'Village/Location'),
                  ),
                  TextFormField(
                    controller: _guardianController,
                    decoration: const InputDecoration(labelText: 'Guardian Name'),
                  ),
                  const SizedBox(height: 24),
                  const Text('Referral Information', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
                  TextFormField(
                    controller: _referringFacilityController,
                    decoration: const InputDecoration(labelText: 'Referring Facility *'),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Referring Facility is required' : null,
                  ),
                  TextFormField(
                    controller: _receivingFacilityController,
                    decoration: const InputDecoration(labelText: 'Receiving Facility *'),
                    validator: (value) => value == null || value.trim().isEmpty ? 'Receiving Facility is required' : null,
                  ),
                  TextFormField(
                    controller: _reasonController,
                    decoration: const InputDecoration(labelText: 'Reason for Referral'),
                    maxLines: 3,
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: _save,
                    child: const Text('Save Offline'),
                  )
                ],
              ),
            ),
    );
  }
}
