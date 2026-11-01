import 'package:flutter/foundation.dart';

/// Represents the current lifecycle state of the Gemini Live voice session.
enum VoiceInteractionState {
  idle,
  listening,
  thinking,
  speaking,
  interrupted;

  static VoiceInteractionState fromServerString(String? raw) {
    return switch (raw?.toUpperCase()) {
      'LISTENING' => VoiceInteractionState.listening,
      'THINKING' => VoiceInteractionState.thinking,
      'SPEAKING' => VoiceInteractionState.speaking,
      'INTERRUPTED' => VoiceInteractionState.interrupted,
      _ => VoiceInteractionState.idle,
    };
  }

  String get labelFr => switch (this) {
        VoiceInteractionState.idle => 'En veille (Arrière-plan actif)',
        VoiceInteractionState.listening => 'À l\'écoute en direct...',
        VoiceInteractionState.thinking => 'Raisonnement Gemini 4 Argon...',
        VoiceInteractionState.speaking => 'Gemini vous répond...',
        VoiceInteractionState.interrupted => 'Interruption (Barge-in)...',
      };
}

/// Immutable configuration for the Gemini Live + Whisper + TTS + Antigravity bridge.
@immutable
class VoiceEngineConfig {
  const VoiceEngineConfig({
    this.liveModel = 'gemini-3.8-live',
    this.reasoningModel = 'gemini-4-argon',
    this.ttsModel = 'gemini-3.8-flash-tts',
    this.transcribeModel = 'gemini-3.5-transcribe-live',
    this.whisperModelSize = 'large-v3-turbo',
    this.voiceName = 'Aoede',
    this.languageCode = 'fr-FR',
    this.vadMode = 'hybrid',
    this.speechStyle = 'warm, natural, fluid, humanized and conversational',
    this.thinkingLevel = 'low',
    this.alwaysOnBackground = true,
    this.bargeInEnabled = true,
    this.bridgedSurfaces = const <String, bool>{
      'flutter_app': true,
      'agy_cli': true,
      'antigravity_app': true,
      'gemini_web': true,
      'gemini_windows': true,
    },
  });

  final String liveModel;
  final String reasoningModel;
  final String ttsModel;
  final String transcribeModel;
  final String whisperModelSize;
  final String voiceName;
  final String languageCode;
  final String vadMode;
  final String speechStyle;
  final String thinkingLevel;
  final bool alwaysOnBackground;
  final bool bargeInEnabled;
  final Map<String, bool> bridgedSurfaces;

  factory VoiceEngineConfig.fromJson(Map<String, dynamic> json) {
    final rawSurfaces = json['bridged_surfaces'];
    final surfaces = <String, bool>{
      'flutter_app': true,
      'agy_cli': true,
      'antigravity_app': true,
      'gemini_web': true,
      'gemini_windows': true,
    };
    if (rawSurfaces is Map) {
      for (final entry in rawSurfaces.entries) {
        surfaces[entry.key.toString()] = entry.value == true;
      }
    }
    return VoiceEngineConfig(
      liveModel: (json['live_model'] as String?) ?? 'gemini-3.8-live',
      reasoningModel: (json['reasoning_model'] as String?) ?? 'gemini-4-argon',
      ttsModel: (json['tts_model'] as String?) ?? 'gemini-3.8-flash-tts',
      transcribeModel:
          (json['transcribe_model'] as String?) ?? 'gemini-3.5-transcribe-live',
      whisperModelSize:
          (json['whisper_model_size'] as String?) ?? 'large-v3-turbo',
      voiceName: (json['voice_name'] as String?) ?? 'Aoede',
      languageCode: (json['language_code'] as String?) ?? 'fr-FR',
      vadMode: (json['vad_mode'] as String?) ?? 'hybrid',
      speechStyle: (json['speech_style'] as String?) ??
          'warm, natural, fluid, humanized and conversational',
      thinkingLevel: (json['thinking_level'] as String?) ?? 'low',
      alwaysOnBackground: (json['always_on_background'] as bool?) ?? true,
      bargeInEnabled: (json['barge_in_enabled'] as bool?) ?? true,
      bridgedSurfaces: Map<String, bool>.unmodifiable(surfaces),
    );
  }

