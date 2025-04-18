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

    // Creating donor_health table with foreign key linkage
    const createDonorHealth = `
        CREATE TABLE IF NOT EXISTS donor_health (
            uniqueID INT,  -- Linking to donor_data uniqueID
            diabetes TINYINT CHECK (diabetes IN (0,1)),  
            bp_condition ENUM('Hypertension', 'Hypotension', 'None'),  
            obese TINYINT CHECK (obese IN (0,1)),  
            cardiac_surgery TINYINT CHECK (cardiac_surgery IN (0,1)),  
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
            console.error("❌ Error creating `donor_health` table:", err);
            return;
        }
        console.log("✅ Table `donor_health` ensured.");
    });
});


// // User registration route
// app.post("/submit", (req, res) => {
//     const { name, email, govtID, pass, city, bloodGroup, organ } = req.body;
    
//     const sql = "INSERT INTO donor_data (name, email, govtID, pass, city, bloodGroup, organ) VALUES (?, ?, ?, ?, ?, ?, ?)";

//     db.query(sql, [name, email, govtID, pass, city, bloodGroup, organ], (err, result) => {
//         if (err) {
//             if (err.code === 'ER_DUP_ENTRY') {
//                 return res.send(`
//                     <script>
//                         alert("❌ Registration failed! The Government ID '${govtID}' is already registered.");
//                         window.history.back();
//                     </script>
//                 `);
//             }
//             console.error("❌ Database Error:", err);
//             return res.status(500).send("Internal Server Error");
//         }

//         const newId = result.insertId;
//         const formattedUniqueID = newId.toString().padStart(10, '0');

//         req.session.uniqueID = formattedUniqueID;

//         // Send alert first, then serve the file
//         res.send(`
//             <script>
//                 alert("✅ Registration successful! Your Unique Donor ID is: ${formattedUniqueID}");
//                 window.location.href = "/existingconditions";
//             </script>
//         `);

//         // Send the HTML file for existing conditions after the alert
//         setTimeout(() => {
//             res.sendFile(__dirname + "/existingconditions");
//         }, 500); // Small delay ensures alert shows first
//     });
// });


// app.get("/existingconditions", (req, res) => {
//     const uniqueID = req.session.uniqueID; // Retrieve the ID from the session
    
