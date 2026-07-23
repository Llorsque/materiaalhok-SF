// Auth-middleware voor de materiaalhok-SF backend.
//
// - requireAuth  : blokkeert requests zonder geldige sessie
// - requireAdmin : requireAuth + rolcheck
//
// Werkt op basis van een Bearer-token dat na login is uitgegeven en in de
// sessions-tabel is opgeslagen. Tokens verlopen na een vaste periode; deze
// middleware kijkt bij elk verzoek of het token nog geldig is. Verlopen
// tokens worden meteen opgeruimd zodat ze niet blijven rondslingeren.

const db = require('../db');

function readToken(req) {
  const raw = req.headers.authorization || '';
  const m = raw.match(/^Bearer\s+(.+)$/i);
  return m ? m[1].trim() : null;
}

function requireAuth(req, res, next) {
  const token = readToken(req);
  if (!token) {
    return res.status(401).json({ error: 'Niet ingelogd — vraag een nieuw token aan via /api/login.' });
  }

  const row = db.prepare(`
    SELECT s.expires_at, u.id, u.name, u.email, u.role
    FROM sessions s
    JOIN users u ON u.id = s.user_id
    WHERE s.token = ?
  `).get(token);

  if (!row) {
    return res.status(401).json({ error: 'Sessie onbekend — log opnieuw in.' });
  }

  if (new Date(row.expires_at).getTime() < Date.now()) {
    // Ruim direct op zodat we niet steeds dezelfde dode sessie evalueren.
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return res.status(401).json({ error: 'Sessie verlopen — log opnieuw in.' });
  }

  req.user = { id: row.id, name: row.name, email: row.email, role: row.role };
  next();
}

function requireAdmin(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Alleen admins mogen deze actie uitvoeren.' });
    }
    next();
  });
}

module.exports = { requireAuth, requireAdmin };
