'use client';
import dynamic from 'next/dynamic';

// Laci detail hanya terlihat setelah tugas dibuka; dimuat terpisah agar halaman cepat tampil.
export const TaskSheet = dynamic(() => import('./task-sheet').then((module) => module.TaskSheet), {
  ssr: false,
});
