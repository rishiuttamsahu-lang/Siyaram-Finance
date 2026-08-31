import 'dart:async';
import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

void main() {
  runApp(const FocusLockApp());
}

// --- Design Tokens ---
class AppColors {
  static const Color canvas = Color(0xFFFAF3EC);
  static const Color surfaceWhite = Color(0xFFFFFFFF);
  static const Color surfaceDark = Color(0xFF141A21);
  static const Color primaryAccent = Color(0xFFFF6B2C);
  static const Color accentLight = Color(0xFFFFF3EB);
  static const Color infoSurface = Color(0xFFEBF3FE);
  static const Color infoIcon = Color(0xFF3366FF);
  static const Color successBg = Color(0xFFE8F7EE);
  static const Color successText = Color(0xFF2D9C5E);
  static const Color textPrimary = Color(0xFF12161A);
  static const Color textSecondary = Color(0xFF6B778C);
  static const Color borderSubtle = Color(0xFFEAE1D8);
}

class FocusLockApp extends StatelessWidget {
  const FocusLockApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'FocusLock',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        scaffoldBackgroundColor: AppColors.canvas,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.primaryAccent,
          primary: AppColors.primaryAccent,
          surface: AppColors.surfaceWhite,
        ),
        textTheme: GoogleFonts.outfitTextTheme(ThemeData.light().textTheme),
        useMaterial3: true,
      ),
      home: const MainScaffold(),
    );
  }
}

class MainScaffold extends StatefulWidget {
  const MainScaffold({super.key});

  @override
  State<MainScaffold> createState() => _MainScaffoldState();
}

class _MainScaffoldState extends State<MainScaffold> {
  int _currentTabIndex = 0;

  // Wizard In-Flight State
  final Set<String> _selectedApps = {'Instagram', 'Chrome', 'YouTube'};
  final Set<String> _selectedRestrictions = {'BLOCK_APP', 'BLOCK_ACCOUNT_SWITCH'};
  int _lockDays = 7;

