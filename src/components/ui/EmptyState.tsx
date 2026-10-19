'use client';
import Link from 'next/link';
import { type ReactNode } from 'react';
import { Ikon3D, type Ikon3DKind } from './Ikon3D';
import { Button } from './Button';

export function EmptyState({
  icon,
  ikon,
  title,
  description,
  action,
  secondaryAction,
  tone,
  pastelVariant = 'blue',
  compact = false,
  className = '',
}: {
  icon?: ReactNode;
  /** Ikon dua nada (Ikon3D); diutamakan daripada `icon`. */
  ikon?: Ikon3DKind;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: ReactNode;
  };
  secondaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
  tone?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
  pastelVariant?: 'emerald' | 'blue' | 'amber' | 'purple' | 'rose';
  compact?: boolean;
  className?: string;
}) {
  const effectiveTone = tone || pastelVariant;
  return (
    <div
      className={`ui-empty ${compact ? 'ui-empty-compact' : ''} ${className}`}
      data-empty-tone={effectiveTone}
      role="status"
    >
      <div className="ui-empty-icon" aria-hidden="true">
        {ikon ? <Ikon3D kind={ikon} size={56} /> : icon || <Ikon3D kind="folder" size={56} />}
      </div>
      <h3 className="ui-empty-title">{title}</h3>
      {description && <p className="ui-empty-description">{description}</p>}
      {(action || secondaryAction) && (
        <div className="ui-empty-actions">
          {action &&
            (action.href ? (
              <Link href={action.href} className="ui-btn" data-variant="primary">
                {action.icon}
                <span>{action.label}</span>
              </Link>
            ) : (
              <Button variant="primary"
                type="button"
                onClick={action.onClick}
              >
                {action.icon}
                <span>{action.label}</span>
              </Button>
            ))}
          {secondaryAction &&
            (secondaryAction.href ? (
              <Link href={secondaryAction.href} className="ui-btn" data-variant="ghost">
                {secondaryAction.label}
              </Link>
            ) : (
              <Button variant="ghost"
                type="button"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}
