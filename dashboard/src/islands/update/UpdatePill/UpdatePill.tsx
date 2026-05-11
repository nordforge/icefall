import { useStore } from '@nanostores/preact';
import { ArrowUp } from 'lucide-preact';
import { $updateInfo, $updateDialogOpen } from '@stores/update';
import styles from './update-pill.module.css';

export default function UpdatePill() {
  const info = useStore($updateInfo);

  return (
    <div aria-live="polite" aria-atomic="true">
      {info?.available && info.latest_version ? (
        <button
          type="button"
          class={styles.pill}
          onClick={() => $updateDialogOpen.set(true)}
          aria-label={`Update available: version ${info.latest_version}. Activate to view details.`}
        >
          <ArrowUp size={14} aria-hidden="true" />
          <span>v{info.latest_version} available</span>
        </button>
      ) : null}
    </div>
  );
}
