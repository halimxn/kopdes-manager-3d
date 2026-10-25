'use client';
import { useRef, useState } from 'react';
import { ArrowRight, Check, CircleAlert, LockKeyhole, LoaderCircle } from 'lucide-react';
import { api, resetAuthNavigation } from '@/lib/client';
import { Logo } from '@/components/ui/logo';
import { Field, Input } from '@/components/ui/field';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

const MIN = 6;
const MAX = 12;
type Phase = 'idle' | 'checking' | 'success' | 'error';

/**
 * Masuk dengan PIN, bergaya kartu verifikasi kode: kotak per angka yang terisi satu per satu,
 * cincin gembok mengikuti jumlah angka, tombol terisi bertahap, getar bila salah, hijau bila benar.
 */
export default function PinPage() {
  useTheme();
  const [setup, setSetup] = useState(false);
  const [pin, setPin] = useState('');
  const [token, setToken] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [message, setMessage] = useState('');
  const [focused, setFocused] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  // Enam kotak; PIN lebih panjang (sampai 12) menambah kotak yang menyempit dalam satu baris.
  const boxes = Math.min(MAX, Math.max(MIN, pin.length));
  const progress = Math.min(1, pin.length / MIN);
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

  return (
    <main className="grid min-h-dvh place-items-center bg-canvas px-4 py-10">
      <div className="flex w-full max-w-[25rem] flex-col items-center gap-6">
        <Logo className="animate-[item-in_0.5s_var(--ease-out)]" />
        <form
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            void submit();
          }}
          className={cn(
            'flex w-full animate-[pop-in_0.55s_var(--ease-spring)] flex-col items-center rounded-[1.75rem] bg-surface px-6 pt-8 pb-6 text-center shadow-float ring-1 ring-line/70 sm:px-8',
            phase === 'error' && 'animate-[pin-shake_0.45s_ease-in-out]',
          )}
        >
          <LockBadge progress={progress} phase={phase} />
          <h1
            key={title}
            className="mt-5 animate-[item-in_0.35s_var(--ease-out)] text-[22px] font-extrabold tracking-tight text-ink"
          >
            {title}
          </h1>
          <p className="mt-1.5 max-w-xs text-sm text-ink-3">{subtitle}</p>

          <label className="relative mt-6 block w-full cursor-text" htmlFor="pin">
            <span className="sr-only">{setup ? 'PIN baru' : 'PIN'}</span>
            {/* Kolom sungguhan tak terlihat di atas kotak: papan ketik HP, tempel, dan pengelola sandi tetap bekerja. */}
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
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              onChange={(event) => {
                if (phase === 'error') setPhase('idle');
                setPin(event.target.value.replace(/\D/g, '').slice(0, MAX));
              }}
              className="absolute inset-0 z-10 h-full w-full cursor-text opacity-0"
            />
            <span className="flex justify-center gap-1.5 sm:gap-2" aria-hidden="true">
              {Array.from({ length: boxes }, (_, index) => {
                const filled = index < pin.length;
                const active = focused && !busy && index === pin.length;
                return (
                  <span
                    key={index}
                    style={{ transitionDelay: phase === 'success' ? `${index * 45}ms` : undefined }}
                    className={cn(
                      'relative grid h-14 max-w-12 min-w-0 flex-1 animate-[item-in_0.35s_var(--ease-out)_backwards] place-items-center rounded-2xl bg-surface-2 ring-1 ring-line-strong transition-[background-color,box-shadow,transform] duration-300',
                      filled && 'bg-surface ring-2 ring-accent-strong/60',
                      active &&
                        'scale-105 bg-surface ring-2 ring-accent-strong shadow-[0_0_0_5px_var(--accent)]',
                      phase === 'success' && 'bg-done-bar ring-transparent',
                      phase === 'error' && filled && 'bg-late ring-late-ink/50',
                    )}
                  >
                    {filled && (
                      <span
                        className={cn(
                          'size-3 animate-[pin-dot_0.35s_var(--ease-spring)] rounded-full bg-ink',
                          phase === 'success' && 'bg-on-action',
                          phase === 'error' &&
                            'animate-[pin-drop_0.45s_ease-in_forwards] bg-late-ink',
                        )}
                      />
                    )}
                    {active && (
                      <span className="h-6 w-0.5 animate-[pin-caret_1s_steps(1)_infinite] rounded-full bg-accent-strong" />
                    )}
                  </span>
                );
              })}
            </span>
          </label>
          <p id="pin-hint" className="mt-3 text-xs text-ink-3">
            {phase === 'success'
              ? 'PIN benar'
              : pin.length < MIN
                ? `${MIN - pin.length} angka lagi`
                : `${pin.length} angka · tekan Enter atau tombol di bawah`}
          </p>

          {setup && (
            <Field
              label="Token pengaturan awal"
              hint="Dari HUB_SETUP_TOKEN di server, minimal 32 karakter."
              className="mt-5 w-full text-left"
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
                'mt-4 flex animate-[item-in_0.3s_var(--ease-out)] items-center gap-1.5 text-sm font-semibold',
                phase === 'error' || !message.includes('tersimpan')
                  ? 'text-late-ink'
                  : 'text-done-ink',
              )}
            >
              <CircleAlert className="size-4 shrink-0" aria-hidden="true" />
              {message}
            </p>
          )}

          <button
            type="submit"
            disabled={!ready || busy}
            className={cn(
              'relative mt-6 h-12 w-full overflow-hidden rounded-2xl bg-surface-3 text-[15px] font-bold transition-colors duration-300',
              ready ? 'text-on-action' : 'text-ink-3',
              phase === 'success' && 'bg-done-bar',
            )}
          >
            {/* Isi tombol bertambah per angka; penuh = siap dikirim. */}
            <span
              aria-hidden="true"
              className={cn(
                'absolute inset-y-0 left-0 rounded-2xl transition-[width,background-color] duration-500 ease-[var(--ease-out)]',
                // Sebelum cukup angka isi berwarna sorotan muda (label tetap terbaca); siap = hitam penuh.
                ready ? 'bg-action' : 'bg-accent',
                phase === 'success' && 'bg-done-bar',
              )}
              style={{ width: `${(phase === 'success' ? 1 : progress) * 100}%` }}
            />
            <span className="relative flex items-center justify-center gap-2">
              {phase === 'checking' ? (
                <>
                  <LoaderCircle className="size-[18px] animate-spin" /> Memeriksa…
                </>
              ) : phase === 'success' ? (
                <>
                  <Check className="size-[18px]" /> Masuk
                </>
              ) : (
                <>
                  {setup ? 'Simpan PIN awal' : 'Buka ruang kerja'}
                  <ArrowRight className="size-[18px]" />
                </>
              )}
            </span>
          </button>

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
            className="mt-4 text-sm font-semibold text-ink-3 transition-colors hover:text-ink"
          >
            {setup ? 'Kembali ke masuk' : 'Pengaturan PIN pertama kali'}
          </button>
        </form>
        <p className="text-xs text-ink-3">
          Sesi berlaku 12 jam. Lima kali salah mengunci 15 menit.
        </p>
      </div>
    </main>
  );
}

