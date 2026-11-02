import { describe, expect, it } from 'vitest';
import { urlBase64ToUint8Array } from './push';

describe('urlBase64ToUint8Array', () => {
  it('converts standard base64 without padding', () => {
    // "AQAB" decodes to bytes [1, 0, 1]
    const result = urlBase64ToUint8Array('AQAB');
    expect(Array.from(result)).toEqual([1, 0, 1]);
  });

  it('converts base64 string that requires padding', () => {
    // "AQ" needs 2 "=" padding characters to decode to byte [1]
    const result2 = urlBase64ToUint8Array('AQ');
    expect(Array.from(result2)).toEqual([1]);

    // "AQI" needs 1 "=" padding character to decode to bytes [1, 2]
    const result3 = urlBase64ToUint8Array('AQI');
    expect(Array.from(result3)).toEqual([1, 2]);
  });

  it('correctly handles URL-safe characters "-" and "_"', () => {
    // In base64url, "-" replaces "+" and "_" replaces "/".
    // "+/8=" decodes to bytes [251, 255].
    const result = urlBase64ToUint8Array('-_8');
    expect(Array.from(result)).toEqual([251, 255]);
  });
});
