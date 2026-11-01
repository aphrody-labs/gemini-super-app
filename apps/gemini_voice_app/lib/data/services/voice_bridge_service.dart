import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:web_socket_channel/web_socket_channel.dart';

/// Stateless/Stream service communicating with the local Gemini Live & Antigravity
/// Voice Bridge server (`http://127.0.0.1:8765` and `ws://127.0.0.1:8765/ws/voice`).
class VoiceBridgeService {
  VoiceBridgeService({
    this.httpBaseUrl = 'http://127.0.0.1:8765',
    this.wsUrl = 'ws://127.0.0.1:8765/ws/voice',
    this.offlineMode = false,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final String httpBaseUrl;
  final String wsUrl;
  final bool offlineMode;
  final http.Client _httpClient;

  WebSocketChannel? _channel;
  StreamSubscription<dynamic>? _wsSubscription;
  final StreamController<Map<String, dynamic>> _eventController =
      StreamController<Map<String, dynamic>>.broadcast();

  bool _isConnected = false;
  bool get isConnected => _isConnected;

  Stream<Map<String, dynamic>> get events => _eventController.stream;

  /// Connects to the WebSocket voice hub and streams incoming JSON events.
  Future<bool> connectWebSocket() async {
    if (offlineMode) return false;
    await disconnectWebSocket();
    try {
      final channel = WebSocketChannel.connect(Uri.parse(wsUrl));
      _channel = channel;
      _isConnected = true;
      _wsSubscription = channel.stream.listen(
        (dynamic raw) {
          if (raw is String) {
            try {
              final decoded = jsonDecode(raw);
              if (decoded is Map<String, dynamic>) {
                _eventController.add(decoded);
              }
            } catch (_) {
              // Ignore malformed frames
            }
          }
        },
        onError: (_) {
          _isConnected = false;
        },
        onDone: () {
          _isConnected = false;
        },
      );
      return true;
    } catch (_) {
      _isConnected = false;
      return false;
    }
  }

  /// Sends a JSON message over the active WebSocket connection if open.
  void sendWsEvent(Map<String, dynamic> payload) {
    final ch = _channel;
    if (ch != null && _isConnected) {
      try {
        ch.sink.add(jsonEncode(payload));
      } catch (_) {
        _isConnected = false;
      }
    }
  }

  /// Calls `GET /api/status` on the voice bridge server.
  Future<Map<String, dynamic>?> fetchStatus() async {
    if (offlineMode) return null;
    try {
      final response = await _httpClient
          .get(Uri.parse('$httpBaseUrl/api/status'))
          .timeout(const Duration(seconds: 2));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          _isConnected = true;
          return decoded;
        }
      }
    } catch (_) {
      _isConnected = false;
    }
    return null;
  }

  /// Calls `POST /api/voice` with the given action payload.
  Future<Map<String, dynamic>?> postVoiceCommand(
    Map<String, dynamic> payload,
  ) async {
    if (offlineMode) return null;
    try {
      final response = await _httpClient
          .post(
            Uri.parse('$httpBaseUrl/api/voice'),
            headers: const <String, String>{'Content-Type': 'application/json'},
            body: jsonEncode(payload),
          )
          .timeout(const Duration(seconds: 6));
      if (response.statusCode == 200) {
        final decoded = jsonDecode(response.body);
        if (decoded is Map<String, dynamic>) {
          _isConnected = true;
          return decoded;
        }
      }
    } catch (_) {
      // Fallback handled by repository
    }
    return null;
  }

  Future<void> disconnectWebSocket() async {
    _isConnected = false;
    await _wsSubscription?.cancel();
    _wsSubscription = null;
    try {
      await _channel?.sink.close();
    } catch (_) {}
    _channel = null;
  }

  void dispose() {
    disconnectWebSocket();
    _eventController.close();
    _httpClient.close();
  }
}
