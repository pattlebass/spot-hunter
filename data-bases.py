import sqlite3

# SQL commands to create users and spots tables
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

# Initialize database tables (drops existing and recreates)
def create_tables():
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DROP TABLE IF EXISTS users")
        cursor.execute("DROP TABLE IF EXISTS spots")
        cursor.execute(create_users_table)
        cursor.execute(create_spots_table)
        conn.commit()
    print("Database tables 'users' and 'spots' created/reset successfully.")

# Add a user to the database
def add_user(email, name, password, total_points=0, unlocked_spots=""):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO users (email, name, password, total_points, unlocked_spots)
            VALUES (?, ?, ?, ?, ?)
        ''', (email, name, password, total_points, unlocked_spots))
        conn.commit()
    print(f"User {email} added successfully.")

# Delete a user from the database by email
def delete_user(email):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM users WHERE email = ?", (email,))
        conn.commit()
    print(f"User {email} deleted successfully.")

# Retrieve user data by email
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

# Add a spot to the database
def add_spot(x_coordinate, y_coordinate, points_given, description, pictures):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO spots (x_coordinate, y_coordinate, points_given, description, pictures)
            VALUES (?, ?, ?, ?, ?)
        ''', (x_coordinate, y_coordinate, points_given, description, pictures))
        conn.commit()
    print(f"Spot at ({x_coordinate}, {y_coordinate}) added successfully.")

# Delete a spot from the database by id
def delete_spot(spot_id):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM spots WHERE id = ?", (spot_id,))
        conn.commit()
    print(f"Spot with ID {spot_id} deleted successfully.")

# Retrieve spot data by id
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
