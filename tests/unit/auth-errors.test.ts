import { describe, expect, it } from 'vitest';
import { authFailureMessage, authFailureReason } from '@/lib/auth-errors';

describe('motivo de un inicio de sesión fallido', () => {
  it('distingue cancelación, interrupción (PKCE) y enlace vencido', () => {
    expect(authFailureReason('access_denied  The user denied access')).toBe('cancelled');
    expect(authFailureReason('bad_code_verifier invalid request: both auth code and code verifier should be non-empty')).toBe('interrupted');
    expect(authFailureReason('flow_state_not_found invalid flow state, no valid flow state found')).toBe('interrupted');
    expect(authFailureReason('access_denied otp_expired Email link is invalid or has expired')).toBe('expired');
    expect(authFailureReason(' otp_expired Email link is invalid or has expired')).toBe('expired');
    expect(authFailureReason('unexpected_failure')).toBe('auth');
  });
  it('muestra un mensaje para cualquier código (y nada sin código)', () => {
    expect(authFailureMessage(null)).toBeNull();
    expect(authFailureMessage('interrupted')).toMatch(/otra pestaña/);
    expect(authFailureMessage('lo-que-sea')).toBe('No pudimos iniciar sesión. Intenta de nuevo.');
  });
});
