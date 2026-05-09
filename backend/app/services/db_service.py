import os
import asyncio
import aiomysql
import aiosqlite
from dotenv import load_dotenv

load_dotenv()

MYSQL_HOST     = os.getenv("MYSQL_HOST", "localhost")
MYSQL_USER     = os.getenv("MYSQL_USER", "root")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD", "")
MYSQL_DATABASE = os.getenv("MYSQL_DATABASE", "uos_chatbot")


async def get_db_connection():
    """Returns a connection and the DB type (mysql/sqlite)."""
    try:
        conn = await aiomysql.connect(
            host=MYSQL_HOST, port=3306, user=MYSQL_USER,
            password=MYSQL_PASSWORD, db=MYSQL_DATABASE, autocommit=True
        )
        return conn, "mysql"
    except Exception:
        db_path = os.path.join(os.path.dirname(__file__), "..", "..", "uos_chatbot.db")
        db_path = os.path.abspath(db_path)
        conn = await aiosqlite.connect(db_path)
        conn.row_factory = aiosqlite.Row
        return conn, "sqlite"


async def init_db():
    """Initialises the database and seeds demo data if running on SQLite."""
    conn, db_type = await get_db_connection()
    auto_inc = "AUTO_INCREMENT" if db_type == "mysql" else "AUTOINCREMENT"

    schema = [
        f"""CREATE TABLE IF NOT EXISTS departments (
            dept_id INTEGER PRIMARY KEY {auto_inc},
            dept_name VARCHAR(100) NOT NULL UNIQUE,
            building VARCHAR(100),
            head_of_dept VARCHAR(100)
        )""",
        f"""CREATE TABLE IF NOT EXISTS programs (
            program_id INTEGER PRIMARY KEY {auto_inc},
            dept_id INT,
            program_name VARCHAR(100) NOT NULL,
            duration_years INT DEFAULT 4,
            total_semesters INT DEFAULT 8,
            total_fee_estimate DECIMAL(10,2)
        )""",
        f"""CREATE TABLE IF NOT EXISTS students (
            roll_no VARCHAR(50) PRIMARY KEY,
            dept_id INT,
            program_id INT,
            name VARCHAR(100) NOT NULL,
            father_name VARCHAR(100),
            current_semester INT DEFAULT 1,
            section CHAR(1) DEFAULT 'A',
            status VARCHAR(20) DEFAULT 'Active'
        )""",
        f"""CREATE TABLE IF NOT EXISTS fee_slips (
            ref_no VARCHAR(50) PRIMARY KEY,
            roll_no VARCHAR(50),
            amount_due DECIMAL(10,2),
            amount_paid DECIMAL(10,2) DEFAULT 0,
            payment_date DATE,
            bank_name VARCHAR(100),
            branch_name VARCHAR(100),
            status VARCHAR(20),
            fee_type VARCHAR(50),
            challan_no VARCHAR(50)
        )""",
        f"""CREATE TABLE IF NOT EXISTS faculty (
            faculty_id INTEGER PRIMARY KEY {auto_inc},
            dept_id INT,
            name VARCHAR(100) NOT NULL,
            designation VARCHAR(100),
            faculty_type VARCHAR(20),
            email VARCHAR(100),
            specialization TEXT
        )""",
        f"""CREATE TABLE IF NOT EXISTS exam_schedules (
            schedule_id INTEGER PRIMARY KEY {auto_inc},
            roll_no VARCHAR(50),
            exam_type VARCHAR(50),
            semester INT,
            exam_date DATE,
            start_time TIME,
            venue VARCHAR(100)
        )""",
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
            async with conn.execute("SELECT COUNT(*) FROM students") as cur:
                row  = await cur.fetchone()
                count = row[0] if row else 0

            if count == 0:
                print("  [SEED] Seeding SQLite with professional demo data...")
                await _seed_demo_data(conn)
    finally:
        if db_type == "mysql":
            conn.close()
        else:
            await conn.close()

    print(f"[OK] Database ({db_type}) initialized successfully.")


async def _seed_demo_data(conn):
    """Insert rich, realistic demo data covering the full university structure."""

    # ── Departments ───────────────────────────────────────────────────────────
    departments = [
        (1, "Computer Science & IT",       "Academic Block A", "Dr. Arif Hussain"),
        (2, "Business Administration",      "Commerce Block",   "Prof. Dr. Khalid Mehmood"),
        (3, "Pharmacy",                     "Pharmacy Block",   "Dr. Saima Nazir"),
        (4, "Mathematics",                  "Science Block B",  "Dr. Farooq Ahmad"),
        (5, "Physics",                      "Science Block A",  "Dr. Imran Ullah"),
        (6, "English Language & Literature","Humanities Block", "Dr. Nadia Khatoon"),
        (7, "Pashto",                       "Humanities Block", "Dr. Fazlur Rahman"),
        (8, "Management Sciences",          "Commerce Block",   "Dr. Zia Ur Rahman"),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO departments (dept_id, dept_name, building, head_of_dept) VALUES (?,?,?,?)",
        departments
    )

    # ── Programs ──────────────────────────────────────────────────────────────
    programs = [
        (1, 1, "BS Computer Science",         4, 8, 360000.00),
        (2, 1, "MCS",                         2, 4, 200000.00),
        (3, 2, "BBA",                         4, 8, 320000.00),
        (4, 2, "MBA",                         2, 4, 220000.00),
        (5, 3, "Pharm-D",                     5, 10, 500000.00),
        (6, 4, "BS Mathematics",              4, 8, 280000.00),
        (7, 5, "BS Physics",                  4, 8, 280000.00),
        (8, 6, "BS English",                  4, 8, 260000.00),
        (9, 8, "MS Management Sciences",      2, 4, 200000.00),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO programs (program_id, dept_id, program_name, duration_years, total_semesters, total_fee_estimate) VALUES (?,?,?,?,?,?)",
        programs
    )

    # ── Students ──────────────────────────────────────────────────────────────
    students = [
        ("CS-2026-F-001", 1, 1, "Muhammad Ikram",    "Sher Muhammad",     1, "A", "Active"),
        ("CS-2026-F-002", 1, 1, "Ali Hassan",         "Hassan Khan",       1, "A", "Active"),
        ("CS-2026-F-003", 1, 1, "Sara Bibi",          "Rehmat Ullah",      1, "B", "Active"),
        ("CS-2025-F-010", 1, 1, "Faisal Ahmad",       "Ahmad Shah",        3, "A", "Active"),
        ("CS-2025-F-011", 1, 1, "Raheela Naz",        "Naz Muhammad",      3, "B", "Active"),
        ("CS-2024-F-020", 1, 1, "Tariq Mehmood",      "Mehmood Khan",      5, "A", "Active"),
        ("BBA-2026-F-001",3, 3, "Hamid Ullah",        "Ullah Jan",         1, "A", "Active"),
        ("BBA-2026-F-002",3, 3, "Kiran Iftikhar",     "Iftikhar Ahmed",    1, "A", "Active"),
        ("PHD-2026-F-001",5, 5, "Zubair Khan",        "Khan Zaman",        1, "A", "Active"),
        ("PHD-2026-F-002",5, 5, "Sana Gul",           "Gul Badshah",       1, "B", "Active"),
        ("MCS-2025-F-001",2, 2, "Imran Ullah",        "Ullah Khan",        2, "A", "Active"),
        ("BSM-2026-F-001",6, 6, "Noman Ahmad",        "Ahmad Ullah",       1, "A", "Active"),
        ("ENG-2026-F-001",8, 8, "Amna Bibi",          "Muhammad Afzal",    1, "A", "Active"),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO students (roll_no, dept_id, program_id, name, father_name, current_semester, section, status) VALUES (?,?,?,?,?,?,?,?)",
        students
    )

    # ── Fee Slips ─────────────────────────────────────────────────────────────
    fee_slips = [
        ("UOS-2026-001234", "CS-2026-F-001",  45000, 45000, "2026-08-10", "HBL",     "Mingora",   "Verified",  "Semester Fee", "CHN-78432"),
        ("UOS-2026-001235", "CS-2026-F-002",  45000, 45000, "2026-08-12", "MCB",     "Saidu",     "Verified",  "Semester Fee", "CHN-78433"),
        ("UOS-2026-001236", "CS-2026-F-003",  45000,     0, "2026-08-15", "NBP",     "Mingora",   "Pending",   "Semester Fee", "CHN-78434"),
        ("UOS-2026-001237", "BBA-2026-F-001", 40000, 40000, "2026-08-08", "UBL",     "Islampur",  "Verified",  "Semester Fee", "CHN-78435"),
        ("UOS-2026-001238", "PHD-2026-F-001", 65000, 65000, "2026-08-05", "Bank AL Habib","Mingora","Verified", "Semester Fee", "CHN-78436"),
        ("UOS-2026-001239", "PHD-2026-F-002", 65000, 32500, "2026-08-09", "HBL",     "Mardan",    "Partial",   "Semester Fee", "CHN-78437"),
        ("UOS-2026-001240", "MCS-2025-F-001", 50000, 50000, "2026-01-15", "ABL",     "Mingora",   "Verified",  "Semester Fee", "CHN-78438"),
        ("UOS-2026-001241", "CS-2025-F-010",  45000, 45000, "2026-01-20", "Meezan",  "Saidu",     "Verified",  "Semester Fee", "CHN-78439"),
        ("UOS-2026-001242", "CS-2026-F-001",  20000, 20000, "2026-08-01", "HBL",     "Mingora",   "Verified",  "Hostel Fee",   "CHN-78440"),
        ("UOS-2026-001243", "ENG-2026-F-001", 26000, 26000, "2026-08-11", "NBP",     "Mingora",   "Verified",  "Semester Fee", "CHN-78441"),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO fee_slips (ref_no, roll_no, amount_due, amount_paid, payment_date, bank_name, branch_name, status, fee_type, challan_no) VALUES (?,?,?,?,?,?,?,?,?,?)",
        fee_slips
    )

    # ── Faculty ───────────────────────────────────────────────────────────────
    faculty = [
        (1, "Dr. Arif Hussain",       "Associate Professor & HoD", "Permanent", "arif.hussain@uswat.edu.pk",      "Artificial Intelligence, Machine Learning"),
        (1, "Dr. Saeed Khan",          "Assistant Professor",        "Permanent", "saeed.khan@uswat.edu.pk",        "Database Systems, Cloud Computing"),
        (1, "Mr. Zia Ur Rehman",       "Lecturer",                   "Contract",  "zia.rehman@uswat.edu.pk",        "Web Development, OOP"),
        (1, "Ms. Fareeha Naz",         "Lecturer",                   "Contract",  "fareeha.naz@uswat.edu.pk",       "Data Structures, Algorithms"),
        (2, "Prof. Dr. Khalid Mehmood","Professor & HoD",            "Permanent", "khalid.mehmood@uswat.edu.pk",    "Strategic Management, Finance"),
        (2, "Dr. Faisal Iqbal",        "Associate Professor",        "Permanent", "faisal.iqbal@uswat.edu.pk",      "Marketing, Consumer Behaviour"),
        (3, "Dr. Saima Nazir",         "Professor & HoD",            "Permanent", "saima.nazir@uswat.edu.pk",       "Clinical Pharmacy, Pharmacology"),
        (3, "Dr. Bilal Ahmad",         "Assistant Professor",        "Permanent", "bilal.ahmad@uswat.edu.pk",       "Pharmaceutical Chemistry"),
        (4, "Dr. Farooq Ahmad",        "Associate Professor & HoD",  "Permanent", "farooq.ahmad@uswat.edu.pk",      "Real Analysis, Topology"),
        (5, "Dr. Imran Ullah",         "Professor & HoD",            "Permanent", "imran.ullah@uswat.edu.pk",       "Quantum Physics, Optics"),
        (6, "Dr. Nadia Khatoon",       "Associate Professor & HoD",  "Permanent", "nadia.khatoon@uswat.edu.pk",     "Applied Linguistics, Literature"),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO faculty (dept_id, name, designation, faculty_type, email, specialization) VALUES (?,?,?,?,?,?)",
        faculty
    )

    # ── Exam Schedules ────────────────────────────────────────────────────────
    exams = [
        ("CS-2026-F-001", "Mid-Term", 1, "2026-11-05", "09:00", "Main Examination Hall"),
        ("CS-2026-F-002", "Mid-Term", 1, "2026-11-05", "09:00", "Main Examination Hall"),
        ("CS-2026-F-003", "Mid-Term", 1, "2026-11-05", "11:00", "Examination Hall B"),
        ("BBA-2026-F-001","Mid-Term", 1, "2026-11-06", "09:00", "Commerce Block Hall"),
        ("PHD-2026-F-001","Final",    1, "2026-12-10", "09:00", "Main Examination Hall"),
        ("MCS-2025-F-001","Final",    2, "2026-06-15", "11:00", "CS Lab Block"),
        ("CS-2025-F-010", "Final",    3, "2026-06-16", "09:00", "Main Examination Hall"),
    ]
    await conn.executemany(
        "INSERT OR IGNORE INTO exam_schedules (roll_no, exam_type, semester, exam_date, start_time, venue) VALUES (?,?,?,?,?,?)",
        exams
    )

    await conn.commit()
    print("  [SEED] ✓ Departments, Programs, Students, Faculty, Fee Slips & Exam Schedules inserted.")


# ── Helpers ───────────────────────────────────────────────────────────────────

def _clean_row(row):
    """Convert Decimal and Date objects to JSON-serializable formats."""
    if not row:
        return None
    from decimal import Decimal
    from datetime import date, time
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, Decimal):
            d[k] = float(v)
        elif isinstance(v, (date, time)):
            d[k] = str(v)
    return d


