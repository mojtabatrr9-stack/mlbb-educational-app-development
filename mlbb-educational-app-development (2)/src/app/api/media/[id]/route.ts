import { db } from '@/db';
import { media } from '@/db/schema';
import { eq } from 'drizzle-orm';
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [file] = await db.select().from(media).where(eq(media.id, id));
  if (!file) return new Response('Not found', { status: 404 });
  const data = Buffer.from(file.data, 'base64');
  const headers = {
    'Content-Type': file.type,
    'Cache-Control': 'public, max-age=31536000, immutable',
    'X-Content-Type-Options': 'nosniff',
    'Accept-Ranges': 'bytes',
  };
  const range = req.headers.get('range');
  if (range) {
    const match = /^bytes=(\d+)-(\d*)$/.exec(range);
    if (!match)
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${data.length}` },
      });
    const start = Number(match[1]),
      end = Math.min(match[2] ? Number(match[2]) : data.length - 1, data.length - 1);
    if (start > end || start >= data.length)
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${data.length}` },
      });
    return new Response(data.subarray(start, end + 1), {
      status: 206,
      headers: {
        ...headers,
        'Content-Range': `bytes ${start}-${end}/${data.length}`,
        'Content-Length': String(end - start + 1),
      },
    });
  }
  return new Response(data, { headers: { ...headers, 'Content-Length': String(data.length) } });
}
