const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");

require("dotenv").config();

const app = express();
app.set("view engine", "ejs");
app.set("views", "./views"); // Ensure the correct path to your EJS files

// Middleware for parsing request body data
app.use(bodyParser.urlencoded({ extended: true })); // Parses form data (x-www-form-urlencoded)
app.use(express.json()); // Parses JSON body requests

// Define routes here
app.get("/", (req, res) => {
    res.sendFile(__dirname + "/index.html");
});

app.get("/signup", (req, res)=>{
    res.sendFile(__dirname + "/signup.html");
})
app.get("/login", (req, res)=>{
    res.sendFile(__dirname + "/login.html");
})


app.get("/existingconditions", (req, res)=>{
    res.sendFile(__dirname + "/existingconditions.html");
})

////THIs is coming from form , so post should be used and handled below
// app.get("/submitPrecondition", (req, res)=>{
//     res.sendFile(__dirname + "/submitPrecondition.html");
// })

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: process.env.DB_PASSWORD, 
    database: "dbb"
});

db.connect((err) => {
    if (err) {
        console.error("Connection failed:", err);
        return;
    }
    console.log("Connected successfully!");

    // Table creation queries
    const createDonorData = `
        CREATE TABLE IF NOT EXISTS donor_data (
            name VARCHAR(50) NOT NULL,
            email VARCHAR(50) UNIQUE NOT NULL,
            uniqueID INT PRIMARY KEY,  -- Unique identifier for donors
            pass VARCHAR(50) NOT NULL,  -- Password (consider hashing for security)
            city VARCHAR(15) NOT NULL,  -- City selection
            bloodGroup VARCHAR(3) NOT NULL,  -- Blood group selection
            organ ENUM('Kidney', 'Liver', 'Lung', 'Intestine', 'Pancreas') NOT NULL  -- Organ willing to donate
        );
    `;

    const createDonorHealth = `
        CREATE TABLE IF NOT EXISTS donor_health (
            uniqueID INT,  
            diabetes TINYINT,  
            bp_condition TINYINT,  
            obese TINYINT,  
            cardiac_surgery TINYINT,  
            FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
        );
    `;

    db.query(createDonorData, (err) => {
        if (err) {
            console.error("Error in creating `donor_data`:", err);
            return;
        }
        console.log("Table `donor_data` ensured.");
    });

    db.query(createDonorHealth, (err) => {
        if (err) {
            console.error("Error in creating `donor_health`:", err);
            return;
        }
        console.log("Table `donor_health` ensured.");
    });
});



// CREATE TABLE if not exists donor_data (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     name VARCHAR(20),
//     email VARCHAR(20),
//     uniqueID int,
//     phone bigint,
//     address varchar(30), 
//     city varchar(15)
// );


// app.post("/submit", (req, res) => {
//     const { name, email, uniqueID, pass, phone, address, city } = req.body;
//     const sql = "INSERT INTO donor_data (name, email, uniqueID, pass, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
//     db.query(sql, [name, email, uniqueID,pass, phone, address, city], (err, result) => {
//         if (err) throw err;
//         res.redirect("/existingconditions"); // Redirect after successful insertion
//     });
// });

app.post("/submit", (req, res) => {
    const { name, email, uniqueID, pass, city, bloodGroup, organ } = req.body;
    
    const sql = "INSERT INTO donor_data (name, email, uniqueID, pass, city, bloodGroup, organ) VALUES (?, ?, ?, ?, ?, ?, ?)";

    db.query(sql, [name, email, uniqueID, pass, city, bloodGroup, organ], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).send("Internal Server Error");
        }
        res.redirect("/existingconditions"); // Redirect after successful insertion
    });
});

app.post("/submitPrecondition", (req, res) => {
    const { uniqueID,diabetes, bp_condition, obese, cardiac_surgery } = req.body;
    // const uniqueID = 1; // Replace with dynamic uniqueID if needed

    const sql = "INSERT INTO donor_health (uniqueID, diabetes, bp_condition, obese, cardiac_surgery) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [uniqueID, diabetes, bp_condition, obese, cardiac_surgery], (err, result) => {
        if (err) throw err;
        res.redirect("/"); // Redirect to index.html after successful insertion
    });
});

app.post("/loginCheck", (req, res) => {
    const { uniqueID, pass } = req.body;
    const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";

    db.query(sql, [uniqueID, pass], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }
        if (result.length > 0) {
            console.log("Login successful for uniqueID:", uniqueID);
            res.redirect("/dashboard");
        } else {
            res.status(401).send("Invalid Unique ID or Password");
        }
    });
});

app.get("/dashboard", (req, res) =>{
    res.sendFile(__dirname + "/dashboard.html");
})

// app.get("/dashboardContent", (req, res) => {
//     const sql = "SELECT organ, bloodGroup, city FROM donor_data"; // Ensure correct column names

//     db.query(sql, (err, result) => {
//         if (err) {
//             console.error("Database error:", err);
//             return res.status(500).send("Internal Server Error");
//         }

//         console.log("Fetched donors:", result); // Debugging line to verify query results

//         res.render("dashboard", { donors: result }); // Pass retrieved data to EJS template
//     });
// });


app.get("/dashboardContent", (req, res) => {
    const { organ, bloodGroup, city } = req.query; // Get selected values from URL parameters

    const sql = "SELECT uniqueID, email FROM donor_data WHERE organ = ? AND bloodGroup = ? AND city = ?";

    db.query(sql, [organ, bloodGroup, city], (err, result) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).send("Internal Server Error");
        }

        console.log("Filtered Results:", result); // Debugging: Check fetched data

        res.render("dashboardContent", { donors: result }); // Pass filtered data to EJS
    });
});


app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});