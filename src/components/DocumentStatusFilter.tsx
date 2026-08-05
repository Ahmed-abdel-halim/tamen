export type DocumentStatusType = 'all' | 'active' | 'expired';

interface DocumentStatusFilterProps {
  status: DocumentStatusType;
  onChange: (newStatus: DocumentStatusType) => void;
  counts?: {
    all?: number;
    active?: number;
    expired?: number;
  };
}

export default function DocumentStatusFilter({ status, onChange, counts }: DocumentStatusFilterProps) {
  const options: { id: DocumentStatusType; label: string; icon: string; badgeColor?: string }[] = [
    { id: 'all', label: 'كل الوثائق', icon: 'fa-layer-group' },
    { id: 'active', label: 'الوثائق النشطة', icon: 'fa-circle-check', badgeColor: '#10b981' },
    { id: 'expired', label: 'الوثائق المنتهية', icon: 'fa-clock-rotate-left', badgeColor: '#f59e0b' },
  ];

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        backgroundColor: 'var(--panel)',
        padding: '5px',
        borderRadius: '14px',
        border: '1px solid var(--border)',
        boxShadow: '0 2px 10px rgba(0, 0, 0, 0.04)',
        userSelect: 'none',
        flexWrap: 'wrap',
      }}
    >
      {options.map((opt) => {
        const isActive = status === opt.id;
        const count = counts?.[opt.id];

        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: '10px',
              border: isActive ? '1px solid var(--accent-cyan)' : '1px solid transparent',
              backgroundColor: isActive ? 'var(--accent-cyan)' : 'transparent',
              color: isActive ? '#ffffff' : 'var(--text)',
              fontWeight: isActive ? '700' : '500',
              fontSize: '13px',
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              boxShadow: isActive ? '0 4px 14px var(--accent-shadow)' : 'none',
              outline: 'none',
            }}
          >
            <i
              className={`fa-solid ${opt.icon}`}
              style={{
                fontSize: '14px',
                color: isActive ? '#ffffff' : opt.badgeColor || 'var(--text-secondary)',
              }}
            />
            <span>{opt.label}</span>
            {count !== undefined && count !== null && (
              <span
                style={{
                  backgroundColor: isActive
                    ? 'rgba(255, 255, 255, 0.25)'
                    : 'var(--input-bg, rgba(0, 0, 0, 0.06))',
                  color: isActive ? '#ffffff' : 'var(--text)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '700',
                }}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
