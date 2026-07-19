# 2. Arsitektur Sistem

## Frontend
Frontend dibangun menggunakan **TanStack Start**, yang menyediakan routing tipe-aman dengan TanStack Router dan integrasi data dengan TanStack Query.
- **Styling**: Tailwind CSS dan Shadcn UI (berbasis Radix UI).
- **State Management**: React Hooks dan Context API.
- **Animasi**: Framer Motion & CSS Animations.

## Backend
Backend menggunakan **Node.js** dengan struktur modular.
- Arsitektur berbasis layanan (Controller -> Service -> Repository).
- Validasi data menggunakan Zod.
- Skema database diatur dengan ORM yang ringan.

## Aliran Data
1. Pengguna memasukkan ide di frontend.
2. Sistem mengurai ide menjadi PRD (Product Requirements Document).
3. Diagram generator merender visualisasi alur menggunakan Mermaid.js.
4. Komponen Prompt Builder merakit prompt komprehensif (Vibe Coding Prompt).
