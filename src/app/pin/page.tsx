'use client';
import { useEffect, useRef, useState } from 'react';
import { ArrowRight, Check, CircleAlert, Delete, LoaderCircle } from 'lucide-react';
import { api, resetAuthNavigation } from '@/lib/client';
import { LogoMark } from '@/components/ui/logo';
import { Field, Input } from '@/components/ui/field';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const MIN = 6;
const MAX = 12;
type Phase = 'idle' | 'checking' | 'success' | 'error';
const KEY =
  'grid size-[4.5rem] place-items-center rounded-full bg-surface-2 text-2xl font-normal text-ink ring-1 ring-line transition hover:bg-surface-3 active:scale-95 disabled:pointer-events-none';

/**
 * Layar kunci seperti di HP: titik per angka dan papan angka sendiri, tanpa kartu. Papan ketik biasa,
 * tempel, dan pengelola sandi tetap bekerja lewat kolom tak terlihat di atas titik.
 */
export default function PinPage() {
  useTheme();
  const [setup, setSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (input.current && window.matchMedia('(pointer: coarse)').matches)
      input.current.inputMode = 'none';
  }, []);
  // Enam titik; PIN lebih panjang (sampai 12) menambah titik.
  const boxes = Math.min(MAX, Math.max(MIN, pin.length));
  const ready = pin.length >= MIN && (!setup || token.length >= 32);
  const busy = phase === 'checking' || phase === 'success';

  const submit = async () => {
    if (!ready || busy) return;
    setPhase('checking');
    setMessage('');
    try {
      await api('auth/pin', {
        action: setup ? 'setup' : 'login',
        pin,
        ...(setup ? { setupToken: token } : {}),
      });
      if (setup) {
        setSetup(false);
        setPin('');
        setToken('');
        setPhase('idle');
        setMessage('PIN awal tersimpan. Silakan masuk dengan PIN itu.');
        input.current?.focus();
        return;
      }
      setPhase('success');
      // Jeda singkat agar tanda berhasil terlihat sebelum pindah ke Beranda.
      window.setTimeout(() => resetAuthNavigation('/home'), 650);
    } catch (error) {
      setPhase('error');
      setMessage((error as Error).message);
      window.setTimeout(() => {
        setPin('');
        setPhase('idle');
        input.current?.focus();
      }, 520);
    }
  };

  const title =
    phase === 'success' ? 'Berhasil masuk' : setup ? 'Buat PIN pertama' : 'Masuk ruang kerja';
  const subtitle =
    phase === 'success'
      ? 'Membuka ruang kerja Anda…'
      : setup
        ? 'Pilih PIN 6–12 angka, lalu isi token pengaturan awal dari server.'
        : 'Masukkan PIN ruang kerja manajer koperasi.';

  const press = (digit: string) => {
    if (busy || pin.length >= MAX) return;
    if (phase === 'error') setPhase('idle');
    setPin(pin + digit);
    input.current?.focus({ preventScroll: true });
  };

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className={cn(
          'flex w-full max-w-[21rem] animate-[item-in_0.5s_var(--ease-out)] flex-col items-center text-center',
          phase === 'error' && 'animate-[pin-shake_0.45s_ease-in-out]',
        )}
      >
        <LogoMark className="size-12 rounded-2xl" />
        <h1
          key={title}
          className="mt-5 animate-[item-in_0.35s_var(--ease-out)] text-[32px] leading-tight font-normal tracking-[-0.02em] text-ink"
        >
          {title}
        </h1>
        <p className="mt-1 text-[13px] text-ink-3">{subtitle}</p>

        <label className="relative mt-6 block w-full cursor-text" htmlFor="pin">
          <span className="sr-only">{setup ? 'PIN baru' : 'PIN'}</span>
          {/* Kolom sungguhan tak terlihat di atas titik: papan ketik, tempel, dan pengelola sandi tetap bekerja. */}
          <input
            ref={input}
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete={setup ? 'new-password' : 'current-password'}
            autoFocus
            value={pin}
            disabled={busy}
            maxLength={MAX}
            aria-describedby="pin-hint"
            onChange={(event) => {
              if (phase === 'error') setPhase('idle');
              setPin(event.target.value.replace(/\D/g, '').slice(0, MAX));
            }}
            className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
          />
          <span className="flex h-6 items-center justify-center gap-3" aria-hidden="true">
            {Array.from({ length: boxes }, (_, index) => {
              const filled = index < pin.length;
              return (
                <span
                  key={index}
                  style={{ transitionDelay: phase === 'success' ? `${index * 45}ms` : undefined }}
                  className={cn(
                    'size-3.5 rounded-full ring-1 ring-line-strong transition-[background-color,transform] duration-200',
                    filled && 'scale-110 bg-action ring-transparent',
                    phase === 'success' && 'bg-done-bar ring-transparent',
                    phase === 'error' && filled && 'bg-late-bar',
                  )}
                />
              );
            })}
          </span>
        </label>
        <p id="pin-hint" className="mt-2 text-xs text-ink-3">
          {phase === 'success'
            ? 'PIN benar'
            : pin.length < MIN
              ? `${MIN - pin.length} angka lagi`
              : `${pin.length} angka`}
        </p>

        {setup && (
          <Field
            label="Token pengaturan awal"
            hint="Dari HUB_SETUP_TOKEN di server, minimal 32 karakter."
            className="mt-4 w-full text-left"
          >
            <Input
              name="token"
              type="password"
              autoComplete="off"
              value={token}
              onChange={(event) => setToken(event.target.value)}
            />
          </Field>
        )}

        {message && (
          <p
            role="alert"
            className={cn(
              'mt-3 flex animate-[item-in_0.3s_var(--ease-out)] items-center gap-1.5 text-sm',
              phase === 'error' || !message.includes('tersimpan')
                ? 'text-late-ink'
                : 'text-done-ink',
            )}
          >
            <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
            {message}
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button key={digit} type="button" onClick={() => press(digit)} className={KEY}>
              {digit}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setPin(pin.slice(0, -1));
              input.current?.focus({ preventScroll: true });
            }}
            disabled={busy || !pin}
            aria-label="Hapus satu angka"
            className={cn(KEY, 'bg-transparent ring-0 disabled:opacity-40')}
          >
            <Delete className="size-5" />
          </button>
          <button type="button" onClick={() => press('0')} className={KEY}>
            0
          </button>
          <button
            type="submit"
            disabled={!ready || busy}
            aria-label={setup ? 'Simpan PIN awal' : 'Buka ruang kerja'}
            className={cn(
              KEY,
              'bg-action text-on-action ring-0 hover:bg-action-hover disabled:bg-surface-2 disabled:text-ink-3',
              phase === 'success' && 'disabled:bg-done-bar disabled:text-on-bar',
            )}
          >
            {phase === 'checking' ? (
              <LoaderCircle className="size-5 animate-spin" />
            ) : phase === 'success' ? (
              <Check className="size-5" />
            ) : (
              <ArrowRight className="size-5" />
            )}
          </button>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setSetup(!setup);
            setMessage('');
            setPin('');
            setPhase('idle');
            input.current?.focus();
          }}
          className="mt-5 min-h-11 text-[13px] text-ink-2 transition-colors hover:text-ink"
        >
          {setup ? 'Kembali ke masuk' : 'Pengaturan PIN pertama kali'}
        </button>
        <p className="text-xs text-ink-3">
          Sesi berlaku 12 jam. Lima kali salah mengunci 15 menit.
        </p>
      </form>
    </main>
  );
}
