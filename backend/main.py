from fastapi import FastAPI, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
import hashlib
import jwt
from typing import List, Dict, Optional

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "database.db"
SECRET_KEY = "SUPER_SECRET_CYBERPUNK_KEY_CHANGE_THIS"

# --- DATABASE ARCHITECTURE EVOLUTION ---
def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # 1. New Users Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password TEXT NOT NULL,
            role TEXT NOT NULL
        )
    """)
    
    # 2. Evolved Transactions Table with user relation
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            text TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # 3. Friends Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    """)
    
    # Seed default production accounts if they don't exist
    cursor.execute("SELECT * FROM users WHERE username='admin'")
    if not cursor.fetchone():
        admin_pass = hashlib.sha256("admin123".encode()).hexdigest()
        user_pass = hashlib.sha256("user123".encode()).hexdigest()
        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ("admin", admin_pass, "admin"))
        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", ("hari", user_pass, "user"))
        
    conn.commit()
    conn.close()

init_db()

# --- SECURITY SCHEMAS & UTILITIES ---
class LoginRequest(BaseModel):
    username: str
    password: str

class RegisterRequest(BaseModel):
    username: str
    password: str

class TransactionCreate(BaseModel):
    text: str
    amount: float
    category: str
    type: str

class FriendCreate(BaseModel):
    name: str

def verify_token(authorization: Optional[str] = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authentication credentials")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Session expired or tempered token signature")

# --- AUTHENTICATION ENDPOINTS ---
@app.post("/api/auth/register")
def register_user(req: RegisterRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    hashed_password = hashlib.sha256(req.password.encode()).hexdigest()
    try:
        cursor.execute("INSERT INTO users (username, password, role) VALUES (?, ?, ?)", (req.username, hashed_password, "user"))
        conn.commit()
        return {"message": "Unique account allocated successfully"}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="This Username/Unique ID is already taken")
    finally:
        conn.close()

@app.post("/api/auth/login")
def login_user(req: LoginRequest):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    hashed_password = hashlib.sha256(req.password.encode()).hexdigest()
    cursor.execute("SELECT id, username, role FROM users WHERE username = ? AND password = ?", (req.username, hashed_password))
    user = cursor.fetchone()
    conn.close()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid unique credentials")
        
    token_payload = {"user_id": user[0], "username": user[1], "role": user[2]}
    token = jwt.encode(token_payload, SECRET_KEY, algorithm="HS256")
    return {"token": token, "username": user[1], "role": user[2]}

# --- LOCKED ISOLATED EXPENSE ENDPOINTS ---
@app.get("/api/transactions")
def get_transactions(user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    # Isolation Logic: Admins see everything, users see only their own ledger items
    if user["role"] == "admin":
        cursor.execute("SELECT id, text, amount, category, type FROM transactions ORDER BY id DESC")
    else:
        cursor.execute("SELECT id, text, amount, category, type FROM transactions WHERE user_id = ? ORDER BY id DESC", (user["user_id"],))
        
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "text": r[1], "amount": r[2], "category": r[3], "type": r[4]} for r in rows]

@app.post("/api/transactions")
def add_transaction(tx: TransactionCreate, user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    final_category = "Income" if tx.type == "income" else tx.category
    cursor.execute(
        "INSERT INTO transactions (user_id, text, amount, category, type) VALUES (?, ?, ?, ?, ?)",
        (user["user_id"], tx.text, tx.amount, final_category, tx.type)
    )
    conn.commit()
    generated_id = cursor.lastrowid
    conn.close()
    return {"id": generated_id, "text": tx.text, "amount": tx.amount, "category": final_category, "type": tx.type}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int, user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if user["role"] == "admin":
        cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    else:
        cursor.execute("DELETE FROM transactions WHERE id = ? AND user_id = ?", (tx_id, user["user_id"]))
        
    conn.commit()
    conn.close()
    return {"message": "Metric dropped successfully"}

@app.get("/api/analytics/summary")
def get_analytics_summary(user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    if user["role"] == "admin":
        cursor.execute("SELECT type, SUM(amount) FROM transactions GROUP BY type")
        totals = dict(cursor.fetchall())
        cursor.execute("SELECT category, SUM(amount) FROM transactions WHERE type='expense' GROUP BY category")
        categories = dict(cursor.fetchall())
    else:
        cursor.execute("SELECT type, SUM(amount) FROM transactions WHERE user_id=? GROUP BY type", (user["user_id"],))
        totals = dict(cursor.fetchall())
        cursor.execute("SELECT category, SUM(amount) FROM transactions WHERE type='expense' AND user_id=? GROUP BY category", (user["user_id"],))
        categories = dict(cursor.fetchall())
        
    conn.close()
    return {
        "total_income": totals.get("income", 0.0),
        "total_expense": totals.get("expense", 0.0),
        "category_breakdown": categories
    }

# --- FRIENDS DATA ACCESS (SHARED APIS) ---
@app.get("/api/friends")
def get_friends(user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM friends")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1]} for r in rows]

@app.post("/api/friends")
def add_friend(friend: FriendCreate, user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO friends (name) VALUES (?)", (friend.name,))
        conn.commit()
        return {"id": cursor.lastrowid, "name": friend.name}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Circle item already exists")
    finally:
        conn.close()

@app.delete("/api/friends/{friend_id}")
def delete_single_friend(friend_id: int, user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friends WHERE id = ?", (friend_id,))
    conn.commit()
    conn.close()
    return {"message": "Removed from circle successfully"}

@app.delete("/api/transactions")
def clear_all_transactions(user: dict = Depends(verify_token)):
    if user["role"] != "admin":
        raise HTTPException(status_code=403, detail="System wipe permissions restricted to Admins only")
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    conn.commit()
    conn.close()
    return {"message": "Entire application ledger wiped clean"}

@app.delete("/api/friends")
def clear_all_friends(user: dict = Depends(verify_token)):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friends")
    conn.commit()
    conn.close()
    return {"message": "All circle links cleared"}