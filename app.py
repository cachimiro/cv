from flask import Flask, jsonify, request, render_template, flash, redirect, url_for # Added flash, redirect, url_for
import database # Your existing database.py
import os # For potential API key access
# from functools import wraps # For API key decorator if used later
from flask_login import LoginManager, login_user, logout_user, login_required, current_user
from user import User # Import the User model

# Initialize Flask app
app = Flask(__name__)

# --- Flask App Configuration ---
# IMPORTANT: Set a strong, random secret key in a real application!
# You can generate one using: import os; os.urandom(24).hex()
# Store it securely, e.g., in an environment variable.
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'a_very_default_and_insecure_secret_key_123!')
app.config['SESSION_COOKIE_SECURE'] = False # Set to True if using HTTPS (recommended for production)
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax' # Or 'Strict'

# --- Flask-Login Configuration ---
login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'login' # The name of the view (route function) for the login page
login_manager.login_message_category = 'info' # For flash messages

@login_manager.user_loader
def load_user(user_id):
    """Flask-Login user_loader callback."""
    return User.get_by_id(int(user_id))

# Configuration for API Key (example - store your actual key securely, e.g., env variable)
# This API key is separate from user authentication. Used for programmatic API access.
EXPECTED_API_KEY = os.environ.get("COMPANY_API_KEY", "default_test_key_12345")

def is_authenticated(api_key):
    if not api_key:
        return False
    return api_key == EXPECTED_API_KEY

# def require_api_key(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         provided_key = request.headers.get('X-API-Key')
#         if not is_authenticated(provided_key):
#             return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
#         return f(*args, **kwargs)
#     return decorated_function

# --- Web Page Routes ---

@app.route('/')
@login_required
def index():
    """Serves the main companies page."""
    return render_template('companies.html')

@app.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('index')) # If already logged in, go to main page

    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email') # Optional
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')

        error = None
        if not username:
            error = 'Username is required.'
        elif not password:
            error = 'Password is required.'
        elif password != confirm_password:
            error = 'Passwords do not match.'

        if error is None:
            existing_user_by_name = User.get_by_username(username)
            if existing_user_by_name:
                error = f"Username '{username}' is already taken."

            if not error and email: # Only check email if username is fine and email is provided
                conn = database.get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT id FROM users WHERE email = ?", (email,))
                existing_user_by_email = cursor.fetchone()
                conn.close()
                if existing_user_by_email:
                    error = f"Email '{email}' is already registered."

        if error is None:
            try:
                # For now, first user registered can be an admin, or set is_admin=False by default
                # This logic can be refined later (e.g. only existing admin can create other admins)
                conn = database.get_db_connection()
                cursor = conn.cursor()
                cursor.execute("SELECT COUNT(id) as count FROM users")
                user_count = cursor.fetchone()['count']
                conn.close()
                is_first_user_admin = user_count == 0 # Make the first registered user an admin

                new_user = User(id=None, username=username, email=email if email else None, is_admin=is_first_user_admin)
                new_user.set_password(password)
                new_user.save() # The save method in User class handles DB insertion

                flash('Registration successful! Please log in.', 'success')
                return redirect(url_for('login'))
            except ValueError as e: # Catch custom errors from User.save or validation
                error = str(e)
            except database.sqlite3.IntegrityError: # Catch DB level unique constraint errors
                 error = f"Username or Email already exists." # More generic for DB
            except Exception as e:
                print(f"Error during registration: {e}")
                error = "An unexpected error occurred during registration. Please try again."

        if error:
            flash(error, 'danger')

    # For GET request or if POST had an error, render the registration page
    # Pass None for form if not using Flask-WTF, or pass form object if using it
    return render_template('register.html', form=None)

@app.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('index')) # If already logged in, go to main page

    if request.method == 'POST':
        username = request.form.get('username')
        password = request.form.get('password')
        # remember = True if request.form.get('remember') else False # For "Remember Me"

        user = User.get_by_username(username)

        if user and user.check_password(password):
            if user.is_active:
                login_user(user) # Can add 'remember=remember'
                # flash(f'Logged in successfully as {user.username}!', 'success') # Optional success flash

                # Redirect to the page the user was trying to access, or to index
                next_page = request.args.get('next')
                return redirect(next_page or url_for('index'))
            else:
                flash('Your account is inactive. Please contact support.', 'warning')
        else:
            flash('Invalid username or password. Please try again.', 'danger')

    return render_template('login.html', form=None) # Pass None for form if not using Flask-WTF

@app.route('/logout')
@login_required # User must be logged in to log out
def logout():
    logout_user()
    flash('You have been logged out successfully.', 'success')
    return redirect(url_for('login'))


