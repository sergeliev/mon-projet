// server.js (MIGRATION vers MySQL2)
import express from "express";
import cors from "cors";
// Changement: Remplacer 'sqlite3' et 'sqlite' par 'mysql2'
import mysql from "mysql2/promise"; // Nous utilisons le support des promesses de mysql2
import bcrypt from "bcrypt";
import multer from "multer";
import path from "path";
import fs from "fs";
import dotenv from 'dotenv';
dotenv.config();

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- Configuration de la base de données MySQL ---
// Vous DEVEZ remplacer ces valeurs par vos propres identifiants MySQL
const dbConfig = {
  host: "database-1-instance-1.c8bimgau2pti.us-east-1.rds.amazonaws.com", // ou l'adresse IP de votre serveur MySQL
  user: "root",      // Votre nom d'utilisateur MySQL
  password: "sternosol", // VOTRE mot de passe
  database: "sternosol", // Le nom de la base de données (elle doit exister)
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
};

// Utilisation d'un pool de connexions pour plus de performance
let dbPool;

// --- Multer config (pas de changement) ---
const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const safeName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, safeName);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "application/pdf", "image/jpg"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Type de fichier non autorisé"));
  },
});

// Initialisation de la base de données et des tables
(async () => {
  try {
    // 1. Création du pool de connexions
    dbPool = mysql.createPool(dbConfig);
    console.log("🗄 MySQL Pool créé.");

    // 2. Vérification des tables (Syntaxe adaptée pour MySQL)
    // NOTE: INTEGER PRIMARY KEY AUTOINCREMENT devient INT PRIMARY KEY AUTO_INCREMENT
    // NOTE: REAL devient FLOAT ou DECIMAL
    // NOTE: TEXT devient VARCHAR(255) ou TEXT
    const connection = await dbPool.getConnection();
    
    // table users
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS users (
        id INT PRIMARY KEY AUTO_INCREMENT, 
        nom VARCHAR(255),
        prenom VARCHAR(255),
        email VARCHAR(255) UNIQUE,
        password VARCHAR(255),
        telephone VARCHAR(255),
        banque VARCHAR(255),
        dateInscription DATE,
        role VARCHAR(255)
      )
    `);
    // table groupes
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS groupes (
        id INT PRIMARY KEY AUTO_INCREMENT,
        nomSol VARCHAR(255),
        montantParPeriode DECIMAL(10, 2),
        frequence INT,
        statut VARCHAR(255),
        createdBy VARCHAR(255),
        nombreParticipants INT,
        dateCreation DATE
      )
    `);
    // table participant
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS participants (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT,
        groupeId INT,
        dateParticipation DATE,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(groupeId) REFERENCES groupes(id)
      )
    `);
    // table payments
    await connection.execute(`
      CREATE TABLE IF NOT EXISTS payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        userId INT,
        groupeId INT,
        periodNumber INT,
        filePath VARCHAR(255),
        status VARCHAR(50) DEFAULT 'en_attente',
        createdAt DATE,
        FOREIGN KEY(userId) REFERENCES users(id),
        FOREIGN KEY(groupeId) REFERENCES groupes(id)
      )
    `);
    
    connection.release(); // Relâcher la connexion au pool
    console.log("📚 MySQL Database initialized");

  } catch (err) {
    console.error("❌ Database initialization error:", err.message);
    process.exit(1);
  }
})();

// Fonction utilitaire pour exécuter les requêtes
// (Simule db.run, db.get, db.all de sqlite)
const query = async (sql, params = []) => {
  const [rows] = await dbPool.execute(sql, params);
  return rows;
};

// -----------------------------
// ROUTES
// -----------------------------

// Inscription -> retourne userId (result.lastID)
app.post("/api/inscription", async (req, res) => {
  const { nom, prenom, email, password, telephone, banque, dateInscription, role } = req.body;
  try {
    const hashed = await bcrypt.hash(password, 10);
    // db.run -> query (et on extrait lastID de l'objet)
    const result = await query(
      `INSERT INTO users (nom, prenom, email, password, telephone, banque, dateInscription, role)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [nom, prenom, email, hashed, telephone, banque, dateInscription, role]
    );

    console.log("New user:", email);
    // La propriété est insertId en MySQL, pas lastID
    res.status(200).json({ message: "OK", userId: result.insertId }); 
  } catch (err) {
    console.error("Inscription error:", err.message);
    // Gestion des erreurs d'unicité (DUPLICATE ENTRY pour email)
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: "Cet email est déjà utilisé." });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login
app.post("/api/login", async (req, res) => {
  const { email, password } = req.body;
  try {
    // db.get -> query (renvoie un tableau, on prend le premier élément)
    const users = await query("SELECT * FROM users WHERE email = ?", [email]);
    const user = users[0]; // MySQL renvoie un tableau

    if (!user) return res.status(404).json({ error: "Utilisateur non trouvé" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Mot de passe incorrect" });

    res.json({
      message: "OK",
      user: {
        id: user.id,
        nom: user.nom,
        prenom: user.prenom,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    console.error("Login error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Create groupe
app.post("/api/groupes", async (req, res) => {
  try {
    const { nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants } = req.body;
    if (!nomSol || montantParPeriode == null || frequence == null || !statut || !createdBy || nombreParticipants == null) {
      return res.status(400).json({ error: "Tous les champs sont obligatoires." });
    }
    const dateCreation = new Date().toISOString().split("T")[0];
    const result = await query(
      `INSERT INTO groupes (nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants, dateCreation)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nomSol, montantParPeriode, frequence, statut, createdBy, nombreParticipants, dateCreation]
    );
    // Utilisation de insertId
    res.status(201).json({ message: "Groupe créé", groupId: result.insertId });
  } catch (err) {
    console.error("Create groupe error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get all groupes
app.get("/api/groupes", async (req, res) => {
  try {
    // db.all -> query (renvoie le tableau directement)
    const rows = await query("SELECT * FROM groupes ORDER BY id DESC");
    res.json(rows);
  } catch (err) {
    console.error("GET groupes error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get groupe by id
app.get("/api/groupes/:id", async (req, res) => {
  try {
    // db.get -> query (renvoie un tableau, on prend le premier élément)
    const groupes = await query("SELECT * FROM groupes WHERE id = ?", [req.params.id]);
    const g = groupes[0];
    if (!g) return res.status(404).json({ error: "Groupe introuvable" });
    res.json(g);
  } catch (err) {
    console.error("GET groupe:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Participate (userId + groupeId)
app.post("/api/participer", async (req, res) => {
  try {
    const { userId, groupeId } = req.body;
    if (!userId || !groupeId) return res.status(400).json({ error: "userId et groupeId requis." });

    // Vérifications (doivent être mises à jour pour utiliser query() et prendre [0])
    const [user] = await query("SELECT id FROM users WHERE id = ?", [userId]);
    if (!user) return res.status(404).json({ error: "Utilisateur introuvable." });

    const [groupe] = await query("SELECT id FROM groupes WHERE id = ?", [groupeId]);
    if (!groupe) return res.status(404).json({ error: "Groupe introuvable." });

    const exists = await query("SELECT * FROM participants WHERE userId = ? AND groupeId = ?", [userId, groupeId]);
    if (exists.length > 0) return res.status(400).json({ error: "Déjà inscrit." });

    const dateParticipation = new Date().toISOString().split("T")[0];
    const result = await query("INSERT INTO participants (userId, groupeId, dateParticipation) VALUES (?, ?, ?)",
      [userId, groupeId, dateParticipation]);

    // Utilisation de insertId
    res.status(201).json({ message: "Participation enregistrée", participationId: result.insertId });
  } catch (err) {
    console.error("Participer error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Get group for user (via participants)
app.get("/api/user/group/:userId", async (req, res) => {
  try {
    const rows = await query(
      `SELECT g.*
       FROM participants p
       JOIN groupes g ON g.id = p.groupeId  
       WHERE p.userId = ? LIMIT 1`,
      [req.params.userId]
    );
    const row = rows[0]; // MySQL renvoie un tableau
    if (!row) return res.status(404).json({ error: "Aucun groupe trouvé pour cet utilisateur" });
    res.json(row);
  } catch (err) {
    console.error("GET user/group error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Payments upload + status endpoints
app.post("/api/paiement/upload", upload.single("receipt"), async (req, res) => {
  try {
    const { userId, groupeId, periodNumber } = req.body;
    if (!req.file) return res.status(400).json({ error: "Aucun fichier reçu." });
    if (!userId || !groupeId || !periodNumber) return res.status(400).json({ error: "Champs manquants." });

    const [groupe] = await query("SELECT * FROM groupes WHERE id = ?", [groupeId]);
    if (!groupe) return res.status(404).json({ error: "Groupe introuvable." });

    const periodNum = Number(periodNumber);
    if (isNaN(periodNum) || periodNum < 1 || periodNum > Number(groupe.frequence)) {
      return res.status(400).json({ error: "Numéro de période invalide." });
    }

    const exists = await query("SELECT * FROM payments WHERE userId = ? AND groupeId = ? AND periodNumber = ?",
      [userId, groupeId, periodNum]);
    if (exists.length > 0) return res.status(400).json({ error: "Paiement déjà effectué." });

    const filename = req.file.filename;
    const createdAt = new Date().toISOString().split("T")[0];
    const result = await query(
      `INSERT INTO payments (userId, groupeId, periodNumber, filePath, status, createdAt)
       VALUES (?, ?, ?, ?, 'en_attente', ?)`,
      [userId, groupeId, periodNum, filename, createdAt]
    );

    // Utilisation de insertId
    res.status(201).json({ message: "Reçu uploadé", paymentId: result.insertId, filePath: filename });
  } catch (err) {
    console.error("Upload paiement error:", err);
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/paiement/status/:userId/:groupeId", async (req, res) => {
  try {
    const rows = await query(
      "SELECT periodNumber, status, filePath FROM payments WHERE userId = ? AND groupeId = ? ORDER BY periodNumber ASC",
      [req.params.userId, req.params.groupeId]
    );
    res.json(rows);
  } catch (err) {
    console.error("GET paiement status error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

app.use("/uploads", express.static(uploadsDir));

app.listen(PORT, () => console.log(`Server on http://localhost:${PORT}`));
