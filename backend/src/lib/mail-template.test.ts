import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderMail } from './mail-template.js';

test('a person-supplied quote is escaped in the HTML and plain in the text', () => {
  const { html, text } = renderMail({
    title: 'T',
    intro: 'I',
    quote: '<script>alert(1)</script>',
    button: { label: 'Go', url: 'https://example.com/a?b=1&c=2' },
    note: 'N',
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(html.includes('href="https://example.com/a?b=1&amp;c=2"'));
  assert.ok(text.includes('<script>alert(1)</script>') && text.includes('https://example.com/a?b=1&c=2'));
});
