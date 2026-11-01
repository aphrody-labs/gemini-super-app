import 'package:flutter/material.dart';
import '../../../../domain/models/voice_models.dart';
import '../../../core/widgets/animated_gemini_svg_orb.dart';
import '../view_models/voice_hub_view_model.dart';

/// Main interactive screen for the Gemini Live Multi-Surface Voice Hub.
/// Adapts between Mobile/Compact Background Overlay and Desktop/Web Studio.
class VoiceHubScreen extends StatefulWidget {
  const VoiceHubScreen({super.key, required this.viewModel});

  final VoiceHubViewModel viewModel;

  @override
  State<VoiceHubScreen> createState() => _VoiceHubScreenState();
}

class _VoiceHubScreenState extends State<VoiceHubScreen> {
  final TextEditingController _promptController = TextEditingController();

  static const List<String> _availableVoices = <String>[
    'Aoede',
    'Puck',
    'Kore',
    'Zephyr',
    'Fenrir',
    'Charon',
  ];

  static const List<String> _availableLiveModels = <String>[
    'gemini-3.8-live',
    'gemini-3.8-live-extended-thinking',
    'gemini-3.5-live-translate-preview',
    'gemini-3.5-transcribe-live',
  ];

  static const Map<String, String> _surfaceLabels = <String, String>{
    'flutter_app': 'Flutter App',
    'agy_cli': 'agy CLI (/voice & :24713)',
    'antigravity_app': 'Antigravity App (Sidecar)',
    'gemini_web': 'Gemini Web App',
    'gemini_windows': 'Gemini Windows App',
  };

  @override
  void dispose() {
    _promptController.dispose();
    super.dispose();
  }

  Future<void> _submitCommand() async {
    final text = _promptController.text.trim();
    if (text.isEmpty) return;
    _promptController.clear();
    await widget.viewModel.submitPromptOrSlashCommand(text);
  }

  @override
  Widget build(BuildContext context) {
    return ListenableBuilder(
      listenable: widget.viewModel,
      builder: (context, _) {
        final vm = widget.viewModel;
        return Scaffold(
          backgroundColor: const Color(0xFF0B0D14),
          body: SafeArea(
            child: LayoutBuilder(
              builder: (context, constraints) {
                if (vm.isCompactOverlayMode || constraints.maxWidth < 1024) {
                  return _buildCompactMobileLiveLayout(context, vm);
                }
                return _buildWideStudioLayout(context, vm);
              },
            ),
          ),
        );
      },
    );
  }

