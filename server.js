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


app.use('/images', express.static('public/images'));
app.use('/videos', express.static('public/videos'));



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

const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD,
  database: "dbb",
});

db.connect((err) => {
  if (err) return console.error("Connection failed:", err);
  console.log("Connected to database!");

  const createDonorData = `
CREATE TABLE IF NOT EXISTS user_data (
  uniqueID INT AUTO_INCREMENT PRIMARY KEY,
  govtID BIGINT NOT NULL UNIQUE CHECK (govtID BETWEEN 100000000000 AND 999999999999),
  name VARCHAR(50),
  email VARCHAR(50) UNIQUE CHECK (email LIKE '%@%.%'),
  pass VARCHAR(255),
  age INT CHECK (age >= 18),
  gender ENUM('Male', 'Female'),
  city ENUM('Mysore', 'Bangalore', 'Chikmagalur', 'Kolar'),
  bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
  lastUpdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
  `;


  const createTransplantedOrgans = `
CREATE TABLE IF NOT EXISTS transplanted_organs (
  organID INT AUTO_INCREMENT PRIMARY KEY,
  uniqueID INT NOT NULL,
  kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0, 1)),
  liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0, 1)),
  lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0, 1)),
  intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0, 1)),
  pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0, 1)),
  FOREIGN KEY (uniqueID) REFERENCES user_data(uniqueID) ON DELETE CASCADE
);
`;

  const createDonorOrgans = `
CREATE TABLE IF NOT EXISTS donor_organs (
  organID INT AUTO_INCREMENT PRIMARY KEY,
  uniqueID INT NOT NULL,
  kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0, 1)),
  liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0, 1)),
  lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0, 1)),
  intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0, 1)),
  pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0, 1)),
  FOREIGN KEY (uniqueID) REFERENCES user_data(uniqueID) ON DELETE CASCADE
);
  `;


  const createDonorHealth = `
CREATE TABLE IF NOT EXISTS userHealth_Dependants (
  uniqueID INT PRIMARY KEY,
  diabetes TINYINT,
  bp_condition TINYINT,
  obese TINYINT,
  cardiac_surgery TINYINT,
  dependantName VARCHAR(255) NOT NULL,
  dependantAadhar BIGINT NOT NULL UNIQUE CHECK (dependantAadhar BETWEEN 100000000000 AND 999999999999),
  dependantAge INT NOT NULL,
  totalDependants INT NOT NULL,
  healthApproval TINYINT,
  FOREIGN KEY (uniqueID) REFERENCES user_data(uniqueID) ON DELETE CASCADE
);
  `;

  db.query(createDonorData, (err) =>
    err 
      ? console.error("Error creating user_data:", err.message) 
      : console.log(`[${new Date().toISOString()}] user_data table ensured.`)
  );
  
  db.query(createTransplantedOrgans, (err) => {
    err 
      ? console.error("Error creating transplanted_organs:", err.message) 
      : console.log(`[${new Date().toISOString()}] transplanted_organs table ensured.`);
  });
  
  db.query(createDonorOrgans, (err) =>
    err 
      ? console.error("Error creating donor_organs:", err.message) 
      : console.log(`[${new Date().toISOString()}] donor_organs table ensured.`)
  );
  
  db.query(createDonorHealth, (err) =>
    err 
      ? console.error("Error creating userHealth_Dependants:", err.message) 
      : console.log(`[${new Date().toISOString()}] userHealth_Dependants table ensured.`)
  );
  
});

