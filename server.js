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
  multipleStatements: true
});

db.connect((err) => {
  if (err) {
    console.error("Connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to database!");

  // Create tables
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INT AUTO_INCREMENT PRIMARY KEY,
      action_type VARCHAR(30) NOT NULL,
      user_id INT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      details TEXT
    );

    CREATE TABLE IF NOT EXISTS user_data (
      uniqueID INT AUTO_INCREMENT PRIMARY KEY,
      govtID VARCHAR(12) NOT NULL UNIQUE CHECK (govtID >= '100000000000' AND govtID <= '999999999999'),
      name VARCHAR(50),
      email VARCHAR(50) UNIQUE CHECK (email LIKE '%@%.%'),
      phone VARCHAR(10) UNIQUE CHECK (phone REGEXP '^[0-9]{10}$'),
      pass VARCHAR(255),
      age INT CHECK (age >= 18),
      gender ENUM('Male', 'Female'),
      city ENUM(
        'Bagalkot',
        'Ballari',
        'Belagavi',
        'Bengaluru Rural',
        'Bengaluru Urban',
        'Bidar',
        'Chamarajanagar',
        'Chikkaballapur',
        'Chikkamagaluru',
        'Chitradurga',
        'Dakshina Kannada',
        'Davanagere',
        'Dharwad',
        'Gadag',
        'Hassan',
        'Haveri',
        'Kalaburagi',
        'Kodagu',
        'Kolar',
        'Koppal',
        'Mandya',
        'Mysuru',
        'Raichur',
        'Ramanagara',
        'Shivamogga',
        'Tumakuru',
        'Udupi',
        'Vijayapura',
        'Yadgir'
      ),
      bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),
      lastUpdate TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    );

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

    CREATE TABLE IF NOT EXISTS userDependants (
      dependantID INT AUTO_INCREMENT PRIMARY KEY,
      uniqueID INT NOT NULL,
      dependantName VARCHAR(255) NOT NULL,
      dependantAadhar BIGINT NOT NULL UNIQUE CHECK (dependantAadhar BETWEEN 100000000000 AND 999999999999),
      dependantAge INT NOT NULL,
      totalDependants INT NOT NULL,
      FOREIGN KEY (uniqueID) REFERENCES user_data(uniqueID) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS userHealth (
      dependantID INT PRIMARY KEY,
      diabetes TINYINT DEFAULT 0,
      bp_condition TINYINT DEFAULT 0,
      obese TINYINT DEFAULT 0,
      cardiac_surgery TINYINT DEFAULT 0,
      healthApproval TINYINT DEFAULT 0,
      FOREIGN KEY (dependantID) REFERENCES userDependants(dependantID) ON DELETE CASCADE
    );
  `;

  db.query(createTablesSQL, (err) => {
    if (err) {
      console.error("Error creating tables:", err);
      process.exit(1);
    }
    console.log("All tables ensured.");

    // Now create triggers (must be one by one or as one string without DELIMITER)
    // Here triggers are separated by semicolon and BEGIN...END blocks, without DELIMITER statements.
    const createTriggersSQL = `
      DROP TRIGGER IF EXISTS user_data_after_insert;
      CREATE TRIGGER user_data_after_insert
      AFTER INSERT ON user_data
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('REGISTER', NEW.uniqueID, CONCAT('User registered: ', NEW.name, ', email: ', NEW.email));
      END;

      DROP TRIGGER IF EXISTS user_data_after_update;
      CREATE TRIGGER user_data_after_update
      AFTER UPDATE ON user_data
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('UPDATE_USER', NEW.uniqueID, CONCAT('Profile updated: ', NEW.name, ', email: ', NEW.email));
      END;

      DROP TRIGGER IF EXISTS user_data_after_delete;
      CREATE TRIGGER user_data_after_delete
      AFTER DELETE ON user_data
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('DELETE_USER', OLD.uniqueID, CONCAT('User deleted. Name: ', OLD.name));
      END;

      DROP TRIGGER IF EXISTS transplanted_organs_after_insert;
      CREATE TRIGGER transplanted_organs_after_insert
      AFTER INSERT ON transplanted_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('INSERT_TRANSPLANTED_ORGANS', NEW.uniqueID, CONCAT('Transplanted organs added. OrganID: ', NEW.organID));
      END;

      DROP TRIGGER IF EXISTS transplanted_organs_after_update;
      CREATE TRIGGER transplanted_organs_after_update
      AFTER UPDATE ON transplanted_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('UPDATE_TRANSPLANTED_ORGANS', NEW.uniqueID, CONCAT('Transplanted organs updated. OrganID: ', NEW.organID));
      END;

      DROP TRIGGER IF EXISTS transplanted_organs_after_delete;
      CREATE TRIGGER transplanted_organs_after_delete
      AFTER DELETE ON transplanted_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('DELETE_TRANSPLANTED_ORGANS', OLD.uniqueID, CONCAT('Transplanted organs deleted. OrganID: ', OLD.organID));
      END;

      DROP TRIGGER IF EXISTS donor_organs_after_insert;
      CREATE TRIGGER donor_organs_after_insert
      AFTER INSERT ON donor_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('INSERT_DONOR_ORGANS', NEW.uniqueID, CONCAT('Donor organs added. OrganID: ', NEW.organID));
      END;

      DROP TRIGGER IF EXISTS donor_organs_after_update;
      CREATE TRIGGER donor_organs_after_update
      AFTER UPDATE ON donor_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('UPDATE_DONOR_ORGANS', NEW.uniqueID, CONCAT('Donor organs updated. OrganID: ', NEW.organID));
      END;

      DROP TRIGGER IF EXISTS donor_organs_after_delete;
      CREATE TRIGGER donor_organs_after_delete
      AFTER DELETE ON donor_organs
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('DELETE_DONOR_ORGANS', OLD.uniqueID, CONCAT('Donor organs deleted. OrganID: ', OLD.organID));
      END;

      DROP TRIGGER IF EXISTS userHealth_after_insert;
      CREATE TRIGGER userHealth_after_insert
      AFTER INSERT ON userHealth
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('INSERT_USER_HEALTH', NEW.dependantID, 'User health record added.');
      END;

      DROP TRIGGER IF EXISTS userHealth_after_update;
      CREATE TRIGGER userHealth_after_update
      AFTER UPDATE ON userHealth
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('UPDATE_USER_HEALTH', NEW.dependantID, 'User health record updated.');
      END;

      DROP TRIGGER IF EXISTS userHealth_after_delete;
      CREATE TRIGGER userHealth_after_delete
      AFTER DELETE ON userHealth
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('DELETE_USER_HEALTH', OLD.dependantID, 'User health record deleted.');
      END;

      DROP TRIGGER IF EXISTS userDependants_after_insert;
      CREATE TRIGGER userDependants_after_insert
      AFTER INSERT ON userDependants
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('INSERT_DEPENDANT', NEW.uniqueID, CONCAT('Dependant added: ', NEW.dependantName));
      END;

      DROP TRIGGER IF EXISTS userDependants_after_update;
      CREATE TRIGGER userDependants_after_update
      AFTER UPDATE ON userDependants
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('UPDATE_DEPENDANT', NEW.uniqueID, CONCAT('Dependant updated: ', OLD.dependantName, ' → ', NEW.dependantName));
      END;

      DROP TRIGGER IF EXISTS userDependants_after_delete;
      CREATE TRIGGER userDependants_after_delete
      AFTER DELETE ON userDependants
      FOR EACH ROW
      BEGIN
          INSERT INTO audit_logs (action_type, user_id, details)
          VALUES ('DELETE_DEPENDANT', OLD.uniqueID, CONCAT('Dependant deleted: ', OLD.dependantName));
      END;
    `;

    db.query(createTriggersSQL, (err) => {
      if (err) {
        console.error("Error creating triggers:", err);
      } else {
        console.log("All audit triggers created successfully.");
      }
    });
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});


/** Routes */
// Registration
app.post("/submit", (req, res) => {
  const { 
    name, 
    email, 
    phone,
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
  return res.send(`
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'warning',
          title: 'Invalid Government ID',
          text: 'Government ID must be a 12-digit number.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Go Back'
        }).then(() => {
          window.history.back();
        });
      };
      document.head.appendChild(script);
    </script>
  `);
}

// Validate Age
if (age < 18) {
  return res.send(`
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'warning',
          title: 'Age Restriction',
          text: 'Age must be 18 or older.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Go Back'
        }).then(() => {
          window.history.back();
        });
      };
      document.head.appendChild(script);
    </script>
  `);
}

if (age > 60) {
  return res.send(`
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'warning',
          title: 'Age Restriction',
          text: 'Age must be 60 or below. You are not eligible to donate any organs as it may harm the donor.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Go Back'
        }).then(() => {
          window.history.back();
        });
      };
      document.head.appendChild(script);
    </script>
  `);
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
  return res.send(`
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Conflict Detected',
            html: 'You cannot donate transplanted organs:<br><strong style="color: red;">${conflictOrgans.join(", ")}</strong>',
            confirmButtonText: 'Go Back',
            confirmButtonColor: '#d33'
          }).then(() => {
            window.history.back();
          });
        </script>
      </body>
    </html>
  `);
}


  // Check if more than 3 organs are selected for donation
  const donatedCount = donatedFlags.reduce((sum, val) => sum + val, 0);
if (donatedCount > 3) {
  return res.send(`
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'warning',
            title: 'Too Many Organs Selected',
            html: 'Donating <strong style="color: red;">more than three organs</strong> can be harmful.<br>Please select fewer organs.',
            confirmButtonText: 'Go Back',
            confirmButtonColor: '#f39c12'
          }).then(() => {
            window.history.back();
          });
        </script>
      </body>
    </html>
  `);
}


  // Insert Donor Data into user_data table
  const dataQuery = `
    INSERT INTO user_data (name, email, phone, govtID, pass, age, gender, city, bloodGroup)
    VALUES (?, ?, ?, ?, ?,?, ?, ?, ? )
  `;
  const dataValues = [name, email, phone, govtID, pass, age, gender, city, bloodGroup];

  db.query(dataQuery, dataValues, (err, result) => {
    if (err) {
if (err.code === "ER_DUP_ENTRY") {
  return res.send(`
    <html>
      <head>
        <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
      </head>
      <body>
        <script>
          Swal.fire({
            icon: 'error',
            title: 'Duplicate Entry',
            html: 'The <strong style="color: #e74c3c;">Government ID</strong> or <strong style="color: #e74c3c;">Email</strong> is already registered.<br>Please use different credentials.',
            confirmButtonText: 'Go Back',
            confirmButtonColor: '#e74c3c'
          }).then(() => {
            window.history.back();
          });
        </script>
      </body>
    </html>
  `);
}

      console.error("Database Error:", err);
      return res.status(500).send("Internal Server Error :: "+ err.message);
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
        return res.status(500).send("Internal Server Error :: "+ donatedErr.message);
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
          return res.status(500).send("Internal Server Error :: "+ transplantedErr.message);
        }

        req.session.uniqueID = uniqueID;
res.send(`
  <html>
    <head>
      <!-- Include SweetAlert2 from CDN -->
      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
    </head>
    <body>
      <script>
        Swal.fire({
          icon: 'success',
          title: '✅ Registered!',
          text: 'Your Unique Donor ID is: ${uniqueID}',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          didClose: () => {
            window.location.href = "/existingconditions";
          }
        });
      </script>
    </body>
  </html>
