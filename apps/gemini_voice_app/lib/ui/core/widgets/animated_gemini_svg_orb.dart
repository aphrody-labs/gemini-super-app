import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'package:flutter_svg/flutter_svg.dart';
import '../../../domain/models/voice_models.dart';

/// Official Gemini Sparkle SVG string embedded directly so it renders
/// instantaneously at 60/120 FPS in both desktop/web runtime and widget tests.
const String kOfficialGeminiSparkleSvg = '''
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none">
  <defs>
    <linearGradient id="geminiOfficialGrad" x1="6" y1="6" x2="58" y2="58" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#4285F4"/>
      <stop offset="35%" stop-color="#9B72CB"/>
      <stop offset="72%" stop-color="#D96570"/>
      <stop offset="100%" stop-color="#F49C46"/>
    </linearGradient>
  </defs>
  <path
    d="M32 2C32 18.5685 18.5685 32 2 32C18.5685 32 32 45.4315 32 62C32 45.4315 45.4315 32 62 32C45.4315 32 32 18.5685 32 2Z"
    fill="url(#geminiOfficialGrad)"
  />
  <path
    d="M51 6C51 11.5228 46.5228 16 41 16C46.5228 16 51 20.4772 51 26C51 20.4772 55.4772 16 61 16C55.4772 16 51 11.5228 51 6Z"
    fill="url(#geminiOfficialGrad)"
    opacity="0.88"
  />
</svg>
''';

/// Permanently animated Official Gemini SVG & Live Audio-Reactive Orb.
/// Replicates the fluid, humanized Gemini Mobile Live voice experience.
class AnimatedGeminiSvgOrb extends StatefulWidget {
  const AnimatedGeminiSvgOrb({
    super.key,
    required this.state,
    required this.isLiveActive,
    required this.isRecordingPtt,
    required this.inputRms,
    required this.outputRms,
    required this.fftBins,
    this.size = 240.0,
    this.onTap,
    this.onLongPressStart,
    this.onLongPressEnd,
  });

  final VoiceInteractionState state;
  final bool isLiveActive;
  final bool isRecordingPtt;
  final double inputRms;
  final double outputRms;
  final List<double> fftBins;
  final double size;
  final VoidCallback? onTap;
  final VoidCallback? onLongPressStart;
  final VoidCallback? onLongPressEnd;

  @override
  State<AnimatedGeminiSvgOrb> createState() => _AnimatedGeminiSvgOrbState();
}

