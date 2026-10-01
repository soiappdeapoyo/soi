import { ImageResponse } from 'next/og';

export const alt = 'SOI — Diseña tu identidad. Vive tu propósito.';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OG() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80, background: '#1A1A2E', color: 'white' }}>
        <div style={{ fontSize: 140, fontWeight: 800, display: 'flex' }}>SOI<span style={{ color: '#D4AF37' }}>.</span></div>
        <div style={{ fontSize: 52, marginTop: 10 }}>Diseña tu identidad. Vive tu propósito.</div>
        <div style={{ fontSize: 30, marginTop: 40, color: '#D4AF37' }}>Pensamientos → Emociones → Acciones → Resultados</div>
      </div>
    ),
    size,
  );
}
