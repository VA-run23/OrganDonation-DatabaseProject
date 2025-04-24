//Try to implement donor and receiver and seperately


const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const app = express();

// Middleware Setup
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
}));

app.set("view engine", "ejs");
app.set("views", "./views");

// Serve static HTML pages
app.get("/", (req, res) => res.sendFile(path.join(__dirname, "/index.html")));

app.get("/signup", (req, res) => res.sendFile(path.join(__dirname, "/signup.html")));

app.get("/login", (req, res) => res.sendFile(path.join(__dirname, "/login.html")));

app.get("/updateProfile", (req, res) => res.sendFile(path.join(__dirname, "/updateProfile.html")));

app.get("/preUpdate", (req, res) => res.sendFile(path.join(__dirname, "/preUpdate.html")));

app.get("/existingconditions", (req, res) => res.sendFile(path.join(__dirname, "/existingconditions.html")));

app.get("/dashboard", (req, res) => res.sendFile(path.join(__dirname, "/dashboard.html")));


// Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "dbb"
});

db.connect((err) => {
  if (err) return console.error("Connection failed:", err);
  console.log(" Connected to database!");

  const createDonorData = `
CREATE TABLE IF NOT EXISTS donor_data (
  uniqueID INT AUTO_INCREMENT PRIMARY KEY,
  govtID BIGINT NOT NULL UNIQUE CHECK (govtID BETWEEN 100000000000 AND 999999999999),
  name VARCHAR(50),
  email VARCHAR(50) UNIQUE CHECK (email LIKE '%@%.%'),
  pass VARCHAR(255),
  age INT CHECK (age >= 18),
  gender ENUM('Male', 'Female'),
  city ENUM('Mysore', 'Bangalore', 'Chikmagalur', 'Kolar'),
  bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0,1)),
  liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0,1)),
  lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0,1)),
  intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0,1)),
  pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0,1)),
  lastUpdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
  `;

  const createDonorHealth = `
    CREATE TABLE IF NOT EXISTS donor_health_dependants (
      uniqueID INT PRIMARY KEY,
      diabetes TINYINT,
      bp_condition TINYINT,
      obese TINYINT,
      cardiac_surgery TINYINT,
      dependantName VARCHAR(255) NOT NULL,
      dependantAadhar BIGINT NOT NULL UNIQUE  CHECK (dependantAadhar BETWEEN 100000000000 AND 999999999999),
      dependantAge INT NOT NULL,
      totalDependants INT NOT NULL,
      healthApproval TINYINT,
      FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
    );
  `;

  db.query(createDonorData, (err) =>
    err ? console.error("Error creating donor_data:", err) : console.log(" donor_data table ensured.")
  );

  db.query(createDonorHealth, (err) =>
    err ? console.error("Error creating donor_health_dependants:", err) : console.log(" donor_health_dependants table ensured.")
  );
});

// Routes

// Registration
app.post("/submit", (req, res) => {
  const { name, email, govtID, pass, age, gender, city, bloodGroup, organ } = req.body;
    // Validate Government ID
    if (govtID < 100000000000 || govtID > 999999999999) {
      return res.send(`<script>alert("Government ID must be a 12-digit number."); window.history.back();</script>`);
    }
  
    // Validate Age
    if (age < 18) {
      return res.send(`<script>alert("Age must be 18 or older."); window.history.back();</script>`);
    }
  
  const organs = ["Kidney", "Liver", "Lung", "Intestine", "Pancreas"];
  const organFlags = organs.map(o => organ.includes(o) ? 1 : 0);

  const sql = `
    INSERT INTO donor_data (name, email, govtID, pass, age, gender, city, bloodGroup, kidney, liver, lung, intestine, pancreas)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const values = [name, email, govtID, pass, age, gender, city, bloodGroup, ...organFlags];

  db.query(sql, values, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.send(`<script>alert("Government ID or Email already registered."); window.history.back();</script>`);
      }
      console.error("Database Error:", err);
      return res.status(500).send("Internal Server Error");
    }
    req.session.uniqueID = result.insertId;
    res.send(`<script>alert("✅ Registered! Your Unique Donor ID is: ${result.insertId}"); window.location.href = "/existingconditions";</script>`);
  });
});

// Submit Precondition
app.post("/submitPrecondition", (req, res) => {
  const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants } = req.body;
  const healthApproval = req.body.healthApproval ? 1 : 0;

  const sql = `
    INSERT INTO donor_health_dependants (uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval], (err) => {
    if (err) {
      if (err.code === 'ER_DUP_ENTRY') { 
        res.send(`<script>alert('The dependant Aadhar already exists'); window.history.back();</script>`);
      } else {
        res.send(`<script>alert('Internal Server Error'); window.history.back();</script>`);
      }
    } else {
      res.redirect("/");
    }
  });
});

// Login Check
app.post("/loginCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
    if (err) return res.status(500).send("Internal Server Error");
    if (result.length > 0) return res.redirect("/dashboard");
    res.status(401).send("Invalid Unique ID or Password");
  });
});

// Dashboard Filter
app.get("/dashboardContent", (req, res) => {
  const { organ, bloodGroup, city } = req.query;

  //    SELECT donor_data.uniqueID, donor_data.email,donor_data.lastUpdate
  let sql = `
    SELECT donor_data.uniqueID, donor_data.email,donor_data.lastUpdate,
           donor_health_dependants.totalDependants, donor_health_dependants.dependantAge
    FROM donor_data
    INNER JOIN donor_health_dependants ON donor_data.uniqueID = donor_health_dependants.uniqueID
    WHERE donor_data.bloodGroup = ? AND donor_data.city = ?
  `;
  const filters = [bloodGroup, city];
  if (organ) sql += ` AND donor_data.${organ} = 1`;
  sql += ` ORDER BY donor_data.lastUpdate DESC`;

  db.query(sql, filters, (err, result) => {
    if (err) return res.status(500).send("Internal Server Error");
    res.render("dashboardContent", { donors: result });
  });
});

