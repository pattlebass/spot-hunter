from flask import Flask, render_template, request, redirect, session, url_for
from flask_socketio import SocketIO, emit
import json
import os

app = Flask(__name__)
app.config['SECRET_KEY'] = 'supersecretkey'
socketio = SocketIO(app, cors_allowed_origins="*")

USERS_FILE = "users.db"
MESSAGES_FILE = "messages.db"

# Waypoints și locații culturale
cultural_locations = [
    {"name": "Muzeul Olteniei", "lat": 44.3148, "lon": 23.7971},
    {"name": "Muzeul de Artă Craiova", "lat": 44.3165, "lon": 23.8018},
    {"name": "Catedrala Sfântul Dumitru", "lat": 44.3260, "lon": 23.7940},
    {"name": "Stadionul Ion Oblemenco", "lat": 44.3273, "lon": 23.7986},
    {"name": "Grădina Botanică Craiova", "lat": 44.3278, "lon": 23.7961}
]

# Funcții utilitare pentru fișiere JSON
def load_json(file):
    if os.path.exists(file):
        with open(file, "r") as f:
            return json.load(f)
    return {}

def save_json(file, data):
    with open(file, "w") as f:
        json.dump(data, f)

# Mesaje per locație
messages = load_json(MESSAGES_FILE)

# Users
users = load_json(USERS_FILE)

# Pagina login
@app.route("/", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if username in users and users[username]["password"] == password:
            session["username"] = username
            return redirect(url_for("map_view"))
        else:
            return render_template("login.html", error="User sau parola incorecta")
    return render_template("login.html")

# Pagina register
@app.route("/register", methods=["GET","POST"])
def register():
    if request.method == "POST":
        username = request.form.get("username")
        password = request.form.get("password")
        if username in users:
            return render_template("register.html", error="Username deja folosit")
        users[username] = {"password": password}
        save_json(USERS_FILE, users)
        return redirect(url_for("login"))
    return render_template("register.html")

# Pagina hartă – doar după login
@app.route("/map")
def map_view():
    if "username" not in session:
        return redirect(url_for("login"))
    return render_template("index.html", cultural_locations=cultural_locations)

# SocketIO – mesaje chat
@socketio.on('send_message')
def handle_message(data):
    loc = data['location']
    msg = f"{data['user']}: {data['message']}"
    if loc not in messages:
        messages[loc] = []
    messages[loc].append(msg)
    save_json(MESSAGES_FILE, messages)
    emit('receive_message', {'location': loc, 'message': msg}, broadcast=True)

# SocketIO – vizitat
@socketio.on('visit_location')
def handle_visit(data):
    emit('update_visited', data, broadcast=True)


if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=5000, debug=True, allow_unsafe_werkzeug=True)
