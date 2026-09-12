import test from 'node:test';
import assert from 'node:assert/strict';
import { arrayBufferToBase64 } from '../src/geminiVoice.ts';

test('arrayBufferToBase64 correctly encodes binary buffer', () => {
  const text = 'Hello Siyaram Finance Voice Engine';
  const encoder = new TextEncoder();
  const buffer = encoder.encode(text).buffer;
  const b64 = arrayBufferToBase64(buffer);
  const decoded = Buffer.from(b64, 'base64').toString('utf-8');
  assert.equal(decoded, text);
});