`);

      });
    });
  });
});

//This part is done
app.post("/submitPrecondition", (req, res) => {
  const {
    uniqueID,
    dependantName,
    dependantAadhar,
    dependantAge,
    totalDependants,
    diabetes = 0,
    bp_condition = 0,
    obese = 0,
    cardiac_surgery = 0,

  } = req.body;
  healthApproval = req.body.healthApproval === "on" ? 1 : 0;

  // Step 1: Insert into userDependants
  const insertDependantSql = `
    INSERT INTO userDependants 
      (uniqueID, dependantName, dependantAadhar, dependantAge, totalDependants)
    VALUES (?, ?, ?, ?, ?)
  `;

  db.query(insertDependantSql, [uniqueID, dependantName, dependantAadhar, dependantAge, totalDependants], (err, result) => {
if (err) {
  let scriptResponse = '';

  if (err.code === 'ER_DUP_ENTRY') {
    scriptResponse = `
      <script>
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        script.onload = () => {
          Swal.fire({
            icon: 'warning',
            title: 'Duplicate Entry',
            text: 'The dependant Aadhar already exists.',
            confirmButtonColor: '#d33',
            confirmButtonText: 'Go Back'
          }).then(() => {
            window.history.back();
          });
        };
        document.head.appendChild(script);
      </script>
    `;
  } else {
    scriptResponse = `
      <script>
        const script = document.createElement('script');
        script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
        script.onload = () => {
          Swal.fire({
            icon: 'error',
            title: 'Enter valid details',
            text: 'Something went wrong. Please try again later.',
            confirmButtonColor: '#d33',
            confirmButtonText: 'Go Back'
          }).then(() => {
            window.history.back();
          });
        };
        document.head.appendChild(script);
      </script>
    `;
  }

  return res.send(scriptResponse);
}


    const dependantID = result.insertId;

    // Step 2: Insert into userHealth_Dependants with the new dependantID
    const insertHealthSql = `
      INSERT INTO userHealth
        (dependantID, diabetes, bp_condition, obese, cardiac_surgery, healthApproval)
      VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(insertHealthSql, [dependantID, diabetes, bp_condition, obese, cardiac_surgery, healthApproval], (err2) => {
if (err2) {
  const errorScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'error',
          title: 'Enter valid details',
          text: 'Something went wrong. Please try again.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Go Back'
        }).then(() => {
          window.history.back();
        });
      };
      document.head.appendChild(script);
    </script>
  `;
  return res.send(errorScript);
}

      res.redirect("/");
    });
  });
});


app.post("/loginCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
if (err) {
  const errorScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'error',
          title: 'Enter valid credentials',
          text: 'Something went wrong while processing your request.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Back'
        }).then(() => {
          window.location.href = '/existingconditions';
        });
      };
      document.head.appendChild(script);
    </script>
  `;
  return res.send(errorScript);
}


    if (result.length > 0) {
      // Login success – redirect to dashboard
      return res.redirect("/dashboard");
    }
