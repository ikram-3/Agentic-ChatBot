-- University of Swat Comprehensive Chatbot Database Schema
-- Version 2.0 (Professional Production Ready)

CREATE DATABASE IF NOT EXISTS uos_chatbot;
USE uos_chatbot;

-- ── 1. ORGANIZATIONAL STRUCTURE ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS departments (
    dept_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_name VARCHAR(100) NOT NULL UNIQUE,
    building VARCHAR(100),
    head_of_dept VARCHAR(100)
);

CREATE TABLE IF NOT EXISTS programs (
    program_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT,
    program_name VARCHAR(100) NOT NULL,
    duration_years INT DEFAULT 4,
    total_semesters INT DEFAULT 8,
    total_fee_estimate DECIMAL(10, 2),
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- ── 2. USERS & FACULTY ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS faculty (
    faculty_id INT AUTO_INCREMENT PRIMARY KEY,
    dept_id INT,
    name VARCHAR(100) NOT NULL,
    designation VARCHAR(100),
    faculty_type ENUM('Permanent', 'Visiting', 'Contract') DEFAULT 'Permanent',
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    office_location VARCHAR(100),
    specialization TEXT,
    education_history TEXT,
    research_interests TEXT,
    joining_date DATE,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

-- ── 3. STUDENT RECORDS ───────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS students (
    roll_no VARCHAR(50) PRIMARY KEY,
    dept_id INT,
    program_id INT,
    name VARCHAR(100) NOT NULL,
    father_name VARCHAR(100),
    dob DATE,
    gender ENUM('Male', 'Female', 'Other'),
    email VARCHAR(100) UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    current_semester INT DEFAULT 1,
    section CHAR(1) DEFAULT 'A',
    status ENUM('Active', 'Graduated', 'Suspended', 'Dropped') DEFAULT 'Active',
    admission_date DATE,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
    FOREIGN KEY (program_id) REFERENCES programs(program_id)
);

-- ── 4. FINANCIAL RECORDS ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS fee_slips (
    ref_no VARCHAR(50) PRIMARY KEY,
    roll_no VARCHAR(50),
    amount_due DECIMAL(10, 2),
    amount_paid DECIMAL(10, 2) DEFAULT 0,
    due_date DATE,
    payment_date DATE,
    bank_name VARCHAR(100),
    branch_name VARCHAR(100),
    challan_no VARCHAR(50) UNIQUE,
    fee_type VARCHAR(50), -- e.g., 'Semester Fee', 'Admission Fee', 'Library Fine'
    status ENUM('Unpaid', 'Pending', 'Verified', 'Rejected') DEFAULT 'Unpaid',
    FOREIGN KEY (roll_no) REFERENCES students(roll_no)
);

-- ── 5. ACADEMIC & EXAMS ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS courses (
    course_code VARCHAR(20) PRIMARY KEY,
    dept_id INT,
    course_title VARCHAR(150) NOT NULL,
    credit_hours INT DEFAULT 3,
    FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
);

CREATE TABLE IF NOT EXISTS exam_schedules (
    schedule_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(50),
    exam_type VARCHAR(50), -- 'Mid-Term', 'Final', 'Special'
    semester INT,
    exam_date DATE,
    start_time TIME,
    venue VARCHAR(100),
    FOREIGN KEY (roll_no) REFERENCES students(roll_no)
);

CREATE TABLE IF NOT EXISTS results (
    result_id INT AUTO_INCREMENT PRIMARY KEY,
    roll_no VARCHAR(50),
    course_code VARCHAR(20),
    semester INT,
    mid_marks DECIMAL(5,2),
    final_marks DECIMAL(5,2),
    sessional_marks DECIMAL(5,2),
    total_marks DECIMAL(5,2),
    grade CHAR(2),
    gpa DECIMAL(3,2),
    FOREIGN KEY (roll_no) REFERENCES students(roll_no),
    FOREIGN KEY (course_code) REFERENCES courses(course_code)
);

-- ── 6. CAMPUS LIFE & RESOURCES ──────────────────────────────────────

CREATE TABLE IF NOT EXISTS notices (
    notice_id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    content TEXT,
    category ENUM('Academic', 'Admission', 'Event', 'Holiday', 'General'),
    publish_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expiry_date DATE
);

-- ── 7. SEED DATA (COMPREHENSIVE) ────────────────────────────────────

-- Departments
INSERT INTO departments (dept_name, building, head_of_dept) VALUES 
('Computer Science & IT', 'Academic Block A', 'Dr. Hassan Ahmed'),
('Management Sciences', 'Management Building', 'Dr. Ali Raza'),
('Pharmacy', 'Medical Complex', 'Dr. Saira Ali'),
('English', 'Arts Block', 'Prof. Maryam Khan');

-- Programs
INSERT INTO programs (dept_id, program_name, duration_years, total_semesters, total_fee_estimate) VALUES 
(1, 'BS Computer Science', 4, 8, 360000.00),
(1, 'BS Software Engineering', 4, 8, 380000.00),
(2, 'BBA', 4, 8, 320000.00),
(3, 'Pharm-D', 5, 10, 600000.00);

-- Faculty
INSERT INTO faculty (dept_id, name, designation, faculty_type, email, specialization) VALUES 
(1, 'Dr. Hassan Ahmed', 'Professor & HOD', 'Permanent', 'hassan@uswat.edu.pk', 'Artificial Intelligence, Machine Learning'),
(1, 'Dr. Nadia Khan', 'Associate Professor', 'Permanent', 'nadia@uswat.edu.pk', 'Cyber Security, Network Defense'),
(1, 'Mr. Usman Ali', 'Lecturer', 'Contract', 'usman@uswat.edu.pk', 'Web Development, Cloud Computing'),
(2, 'Dr. Ali Raza', 'Professor & HOD', 'Permanent', 'aliraza@uswat.edu.pk', 'Strategic Management'),
(3, 'Dr. Saira Ali', 'Assistant Professor', 'Permanent', 'saira@uswat.edu.pk', 'Pharmacology');

-- Students
INSERT INTO students (roll_no, dept_id, program_id, name, father_name, current_semester, section) VALUES 
('CS-2026-F-001', 1, 1, 'Muhammad Ikram', 'Sher Muhammad', 1, 'A'),
('SE-2026-F-015', 1, 2, 'Sara Khan', 'Imran Khan', 2, 'B'),
('BBA-2026-S-008', 2, 3, 'Ali Hassan', 'Hassan Ali', 3, 'A');

-- Courses
INSERT INTO courses (course_code, dept_id, course_title, credit_hours) VALUES 
('CSC-101', 1, 'Introduction to Programming', 4),
('CSC-102', 1, 'Data Structures', 4),
('MGT-101', 2, 'Principles of Management', 3);

-- Results
INSERT INTO results (roll_no, course_code, semester, total_marks, grade, gpa) VALUES 
('CS-2026-F-001', 'CSC-101', 1, 85.5, 'A', 3.80),
('SE-2026-F-015', 'CSC-102', 2, 78.0, 'B+', 3.30);

-- Notices
INSERT INTO notices (title, content, category) VALUES 
('Fall 2026 Admissions Open', 'Admissions for Fall 2026 are now open. Apply via the online portal.', 'Admission'),
('Winter Holidays Announcement', 'The university will remain closed from Dec 24 to Jan 1 for winter break.', 'Holiday');
