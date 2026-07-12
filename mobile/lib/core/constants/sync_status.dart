/// Status de sincronização — todas as entidades offline
enum SyncStatus {
  pending('PENDING'),
  synced('SYNCED'),
  error('ERROR');

  const SyncStatus(this.value);
  final String value;

  static SyncStatus fromString(String v) =>
      SyncStatus.values.firstWhere((e) => e.value == v, orElse: () => pending);
}

/// Níveis de risco ergonômico
enum RiskLevel {
  baixo('BAIXO'),
  medio('MEDIO'),
  alto('ALTO'),
  critico('CRITICO');

  const RiskLevel(this.value);
  final String value;
}

/// Perfis de usuário
enum UserProfile {
  adminGlobal('ADMIN_GLOBAL'),
  adminEmpresa('ADMIN_EMPRESA'),
  ergonomista('ERGONOMISTA'),
  supervisor('SUPERVISOR'),
  operador('OPERADOR');

  const UserProfile(this.value);
  final String value;
}
