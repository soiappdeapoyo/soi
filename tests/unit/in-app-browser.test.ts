import { describe, expect, it } from 'vitest';
import { detectInApp, manualSteps, openInBrowserHref } from '@/lib/in-app-browser';

const tiktokAndroid = 'Mozilla/5.0 (Linux; Android 13; SM-A135M Build/TP1A; wv) AppleWebKit/537.36 Chrome/120.0 Mobile Safari/537.36 trill_330201 BytedanceWebview/d8a21c6';
const tiktokIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_37.3.0 JsSdk/2.0 BytedanceWebview/d8a21c6';
const instaIos = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0';
const safari = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
const chromeAndroid = 'Mozilla/5.0 (Linux; Android 14; SM-A145M) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36';

describe('navegador dentro de apps', () => {
  it('reconoce TikTok e Instagram y no confunde Safari ni Chrome', () => {
    expect(detectInApp(tiktokAndroid)).toEqual({ app: 'tiktok', label: 'TikTok', os: 'android' });
    expect(detectInApp(tiktokIos)).toEqual({ app: 'tiktok', label: 'TikTok', os: 'ios' });
    expect(detectInApp(instaIos)).toEqual({ app: 'instagram', label: 'Instagram', os: 'ios' });
    expect(detectInApp(safari)).toBeNull();
    expect(detectInApp(chromeAndroid)).toBeNull();
  });

  it('abre en Chrome con un intent o en Safari con x-safari', () => {
    const url = 'https://yosoi.app/login?next=%2Fhoy';
    expect(openInBrowserHref(url, 'android')).toBe(`intent://yosoi.app/login?next=%2Fhoy#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(url)};end`);
    expect(openInBrowserHref(url, 'ios')).toBe('x-safari-https://yosoi.app/login?next=%2Fhoy');
    expect(openInBrowserHref('javascript:alert(1)', 'ios')).toBeNull();
    expect(openInBrowserHref(url, 'otro')).toBeNull();
    expect(manualSteps({ app: 'tiktok', label: 'TikTok', os: 'ios' })).toMatch(/Abrir en el navegador/);
  });
});
