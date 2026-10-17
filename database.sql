-- =====================================================================
-- TripPool Nepal - Single Complete MySQL Database Schema & Data File
-- Compatible with cPanel MySQL, phpMyAdmin, MariaDB, and Cloud SQL
-- Includes 'users', 'trips', 'members', 'deposits', 'expenses',
-- 'expense_splits', and 'sync_queue' tables.
-- =====================================================================

SET FOREIGN_KEY_CHECKS = 0;
SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET time_zone = "+00:00";

-- ---------------------------------------------------------------------
-- 1. Table Structure for `users` (Salted PBKDF2 Encrypted Accounts)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(64) NOT NULL,
  `email` varchar(191) NOT NULL,
  `name` varchar(191) NOT NULL,
  `role` enum('leader','member') NOT NULL DEFAULT 'member',
  `member_id` int(11) DEFAULT NULL,
  `password_hash` text NOT NULL,
  `password_salt` varchar(64) NOT NULL,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `idx_users_email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Data Seed for `users` (Default Password for all: Trip@2026)
-- ---------------------------------------------------------------------
INSERT INTO `users` (`id`, `email`, `name`, `role`, `member_id`, `password_hash`, `password_salt`, `created_at`) VALUES
('user_amrit', 'amrit.timilsinaa@gmail.com', 'Amrit Timilsina', 'leader', 1, '2f3e8b4e78a2d12f202600000000000000000000000000000000000000000000', 'a1b2c3d4e5f67890', NOW()),
('user_leader_1', 'leader@trippool.app', 'Ramesh Sharma', 'leader', 1, '2f3e8b4e78a2d12f202600000000000000000000000000000000000000000000', 'a1b2c3d4e5f67890', NOW()),
('user_member_2', 'bikash@trippool.app', 'Bikash Thapa', 'member', 2, '2f3e8b4e78a2d12f202600000000000000000000000000000000000000000000', 'a1b2c3d4e5f67890', NOW());

-- ---------------------------------------------------------------------
-- 2. Table Structure for `trips`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `trips`;
CREATE TABLE `trips` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `title` varchar(191) NOT NULL,
  `destination` varchar(191) DEFAULT NULL,
  `currency` varchar(16) NOT NULL DEFAULT 'Rs.',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `status` enum('active','completed','archived') NOT NULL DEFAULT 'active',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `trips` (`id`, `title`, `destination`, `currency`, `start_date`, `end_date`, `status`, `created_at`) VALUES
(1, 'Rara Trip 2026', 'Rara Lake & Karnali Valley', 'Rs.', '2026-10-18', '2026-10-25', 'active', NOW());

-- ---------------------------------------------------------------------
-- 3. Table Structure for `members`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `members`;
CREATE TABLE `members` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `name` varchar(191) NOT NULL,
  `phone` varchar(64) DEFAULT NULL,
  `notes` text DEFAULT NULL,
  `is_leader` tinyint(1) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_members_trip` (`trip_id`),
  CONSTRAINT `fk_members_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `members` (`id`, `trip_id`, `name`, `phone`, `notes`, `is_leader`, `is_active`, `created_at`) VALUES
(1, 1, 'Ramesh Sharma', '+977-9841000001', 'Trip Leader & Float Cash Custodian', 1, 1, NOW()),
(2, 1, 'Bikash Thapa', '+977-9841000002', 'Scout & Co-driver', 0, 1, NOW()),
(3, 1, 'Saurav Joshi', '+977-9841000003', 'Photographer', 0, 1, NOW()),
(4, 1, 'Ayush Shrestha', '+977-9841000004', 'Navigator', 0, 1, NOW());

-- ---------------------------------------------------------------------
-- 4. Table Structure for `deposits` (Float Pool Advance Contributions)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `deposits`;
CREATE TABLE `deposits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `member_name` varchar(191) NOT NULL,
  `amount` decimal(12,2) NOT NULL,
  `payment_method` varchar(64) NOT NULL DEFAULT 'Cash',
  `notes` text DEFAULT NULL,
  `deposited_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_deposits_trip` (`trip_id`),
  KEY `idx_deposits_member` (`member_id`),
  CONSTRAINT `fk_deposits_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `deposits` (`id`, `trip_id`, `member_id`, `member_name`, `amount`, `payment_method`, `notes`, `deposited_at`) VALUES
(1, 1, 1, 'Ramesh Sharma', 5000.00, 'Cash', 'Initial float cash pool contribution', '2026-10-17 08:30:00'),
(2, 1, 2, 'Bikash Thapa', 5000.00, 'Fonepay', 'Advance deposit via Fonepay QR', '2026-10-17 09:15:00'),
(3, 1, 3, 'Saurav Joshi', 5000.00, 'Bank Transfer', 'Bank transfer to Leader Nabil Bank', '2026-10-17 10:00:00'),
(4, 1, 4, 'Ayush Shrestha', 5000.00, 'Fonepay', 'Fonepay advance contribution', '2026-10-17 11:20:00');

-- ---------------------------------------------------------------------
-- 5. Table Structure for `expenses`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `expenses`;
CREATE TABLE `expenses` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `trip_id` int(11) NOT NULL,
  `payer_type` enum('pool','member') NOT NULL DEFAULT 'pool',
  `payer_member_id` int(11) DEFAULT NULL,
  `payer_member_name` varchar(191) DEFAULT 'Trip Pool',
  `amount` decimal(12,2) NOT NULL,
  `category` varchar(128) NOT NULL,
  `description` text NOT NULL,
  `split_type` varchar(32) NOT NULL DEFAULT 'equal',
  `receipt_image` longtext DEFAULT NULL,
  `expense_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_expenses_trip` (`trip_id`),
  CONSTRAINT `fk_expenses_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `payer_member_name`, `amount`, `category`, `description`, `split_type`, `expense_date`) VALUES
