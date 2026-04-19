import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import Sticker from '../Sticker';

describe('Sticker', () => {
  it('renders the tag text at badge size', () => {
    const html = renderToStaticMarkup(
      <Sticker defId="sharpened" size="badge" instanceId="s1" />,
    );
    expect(html).toContain('SHRP');
  });

  it('applies a deterministic rotation transform', () => {
    const html = renderToStaticMarkup(
      <Sticker defId="sharpened" size="badge" instanceId="s1" />,
    );
    expect(html).toMatch(/transform:\s*rotate\(-?\d+(\.\d+)?deg\)/);
  });

  it('is deterministic for the same instanceId', () => {
    const a = renderToStaticMarkup(
      <Sticker defId="volatile" size="badge" instanceId="abc" />,
    );
    const b = renderToStaticMarkup(
      <Sticker defId="volatile" size="badge" instanceId="abc" />,
    );
    expect(a).toBe(b);
  });

  it('omits tag text at pip size', () => {
    const html = renderToStaticMarkup(
      <Sticker defId="sharpened" size="pip" instanceId="s2" />,
    );
    expect(html).not.toContain('SHRP');
  });
});
