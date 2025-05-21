const http = require('http');
  const url = require('url');
  const crypto = require('crypto');
  const { MongoClient, ObjectId } = require('mongodb');
  const jwt = require('jsonwebtoken');
  const bcrypt = require('bcryptjs');

  const JWT_SECRET = 'formadapt-super-secret-key-please-change-in-prod'; // Replace with a strong, random key
  const mongoUrl = 'mongodb://localhost:27017/formadapt';
  const client = new MongoClient(mongoUrl);
  let db;

  // Middleware to verify JWT
  const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (token == null) {
      if (!res.headersSent) {
        res.statusCode = 401;
        res.setHeader('Content-Type', 'application/json');
        return res.end(JSON.stringify({ message: 'No token provided' }));
      }
      return;
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        if (!res.headersSent) {
          res.statusCode = 403;
          res.setHeader('Content-Type', 'application/json');
          return res.end(JSON.stringify({ message: 'Token is not valid' }));
        }
        return;
      }
      req.user = user; // Add decoded user payload to request object
      next(); 
    });
  };

  async function connectDB() {
    try {
      await client.connect();
      db = client.db();
      console.log('Connected successfully to MongoDB');

      const usersCollection = db.collection('users');
      const modulesCollection = db.collection('modules');
      const quizzesCollection = db.collection('quizzes');
      const userProgressCollection = db.collection('userProgress');

      // Ensure collections and indexes
      const collections = await db.listCollections().toArray();
      const collectionExists = (name) => collections.some(c => c.name === name);

      if (!collectionExists('users')) await db.createCollection('users');
      if (!collectionExists('modules')) await db.createCollection('modules');
      if (!collectionExists('quizzes')) await db.createCollection('quizzes');
      
      if (!collectionExists('userProgress')) {
        await db.createCollection('userProgress');
        console.log('userProgress collection created.');
      }
      
      const userProgressIndexes = await userProgressCollection.listIndexes().toArray();
      const indexExists = (name) => userProgressIndexes.some(idx => idx.name === name);

      if (!indexExists("userId_1")) { // Default name for single field index
        try { await userProgressCollection.createIndex({ userId: 1 }); } 
        catch (e) { if (e.code !== 85 && e.code !== 86 && !e.message.toLowerCase().includes('index already exists')) console.error("Error creating userId index for userProgress:", e.message); }
      }
      if (!indexExists("moduleId_1")) {
        try { await userProgressCollection.createIndex({ moduleId: 1 }); }
        catch (e) { if (e.code !== 85 && e.code !== 86 && !e.message.toLowerCase().includes('index already exists')) console.error("Error creating moduleId index for userProgress:", e.message); }
      }
      if (!indexExists("userId_1_moduleId_1")) {
        try { await userProgressCollection.createIndex({ userId: 1, moduleId: 1 }, { unique: true }); }
        catch (e) { if (e.code !== 85 && e.code !== 86 && !e.message.toLowerCase().includes('index already exists')) console.error("Error creating unique userId_moduleId index for userProgress:", e.message); }
      }
      console.log('Ensured indexes on userProgress collection.');


      // Initial data (passwords should be hashed)
      if (await usersCollection.countDocuments() === 0) {
        const usersToSeed = [
          { nom: 'Admin', email: 'admin@example.com', password: await bcrypt.hash('password', 10), role: 'admin' },
          { nom: 'User', email: 'user@example.com', password: await bcrypt.hash('password', 10), role: 'user' }
        ];
        await usersCollection.insertMany(usersToSeed);
      }

      if (await modulesCollection.countDocuments() === 0) {
        const modulesToSeed = [
          { _id: new ObjectId(), nom: 'Introduction à Word', contenu: '<h1>Bienvenue sur Word</h1><p>Ceci est une introduction.</p>', document: '/documents/module1.pdf', audio_fr: '/audio/module1_fr.mp3', audio_en: '/audio/module1_en.mp3', audio_es: '/audio/module1_es.mp3', subtitles_fr: '/subtitles/module1_fr.vtt', subtitles_en: '/subtitles/module1_en.vtt', subtitles_es: '/subtitles/module1_es.vtt', createdAt: new Date(), updatedAt: new Date() },
          { _id: new ObjectId(), nom: 'Découvrir Excel', contenu: '<h1>Bienvenue sur Excel</h1><p>Ceci est une introduction à Excel.</p>', document: '/documents/module2.pdf', audio_fr: '/audio/module2_fr.mp3', audio_en: '/audio/module2_en.mp3', audio_es: '/audio/module2_es.mp3', subtitles_fr: '/subtitles/module2_fr.vtt', subtitles_en: '/subtitles/module2_en.vtt', subtitles_es: '/subtitles/module2_es.vtt', createdAt: new Date(), updatedAt: new Date() }
        ];
        await modulesCollection.insertMany(modulesToSeed);
      }
      
      if (await modulesCollection.countDocuments() > 0 && await quizzesCollection.countDocuments() === 0) {
        const wordModule = await modulesCollection.findOne({ nom: 'Introduction à Word' });
        const excelModule = await modulesCollection.findOne({ nom: 'Découvrir Excel' });
        if (wordModule && excelModule) {
          await quizzesCollection.insertMany([
            { moduleId: wordModule._id, questions: [{id: 1, question: "Question 1?", options: ["A", "B", "C", "D"], answer: "B"}, {id: 2, question: "Question 2?", options: ["A", "B", "C", "D"], answer: "C"}] },
            { moduleId: excelModule._id, questions: [{id: 3, question: "Question 3?", options: ["A", "B", "C", "D"], answer: "A"}, {id: 4, question: "Question 4?", options: ["A", "B", "C", "D"], answer: "D"}] }
          ]);
        }
      }
    } catch (err) {
      console.error('Failed to connect to MongoDB or setup data:', err);
      process.exit(1);
    }
  }

  const resetTokens = {}; // For password reset

  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const query = parsedUrl.query;

    // CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }
    
    // Public routes (no middleware needed before these checks)
    const publicGetRoutes = [
        '/api/modules', // Read all modules
        /^\/api\/modules\/([a-fA-F0-9]{24})$/, // Read specific module e.g. /api/modules/objectid
        /^\/api\/module\/document\/([a-fA-F0-9]{24})$/, // Specific module document
        /^\/api\/module\/media\/([a-fA-F0-9]{24})$/, // Specific module media
        /^\/api\/translate\// // Mock translate
    ];

    const isPublicGetRoute = publicGetRoutes.some(pattern => 
        typeof pattern === 'string' ? parsedUrl.pathname === pattern : pattern.test(parsedUrl.pathname)
    );

    if (
        (parsedUrl.pathname === '/api/signup' && req.method === 'POST') ||
        (parsedUrl.pathname === '/api/login' && req.method === 'POST') ||
        (parsedUrl.pathname === '/api/reset-password' && req.method === 'POST') ||
        (parsedUrl.pathname.startsWith('/api/update-password/') && req.method === 'POST') ||
        (isPublicGetRoute && req.method === 'GET')
    ) {
        // Proceed without authentication for these public routes
    } else {
        // For all other routes, apply authentication (logic to call authenticateToken will be inside each route block)
        // This is a simplified placeholder; actual middleware application is per-route.
    }


    if (parsedUrl.pathname === '/api/signup' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { nom, email, password } = JSON.parse(body);
          if (!nom || !email || !password) {
            res.statusCode = 400; return res.end(JSON.stringify({ message: 'Name, email, and password are required' }));
          }
          const existingUser = await db.collection('users').findOne({ email });
          if (existingUser) {
            res.statusCode = 409; return res.end(JSON.stringify({ message: 'Email already in use' }));
          }
          const hashedPassword = await bcrypt.hash(password, 10);
          const result = await db.collection('users').insertOne({ nom, email, password: hashedPassword, role: 'user' });
          const insertedUser = { _id: result.insertedId, nom, email, role: 'user' }; // Construct user object

          const tokenPayload = { userId: insertedUser._id, role: insertedUser.role, nom: insertedUser.nom };
          const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
          res.statusCode = 201; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ token, user: { id: insertedUser._id, nom: insertedUser.nom, email: insertedUser.email, role: insertedUser.role } }));
        } catch (error) {
          console.error('Signup error:', error);
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Error during signup process' }));
        }
      });
    } else if (parsedUrl.pathname === '/api/login' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { email, password } = JSON.parse(body);
          if (!email || !password) {
            res.statusCode = 400; return res.end(JSON.stringify({ message: 'Email and password are required' }));
          }
          const user = await db.collection('users').findOne({ email });
          if (!user) {
            res.statusCode = 401; return res.end(JSON.stringify({ message: 'Invalid credentials' }));
          }
          const isMatch = await bcrypt.compare(password, user.password);
          if (!isMatch) {
            res.statusCode = 401; return res.end(JSON.stringify({ message: 'Invalid credentials' }));
          }
          const tokenPayload = { userId: user._id, role: user.role, nom: user.nom };
          const token = jwt.sign(tokenPayload, JWT_SECRET, { expiresIn: '1h' });
          res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ token, user: { id: user._id, nom: user.nom, email: user.email, role: user.role } }));
        } catch (error) {
          console.error('Login error:', error);
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Error during login process' }));
        }
      });
    } else if (parsedUrl.pathname === '/api/logout' && req.method === 'POST') {
      res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ message: 'Logged out successfully' }));
    } else if (parsedUrl.pathname === '/api/reset-password' && req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { email } = JSON.parse(body);
          const user = await db.collection('users').findOne({ email }, { projection: { _id: 1 } });
          if (user) {
            const tempToken = crypto.randomBytes(20).toString('hex');
            resetTokens[tempToken] = user._id;
            console.log(`Password reset token for ${email}: ${tempToken}`);
            res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Reset email sent (token in console)' }));
          } else {
            res.statusCode = 404; res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'User not found' }));
          }
        } catch (error) {
          console.error('Reset password error:', error);
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Error during password reset' }));
        }
      });
    } else if (parsedUrl.pathname.startsWith('/api/update-password/') && req.method === 'POST') {
      const tempToken = parsedUrl.pathname.split('/').pop();
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', async () => {
        try {
          const { password } = JSON.parse(body);
          if (!password) {
            res.statusCode = 400; return res.end(JSON.stringify({ message: 'Password is required' }));
          }
          const userId = resetTokens[tempToken];
          if (userId) {
            const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
            if (user) {
              const hashedPassword = await bcrypt.hash(password, 10);
              await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { password: hashedPassword } });
              delete resetTokens[tempToken];
              res.statusCode = 200; res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: 'Password updated' }));
            } else {
              res.statusCode = 404; res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ message: 'User not found' }));
            }
          } else {
            res.statusCode = 400; res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ message: 'Invalid or expired token' }));
          }
        } catch (error) {
          console.error('Update password error:', error);
          res.statusCode = 500; res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ message: 'Error updating password' }));
        }
      });
    } 
    // User Management (Admin)
    else if (parsedUrl.pathname === '/api/users' && req.method === 'GET') {
      authenticateToken(req, res, async () => {
        if (!req.user || req.user.role !== 'admin') {
          if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
        }
        try {
          const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
          if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(users)); }
        } catch (error) {
          if(!res.headersSent) { console.error(error); res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message: 'Error fetching users' }));}
        }
      });
    } else if (parsedUrl.pathname === '/api/users' && req.method === 'POST') {
       authenticateToken(req, res, async () => {
        if (!req.user || req.user.role !== 'admin') {
          if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { nom, email, password, role } = JSON.parse(body);
            if (!nom || !email || !password || !role) {
              if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Missing fields for new user' }));} return;
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            const result = await db.collection('users').insertOne({ nom, email, password: hashedPassword, role });
            const createdUser = { _id: result.insertedId, nom, email, role };
            if(!res.headersSent) { res.statusCode = 201; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(createdUser));}
          } catch (error) {
            if(!res.headersSent) { 
              if (error.code === 11000) { res.statusCode = 409; res.end(JSON.stringify({ message: 'Email already exists.'})); }
              else { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error creating user' }));}
            }
          }
        });
      });
    } else if (parsedUrl.pathname.startsWith('/api/users/') && req.method === 'PUT') {
      authenticateToken(req, res, async () => {
        if (!req.user || req.user.role !== 'admin') {
          if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
        }
        const userId = parsedUrl.pathname.split('/').pop();
        if (!ObjectId.isValid(userId)) {
          if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid user ID' }));} return;
        }
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          try {
            const { nom, email, role } = JSON.parse(body); // Password not updatable here
            const result = await db.collection('users').updateOne({ _id: new ObjectId(userId) }, { $set: { nom, email, role } });
            if (result.matchedCount === 0) {
              if(!res.headersSent) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'User not found' }));} return;
            }
            const updatedUser = await db.collection('users').findOne({_id: new ObjectId(userId)}, {projection: {password: 0}});
            if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(updatedUser));}
          } catch (error) {
            if(!res.headersSent) { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error updating user' }));}
          }
        });
      });
    } else if (parsedUrl.pathname.startsWith('/api/users/') && req.method === 'DELETE') {
      authenticateToken(req, res, async () => {
        if (!req.user || req.user.role !== 'admin') {
          if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
        }
        const userId = parsedUrl.pathname.split('/').pop();
        if (!ObjectId.isValid(userId)) {
          if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid user ID' }));} return;
        }
        try {
          const result = await db.collection('users').deleteOne({ _id: new ObjectId(userId) });
          if (result.deletedCount === 0) {
            if(!res.headersSent) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'User not found' }));} return;
          }
          if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message: 'User deleted' }));}
        } catch (error) {
          if(!res.headersSent) { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error deleting user' }));}
        }
      });
    }
    // Module CRUD (Admin) & Public Read
    else if (parsedUrl.pathname === '/api/modules' && req.method === 'GET') { // Read All (Public)
        try {
            const modules = await db.collection('modules').find(query.search ? { nom: { $regex: query.search, $options: 'i' } } : {}).sort(query.sort === 'nom' ? {nom: 1} : {}).toArray();
            if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(modules));}
        } catch (error) {
            if(!res.headersSent) { console.error(error); res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message: 'Error fetching modules' }));}
        }
    } else if (parsedUrl.pathname.startsWith('/api/modules/') && !parsedUrl.pathname.includes('/progress') && req.method === 'GET') { // Read Specific (Public)
        const moduleId = parsedUrl.pathname.split('/')[3];
        if (!ObjectId.isValid(moduleId)) {
            if(!res.headersSent) { res.statusCode = 400; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;
        }
        try {
            const module = await db.collection('modules').findOne({ _id: new ObjectId(moduleId) });
            if (!module) {
                if(!res.headersSent) { res.statusCode = 404; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Module not found' }));} return;
            }
            if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(module));}
        } catch (error) {
             if(!res.headersSent) { console.error(error); res.statusCode = 500; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message: 'Error fetching module' }));}
        }
    } else if (parsedUrl.pathname === '/api/modules' && req.method === 'POST') { // Create Module (Admin)
        authenticateToken(req, res, async () => {
            if (!req.user || req.user.role !== 'admin') {
                if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
            }
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es } = JSON.parse(body);
                    if (!nom || !contenu) {
                        if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Name and content are required' }));} return;
                    }
                    const newModule = { nom, contenu, document, audio_fr, audio_en, audio_es, subtitles_fr, subtitles_en, subtitles_es, createdAt: new Date(), updatedAt: new Date() };
                    const result = await db.collection('modules').insertOne(newModule);
                    const createdModule = await db.collection('modules').findOne({_id: result.insertedId});
                    if(!res.headersSent) { res.statusCode = 201; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(createdModule));}
                } catch (error) {
                    if(!res.headersSent) { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error creating module' }));}
                }
            });
        });
    } else if (parsedUrl.pathname.startsWith('/api/modules/') && !parsedUrl.pathname.includes('/progress') && req.method === 'PUT') { // Update Module (Admin)
        authenticateToken(req, res, async () => {
            if (!req.user || req.user.role !== 'admin') {
                 if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
            }
            const moduleId = parsedUrl.pathname.split('/')[3];
            if (!ObjectId.isValid(moduleId)) {
                if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;
            }
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const updates = JSON.parse(body);
                    delete updates._id; // Cannot update _id
                    updates.updatedAt = new Date();
                    const result = await db.collection('modules').updateOne({ _id: new ObjectId(moduleId) }, { $set: updates });
                    if (result.matchedCount === 0) {
                        if(!res.headersSent) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'Module not found' }));} return;
                    }
                    const updatedModule = await db.collection('modules').findOne({_id: new ObjectId(moduleId)});
                    if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(updatedModule));}
                } catch (error) {
                    if(!res.headersSent) { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error updating module' }));}
                }
            });
        });
    } else if (parsedUrl.pathname.startsWith('/api/modules/') && !parsedUrl.pathname.includes('/progress') && req.method === 'DELETE') { // Delete Module (Admin)
        authenticateToken(req, res, async () => {
            if (!req.user || req.user.role !== 'admin') {
                 if(!res.headersSent) { res.statusCode = 403; res.setHeader('Content-Type', 'application/json'); return res.end(JSON.stringify({ message: 'Access denied' }));} return;
            }
            const moduleId = parsedUrl.pathname.split('/')[3];
            if (!ObjectId.isValid(moduleId)) {
                if(!res.headersSent) { res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;
            }
            try {
                const result = await db.collection('modules').deleteOne({ _id: new ObjectId(moduleId) });
                // Also delete related quizzes and user progress
                await db.collection('quizzes').deleteMany({ moduleId: new ObjectId(moduleId) });
                await db.collection('userProgress').deleteMany({ moduleId: new ObjectId(moduleId) });
                if (result.deletedCount === 0) {
                    if(!res.headersSent) { res.statusCode = 404; return res.end(JSON.stringify({ message: 'Module not found' }));} return;
                }
                if(!res.headersSent) { res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ message: 'Module deleted' }));}
            } catch (error) {
                if(!res.headersSent) { console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error deleting module' }));}
            }
        });
    }
    // User Progress Endpoints
    else if (parsedUrl.pathname.match(/^\/api\/modules\/([a-fA-F0-9]{24})\/progress$/) && (req.method === 'POST' || req.method === 'PUT')) { // Update Progress
        authenticateToken(req, res, async () => {
            if (!req.user || !req.user.userId) { if(!res.headersSent){res.statusCode = 401; return res.end(JSON.stringify({ message: 'Auth required' }));} return;}
            const moduleId = parsedUrl.pathname.split('/')[3];
            if (!ObjectId.isValid(moduleId)) { if(!res.headersSent){res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;}
            
            let body = '';
            req.on('data', chunk => { body += chunk.toString(); });
            req.on('end', async () => {
                try {
                    const { progress, score, completed } = JSON.parse(body);
                    const updateData = {
                        userId: new ObjectId(req.user.userId),
                        moduleId: new ObjectId(moduleId),
                        progress: parseInt(progress, 10),
                        lastAccessedAt: new Date()
                    };
                    if (score !== undefined) updateData.score = parseInt(score, 10);
                    if (completed !== undefined) updateData.completed = Boolean(completed);

                    const result = await db.collection('userProgress').findOneAndUpdate(
                        { userId: new ObjectId(req.user.userId), moduleId: new ObjectId(moduleId) },
                        { $set: updateData },
                        { upsert: true, returnDocument: 'after' }
                    );
                    if(!res.headersSent) {res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(result.value));}
                } catch (error) {
                    if(!res.headersSent) {console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error updating progress' }));}
                }
            });
        });
    } else if (parsedUrl.pathname === '/api/user/progress' && req.method === 'GET') { // Get All User Progress
        authenticateToken(req, res, async () => {
            if (!req.user || !req.user.userId) { if(!res.headersSent){res.statusCode = 401; return res.end(JSON.stringify({ message: 'Auth required' }));} return;}
            try {
                const userProgress = await db.collection('userProgress').aggregate([
                    { $match: { userId: new ObjectId(req.user.userId) } },
                    { $lookup: { from: 'modules', localField: 'moduleId', foreignField: '_id', as: 'moduleDetails'}},
                    { $unwind: { path: '$moduleDetails', preserveNullAndEmptyArrays: true } }
                ]).toArray();
                if(!res.headersSent) {res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(userProgress));}
            } catch (error) {
                if(!res.headersSent) {console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching user progress' }));}
            }
        });
    } else if (parsedUrl.pathname.match(/^\/api\/modules\/([a-fA-F0-9]{24})\/progress$/) && req.method === 'GET') { // Get Specific Module Progress
        authenticateToken(req, res, async () => {
            if (!req.user || !req.user.userId) { if(!res.headersSent){res.statusCode = 401; return res.end(JSON.stringify({ message: 'Auth required' }));} return;}
            const moduleId = parsedUrl.pathname.split('/')[3];
            if (!ObjectId.isValid(moduleId)) { if(!res.headersSent){res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;}
            
            try {
                const progressRecord = await db.collection('userProgress').findOne({ userId: new ObjectId(req.user.userId), moduleId: new ObjectId(moduleId) });
                if (!progressRecord) {
                    // Return default progress if none found, or 404
                    if(!res.headersSent) {res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ userId: new ObjectId(req.user.userId), moduleId: new ObjectId(moduleId), progress: 0, score: 0, completed: false, lastAccessedAt: new Date() }));} return;
                }
                if(!res.headersSent) {res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(progressRecord));}
            } catch (error) {
                 if(!res.headersSent) {console.error(error); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching module progress' }));}
            }
        });
    }
    // Other specific routes (e.g., module sub-resources)
    else if (parsedUrl.pathname.startsWith('/api/module/document/')) {
        const moduleId = parsedUrl.pathname.split('/')[3];
        if (!ObjectId.isValid(moduleId)) { if(!res.headersSent){res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;}
        try {
            const module = await db.collection('modules').findOne({ _id: new ObjectId(moduleId) }, { projection: { document: 1 } });
            if (module && module.document) { if(!res.headersSent){res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ document: module.document }));} }
            else { if(!res.headersSent){res.statusCode = 404; res.end(JSON.stringify({ message: 'Document not found' }));} }
        } catch (e) { if(!res.headersSent){console.error(e); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching document' }));} }
    } else if (parsedUrl.pathname.startsWith('/api/module/media/')) {
        const moduleId = parsedUrl.pathname.split('/')[3];
        if (!ObjectId.isValid(moduleId)) { if(!res.headersSent){res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;}
        try {
            const module = await db.collection('modules').findOne({ _id: new ObjectId(moduleId) });
            if (module) {
                const lang = query.lang || 'fr';
                if(!res.headersSent){res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ audio: module[`audio_${lang}`] || module.audio_fr, subtitles: module[`subtitles_${lang}`] || module.subtitles_fr }));}
            } else { if(!res.headersSent){res.statusCode = 404; res.end(JSON.stringify({ message: 'Media not found' }));} }
        } catch (e) { if(!res.headersSent){console.error(e); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching media' }));}}
    } else if (parsedUrl.pathname.startsWith('/api/module/quiz/')) { // Should be /api/modules/:moduleId/quiz
        authenticateToken(req, res, async () => {
            if (!req.user) { if(!res.headersSent){res.statusCode = 401; return res.end(JSON.stringify({ message: 'Auth required' }));} return;}
            const moduleId = parsedUrl.pathname.split('/').pop(); // Assumes /api/module/quiz/ID
            if (!ObjectId.isValid(moduleId)) { if(!res.headersSent){res.statusCode = 400; return res.end(JSON.stringify({ message: 'Invalid module ID' }));} return;}
            try {
                const quiz = await db.collection('quizzes').findOne({ moduleId: new ObjectId(moduleId) });
                if (quiz) { if(!res.headersSent){res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(quiz));}}
                else { if(!res.headersSent){res.statusCode = 404; res.end(JSON.stringify({ message: 'Quiz not found' }));}}
            } catch (e) { if(!res.headersSent){console.error(e); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching quiz' }));}}
        });
    } else if (parsedUrl.pathname.startsWith('/api/translate/')) {
        const text = query.text; const lang = query.lang || 'fr'; let translatedText = text;
        if (lang === 'en') translatedText = `Translated to English: ${text}`;
        else if (lang === 'es') translatedText = `Traducido al español: ${text}`;
        if(!res.headersSent){res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ translatedText }));}
    } else if (parsedUrl.pathname === '/api/statistics' && req.method === 'GET') {
        authenticateToken(req, res, async () => {
            if (!req.user || req.user.role !== 'admin') { if(!res.headersSent){res.statusCode = 403; return res.end(JSON.stringify({ message: 'Access denied' }));} return;}
            try {
                const totalUsers = await db.collection('users').countDocuments(); // Example: count all users
                const totalModules = await db.collection('modules').countDocuments();
                // More complex stats would require more queries or aggregations
                if(!res.headersSent){res.statusCode = 200; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify({ activeUsers: totalUsers, totalModules, averageProgress: 0 }));} // Placeholder for averageProgress
            } catch (e) { if(!res.headersSent){console.error(e); res.statusCode = 500; res.end(JSON.stringify({ message: 'Error fetching stats' }));}}
        });
    }
    else {
      if(!res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ message: 'Endpoint Not Found' }));
      }
    }
  });

  const hostname = '127.0.0.1';
  const port = 3001;

  async function startServer() {
    await connectDB();
    server.listen(port, hostname, () => {
      console.log(`Server running at http://${hostname}:${port}/`);
    });
  }

  startServer();
