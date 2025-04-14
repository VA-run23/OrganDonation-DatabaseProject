const express = require("express");
const mysql = require("mysql2"); 
const bodyParser = require("body-parser");

const app = express();
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
    res.sendFile(__dirname + "/signup.html");
});

const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "SQL&NeuroBytes",
    database: "dbb"
});

db.connect((err) => {
    if (err) throw err;
    console.log("Connected to MySQL!");
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
    const { name, email, uniqueID, phone, address, city } = req.body;
    const sql = "INSERT INTO donor_data (name, email, uniqueID, phone, address, city) VALUES (?, ?, ?, ?, ?, ?)";
    
    db.query(sql, [name, email, uniqueID, phone, address, city], (err, result) => {
        if (err) throw err;
        res.redirect("/existingconditions.html"); // Redirect after successful insertion
    });
});

app.post("/submitPrecondition", (req, res) => {
    const { diabetes, bp_condition, obese, cardiac_surgery } = req.body;
    const donorID = 1; // Replace with dynamic donorID if needed

    const sql = "INSERT INTO donor_health (donorID, diabetes, bp_condition, obese, cardiac_surgery) VALUES (?, ?, ?, ?, ?)";

    db.query(sql, [donorID, diabetes, bp_condition, obese, cardiac_surgery], (err, result) => {
        if (err) throw err;
        res.redirect("/index.html"); // Redirect to index.html after successful insertion
    });
});


app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});