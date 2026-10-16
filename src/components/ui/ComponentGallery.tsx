'use client';
import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { Button, IconButton } from './Button';
import { Input, Textarea } from './Input';
import { Field } from './Field';
import { Badge } from './Badge';
import { Card, CardHeader } from './Card';
import { Select } from './Select';
import { DateInput } from './DateField';
import { DateNav } from './DateNav';
import { BottomNav } from './BottomNav';
import { useDragSort } from './useDragSort';
import { DragOverlay } from './DragOverlay';
import { GripVertical } from 'lucide-react';
import { SegmentedControl } from './SegmentedControl';
import { Legend } from './Legend';
import { Progress } from './Progress';
import { EmptyState } from './EmptyState';

function DragExample() {
  const [column, setColumn] = useState('rencana');
  const { root: dragRef, preview, over, handle } = useDragSort((_id, target) => setColumn(target));
  return (
    <div ref={dragRef} className="ui-gallery-row">
      <DragOverlay preview={preview} title="Kartu contoh" />
      {['rencana', 'proses'].map((target) => (
        <div
          className={`ui-card ${over === target ? 'drag-over' : ''}`}
          data-drop-zone={target}
          key={target}
        >
          <h3>{target === 'rencana' ? 'Rencana' : 'Dikerjakan'}</h3>
          {column === target && (
            <div className="scrum-task-card">
              <IconButton
                type="button"
                aria-label="Seret kartu contoh"
                className="ui-drag-handle"
                {...handle('example')}
              >
                <GripVertical />
              </IconButton>{' '}
              Kartu contoh
            </div>
          )}
        </div>
      ))}
      <p role="status">Kolom contoh: {column}</p>
    </div>
  );
}

export function ComponentGallery() {
  const [dark, setDark] = useState(false);
  const [theme, setTheme] = useState('sage');
  const [value, setValue] = useState('2026-10-04');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    const root = document.documentElement;
    const previous = { dark: root.classList.contains('dark'), theme: root.getAttribute('data-theme'), color: root.getAttribute('data-theme-color') };
    root.classList.toggle('dark', dark);
    root.setAttribute('data-theme', dark ? 'dark' : 'light');
    root.setAttribute('data-theme-color', theme);
    return () => {
      root.classList.toggle('dark', previous.dark);
      for (const [attribute, value] of [['data-theme', previous.theme], ['data-theme-color', previous.color]] as const) {
        if (value === null) root.removeAttribute(attribute); else root.setAttribute(attribute, value);
      }
    };
  }, [dark, theme]);
  return (
    <main className="ui-gallery">
      <h1>Komponen antarmuka</h1>
      <p>
        Pratinjau lokal tanpa koneksi data. Gunakan Tab, hover dan tekan untuk memeriksa fokus serta
        interaksi.
      </p>
      <Button onClick={() => setDark(!dark)}>{dark ? 'Tema terang' : 'Tema gelap'}</Button>
      <Select
        ariaLabel="Warna pratinjau"
        value={theme}
        onChange={setTheme}
        options={['lime', 'peach', 'lavender', 'sage', 'sky']}
      />
      <Card>
        <CardHeader>
          <h2>Tombol</h2>
        </CardHeader>
        <div className="ui-gallery-row">
          {(['primary', 'secondary', 'ghost', 'danger-soft'] as const).map((variant) => (
            <Button key={variant} variant={variant} onClick={() => setNotice(variant)}>
              {variant}
            </Button>
          ))}
          <IconButton aria-label="Tambah">
            <Plus />
          </IconButton>
          <Button disabled>Nonaktif</Button>
          <Button loading>Menyimpan</Button>
        </div>
      </Card>
      <Card>
        <CardHeader>
          <h2>Form dan tanggal</h2>
        </CardHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setNotice('Form valid');
          }}
        >
          <Field id="gallery-name" label="Nama" helper="Contoh bantuan">
            <Input id="gallery-name" aria-describedby="gallery-name-helper" />
          </Field>
          <Field id="gallery-error" label="Kolom dengan galat" error="Lengkapi kolom ini">
            <Input id="gallery-error" aria-invalid aria-describedby="gallery-error-error" />
          </Field>
          <Field id="gallery-notes" label="Catatan">
            <Textarea id="gallery-notes" />
          </Field>
          <DateInput label="Tanggal" name="date" value={value} onValueChange={setValue} required />
          <DateInput label="Tanggal nonaktif" disabled />
          <Select ariaLabel="Pilihan" options={['Pertama', 'Kedua']} />
          <Button type="submit" variant="primary">
            Simpan contoh
          </Button>
        </form>
      </Card>
      <Card>
        <CardHeader>
          <h2>Status dan navigasi</h2>
        </CardHeader>
        <div className="ui-gallery-row">
          {(['neutral', 'success', 'danger', 'warn', 'info'] as const).map((tone) => (
            <Badge key={tone} tone={tone}>
              {tone}
            </Badge>
          ))}
        </div>
        <DateNav
          onPrevious={() => setNotice('Sebelumnya')}
          onToday={() => setNotice('Hari ini')}
          onNext={() => setNotice('Berikutnya')}
        />
      </Card>
      <p role="status">{notice}</p>
      <Card>
        <CardHeader><h2>Keadaan kosong</h2></CardHeader>
        <EmptyState title="Belum ada contoh" description="Pratinjau komponen kosong tanpa data koperasi." action={{ label: 'Coba aksi', onClick: () => setNotice('Aksi keadaan kosong') }} />
      </Card>
      <Card>
        <CardHeader><h2>Pilihan dan grafik</h2></CardHeader>
        <SegmentedControl label="Contoh tampilan" value={notice} onChange={setNotice} options={[{ value: 'daftar', label: 'Daftar' }, { value: 'papan', label: 'Papan' }, { value: 'nonaktif', label: 'Nonaktif', disabled: true }]} />
        <Legend label="Legenda contoh" items={[{key: 'contoh', label: 'Contoh visual, bukan data koperasi', value: '50%', color: 'var(--brand)'}]} />
        <Progress label="Progres contoh visual" value={50} />
      </Card>
      <Card>
        <CardHeader>
          <h2>Drag tanpa data</h2>
        </CardHeader>
        <DragExample />
      </Card>
      <BottomNav
        path="/beranda"
        menu={false}
        onAction={() => setNotice('Aksi')}
        onMenu={() => setNotice('Menu')}
      />
    </main>
  );
}