async def fetch_one(query, params):
    conn, db_type = await get_db_connection()
    try:
        final_query = query.replace("?", "%s") if db_type == "mysql" else query
        if db_type == "mysql":
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(final_query, params)
                row = await cur.fetchone()
                return _clean_row(row)
        else:
            async with conn.execute(final_query, params) as cur:
                row = await cur.fetchone()
                return _clean_row(row)
    finally:
        if db_type == "mysql":
            conn.close()
        else:
            await conn.close()


async def fetch_all(query, params=None):
    conn, db_type = await get_db_connection()
    try:
        final_query = query.replace("?", "%s") if db_type == "mysql" else query
        if db_type == "mysql":
            async with conn.cursor(aiomysql.DictCursor) as cur:
                await cur.execute(final_query, params or ())
                rows = await cur.fetchall()
                return [_clean_row(r) for r in rows]
        else:
            async with conn.execute(final_query, params or ()) as cur:
                rows = await cur.fetchall()
                return [_clean_row(r) for r in rows]
    finally:
        if db_type == "mysql":
            conn.close()
        else:
            await conn.close()


async def get_student_info(roll_no):
    q = """
        SELECT s.*, d.dept_name AS department, p.program_name AS program
        FROM students s
        LEFT JOIN departments d ON s.dept_id = d.dept_id
        LEFT JOIN programs p ON s.program_id = p.program_id
        WHERE s.roll_no = ?
    """
    student = await fetch_one(q, (roll_no,))
    if student:
        exam = await fetch_one(
            "SELECT * FROM exam_schedules WHERE roll_no = ? ORDER BY exam_date DESC LIMIT 1",
            (roll_no,)
        )
        student["exam_record"] = exam
        student["subjects"] = []
    return student


async def get_fee_info(ref_no):
    q = """
        SELECT f.*, s.name AS student_name, p.program_name AS program,
               f.amount_paid AS amount, f.bank_name AS bank, f.branch_name AS branch
        FROM fee_slips f
        JOIN students s ON f.roll_no = s.roll_no
        LEFT JOIN programs p ON s.program_id = p.program_id
        WHERE f.ref_no = ?
    """
    return await fetch_one(q, (ref_no,))


async def get_faculty_info(department=None):
    query = """
        SELECT f.*, d.dept_name AS department, f.faculty_type AS type
        FROM faculty f
        LEFT JOIN departments d ON f.dept_id = d.dept_id
    """
    if department:
        query += " WHERE d.dept_name LIKE ?"
        return await fetch_all(query, (f"%{department}%",))
    return await fetch_all(query)


async def get_db_pool():
    """Compatibility helper for connection testing."""
    conn, db_type = await get_db_connection()
    return conn, db_type


if __name__ == "__main__":
    asyncio.run(init_db())