  Widget _buildCompactMobileLiveLayout(
    BuildContext context,
    VoiceHubViewModel vm,
  ) {
    return Column(
      children: <Widget>[
        _buildTopHeader(vm, isCompact: true),
        Expanded(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: <Widget>[
                _buildCenterOrbStage(vm, orbSize: 210),
                const SizedBox(height: 12),
                _buildSurfaceSelectorRow(vm),
                const SizedBox(height: 12),
                _buildLatestTurnCard(vm),
              ],
            ),
          ),
        ),
        _buildPromptInputBar(vm),
        _buildBottomInteractiveControls(vm),
      ],
    );
  }

  Widget _buildWideStudioLayout(BuildContext context, VoiceHubViewModel vm) {
    return Column(
      children: <Widget>[
        _buildTopHeader(vm, isCompact: false),
        Expanded(
          child: Row(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              // Left Panel: 4-Surface Bridge & Gemini Live / Whisper / TTS Config
              SizedBox(
                width: 320,
                child: _buildLeftConfigurationPanel(vm),
              ),
              // Center Stage: Permanently Animated Official Gemini SVG Orb & Live Controls
              Expanded(
                flex: 5,
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: <Widget>[
                    Expanded(
                      child: Center(
                        child: SingleChildScrollView(
                          child: _buildCenterOrbStage(vm, orbSize: 250),
                        ),
                      ),
                    ),
                    _buildPromptInputBar(vm),
                    _buildBottomInteractiveControls(vm),
                  ],
                ),
              ),
              // Right Panel: Real-time Conversation Transcript & Antigravity Dispatch
              SizedBox(
                width: 350,
                child: _buildRightTranscriptPanel(vm),
              ),
            ],
          ),
        ),
      ],
    );
  }

  Widget _buildTopHeader(VoiceHubViewModel vm, {required bool isCompact}) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
      decoration: const BoxDecoration(
        color: Color(0xFF111522),
        border: Border(
          bottom: BorderSide(color: Color(0xFF232942)),
        ),
      ),
      child: Row(
        children: <Widget>[
          Container(
            width: 10,
            height: 10,
            decoration: BoxDecoration(
              shape: BoxShape.circle,
              color: vm.isLiveActive
                  ? const Color(0xFF34A853)
                  : const Color(0xFF4285F4),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              isCompact
                  ? 'Gemini Live Voice • ${vm.config.voiceName}'
                  : 'Gemini Live Voice Hub • ${vm.config.liveModel} • ${vm.config.reasoningModel} • Whisper ${vm.config.whisperModelSize}',
              style: const TextStyle(
                color: Color(0xFFE8EAED),
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
              overflow: TextOverflow.ellipsis,
            ),
          ),
          TextButton.icon(
            key: const Key('overlay_mode_toggle_btn'),
            onPressed: vm.toggleCompactOverlayMode,
            icon: Icon(
              vm.isCompactOverlayMode
                  ? Icons.open_in_full
                  : Icons.picture_in_picture_alt,
              size: 16,
              color: const Color(0xFF8AB4F8),
            ),
            label: Text(
              vm.isCompactOverlayMode ? 'Studio' : 'Mini-Orbe',
              style: const TextStyle(color: Color(0xFF8AB4F8), fontSize: 12),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildCenterOrbStage(VoiceHubViewModel vm, {required double orbSize}) {
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: <Widget>[
        AnimatedGeminiSvgOrb(
          state: vm.state,
          isLiveActive: vm.isLiveActive,
          isRecordingPtt: vm.isRecordingPtt,
          inputRms: vm.inputRms,
          outputRms: vm.outputRms,
          fftBins: vm.fftBins,
          size: orbSize,
          onTap: () {
            if (vm.state == VoiceInteractionState.speaking) {
              vm.interruptModel();
            } else {
              vm.toggleLiveVoiceMode();
            }
          },
          onLongPressStart: vm.startPushToTalk,
          onLongPressEnd: vm.stopPushToTalk,
        ),
        const SizedBox(height: 12),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
          decoration: BoxDecoration(
            color: const Color(0xFF171C2E),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color: vm.isLiveActive
                  ? const Color(0xFF4285F4)
                  : const Color(0xFF2E3654),
            ),
          ),
          child: Text(
            vm.state.labelFr,
            key: const Key('voice_state_label'),
            style: const TextStyle(
              color: Color(0xFFD2E3FC),
              fontWeight: FontWeight.w600,
              fontSize: 13,
            ),
          ),
        ),
        const SizedBox(height: 6),
        Text(
          vm.lastBridgeNotice,
          style: const TextStyle(color: Color(0xFF9AA0A6), fontSize: 11),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }

  Widget _buildSurfaceSelectorRow(VoiceHubViewModel vm) {
    return Wrap(
      spacing: 8,
      runSpacing: 8,
      alignment: WrapAlignment.center,
      children: _surfaceLabels.entries.map((entry) {
        final isSelected = vm.selectedSurface == entry.key;
        return ChoiceChip(
          key: Key('surface_chip_${entry.key}'),
          label: Text(entry.value, style: const TextStyle(fontSize: 11)),
          selected: isSelected,
          selectedColor: const Color(0xFF1A73E8),
          backgroundColor: const Color(0xFF171C2E),
          labelStyle: TextStyle(
            color: isSelected ? Colors.white : const Color(0xFFBDC1C6),
          ),
          onSelected: (_) => vm.selectSurface(entry.key),
        );
      }).toList(),
    );
  }

  Widget _buildLatestTurnCard(VoiceHubViewModel vm) {
    final turn = vm.latestTurn;
    if (turn == null) return const SizedBox.shrink();
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: const Color(0xFF151928),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: const Color(0xFF28304D)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Text(
            '${turn.isUser ? "Vous" : "Gemini Live"} • ${turn.surface} (${turn.latencyMs} ms)',
            style: const TextStyle(
              color: Color(0xFF8AB4F8),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            turn.text,
            style: const TextStyle(color: Color(0xFFE8EAED), fontSize: 13),
          ),
        ],
      ),
    );
  }

  Widget _buildLeftConfigurationPanel(VoiceHubViewModel vm) {
    return Material(
      color: const Color(0xFF101320),
      child: Container(
        padding: const EdgeInsets.all(14),
        decoration: const BoxDecoration(
          border: Border(right: BorderSide(color: Color(0xFF232942))),
        ),
        child: ListView(
        children: <Widget>[
          const Text(
            'Ponts Multi-Surfaces Actifs',
            style: TextStyle(
              color: Color(0xFFE8EAED),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          ..._surfaceLabels.entries.map((entry) {
            final enabled = vm.config.bridgedSurfaces[entry.key] ?? true;
            return SwitchListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              title: Text(
                entry.value,
                style: const TextStyle(color: Color(0xFFDADCE0), fontSize: 12),
              ),
              value: enabled,
              activeThumbColor: const Color(0xFF4285F4),
              onChanged: (_) => vm.toggleSurfaceBridge(entry.key),
            );
          }),
          const Divider(color: Color(0xFF232942), height: 24),
          const Text(
            'Voix HD Gemini 3.8 Live & TTS',
            style: TextStyle(
              color: Color(0xFFE8EAED),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          Wrap(
            spacing: 6,
            runSpacing: 6,
            children: _availableVoices.map((voice) {
              final selected = vm.config.voiceName == voice;
              return ChoiceChip(
                key: Key('voice_chip_$voice'),
                label: Text(voice, style: const TextStyle(fontSize: 11)),
                selected: selected,
                selectedColor: const Color(0xFF9B72CB),
                backgroundColor: const Color(0xFF1A2035),
                labelStyle: TextStyle(
                  color: selected ? Colors.white : const Color(0xFFBDC1C6),
                ),
                onSelected: (_) => vm.updateVoicePersona(voice),
              );
            }).toList(),
          ),
          const Divider(color: Color(0xFF232942), height: 24),
          const Text(
            'Modèle Temps Réel',
            style: TextStyle(
              color: Color(0xFFE8EAED),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          ..._availableLiveModels.map((model) {
            final isSelected = vm.config.liveModel == model;
            return ListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              leading: Icon(
                isSelected
                    ? Icons.radio_button_checked
                    : Icons.radio_button_off,
                color: isSelected
                    ? const Color(0xFF4285F4)
                    : const Color(0xFF9AA0A6),
                size: 18,
              ),
              title: Text(
                model,
                style: const TextStyle(color: Color(0xFFDADCE0), fontSize: 12),
              ),
              onTap: () => vm.updateLiveModel(model),
            );
          }),
        ],
        ),
      ),
    );
  }

  Widget _buildRightTranscriptPanel(VoiceHubViewModel vm) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: const BoxDecoration(
        color: Color(0xFF101320),
        border: Border(left: BorderSide(color: Color(0xFF232942))),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          const Text(
            'Conversation Fluide Temps Réel',
            style: TextStyle(
              color: Color(0xFFE8EAED),
              fontWeight: FontWeight.w700,
              fontSize: 13,
            ),
          ),
          const SizedBox(height: 8),
          _buildSurfaceSelectorRow(vm),
          const SizedBox(height: 10),
          Expanded(
            child: ListView.builder(
              key: const Key('conversation_turns_list'),
              itemCount: vm.turns.length,
              itemBuilder: (context, index) {
                final turn = vm.turns[index];
                return Container(
                  margin: const EdgeInsets.only(bottom: 10),
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: turn.isUser
                        ? const Color(0xFF1B243B)
                        : const Color(0xFF161B2E),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: turn.isUser
                          ? const Color(0xFF4285F4)
                          : const Color(0xFF33294A),
                    ),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: <Widget>[
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: <Widget>[
                          Text(
                            turn.isUser ? 'Vous' : 'Gemini Live',
                            style: TextStyle(
                              color: turn.isUser
                                  ? const Color(0xFF8AB4F8)
                                  : const Color(0xFFF28B82),
                              fontWeight: FontWeight.w700,
                              fontSize: 11,
                            ),
                          ),
                          Flexible(
                            child: Text(
                              '${turn.surface} • ${turn.latencyMs}ms',
                              style: const TextStyle(
                                color: Color(0xFF9AA0A6),
                                fontSize: 10,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        turn.text,
                        style: const TextStyle(
                          color: Color(0xFFE8EAED),
                          fontSize: 12.5,
                        ),
                      ),
                    ],
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildPromptInputBar(VoiceHubViewModel vm) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      child: Row(
        children: <Widget>[
          Expanded(
            child: TextField(
              key: const Key('slash_voice_text_field'),
              controller: _promptController,
              style: const TextStyle(color: Color(0xFFE8EAED), fontSize: 13),
              decoration: InputDecoration(
                hintText:
                    'Tape /voice, /record, /agy <commande> ou parle directement...',
                hintStyle: const TextStyle(
                  color: Color(0xFF7F8694),
                  fontSize: 12,
                ),
                filled: true,
                fillColor: const Color(0xFF161B2C),
                contentPadding: const EdgeInsets.symmetric(
                  horizontal: 14,
                  vertical: 10,
                ),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(999),
                  borderSide: const BorderSide(color: Color(0xFF2B3454)),
                ),
              ),
              onSubmitted: (_) => _submitCommand(),
            ),
          ),
          const SizedBox(width: 8),
          IconButton(
            key: const Key('send_prompt_btn'),
            onPressed: _submitCommand,
            icon: const Icon(Icons.send_rounded, color: Color(0xFF8AB4F8)),
            tooltip: 'Envoyer au Hub Gemini Live',
          ),
        ],
      ),
    );
  }

  Widget _buildBottomInteractiveControls(VoiceHubViewModel vm) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: const BoxDecoration(
        color: Color(0xFF111522),
        border: Border(top: BorderSide(color: Color(0xFF232942))),
      ),
      child: Wrap(
        spacing: 12,
        runSpacing: 8,
        alignment: WrapAlignment.center,
        crossAxisAlignment: WrapCrossAlignment.center,
        children: <Widget>[
          // 1. Interactive `/voice` Live Mode Button (Gemini Mobile App style)
          ElevatedButton.icon(
            key: const Key('slash_voice_live_btn'),
            onPressed: vm.toggleLiveVoiceMode,
            style: ElevatedButton.styleFrom(
              backgroundColor: vm.isLiveActive
                  ? const Color(0xFF1A73E8)
                  : const Color(0xFF1F263D),
              foregroundColor: Colors.white,
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
              shape: const StadiumBorder(),
            ),
            icon: Icon(
              vm.isLiveActive ? Icons.graphic_eq : Icons.auto_awesome,
              size: 18,
            ),
            label: Text(
              vm.isLiveActive ? '/voice LIVE ACTIF' : 'Activer /voice Live',
              style: const TextStyle(fontWeight: FontWeight.w700, fontSize: 13),
            ),
          ),
          // 2. Interactive `● Record` (`/record` / `F5`) Button
          GestureDetector(
            onLongPressStart: (_) => vm.startPushToTalk(),
            onLongPressEnd: (_) => vm.stopPushToTalk(),
            child: ElevatedButton.icon(
              key: const Key('record_ptt_btn'),
              onPressed: vm.toggleRecordButton,
              style: ElevatedButton.styleFrom(
                backgroundColor: vm.isRecordingPtt
                    ? const Color(0xFFD93025)
                    : const Color(0xFF9B72CB),
                foregroundColor: Colors.white,
                padding: const EdgeInsets.symmetric(
                  horizontal: 18,
                  vertical: 12,
                ),
                shape: const StadiumBorder(),
              ),
              icon: Icon(
                vm.isRecordingPtt ? Icons.stop_circle : Icons.mic,
                size: 18,
              ),
              label: Text(
                vm.isRecordingPtt ? '■ Stop Record (F5)' : '● Record (/record)',
                style: const TextStyle(
                  fontWeight: FontWeight.w700,
                  fontSize: 13,
                ),
              ),
            ),
          ),
          // 3. Barge-in / Interrupt Button
          OutlinedButton.icon(
            key: const Key('interrupt_barge_in_btn'),
            onPressed: vm.interruptModel,
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFFF28B82),
              side: const BorderSide(color: Color(0xFFF28B82)),
              shape: const StadiumBorder(),
            ),
            icon: const Icon(Icons.pan_tool_alt_outlined, size: 16),
            label: const Text('Interrompre', style: TextStyle(fontSize: 12)),
          ),
          // 4. Mute Button
          IconButton(
            key: const Key('mute_mic_btn'),
            onPressed: vm.toggleMute,
            icon: Icon(
              vm.isMuted ? Icons.mic_off : Icons.mic_none,
              color: vm.isMuted
                  ? const Color(0xFFF28B82)
                  : const Color(0xFF8AB4F8),
            ),
            tooltip: vm.isMuted ? 'Réactiver le micro' : 'Couper le micro',
          ),
          // 5. Bridge to `agy` CLI & Antigravity App button
          OutlinedButton.icon(
            key: const Key('bridge_agy_btn'),
            onPressed: () {
              final text = vm.latestTurn?.text ?? 'Status Gemini Live Voice';
              vm.dispatchToAntigravity(text, target: 'cli');
            },
            style: OutlinedButton.styleFrom(
              foregroundColor: const Color(0xFF8AB4F8),
              side: const BorderSide(color: Color(0xFF3C4D70)),
              shape: const StadiumBorder(),
            ),
            icon: const Icon(Icons.terminal, size: 16),
            label: const Text('Sync agy CLI', style: TextStyle(fontSize: 12)),
          ),
        ],
      ),
    );
  }
}