// Routes
// Registration
app.post("/submit", (req, res) => {
  const { 
    name, 
    email, 
    govtID, 
    pass, 
    age, 
    gender, 
    city, 
    bloodGroup, 
    donatedOrgans, 
    transplantedOrgans 
  } = req.body;

  // Validate Government ID
  if (govtID < 100000000000 || govtID > 999999999999) {
    return res.send(`<script>alert("Government ID must be a 12-digit number."); window.history.back();</script>`);
  }

  // Validate Age
  if (age < 18) {
    return res.send(`<script>alert("Age must be 18 or older."); window.history.back();</script>`);
  }
  if (age > 80) {
    return res.send(`<script>alert("Age must be 80 or below. You are not eligible to donate any organs as it may harm the donor."); window.history.back();</script>`);
  }

  // Ensure donatedOrgans and transplantedOrgans are arrays.
  // If a single checkbox is checked, it might come as a string; convert it to an array.
  const safeDonatedOrgans = donatedOrgans
    ? (Array.isArray(donatedOrgans) ? donatedOrgans : [donatedOrgans])
    : [];
  const safeTransplantedOrgans = transplantedOrgans
    ? (Array.isArray(transplantedOrgans) ? transplantedOrgans : [transplantedOrgans])
    : [];

  // Define the complete list of organs.
  const organs = ["Kidney", "Liver", "Lung", "Intestine", "Pancreas"];

  // Create flags: 1 if the organ is selected, 0 otherwise.
  const donatedFlags = organs.map(o => safeDonatedOrgans.includes(o) ? 1 : 0);
  const transplantedFlags = organs.map(o => safeTransplantedOrgans.includes(o) ? 1 : 0);

  // Debug logging (can be removed in production)
  console.log("Safe Donated Organs:", safeDonatedOrgans);
  console.log("Safe Transplanted Organs:", safeTransplantedOrgans);
  console.log("Donated Flags:", donatedFlags);
  console.log("Transplanted Flags:", transplantedFlags);

  // Check for conflict: if an organ is both marked as transplanted and as donated.
  const conflictOrgans = organs.filter((o, index) => transplantedFlags[index] === 1 && donatedFlags[index] === 1);
  
  // Debug logging for conflicts
  console.log("Conflict Organs:", conflictOrgans);

  if (conflictOrgans.length > 0) {
    return res.send(`<script>alert("Conflict detected: You cannot donate transplanted organs (${conflictOrgans.join(", ")})."); window.history.back();</script>`);
  }

  //   // Check for conflict: if an organ is both marked as transplanted and as donated.
  // const conflictOrgans = organs.filter((o, index) => transplantedFlags[index] === 1 && donatedFlags[index] === 1);
  
  // // Debug logging for conflicts
  // console.log("Conflict Organs:", conflictOrgans);

  // if (conflictOrgans.length > 0) {
  //   return res.send(`<script>alert("Conflict detected: You cannot donate transplanted organs (${conflictOrgans.join(", ")})."); window.history.back();</script>`);
  // }

  // // Check if more than 2 transplanted organs are selected
  // const transplantedCount = transplantedFlags.reduce((sum, val) => sum + val, 0);
  // if (transplantedCount > 2) {
  //   return res.send(`<script>alert("You cannot register: More than two transplanted organs indicates poor health."); window.history.back();</script>`);
  // }

  // Check if more than 3 organs are selected for donation
  const donatedCount = donatedFlags.reduce((sum, val) => sum + val, 0);
  if (donatedCount > 3) {
    return res.send(`<script>alert("Donating more than three organs can be harmful. Please select fewer organs."); window.history.back();</script>`);
  }


  // Insert Donor Data into user_data table
  const dataQuery = `
    INSERT INTO user_data (name, email, govtID, pass, age, gender, city, bloodGroup)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;
  const dataValues = [name, email, govtID, pass, age, gender, city, bloodGroup];

  db.query(dataQuery, dataValues, (err, result) => {
    if (err) {
      if (err.code === "ER_DUP_ENTRY") {
        return res.send(`<script>alert("Government ID or Email already registered."); window.history.back();</script>`);
      }
      console.error("Database Error:", err);
      return res.status(500).send("Internal Server Error");
    }

    const uniqueID = result.insertId;

    // Insert Donated Organs into donor_organs table
    const donatedOrgansQuery = `
      INSERT INTO donor_organs (uniqueID, kidney, liver, lung, intestine, pancreas)
      VALUES (?, ?, ?, ?, ?, ?)
    `;
    const donatedOrgansValues = [uniqueID, ...donatedFlags];

    db.query(donatedOrgansQuery, donatedOrgansValues, (donatedErr) => {
      if (donatedErr) {
        console.error("Donor Organs Error:", donatedErr);
        return res.status(500).send("Internal Server Error");
      }

      // Insert Transplanted Organs into transplanted_organs table
      const transplantedOrgansQuery = `
        INSERT INTO transplanted_organs (uniqueID, kidney, liver, lung, intestine, pancreas)
        VALUES (?, ?, ?, ?, ?, ?)
      `;
      const transplantedOrgansValues = [uniqueID, ...transplantedFlags];

      db.query(transplantedOrgansQuery, transplantedOrgansValues, (transplantedErr) => {
        if (transplantedErr) {
          console.error("Transplanted Organs Error:", transplantedErr);
          return res.status(500).send("Internal Server Error");
        }

        req.session.uniqueID = uniqueID;
        res.send(`<script>alert("✅ Registered! Your Unique Donor ID is: ${uniqueID}"); window.location.href = "/existingconditions";</script>`);
      });
    });
  });
});


app.post("/submitPrecondition", (req, res) => {
  const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants } = req.body;
  const healthApproval = req.body.healthApproval ? 1 : 0;

  // Check if user is healthy to donate
  // if (diabetes || bp_condition || obese || cardiac_surgery || !healthApproval) {
  //   // Delete donor data if user is not healthy
  //   const deleteDonorDataQuery = `DELETE FROM user_data WHERE uniqueID = ?`;

  //   db.query(deleteDonorDataQuery, [uniqueID], (deleteErr) => {
  //     if (deleteErr) {
  //       console.error("Error deleting donor data:", deleteErr);
  //       return res.send(`<script>alert('Internal Server Error while deleting donor data.'); window.location.href = "/signup";</script>`);
  //     }

  //     res.send(`<script>alert('You are not eligible to donate any organs due to health conditions. Your data has been removed.'); window.history.back();</script>`);
  //   });

  //   return;
  // }

  const sql = `
    INSERT INTO userHealth_Dependants (uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval)
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
// app.post("/loginCheck", (req, res) => {
//   const { uniqueID, pass } = req.body;
//   const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

//   db.query(sql, [uniqueID, pass], (err, result) => {
//     if (err) return res.status(500).send("Internal Server Error");
//     if (result.length > 0) return res.redirect("/dashboard");
//     res.status(401).send("Invalid Unique ID or Password");
//   });
// });

app.post("/loginCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
    if (err) {
      return res.send(`<script>alert("Internal Server Error"); window.location.href = "/existingconditions";</script>`);
    }

    if (result.length > 0) {
      // Login success – redirect to dashboard
      return res.redirect("/dashboard");
    }

    // Invalid credentials – show alert and redirect
    res.send(`<script>alert("Invalid credentials"); window.location.href = "/login";</script>`);
  });
});



