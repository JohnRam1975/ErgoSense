import '../core/constants/sync_status.dart';

/// Análise postural com TensorFlow Lite (offline)
class PoseAnalyzer {
  PoseAnalyzer(this._interpreter);

  final dynamic _interpreter; // Interpreter from tflite_flutter

  Future<PoseResult> analyze(List<int> imageBytes, int width, int height) async {
    // 1. Preprocess → 256x256 tensor
    // 2. _interpreter.run(input, output)
    // 3. Parse 33 landmarks
    final landmarks = _mockLandmarks();
    final angles = JointAngleCalculator.compute(landmarks);
    final score = ErgonomicScorer.score(angles);
    final risk = RiskClassifier.classify(score);
    final rula = ErgonomicScorer.rula(angles);
    final reba = ErgonomicScorer.reba(angles);

    return PoseResult(
      landmarks: landmarks,
      angles: angles,
      score: score,
      riskLevel: risk,
      rula: rula,
      reba: reba,
      engine: 'tflite',
    );
  }

  List<Landmark> _mockLandmarks() => [];
}

class PoseResult {
  PoseResult({
    required this.landmarks,
    required this.angles,
    required this.score,
    required this.riskLevel,
    required this.rula,
    required this.reba,
    required this.engine,
  });
  final List<Landmark> landmarks;
  final JointAngles angles;
  final int score;
  final RiskLevel riskLevel;
  final int rula;
  final int reba;
  final String engine;
}

class Landmark {
  Landmark(this.x, this.y, this.confidence);
  final double x, y, confidence;
}

class JointAngles {
  JointAngles({
    required this.lombar,
    required this.ombroD,
    required this.pescoco,
    required this.cotovelo,
    required this.repeticaoMin,
  });
  final double lombar, ombroD, pescoco, cotovelo, repeticaoMin;
}

class JointAngleCalculator {
  static JointAngles compute(List<Landmark> lm) {
    // Implementar cálculo vetorial entre landmarks
    return JointAngles(lombar: 34, ombroD: 127, pescoco: 22, cotovelo: 88, repeticaoMin: 8);
  }
}

class ErgonomicScorer {
  static int score(JointAngles a) {
    var s = 0;
    if (a.lombar > 30) s += 35;
    if (a.ombroD > 120) s += 30;
    if (a.pescoco > 25) s += 12;
    s += (a.repeticaoMin * 2).clamp(0, 15).toInt();
    return s.clamp(5, 99);
  }

  static int rula(JointAngles a) => (a.ombroD > 90 ? 5 : 3).clamp(1, 7);
  static int reba(JointAngles a) => (a.lombar > 30 ? 11 : 5).clamp(1, 15);
}

class RiskClassifier {
  static RiskLevel classify(int score) {
    if (score >= 75) return RiskLevel.critico;
    if (score >= 55) return RiskLevel.alto;
    if (score >= 35) return RiskLevel.medio;
    return RiskLevel.baixo;
  }
}
