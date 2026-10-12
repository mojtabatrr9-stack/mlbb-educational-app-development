import { db } from '@/db';
import { media } from '@/db/schema';
import { isAdmin, requireMutation } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';
import { randomUUID } from 'node:crypto';
export async function POST(req: NextRequest) {
  try {
    requireMutation(req);
    if (!(await isAdmin()))
      return NextResponse.json(
        { error: 'Owner authentication required', code: 'unauthorized' },
        { status: 401 },
      );
    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('Select a file.');
    if (!['image/png', 'image/jpeg', 'image/webp', 'video/mp4', 'video/webm'].includes(file.type))
      throw new Error('Use PNG, JPG, WebP, MP4, or WebM.');
    const max = file.type.startsWith('video') ? 15 * 1024 * 1024 : 5 * 1024 * 1024;
    if (file.size > max || file.size === 0)
      throw new Error('Images must be under 5 MB; videos under 15 MB.');
    const id = randomUUID();
    await db.insert(media).values({
      id,
      type: file.type,
      data: Buffer.from(await file.arrayBuffer()).toString('base64'),
    });
    return NextResponse.json({ url: `/api/media/${id}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Upload failed' },
      { status: 400 },
    );
  }
}
