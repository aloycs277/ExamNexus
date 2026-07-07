-- 1. Create a clean, open Users table
CREATE TABLE `users` (
  `id` VARCHAR(50) NOT NULL,
  `name` VARCHAR(120) NOT NULL,
  `email` VARCHAR(150) DEFAULT NULL,
  `role` ENUM('admin', 'teacher', 'student') NOT NULL,
  `dept` VARCHAR(20) DEFAULT NULL,
  `password_hash` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `idx_user_name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 2. Create a clean, open Halls table
CREATE TABLE `halls` (
  `room` VARCHAR(50) NOT NULL,
  `capacity` INT(11) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP(),
  PRIMARY KEY (`room`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 3. Create a clean, open Duties table (No restrictive constraints)
CREATE TABLE `duties` (
  `id` INT(11) NOT NULL AUTO_INCREMENT,
  `teacher_name` VARCHAR(100) NOT NULL,
  `room_number` VARCHAR(50) NOT NULL,
  `status` VARCHAR(20) DEFAULT 'Assigned',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;