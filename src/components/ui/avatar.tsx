import { initials, personTone } from '@/lib/people';
import { cn } from '@/lib/utils';

export function Avatar({ name, className }: { name: string; className?: string }) {
  return (
    <span
      data-tone={personTone(name)}
      title={name}
      className={cn(
        'inline-grid size-8 shrink-0 place-items-center rounded-full bg-tone text-[11px] font-semibold text-tone-ink ring-2 ring-surface-solid dark:bg-tone-ink dark:text-on-bar dark:ring-canvas/70',
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}

/** Tumpukan avatar seperti kartu TaskTrack; nama lebih dari `max` dirangkum "+N". */
export function AvatarStack({
  names,
  max = 3,
  className,
}: {
  names: string[];
  max?: number;
  className?: string;
}) {
  const people = names.filter(Boolean);
  if (!people.length) return null;
  return (
    <span className={cn('flex items-center', className)} aria-label={people.join(', ')}>
      {people.slice(0, max).map((name, index) => (
        <Avatar key={name + index} name={name} className={index ? '-ml-1.5' : ''} />
      ))}
      {people.length > max && (
        <span className="-ml-1.5 inline-grid size-8 shrink-0 place-items-center rounded-full bg-surface-solid text-[11px] font-semibold text-ink ring-2 ring-canvas/70">
          +{people.length - max}
        </span>
      )}
    </span>
  );
}
