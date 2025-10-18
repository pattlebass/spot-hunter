import sqlite3
import json
from OSMPythonTools.overpass import Overpass


overpass = Overpass()

# SQL commands to create users and spots tables
create_users_table = '''
CREATE TABLE IF NOT EXISTS users (
  email TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  password TEXT NOT NULL,
  total_points INTEGER DEFAULT 0,
  unlocked_spots TEXT DEFAULT '[]'
);
'''

create_spots_table = '''
CREATE TABLE IF NOT EXISTS spots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  x_coordinate REAL NOT NULL,
  y_coordinate REAL NOT NULL,
  name TEXT,
  points_given INTEGER NOT NULL,
  messages TEXT
);
'''

def create_tables():
    try:
        with sqlite3.connect('game.db') as conn:
            cursor = conn.cursor()
            try:
                cursor.execute("DROP TABLE IF EXISTS users")
                cursor.execute("DROP TABLE IF EXISTS spots")
                cursor.execute(create_users_table)
                cursor.execute(create_spots_table)
                conn.commit()
                print("Database tables 'users' and 'spots' created/reset successfully.")
            except sqlite3.Error as e:
                conn.rollback()
                print(f"SQLite error during table creation: {e}")
    except sqlite3.OperationalError as e:
        print(f"Operational error connecting to the database: {e}")
    except Exception as e:
        print(f"Unexpected error: {e}")

def add_user(email, name, password, total_points=0, unlocked_spots="[]"):
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

def add_spot(x_coordinate, y_coordinate, name, points_given, messages="[]"):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute('''
            INSERT INTO spots (x_coordinate, y_coordinate, points_given, name, messages)
            VALUES (?, ?, ?, ?, ?)
        ''', (x_coordinate, y_coordinate, points_given, name, messages))
        conn.commit()
    print(f"Spot {name} at ({x_coordinate}, {y_coordinate}) added successfully.")

def delete_spot(spot_id):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM spots WHERE id = ?", (spot_id,))
        conn.commit()
    print(f"Spot with ID {spot_id} deleted successfully.")

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

def get_all_spot_ids():
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT id FROM spots")
        rows = cursor.fetchall()
        return [row[0] for row in rows]

def get_spots_with_columns(columns = ["id", "x_coordinate", "y_coordinate", "name"]):
    if not columns:
        raise ValueError("You must specify at least one column name.")

    col_str = ", ".join(columns)

    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute(f"SELECT {col_str} FROM spots")
        rows = cursor.fetchall()

        # Convert each row (a tuple) into a dict using column names as keys
        return [dict(zip(columns, row)) for row in rows]


def add_message_to_spot(spot_id, username, message):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT messages FROM spots WHERE id = ?", (spot_id,))
        messages_json = cursor.fetchone()
        if not messages_json:
            print(f"Spot with id {spot_id} not found.")
            return

        try:
            messages_json = json.loads(messages_json[0]) if messages_json else []
        except json.JSONDecodeError:
            messages_json = []

        message = username + ': ' + message

        messages_json.append(message)
        updated_json = json.dumps(messages_json)

        cursor.execute("UPDATE spots SET messages = ? WHERE id = ?", 
                       (updated_json, spot_id))
        conn.commit()
        print(f"Added message \"{message}\" to spot {spot_id}. Full message list: ")
        print(f"{updated_json}")

def get_messages_from_spot(spot_id):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT messages FROM spots WHERE id = ?", (spot_id,))
        result = cursor.fetchone()

        if not result:
            print(f"Spot with id {spot_id} not found.")
            return []

        messages_json = result[0]
        if not messages_json:
            return []

        try:
            messages = json.loads(messages_json)
            if not isinstance(messages, list):
                print(f"Warning: messages for spot {spot_id} are not a list.")
                return []
            return messages
        except json.JSONDecodeError:
            print(f"Warning: invalid JSON in messages for spot {spot_id}.")
            return []


def visit_spot(user_email, spot_id):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("SELECT unlocked_spots, total_points FROM users WHERE email = ?", (user_email,))
        user_row = cursor.fetchone()
        if not user_row:
            print(f"User {user_email} not found.")
            return
        unlocked_spots_json, current_points = user_row
        try:
            unlocked_spots = json.loads(unlocked_spots_json) if unlocked_spots_json else []
        except json.JSONDecodeError:
            unlocked_spots = []

        if spot_id in unlocked_spots:
            print(f"User {user_email} already visited spot ID {spot_id}. No points added.")
            return

        cursor.execute("SELECT points_given FROM spots WHERE id = ?", (spot_id,))
        spot_row = cursor.fetchone()
        if not spot_row:
            print(f"Spot ID {spot_id} does not exist.")
            return
        spot_points = spot_row[0]

        unlocked_spots.append(spot_id)
        updated_json = json.dumps(unlocked_spots)
        updated_points = current_points + spot_points

        cursor.execute("UPDATE users SET unlocked_spots = ?, total_points = ? WHERE email = ?", 
                       (updated_json, updated_points, user_email))
        conn.commit()
        print(f"User {user_email} visited spot {spot_id}. Points earned: {spot_points}. Total points: {updated_points}")

def generate_all_spots_in_city(city):
    query = f"""
    (
        area["name"="{city}"]["boundary"="administrative"]["admin_level"="8"]->.city;
        node["amenity"="arts_centre"](area.city);
        node["amenity"="music_venue"](area.city);
        node["amenity"="fountain"](area.city);
        node["amenity"="cinema"](area.city);
        node["amenity"="theater"](area.city);
        node["building"="museum"](area.city);
        node["building"="train_station"](area.city);
        node["building"="university"](area.city);
        node["building"="castle"](area.city);
        node["building"="tower"](area.city);
        node["building"="pagoda"](area.city);
        node["building"="ruins"](area.city);
        node["building"="triumphal_arch"](area.city);
        node["building"="cathedral"](area.city);
        node["building"="chapel"](area.city);
        node["building"="church"](area.city);
        node["building"="monastery"](area.city);
        node["building"="mosque"](area.city);
        node["building"="shrine"](area.city);
        node["building"="synagogue"](area.city);
        node["building"="temple"](area.city);
        node["historic"](area.city);
    );
    out;
    """
    result = overpass.query(query)
    return result.nodes()

def get_node_name(node):
    for key in ['name', 'official_name', 'alt_name', 'loc_name', 'addr:housename', 'monument:name']:
        value = node.tag(key)
        if value:
            return value
    return "(no name)"

def populate_spots_db():
    spots = generate_all_spots_in_city("Craiova")
    for spot in spots:
        name = get_node_name(spot)
        lat = spot.lat()
        lon = spot.lon()
        if name != "(no name)":
            add_spot(lon, lat, name, 5)

def delete_all_spots():
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("DELETE FROM spots")
        conn.commit()
    print(f"All spots deleted successfully.")

def get_leaderboard(top_n=10):
    with sqlite3.connect('game.db') as conn:
        cursor = conn.cursor()
        cursor.execute("""
            SELECT email, name, total_points
            FROM users
            ORDER BY total_points DESC
            LIMIT ?
        """, (top_n,))
        rows = cursor.fetchall()
        leaderboard = []
        for row in rows:
            leaderboard.append({
                "email": row[0],
                "name": row[1],
                "total_points": row[2]
            })
        return leaderboard