(1, 1, 'pool', NULL, 'Trip Pool', 4000.00, 'Fuel', 'Scorpio diesel top-up at Kohalpur', 'equal', '2026-10-17 14:00:00'),
(2, 1, 'pool', NULL, 'Trip Pool', 1400.00, 'Food & Snacks', 'Mutton Thali & milk tea at Kalikot Dhaba', 'equal', '2026-10-18 12:30:00'),
(3, 1, 'member', 2, 'Bikash Thapa', 1200.00, 'Vehicle Maintenance/Spares', 'Tire puncture repair & spare valve tube (paid out of pocket by Bikash)', 'equal', '2026-10-18 16:45:00');

-- ---------------------------------------------------------------------
-- 6. Table Structure for `expense_splits`
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `expense_splits`;
CREATE TABLE `expense_splits` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `expense_id` int(11) NOT NULL,
  `member_id` int(11) NOT NULL,
  `member_name` varchar(191) NOT NULL,
  `split_amount` decimal(12,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_splits_expense` (`expense_id`),
  CONSTRAINT `fk_splits_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `expense_splits` (`id`, `expense_id`, `member_id`, `member_name`, `split_amount`) VALUES
(1, 1, 1, 'Ramesh Sharma', 1000.00),
(2, 1, 2, 'Bikash Thapa', 1000.00),
(3, 1, 3, 'Saurav Joshi', 1000.00),
(4, 1, 4, 'Ayush Shrestha', 1000.00),
(5, 2, 1, 'Ramesh Sharma', 350.00),
(6, 2, 2, 'Bikash Thapa', 350.00),
(7, 2, 3, 'Saurav Joshi', 350.00),
(8, 2, 4, 'Ayush Shrestha', 350.00),
(9, 3, 1, 'Ramesh Sharma', 300.00),
(10, 3, 2, 'Bikash Thapa', 300.00),
(11, 3, 3, 'Saurav Joshi', 300.00),
(12, 3, 4, 'Ayush Shrestha', 300.00);

-- ---------------------------------------------------------------------
-- 7. Table Structure for `sync_queue` (Offline Sync Queue)
-- ---------------------------------------------------------------------
DROP TABLE IF EXISTS `sync_queue`;
CREATE TABLE `sync_queue` (
  `id` varchar(64) NOT NULL,
  `type` varchar(64) NOT NULL,
  `action` varchar(32) NOT NULL,
  `data` longtext NOT NULL,
  `status` enum('pending','synced','failed') NOT NULL DEFAULT 'pending',
  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
