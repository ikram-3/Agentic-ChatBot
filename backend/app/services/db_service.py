import os
import asyncio
import aiomysql
import aiosqlite
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "uos_chatbot")

# Global flag to track which DB we are using
DB_TYPE = "mysql" 

async def get_db_connection():
    """Returns a connection and the DB type (mysql/sqlite)."""
    global DB_TYPE
    try:
        # Try MySQL first
        conn = await aiomysql.connect(
            host=MYSQL_HOST,
            port=3306,
            user=MYSQL_USER,
            password=MYSQL_PASSWORD,
            db=MYSQL_DATABASE,
            autocommit=True
        )
        DB_TYPE = "mysql"
        return conn, "mysql"
    except Exception:
        # Fallback to SQLite (perfect for Hugging Face)
        db_path = os.path.join(os.getcwd(), "uos_chatbot.db")
        conn = await aiosqlite.connect(db_path)
        conn.row_factory = aiosqlite.Row
        DB_TYPE = "sqlite"
        return conn, "sqlite"

async def init_db():
    """Initializes whichever database is active (MySQL or SQLite)."""
    conn, db_type = await get_db_connection()
    
    auto_inc = "AUTO_INCREMENT" if db_type == "mysql" else "AUTOINCREMENT"
    
    schema = [
        f"CREATE TABLE IF NOT EXISTS departments (dept_id INTEGER PRIMARY KEY {auto_inc}, dept_name VARCHAR(100) NOT NULL UNIQUE, building VARCHAR(100), head_of_dept VARCHAR(100))",
        f"CREATE TABLE IF NOT EXISTS programs (program_id INTEGER PRIMARY KEY {auto_inc}, dept_id INT, program_name VARCHAR(100) NOT NULL, duration_years INT DEFAULT 4, total_semesters INT DEFAULT 8, total_fee_estimate DECIMAL(10, 2))",
        f"CREATE TABLE IF NOT EXISTS students (roll_no VARCHAR(50) PRIMARY KEY, dept_id INT, program_id INT, name VARCHAR(100) NOT NULL, father_name VARCHAR(100), current_semester INT DEFAULT 1, section CHAR(1) DEFAULT 'A', status VARCHAR(20) DEFAULT 'Active')",
        f"CREATE TABLE IF NOT EXISTS fee_slips (ref_no VARCHAR(50) PRIMARY KEY, roll_no VARCHAR(50), amount_due DECIMAL(10, 2), amount_paid DECIMAL(10, 2) DEFAULT 0, payment_date DATE, bank_name VARCHAR(100), branch_name VARCHAR(100), status VARCHAR(20), fee_type VARCHAR(50), challan_no VARCHAR(50))",
        f"CREATE TABLE IF NOT EXISTS faculty (faculty_id INTEGER PRIMARY KEY {auto_inc}, dept_id INT, name VARCHAR(100) NOT NULL, designation VARCHAR(100), faculty_type VARCHAR(20), email VARCHAR(100), specialization TEXT)",
        f"CREATE TABLE IF NOT EXISTS exam_schedules (schedule_id INTEGER PRIMARY KEY {auto_inc}, roll_no VARCHAR(50), exam_type VARCHAR(50), semester INT, exam_date DATE, start_time TIME, venue VARCHAR(100))"
    ]

    try:
        if db_type == "mysql":
            async with conn.cursor() as cur:
                for stmt in schema:
                    await cur.execute(stmt)
        else:
            for stmt in schema:
                await conn.execute(stmt)
            await conn.commit()
        
        if db_type == "sqlite":
            # Check if empty and seed basic data for Hugging Face demo
            async with conn.execute("SELECT COUNT(*) FROM students") as cur:
                row = await cur.fetchone()
                count = row[0] if row else 0
                
            if count == 0:
                print("  🌱 Seeding SQLite with demo data...")
                seed_queries = [
                    "INSERT INTO departments (dept_name, building, head_of_dept) VALUES ('CS & IT', 'Block A', 'Dr. Hassan Ahmed')",
                    "INSERT INTO programs (dept_id, program_name) VALUES (1, 'BS Computer Science')",
                    "INSERT INTO students (roll_no, dept_id, program_id, name, father_name) VALUES ('CS-2026-F-001', 1, 1, 'Muhammad Ikram', 'Sher Muhammad')",
                    "INSERT INTO fee_slips (ref_no, roll_no, amount_paid, status, challan_no) VALUES ('UOS-2026-001234', 'CS-2026-F-001', 45000, 'Verified', 'CHN-78432')",
                    "INSERT INTO faculty (dept_id, name, designation, faculty_type) VALUES (1, 'Dr. Nadia Khan', 'Associate Professor', 'Permanent')",
                    "INSERT INTO exam_schedules (roll_no, exam_type, exam_date, venue) VALUES ('CS-2026-F-001', 'Mid-Term', '2026-11-05', 'Main Hall')"
                ]
                for q in seed_queries:
                    await conn.execute(q)
                await conn.commit()
    finally:
        await conn.close()
    
    print(f"✅ Database ({db_type}) initialized successfully.")

