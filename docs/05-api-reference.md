# 5. Referensi API & Prompt

## Struktur JSON Prompt

Saat mengekspor prompt, aplikasi akan menghasilkan struktur berikut untuk dikonsumsi agen AI:

```json
{
  "frontend": "Spesifikasi UI/UX secara detail. Daftar semua halaman, layout, dan komponen Tailwind CSS.",
  "backend": "Desain sistem backend, arsitektur API, rute (endpoint), middleware, dan skema autentikasi.",
  "database": "Skema DDL PostgreSQL, tipe data UUID, constraint, relasi foreign key, dan skema awal.",
  "tasks": "Daftar urutan langkah (checklist) kronologis untuk pengembangan (contoh: Setup -> Database -> Backend -> Frontend)."
}
```

## Endpoint Internal Backend
Jika berinteraksi dengan API internal:
- `POST /api/generate-prd`: Menghasilkan dokumen PRD.
- `POST /api/generate-diagram`: Menghasilkan representasi flowchart.
- `POST /api/compile-prompt`: Menyusun JSON akhir.
