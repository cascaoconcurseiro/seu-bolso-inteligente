import { getBankLogo, type BankCode, BANK_LOGOS } from '@/utils/bankLogos';

interface BankLogoProps {
  bank: BankCode | string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  alt?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-10 w-10',
  lg: 'h-16 w-16',
};

export function BankLogo({ bank, size = 'md', className = '', alt }: BankLogoProps) {
  const logoUrl = (bank in BANK_LOGOS) 
    ? BANK_LOGOS[bank as BankCode]
    : getBankLogo(bank);

  if (!logoUrl) {
    return (
      <div className={`${sizeClasses[size]} ${className} bg-gray-200 rounded flex items-center justify-center text-gray-500 text-xs font-medium`}>
        {bank.slice(0, 2).toUpperCase()}
      </div>
    );
  }

  return (
    <img
      src={logoUrl}
      alt={alt || `Logo ${bank}`}
      className={`${sizeClasses[size]} ${className} object-contain`}
    />
  );
}
