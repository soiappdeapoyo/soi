import { describe, expect, it } from 'vitest';
import { browserTag, inAppBrowser, isAndroid, isIOS, openInBrowserHref, openInBrowserSteps } from '@/lib/in-app-browser';

const TIKTOK_IOS = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 musical_ly_35.1.0 JsSdk/2.0 NetType/WIFI Channel/App Store ByteLocale/es Region/MX';
const TIKTOK_ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-A546E Build/UP1A; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/125.0 Mobile Safari/537.36 trill_350101 BytedanceWebview/d8a21c6';
const INSTAGRAM = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 330.0.0.0';
const FACEBOOK = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/460.0]';
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1';
const CHROME_ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Mobile Safari/537.36';

describe('navegadores dentro de otras apps', () => {
  it('reconoce TikTok, Instagram y Facebook, y no confunde Safari ni Chrome', () => {
    expect(inAppBrowser(TIKTOK_IOS)).toBe('tiktok');
    expect(inAppBrowser(TIKTOK_ANDROID)).toBe('tiktok');
    expect(inAppBrowser(INSTAGRAM)).toBe('instagram');
    expect(inAppBrowser(FACEBOOK)).toBe('facebook');
    expect(inAppBrowser(SAFARI)).toBeNull();
    expect(inAppBrowser(CHROME_ANDROID)).toBeNull();
    expect(browserTag(SAFARI)).toBe('navegador');
    expect(isAndroid(TIKTOK_ANDROID)).toBe(true);
    expect(isIOS(TIKTOK_IOS)).toBe(true);
  });

  it('arma el enlace de Android para abrir en el navegador del teléfono', () => {
    expect(openInBrowserHref('https://yosoi.app/login?next=%2Fm%2Fborrador%2Fabc'))
      .toBe('intent://yosoi.app/login?next=%2Fm%2Fborrador%2Fabc#Intent;scheme=https;S.browser_fallback_url=https%3A%2F%2Fyosoi.app%2Flogin%3Fnext%3D%252Fm%252Fborrador%252Fabc;end');
    expect(openInBrowserSteps('tiktok', true)).toContain('Abrir en el navegador');
  });
});
