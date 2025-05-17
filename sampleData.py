# NOTE  run this by::
# python sampleData.py > sampleData.sql


#sample data is created for 1000 users ensuring that govtID, aadharID, phone number and email are unique
# The code generates sample data for a database of users, including their personal information, organ transplant status, and health conditions.
# Transplanted organs are not eligible for donation.
# user cannot donate more than 3 organs
# user age is between 18 and 59



import random
import string

# Expanded Indian-style names
first_names = [
    "Aarav", "Vivaan", "Aditya", "Vihaan", "Arjun", "Sai", "Karthik", "Riya",
    "Ashish", "Diya", "Isha", "Neha", "Rohan", "Saanvi", "Anjali", "Pranav",
    "Lakshmi", "Manish", "Divya", "Nikhil", "Pooja", "Kavya", "Raj", "Simran"
]

last_names = [
    "Patel", "Sharma", "Reddy", "Naidu", "Kumar", "Mehta", "Joshi", "Verma",
    "Kapoor", "Bose", "Singh", "Gupta", "Malhotra", "Chatterjee", "Iyer",
    "Nair", "Desai", "Rao", "Joshi", "Bhat", "Das", "Khan", "Dutta", "Mishra"
]

cities = ['Mysore', 'Bangalore', 'Chikmagalur', 'Kolar']
genders = ['Male', 'Female']
blood_groups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
organs = ['kidney', 'liver', 'lung', 'intestine', 'pancreas']

def generate_email(name, num):
    email_name = name.lower().replace(' ', '') + str(num)
    return f"{email_name}@gmail.com"

def random_phone(existing_phones):
    while True:
        phone = ''.join(random.choices(string.digits, k=10))
        if phone not in existing_phones:
            existing_phones.add(phone)
            return phone

def generate_organ_flags(max_organs, exclude=[]):
    available = [o for o in organs if o not in exclude]
    count = random.randint(0, min(max_organs, len(available)))
    chosen = random.sample(available, count)
    return {o: (1 if o in chosen else 0) for o in organs}

govt_ids = set()
aadhar_ids = set()
phones = set()
emails = set()

user_data_values = []
transplanted_values = []
donor_values = []
dependants_values = []
health_values = []

# Step 1: Generate 1000 users
dependants_per_user = {}
for uniqueID in range(1, 5001):
    fname = random.choice(first_names)
    lname = random.choice(last_names)
    full_name = f"{fname} {lname}"

    while True:
        govtID = random.randint(100000000000, 999999999999)
        if govtID not in govt_ids:
            govt_ids.add(govtID)
            break

    phone = random_phone(phones)

    email = generate_email(full_name, uniqueID)
    while email in emails:
        email = generate_email(full_name, random.randint(100, 9999))
    emails.add(email)

    age = random.randint(18, 59)
    gender = random.choice(genders)
    city = random.choice(cities)
    blood_group = random.choice(blood_groups)
    password = "hashed_password"

    user_data_values.append(
        f"({uniqueID}, {govtID}, '{full_name}', '{email}', '{phone}', '{password}', {age}, '{gender}', '{city}', '{blood_group}')"
    )

    transplanted = generate_organ_flags(max_organs=3)
    transplanted_values.append(
        f"({uniqueID}, {transplanted['kidney']}, {transplanted['liver']}, {transplanted['lung']}, {transplanted['intestine']}, {transplanted['pancreas']})"
    )

    donor = generate_organ_flags(max_organs=3, exclude=[o for o,v in transplanted.items() if v == 1])
    donor_values.append(
        f"({uniqueID}, {donor['kidney']}, {donor['liver']}, {donor['lung']}, {donor['intestine']}, {donor['pancreas']})"
    )

    # Assign 0–5 total dependants, but only one will be detailed
    num_dependants = random.randint(1, 7)
    dependants_per_user[uniqueID] = num_dependants

# Step 2: Create only one dependant per user, include total count
dependant_id_counter = 1
for uniqueID in range(1, 5001):
    total_dependants = dependants_per_user[uniqueID]

    # Generate a single primary dependant
    dep_fname = random.choice(first_names)
    dep_lname = random.choice(last_names)
    dep_name = f"{dep_fname} {dep_lname}"
    dep_age = random.randint(1, 70)

    while True:
        dep_aadhar = random.randint(100000000000, 999999999999)
        if dep_aadhar not in aadhar_ids:
            aadhar_ids.add(dep_aadhar)
            break

    dependants_values.append(
        f"({dependant_id_counter}, {uniqueID}, '{dep_name}', {dep_aadhar}, {dep_age}, {total_dependants})"
    )

    diabetes = random.randint(0, 1)
    bp_condition = random.randint(0, 1)
    obese = random.randint(0, 1)
    cardiac_surgery = random.randint(0, 1)
    healthApproval = random.randint(0, 1)

    health_values.append(
        f"({dependant_id_counter}, {diabetes}, {bp_condition}, {obese}, {cardiac_surgery}, {healthApproval})"
    )

    dependant_id_counter += 1

# Step 3: Output bulk INSERTs
print("INSERT INTO user_data (uniqueID, govtID, name, email, phone, pass, age, gender, city, bloodGroup) VALUES")
print(",\n".join(user_data_values) + ";")

print("\nINSERT INTO transplanted_organs (uniqueID, kidney, liver, lung, intestine, pancreas) VALUES")
print(",\n".join(transplanted_values) + ";")

print("\nINSERT INTO donor_organs (uniqueID, kidney, liver, lung, intestine, pancreas) VALUES")
print(",\n".join(donor_values) + ";")

print("\nINSERT INTO userDependants (dependantID, uniqueID, dependantName, dependantAadhar, dependantAge, totalDependants) VALUES")
print(",\n".join(dependants_values) + ";")

print("\nINSERT INTO userHealth (dependantID, diabetes, bp_condition, obese, cardiac_surgery, healthApproval) VALUES")
print(",\n".join(health_values) + ";")
