import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:gemini_voice_app/data/repositories/voice_repository.dart';
import 'package:gemini_voice_app/data/services/voice_bridge_service.dart';
import 'package:gemini_voice_app/domain/models/voice_models.dart';
import 'package:gemini_voice_app/main.dart';
import 'package:gemini_voice_app/ui/features/voice_hub/view_models/voice_hub_view_model.dart';

void main() {
  group('Gemini Live Voice Hub Domain & ViewModel Unit Tests', () {
    late VoiceBridgeService service;
    late VoiceRepository repository;
    late VoiceHubViewModel viewModel;

    setUp(() {
      service = VoiceBridgeService(offlineMode: true);
      repository = VoiceRepository(bridgeService: service);
      viewModel = VoiceHubViewModel(repository: repository);
    });

    tearDown(() {
      viewModel.dispose();
      repository.dispose();
    });

    test('Initial state has welcome turn and default Gemini 3.8 Live config', () {
      expect(viewModel.state, equals(VoiceInteractionState.idle));
      expect(viewModel.isLiveActive, isFalse);
      expect(viewModel.config.liveModel, equals('gemini-3.8-live'));
      expect(viewModel.config.reasoningModel, equals('gemini-4-argon'));
      expect(viewModel.config.whisperModelSize, equals('large-v3-turbo'));
      expect(viewModel.turns, isNotEmpty);
    });

    test('Toggling /voice Live Mode transitions state to listening', () async {
      await viewModel.toggleLiveVoiceMode();
      expect(viewModel.isLiveActive, isTrue);
      expect(viewModel.state, equals(VoiceInteractionState.listening));
    });

    test('Push-to-Talk Record button starts and stops recording', () async {
      await viewModel.startPushToTalk();
      expect(viewModel.isRecordingPtt, isTrue);
      expect(viewModel.state, equals(VoiceInteractionState.listening));

      await viewModel.stopPushToTalk(
        simulatedVoiceText: 'Bonjour Gemini Live depuis Flutter',
      );
      expect(viewModel.isRecordingPtt, isFalse);
      expect(viewModel.turns.length, greaterThanOrEqualTo(3));
    });
  });

  group('Gemini Live Voice Hub Widget Tests', () {
    testWidgets(
      'Renders permanently animated Gemini SVG orb and interactive /voice & Record buttons',
      (WidgetTester tester) async {
        final service = VoiceBridgeService(offlineMode: true);
        final repository = VoiceRepository(bridgeService: service);
        final viewModel = VoiceHubViewModel(repository: repository);

        await tester.pumpWidget(GeminiLiveVoiceApp(viewModel: viewModel));
        await tester.pump(const Duration(milliseconds: 100));

        // Verify the permanently animated official Gemini SVG orb is present
        expect(find.byKey(const Key('gemini_live_svg_orb')), findsOneWidget);
        expect(find.byKey(const Key('slash_voice_live_btn')), findsOneWidget);
        expect(find.byKey(const Key('record_ptt_btn')), findsOneWidget);

        // Tap `/voice` Live button and verify state transitions to live listening
        await tester.tap(find.byKey(const Key('slash_voice_live_btn')));
        await tester.pump(const Duration(milliseconds: 100));
        expect(viewModel.isLiveActive, isTrue);
        expect(find.text('/voice LIVE ACTIF'), findsOneWidget);

        // Tap `● Record (/record)` button to start recording
        await tester.tap(find.byKey(const Key('record_ptt_btn')));
        await tester.pump(const Duration(milliseconds: 100));
        expect(viewModel.isRecordingPtt, isTrue);
        expect(find.text('■ Stop Record (F5)'), findsOneWidget);

        // Enter a slash command or prompt in the input bar and send
        await tester.enterText(
          find.byKey(const Key('slash_voice_text_field')),
          'Salut Gemini, comment ça va ?',
        );
        await tester.tap(find.byKey(const Key('send_prompt_btn')));
        await tester.pump(const Duration(milliseconds: 100));

        expect(find.textContaining('Salut Gemini, comment ça va ?'), findsWidgets);

        viewModel.dispose();
        repository.dispose();
      },
    );
  });
}
