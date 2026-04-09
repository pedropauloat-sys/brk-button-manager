require('dotenv').config();
const http = require('http');
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ═══════════════════════════════════════════════════════════
// DATABASE INIT
// ═══════════════════════════════════════════════════════════
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS brk_buttons (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL DEFAULT '',
      icon TEXT DEFAULT '🔘',
      description TEXT DEFAULT '',
      action_type TEXT DEFAULT 'webhook',
      action_url TEXT DEFAULT '',
      http_method TEXT DEFAULT 'POST',
      color TEXT DEFAULT '#1f93ff',
      modal_html TEXT DEFAULT '',
      new_tab BOOLEAN DEFAULT true,
      active BOOLEAN DEFAULT true,
      dynamic BOOLEAN DEFAULT false,
      single_use BOOLEAN DEFAULT false,
      visible_to TEXT[] DEFAULT '{}',
      conditions JSONB DEFAULT '[]',
      sort_order INTEGER DEFAULT 0,
      group_name TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS brk_button_groups (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      sort_order INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS brk_button_clicks (
      id SERIAL PRIMARY KEY,
      button_id TEXT NOT NULL,
      user_email TEXT DEFAULT '',
      clicked_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[DB] Tables ready');
}

// ═══════════════════════════════════════════════════════════
// CORS + JSON HELPERS
// ═══════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '*').split(',').map(s=>s.trim()).filter(Boolean);

function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    if (ALLOWED_ORIGINS.includes('*') || ALLOWED_ORIGINS.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    } else {
      res.setHeader('Access-Control-Allow-Origin', 'null');
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
}

function json(req, res, data, status = 200) {
  applyCors(req, res);
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
}
function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    let size = 0;
    const maxSize = 102400; // Limite de 100KB do Payload
    req.on('data', c => {
      size += c.length;
      if (size > maxSize) {
        reject(new Error('Payload too large'));
        return;
      }
      body += c;
    });
    req.on('end', () => { try { resolve(JSON.parse(body || '{}')); } catch { resolve({}); } });
    req.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════
// STATIC FILES
// ═══════════════════════════════════════════════════════════
const MIME = { '.html':'text/html','.js':'application/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml' };

function serveStatic(res, filePath) {
  const ext = path.extname(filePath);
  // Proteção contra Path Traversal
  const sanitizedPath = path.normalize(filePath).replace(/^(\.\.[\/\\])+/, '');
  const publicDir = path.resolve(__dirname, 'public');
  const full = path.resolve(publicDir, sanitizedPath);

  if (!full.startsWith(publicDir)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  if (!fs.existsSync(full)) { res.writeHead(404); res.end('Not found'); return; }
  res.writeHead(200, { 'Content-Type': MIME[ext] || 'text/plain' });
  fs.createReadStream(full).pipe(res);
}

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════

// Rate Limiter em RAM Local (Proteção Anti-Spam e DOS)
const hits = {};
setInterval(() => { for (const k in hits) if (!hits[k].length) delete hits[k]; }, 300000);

function checkRateLimit(ip, max = 120, windowMs = 60000) {
  const now = Date.now();
  if (!hits[ip]) hits[ip] = [];
  hits[ip] = hits[ip].filter(t => now - t < windowMs);
  if (hits[ip].length >= max) return false;
  hits[ip].push(now);
  return true;
}

async function handleAPI(req, res, url, method) {
  applyCors(req, res);
  if (method === 'OPTIONS') { res.writeHead(204); res.end(); return; }

  const clientIp = req.socket.remoteAddress || '127.0.0.1';
  if (!checkRateLimit(clientIp)) {
    return json(req, res, { error: 'Muitas requisições. Tente mais tarde.' }, 429);
  }

  // Bloqueio de Segurança: Apenas botões ativos e cliques são públicos. O painel requer ADMIN_TOKEN.
  const isPublicRoute = (url === '/api/buttons/active' && method === 'GET') || 
                        (url === '/api/analytics/click' && method === 'POST') ||
                        (url === '/widget.js' && method === 'GET');

  if (!isPublicRoute) {
    if (!process.env.ADMIN_TOKEN) {
      console.error('[SECURITY] ADMIN_TOKEN não configurado. API travada por segurança externa.');
      return json(req, res, { error: 'Server misconfigured' }, 503);
    }
    
    const authHeader = req.headers['authorization'] || '';
    const token = authHeader.replace('Bearer ', '').trim();
    if (token !== process.env.ADMIN_TOKEN) {
      return json(req, res, { error: 'Unauthorized' }, 401);
    }
  }

  // GET /api/buttons — lista todos os botões
  if (url === '/api/buttons' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM brk_buttons ORDER BY sort_order ASC, created_at ASC');
    return json(req, res, { data: rows });
  }

  // POST /api/buttons — cria botão
  if (url === '/api/buttons' && method === 'POST') {
    const b = await parseBody(req);
    const id = b.id || 'btn_' + Date.now() + '_' + Math.random().toString(36).slice(2,7);
    await pool.query(`
      INSERT INTO brk_buttons (id,label,icon,description,action_type,action_url,http_method,color,modal_html,new_tab,active,dynamic,single_use,visible_to,conditions,sort_order,group_name)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17)
    `, [id, b.label||'', b.icon||'🔘', b.description||'', b.action_type||'webhook', b.action_url||'', b.http_method||'POST', b.color||'#1f93ff', b.modal_html||'', b.new_tab!==false, b.active!==false, !!b.dynamic, !!b.single_use, b.visible_to||[], JSON.stringify(b.conditions||[]), b.sort_order||0, b.group_name||'']);
    return json(req, res, { id, success: true }, 201);
  }

  // PUT /api/buttons/:id — atualiza botão
  const putMatch = url.match(/^\/api\/buttons\/(.+)$/);
  if (putMatch && method === 'PUT') {
    const b = await parseBody(req);
    await pool.query(`
      UPDATE brk_buttons SET label=$1,icon=$2,description=$3,action_type=$4,action_url=$5,http_method=$6,color=$7,modal_html=$8,new_tab=$9,active=$10,dynamic=$11,single_use=$12,visible_to=$13,conditions=$14,sort_order=$15,group_name=$16,updated_at=NOW()
      WHERE id=$17
    `, [b.label||'', b.icon||'🔘', b.description||'', b.action_type||'webhook', b.action_url||'', b.http_method||'POST', b.color||'#1f93ff', b.modal_html||'', b.new_tab!==false, b.active!==false, !!b.dynamic, !!b.single_use, b.visible_to||[], JSON.stringify(b.conditions||[]), b.sort_order||0, b.group_name||'', putMatch[1]]);
    return json(req, res, { success: true });
  }

  // DELETE /api/buttons/:id
  const delMatch = url.match(/^\/api\/buttons\/(.+)$/);
  if (delMatch && method === 'DELETE') {
    await pool.query('DELETE FROM brk_buttons WHERE id=$1', [delMatch[1]]);
    return json(req, res, { success: true });
  }

  // GET /api/buttons/active — botões ativos (para o widget)
  if (url === '/api/buttons/active' && method === 'GET') {
    const { rows } = await pool.query('SELECT id,label,icon,description,action_type,action_url,http_method,color,modal_html,new_tab,dynamic,single_use,visible_to,conditions,group_name FROM brk_buttons WHERE active=true ORDER BY sort_order ASC');
    return json(req, res, { data: rows });
  }

  // POST /api/buttons/reorder — reordena com proteção de transação
  if (url === '/api/buttons/reorder' && method === 'POST') {
    const { order } = await parseBody(req);
    if (!Array.isArray(order) || order.length > 200) {
      return json(req, res, { error: 'Ordenação inválida' }, 400);
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < order.length; i++) {
        await client.query('UPDATE brk_buttons SET sort_order=$1 WHERE id=$2', [i, String(order[i])]);
      }
      await client.query('COMMIT');
    } catch(e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return json(req, res, { success: true });
  }

  // GET /api/groups
  if (url === '/api/groups' && method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM brk_button_groups ORDER BY sort_order ASC');
    return json(req, res, { data: rows });
  }

  // POST /api/groups
  if (url === '/api/groups' && method === 'POST') {
    const { name } = await parseBody(req);
    await pool.query('INSERT INTO brk_button_groups (name) VALUES ($1) ON CONFLICT DO NOTHING', [name]);
    return json(req, res, { success: true });
  }

  // POST /api/analytics/click
  if (url === '/api/analytics/click' && method === 'POST') {
    const { button_id, user_email } = await parseBody(req);
    if (!button_id) return json(req, res, { error: 'Missing button_id' }, 400);
    pool.query('INSERT INTO brk_button_clicks (button_id, user_email) VALUES ($1, $2)', [button_id, user_email || '']).catch(console.error);
    return json(req, res, { success: true });
  }

  // GET /api/analytics/stats
  if (url === '/api/analytics/stats' && method === 'GET') {
    try {
      const totalAll = await pool.query('SELECT COUNT(*) FROM brk_button_clicks');
      const totalMonth = await pool.query("SELECT COUNT(*) FROM brk_button_clicks WHERE clicked_at >= date_trunc('month', CURRENT_DATE)");
      const totalToday = await pool.query('SELECT COUNT(*) FROM brk_button_clicks WHERE clicked_at >= CURRENT_DATE');
      
      const topButtons = await pool.query(`
        SELECT c.button_id, b.label, b.icon, COUNT(*) as clicks
        FROM brk_button_clicks c
        LEFT JOIN brk_buttons b ON c.button_id = b.id
        GROUP BY c.button_id, b.label, b.icon
        ORDER BY clicks DESC LIMIT 10
      `);

      const topUsers = await pool.query(`
        SELECT user_email, COUNT(*) as clicks
        FROM brk_button_clicks
        WHERE user_email != ''
        GROUP BY user_email
        ORDER BY clicks DESC LIMIT 10
      `);

      return json(req, res, {
        totals: {
          all: parseInt(totalAll.rows[0].count),
          month: parseInt(totalMonth.rows[0].count),
          today: parseInt(totalToday.rows[0].count)
        },
        buttons: topButtons.rows,
        users: topUsers.rows
      });
    } catch (err) {
      console.error(err);
      return json(req, res, { error: 'Failed' }, 500);
    }
  }

  // GET /widget.js — script que injeta botões no Chatwoot
  if (url === '/widget.js' && method === 'GET') {
    const widgetPath = path.join(__dirname, 'public', 'widget.js');
    if (fs.existsSync(widgetPath)) {
      res.writeHead(200, { 'Content-Type': 'application/javascript', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' });
      fs.createReadStream(widgetPath).pipe(res);
      return;
    }
  }

  json(req, res, { error: 'Not found' }, 404);
}

// ═══════════════════════════════════════════════════════════
// HTTP SERVER
// ═══════════════════════════════════════════════════════════
const server = http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  const method = req.method;

  try {
    if (url.startsWith('/api/') || url === '/widget.js') {
      await handleAPI(req, res, url, method);
    } else if (url === '/' || url === '/index.html') {
      serveStatic(res, 'index.html');
    } else {
      serveStatic(res, url);
    }
  } catch (err) {
    if (err.message === 'Payload too large') {
      json(req, res, { error: 'Objeto acima de 100KB não suportado' }, 413);
    } else {
      console.error('[SERVER ERROR]', err);
      // Retorna erro genérico ocultando senhas e dados das queries (Vazamento Interno protegido)
      json(req, res, { error: 'Internal Server Error' }, 500); 
    }
  }
});

initDB().then(() => {
  server.listen(PORT, () => console.log(`[BRK Buttons] Running on port ${PORT}`));
}).catch(err => {
  console.error('[DB ERROR]', err);
  process.exit(1);
});
