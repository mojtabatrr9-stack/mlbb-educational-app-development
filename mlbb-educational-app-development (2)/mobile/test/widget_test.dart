import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:nexus_mlbb/main.dart';
void main() {
  testWidgets('Explains required HTTPS deployment configuration', (tester) async {
    await tester.pumpWidget(const MaterialApp(home: ConfigurationPage()));
    expect(find.text('Connect your playbook'), findsOneWidget);
    expect(find.textContaining('NEXUS_URL'), findsOneWidget);
  });
}
