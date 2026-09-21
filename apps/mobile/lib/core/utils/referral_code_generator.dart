import 'dart:math';

class ReferralCodeGenerator {
  static final Random _random = Random();
  static const String _chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

  static String generate() {
    final code = List.generate(6, (index) => _chars[_random.nextInt(_chars.length)]).join();
    return 'CB-$code';
  }
}
