-- =====================================================
-- 0015 — Aditiva. Voz guía neuronal (Gemini TTS).
--  • Bucket privado "voice-cache": cada audio (MP3) se genera una sola vez por texto + voz + estilo
--    y lo sirve el servidor (las guías de los Moments oficiales, "Inhala", "Exhala"… se reutilizan entre personas).
--  • tts_usage: segundos de audio GENERADOS (no los servidos desde caché) por persona y día, para un tope de costo.
-- =====================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types) VALUES
  ('voice-cache', 'voice-cache', FALSE, 10485760, ARRAY['audio/mpeg'])
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.tts_usage (
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day DATE NOT NULL DEFAULT CURRENT_DATE,
  seconds INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, day)
);
ALTER TABLE public.tts_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tts_usage_select_own" ON public.tts_usage;
CREATE POLICY "tts_usage_select_own" ON public.tts_usage FOR SELECT USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.tts_usage FROM anon, authenticated;

-- Suma segundos generados hoy y devuelve el total del día (lo llama el servidor con la sesión de la persona).
CREATE OR REPLACE FUNCTION public.add_tts_seconds(p_seconds INTEGER)
RETURNS INTEGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_total INTEGER;
BEGIN
  IF auth.uid() IS NULL OR p_seconds < 0 OR p_seconds > 600 THEN RAISE EXCEPTION 'invalid'; END IF;
  INSERT INTO public.tts_usage (user_id, day, seconds) VALUES (auth.uid(), CURRENT_DATE, p_seconds)
  ON CONFLICT (user_id, day) DO UPDATE SET seconds = public.tts_usage.seconds + EXCLUDED.seconds
  RETURNING seconds INTO v_total;
  RETURN v_total;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.add_tts_seconds(INTEGER) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_tts_seconds(INTEGER) TO authenticated;
