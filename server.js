const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const session = require("express-session");
const cors = require("cors");
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
app.get("/", (req, res) => res.sendFile(__dirname + "/index.html"));
app.get("/signup", (req, res) => res.sendFile(__dirname + "/signUp.html"));
app.get("/login", (req, res) => res.sendFile(__dirname + "/login.html"));
app.get("/updateProfile", (req, res) => res.sendFile(__dirname + "/updateProfile.html"));
app.get("/preUpdate", (req, res) => res.sendFile(__dirname + "/preUpdate.html"));
app.get("/existingconditions", (req, res) => res.sendFile(__dirname + "/existingconditions.html"));
app.get("/dashboard", (req, res) => res.sendFile(__dirname + "/dashboard.html"));

// Database Connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: "dbb"
});

db.connect((err) => {
    if (err) {
        console.error("❌ Connection failed:", err);
        return;
    }
    console.log("✅ Connected to database!");

    const createDonorData = `
        CREATE TABLE IF NOT EXISTS donor_data (
            uniqueID INT AUTO_INCREMENT PRIMARY KEY,
            govtID BIGINT NOT NULL UNIQUE CHECK (govtID BETWEEN 100000000000 AND 999999999999),
            name VARCHAR(50),
            email VARCHAR(50) UNIQUE CHECK (email LIKE '%@%.%'),
            pass VARCHAR(255),
            age INT CHECK (age >= 1),
            gender ENUM('Male', 'Female'),
            city ENUM('Mysore', 'Bangalore', 'Chikmagalur', 'Kolar'),
            bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
            kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0,1)),
            liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0,1)),
            lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0,1)),
            intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0,1)),
            pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0,1))
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
            dependantAadhar BIGINT NOT NULL UNIQUE,
            dependantAge INT NOT NULL,
            totalDependants INT NOT NULL,
            healthApproval TINYINT,
            FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
        );
    `;

    db.query(createDonorData, (err) => {
        if (err) console.error("❌ Error creating donor_data table:", err);
        else console.log("✅ Table donor_data ensured.");
    });

    db.query(createDonorHealth, (err) => {
        if (err) console.error("❌ Error creating donor_health_dependants table:", err);
        else console.log("✅ Table donor_health_dependants ensured.");
    });
});

// Registration Route
app.post("/submit", (req, res) => {
    const { name, email, govtID, pass, age, gender, city, bloodGroup, organ } = req.body;
    const kidney = organ.includes("Kidney") ? 1 : 0;
    const liver = organ.includes("Liver") ? 1 : 0;
    const lung = organ.includes("Lung") ? 1 : 0;
    const intestine = organ.includes("Intestine") ? 1 : 0;
    const pancreas = organ.includes("Pancreas") ? 1 : 0;

    const sql = `
        INSERT INTO donor_data (name, email, govtID, pass, age, gender, city, bloodGroup, kidney, liver, lung, intestine, pancreas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const values = [name, email, govtID, pass, age, gender, city, bloodGroup, kidney, liver, lung, intestine, pancreas];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.send(`<script>alert("❌ Government ID or Email already registered."); window.history.back();</script>`);
            }
            console.error("❌ Database Error:", err);
            return res.status(500).send("Internal Server Error");
        }

        req.session.uniqueID = result.insertId;
        res.send(`<script>alert("✅ Registered! Your Unique Donor ID is: ${result.insertId}"); window.location.href = "/existingconditions";</script>`);
    });
});

// Precondition Submission
app.post("/submitPrecondition", (req, res) => {
    const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants } = req.body;
    const healthApproval = req.body.healthApproval ? 1 : 0;

    const sql = `
        INSERT INTO donor_health_dependants (uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval], (err) => {
        if (err) {
            console.error("❌ Error inserting precondition data:", err);
            return res.status(500).send("Internal Server Error");
        }
        res.redirect("/");
    });
});

// Login Check
app.post("/loginCheck", (req, res) => {
    const { uniqueID, pass } = req.body;
    const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

    db.query(sql, [uniqueID, pass], (err, result) => {
        if (err) return res.status(500).send("Internal Server Error");
        if (result.length > 0) return res.redirect("/dashboard");
        res.status(401).send("❌ Invalid Unique ID or Password");
    });
});

// Dashboard Filtered Content
app.get("/dashboardContent", (req, res) => {
    const { organ, bloodGroup, city } = req.query;

    let sql = `
        SELECT donor_data.uniqueID, donor_data.email,
               donor_health_dependants.totalDependants, donor_health_dependants.dependantAge
        FROM donor_data
        INNER JOIN donor_health_dependants ON donor_data.uniqueID = donor_health_dependants.uniqueID
        WHERE donor_data.bloodGroup = ? AND donor_data.city = ?
    `;
    let filters = [bloodGroup, city];

    if (organ) sql += ` AND donor_data.${organ} = 1`;

    db.query(sql, filters, (err, result) => {
        if (err) return res.status(500).send("Internal Server Error");
        res.render("dashboardContent", { donors: result });
    });
});
app.post("/preUpdateCheck", (req, res) => {
    const { uniqueID, pass } = req.body;
    const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";
  
    db.query(sql, [uniqueID, pass], (err, result) => {
      if (err) {
        console.error("Database error:", err);
        return res.status(500).json({ message: "Internal server error!" });
      }
      if (result.length > 0) {
        // Set the session uniqueID and pass it via the URL
        req.session.uniqueID = uniqueID;
        res.redirect(`/updateProfile?uniqueID=${uniqueID}`); // Pass Unique ID to frontend
      } else {
        res.status(401).json({ message: "Invalid credentials!" });
      }
    });
  });
  


