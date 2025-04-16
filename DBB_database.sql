create database dbb;
use dbb;
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'SQL&NeuroBytes';
FLUSH PRIVILEGES;

-- CREATE TABLE IF NOT EXISTS donor_data (
--     name VARCHAR(50),
--     email VARCHAR(50),
--     uniqueID INT PRIMARY KEY,  -- Must match the child table's foreign key type
--     pass varchar(8),
--     phone VARCHAR(10),
--     address VARCHAR(100), 
--     city VARCHAR(15)
-- );

CREATE TABLE IF NOT EXISTS donor_data (
    name VARCHAR(50) NOT NULL,
    email VARCHAR(50) UNIQUE NOT NULL,
    uniqueID INT PRIMARY KEY,  -- Unique identifier for donors
    pass VARCHAR(8) NOT NULL,  -- Password (consider hashing for security)
    -- phone VARCHAR(10),  -- Optional field for future use
    -- address VARCHAR(100),  -- Optional field
    city VARCHAR(15) NOT NULL,  -- City selection
    bloodGroup VARCHAR(3) NOT NULL,  -- Blood group selection
    -- gender ENUM('Male', 'Female', 'Other') NOT NULL,  -- Gender selection
    -- age INT CHECK (age >= 18),  -- Age constraint (ensuring adult donors)
    -- nearest_hospital VARCHAR(100),  -- Optional, nearest hospital
    organ ENUM('Kidney', 'Liver', 'Lung', 'Intestine', 'Pancreas') NOT NULL  -- Organ willing to donate
    -- registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP  -- Track registration time
);

CREATE TABLE IF NOT EXISTS donor_health (
    uniqueID INT,  -- Ensure this matches `uniqueID` in `donor_data`
    diabetes TINYINT,  -- 0 = No, 1 = Yes
    bp_condition TINYINT,  -- 0 = None, 1 = Hypertension, 2 = Hypotension
    obese TINYINT,  -- 0 = No, 1 = Yes
    cardiac_surgery TINYINT,  -- 0 = No, 1 = Yes
    FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
);
select * from donor_data;
select * from donor_health;

drop table donor_data; 
drop table donor_health;
