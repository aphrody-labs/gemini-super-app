import 'dart:async';
import 'package:flutter/foundation.dart';
import '../../../../data/repositories/voice_repository.dart';
import '../../../../domain/models/voice_models.dart';

/// ViewModel managing the UI state and user interactions for the Gemini Live
/// Multi-Surface Voice Hub.
class VoiceHubViewModel extends ChangeNotifier {
  VoiceHubViewModel({required this._repository}) {
    _telemetrySub = _repository.telemetryStream.listen((_) {
      notifyListeners();
    });
    _turnsSub = _repository.turnsStream.listen((_) {
      notifyListeners();
    });
    _configSub = _repository.configStream.listen((_) {
      notifyListeners();
    });
  }

  final VoiceRepository _repository;
  StreamSubscription<VoiceTelemetrySnapshot>? _telemetrySub;
  StreamSubscription<List<VoiceConversationTurn>>? _turnsSub;
  StreamSubscription<VoiceEngineConfig>? _configSub;

  bool _isMuted = false;
  bool _isCompactOverlayMode = false;
  String _selectedSurface = 'flutter_app';
  String _lastBridgeNotice =
      'Connecté à agy CLI (:24713), Antigravity App, Gemini Web & Windows';

  VoiceInteractionState get state => _repository.currentTelemetry.state;
  bool get isLiveActive => _repository.currentTelemetry.isLiveActive;
  bool get isRecordingPtt => _repository.currentTelemetry.isRecordingPtt;
  double get inputRms => _isMuted ? 0.0 : _repository.currentTelemetry.inputRms;
  double get outputRms => _repository.currentTelemetry.outputRms;
  List<double> get fftBins => _repository.currentTelemetry.fftBins;
  int get activeClients => _repository.currentTelemetry.activeClients;
  int get micTcpClients => _repository.currentTelemetry.micTcpClients;

  VoiceEngineConfig get config => _repository.currentConfig;
  List<VoiceConversationTurn> get turns => _repository.currentTurns;
  bool get isMuted => _isMuted;
  bool get isCompactOverlayMode => _isCompactOverlayMode;
  String get selectedSurface => _selectedSurface;
  String get lastBridgeNotice => _lastBridgeNotice;
  bool get isBridgeConnected => _repository.isBridgeConnected;

  VoiceConversationTurn? get latestTurn =>
      turns.isNotEmpty ? turns.last : null;

  /// Connects to the local Python Voice Bridge Server on startup.
  Future<void> initialize() async {
    await _repository.initialize();
    notifyListeners();
  }

  /// Toggles full-duplex Gemini Live mode (`/voice`).
  Future<void> toggleLiveVoiceMode() async {
    await _repository.toggleLiveMode(surface: _selectedSurface);
    notifyListeners();
  }

  /// Starts interactive Push-to-Talk (`/record` / `F5`).
  Future<void> startPushToTalk() async {
    await _repository.startPushToTalk(surface: _selectedSurface);
    notifyListeners();
  }

  /// Stops interactive Push-to-Talk (`/record` release).
  Future<void> stopPushToTalk({String? simulatedVoiceText}) async {
    await _repository.stopPushToTalk(
      surface: _selectedSurface,
      simulatedTranscript: simulatedVoiceText,
    );
    notifyListeners();
  }

  /// Toggles Push-to-Talk recording when the user taps the Record button.
  Future<void> toggleRecordButton() async {
    if (isRecordingPtt) {
      await stopPushToTalk();
    } else {
      await startPushToTalk();
    }
  }

  /// Politely interrupts Gemini while speaking (Barge-In).
  Future<void> interruptModel() async {
    await _repository.interruptSpeech();
    notifyListeners();
  }

  /// Toggles microphone mute state.
  void toggleMute() {
    _isMuted = !_isMuted;
    notifyListeners();
  }

  /// Switches between Full Studio View and Compact Always-On Background Overlay.
  void toggleCompactOverlayMode() {
    _isCompactOverlayMode = !_isCompactOverlayMode;
    notifyListeners();
  }

  /// Selects the active target surface (`flutter_app`, `agy_cli`, `antigravity_app`, `gemini_web`, `gemini_windows`).
  void selectSurface(String surface) {
    _selectedSurface = surface;
    notifyListeners();
  }

  /// Sends a text or `/voice` command to the active hub.
  Future<void> submitPromptOrSlashCommand(String rawText) async {
    final trimmed = rawText.trim();
    if (trimmed.isEmpty) return;
    await _repository.sendUtterance(trimmed, surface: _selectedSurface);
    notifyListeners();
  }

  /// Updates the active Gemini Live HD voice (`Aoede`, `Puck`, `Kore`, `Zephyr`, `Fenrir`, `Charon`).
  Future<void> updateVoicePersona(String voiceName) async {
    await _repository.updateConfig(config.copyWith(voiceName: voiceName));
    notifyListeners();
  }

  /// Updates the active Gemini Live model (`gemini-3.8-live`, `gemini-3.8-live-extended-thinking`, `gemini-3.5-live-translate-preview`).
  Future<void> updateLiveModel(String liveModel) async {
    await _repository.updateConfig(config.copyWith(liveModel: liveModel));
    notifyListeners();
  }

  /// Updates the active VAD mode (`hybrid`, `auto`, `manual_ptt`).
  Future<void> updateVadMode(String vadMode) async {
    await _repository.updateConfig(config.copyWith(vadMode: vadMode));
    notifyListeners();
  }

  /// Toggles a bridged surface in the 4-surface matrix.
  Future<void> toggleSurfaceBridge(String surfaceKey) async {
    final updated = Map<String, bool>.from(config.bridgedSurfaces);
    updated[surfaceKey] = !(updated[surfaceKey] ?? true);
    await _repository.updateConfig(
      config.copyWith(bridgedSurfaces: Map<String, bool>.unmodifiable(updated)),
    );
    notifyListeners();
  }

  /// Dispatches the latest voice command directly to `agy` CLI or Antigravity App via `agentapi`.
  Future<void> dispatchToAntigravity(String prompt, {String target = 'cli'}) async {
    final res = await _repository.bridgeToAntigravityAgentApi(
      prompt,
      target: target,
    );
    _lastBridgeNotice =
        'Envoyé vers Antigravity ($target): ${res['status'] ?? 'ok'}';
    notifyListeners();
  }

  @override
  void dispose() {
    _telemetrySub?.cancel();
    _turnsSub?.cancel();
    _configSub?.cancel();
    super.dispose();
  }
}
