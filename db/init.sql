CREATE DATABASE IF NOT EXISTS rigpro;
USE rigpro;

-- 1. Users table for login
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Note: The hash below is for the password: 'password123'
INSERT INTO users (username, password_hash, role) VALUES 
('scott', '$2b$10$EP036Bf3FHzqQ2z8B1ZtO.QoV4I4I3B1M6b622K9bL0W2l/S5M2c6', 'admin'),
('admin', '$2b$10$EP036Bf3FHzqQ2z8B1ZtO.QoV4I4I3B1M6b622K9bL0W2l/S5M2c6', 'admin');

-- 2. Base Labor Rates
CREATE TABLE IF NOT EXISTS base_labor (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role VARCHAR(50) NOT NULL,
    reg_rate DECIMAL(10, 2) NOT NULL,
    ot_rate DECIMAL(10, 2) NOT NULL,
    cost_reg DECIMAL(10, 2) NOT NULL,
    cost_ot DECIMAL(10, 2) NOT NULL
);

INSERT INTO base_labor (role, reg_rate, ot_rate, cost_reg, cost_ot) VALUES
('Foreman', 88.00, 132.00, 48.07, 66.09),
('Rigger', 83.50, 125.25, 46.79, 64.81),
('Labor', 78.00, 117.00, 42.96, 58.73),
('Operator', 83.50, 125.25, 46.79, 64.81),
('CDL Driver', 78.00, 117.00, 42.96, 58.73);

-- 3. Equipment
CREATE TABLE IF NOT EXISTS equipment (
    code VARCHAR(20) PRIMARY KEY,
    category VARCHAR(50) NOT NULL,
    name VARCHAR(100) NOT NULL,
    capacity VARCHAR(50),
    daily_rate DECIMAL(10, 2) NOT NULL
);

INSERT INTO equipment (code, category, name, capacity, daily_rate) VALUES
('242', 'Forklift', '2000 Gradall 534D-9', '9,000 lb', 790.00),
('300', 'Forklift', 'Caterpillar GC35K', '15,500 lb', 840.00),
('301', 'Forklift', 'HysterS80XLBCS', '8,000 lb', 530.00),
('302', 'Forklift', 'Cat125D 12,500 LB Forklift', '12,500 lb', 850.00),
('308', 'Forklift', 'Cat T150D 15,000 LB Forklift', '15,000 lb', 950.00),
('320', 'Forklift', 'Royal T300B 30,000 lb', '30,000 lb', 1100.00),
('322', 'Forklift', 'Rigger''s Special 80-100k', '100,000 lb', 1200.00),
('237', 'Aerial Lift', 'Skyjack SJ3226', '–', 250.00),
('251', 'Aerial Lift', 'JLG 450AJ Lift', '–', 525.00),
('254', 'Aerial Lift', 'JLG 600S Boom', '–', 650.00),
('255', 'Aerial Lift', '2013 Skyjack SJ4632', '–', 375.00),
('259', 'Aerial Lift', '2015 Skyjack SJ3219', '–', 155.00),
('250', 'Crane', '2005 Broderson IC-200-3F 30-Ton Carry Deck', '30,000 lb', 1000.00),
('257', 'Crane', 'Broderson IC80-2D 17,000 lb Carry Deck', '17,000 lb', 750.00),
('RP8x10', 'Misc', '8''x10'' Steel Road Plates', '–', 90.00),
('RP4x10', 'Misc', '4''x10'' Steel Road Plates', '–', 90.00),
('RP8x12', 'Misc', '8''x12'' Steel Road Plates', '–', 90.00),
('RP8x20', 'Misc', '8''x20'' Steel Road Plates', '–', 100.00),
('GANG', 'Tools', 'Gang Box Charge', '–', 50.00),
('CONEX', 'Tools', 'Conex Job Trailer', '–', 50.00),
('TORCH', 'Tools', 'Torch Outfit', '–', 50.00),
('100D', 'Truck', '2007 Inter 9200 Tractor', '–', 1000.00),
('110D', 'Truck', '2008 Landall Trailer', '–', 1000.00),
('111D', 'Truck', '1999 Fontaine Flatbed Trailer', '–', 1000.00),
('SEMI', 'Truck', 'Semi Truck and Trailer', '–', 1000.00),
('CONE', 'Truck', 'Semi Truck and Conestoga', '–', 1500.00),
('PICK', 'Truck', 'Pickup Truck', '–', 125.00);

-- 4. Customers
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    notes TEXT,
    billing_address VARCHAR(255),
    website VARCHAR(100),
    industry VARCHAR(100),
    payment_terms VARCHAR(50),
    account_num VARCHAR(50)
);

