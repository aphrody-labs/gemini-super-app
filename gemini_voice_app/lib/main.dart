import 'package:flutter/material.dart';
import 'data/repositories/voice_repository.dart';
import 'data/services/voice_bridge_service.dart';
import 'ui/features/voice_hub/view_models/voice_hub_view_model.dart';
import 'ui/features/voice_hub/views/voice_hub_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  final bridgeService = VoiceBridgeService();
  final repository = VoiceRepository(bridgeService: bridgeService);
  final viewModel = VoiceHubViewModel(repository: repository);
  // Connect asynchronously to the background Gemini Live & Antigravity Voice Hub
  viewModel.initialize();

  runApp(GeminiLiveVoiceApp(viewModel: viewModel));
}

class GeminiLiveVoiceApp extends StatelessWidget {
  const GeminiLiveVoiceApp({super.key, required this.viewModel});

  final VoiceHubViewModel viewModel;

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Gemini Live Voice Hub • Antigravity',
      debugShowCheckedModeBanner: false,
      theme: ThemeData.dark(useMaterial3: true).copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xFF4285F4),
          brightness: Brightness.dark,
        ),
        scaffoldBackgroundColor: const Color(0xFF0B0D14),
      ),
      home: VoiceHubScreen(viewModel: viewModel),
    );
  }
}