  void _openWizard() {
    Navigator.of(context).push(
      MaterialPageRoute(
        builder: (ctx) => SelectAppsScreen(
          selectedApps: _selectedApps,
          selectedRestrictions: _selectedRestrictions,
          lockDays: _lockDays,
          onFinish: () {
            setState(() {
              _currentTabIndex = 0;
            });
          },
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final screens = [
      HomeScreen(
        onOpenActiveLock: () {
          Navigator.of(context).push(
            MaterialPageRoute(builder: (ctx) => const ActiveLockDetailScreen()),
          );
        },
        onStartNewLock: _openWizard,
      ),
      const HistoryScreen(),
      const InsightsScreen(),
      const SettingsScreen(),
    ];

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: screens[_currentTabIndex],
      ),
      bottomNavigationBar: Container(
        height: 84,
        alignment: Alignment.bottomCenter,
        child: Stack(
          alignment: Alignment.topCenter,
          clipBehavior: Clip.none,
          children: [
            Container(
              height: 72,
              decoration: const BoxDecoration(
                color: AppColors.surfaceDark,
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceAround,
                children: [
                  _buildNavItem(0, Icons.home_rounded, 'Home'),
                  _buildNavItem(1, Icons.calendar_today_rounded, 'History'),
                  const SizedBox(width: 48), // Spacing for + FAB
                  _buildNavItem(2, Icons.insights_rounded, 'Insights'),
                  _buildNavItem(3, Icons.settings_rounded, 'Settings'),
                ],
              ),
            ),
            Positioned(
              top: -8,
              child: GestureDetector(
                onTap: _openWizard,
                child: Container(
                  width: 56,
                  height: 56,
                  decoration: BoxDecoration(
                    color: AppColors.primaryAccent,
                    shape: BoxShape.circle,
                    boxShadow: [
                      BoxShadow(
                        color: AppColors.primaryAccent.withOpacity(0.4),
                        blurRadius: 10,
                        offset: const Offset(0, 4),
                      ),
                    ],
                  ),
                  child: const Icon(
                    Icons.add_rounded,
                    color: Colors.white,
                    size: 32,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _currentTabIndex == index;
    final color = isSelected ? AppColors.primaryAccent : AppColors.textSecondary;

    return InkWell(
      onTap: () => setState(() => _currentTabIndex = index),
      borderRadius: BorderRadius.circular(12),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color, size: 22),
            const SizedBox(height: 4),
            Text(
              label,
              style: TextStyle(
                color: color,
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 1. HOME SCREEN (Conforming to Home.png)
// ==========================================
class HomeScreen extends StatefulWidget {
  final VoidCallback onOpenActiveLock;
  final VoidCallback onStartNewLock;

  const HomeScreen({
    super.key,
    required this.onOpenActiveLock,
    required this.onStartNewLock,
  });

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  int _secondsRemaining = 2720; // 45:20
  Timer? _timer;
  bool _isPlayingMusic = true;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (_secondsRemaining > 0) {
        setState(() => _secondsRemaining--);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  String _formatTimer(int totalSecs) {
    final mins = (totalSecs ~/ 60).toString().padLeft(2, '0');
    final secs = (totalSecs % 60).toString().padLeft(2, '0');
    return '$mins:$secs';
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      children: [
        // Top Header
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Focus',
              style: GoogleFonts.outfit(
                fontSize: 28,
                fontWeight: FontWeight.w800,
                color: AppColors.textPrimary,
              ),
            ),
            Container(
              width: 44,
              height: 44,
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: const Icon(
                Icons.notifications_none_rounded,
                color: AppColors.textPrimary,
                size: 20,
              ),
            ),
          ],
        ),
        const SizedBox(height: 14),

        // Groove Tunes Audio Bar
        InkWell(
          onTap: () => setState(() => _isPlayingMusic = !_isPlayingMusic),
          borderRadius: BorderRadius.circular(14),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            decoration: BoxDecoration(
              color: AppColors.surfaceWhite,
              borderRadius: BorderRadius.circular(14),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primaryAccent.withOpacity(0.12),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const Icon(
                    Icons.music_note_rounded,
                    color: AppColors.primaryAccent,
                    size: 18,
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    'Groove Tunes — Focus beats playlist',
                    style: GoogleFonts.inter(
                      fontSize: 13,
                      fontWeight: FontWeight.w500,
                      color: AppColors.textPrimary,
                    ),
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                Icon(
                  _isPlayingMusic ? Icons.graphic_eq_rounded : Icons.play_arrow_rounded,
                  color: AppColors.primaryAccent,
                  size: 20,
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Active Focus Card
        InkWell(
          onTap: widget.onOpenActiveLock,
          borderRadius: BorderRadius.circular(24),
          child: Container(
            padding: const EdgeInsets.all(20),
            decoration: BoxDecoration(
              color: AppColors.surfaceWhite,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppColors.borderSubtle),
            ),
            child: Column(
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    _buildPillBadge('ACTIVE FOCUS', AppColors.accentLight, AppColors.primaryAccent),
                    _buildPillBadge('3 APPS PROTECTED', AppColors.accentLight, AppColors.primaryAccent, icon: Icons.lock_rounded),
                  ],
                ),
                const SizedBox(height: 20),

                // Circular Timer Gauge
                Stack(
                  alignment: Alignment.center,
                  children: [
                    SizedBox(
                      width: 180,
                      height: 180,
                      child: CircularProgressIndicator(
                        value: _secondsRemaining / 3600,
                        strokeWidth: 10,
                        backgroundColor: AppColors.canvas,
                        valueColor: const AlwaysStoppedAnimation<Color>(AppColors.primaryAccent),
                        strokeCap: StrokeCap.round,
                      ),
                    ),
                    Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          _formatTimer(_secondsRemaining),
                          style: GoogleFonts.outfit(
                            fontSize: 44,
                            fontWeight: FontWeight.w800,
                            color: AppColors.textPrimary,
                            letterSpacing: -1,
                          ),
                        ),
                        Text(
                          'Remaining',
                          style: GoogleFonts.inter(
                            fontSize: 14,
                            color: AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                    Positioned(
                      bottom: 0,
                      child: Container(
                        padding: const EdgeInsets.all(6),
                        decoration: const BoxDecoration(
                          color: AppColors.surfaceDark,
                          shape: BoxShape.circle,
                        ),
                        child: const Icon(
                          Icons.shield_rounded,
                          color: AppColors.primaryAccent,
                          size: 16,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 24),

                // Active status pill
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.successBg,
                    borderRadius: BorderRadius.circular(20),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Container(
                        width: 6,
                        height: 6,
                        decoration: const BoxDecoration(
                          color: AppColors.successText,
                          shape: BoxShape.circle,
                        ),
                      ),
                      const SizedBox(width: 6),
                      Text(
                        'Protection is Active',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.successText,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 20),

        // Quick Stats Grid
        Row(
          children: [
            Expanded(
              child: _buildStatCard('1h 30m', 'Time Protected Today', Icons.timer_outlined),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: _buildStatCard('6 Sessions', 'Completed This Week', Icons.check_circle_outline_rounded),
            ),
          ],
        ),
        const SizedBox(height: 24),

        // Protected Apps Section
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              'Protected Apps',
              style: GoogleFonts.outfit(
                fontSize: 18,
                fontWeight: FontWeight.bold,
                color: AppColors.textPrimary,
              ),
            ),
            InkWell(
              onTap: widget.onOpenActiveLock,
              child: Text(
                'View All',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryAccent,
                ),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),

        _buildAppRow('Instagram', 'Social Media', 'I'),
        const SizedBox(height: 10),
        _buildAppRow('Chrome', 'Web Browser', 'C'),
        const SizedBox(height: 10),
        _buildAppRow('YouTube', 'Entertainment', 'Y'),
        const SizedBox(height: 20),
      ],
    );
  }

  Widget _buildPillBadge(String label, Color bg, Color textColor, {IconData? icon}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: BorderRadius.circular(20),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[
            Icon(icon, size: 14, color: textColor),
            const SizedBox(width: 4),
          ],
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 11,
              fontWeight: FontWeight.bold,
              color: textColor,
              letterSpacing: 0.5,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildStatCard(String value, String label, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryAccent, size: 22),
          const SizedBox(height: 10),
          Text(
            value,
            style: GoogleFonts.outfit(
              fontSize: 20,
              fontWeight: FontWeight.bold,
              color: AppColors.textPrimary,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: GoogleFonts.inter(
              fontSize: 12,
              color: AppColors.textSecondary,
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildAppRow(String name, String category, String initial) {
    return InkWell(
      onTap: () {
        Navigator.of(context).push(
          MaterialPageRoute(
            builder: (ctx) => BlockScreenWidget(
              appName: name,
              ruleTitle: name == 'Chrome' ? 'Incognito Mode & Private Tabs Blocked' : (name == 'Instagram' ? 'Account Switching Blocked' : '$name is Locked'),
              remainingTime: _formatTimer(_secondsRemaining),
            ),
          ),
        );
      },
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        decoration: BoxDecoration(
          color: AppColors.surfaceWhite,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: AppColors.borderSubtle),
        ),
        child: Row(
          children: [
            Container(
              width: 42,
              height: 42,
              decoration: BoxDecoration(
                color: AppColors.accentLight,
                borderRadius: BorderRadius.circular(12),
              ),
              alignment: Alignment.center,
              child: Text(
                initial,
                style: GoogleFonts.outfit(
                  fontSize: 18,
                  fontWeight: FontWeight.bold,
                  color: AppColors.primaryAccent,
                ),
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    name,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.textPrimary,
                    ),
                  ),
                  Text(
                    category,
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textSecondary,
                    ),
                  ),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: AppColors.successBg,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                'Active',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.bold,
                  color: AppColors.successText,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// BLOCK SCREEN OVERLAY (Phase 9)
// ==========================================
class BlockScreenWidget extends StatelessWidget {
  final String appName;
  final String ruleTitle;
  final String remainingTime;

  const BlockScreenWidget({
    super.key,
    required this.appName,
    required this.ruleTitle,
    required this.remainingTime,
  });

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 24),
          child: Column(
            children: [
              const SizedBox(height: 10),
              Container(
                width: 72,
                height: 72,
                decoration: const BoxDecoration(
                  color: AppColors.surfaceDark,
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.shield_rounded,
                  color: AppColors.primaryAccent,
                  size: 38,
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Access Blocked',
                style: GoogleFonts.outfit(
                  fontSize: 28,
                  fontWeight: FontWeight.w800,
                  color: AppColors.textPrimary,
                ),
              ),
              const SizedBox(height: 6),
              Text(
                ruleTitle,
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: AppColors.textSecondary,
                ),
                textAlign: TextAlign.center,
              ),
              const SizedBox(height: 24),

              // Circular Countdown Card
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: AppColors.surfaceWhite,
                  borderRadius: BorderRadius.circular(24),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  children: [
                    Text(
                      'LOCK IN PROGRESS',
                      style: GoogleFonts.inter(
                        fontSize: 11,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryAccent,
                        letterSpacing: 1,
                      ),
                    ),
                    const SizedBox(height: 20),
                    Stack(
                      alignment: Alignment.center,
                      children: [
                        const SizedBox(
                          width: 170,
                          height: 170,
                          child: CircularProgressIndicator(
                            value: 0.85,
                            strokeWidth: 10,
                            backgroundColor: AppColors.canvas,
                            valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryAccent),
                            strokeCap: StrokeCap.round,
                          ),
                        ),
                        Column(
                          children: [
                            Text(
                              remainingTime,
                              style: GoogleFonts.outfit(
                                fontSize: 38,
                                fontWeight: FontWeight.w800,
                                letterSpacing: -1,
                              ),
                            ),
                            Text(
                              'Remaining in Lock',
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                color: AppColors.textSecondary,
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Strict Mode Active • No Early Unlock',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        fontWeight: FontWeight.w500,
                        color: AppColors.textSecondary,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              // Motivational message
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.accentLight,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_rounded, color: AppColors.primaryAccent, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Stay committed to your deep focus. Instant distraction is temporary, true mastery is permanent.',
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w500,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              ElevatedButton.icon(
                onPressed: () => Navigator.of(context).pop(),
                icon: const Icon(Icons.home_rounded),
                label: const Text('Return to Home Screen', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryAccent,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  elevation: 0,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 2. WIZARD STEP 1: SELECT APPS (Select Apps.png)
// ==========================================
class SelectAppsScreen extends StatefulWidget {
  final Set<String> selectedApps;
  final Set<String> selectedRestrictions;
  final int lockDays;
  final VoidCallback onFinish;

  const SelectAppsScreen({
    super.key,
    required this.selectedApps,
    required this.selectedRestrictions,
    required this.lockDays,
    required this.onFinish,
  });

  @override
  State<SelectAppsScreen> createState() => _SelectAppsScreenState();
}

class _SelectAppsScreenState extends State<SelectAppsScreen> {
  String _query = '';

  final List<Map<String, String>> _allAppsList = [
    {'name': 'Instagram', 'cat': 'Social Media', 'recommended': 'true'},
    {'name': 'Chrome', 'cat': 'Web Browser', 'recommended': 'true'},
    {'name': 'YouTube', 'cat': 'Entertainment', 'recommended': 'true'},
    {'name': 'Twitter / X', 'cat': 'Social Media', 'recommended': 'true'},
    {'name': 'WhatsApp', 'cat': 'Messaging', 'recommended': 'true'},
    {'name': 'Facebook', 'cat': 'Social Media', 'recommended': 'false'},
    {'name': 'Reddit', 'cat': 'Social Media', 'recommended': 'false'},
    {'name': 'TikTok', 'cat': 'Social Media', 'recommended': 'false'},
    {'name': 'Telegram', 'cat': 'Messaging', 'recommended': 'false'},
    {'name': 'Netflix', 'cat': 'Entertainment', 'recommended': 'false'},
  ];

  @override
  Widget build(BuildContext context) {
    final filtered = _allAppsList.where((a) {
      final name = a['name']!.toLowerCase();
      final cat = a['cat']!.toLowerCase();
      final q = _query.toLowerCase();
      return name.contains(q) || cat.contains(q);
    }).toList();

    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Column(
          children: [
            // Top Header & Steps
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      IconButton(
                        onPressed: () => Navigator.of(context).pop(),
                        icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                        style: IconButton.styleFrom(
                          backgroundColor: AppColors.surfaceWhite,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: AppColors.borderSubtle),
                          ),
                        ),
                      ),
                      const SizedBox(width: 14),
                      Text(
                        'Select Apps',
                        style: GoogleFonts.outfit(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.textPrimary,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 16),
                  Text(
                    'STEP 1 OF 5',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      fontWeight: FontWeight.w800,
                      color: AppColors.primaryAccent,
                      letterSpacing: 1,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Row(
                    children: List.generate(5, (index) {
                      return Expanded(
                        child: Container(
                          height: 4,
                          margin: EdgeInsets.only(right: index < 4 ? 6 : 0),
                          decoration: BoxDecoration(
                            color: index == 0 ? AppColors.primaryAccent : AppColors.borderSubtle,
                            borderRadius: BorderRadius.circular(2),
                          ),
                        ),
                      );
                    }),
                  ),
                  const SizedBox(height: 16),

                  // Search Box
                  Container(
                    height: 48,
                    padding: const EdgeInsets.symmetric(horizontal: 14),
                    decoration: BoxDecoration(
                      color: AppColors.surfaceWhite,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppColors.borderSubtle),
                    ),
                    child: Row(
                      children: [
                        const Icon(Icons.search_rounded, color: AppColors.textSecondary, size: 20),
                        const SizedBox(width: 10),
                        Expanded(
                          child: TextField(
                            onChanged: (val) => setState(() => _query = val),
                            decoration: const InputDecoration(
                              hintText: 'Search apps to lock...',
                              border: InputBorder.none,
                              isDense: true,
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),

            // Apps List
            Expanded(
              child: ListView.separated(
                padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 8),
                itemCount: filtered.length,
                separatorBuilder: (ctx, i) => const SizedBox(height: 8),
                itemBuilder: (ctx, index) {
                  final app = filtered[index];
                  final name = app['name']!;
                  final cat = app['cat']!;
                  final isSelected = widget.selectedApps.contains(name);

                  return InkWell(
                    onTap: () {
                      setState(() {
                        if (isSelected) {
                          widget.selectedApps.remove(name);
                        } else {
                          widget.selectedApps.add(name);
                        }
                      });
                    },
                    borderRadius: BorderRadius.circular(16),
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceWhite,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isSelected ? AppColors.primaryAccent : AppColors.borderSubtle,
                          width: isSelected ? 1.5 : 1.0,
                        ),
                      ),
                      child: Row(
                        children: [
                          Container(
                            width: 40,
                            height: 40,
                            decoration: BoxDecoration(
                              color: AppColors.accentLight,
                              borderRadius: BorderRadius.circular(10),
                            ),
                            alignment: Alignment.center,
                            child: Text(
                              name.substring(0, 1),
                              style: GoogleFonts.outfit(
                                fontSize: 16,
                                fontWeight: FontWeight.bold,
                                color: AppColors.primaryAccent,
                              ),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  name,
                                  style: GoogleFonts.inter(
                                    fontSize: 15,
                                    fontWeight: FontWeight.w600,
                                    color: AppColors.textPrimary,
                                  ),
                                ),
                                Text(
                                  cat,
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: AppColors.textSecondary,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(
                              shape: BoxShape.circle,
                              color: isSelected ? AppColors.primaryAccent : Colors.transparent,
                              border: Border.all(
                                color: isSelected ? AppColors.primaryAccent : AppColors.borderSubtle,
                                width: 1.5,
                              ),
                            ),
                            child: isSelected
                                ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                                : null,
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),

            // Sticky Bottom Action Bar
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
              decoration: const BoxDecoration(
                color: AppColors.surfaceWhite,
                border: Border(top: BorderSide(color: AppColors.borderSubtle)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          '${widget.selectedApps.length} apps selected',
                          style: GoogleFonts.inter(
                            fontSize: 15,
                            fontWeight: FontWeight.bold,
                            color: AppColors.textPrimary,
                          ),
                        ),
                        Text(
                          widget.selectedApps.isEmpty ? 'Select at least 1 app' : 'Ready for restrictions',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: widget.selectedApps.isEmpty ? AppColors.primaryAccent : AppColors.textSecondary,
                          ),
                        ),
                      ],
                    ),
                  ),
                  ElevatedButton(
                    onPressed: widget.selectedApps.isNotEmpty
                        ? () {
                            Navigator.of(context).push(
                              MaterialPageRoute(
                                builder: (ctx) => SetRestrictionsScreen(
                                  selectedApps: widget.selectedApps,
                                  selectedRestrictions: widget.selectedRestrictions,
                                  lockDays: widget.lockDays,
                                  onFinish: widget.onFinish,
                                ),
                              ),
                            );
                          }
                        : null,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.primaryAccent,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                      elevation: 0,
                    ),
                    child: const Row(
                      children: [
                        Text('Next: Set Rules', style: TextStyle(fontWeight: FontWeight.bold)),
                        SizedBox(width: 6),
                        Icon(Icons.arrow_forward_rounded, size: 16),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ==========================================
// 3. WIZARD STEP 2: SET RESTRICTIONS
// ==========================================
class SetRestrictionsScreen extends StatefulWidget {
  final Set<String> selectedApps;
  final Set<String> selectedRestrictions;
  final int lockDays;
  final VoidCallback onFinish;

  const SetRestrictionsScreen({
    super.key,
    required this.selectedApps,
    required this.selectedRestrictions,
    required this.lockDays,
    required this.onFinish,
  });

  @override
  State<SetRestrictionsScreen> createState() => _SetRestrictionsScreenState();
}

class _SetRestrictionsScreenState extends State<SetRestrictionsScreen> {
  final rules = [
    {
      'id': 'BLOCK_APP',
      'title': 'Block Opening the App',
      'desc': 'Completely prevent launching selected apps during active lock.',
    },
    {
      'id': 'BLOCK_ACCOUNT_SWITCH',
      'title': 'Block Account Switching',
      'desc': 'Prevent switching accounts or private tabs.',
    },
    {
      'id': 'BLOCK_NOTIFICATIONS',
      'title': 'Mute Notifications',
      'desc': 'Suppress distraction alerts and banners.',
    },
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.surfaceWhite,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.borderSubtle),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    'Set Restrictions',
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'STEP 2 OF 5',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryAccent,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: List.generate(5, (index) {
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 4 ? 6 : 0),
                      decoration: BoxDecoration(
                        color: index <= 1 ? AppColors.primaryAccent : AppColors.borderSubtle,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 20),

              Text(
                'Configuring ${widget.selectedApps.length} Apps',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              Expanded(
                child: ListView(
                  children: [
                    ...rules.map((rule) {
                      final isSelected = widget.selectedRestrictions.contains(rule['id']);
                      return InkWell(
                        onTap: () {
                          setState(() {
                            if (isSelected) {
                              widget.selectedRestrictions.remove(rule['id']);
                            } else {
                              widget.selectedRestrictions.add(rule['id']!);
                            }
                          });
                        },
                        borderRadius: BorderRadius.circular(16),
                        child: Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: AppColors.surfaceWhite,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isSelected ? AppColors.primaryAccent : AppColors.borderSubtle,
                              width: isSelected ? 1.5 : 1.0,
                            ),
                          ),
                          child: Row(
                            children: [
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      rule['title']!,
                                      style: GoogleFonts.inter(
                                        fontSize: 15,
                                        fontWeight: FontWeight.w600,
                                        color: AppColors.textPrimary,
                                      ),
                                    ),
                                    const SizedBox(height: 4),
                                    Text(
                                      rule['desc']!,
                                      style: GoogleFonts.inter(
                                        fontSize: 12,
                                        color: AppColors.textSecondary,
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                              Container(
                                width: 24,
                                height: 24,
                                decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: isSelected ? AppColors.primaryAccent : Colors.transparent,
                                  border: Border.all(
                                    color: isSelected ? AppColors.primaryAccent : AppColors.borderSubtle,
                                    width: 1.5,
                                  ),
                                ),
                                child: isSelected
                                    ? const Icon(Icons.check_rounded, size: 16, color: Colors.white)
                                    : null,
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                    const SizedBox(height: 12),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.infoSurface,
                        borderRadius: BorderRadius.circular(14),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.info_outline_rounded, color: AppColors.infoIcon, size: 20),
                          const SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Strict Mode will ensure these apps cannot be bypassed until the lock duration expires.',
                              style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),

              Row(
                children: [
                  Expanded(
                    flex: 1,
                    child: OutlinedButton(
                      onPressed: () => Navigator.of(context).pop(),
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        side: const BorderSide(color: AppColors.borderSubtle),
                      ),
                      child: const Text('Back', style: TextStyle(color: AppColors.textPrimary, fontWeight: FontWeight.bold)),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    flex: 2,
                    child: ElevatedButton(
                      onPressed: () {
                        Navigator.of(context).push(
                          MaterialPageRoute(
                            builder: (ctx) => StartLockScreen(
                              selectedApps: widget.selectedApps,
                              selectedRestrictions: widget.selectedRestrictions,
                              onFinish: widget.onFinish,
                            ),
                          ),
                        );
                      },
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppColors.primaryAccent,
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                        elevation: 0,
                      ),
                      child: const Text('Next: Choose Duration', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 4. WIZARD STEP 3: START A LOCK
// ==========================================
class StartLockScreen extends StatefulWidget {
  final Set<String> selectedApps;
  final Set<String> selectedRestrictions;
  final VoidCallback onFinish;

  const StartLockScreen({
    super.key,
    required this.selectedApps,
    required this.selectedRestrictions,
    required this.onFinish,
  });

  @override
  State<StartLockScreen> createState() => _StartLockScreenState();
}

class _StartLockScreenState extends State<StartLockScreen> {
  int _selectedDays = 7;
  final List<int> _durations = [3, 5, 7, 10, 14, 30];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  IconButton(
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                    style: IconButton.styleFrom(
                      backgroundColor: AppColors.surfaceWhite,
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                        side: const BorderSide(color: AppColors.borderSubtle),
                      ),
                    ),
                  ),
                  const SizedBox(width: 14),
                  Text(
                    'Start a Lock',
                    style: GoogleFonts.outfit(
                      fontSize: 22,
                      fontWeight: FontWeight.bold,
                      color: AppColors.textPrimary,
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Text(
                'STEP 3 OF 5',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  color: AppColors.primaryAccent,
                  letterSpacing: 1,
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: List.generate(5, (index) {
                  return Expanded(
                    child: Container(
                      height: 4,
                      margin: EdgeInsets.only(right: index < 4 ? 6 : 0),
                      decoration: BoxDecoration(
                        color: index <= 2 ? AppColors.primaryAccent : AppColors.borderSubtle,
                        borderRadius: BorderRadius.circular(2),
                      ),
                    ),
                  );
                }),
              ),
              const SizedBox(height: 20),

              // Hero Motivation Banner
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceDark,
                  borderRadius: BorderRadius.circular(18),
                ),
                child: Row(
                  children: [
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: AppColors.primaryAccent.withOpacity(0.2),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(Icons.shield_rounded, color: AppColors.primaryAccent, size: 22),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('Lock in. Stay focused.', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                          Text('Eliminate distractions with unyielding discipline.', style: GoogleFonts.inter(color: Colors.white70, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              Text(
                'Select Lock Duration',
                style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              const SizedBox(height: 12),

              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: _durations.map((days) {
                  final isSelected = _selectedDays == days;
                  return InkWell(
                    onTap: () => setState(() => _selectedDays = days),
                    borderRadius: BorderRadius.circular(14),
                    child: Container(
                      width: (MediaQuery.of(context).size.width - 60) / 3,
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.surfaceWhite,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(
                          color: isSelected ? AppColors.primaryAccent : AppColors.borderSubtle,
                          width: isSelected ? 2.0 : 1.0,
                        ),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        '$days Days',
                        style: GoogleFonts.outfit(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: isSelected ? AppColors.primaryAccent : AppColors.textPrimary,
                        ),
                      ),
                    ),
                  );
                }).toList(),
              ),
              const SizedBox(height: 16),

              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: AppColors.surfaceWhite,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: AppColors.borderSubtle),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Session Preview', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Text('• Apps Protected: ${widget.selectedApps.length} apps\n• Rules: ${widget.selectedRestrictions.length} active\n• Duration: $_selectedDays Days (${_selectedDays * 24} Hours)\n• Strict Protection: Active (Unbreakable)',
                      style: GoogleFonts.inter(fontSize: 13, height: 1.6, color: AppColors.textSecondary),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 12),

              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppColors.infoSurface,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Row(
                  children: [
                    const Icon(Icons.lock_clock_rounded, color: AppColors.infoIcon, size: 20),
                    const SizedBox(width: 10),
                    Expanded(
                      child: Text(
                        'Important to know — You won\'t be able to turn off protections or unlock early once started.',
                        style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                      ),
                    ),
                  ],
                ),
              ),
              const Spacer(),

              ElevatedButton(
                onPressed: () {
                  widget.onFinish();
                  Navigator.of(context).popUntil((route) => route.isFirst);
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.primaryAccent,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(56),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(30)),
                  elevation: 0,
                ),
                child: Text('Start $_selectedDays-Day Lock Now', style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ==========================================
// 5. ACTIVE LOCK DETAIL (active lock.png)
// ==========================================
class ActiveLockDetailScreen extends StatelessWidget {
  const ActiveLockDetailScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.canvas,
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
          children: [
            Row(
              children: [
                IconButton(
                  onPressed: () => Navigator.of(context).pop(),
                  icon: const Icon(Icons.arrow_back_rounded, color: AppColors.textPrimary),
                  style: IconButton.styleFrom(
                    backgroundColor: AppColors.surfaceWhite,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                      side: const BorderSide(color: AppColors.borderSubtle),
                    ),
                  ),
                ),
                const SizedBox(width: 14),
                Text(
                  'Active Lock Detail',
                  style: GoogleFonts.outfit(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                    color: AppColors.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 20),

            Container(
              padding: const EdgeInsets.all(24),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(24),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(20)),
                        child: Text('7-DAY SPRINT', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryAccent)),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                        decoration: BoxDecoration(color: AppColors.accentLight, borderRadius: BorderRadius.circular(20)),
                        child: Text('3 APPS LOCKED', style: GoogleFonts.inter(fontSize: 11, fontWeight: FontWeight.bold, color: AppColors.primaryAccent)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Stack(
                    alignment: Alignment.center,
                    children: [
                      const SizedBox(
                        width: 200,
                        height: 200,
                        child: CircularProgressIndicator(
                          value: 0.82,
                          strokeWidth: 12,
                          backgroundColor: AppColors.canvas,
                          valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryAccent),
                          strokeCap: StrokeCap.round,
                        ),
                      ),
                      Column(
                        children: [
                          Text('06:18:42', style: GoogleFonts.outfit(fontSize: 40, fontWeight: FontWeight.w800, letterSpacing: -1)),
                          Text('Remaining in Lock', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
                        ],
                      ),
                    ],
                  ),
                  const SizedBox(height: 24),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                    decoration: BoxDecoration(color: AppColors.successBg, borderRadius: BorderRadius.circular(20)),
                    child: Text('Enforcement Guard Active', style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold, color: AppColors.successText)),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Session Progress Bar Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Column(
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Session Progress', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
                      Text('89%', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.primaryAccent)),
                    ],
                  ),
                  const SizedBox(height: 10),
                  ClipRRect(
                    borderRadius: BorderRadius.circular(10),
                    child: const LinearProgressIndicator(
                      value: 0.89,
                      minHeight: 8,
                      backgroundColor: AppColors.canvas,
                      valueColor: AlwaysStoppedAnimation<Color>(AppColors.primaryAccent),
                    ),
                  ),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Text('Elapsed: 18h 41m', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                      Text('Total: 168h 00m', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Active Protected Apps Section
            Text(
              'Active Protected Apps',
              style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary),
            ),
            const SizedBox(height: 10),

            _buildDetailAppRow('Instagram', 'Account Switching Blocked • App Launch Blocked', 'I'),
            const SizedBox(height: 8),
            _buildDetailAppRow('Google Chrome', 'Incognito & Private Tabs Disabled', 'C'),
            const SizedBox(height: 8),
            _buildDetailAppRow('YouTube', 'Endless Shorts Feed Blocked', 'Y'),
            const SizedBox(height: 16),

            // Motivational Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: AppColors.surfaceWhite,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppColors.borderSubtle),
              ),
              child: Row(
                children: [
                  Container(
                    width: 42,
                    height: 42,
                    decoration: const BoxDecoration(
                      color: AppColors.accentLight,
                      shape: BoxShape.circle,
                    ),
                    alignment: Alignment.center,
                    child: const Text('🎯', style: TextStyle(fontSize: 20)),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('You are doing great!', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 2),
                        Text('18 distraction attempts prevented so far today. Keep going!', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Notice
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppColors.infoSurface,
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                children: [
                  const Icon(Icons.lock_clock_rounded, color: AppColors.infoIcon, size: 20),
                  const SizedBox(width: 10),
                  Expanded(
                    child: Text(
                      'This lock cannot be cancelled or modified until the timer expires.',
                      style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 20),
          ],
        ),
      ),
    );
  }

  static Widget _buildDetailAppRow(String name, String rule, String initial) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        children: [
          Container(
            width: 36,
            height: 36,
            decoration: BoxDecoration(
              color: AppColors.accentLight,
              borderRadius: BorderRadius.circular(10),
            ),
            alignment: Alignment.center,
            child: Text(
              initial,
              style: GoogleFonts.outfit(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: AppColors.primaryAccent,
              ),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                Text(rule, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: AppColors.successBg,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              'Guarded',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: AppColors.successText,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

// ==========================================
// 6. HISTORY, INSIGHTS, SETTINGS SCREENS
// ==========================================
class HistoryScreen extends StatelessWidget {
  const HistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      children: [
        Text('History', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('Past focus sessions & completed locks', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 16),
        _buildHistoryCard('7-Day Social Lock', 'Completed Aug 28 • 168 hours protected'),
        const SizedBox(height: 10),
        _buildHistoryCard('3-Day Deep Work Sprint', 'Completed Aug 20 • 72 hours protected'),
        const SizedBox(height: 10),
        _buildHistoryCard('1-Day Digital Detox', 'Completed Aug 14 • 24 hours protected'),
      ],
    );
  }

  Widget _buildHistoryCard(String title, String subtitle) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(title, style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
          const SizedBox(height: 4),
          Text(subtitle, style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
        ],
      ),
    );
  }
}

class InsightsScreen extends StatelessWidget {
  const InsightsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      children: [
        Text('Insights', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('Screen time reclaimed & analytics', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 16),

        // 2x2 KPI Grid
        Row(
          children: [
            Expanded(child: _buildMetricCard('48h 30m', 'Time Protected', '+12h vs last week', Icons.timer_outlined)),
            const SizedBox(width: 12),
            Expanded(child: _buildMetricCard('14 Days', 'Active Streak', 'Personal best! 🔥', Icons.bolt_rounded)),
          ],
        ),
        const SizedBox(height: 12),
        Row(
          children: [
            Expanded(child: _buildMetricCard('142 blocks', 'Distractions Thwarted', 'Kept you focused', Icons.shield_outlined)),
            const SizedBox(width: 12),
            Expanded(child: _buildMetricCard('96 / 100', 'Focus Score', 'Unbreakable discipline', Icons.trending_up_rounded)),
          ],
        ),
        const SizedBox(height: 16),

        // Weekly Focus Hours Chart
        Container(
          padding: const EdgeInsets.all(18),
          decoration: BoxDecoration(
            color: AppColors.surfaceWhite,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Weekly Focus Hours', style: GoogleFonts.outfit(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 16),
              SizedBox(
                height: 120,
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    _buildBar('Mon', 0.65, false),
                    _buildBar('Tue', 0.85, false),
                    _buildBar('Wed', 0.95, false),
                    _buildBar('Thu', 0.70, false),
                    _buildBar('Fri', 1.0, true),
                    _buildBar('Sat', 0.50, false),
                    _buildBar('Sun', 0.90, false),
                  ],
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        // Most Guarded Apps
        Text('Most Guarded Apps', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        _buildRankRow('1', 'Instagram', '64 blocks prevented', '45%'),
        const SizedBox(height: 8),
        _buildRankRow('2', 'Chrome Incognito', '48 blocks prevented', '34%'),
        const SizedBox(height: 8),
        _buildRankRow('3', 'YouTube Shorts', '30 blocks prevented', '21%'),
        const SizedBox(height: 20),
      ],
    );
  }

  static Widget _buildMetricCard(String val, String title, String subtitle, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, color: AppColors.primaryAccent, size: 22),
          const SizedBox(height: 10),
          Text(val, style: GoogleFonts.outfit(fontSize: 18, fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
          Text(title, style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
          Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
        ],
      ),
    );
  }

  static Widget _buildBar(String day, double fraction, bool isHighlighted) {
    return Column(
      mainAxisAlignment: MainAxisAlignment.end,
      children: [
        Container(
          width: 22,
          height: 80 * fraction,
          decoration: BoxDecoration(
            color: isHighlighted ? AppColors.primaryAccent : AppColors.accentLight,
            borderRadius: const BorderRadius.vertical(top: Radius.circular(6)),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          day,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: isHighlighted ? FontWeight.bold : FontWeight.normal,
            color: isHighlighted ? AppColors.primaryAccent : AppColors.textSecondary,
          ),
        ),
      ],
    );
  }

  static Widget _buildRankRow(String rank, String appName, String subtitle, String percent) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 28,
                height: 28,
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Text(rank, style: GoogleFonts.inter(fontWeight: FontWeight.bold, color: AppColors.primaryAccent, fontSize: 12)),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(appName, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ],
          ),
          Text(percent, style: GoogleFonts.outfit(fontSize: 14, fontWeight: FontWeight.bold, color: AppColors.primaryAccent)),
        ],
      ),
    );
  }
}

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _strictMode = true;
  bool _preventUninstall = true;
  bool _bootResilience = true;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
      children: [
        Text('Settings & Guard', style: GoogleFonts.outfit(fontSize: 28, fontWeight: FontWeight.w800)),
        const SizedBox(height: 4),
        Text('Configure protection levels and enforcement shields', style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary)),
        const SizedBox(height: 16),

        Text('System Protection Status', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        _buildPermissionItem('Accessibility Interceptor', 'Active & monitoring launches', Icons.security_rounded, true),
        const SizedBox(height: 8),
        _buildPermissionItem('System Alert Overlay', 'Granted for non-bypassable screen', Icons.shield_rounded, true),
        const SizedBox(height: 8),
        _buildPermissionItem('Battery Optimization', 'Unrestricted background persistence', Icons.battery_saver_rounded, true),
        const SizedBox(height: 18),

        Text('Strict Mode & Anti-Bypass', style: GoogleFonts.outfit(fontSize: 16, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceWhite,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            children: [
              SwitchListTile(
                value: _strictMode,
                onChanged: (v) => setState(() => _strictMode = v),
                activeColor: AppColors.primaryAccent,
                title: Text('Strict Mode (Unbreakable)', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('Disables early unlock, cancellation, and timer edits', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                contentPadding: EdgeInsets.zero,
              ),
              const Divider(color: AppColors.borderSubtle),
              SwitchListTile(
                value: _preventUninstall,
                onChanged: (v) => setState(() => _preventUninstall = v),
                activeColor: AppColors.primaryAccent,
                title: Text('Anti-Uninstall Defense', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('Prevents app removal during active sessions', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                contentPadding: EdgeInsets.zero,
              ),
              const Divider(color: AppColors.borderSubtle),
              SwitchListTile(
                value: _bootResilience,
                onChanged: (v) => setState(() => _bootResilience = v),
                activeColor: AppColors.primaryAccent,
                title: Text('Reboot Resilience', style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600)),
                subtitle: Text('Automatically restores locks upon device restart', style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                contentPadding: EdgeInsets.zero,
              ),
            ],
          ),
        ),
        const SizedBox(height: 16),

        Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            color: AppColors.surfaceWhite,
            borderRadius: BorderRadius.circular(16),
            border: Border.all(color: AppColors.borderSubtle),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('FocusLock v1.0.0', style: GoogleFonts.inter(fontSize: 15, fontWeight: FontWeight.bold, color: AppColors.textPrimary)),
              const SizedBox(height: 4),
              Text('Clean Architecture • Jetpack Compose • MVVM • Room SQLite', style: GoogleFonts.inter(fontSize: 12, color: AppColors.textSecondary)),
            ],
          ),
        ),
        const SizedBox(height: 20),
      ],
    );
  }

  static Widget _buildPermissionItem(String title, String subtitle, IconData icon, bool isGranted) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: AppColors.surfaceWhite,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: AppColors.borderSubtle),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: const BoxDecoration(
                  color: AppColors.accentLight,
                  shape: BoxShape.circle,
                ),
                alignment: Alignment.center,
                child: Icon(icon, color: AppColors.primaryAccent, size: 18),
              ),
              const SizedBox(width: 12),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(title, style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.w600, color: AppColors.textPrimary)),
                  Text(subtitle, style: GoogleFonts.inter(fontSize: 11, color: AppColors.textSecondary)),
                ],
              ),
            ],
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
            decoration: BoxDecoration(
              color: isGranted ? AppColors.successBg : AppColors.accentLight,
              borderRadius: BorderRadius.circular(10),
            ),
            child: Text(
              isGranted ? 'Active' : 'Action Needed',
              style: GoogleFonts.inter(
                fontSize: 11,
                fontWeight: FontWeight.bold,
                color: isGranted ? AppColors.successText : AppColors.primaryAccent,
              ),
            ),
          ),
        ],
      ),
    );
  }
}
