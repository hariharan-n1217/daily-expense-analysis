from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import sqlite3
from typing import List, Dict

app = FastAPI()

# Global CORS Policy allows the deployed Vercel frontend to seamlessly communicate
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_FILE = "database.db"

def init_db():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            text TEXT NOT NULL,
            amount REAL NOT NULL,
            category TEXT NOT NULL,
            type TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        )
    """)
    conn.commit()
    conn.close()

init_db()

class TransactionCreate(BaseModel):
    text: str
    amount: float
    category: str
    type: str

class FriendCreate(BaseModel):
    name: str

@app.get("/api/transactions")
def get_transactions():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, text, amount, category, type FROM transactions ORDER BY id DESC")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "text": r[1], "amount": r[2], "category": r[3], "type": r[4]} for r in rows]

@app.post("/api/transactions")
def add_transaction(tx: TransactionCreate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    final_category = "Income" if tx.type == "income" else tx.category
    cursor.execute(
        "INSERT INTO transactions (text, amount, category, type) VALUES (?, ?, ?, ?)",
        (tx.text, tx.amount, final_category, tx.type)
    )
    conn.commit()
    generated_id = cursor.lastrowid
    conn.close()
    return {"id": generated_id, "text": tx.text, "amount": tx.amount, "category": final_category, "type": tx.type}

@app.delete("/api/transactions/{tx_id}")
def delete_transaction(tx_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions WHERE id = ?", (tx_id,))
    conn.commit()
    conn.close()
    return {"message": "Deleted successfully"}

@app.get("/api/analytics/summary")
def get_analytics_summary():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT type, SUM(amount) FROM transactions GROUP BY type")
    totals = dict(cursor.fetchall())
    cursor.execute("SELECT category, SUM(amount) FROM transactions WHERE type='expense' GROUP BY category")
    categories = dict(cursor.fetchall())
    conn.close()
    return {
        "total_income": totals.get("income", 0.0),
        "total_expense": totals.get("expense", 0.0),
        "category_breakdown": categories
    }

@app.get("/api/friends")
def get_friends():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("SELECT id, name FROM friends")
    rows = cursor.fetchall()
    conn.close()
    return [{"id": r[0], "name": r[1]} for r in rows]

@app.post("/api/friends")
def add_friend(friend: FriendCreate):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    try:
        cursor.execute("INSERT INTO friends (name) VALUES (?)", (friend.name,))
        conn.commit()
        generated_id = cursor.lastrowid
        return {"id": generated_id, "name": friend.name}
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=400, detail="Friend already exists")
    finally:
        conn.close()

@app.delete("/api/friends/{friend_id}")
def delete_single_friend(friend_id: int):
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friends WHERE id = ?", (friend_id,))
    conn.commit()
    conn.close()
    return {"message": "Friend removed from splitting circle"}

@app.delete("/api/transactions")
def clear_all_transactions():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM transactions")
    conn.commit()
    conn.close()
    return {"message": "All transaction metrics cleared successfully"}

@app.delete("/api/friends")
def clear_all_friends():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    cursor.execute("DELETE FROM friends")
    conn.commit()
    conn.close()
    return {"message": "All friends removed"}