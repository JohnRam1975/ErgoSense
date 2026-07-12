interface CameraFramingGuideProps {
  visible: boolean;
  loadMode: boolean;
}

/** Guia visual para enquadrar trabalhador e zona de carga */
export function CameraFramingGuide({ visible, loadMode }: CameraFramingGuideProps) {
  if (!visible) return null;

  return (
    <div className="cam-framing-guide" aria-hidden>
      <div className="cam-framing-body">
        <div className="cam-framing-label">Corpo inteiro visível</div>
      </div>
      {loadMode && (
        <div className="cam-framing-load">
          <div className="cam-framing-label">Zona da carga / mãos</div>
        </div>
      )}
      <p className="cam-framing-hint">
        Enquadre o trabalhador de perfil ou 3/4{loadMode ? ' com as mãos e a carga na zona inferior' : ''}.
      </p>
    </div>
  );
}