app.post("/confirmUpdate1", (req, res) => {
    const { uniqueID, name, email, govtID, pass, age, gender, city, bloodGroup } = req.body;
    if (!uniqueID)
      return res.status(400).json({ message: "Unique ID is required!" });
  
    // Handle the "organ" field which may be a string or an array.
    let organ = req.body.organ;
    if (!Array.isArray(organ)) {
      organ = organ ? [organ] : [];
    }
    const kidney = organ.includes("Kidney") ? 1 : 0;
    const liver = organ.includes("Liver") ? 1 : 0;
    const lung = organ.includes("Lung") ? 1 : 0;
    const intestine = organ.includes("Intestine") ? 1 : 0;
    const pancreas = organ.includes("Pancreas") ? 1 : 0;
  
    const query = `
      UPDATE donor_data
      SET name = ?, email = ?, govtID = ?, pass = ?, age = ?, gender = ?, city = ?, bloodGroup = ?,
          kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
      WHERE uniqueID = ?
    `;
    const values = [
      name, email, govtID, pass, age, gender, city, bloodGroup,
      kidney, liver, lung, intestine, pancreas, uniqueID
    ];
  
    db.query(query, values, (err, result) => {
      if (err) {
        console.error("Error updating user:", err);
        // Debug info (remove or sanitize in production)
        return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
      }
      if (result.affectedRows > 0) {
        // Instead of sending a JSON response, redirect the user to the next step.
        res.redirect("/updatePreconditionsAndDependants?uniqueID=" + uniqueID);
      } else {
        res.status(404).json({ message: "User not found!" });
      }
    });
  });


  app.post("/confirmUpdate2", (req, res) => {
    const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval } = req.body;
    
    if (!uniqueID) {
      return res.status(400).json({ message: "Unique ID is required!" });
    }
    
    // Convert the values from the form to numeric types as needed.
    const diabetesVal = diabetes ? Number(diabetes) : 0;
    const bpConditionVal = bp_condition ? Number(bp_condition) : 0;
    const obeseVal = obese ? Number(obese) : 0;
    const cardiacSurgeryVal = cardiac_surgery ? Number(cardiac_surgery) : 0;
    const healthApprovalVal = healthApproval ? Number(healthApproval) : 0;
    
    const sql = `
      INSERT INTO donor_health_dependants (
        uniqueID,
        diabetes,
        bp_condition,
        obese,
        cardiac_surgery,
        dependantName,
        dependantAadhar,
        dependantAge,
        totalDependants,
        healthApproval
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      diabetesVal,
      bpConditionVal,
      obeseVal,
      cardiacSurgeryVal,
      dependantName,
      dependantAadhar,
      dependantAge,
      totalDependants,
      healthApprovalVal
    ];
    
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating preconditions and dependants:", err);
        return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
      }
      // On success, alert the user and redirect to the index page.
      res.send(`<script>
        alert("Preconditions & Dependants updated successfully for UniqueID: ${uniqueID}");
        window.location.href = "/";
      </script>`);
    });
  });
  
  app.get("/updatePreconditionsAndDependants", (req, res) => {
    const uniqueID = req.query.uniqueID;
  
    if (!uniqueID) {
      return res.status(400).send("Unique ID is required!");
    }
  
    const query = "SELECT * FROM donor_health_dependants WHERE uniqueID = ?";
    db.query(query, [uniqueID], (err, results) => {
      if (err) {
        console.error("Error fetching health data:", err);
        return res.status(500).send("Internal server error!");
      }
  
      if (results.length > 0) {     
        // Send the static HTML file.
        res.sendFile(__dirname + "/updatePreconditionsAndDependants.html");
      } else {
        res.status(404).send("No health data found for this Unique ID!");
      }
    });
  });
  
  
// API for fetching session UniqueID
app.get("/getUniqueID", (req, res) => {
    if (req.session.uniqueID) res.json({ uniqueID: req.session.uniqueID });
    else res.status(400).json({ error: "Unique ID not found in session" });
});

// Get user data by UniqueID
app.get("/getUser/:uniqueID", (req, res) => {
    const uniqueID = req.params.uniqueID;
    const query = "SELECT * FROM donor_data WHERE uniqueID = ?";

    db.query(query, [uniqueID], (err, result) => {
        if (err) return res.status(500).json({ message: "Internal server error!" });

        if (result.length > 0) {
            res.json(result[0]); // Send user data
        } else {
            res.status(404).json({ message: "User not found!" });
        }
    });
});

app.post("/confirmPreconditionsDependants", (req, res) => {
    // Destructure the posted fields – adjust names as needed to match your form fields.
    const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval } = req.body;
    
    // We'll use INSERT ... ON DUPLICATE KEY UPDATE so that if a record exists, it is updated.
    const sql = `
      INSERT INTO donor_health_dependants (
        uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      diabetes ? 1 : 0,
      bp_condition ? 1 : 0,
      obese ? 1 : 0,
      cardiac_surgery ? 1 : 0,
      dependantName,
      dependantAadhar,
      dependantAge,
      totalDependants,
      healthApproval ? 1 : 0
    ];
  
    db.query(sql, values, (err, result) => {
      if (err) {
        console.error("Error updating preconditions and dependants:", err);
        return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
      }
      // Instead of rendering a view, alert the user and redirect to the index page.
      res.send(`<script>
        alert("Data updated successfully for UniqueID: ${uniqueID}");
        window.location.href = "/";
      </script>`);
    });
  });

// Start server
app.listen(3000, () => {
    console.log("🚀 Server running at http://localhost:3000");
});
