# Organ Donation Database Project

## Overview
This project aims to create a **user-friendly interface** for tracking organ donation availability. It is currently under development, following agile principles, and will be continuously refined and enhanced in future commits to improve functionality and user experience.

## Features
- **Secure Donor Registration**: Users can sign up with essential details, including unique identification, location, and organ donation preferences.
- **Health Condition Tracking**: Stores health-related information of donors, ensuring eligibility for donations.
- **Organ Availability Filtering**: Enables quick retrieval of donor data based on specific criteria such as blood group, city, and organ type.
- **Authentication System**: Login functionality to manage donor data securely.
- **Dynamic Dashboard**: Displays donor records based on various selection combinations.

## Technologies Used
- **Node.js & Express**: Backend framework for server-side operations.
- **MySQL**: Database for storing donor and health condition records.
- **EJS**: Used for rendering dynamic views.
- **HTML**: Frontend structure for user interface.
- **CSS**: Styling for a visually appealing UI.
- **Bootstrap**: Enhances responsive design and usability.

<!--
## Database Schema
### `donor_data` Table
Stores donor information including:
- `name` (VARCHAR) - Donor's full name
- `email` (VARCHAR, UNIQUE) - Email for identification
- `uniqueID` (INT, PRIMARY KEY) - Unique identifier
- `pass` (VARCHAR) - Password (consider hashing for security)
- `city` (VARCHAR) - City of residence
- `bloodGroup` (VARCHAR) - Blood group for compatibility
- `organ` (ENUM) - Organ donation preference

### `donor_health` Table
Stores health-related conditions of donors:
- `uniqueID` (INT, FOREIGN KEY) - Links to donor_data
- `diabetes` (TINYINT) - Whether the donor has diabetes
- `bp_condition` (TINYINT) - Blood pressure condition
- `obese` (TINYINT) - Obesity status
- `cardiac_surgery` (TINYINT) - Prior cardiac surgeries
-->

## Project Status

This project is currently under development, following agile principles. It will be continuously refined and enhanced in future commits to improve functionality and user experience.

## Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/OrganDonation-DatabaseProject.git
   cd OrganDonation-DatabaseProject


 I’m open to more ideas! If you notice any flaws, I’d love to hear your thoughts
