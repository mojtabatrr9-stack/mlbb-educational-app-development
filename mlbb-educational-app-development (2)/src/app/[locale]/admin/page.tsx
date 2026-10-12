import AdminApp from '@/components/admin/admin-app';
import { createTranslator, isLocale } from '@/i18n';
import { adminConfigured, isAdmin } from '@/lib/auth';
import { getCatalog } from '@/lib/catalog';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = createTranslator(isLocale(locale) ? locale : 'en', 'meta');
  return { title: t('adminTitle'), robots: { index: false, follow: false } };
}

export default async function AdminPage() {
  const [catalog, authorized] = await Promise.all([getCatalog(), isAdmin()]);
  return (
    <AdminApp
      initialCatalog={catalog}
      initialAuthorized={authorized}
      configured={adminConfigured()}
    />
  );
}
