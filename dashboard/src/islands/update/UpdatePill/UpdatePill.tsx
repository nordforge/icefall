import { useStore } from '@nanostores/preact';
import { ArrowUp } from 'lucide-preact';
import { $updateInfo, $updateDialogOpen } from '@stores/update';
import styles from './update-pill.module.css';

export default function UpdatePill() {
  const info = useStore($updateInfo);

  if (!info?.available || !info.latest_version) return null;

  return (
    <button
      type="button"
      class={styles.pill}
      onClick={() => $updateDialogOpen.set(true)}
      aria-label={`Update available: version ${info.latest_version}. Activate to view details.`}
    >
      <ArrowUp size={14} aria-hidden="true" />
      v{info.latest_version} available
    </button>
  );
}
