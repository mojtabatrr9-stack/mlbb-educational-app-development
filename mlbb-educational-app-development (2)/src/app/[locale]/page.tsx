import NexusApp from '@/components/nexus-app';
import { getCatalog } from '@/lib/catalog';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const catalog = await getCatalog();
  return <NexusApp initialCatalog={catalog} />;
}
