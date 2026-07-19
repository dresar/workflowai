# 1. Pengantar & Setup

## Tentang AI Workflow Studio
AI Workflow Studio adalah alat generasi workspace dan aplikasi berbasis AI yang membantu pengguna mendesain ide (PRD), membuat arsitektur atau diagram alur kerja, mendefinisikan tumpukan teknologi, dan secara otomatis menyusun "Vibe Coding Super Prompt" yang akan digunakan oleh agen AI lainnya.

## Prasyarat
- Node.js versi 18 ke atas
- Bun (sebagai package manager utama)
- PostgreSQL (jika database digunakan)

## Struktur Folder Utama
- `/src`: Berisi kode React frontend (komponen, rute TanStack, hook).
- `/server`: Berisi backend API (Express/Nitro/Hono).
- `/public`: Berkas aset statis (ikon, gambar).

## Panduan Instalasi
1. Clone repositori ini.
2. Jalankan `bun install` di root folder.
3. Jika menggunakan backend, jalankan juga `bun install` di folder `/server`.
4. Jalankan aplikasi dengan `bun run dev:all`.