//     res.sendFile(__dirname + "/existingconditions.html"); // Send the correct form file
// });

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
    const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery } = req.body;

    const sql = "INSERT INTO donor_health (uniqueID, diabetes, bp_condition, obese, cardiac_surgery) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery], (err, result) => {
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

    let sql = "SELECT uniqueID, email FROM donor_data WHERE bloodGroup = ? AND city = ?";
    let filters = [bloodGroup, city];

    // Dynamically add organ condition
    if (organ) {
        sql += ` AND ${organ} = 1`;  // Organ matches a boolean column name
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













//const express = require("express");
// const mysql = require("mysql2");
// const bodyParser = require("body-parser");

// require("dotenv").config();

// const session = require('express-session');
// const app = express();

// // Configure session middleware
// app.use(session({
//     secret: process.env.SESSION_SECRET, 
//     resave: false,
//     saveUninitialized: true,
// }));


// app.set("view engine", "ejs");
// app.set("views", "./views"); // Ensure the correct path to your EJS files

// // Middleware for parsing request body data
// app.use(bodyParser.urlencoded({ extended: true })); // Parses form data (x-www-form-urlencoded)
// app.use(express.json()); // Parses JSON body requests

// // Define routes here
// app.get("/", (req, res) => {
//     res.sendFile(__dirname + "/index.html");
// });

// app.get("/signup", (req, res) => {
//     res.sendFile(__dirname + "/signup.html");
// });

// app.get("/login", (req, res) => {
//     res.sendFile(__dirname + "/login.html");
// });

// // Updated /existingconditions route to retrieve and display the unique donor ID from the session
// app.get("/existingconditions", (req, res) => {
//     const uniqueID = req.session.uniqueID; // Retrieve the ID from the session
    
//     // Optionally, clear it from the session or leave it for further use
//     // req.session.uniqueID = null;
    
//     // Render the page or send a response including the unique donor ID
//     res.send(`Welcome! Your unique donor ID is: ${uniqueID}`);
// });

// // This is coming from form , so post should be used and handled below
// // app.get("/submitPrecondition", (req, res) => {
// //     res.sendFile(__dirname + "/submitPrecondition.html");
// // });

// const db = mysql.createConnection({
//     host: "localhost",
//     user: "root",
//     password: process.env.DB_PASSWORD, 
//     database: "dbb"
// });

// db.connect((err) => {
//     if (err) {
//         console.error("Connection failed:", err);
//         return;
//     }
//     console.log("Connected successfully!");

//     // Table creation queries
//     const createDonorData = `
//         CREATE TABLE IF NOT EXISTS donor_data (
//             name VARCHAR(50) NOT NULL,
//             email VARCHAR(50) UNIQUE NOT NULL,
//             govtID BIGINT(12) PRIMARY KEY,  -- Unique identifier for donors
//             pass VARCHAR(50) NOT NULL,  -- Password (consider hashing for security)
//             city VARCHAR(15) NOT NULL,  -- City selection
//             bloodGroup VARCHAR(3) NOT NULL,  -- Blood group selection
//             organ ENUM('Kidney', 'Liver', 'Lung', 'Intestine', 'Pancreas') NOT NULL  -- Organ willing to donate
//         );
//     `;

//     const createDonorHealth = `
//         CREATE TABLE IF NOT EXISTS donor_health (
//             govtID BIGINT,  
//             diabetes TINYINT,  
//             bp_condition TINYINT,  
//             obese TINYINT,  
//             cardiac_surgery TINYINT,  
//             FOREIGN KEY (govtID) REFERENCES donor_data(govtID) ON DELETE CASCADE
//         );
//     `;

//     db.query(createDonorData, (err) => {
//         if (err) {
//             console.error("Error in creating `donor_data`:", err);
//             return;
//         }
//         console.log("Table `donor_data` ensured.");
//     });

//     db.query(createDonorHealth, (err) => {
//         if (err) {
//             console.error("Error in creating `donor_health`:", err);
//             return;
//         }
//         console.log("Table `donor_health` ensured.");
//     });
// });



// app.post("/submit", (req, res) => {
//     const { name, email, govtID, pass, city, bloodGroup, organ } = req.body;
    
//     // Insert query using parameterized statements
//     const sql = "INSERT INTO donor_data (name, email, govtID, pass, city, bloodGroup, organ) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
//     db.query(sql, [name, email, govtID, pass, city, bloodGroup, organ], (err, result) => {
//         if (err) {
//             console.error("Database Error:", err);
//             return res.status(500).send("Internal Server Error");
//         }
        
//         // Retrieve the auto-generated unique ID
//         const newId = result.insertId;  // This is a number
        
//         // Format the ID to 10 digits with leading zeros:
//         const formattedUniqueID = newId.toString().padStart(10, '0');
        
//         // Store the formatted unique ID in session
//         req.session.uniqueID = formattedUniqueID;
        
//         // Redirect to the next step
//         return res.redirect("/existingconditions");
//     });
// });

// app.post("/submitPrecondition", (req, res) => {
//     const { uniqueID, diabetes, bp_condition, obese, cardiac_surgery } = req.body;
//     // const uniqueID = 1; // Replace with dynamic uniqueID if needed

//     const sql = "INSERT INTO donor_health (uniqueID, diabetes, bp_condition, obese, cardiac_surgery) VALUES (?, ?, ?, ?, ?)";

//     db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery], (err, result) => {
//         if (err) throw err;
//         res.redirect("/"); // Redirect to index.html after successful insertion
//     });
// });

// app.post("/loginCheck", (req, res) => {
//     const { uniqueID, pass } = req.body;
//     const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

//     db.query(sql, [uniqueID, pass], (err, result) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).send("Internal Server Error");
//         }
//         if (result.length > 0) {
//             console.log("Login successful for uniqueID:", uniqueID);
//             res.redirect("/dashboard");
//         } else {
//             res.status(401).send("Invalid Unique ID or Password");
//         }
//     });
// });

// app.get("/dashboard", (req, res) => {
//     res.sendFile(__dirname + "/dashboard.html");
// });

// // app.get("/dashboardContent", (req, res) => {
// //     const sql = "SELECT organ, bloodGroup, city FROM donor_data"; // Ensure correct column names
// //
// //     db.query(sql, (err, result) => {
// //         if (err) {
// //             console.error("Database error:", err);
// //             return res.status(500).send("Internal Server Error");
// //         }
// //
// //         console.log("Fetched donors:", result); // Debugging line to verify query results
// //
// //         res.render("dashboard", { donors: result }); // Pass retrieved data to EJS template
// //     });
// // });

// app.get("/dashboardContent", (req, res) => {
//     const { organ, bloodGroup, city } = req.query; // Get selected values from URL parameters

//     const sql = "SELECT uniqueID, email FROM donor_data WHERE organ = ? AND bloodGroup = ? AND city = ?";

//     db.query(sql, [organ, bloodGroup, city], (err, result) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).send("Internal Server Error");
//         }

//         console.log("Filtered Results:", result); // Debugging: Check fetched data

//         res.render("dashboardContent", { donors: result }); // Pass filtered data to EJS
//     });
// });

// app.listen(3000, () => {
//     console.log("Server running on http://localhost:3000");
// });