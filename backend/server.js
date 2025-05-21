const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Database } = require('libsql');
const path = require('path');
const fs = require('fs');
const jwt = require('jsonwebtoken');

// JWT Configuration
const JWT_SECRET = 'your-super-secret-key-that-should-be-long-and-random-and-from-env'; // TODO: Use environment variable for JWT_SECRET in production
const TOKEN_EXPIRATION = '1h';

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Data directory created at: ${dataDir}`);
}

const dbPath = path.join(dataDir, 'formadapt.db');
const db = new Database(dbPath);
console.log(`Using database at: ${dbPath}`);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    salt TEXT NOT NULL,
    role TEXT NOT NULL
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS modules (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    contenu TEXT NOT NULL,
    document TEXT,
    audio_fr TEXT,
    audio_en TEXT,
    audio_es TEXT,
    subtitles_fr TEXT,
    subtitles_en TEXT,
    subtitles_es TEXT
  );
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS quizzes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    moduleId INTEGER NOT NULL,
    questions TEXT NOT NULL,
    FOREIGN KEY (moduleId) REFERENCES modules(id)
  );
`);

// Initialize data (users, modules, quizzes) if tables are empty
(async () => {
  try {
    const userCountResult = await db.get('SELECT COUNT(*) as count FROM users');
    if (userCountResult && userCountResult.count === 0) {
      const usersToInsert = [
        { name: 'Admin', email: 'admin@example.com', password: 'password', role: 'admin' },
        { name: 'User', email: 'user@example.com', password: 'password', role: 'user' }
      ];
      const insertStmt = db.prepare('INSERT INTO users (nom, email, password, salt, role) VALUES (?, ?, ?, ?, ?)');
      for (const user of usersToInsert) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hashedPassword = crypto.pbkdf2Sync(user.password, salt, 1000, 64, 'sha512').toString('hex');
        insertStmt.run(user.name, user.email, hashedPassword, salt, user.role);
      }
      console.log('Initial users inserted.');
    }
  } catch (error) { console.error('Error during initial user data insertion:', error); }

  try {
    const moduleCountResult = await db.get('SELECT COUNT(*) as count FROM modules');
    if (moduleCountResult && moduleCountResult.count === 0) {
      db.exec(`
        INSERT INTO modules (nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es) VALUES
        ('Introduction à Word', '<h1>Bienvenue sur Word</h1><p>Ceci est une introduction.</p>', '/documents/module1.pdf', '/audio/module1_fr.mp3', '/audio/module1_en.mp3', '/audio/module1_es.mp3', '/subtitles/module1_fr.vtt', '/subtitles/module1_en.vtt', '/subtitles/module1_es.vtt'),
        ('Découvrir Excel', '<h1>Bienvenue sur Excel</h1><p>Ceci est une introduction à Excel.</p>', '/documents/module2.pdf', '/audio/module2_fr.mp3', '/audio/module2_en.mp3', '/audio/module2_es.mp3', '/subtitles/module2_fr.vtt', '/subtitles/module2_en.vtt', '/subtitles/module2_es.vtt');
      `);
      console.log('Initial modules inserted.');
    }
  } catch (error) { console.error('Error during initial module data insertion:', error); }

  try {
    const quizCountResult = await db.get('SELECT COUNT(*) as count FROM quizzes');
    if (quizCountResult && quizCountResult.count === 0) {
      db.exec(`
        INSERT INTO quizzes (moduleId, questions) VALUES
        (1, '[{"id": 1, "question": "Question 1 ?", "options": ["A", "B", "C", "D"], "answer": "B"}, {"id": 2, "question": "Question 2 ?", "options": ["A", "B", "C", "D"], "answer": "C"}]'),
        (2, '[{"id": 3, "question": "Question 3 ?", "options": ["A", "B", "C", "D"], "answer": "A"}, {"id": 4, "question": "Question 4 ?", "options": ["A", "B", "C", "D"], "answer": "D"}]');
      `);
      console.log('Initial quizzes inserted.');
    }
  } catch (error) { console.error('Error during initial quiz data insertion:', error); }
})();

const resetTokens = {};
const reminders = {};
const favorites = {};
const userProgress = {};

const generatePasswordResetToken = () => {
    return crypto.randomBytes(20).toString('hex');
};

