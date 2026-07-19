import { Router } from 'express';
import { db } from '../database/connection';
import { aiProviders } from '../database/schema';
import { sql } from 'drizzle-orm';
import appRoutes from './app.routes';
import generateRoutes from './generate.routes';
import adminRoutes from './admin.routes';
import authRoutes from './auth.routes';

const router = Router();

router.get('/health', (req, res) => {
  res.json({ success: true, message: 'AI Software Architect API is running', timestamp: new Date().toISOString() });
});

router.get('/health-dashboard', async (req, res) => {
  let dbStatus = 'Disconnected';
  let dbLatency = 0;
  let providers: any[] = [];
  const startDb = Date.now();

  try {
    await db.select({ id: aiProviders.id }).from(aiProviders).limit(1);
    dbStatus = 'Connected';
    dbLatency = Date.now() - startDb;
  } catch (err) {
    dbStatus = 'Error';
  }

  try {
    providers = await db.select().from(aiProviders);
  } catch (err) {
    providers = [];
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Software Architect • Server Monitor</title>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      theme: {
        extend: {
          fontFamily: { sans: ['Outfit', 'sans-serif'] }
        }
      }
    }
  </script>
  <style>
    @keyframes pulse-green {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.2); opacity: .6; }
    }
    .pulse-dot { animation: pulse-green 2s infinite ease-in-out; }
  </style>
</head>
<body class="bg-[#09090b] text-[#fafafa] font-sans antialiased min-h-screen flex items-center justify-center p-4 sm:p-6">
  <div class="w-full max-w-4xl bg-[#121214] border border-[#27272a] rounded-2xl shadow-2xl overflow-hidden">
    <div class="border-b border-[#27272a] px-6 py-5 flex items-center justify-between bg-[#18181b]/50">
      <div class="flex items-center gap-3">
        <div class="h-10 w-10 rounded-xl bg-violet-600/10 border border-violet-500/20 flex items-center justify-center text-violet-500 font-bold text-lg">AS</div>
        <div>
          <h1 class="text-lg font-semibold tracking-tight">AI Software Architect</h1>
          <p class="text-xs text-zinc-400">Server Health & API Monitoring</p>
        </div>
      </div>
      <div class="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
        <span class="h-2 w-2 bg-emerald-500 rounded-full pulse-dot"></span>
        <span class="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Online</span>
      </div>
    </div>

    <div class="p-6 sm:p-8 space-y-6">
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Database Status</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${dbStatus}</div>
          <div class="mt-1 text-xs text-zinc-500">Neon Serverless • ${dbLatency}ms latency</div>
        </div>

        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Environment</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${process.env.NODE_ENV || 'production'}</div>
          <div class="mt-1 text-xs text-zinc-500">Node.js ${process.version} • Port ${process.env.PORT || 3000}</div>
        </div>

        <div class="bg-[#18181b] border border-[#27272a] p-5 rounded-xl sm:col-span-2 lg:col-span-1">
          <div class="text-xs text-zinc-400 font-medium uppercase tracking-wider">Total AI Providers</div>
          <div class="mt-2 text-2xl font-bold tracking-tight text-white">${providers.length} Registered</div>
          <div class="mt-1 text-xs text-zinc-500">Rotation & Fallback ready</div>
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold tracking-tight text-white mb-3">Active AI Providers</h3>
        <div class="bg-[#18181b] border border-[#27272a] rounded-xl overflow-hidden divide-y divide-[#27272a]">
          ${providers.map(p => `
            <div class="px-5 py-4 flex items-center justify-between">
              <div>
                <span class="font-medium text-white">${p.displayName}</span>
                <span class="ml-2 text-xs bg-zinc-800 border border-zinc-700 px-2 py-0.5 rounded text-zinc-400 font-mono">${p.defaultModel}</span>
              </div>
              <div class="flex items-center gap-4">
                <span class="text-xs text-zinc-400">Order: #${p.priority}</span>
                <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${p.isActive ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' : 'bg-zinc-800 text-zinc-500 border border-zinc-700'}">
                  ${p.isActive ? 'Active' : 'Disabled'}
                </span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <div>
        <h3 class="text-sm font-semibold tracking-tight text-white mb-3">API Routing Modules Status</h3>
        <div class="grid gap-2 sm:grid-cols-2">
          ${[
            { name: 'Core Project Engine', path: '/projects' },
            { name: 'AI Workflow Generator', path: '/generate/prd/:projectId' },
            { name: 'Interactive Questions', path: '/interview/questions' },
            { name: 'Configuration Settings', path: '/admin/settings' },
            { name: 'Provider Key Rotation', path: '/admin/rotation' },
            { name: 'Credential Authorization', path: '/auth/login' }
          ].map(m => `
            <div class="flex items-center gap-3 bg-[#18181b] border border-[#27272a]/60 px-4 py-3 rounded-lg">
              <svg class="h-5 w-5 text-emerald-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <div class="text-sm font-medium text-white">${m.name}</div>
                <div class="text-xs text-zinc-500 font-mono">${m.path}</div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="bg-[#18181b]/30 border-t border-[#27272a] px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400">
      <div>API Prefix: <code class="bg-[#18181b] border border-[#27272a] px-2 py-0.5 rounded text-zinc-300 font-mono">/api/v1</code></div>
      <div>© 2026 AI Software Architect • Systems Operations</div>
    </div>
  </div>
</body>
</html>`;

  res.send(html);
});

router.use('/', appRoutes);
router.use('/generate', generateRoutes);
router.use('/admin', adminRoutes);
router.use('/auth', authRoutes);

export default router;
