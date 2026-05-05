/** Root redirect — serve default locale. middleware also handles this; this is a safety net. */
import { redirect } from 'next/navigation';
import { defaultLocale } from '@/i18n';
export default function RootPage() {
  redirect(`/${defaultLocale}`);
}