// JWT Verification Middleware
const verifyJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7); // Extract token from "Bearer <token>"
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('JWT verification error:', err.message);
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Invalid token');
      }
      req.user = decoded; // Attach decoded payload (e.g., { userId, role, email }) to req
      next(); // Proceed to the protected route's logic
    });
  } else {
    res.writeHead(401, { 'Content-Type': 'text/plain' });
    return res.end('Unauthorized: No token provided');
  }
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;
  const { pathname } = parsedUrl;

  // Public routes (no JWT needed)
  if (pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = await db.get('SELECT id, nom, email, role, password, salt FROM users WHERE email = ?', [email]);
        if (user) {
          const verifyHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
          if (verifyHash === user.password) {
            const jwtToken = jwt.sign(
              { userId: user.id, role: user.role, email: user.email },
              JWT_SECRET,
              { expiresIn: TOKEN_EXPIRATION }
            );
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify({ token: jwtToken, role: user.role, email: user.email, id: user.id, nom: user.nom }));
          } else {
            res.writeHead(401, { 'Content-Type': 'text/plain' });
            res.end('Invalid credentials');
          }
        } else {
          res.writeHead(401, { 'Content-Type': 'text/plain' });
          res.end('Invalid credentials');
        }
      } catch (error) {
        console.error("Login error:", error);
        if (error instanceof SyntaxError) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON format in request body');
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request');
        }
      }
    });
  } else if (pathname === '/api/reset-password' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body);
        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (user) {
          const token = generatePasswordResetToken();
          resetTokens[token] = user.id;
          console.log(`Réinitialisation du mot de passe pour ${email}. Token: ${token}`);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Password reset email sent successfully. Please check your inbox.');
        } else {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('User with that email not found.');
        }
      } catch (error) {
        console.error("Reset password error:", error);
        if (error instanceof SyntaxError) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON format in request body');
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request during password reset.');
        }
      }
    });
  } else if (pathname.startsWith('/api/update-password/') && req.method === 'POST') {
    const token = pathname.split('/').pop();
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', async () => {
      try {
        const { password } = JSON.parse(body);
        const userId = resetTokens[token];
        if (userId) {
          if (!password) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Missing required field: password');
            return;
          }
          const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
          if (user) {
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            await db.run('UPDATE users SET password = ?, salt = ? WHERE id = ?', [hashedPassword, salt, userId]);
            delete resetTokens[token];
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('Password updated successfully.');
          } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('User associated with this token not found.');
          }
        } else {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Invalid or expired password reset token.');
        }
      } catch (error) {
        console.error("Update password error:", error);
        if (error instanceof SyntaxError) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON format in request body');
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request during password update.');
        }
      }
    });
  } else if (pathname.startsWith('/api/translate/')) { // Public translate endpoint
    const textToTranslate = query.text;
    const targetLang = query.lang || 'fr';
    if (!textToTranslate) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('Missing required query parameter: text');
        return;
    }
    let translatedTextResult = textToTranslate;
    if (targetLang === 'en') translatedTextResult = `(Simulated English Translation): ${textToTranslate}`;
    else if (targetLang === 'es') translatedTextResult = `(Simulación de Traducción al Español): ${textToTranslate}`;
    else if (targetLang !== 'fr') translatedTextResult = `(Simulated Translation to ${targetLang} - not supported, returning original): ${textToTranslate}`;
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ translatedText: translatedTextResult }));
  }
  // Protected routes start here
  else if (pathname === '/api/logout') {
    verifyJWT(req, res, () => {
        // JWT logout is client-side (delete token). Server can optionally implement blacklist.
        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('Logged out successfully');
    });
  } else if (pathname === '/api/users' && req.method === 'GET') {
    verifyJWT(req, res, async () => {
      if (req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Admin access required');
      }
      try {
        const users = await db.all('SELECT id, nom, email, role FROM users');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(users));
      } catch (dbError) {
        console.error("Error fetching users:", dbError);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching users from database.');
      }
    });
  } else if (pathname === '/api/users' && req.method === 'POST') {
    verifyJWT(req, res, async () => {
      if (req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Admin access required');
      }
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const newUser = JSON.parse(body);
          if (!newUser.nom || !newUser.email || !newUser.password || !newUser.role) {
            let missingFields = ['nom', 'email', 'password', 'role'].filter(field => !newUser[field]);
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Missing required field(s): ${missingFields.join(', ')}`);
            return;
          }
          const salt = crypto.randomBytes(16).toString('hex');
          const hashedPassword = crypto.pbkdf2Sync(newUser.password, salt, 1000, 64, 'sha512').toString('hex');
          const result = await db.run('INSERT INTO users (nom, email, password, salt, role) VALUES (?, ?, ?, ?, ?)', [newUser.nom, newUser.email, hashedPassword, salt, newUser.role]);
          newUser.id = result.lastInsertRowid;
          delete newUser.password;
          res.writeHead(201, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(newUser));
        } catch (error) {
          console.error("Create user error:", error);
          if (error instanceof SyntaxError) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON format in request body');
          } else if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
            res.writeHead(409, { 'Content-Type': 'text/plain' });
            res.end('Email already in use.');
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request or error creating user.');
          }
        }
      });
    });
  } else if (pathname.startsWith('/api/users/') && req.method === 'PUT') {
    verifyJWT(req, res, async () => {
      if (req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Admin access required');
      }
      const userId = pathname.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const updatedUser = JSON.parse(body);
          if (!updatedUser.nom || !updatedUser.email || !updatedUser.role) {
            let missingFields = ['nom', 'email', 'role'].filter(field => !updatedUser[field]);
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Missing required field(s): ${missingFields.join(', ')}`);
            return;
          }
          await db.run('UPDATE users SET nom = ?, email = ?, role = ? WHERE id = ?', [updatedUser.nom, updatedUser.email, updatedUser.role, userId]);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('User updated successfully.');
        } catch (error) {
          console.error(`Error updating user ${userId}:`, error);
          if (error instanceof SyntaxError) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid JSON format in request body');
          } else if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
            res.writeHead(409, { 'Content-Type': 'text/plain' });
            res.end('Email already in use by another user.');
          } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end('Invalid request or error updating user.');
          }
        }
      });
    });
  } else if (pathname.startsWith('/api/users/') && req.method === 'DELETE') {
    verifyJWT(req, res, async () => {
      if (req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Admin access required');
      }
      const userId = pathname.split('/').pop();
      try {
        const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
        if (result.changes > 0) {
            res.writeHead(200, { 'Content-Type': 'text/plain' });
            res.end('User deleted successfully.');
        } else {
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('User not found or already deleted.');
        }
      } catch (dbError) {
        console.error(`Error deleting user ${userId}:`, dbError);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error deleting user from database.');
      }
    });
  } else if (pathname === '/api/user/modules' && req.method === 'GET') { // Assuming GET for /api/user/modules
    verifyJWT(req, res, async () => {
      try {
        const modules = await db.all('SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(modules));
      } catch (dbError) {
        console.error("Error fetching user modules:", dbError);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching modules from database.');
      }
    });
  } else if (pathname === '/api/modules' && req.method === 'GET') { // Protected route
    verifyJWT(req, res, async () => {
        try {
            let queryBuilder = 'SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules';
            const params = [];
            if (query.search) {
                queryBuilder += ' WHERE LOWER(nom) LIKE ?';
                params.push(`%${query.search.toLowerCase()}%`);
            }
            if (query.sort && query.sort === 'nom') {
                queryBuilder += ' ORDER BY nom';
            }
            const modules = await db.all(queryBuilder, params);
            res.writeHead(200, { 'Content-Type': 'application/json' });
            res.end(JSON.stringify(modules));
        } catch (dbError) {
            console.error("Error fetching all modules:", dbError);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching modules from database.');
        }
    });
  } else if (pathname.startsWith('/api/module/') && !pathname.includes('/document/') && !pathname.includes('/media/') && !pathname.includes('/quiz/') && req.method === 'GET') {
    verifyJWT(req, res, async () => {
        const moduleIdStr = pathname.split('/').pop();
        const moduleId = parseInt(moduleIdStr, 10);
        if (isNaN(moduleId)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Invalid module ID format: ${moduleIdStr}`);
            return;
        }
        try {
            const module = await db.get('SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules WHERE id = ?', [moduleId]);
            if (module) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify(module));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`Module with ID ${moduleId} not found.`);
            }
        } catch (dbError) {
            console.error(`Error fetching module ${moduleId}:`, dbError);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching module from database.');
        }
    });
  } else if (pathname.startsWith('/api/module/document/') && req.method === 'GET') {
    verifyJWT(req, res, async () => {
        const moduleIdStr = pathname.split('/').pop();
        const moduleId = parseInt(moduleIdStr, 10);
        if (isNaN(moduleId)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Invalid module ID format: ${moduleIdStr}`);
            return;
        }
        try {
            const module = await db.get('SELECT document FROM modules WHERE id = ?', [moduleId]);
            if (module && module.document) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ document: module.document }));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`Document not found for module ID ${moduleId}.`);
            }
        } catch (dbError) {
            console.error(`Error fetching document for module ${moduleId}:`, dbError);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching document from database.');
        }
    });
  } else if (pathname.startsWith('/api/module/media/') && req.method === 'GET') {
    verifyJWT(req, res, async () => {
        const moduleIdStr = pathname.split('/').pop();
        const moduleId = parseInt(moduleIdStr, 10);
        if (isNaN(moduleId)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Invalid module ID format: ${moduleIdStr}`);
            return;
        }
        const lang = query.lang || 'fr';
        try {
            const moduleData = await db.get('SELECT audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules WHERE id = ?', [moduleId]);
            if (moduleData) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({
                    audio: moduleData[`audio_${lang}`] || moduleData.audio_fr,
                    subtitles: moduleData[`subtitles_${lang}`] || moduleData.subtitles_fr,
                }));
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`Media not found for module ID ${moduleId}.`);
            }
        } catch (dbError) {
            console.error(`Error fetching media for module ${moduleId}:`, dbError);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching media from database.');
        }
    });
  } else if (pathname.startsWith('/api/module/quiz/') && req.method === 'GET') {
    verifyJWT(req, res, async () => {
        const moduleIdStr = pathname.split('/').pop();
        const moduleId = parseInt(moduleIdStr, 10);
        if (isNaN(moduleId)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Invalid module ID format: ${moduleIdStr}`);
            return;
        }
        try {
            const quiz = await db.get('SELECT questions FROM quizzes WHERE moduleId = ?', [moduleId]);
            if (quiz) {
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(quiz.questions);
            } else {
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end(`Quiz not found for module ID ${moduleId}.`);
            }
        } catch (dbError) {
            console.error(`Error fetching quiz for module ${moduleId}:`, dbError);
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Error fetching quiz from database.');
        }
    });
  } else if (pathname === '/api/statistics' && req.method === 'GET') {
    verifyJWT(req, res, async () => {
      if (req.user.role !== 'admin') {
        res.writeHead(403, { 'Content-Type': 'text/plain' });
        return res.end('Forbidden: Admin access required');
      }
      try {
        // Note: activeUsers based on old session system is removed.
        // A more robust way to track active users with JWT would be needed (e.g. tracking recent activity).
        // For now, returning 0 or removing it from stats if not easily available.
        const activeUsers = 0; // Placeholder, as old session counting is gone.
        const totalModulesResult = await db.get('SELECT COUNT(*) as count FROM modules');
        const totalModules = totalModulesResult.count;
        const averageProgress = 0; // Placeholder
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ activeUsers, totalModules, averageProgress }));
      } catch (dbError) {
        console.error("Error fetching statistics:", dbError);
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Error fetching statistics from database.');
      }
    });
  } else if (pathname.startsWith('/api/module/') && req.method === 'POST' && !pathname.includes('/quiz/')) {
    verifyJWT(req, res, () => { // Removed async from here as body parsing is async
        const moduleIdStr = pathname.split('/').pop();
        const moduleId = parseInt(moduleIdStr, 10);
        if (isNaN(moduleId)) {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end(`Invalid module ID format: ${moduleIdStr}`);
            return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', () => { // Removed async from here, not directly awaiting
            try {
                const { progress, score } = JSON.parse(body);
                if (typeof progress !== 'number' || typeof score !== 'number') {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid data: progress and score must be numbers.');
                    return;
                }
                const userId = req.user.userId; // Get userId from JWT
                if (!userProgress[userId]) {
                    userProgress[userId] = {};
                }
                userProgress[userId][moduleId] = { progress, score };
                res.writeHead(200, { 'Content-Type': 'text/plain' });
                res.end('Progress and score updated (in-memory).');
            } catch (error) {
                console.error(`Error updating progress for module ${moduleId}:`, error);
                if (error instanceof SyntaxError) {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid JSON format in request body');
                } else {
                    res.writeHead(400, { 'Content-Type': 'text/plain' });
                    res.end('Invalid request when updating progress.');
                }
            }
        });
    });
  } else {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Endpoint not found or method not supported.');
  }
});

const hostname = '127.0.0.1';
const port = 3001;

server.listen(port, hostname, () => {
  console.log(`Serveur en cours d'exécution sur http://${hostname}:${port}/`);
});