/** Gembok dalam cincin: cincin terisi mengikuti jumlah angka, berubah centang hijau saat berhasil. */
function LockBadge({ progress, phase }: { progress: number; phase: Phase }) {
  const r = 34;
  const length = 2 * Math.PI * r;
  const done = phase === 'success';
  return (
    <span className="relative grid size-20 place-items-center">
      <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90" aria-hidden="true">
        <circle cx="40" cy="40" r={r} fill="none" strokeWidth="3" className="stroke-line" />
        <circle
          cx="40"
          cy="40"
          r={r}
          fill="none"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={length}
          strokeDashoffset={length * (1 - (done ? 1 : progress))}
          className={cn(
            'transition-[stroke-dashoffset,stroke] duration-500 ease-[var(--ease-out)]',
            done
              ? 'stroke-done-bar'
              : phase === 'error'
                ? 'stroke-late-ink'
                : 'stroke-accent-strong',
          )}
        />
      </svg>
      <span
        key={done ? 'done' : 'lock'}
        className={cn(
          'grid size-14 animate-[pop-in_0.45s_var(--ease-spring)] place-items-center rounded-full',
          done ? 'bg-done-bar text-on-action' : 'bg-accent text-accent-ink',
        )}
      >
        {done ? <Check className="size-6" strokeWidth={3} /> : <LockKeyhole className="size-6" />}
      </span>
    </span>
  );
}
