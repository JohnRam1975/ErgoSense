import { useEffect, useState } from 'react';
import { apiFetchAnalysisVideoUrl } from '../api/client';

interface AnalysisVideoPlayerProps {
  analysisId: string;
  tenantId: string;
  hasVideoRecording?: boolean;
  localVideoUrl?: string | null;
  videoFormat?: 'mp4' | 'webm';
  durationSecs?: number;
}

export function AnalysisVideoPlayer({
  analysisId,
  tenantId,
  hasVideoRecording,
  localVideoUrl,
  videoFormat,
  durationSecs,
}: AnalysisVideoPlayerProps) {
  const [src, setSrc] = useState(localVideoUrl ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (localVideoUrl) {
      setSrc(localVideoUrl);
      return undefined;
    }
    if (!hasVideoRecording || !analysisId || !tenantId) return undefined;

    let active = true;
    let objectUrl = '';
    setLoading(true);
    setError('');

    void apiFetchAnalysisVideoUrl(tenantId, analysisId)
      .then((url) => {
        if (!active) {
          URL.revokeObjectURL(url);
          return;
        }
        objectUrl = url;
        setSrc(url);
      })
      .catch((err) => {
        if (active) setError(err instanceof Error ? err.message : 'Erro ao carregar vídeo');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [analysisId, tenantId, hasVideoRecording, localVideoUrl]);

  if (!hasVideoRecording && !localVideoUrl) return null;

  return (
    <div className="capture-preview" style={{ marginBottom: 12 }}>
      {loading && <div className="t2" style={{ padding: 12 }}>Carregando gravação…</div>}
      {error && <div className="t2" style={{ padding: 12, color: 'var(--red)' }}>{error}</div>}
      {src && (
        <>
          <video
            src={src}
            controls
            playsInline
            preload="metadata"
            style={{ width: '100%', maxHeight: 320, borderRadius: 8, background: '#000' }}
          />
          <div className="capture-badge">
            Gravação {videoFormat?.toUpperCase() ?? 'MP4'}
            {durationSecs != null && durationSecs > 0 && (
              <> · {String(Math.floor(durationSecs / 60)).padStart(2, '0')}:{String(Math.floor(durationSecs % 60)).padStart(2, '0')}</>
            )}
          </div>
        </>
      )}
    </div>
  );
}