res.send(`
  <script>
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    script.onload = () => {
      Swal.fire({
        icon: 'error',
        title: 'Login Failed',
        text: 'Invalid credentials. Please try again.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'OK'
      }).then(() => {
        window.location.href = '/login';
      });
    };
    document.head.appendChild(script);
  </script>
`);

  });
});

app.get("/dashboardContent", (req, res) => {
  const { organ, bloodGroup, city } = req.query;

  let sql = `
    SELECT 
      u.uniqueID, 
      u.email, 
      u.phone, 
      u.lastUpdate,
      d.totalDependants,
      d.dependantAge
    FROM user_data u
    LEFT JOIN (
      SELECT 
        uniqueID, 
        MAX(totalDependants) AS totalDependants,   -- Pick stored value per uniqueID
        MIN(dependantAge) AS dependantAge
      FROM userDependants
      GROUP BY uniqueID
    ) d ON u.uniqueID = d.uniqueID
    LEFT JOIN donor_organs o ON u.uniqueID = o.uniqueID
    WHERE u.bloodGroup = ? AND u.city = ?
  `;

  const filters = [bloodGroup, city];

  // Add organ filter dynamically if provided
  if (organ) {
    sql += ` AND o.${organ.toLowerCase()} = 1`;
  }

  sql += ` ORDER BY u.lastUpdate DESC`;

  db.query(sql, filters, (err, result) => {
    if (err) {
      console.error("Error executing dashboard query:", err);
      return res.status(500).send("Internal Server Error :: " + err.message);
    }

    // Map results to handle nulls and pass to template
    const donors = result.map(donor => ({
      ...donor,
      totalDependants: donor.totalDependants !== null ? donor.totalDependants : 0,
      dependantAge: donor.dependantAge !== null ? donor.dependantAge : 'N/A'
    }));

    res.render("dashboardContent", { donors });
  });
});

