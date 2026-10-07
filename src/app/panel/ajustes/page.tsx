import { requireAdmin } from '@/lib/admin/auth';
import { getSettings, forgetSettings } from '@/lib/settings';
import { SettingsForm } from '@/components/admin/settings-form';

export default async function PanelSettings() {
  await requireAdmin();
  forgetSettings();
  const s = await getSettings();
  return (
    <>
      <h1 className="text-2xl font-semibold">Ajustes</h1>
      <p className="mb-5 mt-1 text-sm text-soi-muted">Cada cambio queda en la auditoría con el valor anterior y el nuevo.</p>
      <SettingsForm initial={s} />
    </>
  );
}
