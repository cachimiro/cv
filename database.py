import sqlite3

DATABASE_NAME = 'company_data.db'

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_NAME)
    conn.row_factory = sqlite3.Row  # Allows accessing columns by name
    return conn

def create_tables():
    """Creates the necessary tables in the database if they don't already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # Create companies table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            url TEXT,
            industry TEXT
        )
    ''')

    # Create users table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            email TEXT UNIQUE,
            password_hash TEXT NOT NULL,
            is_active BOOLEAN DEFAULT TRUE,
            is_admin BOOLEAN DEFAULT FALSE
            -- Add other fields like created_at, last_login later if needed
        )
    ''')
    # Consider adding an index on username and email for faster lookups
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_username ON users (username)')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_users_email ON users (email)')

    # --- New tables for Sway PR Data ---
    # Uploads Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS uploads (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    print("DEBUG: Attempting to create 'journalists' table...")
    # Journalists Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS journalists (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER,
            name TEXT, nameSuffix TEXT, outletName TEXT, phone TEXT, ModeOfAddress TEXT,
            Honorific TEXT, JobTitle TEXT, MediaType TEXT, Email TEXT, AddressLine1 TEXT,
            AddressLine2 TEXT, City TEXT, County TEXT, State TEXT, PostalCode TEXT,
            Country TEXT, Twitter TEXT, Facebook TEXT, Instagram TEXT, Pinterest TEXT,
            YouTube TEXT, ShadowEmail TEXT, ShadowPhone TEXT, ShadowMobile TEXT,
            ShadowWebsite TEXT, ShadowFacebook TEXT, ShadowTwitter TEXT, ShadowLinkedIn TEXT,
            ShadowAddressLine1 TEXT, ShadowAddressLine2 TEXT, ShadowCity TEXT,
            ShadowCounty TEXT, ShadowPostalCode TEXT, ShadowCountry TEXT,
            Languages TEXT, Unsubscribed TEXT, Focus TEXT,
            response TEXT DEFAULT 'No',
            email_stage TEXT DEFAULT '1',
            -- Note: nameSuffix, outletName, phone were duplicated in prompt, using camelCase version
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (upload_id) REFERENCES uploads (id)
            -- Consider adding UNIQUE constraint on Email if it should be unique
        )
    ''')
    print("DEBUG: 'journalists' table creation command executed.")

    print("DEBUG: Attempting to create 'media_titles' table...")
    # Media Titles Table (identical structure to journalists)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS media_titles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            upload_id INTEGER,
            name TEXT, nameSuffix TEXT, outletName TEXT, phone TEXT, ModeOfAddress TEXT,
            Honorific TEXT, JobTitle TEXT, MediaType TEXT, Email TEXT, AddressLine1 TEXT,
            AddressLine2 TEXT, City TEXT, County TEXT, State TEXT, PostalCode TEXT,
            Country TEXT, Twitter TEXT, Facebook TEXT, Instagram TEXT, Pinterest TEXT,
            YouTube TEXT, ShadowEmail TEXT, ShadowPhone TEXT, ShadowMobile TEXT,
            ShadowWebsite TEXT, ShadowFacebook TEXT, ShadowTwitter TEXT, ShadowLinkedIn TEXT,
            ShadowAddressLine1 TEXT, ShadowAddressLine2 TEXT, ShadowCity TEXT,
            ShadowCounty TEXT, ShadowPostalCode TEXT, ShadowCountry TEXT,
            Languages TEXT, Unsubscribed TEXT, Focus TEXT,
            response TEXT DEFAULT 'No',
            email_stage TEXT DEFAULT '1',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (upload_id) REFERENCES uploads (id)
        )
    ''')
    print("DEBUG: 'media_titles' table creation command executed.")

    # Add upload_id column to journalists table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE journalists ADD COLUMN upload_id INTEGER REFERENCES uploads(id)")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            pass # Column already exists
        else:
            raise

    # Add response and email_stage columns to journalists table if they don't exist
    try:
        cursor.execute("ALTER TABLE journalists ADD COLUMN response TEXT DEFAULT 'No'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e): pass
        else: raise
    try:
        cursor.execute("ALTER TABLE journalists ADD COLUMN email_stage TEXT DEFAULT '1'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e): pass
        else: raise

    # Add response and email_stage columns to media_titles table if they don't exist
    try:
        cursor.execute("ALTER TABLE media_titles ADD COLUMN response TEXT DEFAULT 'No'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e): pass
        else: raise
    try:
        cursor.execute("ALTER TABLE media_titles ADD COLUMN email_stage TEXT DEFAULT '1'")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e): pass
        else: raise

    # Add upload_id column to media_titles table if it doesn't exist
    try:
        cursor.execute("ALTER TABLE media_titles ADD COLUMN upload_id INTEGER REFERENCES uploads(id)")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            pass # Column already exists
        else:
            raise

    # Staff Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS staff (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            staff_name TEXT NOT NULL,
            staff_email TEXT NOT NULL UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    cursor.execute('CREATE INDEX IF NOT EXISTS idx_staff_email ON staff (staff_email)')

    # Email Templates Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS email_templates (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            image BLOB
        )
    ''')

    # Add html_content column if it doesn't exist
    try:
        cursor.execute("ALTER TABLE email_templates ADD COLUMN html_content TEXT")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            pass # Column already exists
        else:
            raise

    # Follow Up Emails Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS follow_up_emails (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            content TEXT NOT NULL,
            outlet_name TEXT,
            city TEXT
        )
    ''')

    # Add outlet_name and city columns if they don't exist
    try:
        cursor.execute("ALTER TABLE follow_up_emails ADD COLUMN outlet_name TEXT")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            pass # Column already exists
        else:
            raise
    try:
        cursor.execute("ALTER TABLE follow_up_emails ADD COLUMN city TEXT")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            pass # Column already exists
        else:
            raise

    # Published Reports Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS published_reports (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            link TEXT NOT NULL,
            article TEXT NOT NULL,
            date_of_publish TEXT NOT NULL
        )
    ''')

    conn.commit()
    conn.close()
    print("Database tables (companies, users, journalists, media_titles, staff, email_templates, follow_up_emails, published_reports) checked/created successfully.")

def add_company(name, url, industry):
    """Adds a new company to the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('''
            INSERT INTO companies (name, url, industry)
            VALUES (?, ?, ?)
        ''', (name, url, industry))
        conn.commit()
        print(f"Company '{name}' added successfully.")
        return cursor.lastrowid
    except sqlite3.IntegrityError:
        print(f"Error: Company with name '{name}' already exists.")
        return None
    finally:
        conn.close()

