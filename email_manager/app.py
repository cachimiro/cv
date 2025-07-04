import sqlite3
from flask import Flask, request, jsonify
from pathlib import Path

app = Flask(__name__)
DB_PATH = Path(__file__).with_suffix('.db')


def init_db():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            title TEXT,
            company TEXT,
            industry TEXT,
            email TEXT UNIQUE,
            last_contact_date TEXT,
            response_status INTEGER DEFAULT 0,
            campaign_stage INTEGER DEFAULT 1,
            active INTEGER DEFAULT 1
        )
        """
    )
    conn.commit()
    conn.close()


@app.route('/contacts', methods=['GET'])
def get_contacts():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM contacts WHERE active=1')
    rows = cur.fetchall()
    conn.close()
    contacts = [dict(row) for row in rows]
    return jsonify(contacts)


@app.route('/contacts/<int:contact_id>', methods=['GET'])
def get_contact(contact_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cur = conn.cursor()
    cur.execute('SELECT * FROM contacts WHERE id=?', (contact_id,))
    row = cur.fetchone()
    conn.close()
    if row:
        return jsonify(dict(row))
    return jsonify({'error': 'Contact not found'}), 404


@app.route('/contacts', methods=['POST'])
def add_contact():
    data = request.get_json()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute(
        'INSERT OR REPLACE INTO contacts (name, title, company, industry, email, last_contact_date, response_status, campaign_stage, active) '
        'VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
        (
            data.get('name'),
            data.get('title'),
            data.get('company'),
            data.get('industry'),
            data.get('email'),
            data.get('last_contact_date'),
            data.get('response_status', 0),
            data.get('campaign_stage', 1),
            data.get('active', 1)
        )
    )
    conn.commit()
    new_id = cur.lastrowid
    conn.close()
    return jsonify({'id': new_id}), 201


@app.route('/contacts/<int:contact_id>', methods=['PUT'])
def update_contact(contact_id):
    data = request.get_json()
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    cur.execute('SELECT id FROM contacts WHERE id=?', (contact_id,))
    if not cur.fetchone():
        conn.close()
        return jsonify({'error': 'Contact not found'}), 404
    fields = ['name', 'title', 'company', 'industry', 'email', 'last_contact_date', 'response_status', 'campaign_stage', 'active']
    updates = []
    values = []
    for field in fields:
        if field in data:
            updates.append(f"{field}=?")
            values.append(data[field])
    if updates:
        values.append(contact_id)
        cur.execute(f"UPDATE contacts SET {', '.join(updates)} WHERE id=?", tuple(values))
        conn.commit()
    conn.close()
    return jsonify({'status': 'updated'})


@app.route('/webhook', methods=['POST'])
def webhook():
    """Endpoint to accept data from Make.com"""
    return add_contact()


if __name__ == '__main__':
    init_db()
    app.run(host='0.0.0.0', port=5000)
