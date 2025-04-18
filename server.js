const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

require("dotenv").config();

const session = require('express-session');
const app = express();

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,  // Using .env for security
    resave: false,
    saveUninitialized: true,
}));

app.set("view engine", "ejs");
app.set("views", "./views"); // Ensure the correct path to your EJS files

// Middleware for parsing request body data
app.use(bodyParser.urlencoded({ extended: true })); // Parses form data (x-www-form-urlencoded)
app.use(express.json()); // Parses JSON body requests

// Define basic routes
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/signup", (req, res) => {
    res.sendFile(__dirname + "/signup.html");
});

app.get("/login", (req, res) => {
    res.sendFile(__dirname + "/login.html");
});

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
    console.log("✅ Connected successfully!");

    // Creating donor_data table with updated schema
    const createDonorData = `
        CREATE TABLE IF NOT EXISTS donor_data (
            uniqueID INT AUTO_INCREMENT PRIMARY KEY,  -- System-generated unique ID
            govtID BIGINT NOT NULL UNIQUE CHECK (govtID BETWEEN 100000000000 AND 999999999999),  -- Ensuring a 12-digit numeric government ID
            name VARCHAR(50),
            email VARCHAR(50) UNIQUE CHECK (email LIKE '%@%.%'),  -- Basic format validation for email
            pass VARCHAR(255),  -- Store hashed passwords in production
            age INT CHECK (age >= 1),  -- Ensuring age is at least 1
            gender ENUM('Male', 'Female'),  -- Limited selection for valid gender options
            city ENUM('Mysore', 'Bangalore', 'Chikmagalur', 'Kolar'),  -- Limit cities to predefined options
            bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'),  -- Limited selection for valid blood groups
            kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0,1)),  -- Boolean value for organ donation
            liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0,1)),
            lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0,1)),
            intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0,1)),
            pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0,1))
        );
    `;

    // Creating donor_health_dependants table with foreign key linkage
    const createDonorHealth = `

    CREATE TABLE IF NOT EXISTS donor_health_dependants (
        uniqueID INT PRIMARY KEY,  
        diabetes TINYINT,  -- 0 = No, 1 = Yes
        bp_condition TINYINT,  -- 0 = None, 1 = Hypertension, 2 = Hypotension
        obese TINYINT,  -- 0 = No, 1 = Yes
        cardiac_surgery TINYINT,  -- 0 = No, 1 = Yes
        dependantName VARCHAR(255) NOT NULL,
        dependantAadhar BIGINT NOT NULL UNIQUE, -- Ensures uniqueness
        dependantAge INT NOT NULL,
        totalDependants INT NOT NULL,
        healthApproval TINYINT, -- Ensures health approval is provided
        FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
    );
    `;

    // Execute table creation queries
    db.query(createDonorData, (err) => {
        if (err) {
            console.error("❌ Error creating `donor_data` table:", err);
            return;
        }
        console.log("✅ Table `donor_data` ensured.");
    });

    db.query(createDonorHealth, (err) => {
        if (err) {
            console.error("❌ Error creating `donor_health_dependants` table:", err);
            return;
        }
        console.log("✅ Table `donor_health_dependants` ensured.");
    });
});

app.post("/submit", (req, res) => {
    const { name, email, govtID, pass, age, gender, city, bloodGroup, organ } = req.body;

    // Convert checkbox selections into boolean values (1 if checked, 0 otherwise)
    const kidney = organ.includes("Kidney") ? 1 : 0;
    const liver = organ.includes("Liver") ? 1 : 0;
    const lung = organ.includes("Lung") ? 1 : 0;
    const intestine = organ.includes("Intestine") ? 1 : 0;
    const pancreas = organ.includes("Pancreas") ? 1 : 0;

    // SQL query to insert data into the donor_data table
    const sql = `
        INSERT INTO donor_data (name, email, govtID, pass, age, gender, city, bloodGroup, kidney, liver, lung, intestine, pancreas)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const values = [name, email, govtID, pass, age, gender, city, bloodGroup, kidney, liver, lung, intestine, pancreas];

    db.query(sql, values, (err, result) => {
        if (err) {
            if (err.code === "ER_DUP_ENTRY") {
                return res.send(`
                    <script>
                        alert("❌ Registration failed! The Government ID '${govtID}' or Email ID '${email}' is already registered.");
                        window.history.back();
                    </script>
                `);
            }
            console.error("❌ Database Error:", err);
            return res.status(500).send("Internal Server Error");
        }

        const uniqueID = result.insertId;
        req.session.uniqueID = uniqueID;

        res.send(`
            <script>
                alert("✅ Registration successful! Your Unique Donor ID is: ${uniqueID}");
                window.location.href = "/existingconditions";
            </script>
        `);
    });
});



// Route to serve `existingconditions.html`
app.get("/existingconditions", (req, res) => {
    res.sendFile(__dirname + "/existingconditions.html");
});

// API route to provide Unique ID from session
app.get("/getUniqueID", (req, res) => {
    if (req.session.uniqueID) {
        res.json({ uniqueID: req.session.uniqueID });
    } else {
        res.status(400).json({ error: "Unique ID not found in session" });
    }
});

// Precondition submission route
app.post("/submitPrecondition", (req, res) => {
    const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants} = req.body;

        // Convert checkbox input from "on" to 0 or 1
        const healthApproval = req.body.healthApproval ? 1 : 0;

    // SQL query for inserting donor health and dependant details
    const sql = `
        INSERT INTO donor_health_dependants (uniqueID, diabetes, bp_condition, obese, cardiac_surgery, dependantName, dependantAadhar, dependantAge, totalDependants, healthApproval)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery,  dependantName, dependantAadhar, dependantAge, totalDependants,healthApproval], (err, result) => {
        if (err) {
            console.error("❌ Error inserting precondition data:", err);
            return res.status(500).send("Internal Server Error");
        }

        res.redirect("/"); // Redirect after successful insertion
    });
});

// Login validation
app.post("/loginCheck", (req, res) => {
    const { uniqueID, pass } = req.body;
    const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

    db.query(sql, [uniqueID, pass], (err, result) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (result.length > 0) {
            console.log("✅ Login successful for uniqueID:", uniqueID);
            res.redirect("/dashboard");
        } else {
            res.status(401).send("❌ Invalid Unique ID or Password");
        }
    });
});

app.get("/dashboard", (req, res) => {
    res.sendFile(__dirname + "/dashboard.html");
});

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

    // Dynamically add organ condition
    if (organ) {
        sql += ` AND donor_data.${organ} = 1`;  // Ensure organ matches a valid column
    }

    db.query(sql, filters, (err, result) => {
        if (err) {
            console.error("❌ Database error:", err);
            return res.status(500).send("Internal Server Error");
        }

        console.log("✅ Filtered Results:", result);
        res.render("dashboardContent", { donors: result });
    });
});


// Start server
app.listen(3000, () => {
    console.log("🚀 Server running on http://localhost:3000");
});