def view_companies():
    """Retrieves all companies from the database."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, url, industry FROM companies ORDER BY name')
    companies = cursor.fetchall()
    conn.close()
    return companies

def update_company(company_id, name=None, url=None, industry=None):
    """Updates an existing company's information."""
    conn = get_db_connection()
    cursor = conn.cursor()

    fields_to_update = []
    params = []

    if name is not None:
        fields_to_update.append("name = ?")
        params.append(name)
    if url is not None:
        fields_to_update.append("url = ?")
        params.append(url)
    if industry is not None:
        fields_to_update.append("industry = ?")
        params.append(industry)

    if not fields_to_update:
        print("No fields provided for update.")
        conn.close()
        return False

    params.append(company_id)

    try:
        cursor.execute(f'''
            UPDATE companies
            SET {', '.join(fields_to_update)}
            WHERE id = ?
        ''', tuple(params))
        conn.commit()
        if cursor.rowcount == 0:
            print(f"Error: Company with ID {company_id} not found.")
            return False
        print(f"Company ID {company_id} updated successfully.")
        return True
    except sqlite3.IntegrityError:
        print(f"Error: Failed to update company ID {company_id}. Perhaps the new name already exists.")
        return False
    finally:
        conn.close()

def delete_company(company_id):
    """Deletes a company from the database by its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    try:
        cursor.execute('DELETE FROM companies WHERE id = ?', (company_id,))
        conn.commit()
        if cursor.rowcount == 0:
            print(f"Error: Company with ID {company_id} not found.")
            return False
        print(f"Company ID {company_id} deleted successfully.")
        return True
    except Exception as e:
        print(f"An error occurred: {e}")
        return False
    finally:
        conn.close()

if __name__ == '__main__':
    # Basic test and setup when running database.py directly
    create_tables()

    # Example usage (optional, for testing)
    # add_company("Test Co", "http://test.co", "Testing")
    # add_company("Another Inc", "http://another.com", "General")

    # print("\nAll companies:")
    # for company in view_companies():
    #     print(dict(company))

    # update_company(1, url="http://newtest.co", industry="Advanced Testing")
    # print("\nAfter update:")
    # for company in view_companies():
    #     print(dict(company))

    # delete_company(2)
    # print("\nAfter delete:")
    # for company in view_companies():
    #     print(dict(company))

# --- Webhook Functionality ---
import requests
import json

# Webhook URLs for sending outreach data
WEBHOOK_URLS = [
    "https://n8n-hosting-u2i6.onrender.com/webhook-test/35b675e5-7215-4d73-9331-3f1f4ec05e8b",
    "https://n8n-hosting-u2i6.onrender.com/webhook/35b675e5-7215-4d73-9331-3f1f4ec05e8b"
]

def send_to_webhook(data_payload):
    """Sends the given data payload to all configured webhooks."""
    success_count = 0
    for url in WEBHOOK_URLS:
        try:
            headers = {'Content-Type': 'application/json'}
            response = requests.post(url, data=json.dumps(data_payload), headers=headers, timeout=10)
            response.raise_for_status() # Raises an HTTPError for bad responses (4XX or 5XX)
            print(f"Data successfully sent to webhook: {url}. Status: {response.status_code}")
            success_count += 1
        except requests.exceptions.RequestException as e:
            print(f"Error sending data to webhook {url}: {e}")
    return success_count

def get_company_by_id(company_id):
    """Retrieves a single company by its ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('SELECT id, name, url, industry FROM companies WHERE id = ?', (company_id,))
    company = cursor.fetchone()
    conn.close()
    return company
