import React from 'react';
import { Shield, Edit, Eye } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { Database } from '@/types/database';

type FamilyRole = Database['public']['Enums']['family_role'];

interface RoleSelectorProps {
  value: FamilyRole;
  onChange: (role: FamilyRole) => void;
  disabled?: boolean;
  className?: string;
}

const roleConfig = {
  admin: {
    label: 'Administrador',
    description: 'Acesso total, pode gerenciar membros',
    icon: Shield,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-950/20',
  },
  editor: {
    label: 'Editor',
    description: 'Pode criar e editar transações',
    icon: Edit,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-950/20',
  },
  viewer: {
    label: 'Visualizador',
    description: 'Apenas visualização',
    icon: Eye,
    color: 'text-gray-600 dark:text-gray-400',
    bgColor: 'bg-gray-50 dark:bg-gray-950/20',
  },
};

export function RoleSelector({ value, onChange, disabled, className }: RoleSelectorProps) {
  const currentRole = roleConfig[value];
  const Icon = currentRole.icon;

  return (
    <Select value={value} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className={cn('h-auto', className)}>
        <SelectValue>
          <div className="flex items-center gap-3 py-1">
            <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', currentRole.bgColor)}>
              <Icon className={cn('w-4 h-4', currentRole.color)} />
            </div>
            <div className="text-left">
              <p className="font-medium text-sm">{currentRole.label}</p>
              <p className="text-xs text-muted-foreground">{currentRole.description}</p>
            </div>
          </div>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {(Object.keys(roleConfig) as FamilyRole[]).map((role) => {
          const config = roleConfig[role];
          const RoleIcon = config.icon;
          return (
            <SelectItem key={role} value={role} className="cursor-pointer">
              <div className="flex items-center gap-3 py-2">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center', config.bgColor)}>
                  <RoleIcon className={cn('w-4 h-4', config.color)} />
                </div>
                <div>
                  <p className="font-medium text-sm">{config.label}</p>
                  <p className="text-xs text-muted-foreground">{config.description}</p>
                </div>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}

export function RoleBadge({ role }: { role: FamilyRole }) {
  const config = roleConfig[role];
  const Icon = config.icon;

  return (
    <div className={cn('inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', config.bgColor, config.color)}>
      <Icon className="w-3 h-3" />
      {config.label}
    </div>
  );
}
