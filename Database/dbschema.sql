-- Create Database
CREATE DATABASE travel_platform;
USE travel_platform;

-- USERS
CREATE TABLE users (
    uid INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phno VARCHAR(15) UNIQUE,
    address TEXT,
    gender VARCHAR(10),
    dob DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL
);

-- ADMIN
CREATE TABLE admin (
    admin_id INT PRIMARY KEY,
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    user_id INT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- TRAVELLER
CREATE TABLE traveller (
    traveller_id INT PRIMARY KEY,
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    user_id INT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- GUIDE
CREATE TABLE guide (
    guide_id INT PRIMARY KEY,
    language VARCHAR(50) NOT NULL,
    expertise_area VARCHAR(100),
    guide_availability BOOLEAN DEFAULT TRUE,
    price DECIMAL(10,2) CHECK(price >= 0),
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    earning DECIMAL(10,2) DEFAULT 0 CHECK (earning >= 0),
    bio TEXT,
    user_id INT NOT NULL UNIQUE,
    FOREIGN KEY (user_id) REFERENCES users(uid) ON DELETE CASCADE
);

-- SERVICE PARTNER
CREATE TABLE service_partner (
    service_id INT AUTO_INCREMENT PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    service_type VARCHAR(100) NOT NULL,
    location VARCHAR(100),
    price_table TEXT,
    availability_table TEXT,
    rating DECIMAL(3,2) DEFAULT 0 CHECK (rating BETWEEN 0 AND 5),
    bio TEXT
);

-- SERVICE PARTNER STAFF
CREATE TABLE sp_staff (
    sp_staff_id INT AUTO_INCREMENT PRIMARY KEY,
    sp_staff_name VARCHAR(100) NOT NULL,
    sp_staff_email VARCHAR(100) UNIQUE NOT NULL,
    sp_staff_phno VARCHAR(15),
    joined_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    sp_staff_username VARCHAR(50) UNIQUE NOT NULL,
    sp_staff_pass_hash VARCHAR(255) NOT NULL,
    service_id INT NOT NULL,
    FOREIGN KEY (service_id) REFERENCES service_partner(service_id) ON DELETE CASCADE
);

-- SYSTEM ROLE
CREATE TABLE system_role (
    system_role_id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(50) UNIQUE NOT NULL,
    description TEXT
);

-- USER SYSTEM ROLE
CREATE TABLE user_system_role (
    user_system_role_id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    system_role_id INT NOT NULL,
    assigned_by INT NOT NULL,
    assigned_date DATE DEFAULT CURRENT_DATE,
    FOREIGN KEY (user_id) REFERENCES users(uid),
    FOREIGN KEY (system_role_id) REFERENCES system_role(system_role_id),
    FOREIGN KEY (assigned_by) REFERENCES admin(admin_id)
);

-- PLAN
CREATE TABLE plan (
    plan_id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    location_id INT NOT NULL,
    plan_title VARCHAR(100) NOT NULL,
    plan_price DECIMAL(10,2) CHECK (plan_price >= 0),
    FOREIGN KEY (location_id) REFERENCES location(location_id) DELETE ON CASCADE
);

-- TRIP
CREATE TABLE trip (
    trip_id INT AUTO_INCREMENT PRIMARY KEY,
    plan_id INT NOT NULL,
    source VARCHAR(100),
    destination VARCHAR(100),
    title VARCHAR(100),
    price DECIMAL(10,2) CHECK (price >= 0),
    start_date DATE NOT NULL,
    end_date DATE,
    trip_status VARCHAR(50) DEFAULT 'planned',
    CHECK (end_date IS NULL OR end_date >= start_date),
    FOREIGN KEY (plan_id) REFERENCES plan(plan_id)
);

-- ITINERARY
CREATE TABLE itinerary (
    itinerary_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    activity TEXT NOT NULL,
    date DATE,
    status VARCHAR(50),
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id)
);

-- PAYMENTS
CREATE TABLE payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL CHECK(amount > 0),
    payment_method VARCHAR(50) NOT NULL,
    payment_status VARCHAR(50) DEFAULT 'pending',
    payment_date DATE,
    payment_time_stamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id)
);