  Map<String, dynamic> toJson() => <String, dynamic>{
        'live_model': liveModel,
        'reasoning_model': reasoningModel,
        'tts_model': ttsModel,
        'transcribe_model': transcribeModel,
        'whisper_model_size': whisperModelSize,
        'voice_name': voiceName,
        'language_code': languageCode,
        'vad_mode': vadMode,
        'speech_style': speechStyle,
        'thinking_level': thinkingLevel,
        'always_on_background': alwaysOnBackground,
        'barge_in_enabled': bargeInEnabled,
        'bridged_surfaces': bridgedSurfaces,
      };

  VoiceEngineConfig copyWith({
    String? liveModel,
    String? reasoningModel,
    String? ttsModel,
    String? transcribeModel,
    String? whisperModelSize,
    String? voiceName,
    String? languageCode,
    String? vadMode,
    String? speechStyle,
    String? thinkingLevel,
    bool? alwaysOnBackground,
    bool? bargeInEnabled,
    Map<String, bool>? bridgedSurfaces,
  }) {
    return VoiceEngineConfig(
      liveModel: liveModel ?? this.liveModel,
      reasoningModel: reasoningModel ?? this.reasoningModel,
      ttsModel: ttsModel ?? this.ttsModel,
      transcribeModel: transcribeModel ?? this.transcribeModel,
      whisperModelSize: whisperModelSize ?? this.whisperModelSize,
      voiceName: voiceName ?? this.voiceName,
      languageCode: languageCode ?? this.languageCode,
      vadMode: vadMode ?? this.vadMode,
      speechStyle: speechStyle ?? this.speechStyle,
      thinkingLevel: thinkingLevel ?? this.thinkingLevel,
      alwaysOnBackground: alwaysOnBackground ?? this.alwaysOnBackground,
      bargeInEnabled: bargeInEnabled ?? this.bargeInEnabled,
      bridgedSurfaces: bridgedSurfaces ?? this.bridgedSurfaces,
    );
  }
}

/// Represents a single spoken or typed turn in the live conversation.
@immutable
class VoiceConversationTurn {
  const VoiceConversationTurn({
    required this.id,
    required this.role,
    required this.text,
    required this.timestamp,
    this.surface = 'flutter_app',
    this.modelUsed = 'gemini-3.8-live',
    this.latencyMs = 0,
  });

  final String id;
  final String role; // 'user' | 'model'
  final String text;
  final double timestamp;
  final String surface;
  final String modelUsed;
  final int latencyMs;

  bool get isUser => role == 'user';

  factory VoiceConversationTurn.fromJson(Map<String, dynamic> json) {
    return VoiceConversationTurn(
      id: (json['id'] as String?) ??
          'turn-${DateTime.now().millisecondsSinceEpoch}',
      role: (json['role'] as String?) ?? 'model',
      text: (json['text'] as String?) ?? '',
      timestamp: (json['timestamp'] as num?)?.toDouble() ??
          (DateTime.now().millisecondsSinceEpoch / 1000.0),
      surface: (json['surface'] as String?) ?? 'flutter_app',
      modelUsed: (json['model_used'] as String?) ?? 'gemini-3.8-live',
      latencyMs: (json['latency_ms'] as num?)?.toInt() ?? 0,
    );
  }
}

/// Real-time telemetry frame driving the permanent Gemini SVG animation & meters.
@immutable
class VoiceTelemetrySnapshot {
  const VoiceTelemetrySnapshot({
    this.state = VoiceInteractionState.idle,
    this.isLiveActive = false,
    this.isRecordingPtt = false,
    this.inputRms = 0.0,
    this.outputRms = 0.0,
    this.fftBins = const <double>[],
    this.activeClients = 1,
    this.micTcpClients = 0,
  });

  final VoiceInteractionState state;
  final bool isLiveActive;
  final bool isRecordingPtt;
  final double inputRms;
  final double outputRms;
  final List<double> fftBins;
  final int activeClients;
  final int micTcpClients;
}