// Pre-update Check
app.post("/preUpdateCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
    if (err) return res.status(500).json({ message: "Internal server error!" });
    if (result.length > 0) {
      req.session.uniqueID = uniqueID;
      res.redirect(`/updateProfile?uniqueID=${uniqueID}`);
    } else {
      res.status(401).json({ message: "Invalid credentials!" });
    }
  });
});

// Confirm Update Step 1
app.post("/confirmUpdate1", (req, res) => {
  const { uniqueID, name, email, govtID, pass, age, gender, city, bloodGroup, organ } = req.body;

  // Ensure `organ` is properly defined and an array
  const validOrgans = Array.isArray(organ) ? organ : [];
  const organs = ["Kidney", "Liver", "Lung", "Intestine", "Pancreas"];
  const organFlags = organs.map(o => validOrgans.includes(o) ? 1 : 0);

  // Combined query to handle deselection and selection in a single step
  const query = `
    UPDATE donor_data
    SET name = ?, email = ?, govtID = ?, pass = ?, age = ?, gender = ?, city = ?, bloodGroup = ?,
        kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
    WHERE uniqueID = ?
  `;
  const values = [name, email, govtID, pass, age, gender, city, bloodGroup, ...organFlags, uniqueID];

  db.query(query, values, (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
    }
    if (result.affectedRows > 0) {
      res.redirect(`/updatePreconditionsAndDependants?uniqueID=${uniqueID}`);
    } else {
      res.status(404).json({ message: "User not found!" });
    }
  });
});


// Confirm Update Step 2
app.post("/confirmUpdate2", (req, res) => {
  const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval } = req.body;

  const sql = `
    INSERT INTO donor_health_dependants (
      uniqueID, diabetes, bp_condition, obese, cardiac_surgery,
      dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      diabetes = VALUES(diabetes),
      bp_condition = VALUES(bp_condition),
      obese = VALUES(obese),
      cardiac_surgery = VALUES(cardiac_surgery),
      dependantName = VALUES(dependantName),
      dependantAadhar = VALUES(dependantAadhar),
      dependantAge = VALUES(dependantAge),
      totalDependants = VALUES(totalDependants),
      healthApproval = VALUES(healthApproval)
  `;

  const values = [
    uniqueID,
    Number(diabetes || 0),
    Number(bp_condition || 0),
    Number(obese || 0),
    Number(cardiac_surgery || 0),
    dependantName,
    dependantAadhar,
    dependantAge,
    totalDependants,
    (healthApproval === "on" || healthApproval === "1") ? 1 : 0
  ];

  db.query(sql, values, (err) => {
    if (err) return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
    res.send(`<script>alert("Preconditions & Dependants updated successfully for UniqueID: ${uniqueID}"); window.location.href = "/";</script>`);
  });
});

// Get unique ID from session
app.get("/getUniqueID", (req, res) => {
  if (req.session.uniqueID) res.json({ uniqueID: req.session.uniqueID });
  else res.status(400).json({ error: "Unique ID not found in session" });
});

// Get user data
app.get("/getUser/:uniqueID", (req, res) => {
  const { uniqueID } = req.params;
  const query = "SELECT * FROM donor_data WHERE uniqueID = ?";

  db.query(query, [uniqueID], (err, result) => {
    if (err) return res.status(500).json({ message: "Internal server error!" });
    if (result.length > 0) res.json(result[0]);
    else res.status(404).json({ message: "User not found!" });
  });
});

// Serve form for preconditions
app.get("/updatePreconditionsAndDependants", (req, res) => {
  const { uniqueID } = req.query;
  if (!uniqueID) return res.status(400).send("Unique ID is required!");
  res.sendFile(path.join(__dirname, "updatePreconditionsAndDependants.html"));
});

// Fetch precondition data
app.get("/getPrecondition/:uniqueID", (req, res) => {
  const { uniqueID } = req.params;
  if (!uniqueID) return res.status(400).json({ error: "Unique ID is required!" });

  const query = "SELECT * FROM donor_health_dependants WHERE uniqueID = ?";
  db.query(query, [uniqueID], (err, results) => {
    if (err) return res.status(500).json({ error: "Internal server error!" });
    if (results.length > 0) res.json(results[0]);
    else res.status(404).json({ message: "No data found for uniqueID" });
  });
});

// DELETE USER ENDPOINT
app.post("/deleteUser", (req, res) => {
  const uniqueID = req.body.uniqueID;
  
  if (!uniqueID) {
    return res.status(400).json({ message: "Unique ID is required to delete user!" });
  }

  const deleteQuery = "DELETE FROM donor_data WHERE uniqueID = ?";
  db.query(deleteQuery, [uniqueID], (err, result) => {
    if (err) {
      console.error("Error deleting user:", err);
      return res.status(500).json({ message: "Internal server error!" });
    }
    if (result.affectedRows > 0) {
      res.send(`
        <script>
          alert('User deleted successfully.');
          window.location.href = '/'; // Redirect to index page
        </script>
      `);
    } else {
      res.send(`
        <script>
          alert('User not found or could not be deleted.');
          window.location.href = '/'; // Redirect to index page
        </script>
      `);
    }
    
  });
});


// Start server
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});
