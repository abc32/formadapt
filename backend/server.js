const http = require('http');
const url = require('url');
const crypto = require('crypto');
const { Database } = require('libsql');
const path = require('path'); // Added path module
const fs = require('fs'); // Added fs module

// Create data directory if it doesn't exist
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
  console.log(`Data directory created at: ${dataDir}`);
}

// Update database initialization to use a file path
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

// Verify and insert initial user data
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
      console.log('Initial users inserted with hashed passwords.');
    } else {
      console.log('Users table already populated or error checking count.');
    }
  } catch (error) {
    console.error('Error during initial user data check/insertion:', error);
  }
})();


// Verify and insert initial module data
(async () => {
  try {
    const moduleCountResult = await db.get('SELECT COUNT(*) as count FROM modules');
    if (moduleCountResult && moduleCountResult.count === 0) {
      db.exec(`
        INSERT INTO modules (nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es) VALUES
        ('Introduction à Word', '<h1>Bienvenue sur Word</h1><p>Ceci est une introduction.</p>', '/documents/module1.pdf', '/audio/module1_fr.mp3', '/audio/module1_en.mp3', '/audio/module1_es.mp3', '/subtitles/module1_fr.vtt', '/subtitles/module1_en.vtt', '/subtitles/module1_es.vtt'),
        ('Découvrir Excel', '<h1>Bienvenue sur Excel</h1><p>Ceci est une introduction à Excel.</p>', '/documents/module2.pdf', '/audio/module2_fr.mp3', '/audio/module2_en.mp3', '/audio/module2_es.mp3', '/subtitles/module2_fr.vtt', '/subtitles/module2_en.vtt', '/subtitles/module2_es.vtt');
      `);
      console.log('Initial modules inserted.');
    } else {
      console.log('Modules table already populated or error checking count.');
    }
  } catch (error) {
    console.error('Error during initial module data check/insertion:', error);
  }
})();

// Verify and insert initial quiz data
(async () => {
  try {
    const quizCountResult = await db.get('SELECT COUNT(*) as count FROM quizzes');
    if (quizCountResult && quizCountResult.count === 0) {
      db.exec(`
        INSERT INTO quizzes (moduleId, questions) VALUES
        (1, '[{"id": 1, "question": "Question 1 ?", "options": ["A", "B", "C", "D"], "answer": "B"}, {"id": 2, "question": "Question 2 ?", "options": ["A", "B", "C", "D"], "answer": "C"}]'),
        (2, '[{"id": 3, "question": "Question 3 ?", "options": ["A", "B", "C", "D"], "answer": "A"}, {"id": 4, "question": "Question 4 ?", "options": ["A", "B", "C", "D"], "answer": "D"}]');
      `);
      console.log('Initial quizzes inserted.');
    } else {
      console.log('Quizzes table already populated or error checking count.');
    }
  } catch (error) {
    console.error('Error during initial quiz data check/insertion:', error);
  }
})();


const sessions = {};
const resetTokens = {};
const reminders = {};
const favorites = {};
const userProgress = {};

const generateToken = () => {
  return crypto.randomBytes(20).toString('hex');
};

const createSession = (user) => {
  const token = generateToken();
  const expiresAt = Date.now() + 3600000; // Expiration dans 1 heure
  sessions[token] = { userId: user.id, role: user.role, expiresAt };
  return token;
};

