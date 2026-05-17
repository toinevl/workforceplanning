import { cn } from '@/lib/utils/cn';

interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
}

export function SectionLabel({ children, className }: SectionLabelProps) {
  return (
    <p className={cn('text-xs font-medium text-gray-700 uppercase tracking-wide mb-2', className)}>
      {children}
    </p>
  );
}