// // Dashboard Filter
// Dashboard Filter
app.get("/dashboardContent", (req, res) => {
  const { organ, bloodGroup, city } = req.query;

  // Base SQL Query
  let sql = `
    SELECT user_data.uniqueID, user_data.email, user_data.lastUpdate,
           userHealth_Dependants.totalDependants, userHealth_Dependants.dependantAge
    FROM user_data
    INNER JOIN userHealth_Dependants ON user_data.uniqueID = userHealth_Dependants.uniqueID
    LEFT JOIN donor_organs ON user_data.uniqueID = donor_organs.uniqueID
    WHERE user_data.bloodGroup = ? AND user_data.city = ?
  `;
  
  const filters = [bloodGroup, city];

  // Adding Organ Filter if Provided
  if (organ) {
    sql += ` AND donor_organs.${organ} = 1`;
  }

  // Sorting by Last Update
  sql += ` ORDER BY user_data.lastUpdate DESC`;

  // Execute Query
  db.query(sql, filters, (err, result) => {
    if (err) return res.status(500).send("Internal Server Error");
    res.render("dashboardContent", { donors: result });
  });
});

// Pre-update Check
// app.post("/preUpdateCheck", (req, res) => {
//   const { uniqueID, pass } = req.body;
//   const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

//   db.query(sql, [uniqueID, pass], (err, result) => {
//     if (err) return res.status(500).json({ message: "Internal server error!" });
//     if (result.length > 0) {
//       req.session.uniqueID = uniqueID;
//       res.redirect(`/updateProfile?uniqueID=${uniqueID}`);
//     } else {
//       res.status(401).json({ message: "Invalid credentials!" });
//     }
//   });
// });

app.post("/preUpdateCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
    if (err) {
      return res.send(`<script>alert("Internal Server Error"); window.location.href = "/preUpdate";</script>`);
    }

    if (result.length > 0) {
      req.session.uniqueID = uniqueID;
      return res.redirect(`/updateProfile?uniqueID=${uniqueID}`);
    }

    res.send(`<script>alert("Invalid credentials"); window.location.href = "/preUpdate";</script>`);
  });
});