const verifyToken = (token) => {
  if (sessions[token] && sessions[token].expiresAt > Date.now()) {
    return sessions[token];
  }
  return null;
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const query = parsedUrl.query;

  if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { email, password } = JSON.parse(body);
        const user = await db.get('SELECT id, role, password, salt FROM users WHERE email = ?', [email]);
        if (user) {
          const verifyHash = crypto.pbkdf2Sync(password, user.salt, 1000, 64, 'sha512').toString('hex');
          if (verifyHash === user.password) {
            const token = createSession(user);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ token, role: user.role }));
          } else {
            res.statusCode = 401;
            res.end('Invalid credentials');
          }
        } else {
          res.statusCode = 401;
          res.end('Invalid credentials');
        }
      } catch (error) {
        console.error("Login error:", error);
        if (error instanceof SyntaxError) {
          res.statusCode = 400;
          res.end('Invalid JSON format in request body');
        } else {
          res.statusCode = 400;
          res.end('Invalid request');
        }
      }
    });
  } else if (parsedUrl.pathname === '/api/logout') {
    const token = req.headers.authorization;
    const session = verifyToken(token); // Use verifyToken to check expiration too
    if (session) { // verifyToken returns null if not found or expired
      delete sessions[token]; // Token is the key from headers
      res.statusCode = 200;
      res.end('Logged out successfully');
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Invalid or expired token');
    }
  } else if (parsedUrl.pathname === '/api/reset-password' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { email } = JSON.parse(body);
        const user = await db.get('SELECT id FROM users WHERE email = ?', [email]);
        if (user) {
          const token = generateToken();
          resetTokens[token] = user.id;
          // Simuler l'envoi d'un e-mail
          console.log(`Réinitialisation du mot de passe pour ${email}. Token: ${token}`);
          res.statusCode = 200;
          res.end('Password reset email sent successfully. Please check your inbox.');
        } else {
          res.statusCode = 404;
          res.end('User with that email not found.');
        }
      } catch (error) {
        console.error("Reset password error:", error);
        if (error instanceof SyntaxError) {
          res.statusCode = 400;
          res.end('Invalid JSON format in request body');
        } else {
          res.statusCode = 400;
          res.end('Invalid request during password reset.');
        }
      }
    });
  } else if (parsedUrl.pathname.startsWith('/api/update-password/') && req.method === 'POST') {
    const token = parsedUrl.pathname.split('/').pop();
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { password } = JSON.parse(body);
        const userId = resetTokens[token];
        if (userId) {
          if (!password) {
            res.statusCode = 400;
            res.end('Missing required field: password');
            return;
          }
          const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
          if (user) {
            const salt = crypto.randomBytes(16).toString('hex');
            const hashedPassword = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
            await db.run('UPDATE users SET password = ?, salt = ? WHERE id = ?', [hashedPassword, salt, userId]);
            delete resetTokens[token]; // Token has been used
            res.statusCode = 200;
            res.end('Password updated successfully.');
          } else {
            // This case should ideally not happen if token maps to a valid user ID that was subsequently deleted.
            res.statusCode = 404;
            res.end('User associated with this token not found.');
          }
        } else {
          res.statusCode = 400;
          res.end('Invalid or expired password reset token.');
        }
      } catch (error) {
        console.error("Update password error:", error);
        if (error instanceof SyntaxError) {
          res.statusCode = 400;
          res.end('Invalid JSON format in request body');
        } else {
          res.statusCode = 400;
          res.end('Invalid request during password update.');
        }
      }
    });
  } else if (parsedUrl.pathname === '/api/users' && req.method === 'GET') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session && session.role === 'admin') {
      try {
        const users = await db.all('SELECT id, nom, email, role FROM users');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(users));
      } catch (dbError) {
        console.error("Error fetching users:", dbError);
        res.statusCode = 500;
        res.end('Error fetching users from database.');
      }
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Admin role required or invalid/expired token.');
    }
  } else if (parsedUrl.pathname === '/api/users' && req.method === 'POST') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session && session.role === 'admin') {
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const newUser = JSON.parse(body);
          if (!newUser.nom || !newUser.email || !newUser.password || !newUser.role) {
            let missingFields = ['nom', 'email', 'password', 'role'].filter(field => !newUser[field]);
            res.statusCode = 400;
            res.end(`Missing required field(s): ${missingFields.join(', ')}`);
            return;
          }

          const salt = crypto.randomBytes(16).toString('hex');
          const hashedPassword = crypto.pbkdf2Sync(newUser.password, salt, 1000, 64, 'sha512').toString('hex');
          const result = await db.run('INSERT INTO users (nom, email, password, salt, role) VALUES (?, ?, ?, ?, ?)', [newUser.nom, newUser.email, hashedPassword, salt, newUser.role]);
          newUser.id = result.lastInsertRowid;
          delete newUser.password; // Do not send password back
          res.statusCode = 201;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify(newUser));
        } catch (error) {
          console.error("Create user error:", error);
          if (error instanceof SyntaxError) {
            res.statusCode = 400;
            res.end('Invalid JSON format in request body');
          } else if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
            res.statusCode = 409; // Conflict
            res.end('Email already in use.');
          } else {
            res.statusCode = 400;
            res.end('Invalid request or error creating user.');
          }
        }
      });
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Admin role required or invalid/expired token.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/users/') && req.method === 'PUT') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session && session.role === 'admin') {
      const userId = parsedUrl.pathname.split('/').pop();
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const updatedUser = JSON.parse(body);
           if (!updatedUser.nom || !updatedUser.email || !updatedUser.role) {
            let missingFields = ['nom', 'email', 'role'].filter(field => !updatedUser[field]);
            res.statusCode = 400;
            res.end(`Missing required field(s): ${missingFields.join(', ')}`);
            return;
          }
          // Ensure password is not updated here, separate endpoint for that
          await db.run('UPDATE users SET nom = ?, email = ?, role = ? WHERE id = ?', [updatedUser.nom, updatedUser.email, updatedUser.role, userId]);
          res.statusCode = 200;
          res.end('User updated successfully.');
        } catch (error) {
          console.error(`Error updating user ${userId}:`, error);
          if (error instanceof SyntaxError) {
            res.statusCode = 400;
            res.end('Invalid JSON format in request body');
          } else if (error.message && error.message.includes('UNIQUE constraint failed: users.email')) {
            res.statusCode = 409; // Conflict
            res.end('Email already in use by another user.');
          } else {
            res.statusCode = 400;
            res.end('Invalid request or error updating user.');
          }
        }
      });
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Admin role required or invalid/expired token.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/users/') && req.method === 'DELETE') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session && session.role === 'admin') {
      const userId = parsedUrl.pathname.split('/').pop();
      try {
        const result = await db.run('DELETE FROM users WHERE id = ?', [userId]);
        if (result.changes > 0) {
          res.statusCode = 200;
          res.end('User deleted successfully.');
        } else {
          res.statusCode = 404;
          res.end('User not found or already deleted.');
        }
      } catch (dbError) {
        console.error(`Error deleting user ${userId}:`, dbError);
        res.statusCode = 500;
        res.end('Error deleting user from database.');
      }
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Admin role required or invalid/expired token.');
    }
  } else if (parsedUrl.pathname === '/api/user/modules') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session) {
      try {
        const modules = await db.all('SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(modules));
      } catch (dbError) {
        console.error("Error fetching user modules:", dbError);
        res.statusCode = 500;
        res.end('Error fetching modules from database.');
      }
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Invalid or expired token.');
    }
  } else if (parsedUrl.pathname === '/api/modules' && req.method === 'GET') {
    try {
      let queryBuilder = 'SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules';
      const params = [];
      if (query.search) {
        queryBuilder += ' WHERE LOWER(nom) LIKE ?';
        params.push(`%${query.search.toLowerCase()}%`);
      }

      if (query.sort) {
        if (query.sort === 'nom') {
          queryBuilder += ' ORDER BY nom';
        }
        // Note: Sorting by progress would require progress data, which is not part of this subtask yet.
        // else if (query.sort === 'progress') { /* queryBuilder += ' ORDER BY progress DESC'; */ }
      }

      const modules = await db.all(queryBuilder, params);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(modules));
    } catch (dbError) {
      console.error("Error fetching all modules:", dbError);
      res.statusCode = 500;
      res.end('Error fetching modules from database.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/module/') && !parsedUrl.pathname.includes('/document/') && !parsedUrl.pathname.includes('/media/') && !parsedUrl.pathname.includes('/quiz/') && req.method === 'GET') {
    const moduleIdStr = parsedUrl.pathname.split('/').pop();
    const moduleId = parseInt(moduleIdStr, 10);
    if (isNaN(moduleId)) {
      res.statusCode = 400;
      res.end(`Invalid module ID format: ${moduleIdStr}`);
      return;
    }
    try {
      const module = await db.get('SELECT id, nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules WHERE id = ?', [moduleId]);
      if (module) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(module));
      } else {
        res.statusCode = 404;
        res.end(`Module with ID ${moduleId} not found.`);
      }
    } catch (dbError) {
      console.error(`Error fetching module ${moduleId}:`, dbError);
      res.statusCode = 500;
      res.end('Error fetching module from database.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/module/document/') && req.method === 'GET') {
    const moduleIdStr = parsedUrl.pathname.split('/').pop();
    const moduleId = parseInt(moduleIdStr, 10);
     if (isNaN(moduleId)) {
      res.statusCode = 400;
      res.end(`Invalid module ID format: ${moduleIdStr}`);
      return;
    }
    try {
      const module = await db.get('SELECT document FROM modules WHERE id = ?', [moduleId]);
      if (module && module.document) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ document: module.document }));
      } else {
        res.statusCode = 404;
        res.end(`Document not found for module ID ${moduleId}.`);
      }
    } catch (dbError) {
      console.error(`Error fetching document for module ${moduleId}:`, dbError);
      res.statusCode = 500;
      res.end('Error fetching document from database.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/module/media/') && req.method === 'GET') {
    const moduleIdStr = parsedUrl.pathname.split('/').pop();
    const moduleId = parseInt(moduleIdStr, 10);
    if (isNaN(moduleId)) {
      res.statusCode = 400;
      res.end(`Invalid module ID format: ${moduleIdStr}`);
      return;
    }
    const lang = query.lang || 'fr';
    try {
      const module = await db.get('SELECT audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es FROM modules WHERE id = ?', [moduleId]);
      if (module) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          audio: module[`audio_${lang}`] || module.audio_fr, // Fallback to French if specified lang not found
          subtitles: module[`subtitles_${lang}`] || module.subtitles_fr, // Fallback to French
        }));
      } else {
        res.statusCode = 404;
        res.end(`Media not found for module ID ${moduleId}.`);
      }
    } catch (dbError) {
      console.error(`Error fetching media for module ${moduleId}:`, dbError);
      res.statusCode = 500;
      res.end('Error fetching media from database.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/translate/')) {
    // IMPORTANT: This is a placeholder/simulated translation endpoint.
    // It does not perform real translation and should not be used in production for actual translation needs.
    const textToTranslate = query.text;
    const targetLang = query.lang || 'fr';

    if (!textToTranslate) {
      res.statusCode = 400;
      res.end('Missing required query parameter: text');
      return;
    }

    let translatedTextResult = textToTranslate;
    if (targetLang === 'en') {
      translatedTextResult = `(Simulated English Translation): ${textToTranslate}`;
    } else if (targetLang === 'es') {
      translatedTextResult = `(Simulación de Traducción al Español): ${textToTranslate}`;
    } else if (targetLang !== 'fr') {
      // If language is not 'fr', 'en', or 'es', acknowledge it's not supported by this placeholder
      translatedTextResult = `(Simulated Translation to ${targetLang} - not supported, returning original): ${textToTranslate}`;
    }
    // For 'fr', it just returns the original text as per previous logic.

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ translatedText: translatedTextResult }));
  } else if (parsedUrl.pathname === '/api/statistics' && req.method === 'GET') {
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session && session.role === 'admin') {
      try {
        const activeUsers = Object.keys(sessions).length; // This remains session-based
        const totalModulesResult = await db.get('SELECT COUNT(*) as count FROM modules');
        const totalModules = totalModulesResult.count;
        // Average progress calculation would require a progress tracking mechanism,
        // which is not fully implemented in the database yet for this subtask.
        // For now, we'll set averageProgress to 0.
        const averageProgress = 0; // Placeholder
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ activeUsers, totalModules, averageProgress }));
      } catch (dbError) {
        console.error("Error fetching statistics:", dbError);
        res.statusCode = 500;
        res.end('Error fetching statistics from database.');
      }
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Admin role required or invalid/expired token.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/module/') && req.method === 'POST' && !parsedUrl.pathname.includes('/quiz/')) { // Ensure this doesn't clash with quiz for progress update
    const moduleIdStr = parsedUrl.pathname.split('/').pop();
    const moduleId = parseInt(moduleIdStr, 10);
    if (isNaN(moduleId)) {
      res.statusCode = 400;
      res.end(`Invalid module ID format: ${moduleIdStr}`);
      return;
    }
    const token = req.headers.authorization;
    const session = verifyToken(token);
    if (session) {
      const userId = session.userId;
      let body = '';
      req.on('data', chunk => {
        body += chunk.toString();
      });
      req.on('end', () => {
        try {
          const { progress, score } = JSON.parse(body);
          if (typeof progress !== 'number' || typeof score !== 'number') {
            res.statusCode = 400;
            res.end('Invalid data: progress and score must be numbers.');
            return;
          }
          // This part still uses userProgress object as per previous logic.
          // Integrating progress into the database is a larger task for a future step.
          if (!userProgress[userId]) {
            userProgress[userId] = {};
          }
          userProgress[userId][moduleId] = { progress, score };
          res.statusCode = 200;
          res.end('Progress and score updated (in-memory).');
        } catch (error) {
          console.error(`Error updating progress for module ${moduleId}:`, error);
          if (error instanceof SyntaxError) {
            res.statusCode = 400;
            res.end('Invalid JSON format in request body');
          } else {
            res.statusCode = 400;
            res.end('Invalid request when updating progress.');
          }
        }
      });
    } else {
      res.statusCode = 401;
      res.end('Unauthorized: Invalid or expired token.');
    }
  } else if (parsedUrl.pathname.startsWith('/api/module/quiz/') && req.method === 'GET') {
    const moduleIdStr = parsedUrl.pathname.split('/').pop();
    const moduleId = parseInt(moduleIdStr, 10);
    if (isNaN(moduleId)) {
      res.statusCode = 400;
      res.end(`Invalid module ID format: ${moduleIdStr}`);
      return;
    }
    try {
      const quiz = await db.get('SELECT questions FROM quizzes WHERE moduleId = ?', [moduleId]);
      if (quiz) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(quiz.questions); // Assuming questions are stored as JSON string
      } else {
        res.statusCode = 404;
        res.end(`Quiz not found for module ID ${moduleId}.`);
      }
    } catch (dbError) {
      console.error(`Error fetching quiz for module ${moduleId}:`, dbError);
      res.statusCode = 500;
      res.end('Error fetching quiz from database.');
    }
  } else {
    res.statusCode = 404;
    res.end('Endpoint not found or method not supported.');
  }
});

const hostname = '127.0.0.1';
const port = 3001;

server.listen(port, hostname, () => {
  console.log(`Serveur en cours d'exécution sur http://${hostname}:${port}/`);
});
