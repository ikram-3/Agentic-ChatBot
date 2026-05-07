import os
import asyncio
import aiomysql
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "uos_chatbot")

async def get_db_pool():
    return await aiomysql.create_pool(
        host=MYSQL_HOST,
        port=3306,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        db=MYSQL_DATABASE,
        autocommit=True
    )

async def init_db():
    """Create tables and seed initial data if they don't exist."""
    conn = await aiomysql.connect(
        host=MYSQL_HOST,
        port=3306,
        user=MYSQL_USER,
        password=MYSQL_PASSWORD
    )
    async with conn.cursor() as cur:
        await cur.execute(f"CREATE DATABASE IF NOT EXISTS {MYSQL_DATABASE}")
        await cur.execute(f"USE {MYSQL_DATABASE}")
        
        # 1. Students Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS students (
                roll_no VARCHAR(50) PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                father_name VARCHAR(100),
                program VARCHAR(100),
                department VARCHAR(100),
                semester VARCHAR(20),
                section VARCHAR(10),
                status VARCHAR(20) DEFAULT 'Active'
            )
        """)
        
        # 2. Fee Slips Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS fee_slips (
                ref_no VARCHAR(50) PRIMARY KEY,
                student_roll_no VARCHAR(50),
                amount INT,
                bank VARCHAR(100),
                branch VARCHAR(100),
                payment_date DATE,
                status VARCHAR(20),
                fee_type VARCHAR(50),
                challan_no VARCHAR(50),
                FOREIGN KEY (student_roll_no) REFERENCES students(roll_no)
            )
        """)
        
        # 3. Faculty Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS faculty (
                id INT AUTO_INCREMENT PRIMARY KEY,
                name VARCHAR(100) NOT NULL,
                designation VARCHAR(100),
                department VARCHAR(100),
                type VARCHAR(20), -- 'Permanent', 'Visiting'
                email VARCHAR(100),
                specialization VARCHAR(255)
            )
        """)

        # 4. Exam Records
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS exam_records (
                roll_no VARCHAR(50) PRIMARY KEY,
                exam_type VARCHAR(50),
                session VARCHAR(50),
                start_date DATE,
                end_date DATE,
                center VARCHAR(255),
                FOREIGN KEY (roll_no) REFERENCES students(roll_no)
            )
        """)

        # 5. Exam Subjects
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS exam_subjects (
                id INT AUTO_INCREMENT PRIMARY KEY,
                roll_no VARCHAR(50),
                subject_name VARCHAR(255),
                FOREIGN KEY (roll_no) REFERENCES students(roll_no)
            )
        """)

    conn.close()
    print("Database initialized successfully.")

async def seed_data():
    """Seed initial data into the database."""
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor() as cur:
            # Seed Students
            students = [
                ('CS-2026-F-001', 'Muhammad Ikram', 'Sher Muhammad', 'BS Computer Science', 'CS & IT', '1st', 'A'),
                ('SE-2026-F-015', 'Sara Khan', 'Imran Khan', 'BS Software Engineering', 'CS & IT', '2nd', 'B'),
                ('BBA-2026-S-008', 'Ali Hassan', 'Hassan Ali', 'BBA', 'Management Sciences', '3rd', 'A'),
                ('PHR-2026-F-022', 'Fatima Noor', 'Noor Muhammad', 'BS Pharmacy (Pharm-D)', 'Pharmacy', '4th', 'A'),
            ]
            await cur.executemany(
                "INSERT IGNORE INTO students (roll_no, name, father_name, program, department, semester, section) VALUES (%s, %s, %s, %s, %s, %s, %s)",
                students
            )

            # Seed Faculty
            faculty = [
                ('Dr. Hassan Ahmed', 'Professor', 'Computer Science', 'Permanent', 'hassan@uswat.edu.pk', 'Machine Learning'),
                ('Dr. Nadia Khan', 'Associate Professor', 'Computer Science', 'Permanent', 'nadia@uswat.edu.pk', 'Cyber Security'),
                ('Mr. Jawad Shah', 'Lecturer', 'Management Sciences', 'Visiting', 'jawad@uswat.edu.pk', 'Marketing'),
                ('Dr. Saira Ali', 'Assistant Professor', 'Pharmacy', 'Permanent', 'saira@uswat.edu.pk', 'Clinical Pharmacy'),
            ]
            await cur.executemany(
                "INSERT IGNORE INTO faculty (name, designation, department, type, email, specialization) VALUES (%s, %s, %s, %s, %s, %s)",
                faculty
            )

            # Seed Fee Slips
            slips = [
                ('UOS-2026-001234', 'CS-2026-F-001', 45000, 'HBL', 'Mingora', '2026-08-10', 'Verified', 'Semester Fee', 'CHN-2026-78432'),
                ('UOS-2026-001235', 'SE-2026-F-015', 45000, 'NBP', 'Swat', '2026-08-12', 'Verified', 'Semester Fee', 'CHN-2026-78433'),
                ('UOS-2026-001236', 'BBA-2026-S-008', 45000, 'UBL', 'Kanju', '2026-08-15', 'Pending', 'Semester Fee', 'CHN-2026-78434'),
            ]
            await cur.executemany(
                "INSERT IGNORE INTO fee_slips (ref_no, student_roll_no, amount, bank, branch, payment_date, status, fee_type, challan_no) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)",
                slips
            )
            
    pool.close()
    await pool.wait_closed()
    print("Data seeded successfully.")

async def get_student_info(roll_no):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("SELECT * FROM students WHERE roll_no = %s", (roll_no,))
            student = await cur.fetchone()
            if student:
                await cur.execute("SELECT * FROM exam_records WHERE roll_no = %s", (roll_no,))
                exam = await cur.fetchone()
                await cur.execute("SELECT subject_name FROM exam_subjects WHERE roll_no = %s", (roll_no,))
                subjects = await cur.fetchall()
                student['exam_record'] = exam
                student['subjects'] = [s['subject_name'] for s in subjects]
            return student

async def get_fee_info(ref_no):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("""
                SELECT f.*, s.name as student_name, s.program 
                FROM fee_slips f
                JOIN students s ON f.student_roll_no = s.roll_no
                WHERE f.ref_no = %s
            """, (ref_no,))
            return await cur.fetchone()

async def get_faculty_info(department=None):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            if department:
                await cur.execute("SELECT * FROM faculty WHERE department LIKE %s", (f"%{department}%",))
            else:
                await cur.execute("SELECT * FROM faculty")
            return await cur.fetchall()

if __name__ == "__main__":
    asyncio.run(init_db())
    asyncio.run(seed_data())