INSERT INTO customers (name, notes, billing_address, website, industry, payment_terms, account_num) VALUES
('Apex Industrial LLC', 'Long-term client since 2019. Always pays on time.', '1200 Industrial Pkwy, Akron, OH 44312', 'www.apexindustrial.com', 'Heavy Manufacturing', 'Net 30', 'APX-001'),
('Beacon Manufacturing Co.', 'Mid-size shop. Multiple locations. Carolyn handles all rigging requests.', '500 Commerce Blvd, Dayton, OH 45402', 'www.beaconmfg.com', 'Precision Manufacturing', 'Net 45', 'BCN-002'),
('Cornerstone Plastics Inc.', 'Growing account. New facility planned for 2026.', '800 Factory Dr, Columbus, OH 43219', '', 'Plastics Manufacturing', 'Net 30', 'CRN-003'),
('Delta Fabrication Group', 'Competitive bidding environment. Price-sensitive.', '300 Metalworks Ave, Cleveland, OH 44124', 'www.deltafab.com', 'Metal Fabrication', 'Net 30', 'DLT-004'),
('Eagle Press & Die', 'Excellent relationship. Repeat business every quarter.', '500 Eagle Way, Canton, OH 44702', 'www.eaglepress.com', 'Press & Die Manufacturing', 'Net 15', 'EGL-005'),
('Frontier Castings Ltd.', 'Union shop. Require certified rigging documentation.', '900 Industrial Blvd, Youngstown, OH 44503', '', 'Metal Casting', 'Net 45', 'FRT-006');

-- 5. Customer Contacts
CREATE TABLE IF NOT EXISTS customer_contacts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    name VARCHAR(100) NOT NULL,
    title VARCHAR(100),
    email VARCHAR(100),
    phone VARCHAR(50),
    is_primary BOOLEAN DEFAULT false,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

INSERT INTO customer_contacts (customer_id, name, title, email, phone, is_primary) VALUES
(1, 'James Whitfield', 'Plant Manager', 'j.whitfield@apexind.com', '330-555-0182', true),
(1, 'Rick Torres', 'Maintenance Supervisor', 'r.torres@apexind.com', '330-555-0199', false),
(2, 'Carolyn Marsh', 'Facilities Director', 'c.marsh@beaconmfg.com', '937-555-0244', true),
(2, 'Doug Hensley', 'Maintenance Manager', 'd.hensley@beaconmfg.com', '937-555-0280', false),
(3, 'Pat Gilmore', 'Operations Manager', 'p.gilmore@cornerstone.com', '614-555-0312', true),
(4, 'Sandra Voss', 'Purchasing Manager', 's.voss@deltafab.com', '216-555-0415', true),
(5, 'Bob Trexler', 'VP Operations', 'b.trexler@eaglepress.com', '330-555-0311', true),
(5, 'Lisa Brandt', 'Plant Engineer', 'l.brandt@eaglepress.com', '330-555-0322', false),
(6, 'Tony Ruiz', 'Safety & Facilities', 't.ruiz@frontiercasting.com', '330-555-0518', true),
(6, 'Angela Kim', 'Project Coordinator', 'a.kim@frontiercasting.com', '330-555-0530', false);

-- 6. Quotes / Estimates (Basic table to hold active list)
CREATE TABLE IF NOT EXISTS quotes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    quote_number VARCHAR(20) NOT NULL,
    customer_name VARCHAR(100) NOT NULL,
    job_site VARCHAR(255),
    description TEXT,
    date DATE,
    status VARCHAR(50),
    quote_type VARCHAR(50),
    labor DECIMAL(10,2),
    equip DECIMAL(10,2),
    hauling DECIMAL(10,2),
    travel DECIMAL(10,2),
    materials DECIMAL(10,2),
    total DECIMAL(10,2),
    markup DECIMAL(10,2),
    sales_assoc VARCHAR(50),
    job_num VARCHAR(50),
    start_date DATE,
    comp_date DATE,
    is_locked BOOLEAN DEFAULT false,
    notes TEXT
);

INSERT INTO quotes (id, quote_number, customer_name, job_site, description, date, status, quote_type, total, markup, sales_assoc, job_num, start_date, comp_date, is_locked) VALUES
(1, 'RIG-2024-001', 'Apex Industrial LLC', '1200 Industrial Pkwy, Akron, OH 44312', 'Press line relocation – Bay 4', '2024-11-12', 'Won', 'Contract', 84200.00, 0, 'Dan M', 'J-2024-112', '2026-03-17', '2026-03-22', true),
(2, 'RIG-2024-008', 'Apex Industrial LLC', '1200 Industrial Pkwy, Akron, OH 44312', 'Overhead crane installation – Bay 7', '2024-08-20', 'Won', 'Contract', 112000.00, 0.08, 'Dan M', 'J-2024-088', '2026-04-07', '2026-04-12', true),
(3, 'RIG-2025-007', 'Apex Industrial LLC', '1200 Industrial Pkwy, Akron, OH 44312', 'Injection mold press relocation', '2025-02-10', 'Submitted', 'T&M', 54100.00, 0.05, 'Sarah K', '', NULL, NULL, false),
(4, 'RIG-2024-002', 'Beacon Manufacturing Co.', '500 Commerce Blvd, Dayton, OH 45402', 'Hydraulic press installation', '2024-12-01', 'Submitted', 'Contract', 142500.00, 0, 'Sarah K', '', NULL, NULL, false),
(5, 'RIG-2024-011', 'Beacon Manufacturing Co.', '500 Commerce Blvd, Dayton, OH 45402', 'CNC lathe bank relocation – Bldg B', '2024-09-15', 'Won', 'Contract', 71600.00, 0.07, 'Sarah K', 'J-2024-095', '2026-03-24', '2026-03-27', true),
(6, 'RIG-2025-003', 'Beacon Manufacturing Co.', '500 Commerce Blvd, Dayton, OH 45402', 'Transformer set – electrical bay', '2025-01-22', 'Draft', 'T&M', 48300.00, 0, 'Mike R', '', NULL, NULL, false);

