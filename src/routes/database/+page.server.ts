import { redirect } from '@sveltejs/kit';

export async function load({ url }) {
  const rawPage = url.searchParams.get('page');

  if (rawPage !== null) {
    const parsedPage = Number(rawPage);

    if (!Number.isInteger(parsedPage) || parsedPage < 1) {
      const params = new URLSearchParams(url.searchParams);
      params.set('page', '1');

      redirect(307, `${url.pathname}?${params.toString()}`);
    }
  }

  const rawPC = url.searchParams.get('pc');

  if (rawPC !== null) {
    const parsedPC = Number(rawPage);

    if (!Number.isInteger(parsedPC) || parsedPC < 1 || parsedPC > 9) {
      const params = new URLSearchParams(url.searchParams);
      params.delete('pc');

      redirect(307, `${url.pathname}?${params.toString()}`);
    }
  }
}
