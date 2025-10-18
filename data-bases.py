import sqlite3

create_users_table = '''
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  unlocked_spots TEXT
);
'''

create_spots_table = '''
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x_coordinate REAL NOT NULL,
  y_coordinate REAL NOT NULL,
  points_given INTEGER NOT NULL,
  description TEXT,
  pictures TEXT
);
'''

def create_tables():
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS users")  
        cursor.execute("DROP TABLE IF EXISTS spots")  
        cursor.execute(create_users_table)
        cursor.execute(create_spots_table)
        conn.commit()
    print("Tables 'users' and 'spots' created successfully without unlocked column in spots.")

def add_user(email, name, password, total_points=0, unlocked_spots=""):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (email, name, password, total_points, unlocked_spots)
            VALUES (?, ?, ?, ?, ?)
        ''', (email, name, password, total_points, unlocked_spots))
        conn.commit()
    print(f"User {email} added successfully.")

def delete_user(email):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        conn.commit()
    print(f"User {email} deleted successfully.")

def get_user_by_email(email):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM users WHERE email = ?", (email,))
        user_data = cursor.fetchone()
        if user_data:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, user_data))
        else:
            return None

def get_spot_by_id(spot_id):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM spots WHERE id = ?", (spot_id,))
        spot_data = cursor.fetchone()
        if spot_data:
            columns = [column[0] for column in cursor.description]
            return dict(zip(columns, spot_data))
        else:
            return None