# --- API Endpoints ---
# All API endpoints should also require login if they are primarily supporting the web UI
# For external programmatic access, the X-API-Key mechanism would be used in conjunction or as an alternative.

# --- CSV Import API Endpoints ---
import csv
import io # For reading file in memory
import json # For parsing the column mapping

@app.route('/api/import/preview', methods=['POST'])
@login_required
def csv_preview():
    """
    Accepts a CSV file and returns its headers for mapping.
    """
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400

    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400

    if file and file.filename.lower().endswith('.csv'):
        try:
            # Read the first line of the file to get headers
            # We use io.TextIOWrapper to decode the file stream as text
            stream = io.TextIOWrapper(file.stream, encoding='utf-8')
            reader = csv.reader(stream)
            headers = next(reader)
            # Optional: Basic sanitization of headers
            headers = [header.strip() for header in headers]
            return jsonify({"headers": headers}), 200
        except (csv.Error, StopIteration):
            return jsonify({"error": "Could not read headers from CSV file. It might be empty or malformed."}), 400
        except Exception as e:
            print(f"Error in CSV preview: {e}")
            return jsonify({"error": "An unexpected error occurred while processing the file."}), 500

    return jsonify({"error": "Invalid file type. Please upload a .csv file."}), 400

@app.route('/api/import/run', methods=['POST'])
@login_required
def csv_run_import():
    """
    Accepts a CSV file, a target table name, and a column mapping,
    then imports the data into the specified table.
    """
    # --- 1. Validate Request ---
    if 'file' not in request.files:
        return jsonify({"error": "No file part in the request"}), 400
    if 'target_table' not in request.form:
        return jsonify({"error": "No target_table specified"}), 400
    if 'column_mapping' not in request.form:
        return jsonify({"error": "No column_mapping provided"}), 400

    file = request.files['file']
    target_table = request.form.get('target_table')

    try:
        column_mapping = json.loads(request.form.get('column_mapping'))
    except json.JSONDecodeError:
        return jsonify({"error": "Invalid JSON in column_mapping"}), 400

    # --- 2. Check for valid file and target table ---
    if file.filename == '':
        return jsonify({"error": "No file selected"}), 400
    if target_table not in ['journalists', 'media_titles']:
        return jsonify({"error": "Invalid target table specified."}), 400
    if not file.filename.lower().endswith('.csv'):
        return jsonify({"error": "Invalid file type. Please upload a .csv file."}), 400

    # --- 3. Process the import ---
    conn = database.get_db_connection()
    cursor = conn.cursor()

    try:
        stream = io.TextIOWrapper(file.stream, encoding='utf-8')
        reader = csv.reader(stream)

        # Get CSV headers and build an index map for quick lookup
        csv_headers = next(reader)
        header_index_map = {header: i for i, header in enumerate(csv_headers)}

        # Filter mapping to only include columns present in the uploaded CSV
        valid_mapping = {
            csv_col: db_col
            for csv_col, db_col in column_mapping.items()
            if csv_col in header_index_map and db_col # Ensure db_col is not empty/null
        }

        if not valid_mapping:
            return jsonify({"error": "Column mapping is empty or does not match any headers in the CSV file."}), 400

        db_columns = list(valid_mapping.values())
        placeholders = ', '.join(['?'] * len(db_columns))
        sql = f"INSERT INTO {target_table} ({', '.join(db_columns)}) VALUES ({placeholders})"

        imported_count = 0
        for row in reader:
            # Build the tuple of values in the correct order for the SQL statement
            values_to_insert = []
            for csv_col in valid_mapping.keys():
                col_index = header_index_map[csv_col]
                values_to_insert.append(row[col_index])

            cursor.execute(sql, tuple(values_to_insert))
            imported_count += 1

        conn.commit()
        return jsonify({
            "message": f"Import successful. {imported_count} rows imported into '{target_table}'.",
            "imported_rows": imported_count
        }), 200

    except Exception as e:
        conn.rollback() # Rollback on any error during the transaction
        print(f"Error during CSV import run: {e}")
        return jsonify({"error": f"An error occurred during the import: {e}"}), 500
    finally:
        conn.close()


# --- Generic Table Data API ---

