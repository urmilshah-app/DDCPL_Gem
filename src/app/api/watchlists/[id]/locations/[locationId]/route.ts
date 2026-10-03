// ---------------------------------------------------------------------------
// API: /api/watchlists/[id]/locations/[locationId] — delete location from watchlist
// ---------------------------------------------------------------------------

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const paramsSchema = z.object({
  id: z.string().cuid(),
  locationId: z.string().cuid(),
});

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  try {
    const { id, locationId } = paramsSchema.parse(await params);

    await prisma.watchlistLocation.delete({
      where: { id: locationId, watchlistId: id },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid id', details: err.flatten() }, { status: 400 });
    }
    if (err instanceof Error && err.message.includes('Record to delete not found')) {
      return NextResponse.json({ error: 'Location not in watchlist' }, { status: 404 });
    }
    console.error('DELETE /api/watchlists/[id]/locations/[locationId] error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}