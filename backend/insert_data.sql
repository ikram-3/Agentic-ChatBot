-- Comprehensive Sample Data for University of Swat Chatbot
-- This script adds a wide range of records to test all features of the AI assistant.

USE uos_chatbot;

-- ── 1. POPULATE DEPARTMENTS ──
INSERT IGNORE INTO departments (dept_id, dept_name, building, head_of_dept) VALUES 
(1, 'Computer Science & IT', 'Academic Block A', 'Dr. Hassan Ahmed'),
(2, 'Management Sciences', 'Management Building', 'Dr. Ali Raza'),
(3, 'Pharmacy', 'Medical Complex', 'Dr. Saira Ali'),
(4, 'English', 'Arts Block', 'Prof. Maryam Khan'),
(5, 'Psychology', 'Social Sciences Block', 'Dr. Farooq Shah');

-- ── 2. POPULATE PROGRAMS ──
INSERT IGNORE INTO programs (program_id, dept_id, program_name, duration_years, total_semesters, total_fee_estimate) VALUES 
(1, 1, 'BS Computer Science', 4, 8, 360000.00),
(2, 1, 'BS Software Engineering', 4, 8, 380000.00),
(3, 2, 'BBA', 4, 8, 320000.00),
(4, 3, 'Pharm-D', 5, 10, 600000.00),
(5, 4, 'BS English', 4, 8, 240000.00),
(6, 1, 'MS Computer Science', 2, 4, 180000.00);

-- ── 3. POPULATE FACULTY (TEACHERS) ──
INSERT IGNORE INTO faculty (name, dept_id, designation, faculty_type, email, phone, office_location, specialization) VALUES 
('Dr. Hassan Ahmed', 1, 'Professor & HOD', 'Permanent', 'hassan@uswat.edu.pk', '0946-123456', 'Room 101, Block A', 'Artificial Intelligence, Machine Learning'),
('Dr. Nadia Khan', 1, 'Associate Professor', 'Permanent', 'nadia@uswat.edu.pk', '0946-123457', 'Room 105, Block A', 'Cyber Security, Network Defense'),
('Mr. Usman Ali', 1, 'Lecturer', 'Contract', 'usman@uswat.edu.pk', '0946-123458', 'Lab 2, CS Dept', 'Web Development, Cloud Computing'),
('Dr. Ali Raza', 2, 'Professor & HOD', 'Permanent', 'aliraza@uswat.edu.pk', '0946-123459', 'Room 201, Management Bldg', 'Strategic Management, Finance'),
('Dr. Saira Ali', 3, 'Assistant Professor', 'Permanent', 'saira@uswat.edu.pk', '0946-123460', 'Room 12, Pharmacy Block', 'Clinical Pharmacy, Drug Interaction'),
('Ms. Amna Shah', 4, 'Lecturer', 'Visiting', 'amna@uswat.edu.pk', '0946-123461', 'Arts Block Faculty Room', 'Linguistics, Modern Literature'),
('Dr. Farooq Shah', 5, 'Professor & HOD', 'Permanent', 'farooq@uswat.edu.pk', '0946-123462', 'Social Sciences Block', 'Clinical Psychology');

-- ── 4. POPULATE STUDENTS ──
INSERT IGNORE INTO students (roll_no, dept_id, program_id, name, father_name, current_semester, section, status) VALUES 
('CS-2026-F-001', 1, 1, 'Muhammad Ikram', 'Sher Muhammad', 1, 'A', 'Active'),
('SE-2026-F-015', 1, 2, 'Sara Khan', 'Imran Khan', 2, 'B', 'Active'),
('BBA-2026-S-008', 2, 3, 'Ali Hassan', 'Hassan Ali', 3, 'A', 'Active'),
('PHR-2026-F-022', 3, 4, 'Fatima Noor', 'Noor Muhammad', 4, 'A', 'Active'),
('ENG-2026-F-045', 4, 5, 'Zubair Ahmed', 'Ahmed Khan', 1, 'C', 'Active'),
('CS-2026-G-001', 1, 1, 'Hamza Malik', 'Malik Shah', 8, 'A', 'Graduated');

-- ── 5. POPULATE FEE SLIPS ──
INSERT IGNORE INTO fee_slips (ref_no, roll_no, amount_due, amount_paid, payment_date, bank_name, branch_name, status, fee_type, challan_no) VALUES 
('UOS-2026-001234', 'CS-2026-F-001', 45000.00, 45000.00, '2026-08-10', 'HBL', 'Mingora', 'Verified', 'Semester Fee', 'CHN-78432'),
('UOS-2026-001235', 'SE-2026-F-015', 48000.00, 48000.00, '2026-08-12', 'NBP', 'Swat', 'Verified', 'Semester Fee', 'CHN-78433'),
('UOS-2026-001236', 'BBA-2026-S-008', 42000.00, 0.00, NULL, 'UBL', 'Kanju', 'Unpaid', 'Semester Fee', 'CHN-78434'),
('UOS-2026-ADM-099', 'ENG-2026-F-045', 2500.00, 2500.00, '2026-08-05', 'Bank Al Habib', 'Swat', 'Verified', 'Admission Fee', 'CHN-78435');

-- ── 6. POPULATE COURSES ──
INSERT IGNORE INTO courses (course_code, dept_id, course_title, credit_hours) VALUES 
('CSC-101', 1, 'Introduction to Programming', 4),
('CSC-102', 1, 'Data Structures & Algorithms', 4),
('CSC-201', 1, 'Object Oriented Programming', 4),
('MGT-101', 2, 'Principles of Management', 3),
('PHR-401', 3, 'Pharmacology-II', 4),
('ENG-101', 4, 'Functional English', 3);

-- ── 7. POPULATE EXAM SCHEDULES ──
INSERT IGNORE INTO exam_schedules (roll_no, exam_type, semester, exam_date, start_time, venue) VALUES 
('CS-2026-F-001', 'Mid-Term', 1, '2026-11-05', '09:00:00', 'Main Hall, UoS'),
('SE-2026-F-015', 'Final Exam', 2, '2026-12-10', '13:30:00', 'Block-A Hall'),
('PHR-2026-F-022', 'Final Exam', 4, '2026-12-12', '09:00:00', 'Pharmacy Block Hall');

-- ── 8. POPULATE RESULTS ──
INSERT IGNORE INTO results (roll_no, course_code, semester, total_marks, grade, gpa) VALUES 
('CS-2026-F-001', 'CSC-101', 1, 88.0, 'A', 3.90),
('SE-2026-F-015', 'CSC-101', 1, 75.0, 'B+', 3.20),
('BBA-2026-S-008', 'MGT-101', 3, 92.0, 'A+', 4.00);

-- ── 9. POPULATE NOTICES ──
INSERT IGNORE INTO notices (title, content, category) VALUES 
('Fall 2026 Admissions', 'Applications are open for all undergraduate programs.', 'Admission'),
('Sports Gala 2026', 'The annual sports gala will start from Oct 15 at the main campus.', 'Event'),
('Scholarship Deadline', 'The PEEF scholarship deadline has been extended to Sept 30.', 'Academic');
