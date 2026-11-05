import React from 'react';
import { Pencil } from 'lucide-react';
import { usePortfolioCMS, CMSActiveTab } from '../context/PortfolioCMSContext';

interface OwnerEditButtonProps {
  title?: string;
  description?: string;
  value?: string;
  onSave?: (newValue: string) => void | Promise<void>;
  multiline?: boolean;
  type?: 'text' | 'textarea' | 'number';
  openTab?: CMSActiveTab;
  className?: string;
  tooltip?: string;
}

export const OwnerEditButton: React.FC<OwnerEditButtonProps> = ({
  title,
  description,
  value = '',
  onSave,
  multiline = false,
  type = 'text',
  openTab,
  className = '',
  tooltip,
}) => {
  const { isOwnerMode, openQuickEdit, openCMS } = usePortfolioCMS();

  if (!isOwnerMode) return null;

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (openTab) {
      openCMS(openTab);
      return;
    }

    if (onSave && title) {
      openQuickEdit({
        title,
        description,
        value,
        multiline,
        type,
        onSave,
      });
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      title={tooltip || title || 'Edit content'}
      className={`group/edit inline-flex items-center gap-1 rounded-md border border-[#DF00FF]/40 bg-obsidian/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#ffd8be] shadow-sm backdrop-blur-md transition-all hover:border-[#00BDFF] hover:bg-[#1b152b] hover:text-[#00BDFF] hover:scale-105 select-none ${className}`}
    >
      <Pencil className="h-2.5 w-2.5 text-[#DF00FF] transition-colors group-hover/edit:text-[#00BDFF]" />
      <span>Edit</span>
    </button>
  );
};
