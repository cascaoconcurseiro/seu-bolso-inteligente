import React from 'react';
import { Plus } from 'lucide-react';
import { Button } from './button';
import { cn } from '@/lib/utils';

interface FABProps {
  onClick: () => void;
  icon?: React.ReactNode;
  label?: string;
  className?: string;
}

export function FAB({ onClick, icon, label, className }: FABProps) {
  return (
    <Button
      onClick={onClick}
      size="lg"
      className={cn(
        'fixed bottom-6 right-6 h-14 rounded-full shadow-lg hover:shadow-xl transition-all z-50',
        label ? 'px-6' : 'w-14',
        className
      )}
    >
      {icon || <Plus className="h-6 w-6" />}
      {label && <span className="ml-2 font-semibold">{label}</span>}
    </Button>
  );
}
