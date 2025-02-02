const http = require('http');
  const url = require('url');
  const crypto = require('crypto');
  const { Database } = require('libsql');

  const db = new Database(':memory:');

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nom TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
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

  db.exec(`
    INSERT INTO users (nom, email, password, role) VALUES
    ('Admin', 'admin@example.com', 'password', 'admin'),
    ('User', 'user@example.com', 'password', 'user');
  `);

  db.exec(`
    INSERT INTO modules (nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es) VALUES
    ('Introduction à Word', '<h1>Bienvenue sur Word</h1><p>Ceci est une introduction.</p>', '/documents/module1.pdf', '/audio/module1_fr.mp3', '/audio/module1_en.mp3', '/audio/module1_es.mp3', '/subtitles/module1_fr.vtt', '/subtitles/module1_en.vtt', '/subtitles/module1_es.vtt'),
    ('Découvrir Excel', '<h1>Bienvenue sur Excel</h1><p>Ceci est une introduction à Excel.</p>', '/documents/module2.pdf', '/audio/module2_fr.mp3', '/audio/module2_en.mp3', '/audio/module2_es.mp3', '/subtitles/module2_fr.vtt', '/subtitles/module2_en.vtt', '/subtitles/module2_es.vtt');
  `);

  db.exec(`
    INSERT INTO quizzes (moduleId, questions) VALUES
    (1, '[{"id": 1, "question": "Question 1 ?", "options": ["A", "B", "C", "D"], "answer": "B"}, {"id": 2, "question": "Question 2 ?", "options": ["A", "B", "C", "D"], "answer": "C"}]'),
    (2, '[{"id": 3, "question": "Question 3 ?", "options": ["A", "B", "C", "D"], "answer": "A"}, {"id": 4, "question": "Question 4 ?", "options": ["A", "B", "C", "D"], "answer": "D"}]');
  `);

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
          const user = await db.get('SELECT id, role FROM users WHERE email = ? AND password = ?', [email, password]);
          if (user) {
            const token = createSession(user);
            res.statusCode = 200;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ token, role: user.role }));
          } else {
            res.statusCode = 401;
            res.end('Invalid credentials');
          }
        } catch (error) {
          res.statusCode = 400;
          res.end('Invalid request');
        }
      });
    } else if (parsedUrl.pathname === '/api/logout') {
      const token = req.headers.authorization;
      if (token && sessions[token]) {
        delete sessions[token];
        res.statusCode = 200;
        res.end('Logged out');
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
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
            res.end('Reset email sent');
          } else {
            res.statusCode = 404;
            res.end('User not found');
          }
        } catch (error) {
          res.statusCode = 400;
          res.end('Invalid request');
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
            const user = await db.get('SELECT id FROM users WHERE id = ?', [userId]);
            if (user) {
              await db.run('UPDATE users SET password = ? WHERE id = ?', [password, userId]);
              delete resetTokens[token];
              res.statusCode = 200;
              res.end('Password updated');
            } else {
              res.statusCode = 404;
              res.end('User not found');
            }
          } else {
            res.statusCode = 400;
            res.end('Invalid token');
          }
        } catch (error) {
          res.statusCode = 400;
          res.end('Invalid request');
        }
      });
    } else if (parsedUrl.pathname === '/api/users' && req.method === 'GET') {
      const token = req.headers.authorization;
      const session = verifyToken(token);
      if (session && session.role === 'admin') {
        const users = await db.all('SELECT id, nom, email, role FROM users');
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(users));
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
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
            const result = await db.run('INSERT INTO users (nom, email, password, role) VALUES (?, ?, ?, ?)', [newUser.nom, newUser.email, newUser.password, newUser.role]);
            newUser.id = result.lastInsertRowid;
            res.statusCode = 201;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(newUser));
          } catch (error) {
            res.statusCode = 400;
            res.end('Invalid request');
          }
        });
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
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
            await db.run('UPDATE users SET nom = ?, email = ?, role = ? WHERE id = ?', [updatedUser.nom, updatedUser.email, updatedUser.role, userId]);
            res.statusCode = 200;
            res.end('User updated');
          } catch (error) {
            res.statusCode = 400;
            res.end('Invalid request');
          }
        });
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
      }
    } else if (parsedUrl.pathname.startsWith('/api/users/') && req.method === 'DELETE') {
      const token = req.headers.authorization;
      const session = verifyToken(token);
      if (session && session.role === 'admin') {
        const userId = parsedUrl.pathname.split('/').pop();
        await db.run('DELETE FROM users WHERE id = ?', [userId]);
        res.statusCode = 200;
        res.end('User deleted');
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
      }
    } else if (parsedUrl.pathname === '/api/user/modules') {
      const token = req.headers.authorization;
      const session = verifyToken(token);
      if (session) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(modules));
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
      }
    } else if (parsedUrl.pathname === '/api/modules') {
      let filteredModules = [...modules];

      if (query.search) {
        const searchTerm = query.search.toLowerCase();
        filteredModules = filteredModules.filter(module =>
          module.nom.toLowerCase().includes(searchTerm)
        );
      }

      if (query.sort) {
        const sortOption = query.sort;
        filteredModules.sort((a, b) => {
          if (sortOption === 'nom') {
            return a.nom.localeCompare(b.nom);
          } else if (sortOption === 'progress') {
            return b.progress - a.progress;
          }
          return 0;
        });
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(filteredModules));
    } else if (parsedUrl.pathname.startsWith('/api/module/')) {
      const moduleId = parsedUrl.pathname.split('/').pop();
      const module = modulesData[moduleId];

      if (module) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(module));
      } else {
        res.statusCode = 404;
        res.end('Module not found');
      }
    } else if (parsedUrl.pathname.startsWith('/api/module/document/')) {
      const moduleId = parsedUrl.pathname.split('/').pop();
      const module = modulesData[moduleId];

      if (module && module.document) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ document: module.document }));
      } else {
        res.statusCode = 404;
        res.end('Document not found');
      }
    } else if (parsedUrl.pathname.startsWith('/api/module/media/')) {
      const moduleId = parsedUrl.pathname.split('/').pop();
      const lang = query.lang || 'fr';
      const module = modulesData[moduleId];

      if (module) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({
          audio: module.audio[lang] || module.audio.fr,
          subtitles: module.subtitles[lang] || module.subtitles.fr,
        }));
      } else {
        res.statusCode = 404;
        res.end('Media not found');
      }
    } else if (parsedUrl.pathname.startsWith('/api/translate/')) {
      const text = query.text;
      const lang = query.lang || 'fr';
      // Simuler la traduction
      let translatedText = text;
      if (lang === 'en') {
        translatedText = `Translated to English: ${text}`;
      } else if (lang === 'es') {
        translatedText = `Traducido al español: ${text}`;
      }
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ translatedText }));
    } else if (parsedUrl.pathname === '/api/statistics' && req.method === 'GET') {
      const token = req.headers.authorization;
      const session = verifyToken(token);
      if (session && session.role === 'admin') {
        const activeUsers = Object.keys(sessions).length;
        const totalModules = modules.length;
        const averageProgress = modules.reduce((sum, module) => sum + module.progress, 0) / totalModules;
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ activeUsers, totalModules, averageProgress }));
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
      }
    } else if (parsedUrl.pathname.startsWith('/api/module/') && req.method === 'POST') {
      const moduleId = parsedUrl.pathname.split('/').pop();
      const token = req.headers.authorization;
      if (token && sessions[token]) {
        const userId = sessions[token].userId;
        let body = '';
        req.on('data', chunk => {
          body += chunk.toString();
        });
        req.on('end', () => {
          try {
            const { progress, score } = JSON.parse(body);
            if (!userProgress[userId]) {
              userProgress[userId] = {};
            }
            userProgress[userId][moduleId] = { progress, score };
            res.statusCode = 200;
            res.end('Progress and score updated');
          } catch (error) {
            res.statusCode = 400;
            res.end('Invalid request');
          }
        });
      } else {
        res.statusCode = 401;
        res.end('Unauthorized');
      }
    } else if (parsedUrl.pathname.startsWith('/api/module/quiz/')) {
      const moduleId = parsedUrl.pathname.split('/').pop();
      const module = modulesData[moduleId];
      if (module && module.quiz) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(module.quiz));
      } else {
        res.statusCode = 404;
        res.end('Quiz not found');
      }
    } else {
      res.statusCode = 404;
      res.end('Not Found');
    }
  });

  const hostname = '127.0.0.1';
  const port = 3001;

  server.listen(port, hostname, () => {
    console.log(`Serveur en cours d'exécution sur http://${hostname}:${port}/`);
  });
