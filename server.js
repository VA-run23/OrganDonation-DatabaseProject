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

app.post("/submit", (req, res) => {
    const { name, email } = req.body;
    const sql = "INSERT INTO donor_data (name, email) VALUES (?, ?)";
    
    db.query(sql, [name, email], (err, result) => {
        if (err) throw err;
        res.send("Data inserted successfully!");
    });
});

app.listen(3000, () => {
    console.log("Server running on http://localhost:3000");
});