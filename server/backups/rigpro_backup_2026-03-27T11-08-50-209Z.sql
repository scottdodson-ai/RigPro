/*M!999999\- enable the sandbox mode */ 
-- MariaDB dump 10.19-11.4.9-MariaDB, for Linux (aarch64)
--
-- Host: db    Database: rigpro
-- ------------------------------------------------------
-- Server version	8.0.45

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*M!100616 SET @OLD_NOTE_VERBOSITY=@@NOTE_VERBOSITY, NOTE_VERBOSITY=0 */;

--
-- Table structure for table `admin_tasks`
--

DROP TABLE IF EXISTS `admin_tasks`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `admin_tasks` (
  `id` int NOT NULL AUTO_INCREMENT,
  `text` varchar(255) NOT NULL,
  `done` tinyint(1) DEFAULT '0',
  `subnotes` json DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admin_tasks`
--

LOCK TABLES `admin_tasks` WRITE;
/*!40000 ALTER TABLE `admin_tasks` DISABLE KEYS */;
INSERT INTO `admin_tasks` VALUES
(1,'Test',0,'[\"test note\", \"test note2 \"]','2026-03-27 10:07:53'),
(2,'testTask2',0,'[\"test2\"]','2026-03-27 11:03:11');
/*!40000 ALTER TABLE `admin_tasks` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `base_labor`
--

DROP TABLE IF EXISTS `base_labor`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `base_labor` (
  `id` int NOT NULL AUTO_INCREMENT,
  `role` varchar(50) NOT NULL,
  `reg_rate` decimal(10,2) NOT NULL,
  `ot_rate` decimal(10,2) NOT NULL,
  `cost_reg` decimal(10,2) NOT NULL,
  `cost_ot` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `base_labor`
--

LOCK TABLES `base_labor` WRITE;
/*!40000 ALTER TABLE `base_labor` DISABLE KEYS */;
INSERT INTO `base_labor` VALUES
(1,'Foreman',88.00,132.00,48.07,66.09),
(2,'Rigger',83.50,125.25,46.79,64.81),
(3,'Labor',78.00,117.00,42.96,58.73),
(4,'Operator',83.50,125.25,46.79,64.81),
(5,'CDL Driver',78.00,117.00,42.96,58.73);
/*!40000 ALTER TABLE `base_labor` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customer_contacts`
--

DROP TABLE IF EXISTS `customer_contacts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customer_contacts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `customer_id` int NOT NULL,
  `name` varchar(100) NOT NULL,
  `title` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `is_primary` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `customer_id` (`customer_id`),
  CONSTRAINT `customer_contacts_ibfk_1` FOREIGN KEY (`customer_id`) REFERENCES `customers` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customer_contacts`
--

LOCK TABLES `customer_contacts` WRITE;
/*!40000 ALTER TABLE `customer_contacts` DISABLE KEYS */;
INSERT INTO `customer_contacts` VALUES
(1,1,'James Whitfield','Plant Manager','j.whitfield@apexind.com','330-555-0182',1),
(2,1,'Rick Torres','Maintenance Supervisor','r.torres@apexind.com','330-555-0199',0),
(3,2,'Carolyn Marsh','Facilities Director','c.marsh@beaconmfg.com','937-555-0244',1),
(4,2,'Doug Hensley','Maintenance Manager','d.hensley@beaconmfg.com','937-555-0280',0),
(5,3,'Pat Gilmore','Operations Manager','p.gilmore@cornerstone.com','614-555-0312',1),
(6,4,'Sandra Voss','Purchasing Manager','s.voss@deltafab.com','216-555-0415',1),
(7,5,'Bob Trexler','VP Operations','b.trexler@eaglepress.com','330-555-0311',1),
(8,5,'Lisa Brandt','Plant Engineer','l.brandt@eaglepress.com','330-555-0322',0),
(9,6,'Tony Ruiz','Safety & Facilities','t.ruiz@frontiercasting.com','330-555-0518',1),
(10,6,'Angela Kim','Project Coordinator','a.kim@frontiercasting.com','330-555-0530',0);
/*!40000 ALTER TABLE `customer_contacts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `customers`
--

DROP TABLE IF EXISTS `customers`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `customers` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `notes` text,
  `billing_address` varchar(255) DEFAULT NULL,
  `website` varchar(100) DEFAULT NULL,
  `industry` varchar(100) DEFAULT NULL,
  `payment_terms` varchar(50) DEFAULT NULL,
  `account_num` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `customers`
--

LOCK TABLES `customers` WRITE;
/*!40000 ALTER TABLE `customers` DISABLE KEYS */;
INSERT INTO `customers` VALUES
(1,'Apex Industrial LLC','Long-term client since 2019. Always pays on time.','1200 Industrial Pkwy, Akron, OH 44312','www.apexindustrial.com','Heavy Manufacturing','Net 30','APX-001'),
(2,'Beacon Manufacturing Co.','Mid-size shop. Multiple locations. Carolyn handles all rigging requests.','500 Commerce Blvd, Dayton, OH 45402','www.beaconmfg.com','Precision Manufacturing','Net 45','BCN-002'),
(3,'Cornerstone Plastics Inc.','Growing account. New facility planned for 2026.','800 Factory Dr, Columbus, OH 43219','','Plastics Manufacturing','Net 30','CRN-003'),
(4,'Delta Fabrication Group','Competitive bidding environment. Price-sensitive.','300 Metalworks Ave, Cleveland, OH 44124','www.deltafab.com','Metal Fabrication','Net 30','DLT-004'),
(5,'Eagle Press & Die','Excellent relationship. Repeat business every quarter.','500 Eagle Way, Canton, OH 44702','www.eaglepress.com','Press & Die Manufacturing','Net 15','EGL-005'),
(6,'Frontier Castings Ltd.','Union shop. Require certified rigging documentation.','900 Industrial Blvd, Youngstown, OH 44503','','Metal Casting','Net 45','FRT-006');
/*!40000 ALTER TABLE `customers` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `equipment`
--

DROP TABLE IF EXISTS `equipment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `equipment` (
  `code` varchar(20) NOT NULL,
  `category` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `capacity` varchar(50) DEFAULT NULL,
  `daily_rate` decimal(10,2) NOT NULL,
  `daily_cost` decimal(10,2) NOT NULL DEFAULT '0.00',
  PRIMARY KEY (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `equipment`
--

LOCK TABLES `equipment` WRITE;
/*!40000 ALTER TABLE `equipment` DISABLE KEYS */;
INSERT INTO `equipment` VALUES
('100D','Truck','2007 Inter 9200 Tractor','â€“',1000.00,0.00),
('110D','Truck','2008 Landall Trailer','â€“',1000.00,0.00),
('111D','Truck','1999 Fontaine Flatbed Trailer','â€“',1000.00,0.00),
('237','Aerial Lift','Skyjack SJ3226','â€“',250.00,0.00),
('242','Forklift','2000 Gradall 534D-9','9,000 lb',790.00,0.00),
('250','Crane','2005 Broderson IC-200-3F 30-Ton Carry Deck','30,000 lb',1000.00,0.00),
('251','Aerial Lift','JLG 450AJ Lift','â€“',525.00,0.00),
('254','Aerial Lift','JLG 600S Boom','â€“',650.00,0.00),
('255','Aerial Lift','2013 Skyjack SJ4632','â€“',375.00,0.00),
('257','Crane','Broderson IC80-2D 17,000 lb Carry Deck','17,000 lb',750.00,0.00),
('259','Aerial Lift','2015 Skyjack SJ3219','â€“',155.00,0.00),
('300','Forklift','Caterpillar GC35K','15,500 lb',840.00,0.00),
('301','Forklift','HysterS80XLBCS','8,000 lb',530.00,0.00),
('302','Forklift','Cat125D 12,500 LB Forklift','12,500 lb',850.00,0.00),
('308','Forklift','Cat T150D 15,000 LB Forklift','15,000 lb',950.00,0.00),
('320','Forklift','Royal T300B 30,000 lb','30,000 lb',1100.00,0.00),
('322','Forklift','Rigger\'s Special 80-100k','100,000 lb',1200.00,0.00),
('CONE','Truck','Semi Truck and Conestoga','â€“',1500.00,0.00),
('CONEX','Tools','Conex Job Trailer','â€“',50.00,0.00),
('GANG','Tools','Gang Box Charge','â€“',50.00,0.00),
('PICK','Truck','Pickup Truck','â€“',125.00,0.00),
('RP4x10','Misc','4\'x10\' Steel Road Plates','â€“',90.00,0.00),
('RP8x10','Misc','8\'x10\' Steel Road Plates','â€“',90.00,0.00),
('RP8x12','Misc','8\'x12\' Steel Road Plates','â€“',90.00,0.00),
('RP8x20','Misc','8\'x20\' Steel Road Plates','â€“',100.00,0.00),
('SEMI','Truck','Semi Truck and Trailer','â€“',1000.00,0.00),
('TORCH','Tools','Torch Outfit','â€“',50.00,0.00);
/*!40000 ALTER TABLE `equipment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `job_folders`
--

DROP TABLE IF EXISTS `job_folders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `job_folders` (
  `rfq_id` int NOT NULL,
  `folder_data` json DEFAULT NULL,
  PRIMARY KEY (`rfq_id`),
  CONSTRAINT `job_folders_ibfk_1` FOREIGN KEY (`rfq_id`) REFERENCES `rfqs` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `job_folders`
--

LOCK TABLES `job_folders` WRITE;
/*!40000 ALTER TABLE `job_folders` DISABLE KEYS */;
/*!40000 ALTER TABLE `job_folders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `quotes`
--

DROP TABLE IF EXISTS `quotes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `quotes` (
  `id` int NOT NULL AUTO_INCREMENT,
  `quote_number` varchar(20) NOT NULL,
  `customer_name` varchar(100) NOT NULL,
  `job_site` varchar(255) DEFAULT NULL,
  `description` text,
  `date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `quote_type` varchar(50) DEFAULT NULL,
  `labor` decimal(10,2) DEFAULT NULL,
  `equip` decimal(10,2) DEFAULT NULL,
  `hauling` decimal(10,2) DEFAULT NULL,
  `travel` decimal(10,2) DEFAULT NULL,
  `materials` decimal(10,2) DEFAULT NULL,
  `total` decimal(10,2) DEFAULT NULL,
  `markup` decimal(10,2) DEFAULT NULL,
  `sales_assoc` varchar(50) DEFAULT NULL,
  `job_num` varchar(50) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `comp_date` date DEFAULT NULL,
  `is_locked` tinyint(1) DEFAULT '0',
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `quotes`
--

LOCK TABLES `quotes` WRITE;
/*!40000 ALTER TABLE `quotes` DISABLE KEYS */;
INSERT INTO `quotes` VALUES
(1,'RIG-2024-001','Apex Industrial LLC','1200 Industrial Pkwy, Akron, OH 44312','Press line relocation â€“ Bay 4','2024-11-12','Won','Contract',NULL,NULL,NULL,NULL,NULL,84200.00,0.00,'Dan M','J-2024-112','2026-03-17','2026-03-22',1,NULL),
(2,'RIG-2024-008','Apex Industrial LLC','1200 Industrial Pkwy, Akron, OH 44312','Overhead crane installation â€“ Bay 7','2024-08-20','Won','Contract',NULL,NULL,NULL,NULL,NULL,112000.00,0.08,'Dan M','J-2024-088','2026-04-07','2026-04-12',1,NULL),
(3,'RIG-2025-007','Apex Industrial LLC','1200 Industrial Pkwy, Akron, OH 44312','Injection mold press relocation','2025-02-10','Submitted','T&M',NULL,NULL,NULL,NULL,NULL,54100.00,0.05,'Sarah K','',NULL,NULL,0,NULL),
(4,'RIG-2024-002','Beacon Manufacturing Co.','500 Commerce Blvd, Dayton, OH 45402','Hydraulic press installation','2024-12-01','Submitted','Contract',NULL,NULL,NULL,NULL,NULL,142500.00,0.00,'Sarah K','',NULL,NULL,0,NULL),
(5,'RIG-2024-011','Beacon Manufacturing Co.','500 Commerce Blvd, Dayton, OH 45402','CNC lathe bank relocation â€“ Bldg B','2024-09-15','Won','Contract',NULL,NULL,NULL,NULL,NULL,71600.00,0.07,'Sarah K','J-2024-095','2026-03-24','2026-03-27',1,NULL),
(6,'RIG-2025-003','Beacon Manufacturing Co.','500 Commerce Blvd, Dayton, OH 45402','Transformer set â€“ electrical bay','2025-01-22','Draft','T&M',NULL,NULL,NULL,NULL,NULL,48300.00,0.00,'Mike R','',NULL,NULL,0,NULL);
/*!40000 ALTER TABLE `quotes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `rfqs`
--

DROP TABLE IF EXISTS `rfqs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `rfqs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfq_number` varchar(20) NOT NULL,
  `company` varchar(100) NOT NULL,
  `requester` varchar(100) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `job_site` varchar(255) DEFAULT NULL,
  `description` text,
  `notes` text,
  `date` date DEFAULT NULL,
  `status` varchar(50) DEFAULT NULL,
  `sales_assoc` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `rfqs`
--

LOCK TABLES `rfqs` WRITE;
/*!40000 ALTER TABLE `rfqs` DISABLE KEYS */;
INSERT INTO `rfqs` VALUES
(1,'REQ-2025-001','Apex Industrial LLC','James Whitfield','j.whitfield@apexind.com','330-555-0182','1200 Industrial Pkwy, Akron, OH 44312','Relocate 40-ton hydraulic press from Bay 3 to Bay 7, 200ft.','','2025-01-06','Quoted','Dan M'),
(2,'REQ-2025-002','Beacon Manufacturing Co.','Carolyn Marsh','c.marsh@beaconmfg.com','937-555-0244','500 Commerce Blvd, Dayton, OH 45402','Install transformer 15,000 lbs, second floor.','Need quote by end of week.','2025-01-15','Quoted','Mike R'),
(3,'REQ-2026-011','Quartz Industrial Services','Steve Mallory','s.mallory@quartzind.com','419-555-1610','600 Industrial Ct, Mansfield, OH 44903','Cooling tower pump skid replacement.','','2026-03-19','New','');
/*!40000 ALTER TABLE `rfqs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `role` varchar(20) DEFAULT 'user',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES
(1,'scott','scott@shoemakerrigging.com','$2b$10$xEg2II4VBPpudno4COQv7ur/ymOr3bNHRzMwraxqCwSyJJTk1A8tC','admin','2026-03-27 09:50:23'),
(2,'admin','admin@shoemakerrigging.com','$2b$10$ry7Q3enWpGx5CqBrXkkZ9.1UlYTFyshgeBCRuO/KJDOx1AusM8gpC','admin','2026-03-27 09:50:23'),
(3,'Dan M','dan.m@shoemakerrigging.com','$2b$10$ry7Q3enWpGx5CqBrXkkZ9.1UlYTFyshgeBCRuO/KJDOx1AusM8gpC','estimator','2026-03-27 09:50:23'),
(4,'Sarah K','sarah.k@shoemakerrigging.com','$2b$10$ry7Q3enWpGx5CqBrXkkZ9.1UlYTFyshgeBCRuO/KJDOx1AusM8gpC','estimator','2026-03-27 09:50:23'),
(5,'Mike R','mike.r@shoemakerrigging.com','$2b$10$ry7Q3enWpGx5CqBrXkkZ9.1UlYTFyshgeBCRuO/KJDOx1AusM8gpC','estimator','2026-03-27 09:50:23');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*M!100616 SET NOTE_VERBOSITY=@OLD_NOTE_VERBOSITY */;

-- Dump completed on 2026-03-27 11:08:50