// // Confirm Update Step 1
app.post("/confirmUpdate1", (req, res) => {
  const { 
    uniqueID, 
    name, 
    email, 
    govtID, 
    pass, 
    age, 
    gender, 
    city, 
    bloodGroup, 
    donatedOrgans, 
    transplantedOrgans 
  } = req.body;

  // Ensure donatedOrgans and transplantedOrgans are arrays
  const safeDonatedOrgans = donatedOrgans 
    ? (Array.isArray(donatedOrgans) ? donatedOrgans : [donatedOrgans])
    : [];
  const safeTransplantedOrgans = transplantedOrgans 
    ? (Array.isArray(transplantedOrgans) ? transplantedOrgans : [transplantedOrgans])
    : [];

  // Define the organ types
  const organs = ["Kidney", "Liver", "Lung", "Intestine", "Pancreas"];

  // Create flag arrays: a value of 1 indicates the organ is selected
  const donatedFlags = organs.map(o => safeDonatedOrgans.includes(o) ? 1 : 0);
  const transplantedFlags = organs.map(o => safeTransplantedOrgans.includes(o) ? 1 : 0);

  // Check for conflict: an organ cannot be both donated and transplanted
  const conflictOrgans = organs.filter((o, index) => donatedFlags[index] === 1 && transplantedFlags[index] === 1);
  if (conflictOrgans.length > 0) {
    return res.send(`<script>alert("Conflict detected: You cannot donate an organ that has already been transplanted (${conflictOrgans.join(", ")})."); window.history.back();</script>`);
  }

  // Update donor general data in user_data table
  const donorDataQuery = `
    UPDATE user_data
    SET name = ?, email = ?, govtID = ?, pass = ?, age = ?, gender = ?, city = ?, bloodGroup = ?
    WHERE uniqueID = ?
  `;
  const donorDataValues = [name, email, govtID, pass, age, gender, city, bloodGroup, uniqueID];

  db.query(donorDataQuery, donorDataValues, (err, result) => {
    if (err) {
      console.error("Error updating user_data:", err);
      return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
    }

    if (result.affectedRows > 0) {
      // Update donor_organs table with the donated organ flags
      const updateDonorOrgansQuery = `
        UPDATE donor_organs
        SET kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
        WHERE uniqueID = ?
      `;
      const donorOrgansValues = [...donatedFlags, uniqueID];

      db.query(updateDonorOrgansQuery, donorOrgansValues, (orgErr, orgResult) => {
        if (orgErr) {
          console.error("Error updating donor_organs:", orgErr);
          return res.status(500).json({ message: "Internal server error!", error: orgErr.sqlMessage });
        }

        // Update transplanted_organs table with the transplanted organ flags
        const updateTransplantedOrgansQuery = `
          UPDATE transplanted_organs
          SET kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
          WHERE uniqueID = ?
        `;
        const transplantedOrgansValues = [...transplantedFlags, uniqueID];

        db.query(updateTransplantedOrgansQuery, transplantedOrgansValues, (transErr, transResult) => {
          if (transErr) {
            console.error("Error updating transplanted_organs:", transErr);
            return res.status(500).json({ message: "Internal server error!", error: transErr.sqlMessage });
          }

          // On successful updates, redirect to the next preconditions update page
          res.redirect(`/updatePreconditionsAndDependants?uniqueID=${uniqueID}`);
        });
      });
    } else {
      return res.status(404).json({ message: "User not found!" });
    }
  });
});




// Confirm Update Step 2
app.post("/confirmUpdate2", (req, res) => {
  const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval } = req.body;

  const sql = `
    INSERT INTO userHealth_Dependants (
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

// // Get user data
app.get("/getUser/:uniqueID", (req, res) => {
  const { uniqueID } = req.params;

  const sql = `
    SELECT dd.*, 
           do.kidney AS donated_kidney, do.liver AS donated_liver,
           do.lung AS donated_lung, do.intestine AS donated_intestine, do.pancreas AS donated_pancreas,
           trans.kidney AS transplanted_kidney, trans.liver AS transplanted_liver,
           trans.lung AS transplanted_lung, trans.intestine AS transplanted_intestine, trans.pancreas AS transplanted_pancreas
    FROM user_data dd
    LEFT JOIN donor_organs do ON dd.uniqueID = do.uniqueID
    LEFT JOIN transplanted_organs trans ON dd.uniqueID = trans.uniqueID
    WHERE dd.uniqueID = ?
  `;

  db.query(sql, [uniqueID], (err, result) => {
    if (err) {
      return res.status(500).json({ message: "Internal server error!", error: err.sqlMessage });
    }
    if (result.length > 0) {
      const row = result[0];
      // Reconstruct donor data with nested organ objects
      const responseData = {
        uniqueID: row.uniqueID,
        name: row.name,
        email: row.email,
        govtID: row.govtID,
        pass: row.pass,
        age: row.age,
        gender: row.gender,
        city: row.city,
        bloodGroup: row.bloodGroup,
        donatedOrgans: {
          kidney: row.donated_kidney,
          liver: row.donated_liver,
          lung: row.donated_lung,
          intestine: row.donated_intestine,
          pancreas: row.donated_pancreas
        },
        transplantedOrgans: {
          kidney: row.transplanted_kidney,
          liver: row.transplanted_liver,
          lung: row.transplanted_lung,
          intestine: row.transplanted_intestine,
          pancreas: row.transplanted_pancreas
        }
      };

      res.json(responseData);
    } else {
      res.status(404).json({ message: "User not found!" });
    }
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

  const query = "SELECT * FROM userHealth_Dependants WHERE uniqueID = ?";
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

  const deleteQuery = "DELETE FROM user_data WHERE uniqueID = ?";
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