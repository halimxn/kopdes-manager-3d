import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireSession } from '@/lib/server/auth';
import { failure } from '@/lib/server/http';
import { entityName } from '@/features/records/schemas';
import { listPage } from '@/features/records/service';
import { listQuerySchema } from '@/features/records/query';

/**
 * Beberapa daftar catatan dalam satu permintaan: satu pemeriksaan sesi dan satu perjalanan
 * jaringan per halaman, bukan satu per jenis catatan. Setiap butir `r` berbentuk sama dengan
 * alamat GET /api/<entity>?<query>. Batasnya di atas halaman terbesar (Dunia 3D: 25 jenis catatan).
 */
const requestsSchema = z.array(z.string().min(1).max(400)).min(1).max(30);

export async function GET(request: Request) {
  try {
    await requireSession();
    const requests = requestsSchema.parse(new URL(request.url).searchParams.getAll('r'));
    const results = await Promise.all(
      requests.map((path) => {
        const [name, search = ''] = path.split('?');
        const entity = entityName(name);
        if (!entity) throw new Error('Rute tidak ditemukan.');
        const query = listQuerySchema.parse(Object.fromEntries(new URLSearchParams(search)));
        return listPage(entity, query);
      }),
    );
    return NextResponse.json({ results }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return failure(error);
  }
}
