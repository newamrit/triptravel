-- ==============================================================================
-- TripPool: Group Trip & Float Fund Expense Management System
-- Database Schema for MySQL 5.7+ / 8.0+ / MariaDB (Optimized for cPanel hosting)
-- ==============================================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `expense_splits`;
DROP TABLE IF EXISTS `expenses`;
DROP TABLE IF EXISTS `deposits`;
DROP TABLE IF EXISTS `members`;
DROP TABLE IF EXISTS `trips`;
SET FOREIGN_KEY_CHECKS = 1;

-- ------------------------------------------------------------------------------
-- 1. TRIPS
-- Represents a group trip (e.g., "Rara Trip 2026", "Mustang Roadtrip")
-- ------------------------------------------------------------------------------
CREATE TABLE `trips` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(150) NOT NULL COMMENT 'Name of trip, e.g., Rara Lake Expedition 2026',
    `destination` VARCHAR(150) DEFAULT NULL,
    `currency` VARCHAR(10) NOT NULL DEFAULT 'Rs.' COMMENT 'Currency symbol or code (e.g. Rs., NPR, USD)',
    `start_date` DATE DEFAULT NULL,
    `end_date` DATE DEFAULT NULL,
    `status` ENUM('active', 'completed', 'archived') NOT NULL DEFAULT 'active',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 2. MEMBERS
-- Friends and participants of the trip.
-- ------------------------------------------------------------------------------
CREATE TABLE `members` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `trip_id` INT UNSIGNED NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `phone` VARCHAR(30) DEFAULT NULL,
    `notes` VARCHAR(255) DEFAULT NULL,
    `is_leader` TINYINT(1) NOT NULL DEFAULT 0 COMMENT '1 if this member is the pool custodian / trip leader',
    `is_active` TINYINT(1) NOT NULL DEFAULT 1 COMMENT 'Active participating member',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_members_trip` (`trip_id`),
    CONSTRAINT `fk_members_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 3. DEPOSITS
-- Rolling deposits collected by the leader to fund the common trip pool.
-- ------------------------------------------------------------------------------
CREATE TABLE `deposits` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `trip_id` INT UNSIGNED NOT NULL,
    `member_id` INT UNSIGNED NOT NULL,
    `amount` DECIMAL(12, 2) NOT NULL,
    `payment_method` ENUM('Cash', 'Fonepay', 'Bank Transfer', 'Other') NOT NULL DEFAULT 'Cash',
    `notes` VARCHAR(255) DEFAULT NULL COMMENT 'e.g. Initial pool deposit, Top-up at Surkhet',
    `deposited_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_deposits_trip` (`trip_id`),
    KEY `idx_deposits_member` (`member_id`),
    KEY `idx_deposits_date` (`deposited_at`),
    CONSTRAINT `fk_deposits_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_deposits_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 4. EXPENSES
-- Outflow records. Payer can be the common 'pool' (leader's hand) or an individual member.
-- ------------------------------------------------------------------------------
CREATE TABLE `expenses` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `trip_id` INT UNSIGNED NOT NULL,
    `payer_type` ENUM('pool', 'member') NOT NULL DEFAULT 'pool' COMMENT 'pool = paid from common fund, member = paid out-of-pocket',
    `payer_member_id` INT UNSIGNED DEFAULT NULL COMMENT 'NULL if pool, or member_id if paid out of pocket',
    `amount` DECIMAL(12, 2) NOT NULL,
    `category` ENUM(
        'Fuel',
        'Food & Snacks',
        'Hotel/Homestay',
        'Permits/Entry',
        'Vehicle Maintenance/Spares',
        'Miscellaneous'
    ) NOT NULL DEFAULT 'Food & Snacks',
    `description` VARCHAR(255) NOT NULL COMMENT 'e.g. Lunch at Kalikot highway dhaba',
    `split_type` ENUM('equal', 'custom') NOT NULL DEFAULT 'equal',
    `expense_date` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    KEY `idx_expenses_trip` (`trip_id`),
    KEY `idx_expenses_category` (`category`),
    KEY `idx_expenses_payer` (`payer_type`, `payer_member_id`),
    KEY `idx_expenses_date` (`expense_date`),
    CONSTRAINT `fk_expenses_trip` FOREIGN KEY (`trip_id`) REFERENCES `trips` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_expenses_payer_member` FOREIGN KEY (`payer_member_id`) REFERENCES `members` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ------------------------------------------------------------------------------
