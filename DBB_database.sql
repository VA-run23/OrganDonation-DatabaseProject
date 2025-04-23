create database dbb;
use dbb;
SHOW TABLES;
-- IMPORTANT::: if any problem arises, replace the "mysql _native_password" with real password
-- ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password;
-- FLUSH PRIVILEGES;

CREATE TABLE IF NOT EXISTS donor_data (
    uniqueID INT AUTO_INCREMENT PRIMARY KEY,  -- System-generated unique ID
    govtID BIGINT NOT NULL UNIQUE CHECK (govtID BETWEEN 100000000000 AND 999999999999),  -- Ensuring a 12-digit numeric government ID
    name VARCHAR(50) ,
    email VARCHAR(50) UNIQUE  CHECK (email LIKE '%@%.%'),  -- Basic format validation for email
    pass VARCHAR(255) ,  -- Store hashed passwords in production
    age INT  CHECK (age >= 1),  -- Ensuring age is at least 1
    gender ENUM('Male', 'Female') ,  -- Limited selection for valid gender options
    city ENUM('Mysore', 'Bangalore', 'Chikmagalur', 'Kolar') ,  -- Limit cities to predefined options
    bloodGroup ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') ,  -- Limited selection for valid blood groups
    kidney TINYINT(1) DEFAULT 0 CHECK (kidney IN (0,1)),  -- Boolean value for organ donation
    liver TINYINT(1) DEFAULT 0 CHECK (liver IN (0,1)),
    lung TINYINT(1) DEFAULT 0 CHECK (lung IN (0,1)),
    intestine TINYINT(1) DEFAULT 0 CHECK (intestine IN (0,1)),
    pancreas TINYINT(1) DEFAULT 0 CHECK (pancreas IN (0,1)),
    lastUpdated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS donor_health_dependants (
    uniqueID INT PRIMARY KEY,  -- Matches `uniqueID` in `donor_data`
    diabetes TINYINT,  -- 0 = No, 1 = Yes
    bp_condition TINYINT,  -- 0 = None, 1 = Hypertension, 2 = Hypotension
    obese TINYINT,  -- 0 = No, 1 = Yes
    cardiac_surgery TINYINT,  -- 0 = No, 1 = Yes
    dependantName VARCHAR(255) NOT NULL,
    dependantAadhar BIGINT NOT NULL UNIQUE, -- Ensures uniqueness
    dependantAge INT NOT NULL,
    totalDependants INT NOT NULL,
	healthApproval TINYINT NOT NULL, -- Ensures health approval is provided
    FOREIGN KEY (uniqueID) REFERENCES donor_data(uniqueID) ON DELETE CASCADE
);


select * from donor_data;
select * from donor_health_dependants;

desc donor_data;
desc donor_health_dependants;

drop table donor_data; 
drop table donor_health_dependants;

