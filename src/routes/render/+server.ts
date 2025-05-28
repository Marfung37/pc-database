import type { RequestHandler } from './$types';
import { fumenToGrid } from '$lib/utils/render/fumen';
import { render_grid } from '$lib/utils/render/render';

export const GET: RequestHandler = async ({ url }) => {
  const z = url.searchParams.get('data') || '';

  const p = fumenToGrid(z);
  // console.log(p);
  const scale = Number(url.searchParams.get('scale') || '5');
  const lc = url.searchParams.get('clear') != 'false' && url.searchParams.get('lcs') != 'false';
  const mir = url.searchParams.get('mirror') == 'true';
  const lp = url.searchParams.get('loop') !== 'false';
  const delay = Number(url.searchParams.get('delay') || '500');

  const is_many_frames = p.includes(';');

  const b = await render_grid(p, true, lc, scale, mir, delay, lp);

  return new Response(b, { headers: { 'Content-Type': is_many_frames ? 'image/gif' : 'image/png' } });
}
