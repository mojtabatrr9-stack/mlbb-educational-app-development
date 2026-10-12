import 'dart:async';
import 'dart:convert';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:path_provider/path_provider.dart';
import 'package:webview_flutter/webview_flutter.dart';

const nexusUrl = String.fromEnvironment('NEXUS_URL');
const purple = Color(0xFFB38CEE);
const background = Color(0xFF101014);
void main() {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const NexusMobile());
}
class NexusMobile extends StatelessWidget {
  const NexusMobile({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
    debugShowCheckedModeBanner: false,
    title: 'Nexus',
    theme: ThemeData(
      brightness: Brightness.dark,
      colorScheme: ColorScheme.fromSeed(seedColor: purple, brightness: Brightness.dark),
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(backgroundColor: background, foregroundColor: purple),
      useMaterial3: true,
    ),
    home: Uri.tryParse(nexusUrl)?.scheme == 'https'
      ? const CompanionShell()
      : const ConfigurationPage(),
  );
}
class ConfigurationPage extends StatelessWidget {
  const ConfigurationPage({super.key});
  @override
  Widget build(BuildContext context) => const Scaffold(body: SafeArea(child: Center(child: Padding(
    padding: EdgeInsets.all(32),
    child: Column(mainAxisSize: MainAxisSize.min, children: [
      Icon(Icons.shield_moon_outlined, size: 56, color: purple),
      SizedBox(height: 22), Text('Connect your playbook', style: TextStyle(fontSize: 26)),
      SizedBox(height: 16), Text('Build this app with --dart-define=NEXUS_URL=https://your-domain.example. Only HTTPS deployments are accepted.', textAlign: TextAlign.center),
    ]),
  ))));
}
class OfflineStore {
  late Directory directory;
  List<Map<String, dynamic>> heroes = [];
  DateTime? updatedAt;
  Future<void> initialize() async {
    final root = await getApplicationSupportDirectory();
    directory = Directory('${root.path}/nexus-library');
    await directory.create(recursive: true);
    final file = File('${directory.path}/catalog.json');
    if (await file.exists()) {
      try {
        final data = jsonDecode(await file.readAsString()) as Map<String, dynamic>;
        heroes = (data['heroes'] as List).map((h) => Map<String, dynamic>.from(h as Map)).toList();
        updatedAt = DateTime.tryParse(data['cached_at'] as String? ?? '');
      } catch (_) { heroes = []; }
    }
  }
  File imageFile(String id) => File('${directory.path}/${id.replaceAll(RegExp(r'[^a-zA-Z0-9-]'), '')}.image');
  Future<void> refresh() async {
    final client = HttpClient()..connectionTimeout = const Duration(seconds: 10);
    try {
      final request = await client.getUrl(Uri.parse(nexusUrl).resolve('/api/catalog'));
      final response = await request.close().timeout(const Duration(seconds: 15));
      if (response.statusCode != 200) throw const HttpException('Library unavailable');
      final data = jsonDecode(await response.transform(utf8.decoder).join()) as Map<String, dynamic>;
      final next = (data['heroes'] as List).map((h) => Map<String, dynamic>.from(h as Map)).toList();
      for (final hero in next) {
        try {
          final uri = Uri.parse(nexusUrl).resolve(hero['image_url'] as String);
          if (uri.scheme != 'https') continue;
          final imageResponse = await (await client.getUrl(uri)).close().timeout(const Duration(seconds: 10));
          if (imageResponse.statusCode != 200 || imageResponse.contentLength > 2 * 1024 * 1024) continue;
          final bytes = await consolidateHttpClientResponseBytes(imageResponse);
          if (bytes.length > 2 * 1024 * 1024) continue;
          final image = imageFile(hero['hero_id'] as String);
          final temporary = File('${image.path}.tmp');
          await temporary.writeAsBytes(bytes, flush: true);
          await temporary.rename(image.path);
        } catch (_) { /* A missing image never prevents caching the text library. */ }
      }
      final cachedAt = DateTime.now();
      final file = File('${directory.path}/catalog.json.tmp');
      await file.writeAsString(jsonEncode({...data, 'cached_at': cachedAt.toIso8601String()}), flush: true);
      await file.rename('${directory.path}/catalog.json');
      heroes = next;
      updatedAt = cachedAt;
    } finally { client.close(force: true); }
  }
}
class CompanionShell extends StatefulWidget {
  const CompanionShell({super.key});
  @override
  State<CompanionShell> createState() => _CompanionShellState();
}
class _CompanionShellState extends State<CompanionShell> {
  late final WebViewController controller;
  final store = OfflineStore();
  bool failed = false;
  bool caching = false;
  bool initialized = false;
  int progress = 0;
  @override
  void initState() {
    super.initState();
    final origin = Uri.parse(nexusUrl);
    controller = WebViewController()
      ..setBackgroundColor(background)
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(NavigationDelegate(
        onProgress: (value) { if (mounted) setState(() => progress = value); },
        onPageFinished: (_) { if (mounted) setState(() { failed = false; progress = 100; }); },
        onWebResourceError: (error) { if (error.isForMainFrame == true && mounted) setState(() => failed = true); },
        onNavigationRequest: (request) {
          final uri = Uri.tryParse(request.url);
          if (uri == null) return NavigationDecision.prevent;
          if (!request.isMainFrame && uri.host == 'www.youtube-nocookie.com') return NavigationDecision.navigate;
          if (uri.scheme == 'https' && uri.host == origin.host && uri.port == origin.port && !uri.path.startsWith('/admin')) return NavigationDecision.navigate;
          return NavigationDecision.prevent;
        },
      ))
      ..loadRequest(origin);
    unawaited(initialize());
  }
  Future<void> initialize() async {
    await store.initialize();
    if (!mounted) return;
    setState(() => initialized = true);
    await cacheLibrary(silent: true);
  }
  Future<void> cacheLibrary({bool silent = false}) async {
    if (caching || !initialized) return;
    setState(() => caching = true);
    String message;
    try { await store.refresh(); message = '${store.heroes.length} heroes are now available offline.'; }
    catch (_) { message = 'Could not refresh. Your existing offline library is unchanged.'; }
    if (!mounted) return;
    setState(() => caching = false);
    if (!silent) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(message)));
  }
  void openOffline() {
    if (!initialized) return;
    Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OfflineLibrary(store: store)));
  }
  @override
  Widget build(BuildContext context) => PopScope(
    canPop: false,
    onPopInvokedWithResult: (didPop, result) async {
      if (didPop) return;
      if (await controller.canGoBack()) { await controller.goBack(); }
      else { await SystemNavigator.pop(); }
    },
    child: Scaffold(
      appBar: AppBar(toolbarHeight: 44, title: const Text('NEXUS', style: TextStyle(fontSize: 15, letterSpacing: 4)), actions: [
        IconButton(tooltip: 'Offline hero library', onPressed: initialized ? openOffline : null, icon: const Icon(Icons.offline_bolt_outlined, size: 21)),
        IconButton(tooltip: 'Download latest library', onPressed: caching ? null : () => cacheLibrary(), icon: caching ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2)) : const Icon(Icons.download_outlined, size: 21)),
        IconButton(tooltip: 'Reload', onPressed: () { setState(() => failed = false); controller.loadRequest(Uri.parse(nexusUrl)); }, icon: const Icon(Icons.refresh, size: 21)),
      ]),
      body: SafeArea(top: false, child: failed ? Center(child: Padding(padding: const EdgeInsets.all(30), child: Column(mainAxisSize: MainAxisSize.min, children: [
        const Icon(Icons.wifi_off_rounded, size: 54, color: purple),
        const SizedBox(height: 20), const Text('Your playbook travels with you.', style: TextStyle(fontSize: 23), textAlign: TextAlign.center),
        const SizedBox(height: 14), const Text('You are offline or the server is unavailable. Explore your downloaded heroes while you reconnect.', textAlign: TextAlign.center),
        const SizedBox(height: 24), FilledButton.icon(onPressed: initialized ? openOffline : null, icon: const Icon(Icons.menu_book), label: const Text('Open offline library')),
        const SizedBox(height: 10), TextButton(onPressed: () { setState(() => failed = false); controller.loadRequest(Uri.parse(nexusUrl)); }, child: const Text('Try again')),
      ]))) : Stack(children: [WebViewWidget(controller: controller), if (progress < 100) LinearProgressIndicator(value: progress / 100, minHeight: 2)])),
    ),
  );
}
class OfflineLibrary extends StatefulWidget {
  const OfflineLibrary({super.key, required this.store});
  final OfflineStore store;
  @override
  State<OfflineLibrary> createState() => _OfflineLibraryState();
}
class _OfflineLibraryState extends State<OfflineLibrary> {
  String query = '';
  String role = 'All';
  @override
  Widget build(BuildContext context) {
    final heroes = widget.store.heroes.where((h) => (role == 'All' || h['role'] == role) && (h['name'] as String).toLowerCase().contains(query.toLowerCase())).toList();
    return Scaffold(appBar: AppBar(title: const Text('Offline library', style: TextStyle(fontSize: 20))), body: SafeArea(child: Column(children: [
      Padding(padding: const EdgeInsets.fromLTRB(20, 10, 20, 14), child: TextField(onChanged: (value) => setState(() => query = value), decoration: const InputDecoration(prefixIcon: Icon(Icons.search), hintText: 'Find your next main...', border: OutlineInputBorder()))),
      SizedBox(height: 43, child: ListView(scrollDirection: Axis.horizontal, padding: const EdgeInsets.symmetric(horizontal: 20), children: ['All','Tank','Fighter','Assassin','Mage','Marksman','Support'].map((r) => Padding(padding: const EdgeInsets.only(right: 8), child: ChoiceChip(label: Text(r), selected: role == r, onSelected: (_) => setState(() => role = r)))).toList())),
      if (widget.store.updatedAt != null) Padding(padding: const EdgeInsets.all(15), child: Text('Downloaded ${widget.store.updatedAt!.toLocal().toString().split('.').first} · Sample learning data', style: const TextStyle(fontSize: 10, color: Colors.grey))),
      Expanded(child: heroes.isEmpty ? const Center(child: Padding(padding: EdgeInsets.all(30), child: Text('No heroes available. Connect once and download the library, or change your filters.', textAlign: TextAlign.center))) : ListView.separated(
        padding: const EdgeInsets.all(20), itemCount: heroes.length, separatorBuilder: (_, index) => const SizedBox(height: 10),
        itemBuilder: (context, index) { final hero = heroes[index]; return Card(color: const Color(0xFF211B29), child: ListTile(contentPadding: const EdgeInsets.all(12), leading: HeroImage(store: widget.store, hero: hero, size: 60), title: Text(hero['name'] as String, style: const TextStyle(fontWeight: FontWeight.w600)), subtitle: Text('${hero['role']} · ${hero['lane']}\n${hero['title']}', style: const TextStyle(fontSize: 11)), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OfflineHero(hero: hero, store: widget.store))))); },
      )),
    ])));
  }
}
class HeroImage extends StatelessWidget {
  const HeroImage({super.key, required this.store, required this.hero, this.size = 70});
  final OfflineStore store;
  final Map<String, dynamic> hero;
  final double size;
  @override
  Widget build(BuildContext context) => ClipRRect(borderRadius: BorderRadius.circular(10), child: Image.file(store.imageFile(hero['hero_id'] as String), height: size, width: size, fit: BoxFit.cover, errorBuilder: (_, error, stack) => Container(height: size, width: size, color: const Color(0xFF33243F), child: const Icon(Icons.person, color: purple))));
}
class OfflineHero extends StatelessWidget {
  const OfflineHero({super.key, required this.hero, required this.store});
  final Map<String, dynamic> hero;
  final OfflineStore store;
  @override
  Widget build(BuildContext context) {
    final stats = Map<String, dynamic>.from(hero['base_stats'] as Map);
    final skills = (hero['skills'] as List).map((s) => Map<String, dynamic>.from(s as Map)).toList();
    final counters = store.heroes.where((h) => (hero['counters'] as List).contains(h['hero_id'])).toList();
    return Scaffold(appBar: AppBar(title: Text(hero['name'] as String)), body: ListView(padding: const EdgeInsets.all(24), children: [
      Center(child: HeroImage(store: store, hero: hero, size: 150)), const SizedBox(height: 22),
      Text(hero['title'] as String, style: const TextStyle(fontSize: 26, color: purple)), const SizedBox(height: 8),
      Text('${hero['role']} · ${hero['lane']} lane · ${hero['difficulty']}'), const SizedBox(height: 22),
      Text(hero['lore'] as String, style: const TextStyle(height: 1.8)), const SizedBox(height: 28),
      const Text('Base stats', style: TextStyle(fontSize: 22)), const SizedBox(height: 12),
      ...stats.entries.map((e) => ListTile(dense: true, contentPadding: EdgeInsets.zero, title: Text(e.key.replaceAll('_',' ')), trailing: Text('${e.value}', style: const TextStyle(color: purple)))),
      const SizedBox(height: 24), const Text('Skills', style: TextStyle(fontSize: 22)), const SizedBox(height: 12),
      ...skills.map((s) => ExpansionTile(tilePadding: EdgeInsets.zero, title: Text(s['skill_name'] as String), subtitle: Text('${s['skill_type']} · ${s['damage_type']}'), children: [Padding(padding: const EdgeInsets.only(bottom: 20), child: Text('${s['description']}\n\nCooldown: ${s['cooldown']}s · Resource cost: ${s['mana_cost']}', style: const TextStyle(height: 1.8)))])),
      const SizedBox(height: 24), const Text('Counter picks', style: TextStyle(fontSize: 22)), const SizedBox(height: 12),
      ...counters.map((h) => ListTile(contentPadding: EdgeInsets.zero, leading: HeroImage(store: store, hero: h, size: 45), title: Text(h['name'] as String), subtitle: Text(h['role'] as String), trailing: const Icon(Icons.chevron_right), onTap: () => Navigator.of(context).push(MaterialPageRoute<void>(builder: (_) => OfflineHero(hero: h, store: store))))),
      const SizedBox(height: 25), const Text('Read-only cached learning content. Values are illustrative, not a live patch feed. Connect for builds, guides, and community features.', style: TextStyle(fontSize: 11, color: Colors.grey, height: 1.8)),
    ]));
  }
}
