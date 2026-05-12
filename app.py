from flask import Flask, request, jsonify, render_template
import os
import psycopg2
import psycopg2.extras
import json

app = Flask(__name__)

# Render injeta automaticamente a variável DATABASE_URL
DATABASE_URL = os.environ.get("DATABASE_URL")


def get_conn():
    return psycopg2.connect(DATABASE_URL, sslmode="require")


def init_db():
    """Cria a tabela se não existir."""
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS agenda (
                    data   TEXT PRIMARY KEY,
                    slots  JSONB NOT NULL DEFAULT '{}'
                )
            """)
        conn.commit()


# Inicializa o banco ao subir
init_db()


@app.route("/")
def home():
    return render_template("index.html")


@app.route("/agenda/<data>")
def get_agenda(data):
    with get_conn() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("SELECT slots FROM agenda WHERE data = %s", (data,))
            row = cur.fetchone()
    return jsonify(row["slots"] if row else {})


@app.route("/agenda/<data>", methods=["POST"])
def salvar_agenda(data):
    slots = request.json
    with get_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO agenda (data, slots)
                VALUES (%s, %s)
                ON CONFLICT (data) DO UPDATE SET slots = EXCLUDED.slots
            """, (data, json.dumps(slots)))
        conn.commit()
    return {"status": "ok"}


# Cabeçalhos para permitir iframe no Teams
@app.after_request
def add_headers(response):
    response.headers["X-Frame-Options"] = "ALLOWALL"
    response.headers["Content-Security-Policy"] = "frame-ancestors *"
    return response


if __name__ == "__main__":
    app.run(debug=False)
