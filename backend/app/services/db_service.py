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
        
        # 1. Departments Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS departments (
                dept_id INT AUTO_INCREMENT PRIMARY KEY,
                dept_name VARCHAR(100) NOT NULL UNIQUE,
                building VARCHAR(100),
                head_of_dept VARCHAR(100)
            )
        """)

        # 2. Programs Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS programs (
                program_id INT AUTO_INCREMENT PRIMARY KEY,
                dept_id INT,
                program_name VARCHAR(100) NOT NULL,
                duration_years INT DEFAULT 4,
                total_semesters INT DEFAULT 8,
                total_fee_estimate DECIMAL(10, 2),
                FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
            )
        """)
        
        # 3. Students Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS students (
                roll_no VARCHAR(50) PRIMARY KEY,
                dept_id INT,
                program_id INT,
                name VARCHAR(100) NOT NULL,
                father_name VARCHAR(100),
                current_semester INT DEFAULT 1,
                section CHAR(1) DEFAULT 'A',
                status VARCHAR(20) DEFAULT 'Active',
                FOREIGN KEY (dept_id) REFERENCES departments(dept_id),
                FOREIGN KEY (program_id) REFERENCES programs(program_id)
            )
        """)
        
        # 4. Fee Slips Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS fee_slips (
                ref_no VARCHAR(50) PRIMARY KEY,
                roll_no VARCHAR(50),
                amount_due DECIMAL(10, 2),
                amount_paid DECIMAL(10, 2) DEFAULT 0,
                payment_date DATE,
                bank_name VARCHAR(100),
                branch_name VARCHAR(100),
                status VARCHAR(20),
                fee_type VARCHAR(50),
                challan_no VARCHAR(50),
                FOREIGN KEY (roll_no) REFERENCES students(roll_no)
            )
        """)
        
        # 5. Faculty Table
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS faculty (
                faculty_id INT AUTO_INCREMENT PRIMARY KEY,
                dept_id INT,
                name VARCHAR(100) NOT NULL,
                designation VARCHAR(100),
                faculty_type VARCHAR(20), -- 'Permanent', 'Visiting'
                email VARCHAR(100),
                specialization TEXT,
                FOREIGN KEY (dept_id) REFERENCES departments(dept_id)
            )
        """)

        # 6. Exam Schedules
        await cur.execute("""
            CREATE TABLE IF NOT EXISTS exam_schedules (
                schedule_id INT AUTO_INCREMENT PRIMARY KEY,
                roll_no VARCHAR(50),
                exam_type VARCHAR(50),
                semester INT,
                exam_date DATE,
                start_time TIME,
                venue VARCHAR(100),
                FOREIGN KEY (roll_no) REFERENCES students(roll_no)
            )
        """)

    conn.close()
    print("Database schema verified/created.")

async def get_student_info(roll_no):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("""
                SELECT s.*, d.dept_name as department, p.program_name as program
                FROM students s
                LEFT JOIN departments d ON s.dept_id = d.dept_id
                LEFT JOIN programs p ON s.program_id = p.program_id
                WHERE s.roll_no = %s
            """, (roll_no,))
            student = await cur.fetchone()
            if student:
                # Use exam_schedules instead of exam_records
                await cur.execute("SELECT * FROM exam_schedules WHERE roll_no = %s", (roll_no,))
                exam = await cur.fetchone()
                student['exam_record'] = exam
                student['subjects'] = [] # Subjects table is deprecated in favor of exam_schedules content if needed
            return student

async def get_fee_info(ref_no):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            await cur.execute("""
                SELECT f.*, s.name as student_name, p.program_name as program,
                       f.amount_paid as amount, f.bank_name as bank, f.branch_name as branch
                FROM fee_slips f
                JOIN students s ON f.roll_no = s.roll_no
                LEFT JOIN programs p ON s.program_id = p.program_id
                WHERE f.ref_no = %s
            """, (ref_no,))
            return await cur.fetchone()

async def get_faculty_info(department=None):
    pool = await get_db_pool()
    async with pool.acquire() as conn:
        async with conn.cursor(aiomysql.DictCursor) as cur:
            query = """
                SELECT f.*, d.dept_name as department, f.faculty_type as type
                FROM faculty f
                LEFT JOIN departments d ON f.dept_id = d.dept_id
            """
            if department:
                query += " WHERE d.dept_name LIKE %s"
                await cur.execute(query, (f"%{department}%",))
            else:
                await cur.execute(query)
            return await cur.fetchall()

if __name__ == "__main__":
    asyncio.run(init_db())
