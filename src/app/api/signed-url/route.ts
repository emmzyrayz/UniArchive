// app/api/materials/signed-url/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createB2Client } from '@/lib/backblaze.b2';

export async function GET(req: NextRequest) {
  const fileName = req.nextUrl.searchParams.get('file');

  if (!fileName) {
    return NextResponse.json({ error: 'Missing file name' }, { status: 400 });
  }

  try {
    const b2 = createB2Client();
    const result = await b2.generatePresignedDownloadUrl(fileName);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ url: result.downloadUrl });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