-- 5. EXPENSE_SPLITS
-- Exact breakdown of each participant's individual obligation for an expense.
-- ------------------------------------------------------------------------------
CREATE TABLE `expense_splits` (
    `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `expense_id` INT UNSIGNED NOT NULL,
    `member_id` INT UNSIGNED NOT NULL,
    `split_amount` DECIMAL(12, 2) NOT NULL COMMENT 'Calculated portion owed by this member',
    `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_expense_member` (`expense_id`, `member_id`),
    KEY `idx_splits_member` (`member_id`),
    CONSTRAINT `fk_splits_expense` FOREIGN KEY (`expense_id`) REFERENCES `expenses` (`id`) ON DELETE CASCADE,
    CONSTRAINT `fk_splits_member` FOREIGN KEY (`member_id`) REFERENCES `members` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ==============================================================================
-- SEED DATA: Realistic initial scenario for "Rara Trip 2026"
-- ==============================================================================

INSERT INTO `trips` (`id`, `title`, `destination`, `currency`, `start_date`, `end_date`, `status`)
VALUES (1, 'Rara Trip 2026', 'Rara Lake & Sinja Valley, Karnali', 'Rs.', '2026-10-18', '2026-10-25', 'active');

-- Add 4 travel buddies (Ramesh is the group leader/custodian)
INSERT INTO `members` (`id`, `trip_id`, `name`, `phone`, `notes`, `is_leader`, `is_active`) VALUES
(1, 1, 'Ramesh Sharma', '+977-9841000001', 'Trip Leader & Cash Custodian', 1, 1),
(2, 1, 'Bikash Thapa', '+977-9841000002', 'Scout & Co-driver', 0, 1),
(3, 1, 'Saurav Joshi', '+977-9841000003', 'Photographer', 0, 1),
(4, 1, 'Ayush Shrestha', '+977-9841000004', 'Navigator', 0, 1);

-- Initial Pool Fund Collection (Rs. 5,000 from each friend = Rs. 20,000)
INSERT INTO `deposits` (`id`, `trip_id`, `member_id`, `amount`, `payment_method`, `notes`, `deposited_at`) VALUES
(1, 1, 1, 5000.00, 'Cash', 'Initial pool fund contribution', '2026-10-17 08:30:00'),
(2, 1, 2, 5000.00, 'Fonepay', 'Advance deposit via Fonepay QR', '2026-10-17 09:15:00'),
(3, 1, 3, 5000.00, 'Bank Transfer', 'Transferred to Leader Nabil Bank', '2026-10-17 10:00:00'),
(4, 1, 4, 5000.00, 'Fonepay', 'Fonepay deposit', '2026-10-17 11:20:00');

-- Initial expenses on the road
-- Expense 1: Fuel at Kohalpur highway (Paid from Pool, split equally by 4 = Rs. 1,000 each)
INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `amount`, `category`, `description`, `split_type`, `expense_date`)
VALUES (1, 1, 'pool', NULL, 4000.00, 'Fuel', 'Scorpio diesel top-up at Kohalpur', 'equal', '2026-10-17 14:00:00');

INSERT INTO `expense_splits` (`expense_id`, `member_id`, `split_amount`) VALUES
(1, 1, 1000.00),
(1, 2, 1000.00),
(1, 3, 1000.00),
(1, 4, 1000.00);

-- Expense 2: Lunch at Kalikot Dhaba (Paid from Pool, split equally by 4 = Rs. 350 each)
INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `amount`, `category`, `description`, `split_type`, `expense_date`)
VALUES (2, 1, 'pool', NULL, 1400.00, 'Food & Snacks', 'Mutton Thali & tea at Kalikot', 'equal', '2026-10-18 12:30:00');

INSERT INTO `expense_splits` (`expense_id`, `member_id`, `split_amount`) VALUES
(2, 1, 350.00),
(2, 2, 350.00),
(2, 3, 350.00),
(2, 4, 350.00);

-- Expense 3: Bikash paid personal out-of-pocket for tire puncture repair & spares in Dailekh (Rs. 1,200, shared equally by 4 = Rs. 300 each)
INSERT INTO `expenses` (`id`, `trip_id`, `payer_type`, `payer_member_id`, `amount`, `category`, `description`, `split_type`, `expense_date`)
VALUES (3, 1, 'member', 2, 1200.00, 'Vehicle Maintenance/Spares', 'Tire puncture & spare valve tube (paid by Bikash)', 'equal', '2026-10-18 16:45:00');

INSERT INTO `expense_splits` (`expense_id`, `member_id`, `split_amount`) VALUES
(3, 1, 300.00),
(3, 2, 300.00),
(3, 3, 300.00),
(3, 4, 300.00);
