import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

// Open the game without a client hydration gate or nested frame; preserve invites.
export default async function Home({searchParams}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const room = typeof query?.room === 'string' ? query.room : '';
  const destination = new URLSearchParams({v: '26'});
  if (room) destination.set('room', room);
  redirect('/index.html?' + destination.toString());
}
