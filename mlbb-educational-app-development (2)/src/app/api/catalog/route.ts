import { getCatalog } from '@/lib/catalog';
export const dynamic = 'force-dynamic';
export async function GET() {
  try {
    return Response.json(await getCatalog(), {
      headers: { 'Cache-Control': 'public, max-age=30, stale-while-revalidate=120' },
    });
  } catch (error) {
    console.error('Catalog unavailable', error);
    return Response.json(
      {
        error: 'The library is temporarily unavailable. Your offline library is still accessible.',
      },
      { status: 503 },
    );
  }
}