async def fetch_one(query, params):
    conn, db_type = await get_db_connection()
    try:
        if db_type == "mysql":
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(query, params)
                return await cur.fetchone()
        else:
            async with conn.execute(query, params) as cur:
                row = await cur.fetchone()
                return dict(row) if row else None
    finally:
        await conn.close()

async def fetch_all(query, params=None):
    conn, db_type = await get_db_connection()
    try:
        if db_type == "mysql":
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(query, params or ())
                return await cur.fetchall()
        else:
            async with conn.execute(query, params or ()) as cur:
                rows = await cur.fetchall()
                return [dict(r) for r in rows]
    finally:
        await conn.close()

async def get_student_info(roll_no):
    q = """
        SELECT s.*, d.dept_name as department, p.program_name as program
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.dept_id
        LEFT JOIN programs p ON s.program_id = p.program_id
        WHERE s.roll_no = ?
    """
    student = await fetch_one(q.replace("?", "%s" if DB_TYPE == "mysql" else "?"), (roll_no,))
    
    if student:
        exam_q = "SELECT * FROM exam_schedules WHERE roll_no = ?"
        exam = await fetch_one(exam_q.replace("?", "%s" if DB_TYPE == "mysql" else "?"), (roll_no,))
        student['exam_record'] = exam
        student['subjects'] = []
    return student

async def get_fee_info(ref_no):
    q = """
        SELECT f.*, s.name as student_name, p.program_name as program,
               f.amount_paid as amount, f.bank_name as bank, f.branch_name as branch
        FROM fee_slips f
        JOIN students s ON f.roll_no = s.roll_no
        LEFT JOIN programs p ON s.program_id = p.program_id
        WHERE f.ref_no = ?
    """
    return await fetch_one(q.replace("?", "%s" if DB_TYPE == "mysql" else "?"), (ref_no,))

async def get_faculty_info(department=None):
    query = """
        SELECT f.*, d.dept_name as department, f.faculty_type as type
        FROM faculty f
        LEFT JOIN departments d ON f.dept_id = d.dept_id
    """
    if department:
        query += " WHERE d.dept_name LIKE ?"
        return await fetch_all(query.replace("?", "%s" if DB_TYPE == "mysql" else "?"), (f"%{department}%",))
    return await fetch_all(query)

async def get_db_pool():
    # This is only used for the connectivity check in rag_service.py
    # We return a dummy object that supports 'acquire' as an async context manager
    class DummyPool:
        async def __aenter__(self): return self
        async def __aexit__(self, *args): pass
        def acquire(self):
            class DummyConn:
                async def __aenter__(self): return self
                async def __aexit__(self, *args): pass
                def cursor(self):
                    class DummyCur:
                        async def __aenter__(self): return self
                        async def __aexit__(self, *args): pass
                        async def execute(self, q): pass
                    return DummyCur()
            return DummyConn()
    return DummyPool()

if __name__ == "__main__":
    asyncio.run(init_db())
