const express = require("express");
const mysql = require("mysql2"); 
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

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
    password: "SQL&NeuroBytes",
    database: "dbb"
});


db.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL!");

    // Run Table Creation Queries on Server Startup
    const createDonorData = `
        CREATE TABLE IF NOT EXISTS donor_data (
            name VARCHAR(50),
            email VARCHAR(50),
            uniqueID INT PRIMARY KEY, 
            pass varchar(50),
            phone VARCHAR(10),
            address VARCHAR(100), 
            city VARCHAR(15)
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

    // Execute the queries
    db.query(createDonorData, (err, result) => {
        if (err) throw err;
        console.log("Table `donor_data` ensured.");
    });

    db.query(createDonorHealth, (err, result) => {
        if (err) throw err;
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


app.post("/submit", (req, res) => {
    const { name, email, uniqueID, pass, phone, address, city } = req.body;
    const sql = "INSERT INTO donor_data (name, email, uniqueID, pass, phone, address, city) VALUES (?, ?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [name, email, uniqueID,pass, phone, address, city], (err, result) => {
        if (err) throw err;
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

app.post("/loginCheck", (req, res)=>{
    const{uniqueID, pass} = req.body;
    const sql = "SELECT * FROM donor_data WHERE uniqueID = ? AND pass = ?";
    db.query(sql, [uniqueID, pass], (err, result)=>{
        if(err) throw err;
        if(result.length >0){
            console.log("Login successful for uniqueID:", uniqueID);
            res.redirect("/dashboard");
        }
    })
})

app.get("/dashboard", (req, res) =>{
    res.sendFile(__dirname + "/dashboard.ejs");
})


app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});