app.post("/preUpdateCheck", (req, res) => {
  const { uniqueID, pass } = req.body;
  const sql = "SELECT * FROM user_data WHERE uniqueID = ? AND pass = ?";

  db.query(sql, [uniqueID, pass], (err, result) => {
if (err) {
  const errorScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'error',
          title: 'Enter valid credentials',
          text: 'Something went wrong on the server. Please try again later.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Back'
        }).then(() => {
          window.location.href = '/preUpdate';
        });
      };
      document.head.appendChild(script);
    </script>
  `;
  return res.send(errorScript);
}

if (result.length > 0) {
  req.session.uniqueID = uniqueID;
  return res.redirect(`/updateProfile?uniqueID=${uniqueID}`);
}

res.send(`
  <script>
    const script = document.createElement('script');
    script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
    script.onload = () => {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Credentials',
        text: 'Please check your unique ID and password.',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Try Again'
      }).then(() => {
        window.location.href = '/preUpdate';
      });
    };
    document.head.appendChild(script);
  </script>
`);
  });
});

app.post("/confirmUpdate1", (req, res) => {
  const { 
    uniqueID, 
    name, 
    email, 
    phone,
    govtID, 
    pass, 
    age, 
    gender, 
    city, 
    bloodGroup, 
    donatedOrgans, 
    transplantedOrgans 
  } = req.body;

  const safeDonatedOrgans = donatedOrgans 
    ? (Array.isArray(donatedOrgans) ? donatedOrgans : [donatedOrgans])
    : [];
  const safeTransplantedOrgans = transplantedOrgans 
    ? (Array.isArray(transplantedOrgans) ? transplantedOrgans : [transplantedOrgans])
    : [];

  const organs = ["Kidney", "Liver", "Lung", "Intestine", "Pancreas"];
  const donatedFlags = organs.map(o => safeDonatedOrgans.includes(o) ? 1 : 0);
  const transplantedFlags = organs.map(o => safeTransplantedOrgans.includes(o) ? 1 : 0);

  const conflictOrgans = organs.filter((o, index) => donatedFlags[index] === 1 && transplantedFlags[index] === 1);
if (conflictOrgans.length > 0) {
  const conflictScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'warning',
          title: 'Conflict Detected',
          html: 'You cannot donate an organ that has already been transplanted: <strong>${conflictOrgans.join(", ")}</strong>.',
          confirmButtonText: 'Go Back',
          confirmButtonColor: '#d33'
        }).then(() => {
          window.history.back();
        });
      };
      document.head.appendChild(script);
    </script>
  `;
  return res.send(conflictScript);
}

  const donorDataQuery = `
    UPDATE user_data
    SET name = ?, email = ?, phone = ?, govtID = ?, pass = ?, age = ?, gender = ?, city = ?, bloodGroup = ?
    WHERE uniqueID = ?
  `;
  const donorDataValues = [name, email, phone, govtID, pass, age, gender, city, bloodGroup, uniqueID];

  db.query(donorDataQuery, donorDataValues, (err, result) => {
    if (err) {
      console.error("Error updating user_data:", err);
      return res.status(500).json({ message: "Internal server error!", error: err.message });
    }

    if (result.affectedRows > 0) {
      const updateDonorOrgansQuery = `
        UPDATE donor_organs
        SET kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
        WHERE uniqueID = ?
      `;
      const donorOrgansValues = [...donatedFlags, uniqueID];

      db.query(updateDonorOrgansQuery, donorOrgansValues, (orgErr, orgResult) => {
        if (orgErr) {
          console.error("Error updating donor_organs:", orgErr);
          return res.status(500).json({ message: "Internal server error!", error: orgErr.message });
        }

        const updateTransplantedOrgansQuery = `
          UPDATE transplanted_organs
          SET kidney = ?, liver = ?, lung = ?, intestine = ?, pancreas = ?
          WHERE uniqueID = ?
        `;
        const transplantedOrgansValues = [...transplantedFlags, uniqueID];

        db.query(updateTransplantedOrgansQuery, transplantedOrgansValues, (transErr, transResult) => {
          if (transErr) {
            console.error("Error updating transplanted_organs:", transErr);
            return res.status(500).json({ message: "Internal server error!", error: transErr.message });
          }

          // ✅ Add the lastUpdate timestamp here (safely)
          db.query("UPDATE user_data SET lastUpdate = CURRENT_TIMESTAMP WHERE uniqueID = ?", [uniqueID], (updateErr) => {
            if (updateErr) {
              console.error("Failed to update lastUpdate:", updateErr);
              return res.status(500).json({ message: "Failed to update lastUpdate" });
            }

            // ✅ All done, redirect
            res.redirect(`/updatePreconditionsAndDependants?uniqueID=${uniqueID}`);
          });
        });
      });
    } else {
      return res.status(404).json({ message: "User not found!" });
    }
  });
});

