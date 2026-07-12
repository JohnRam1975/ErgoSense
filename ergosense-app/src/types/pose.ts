/** Ponto normalizado (0–1) do frame de vídeo */
export interface PosePoint {
  x: number;
  y: number;
  visibility: number;
}

export interface PoseFrame {
  landmarks: PosePoint[];
  /** Coordenadas em % do container (0–100) para desenho do overlay */
  screen: PosePoint[];
}