@app.route('/api/table/<string:table_name>', methods=['GET'])
@login_required
def get_table_data(table_name):
    """
    Fetches paginated data from a specified table.
    For now, fetches all data. Pagination can be added later.
    """
    if table_name not in ['journalists', 'media_titles', 'companies']: # Allow companies for now
        return jsonify({"error": "Invalid table name specified"}), 400

    try:
        conn = database.get_db_connection()
        # Using a safe way to format table name - ensure it's in the allow-list
        query = f"SELECT * FROM {table_name}" # Not safe for user input, but safe here due to check above
        cursor = conn.cursor()
        cursor.execute(query)
        data = cursor.fetchall()
        conn.close()

        # Convert list of Row objects to list of dictionaries
        data_list = [dict(row) for row in data]
        return jsonify(data_list), 200
    except Exception as e:
        print(f"Error fetching data for table {table_name}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


# --- Old Company Data API Endpoints (to be refactored/removed) ---

@app.route('/api/companies', methods=['GET'])
@login_required
# @require_api_key # This would be for separate programmatic API key auth
def get_all_companies():
    # For UI-driven requests, current_user is available.
    # For pure API key access, you might bypass session login or check API key first.
    # If API key is present and valid, could proceed. Otherwise, rely on session.
    # Example:
    # provided_api_key = request.headers.get('X-API-Key')
    # if is_authenticated(provided_api_key):
    #     pass # API key auth successful
    # elif not current_user.is_authenticated: # Check session auth if no/invalid API key
    #     return jsonify({"error": "Unauthorized"}), 401

    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    try:
        companies_data = database.view_companies()
        companies_list = [dict(company) for company in companies_data]
        return jsonify(companies_list), 200
    except Exception as e:
        print(f"Error in /api/companies: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/companies/<int:company_id>', methods=['GET'])
@login_required
# @require_api_key
def get_company(company_id):
    # Similar logic for API key vs session auth can be applied here if needed
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    try:
        company_data = database.get_company_by_id(company_id)
        if company_data:
            return jsonify(dict(company_data)), 200
        else:
            return jsonify({"error": f"Company with ID {company_id} not found"}), 404
    except Exception as e:
        print(f"Error in /api/companies/{company_id}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/companies', methods=['POST'])
@login_required
# @require_api_key
def create_company():
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    try:
        data = request.get_json()
        if not data or not data.get('name'):
            return jsonify({"error": "Missing required field: name"}), 400

        name = data.get('name')
        url = data.get('url')
        industry = data.get('industry')

        company_id = database.add_company(name, url, industry)
        if company_id:
            new_company = database.get_company_by_id(company_id) # Fetch to return the full object
            return jsonify(dict(new_company)), 201 # 201 Created
        else:
            # This might happen if add_company returns None due to IntegrityError (e.g. duplicate name)
            # The database.py prints a specific error, here we return a generic one or try to be more specific
            # based on why add_company might fail (though current add_company handles only unique name for now)
            return jsonify({"error": "Failed to create company. Name might already exist."}), 409 # Conflict

    except Exception as e:
        print(f"Error in POST /api/companies: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/companies/<int:company_id>', methods=['PUT'])
@login_required
# @require_api_key
def update_company_api(company_id): # Renamed to avoid conflict with database.update_company
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "No data provided for update"}), 400

        # Check if company exists first
        existing_company = database.get_company_by_id(company_id)
        if not existing_company:
            return jsonify({"error": f"Company with ID {company_id} not found"}), 404

        name = data.get('name')
        url = data.get('url')
        industry = data.get('industry')

        # Build update_kwargs dynamically to only pass fields that are present in request
        update_kwargs = {}
        if 'name' in data: update_kwargs['name'] = name
        if 'url' in data: update_kwargs['url'] = url
        if 'industry' in data: update_kwargs['industry'] = industry

        if not update_kwargs: # No valid fields to update were provided
             return jsonify({"error": "No valid fields provided for update"}), 400

        if database.update_company(company_id, **update_kwargs):
            updated_company = database.get_company_by_id(company_id)
            return jsonify(dict(updated_company)), 200
        else:
            # This could be due to various reasons, e.g. new name conflicts
            return jsonify({"error": "Failed to update company. New name might already exist or other internal error."}), 409 # Conflict or 500

    except Exception as e:
        print(f"Error in PUT /api/companies/{company_id}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/companies/<int:company_id>', methods=['DELETE'])
@login_required
# @require_api_key
def delete_company_api(company_id): # Renamed
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    try:
        # Check if company exists first (optional, delete_company handles it but good for explicit 404)
        existing_company = database.get_company_by_id(company_id)
        if not existing_company:
            return jsonify({"error": f"Company with ID {company_id} not found"}), 404

        if database.delete_company(company_id):
            return jsonify({"message": f"Company with ID {company_id} deleted successfully"}), 200 # Or 204 No Content
        else:
            # Should ideally not happen if we checked existence above, but as a fallback
            return jsonify({"error": "Failed to delete company"}), 500

    except Exception as e:
        print(f"Error in DELETE /api/companies/{company_id}: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    database.create_tables()
    app.run(debug=True, host='0.0.0.0', port=5000)