-- BANK DETAILS
CREATE TABLE bank_details (
    account_no VARCHAR(30) PRIMARY KEY,
    account_holder VARCHAR(100) NOT NULL,
    IFSC_code VARCHAR(20) NOT NULL,
    service_id INT UNIQUE NOT NULL,
    FOREIGN KEY (service_id) REFERENCES service_partner(service_id)
);

-- RATINGS & REVIEWS
CREATE TABLE ratings_reviews (
    review_id INT AUTO_INCREMENT PRIMARY KEY,
    reviewer_user_id INT NOT NULL,
    reviewed_user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    date DATE DEFAULT CURRENT_DATE,
    CHECK (reviewer_user_id <> reviewed_user_id),
    FOREIGN KEY (reviewer_user_id) REFERENCES users(uid),
    FOREIGN KEY (reviewed_user_id) REFERENCES users(uid)
);

-- CONVERSATION
CREATE TABLE conversation (
    conversation_id INT AUTO_INCREMENT PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    sender_id INT NOT NULL,
    reciver_id INT NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (reciver_id) REFERENCES users(uid),
    FOREIGN KEY (sender_id) REFERENCES users(uid)
);

-- MESSAGE
CREATE TABLE message (
    message_id INT AUTO_INCREMENT PRIMARY KEY,
    conversation_id INT NOT NULL,
    message_text TEXT NOT NULL,
    message_time_stamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversation(conversation_id)
);

-- TRACKING SESSION
CREATE TABLE tracking_session 
    tracking_session_id INT AUTO_INCREMENT PRIMARY KEY,
    trip_id INT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    tracking_status VARCHAR(50) DEFAULT 'active',
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id)
);

-- LIVE LOCATION
CREATE TABLE live_location (
    live_location_id INT AUTO_INCREMENT PRIMARY KEY,
    tracking_session_id INT NOT NULL,
    latitude DECIMAL(10,7) NOT NULL,
    longitude DECIMAL(10,7) NOT NULL,
    current_time_stamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    accuracy FLOAT CHECK (accuracy >= 0),
    FOREIGN KEY (tracking_session_id) REFERENCES tracking_session(tracking_session_id)
);

-- CONTENT REPORT
CREATE TABLE content_report (
    report_id INT AUTO_INCREMENT PRIMARY KEY,
    reason TEXT NOT NULL,
    report_user_id INT NOT NULL,
    report_status VARCHAR(50) DEFAULT 'pending',
    review_admin_id INT,
    report_guide_id INT,
    report_service_partner_id INT,
    review_notes TEXT,
    FOREIGN KEY (report_user_id) REFERENCES users(uid),
    FOREIGN KEY (review_admin_id) REFERENCES admin(admin_id),
    FOREIGN KEY (report_service_partner_id) REFERENCES service_partner(service_id),
    FOREIGN KEY (report_guide_id) REFERENCES guide(guide_id)
);

-- SUPPORT TICKET
CREATE TABLE support_ticket (
    ticket_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_type VARCHAR(100) NOT NULL,
    description TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'open',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    assigned_admin INT,
    user_id INT NOT NULL,
    FOREIGN KEY (assigned_admin) REFERENCES admin(admin_id),
    FOREIGN KEY (user_id) REFERENCES users(uid)

);

-- LOCATION
CREATE TABLE location (
    location_id INT AUTO_INCREMENT PRIMARY KEY,
    location_name VARCHAR(100) NOT NULL,

);

-- PROPOSAL
CREATE TABLE proposal (
    proposal_id INT AUTO_INCREMENT PRIMARY KEY,
    proposal_status VARCHAR(50) DEFAULT 'pending',
    proposal_details TEXT NOT NULL,
    trip_id INT NOT NULL,
    uid INT NOT NULL,
    FOREIGN KEY (trip_id) REFERENCES trip(trip_id) DELETE ON CASCADE,
    FOREIGN KEY (uid) REFERENCES users(uid)
);

--SERVICE PATNER ROLES
CREATE TABLE sp_role (
    sp_role_id INT AUTO_INCREMENT PRIMARY KEY,
    assined_access VARCHAR(100),
    assined_date DATE,
    sp_admin_id INT NOT NULL,
    sp_staff_id INT NOT NULL,
    FOREIGN KEY (sp_admin_id) REFERENCES users(uid),
    FOREIGN KEY (sp_staff_id) REFERENCES sp_staff(sp_staff_id) DELETE ON CASCADE,
    );
