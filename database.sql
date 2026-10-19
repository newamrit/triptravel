-- =====================================================================
-- TripPool Nepal - Complete MySQL Database Schema & Dummy Data
-- Compatible with cPanel MySQL, phpMyAdmin, MariaDB 10.x+, and MySQL 5.7/8.0+
-- Import this single file into your cPanel database via phpMyAdmin.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ---------------------------------------------------------------------
-- 1. Table Structure for `users` (PBKDF2-SHA256 Encrypted Accounts)
-- Default password for all seeded accounts: Trip@2026
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `role` enum('leader','member') NOT NULL DEFAULT 'member',
  `member_id` int(11) DEFAULT NULL,
  `password_hash` varchar(255) NOT NULL,
  `password_salt` varchar(255) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `email`, `name`, `role`, `member_id`, `password_hash`, `password_salt`, `created_at`) VALUES
('user_amrit', 'amrit.timilsinaa@gmail.com', 'Amrit Timilsina', 'leader', 1, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:00:00'),
('user_leader_1', 'leader@trippool.app', 'Amrit Timilsina', 'leader', 1, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:00:00'),
('user_member_2', 'bikash@trippool.app', 'Bikash Thapa', 'member', 2, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:05:00'),
('user_member_3', 'saurav@trippool.app', 'Saurav Joshi', 'member', 3, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:10:00'),
('user_member_4', 'ayush@trippool.app', 'Ayush Shrestha', 'member', 4, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:15:00'),
('user_member_5', 'prashant@trippool.app', 'Prashant Karki', 'member', 5, 'pbkdf2_seeded_2026', 'a1b2c3d4e5f67890a1b2c3d4e5f67890', '2026-10-15 07:20:00');

-- ---------------------------------------------------------------------
-- 2. Table Structure for `trips`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(191) NOT NULL,
  `destination` varchar(255) NOT NULL DEFAULT '',
  `currency` varchar(16) NOT NULL DEFAULT 'Rs.',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
  `total_budget` decimal(12,2) NOT NULL DEFAULT 35000.00,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trips` (`id`, `title`, `destination`, `currency`, `start_date`, `end_date`, `status`, `total_budget`, `created_at`) VALUES
(1, 'Upper Mustang Overland 2026', 'Pokhara • Marpha • Kagbeni • Lo Manthang', 'Rs.', '2026-10-15', '2026-10-24', 'active', 35000.00, '2026-10-15 07:00:00');

-- ---------------------------------------------------------------------
-- 3. Table Structure for `members`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL DEFAULT 1,
  `name` varchar(191) NOT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `avatar` longtext DEFAULT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_members_trip` (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `members` (`id`, `trip_id`, `name`, `phone`, `notes`, `avatar`, `is_leader`, `is_active`, `created_at`) VALUES
(1, 1, 'Amrit Timilsina', '+977-9851148290', 'Trip Leader & Float Pool Custodian', 'preset:leader-crown', 1, 1, '2026-10-15 07:00:00'),
(2, 1, 'Bikash Thapa', '+977-9841623104', 'Lead 4WD Hilux Driver & Route Planner', 'preset:4wd-driver', 0, 1, '2026-10-15 07:05:00'),
(3, 1, 'Saurav Joshi', '+977-9801934512', 'Aerial Drone & Travel Photographer', 'preset:camera-drone', 0, 1, '2026-10-15 07:10:00'),
(4, 1, 'Ayush Shrestha', '+977-9860412890', 'Logistics, Permits & Homestay Coordinator', 'preset:compass-nav', 0, 1, '2026-10-15 07:15:00'),
(5, 1, 'Prashant Karki', '+977-9849087321', 'Co-Driver & Mechanical Backup', 'preset:mountain-hiker', 0, 1, '2026-10-15 07:20:00');

-- ---------------------------------------------------------------------
-- 4. Table Structure for `deposits` (Float Pool Advance Contributions)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `deposits`;
CREATE TABLE `deposits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL DEFAULT 1,
  `member_id` int(11) NOT NULL,
  `member_name` varchar(191) NOT NULL DEFAULT 'Member',
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(64) NOT NULL DEFAULT 'Cash',
  `notes` text DEFAULT NULL,
  `deposited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deposits_trip` (`trip_id`),
  KEY `idx_deposits_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `deposits` (`id`, `trip_id`, `member_id`, `member_name`, `amount`, `payment_method`, `notes`, `deposited_at`) VALUES
(1, 1, 1, 'Amrit Timilsina', 10000.00, 'Cash', 'Initial leader float cash contribution in Kathmandu', '2026-10-15 07:30:00'),
(2, 1, 2, 'Bikash Thapa', 10000.00, 'Fonepay', 'Fonepay QR transfer to Trip Pool account', '2026-10-15 08:00:00'),
(3, 1, 3, 'Saurav Joshi', 10000.00, 'Bank Transfer', 'Nabil Bank eBanking advance deposit', '2026-10-15 08:20:00'),
(4, 1, 4, 'Ayush Shrestha', 10000.00, 'Fonepay', 'Advance pool deposit via Fonepay QR', '2026-10-15 08:45:00'),
(5, 1, 5, 'Prashant Karki', 10000.00, 'Cash', 'Cash handed to Amrit at Pokhara Lakeside checkpoint', '2026-10-15 18:15:00');

-- ---------------------------------------------------------------------
-- 5. Table Structure for `expenses`
-- `receipt_image` LONGTEXT stores compressed Base64 receipt photos
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL DEFAULT 1,
  `payer_type` enum('pool','member') NOT NULL DEFAULT 'pool',
  `payer_member_id` int(11) DEFAULT NULL,
  `payer_member_name` varchar(191) DEFAULT 'Trip Pool',
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(128) NOT NULL DEFAULT 'Food & Snacks',
  `description` text NOT NULL,
  `split_type` varchar(32) NOT NULL DEFAULT 'equal',
  `receipt_image` longtext DEFAULT NULL,
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_trip` (`trip_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `payer_member_name`, `amount`, `category`, `description`, `split_type`, `receipt_image`, `expense_date`) VALUES
(1, 1, 'pool', NULL, 'Trip Pool', 8500.00, 'Fuel', 'Full tank diesel for 4WD Hilux at Pokhara Highway Fuel Station', 'equal', NULL, '2026-10-15 19:00:00'),
(2, 1, 'pool', NULL, 'Trip Pool', 5000.00, 'Entry Permits/Tickets', 'ACAP entry permits & Beni-Jomsom corridor checkpost fees (5 pax)', 'equal', NULL, '2026-10-16 09:30:00'),
(3, 1, 'pool', NULL, 'Trip Pool', 3250.00, 'Food & Snacks', 'Thakali Mutton Thali lunch & seabuckthorn juice at Lete Kalopani', 'equal', NULL, '2026-10-16 13:45:00'),
(4, 1, 'pool', NULL, 'Trip Pool', 7500.00, 'Hotel/Stay', 'Marpha Orchard Courtyard Lodge - 2 family rooms, campfire & dinner', 'equal', NULL, '2026-10-16 20:30:00'),
(5, 1, 'member', 2, 'Bikash Thapa', 2500.00, 'Vehicle Maintenance/Spares', 'Heavy-duty air filter cleaning, brake fluid & tire pressure service at Jomsom (paid by Bikash)', 'equal', NULL, '2026-10-17 10:15:00'),
(6, 1, 'member', 3, 'Saurav Joshi', 1750.00, 'Food & Snacks', 'Yak cheese platters, apple pie & masala tea at Kagbeni View Point (paid by Saurav)', 'equal', NULL, '2026-10-17 15:20:00');

-- ---------------------------------------------------------------------
-- 6. Table Structure for `expense_splits`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `expense_splits`;
CREATE TABLE `expense_splits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `expense_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `member_name` varchar(191) NOT NULL DEFAULT 'Member',
  `split_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_splits_expense` (`expense_id`),
  KEY `idx_splits_member` (`member_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_splits` (`id`, `expense_id`, `member_id`, `member_name`, `split_amount`) VALUES
-- Expense 1: Fuel (Rs. 8,500 / 5 = Rs. 1,700 each)
(1, 1, 1, 'Amrit Timilsina', 1700.00),
(2, 1, 2, 'Bikash Thapa', 1700.00),
(3, 1, 3, 'Saurav Joshi', 1700.00),
(4, 1, 4, 'Ayush Shrestha', 1700.00),
(5, 1, 5, 'Prashant Karki', 1700.00),
-- Expense 2: Entry Permits/Tickets (Rs. 5,000 / 5 = Rs. 1,000 each)
(6, 2, 1, 'Amrit Timilsina', 1000.00),
(7, 2, 2, 'Bikash Thapa', 1000.00),
(8, 2, 3, 'Saurav Joshi', 1000.00),
(9, 2, 4, 'Ayush Shrestha', 1000.00),
(10, 2, 5, 'Prashant Karki', 1000.00),
-- Expense 3: Food & Snacks at Lete Kalopani (Rs. 3,250 / 5 = Rs. 650 each)
(11, 3, 1, 'Amrit Timilsina', 650.00),
(12, 3, 2, 'Bikash Thapa', 650.00),
(13, 3, 3, 'Saurav Joshi', 650.00),
(14, 3, 4, 'Ayush Shrestha', 650.00),
(15, 3, 5, 'Prashant Karki', 650.00),
-- Expense 4: Hotel/Stay at Marpha Lodge (Rs. 7,500 / 5 = Rs. 1,500 each)
(16, 4, 1, 'Amrit Timilsina', 1500.00),
(17, 4, 2, 'Bikash Thapa', 1500.00),
(18, 4, 3, 'Saurav Joshi', 1500.00),
(19, 4, 4, 'Ayush Shrestha', 1500.00),
(20, 4, 5, 'Prashant Karki', 1500.00),
-- Expense 5: Vehicle Maintenance at Jomsom (Rs. 2,500 / 5 = Rs. 500 each)
(21, 5, 1, 'Amrit Timilsina', 500.00),
(22, 5, 2, 'Bikash Thapa', 500.00),
(23, 5, 3, 'Saurav Joshi', 500.00),
(24, 5, 4, 'Ayush Shrestha', 500.00),
(25, 5, 5, 'Prashant Karki', 500.00),
-- Expense 6: Food & Snacks at Kagbeni (Rs. 1,750 / 5 = Rs. 350 each)
(26, 6, 1, 'Amrit Timilsina', 350.00),
(27, 6, 2, 'Bikash Thapa', 350.00),
(28, 6, 3, 'Saurav Joshi', 350.00),
(29, 6, 4, 'Ayush Shrestha', 350.00),
(30, 6, 5, 'Prashant Karki', 350.00);

-- ---------------------------------------------------------------------
-- 7. Table Structure for `sync_queue` (Offline Sync Queue)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sync_queue`;
CREATE TABLE `sync_queue` (
  `id` varchar(64) NOT NULL,
  `type` varchar(64) NOT NULL,
  `action` varchar(32) NOT NULL,
  `payload` longtext NOT NULL,
  `status` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