app.post("/confirmUpdate2", (req, res) => {
  const {
    uniqueID,
    dependantName,
    dependantAadhar,
    dependantAge,
    totalDependants,
    diabetes,
    bp_condition,
    obese,
    cardiac_surgery,
    healthApproval
  } = req.body;

  const healthData = {
    diabetes: Number(diabetes || 0),
    bp_condition: Number(bp_condition || 0),
    obese: Number(obese || 0),
    cardiac_surgery: Number(cardiac_surgery || 0),
    healthApproval: (healthApproval === "on" || healthApproval === "1") ? 1 : 0,
  };

  db.beginTransaction(err => {
    if (err) return res.status(500).json({ message: "Transaction error", error: err });

    // Step 1: INSERT or UPDATE dependant
    const upsertDependantSQL = `
      INSERT INTO userDependants (uniqueID, dependantName, dependantAadhar, dependantAge, totalDependants)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        dependantName = VALUES(dependantName),
        dependantAge = VALUES(dependantAge),
        totalDependants = VALUES(totalDependants)
    `;

    const dependantValues = [
      uniqueID,
      dependantName,
      dependantAadhar,
      dependantAge,
      totalDependants
    ];

    db.query(upsertDependantSQL, dependantValues, (err, result) => {
      if (err) {
        return db.rollback(() =>
          res.status(500).json({ message: "Error inserting/updating dependant", error: err.sqlMessage })
        );
      }

      // Step 2: Get the dependantID (either from insertId or SELECT)
      const getIDSQL = `
        SELECT dependantID FROM userDependants WHERE dependantAadhar = ?
      `;

      db.query(getIDSQL, [dependantAadhar], (err, rows) => {
        if (err || rows.length === 0) {
          return db.rollback(() =>
            res.status(500).json({ message: "Could not fetch dependantID", error: err?.sqlMessage || "Not found" })
          );
        }

        const dependantID = rows[0].dependantID;

        // Step 3: INSERT or UPDATE health info
        const healthSQL = `
          INSERT INTO userHealth (dependantID, diabetes, bp_condition, obese, cardiac_surgery, healthApproval)
          VALUES (?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            diabetes = VALUES(diabetes),
            bp_condition = VALUES(bp_condition),
            obese = VALUES(obese),
            cardiac_surgery = VALUES(cardiac_surgery),
            healthApproval = VALUES(healthApproval)
        `;

        const healthValues = [
          dependantID,
          healthData.diabetes,
          healthData.bp_condition,
          healthData.obese,
          healthData.cardiac_surgery,
          healthData.healthApproval
        ];

        db.query(healthSQL, healthValues, (err) => {
          if (err) {
            return db.rollback(() =>
              res.status(500).json({ message: "Error updating health data", error: err.sqlMessage })
            );
          }

          // Commit transaction first
          db.commit(err => {
            if (err) {
              return db.rollback(() =>
                res.status(500).json({ message: "Transaction commit failed", error: err.sqlMessage })
              );
            }

            // Now update lastUpdate timestamp
            db.query(
              "UPDATE user_data SET lastUpdate = CURRENT_TIMESTAMP WHERE uniqueID = ?",
              [uniqueID],
              (err) => {
                if (err) {
                  console.error("Error updating lastUpdate timestamp:", err);
                  // Not critical enough to fail the entire operation, so just log
                }

                // Success response with SweetAlert
                res.send(`
                  <html>
                    <head>
                      <script src="https://cdn.jsdelivr.net/npm/sweetalert2@11"></script>
                    </head>
                    <body>
                      <script>
                        Swal.fire({
                          icon: 'success',
                          title: 'Updated Successfully!',
                          text: 'Health & Dependant data updated for Aadhar: ${dependantAadhar}',
                          showConfirmButton: false,
                          timer: 3000,
                          timerProgressBar: true,
                          didClose: () => {
                            window.location.href = "/";
                          }
                        });
                      </script>
                    </body>
                  </html>
                `);
              }
            );
          });
        });
      });
    });
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
      return res.status(500).json({ message: "Internal server error!", error: err.message });
    }
    if (result.length > 0) {
      const row = result[0];
      // Reconstruct donor data with nested organ objects
      const responseData = {
        uniqueID: row.uniqueID,
        name: row.name,
        email: row.email,
        phone: row.phone,
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
  const uniqueID = req.params.uniqueID;

  const sql = `
    SELECT u.uniqueID, u.email, u.phone,
           d.dependantName, d.dependantAadhar, d.dependantAge, d.totalDependants,
           h.diabetes, h.bp_condition, h.obese, h.cardiac_surgery, h.healthApproval
    FROM user_data u
    LEFT JOIN (
      SELECT * FROM userDependants 
      WHERE (uniqueID, dependantID) IN (
        SELECT uniqueID, MAX(dependantID) 
        FROM userDependants 
        GROUP BY uniqueID
      )
    ) d ON u.uniqueID = d.uniqueID
    LEFT JOIN userHealth h ON d.dependantID = h.dependantID
    WHERE u.uniqueID = ?
  `;

  db.query(sql, [uniqueID], (err, result) => {
    if (err) {
      console.error("Error fetching precondition data:", err);
      return res.status(500).json({ error: "Failed to fetch data.", details: err.message });
    }
    
    // Return empty object with uniqueID if no results found
    // This way the form still works for new entries
    if (result.length === 0) {
      return res.json({ uniqueID: uniqueID });
    }
    
    res.json(result[0]);
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
    return res.status(500).json({ message: "Internal server error!", error: err.message });
  }

  const successScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: 'User deleted successfully.',
          confirmButtonColor: '#3085d6',
          confirmButtonText: 'OK'
        }).then(() => {
          window.location.href = '/';
        });
      };
      document.head.appendChild(script);
    </script>
  `;

  const failureScript = `
    <script>
      const script = document.createElement('script');
      script.src = "https://cdn.jsdelivr.net/npm/sweetalert2@11";
      script.onload = () => {
        Swal.fire({
          icon: 'error',
          title: 'Oops...',
          text: 'User not found or could not be deleted.',
          confirmButtonColor: '#d33',
          confirmButtonText: 'Go back'
        }).then(() => {
          window.location.href = '/';
        });
      };
      document.head.appendChild(script);
    </script>
  `;

  if (result.affectedRows > 0) {
    res.send(successScript);
  } else {
    res.send(failureScript);
  }
});

});


// Start server
app.listen(3000, () => {
  console.log("🚀 Server running at http://localhost:3000");
});