class _AnimatedGeminiSvgOrbState extends State<AnimatedGeminiSvgOrb>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 6),
    )..repeat();
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final activeEnergy = math.max(widget.inputRms, widget.outputRms);
    final speedMultiplier = switch (widget.state) {
      VoiceInteractionState.speaking => 2.6,
      VoiceInteractionState.thinking => 3.2,
      VoiceInteractionState.listening => 1.8,
      VoiceInteractionState.interrupted => 3.5,
      VoiceInteractionState.idle => 1.0,
    };

    return Semantics(
      button: true,
      label: 'Orbe vocal officiel Gemini Live (${widget.state.name})',
      child: GestureDetector(
        key: const Key('gemini_live_svg_orb'),
        onTap: widget.onTap,
        onLongPressStart: widget.onLongPressStart != null
            ? (_) => widget.onLongPressStart!()
            : null,
        onLongPressEnd: widget.onLongPressEnd != null
            ? (_) => widget.onLongPressEnd!()
            : null,
        child: SizedBox(
          width: widget.size,
          height: widget.size,
          child: AnimatedBuilder(
            animation: _controller,
            builder: (context, child) {
              final phase = _controller.value * 2 * math.pi * speedMultiplier;
              final breathScale = 1.0 +
                  0.06 * math.sin(phase) +
                  (activeEnergy * 0.38).clamp(0.0, 0.42);
              final rotationAngle =
                  _controller.value * 2 * math.pi * (widget.isLiveActive ? 1.0 : 0.35);

              return Stack(
                alignment: Alignment.center,
                children: <Widget>[
                  // 1. Multi-layer fluid aurora + 32-band radial FFT spectrum
                  CustomPaint(
                    size: Size(widget.size, widget.size),
                    painter: _GeminiLiveAuroraPainter(
                      phase: phase,
                      state: widget.state,
                      isLiveActive: widget.isLiveActive || widget.isRecordingPtt,
                      energy: activeEnergy,
                      fftBins: widget.fftBins,
                    ),
                  ),
                  // 2. Permanently animated official Gemini SVG core
                  Transform.scale(
                    scale: breathScale,
                    child: Transform.rotate(
                      angle: rotationAngle * 0.25,
                      child: SizedBox(
                        width: widget.size * 0.42,
                        height: widget.size * 0.42,
                        child: SvgPicture.string(
                          kOfficialGeminiSparkleSvg,
                          fit: BoxFit.contain,
                        ),
                      ),
                    ),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

class _GeminiLiveAuroraPainter extends CustomPainter {
  _GeminiLiveAuroraPainter({
    required this.phase,
    required this.state,
    required this.isLiveActive,
    required this.energy,
    required this.fftBins,
  });

  final double phase;
  final VoiceInteractionState state;
  final bool isLiveActive;
  final double energy;
  final List<double> fftBins;

  static const List<Color> _geminiColors = <Color>[
    Color(0xFF4285F4), // Google Blue
    Color(0xFF9B72CB), // Gemini Purple
    Color(0xFFD96570), // Gemini Coral Rose
    Color(0xFFF49C46), // Gemini Warm Amber
    Color(0xFF4285F4),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final center = Offset(size.width / 2, size.height / 2);
    final baseRadius = size.width * 0.28;

    // Outer ambient glow
    final glowRadius = baseRadius * (1.35 + energy * 0.55 + 0.08 * math.sin(phase));
    final glowPaint = Paint()
      ..shader = RadialGradient(
        colors: <Color>[
          const Color(0xFF4285F4).withValues(alpha: isLiveActive ? 0.34 : 0.16),
          const Color(0xFF9B72CB).withValues(alpha: isLiveActive ? 0.22 : 0.08),
          const Color(0xFFD96570).withValues(alpha: 0.0),
        ],
      ).createShader(Rect.fromCircle(center: center, radius: glowRadius));
    canvas.drawCircle(center, glowRadius, glowPaint);

    // 3 organic morphing harmonic rings
    for (var layer = 0; layer < 3; layer++) {
      final path = Path();
      const points = 64;
      final layerPhase = phase * (1.0 + layer * 0.35) + layer * 1.1;
      final ringRadius = baseRadius * (0.88 + layer * 0.14 + energy * 0.22);

      for (var i = 0; i <= points; i++) {
        final theta = (i / points) * 2 * math.pi;
        final binIdx = i % (fftBins.isNotEmpty ? fftBins.length : 1);
        final binVal = fftBins.isNotEmpty ? fftBins[binIdx] : 0.15;
        final waveOffset = math.sin(theta * (3 + layer) + layerPhase) *
                (4.0 + binVal * 14.0) +
            math.cos(theta * 2 - layerPhase) * (3.0 + energy * 10.0);
        final r = ringRadius + waveOffset;
        final pt = Offset(
          center.dx + r * math.cos(theta),
          center.dy + r * math.sin(theta),
        );
        if (i == 0) {
          path.moveTo(pt.dx, pt.dy);
        } else {
          path.lineTo(pt.dx, pt.dy);
        }
      }
      path.close();

      final sweepPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.6 - layer * 0.5
        ..shader = SweepGradient(
          colors: _geminiColors,
          transform: GradientRotation(layerPhase * 0.5),
        ).createShader(Rect.fromCircle(center: center, radius: ringRadius * 1.3));
      canvas.drawPath(path, sweepPaint);
    }

    // 32 radial FFT spectrum bars around the orb
    final barCount = fftBins.isNotEmpty ? math.min(32, fftBins.length) : 32;
    final innerBarRadius = baseRadius * 1.18;
    for (var i = 0; i < barCount; i++) {
      final angle = (i / barCount) * 2 * math.pi + phase * 0.18;
      final val = fftBins.isNotEmpty
          ? fftBins[i].clamp(0.05, 1.0)
          : (0.12 + 0.08 * math.sin(phase + i)).clamp(0.05, 1.0);
      final barLen = (size.width * 0.04) + val * (size.width * 0.11);
      final p1 = Offset(
        center.dx + innerBarRadius * math.cos(angle),
        center.dy + innerBarRadius * math.sin(angle),
      );
      final p2 = Offset(
        center.dx + (innerBarRadius + barLen) * math.cos(angle),
        center.dy + (innerBarRadius + barLen) * math.sin(angle),
      );
      final colorIdx = ((i / barCount) * (_geminiColors.length - 1)).floor();
      final barPaint = Paint()
        ..color = _geminiColors[colorIdx].withValues(
          alpha: isLiveActive ? 0.85 : 0.45,
        )
        ..strokeWidth = 3.0
        ..strokeCap = StrokeCap.round;
      canvas.drawLine(p1, p2, barPaint);
    }
  }

  @override
  bool shouldRepaint(_GeminiLiveAuroraPainter oldDelegate) => true;
}
