import { useState, useEffect, useRef } from 'react';
import { Lock, Delete } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { haptics } from '@/utils/haptics';
import { hashPin, verifyPin } from '@/utils/crypto';

interface AppLockProps {
  children: React.ReactNode;
}

export function AppLock({ children }: AppLockProps) {
  const [isLocked, setIsLocked] = useState(false);
  const [pinCode, setPinCode] = useState<string | null>(null);
  const [inputPin, setInputPin] = useState('');
  const [isSettingPin, setIsSettingPin] = useState(false);
  const [setupStep, setSetupStep] = useState<'initial' | 'confirm'>('initial');
  const [tempPin, setTempPin] = useState('');
  const [error, setError] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const MAX_ATTEMPTS = 5;
  const LOCKOUT_MS = 30_000; // 30 s
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedPin = localStorage.getItem('@BolsoInteligente:pin');
      if (savedPin) {
        setPinCode(savedPin);
        setIsLocked(true); // Lock the app initially if PIN exists
      }
    }
  }, []);

  // Use the Web Authentication API for biometrics if available, otherwise fallback to PIN
  const handleBiometrics = async () => {
    if (window.PublicKeyCredential && PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable) {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      if (available) {
        // Implement Passkeys / WebAuthn here for true biometrics
        // For now, we simulate success if available, though real implementation requires a server challenge
      }
    }
  };

  useEffect(() => {
    if (isLocked) {
      handleBiometrics();
    }
  }, [isLocked]);

  const isLockedOut = lockedUntil !== null && Date.now() < lockedUntil;

  const handleKeyPress = (num: number) => {
    if (isLockedOut) return;
    haptics.light();
    setError(false);
    
    if (isSettingPin) {
      if (inputPin.length < 4) {
        const newPin = inputPin + num;
        setInputPin(newPin);
        if (newPin.length === 4) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            if (setupStep === 'initial') {
              setTempPin(newPin);
              setInputPin('');
              setSetupStep('confirm');
            } else {
              if (newPin === tempPin) {
                hashPin(newPin).then(hashedPin => {
                  localStorage.setItem('@BolsoInteligente:pin', hashedPin);
                  setPinCode(hashedPin);
                  setIsSettingPin(false);
                  setIsLocked(false);
                  haptics.success();
                });
              } else {
                setError(true);
                setInputPin('');
                haptics.error();
              }
            }
          }, 300);
        }
      }
    } else {
      if (inputPin.length < 4) {
        const newPin = inputPin + num;
        setInputPin(newPin);
        if (newPin.length === 4) {
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            // verifyPin handles legacy plain-text, SHA-256 hex, and PBKDF2 formats
            verifyPin(newPin, pinCode ?? '').then(ok => {
              if (ok) {
                // Silently upgrade legacy hash to PBKDF2 on successful login
                if (pinCode && !pinCode.includes(':')) {
                  hashPin(newPin).then(newHash => {
                    localStorage.setItem('@BolsoInteligente:pin', newHash);
                    setPinCode(newHash);
                  });
                }
                setIsLocked(false);
                setAttempts(0);
                setInputPin('');
                haptics.success();
              } else {
                const next = attempts + 1;
                setAttempts(next);
                if (next >= MAX_ATTEMPTS) setLockedUntil(Date.now() + LOCKOUT_MS);
                setError(true);
                setInputPin('');
                haptics.error();
              }
            });
          }, 300);
        }
      }
    }
  };

  const handleDelete = () => {
    if (inputPin.length > 0) {
      haptics.light();
      setInputPin(prev => prev.slice(0, -1));
      setError(false);
    }
  };

  const renderDots = () => {
    const dots = [];
    for (let i = 0; i < 4; i++) {
      dots.push(
        <div
          key={i}
          className={`w-4 h-4 rounded-full border-2 ${
            i < inputPin.length
              ? 'bg-primary border-primary'
              : error
              ? 'border-destructive'
              : 'border-muted-foreground/30'
          } transition-all duration-200`}
        />
      );
    }
    return dots;
  };

  // If the app is locked and we're not currently setting the PIN from settings
  if (isLocked && !isSettingPin) {
    return (
      <div className="fixed inset-0 z-[100] bg-background flex flex-col items-center justify-center p-6">
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mb-8">
          <Lock className="w-10 h-10 text-primary" />
        </div>
        
        <h2 className="text-2xl font-bold font-display tracking-tight mb-2">Aplicativo Bloqueado</h2>
        <p className="text-muted-foreground text-center mb-8">
          {isLockedOut
            ? `Muitas tentativas. Aguarde ${Math.ceil(((lockedUntil ?? 0) - Date.now()) / 1000)}s.`
            : attempts > 0
              ? `PIN incorreto. ${MAX_ATTEMPTS - attempts} tentativa(s) restante(s).`
              : 'Digite seu PIN para acessar.'}
        </p>

        <div className={`flex gap-4 mb-12 ${error ? 'animate-shake' : ''}`}>
          {renderDots()}
        </div>

        <div className="grid grid-cols-3 gap-6 max-w-[280px]">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <Button
              key={num}
              variant="outline"
              className="w-16 h-16 rounded-full text-2xl font-display shadow-sm hover:bg-muted active:scale-95"
              onClick={() => handleKeyPress(num)}
            >
              {num}
            </Button>
          ))}
          <div />
          <Button
            variant="outline"
            className="w-16 h-16 rounded-full text-2xl font-display shadow-sm hover:bg-muted active:scale-95"
            onClick={() => handleKeyPress(0)}
          >
            0
          </Button>
          <Button
            variant="ghost"
            className="w-16 h-16 rounded-full text-muted-foreground hover:text-foreground active:scale-95"
            onClick={handleDelete}
          >
            <Delete className="w-6 h-6" />
          </Button>
        </div>
      </div>
    );
  }

  // The child content is rendered normally if unlocked
  return (
    <>
      {children}
    </>
  );
}
