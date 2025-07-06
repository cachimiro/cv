from flask import Flask, jsonify, request
import database # Your existing database.py
import os # For potential API key access

# Initialize Flask app
app = Flask(__name__)

# Configuration for API Key (example - store your actual key securely, e.g., env variable)
# For demonstration, we'll imagine an API_KEY could be set as an environment variable
# Replace 'YOUR_EXPECTED_API_KEY' with the actual key you expect from Make.com
EXPECTED_API_KEY = os.environ.get("COMPANY_API_KEY", "default_test_key_12345")
# Using a default key for environments where the variable isn't set (e.g. local testing without .env)
# IMPORTANT: In a real deployment, ensure COMPANY_API_KEY is set and 'default_test_key_12345' is not used.

# --- Helper function for API key authentication (placeholder) ---
# This is a basic example. In production, consider more robust solutions.
def is_authenticated(api_key):
    if not api_key:
        return False
    # Basic constant-time comparison to mitigate some timing attacks (though Python's '==' is often optimized)
    # For true constant-time, especially in security-critical apps, use specialized libraries if available/needed.
    # Here, we're doing a simple equality check.
    return api_key == EXPECTED_API_KEY

# This decorator can be used if you want to protect all routes or specific ones
# from functools import wraps
# def require_api_key(f):
#     @wraps(f)
#     def decorated_function(*args, **kwargs):
#         provided_key = request.headers.get('X-API-Key')
#         if not is_authenticated(provided_key):
#             return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
#         return f(*args, **kwargs)
#     return decorated_function

@app.route('/')
def home():
    return "Company Data API is running. Use /api/companies to access data."

@app.route('/api/companies', methods=['GET'])
# @require_api_key # Uncomment this line to protect this endpoint
def get_all_companies():
    """
    API endpoint to retrieve all companies.
    Future: Add API key check.
    """
    # --- API Key Check Placeholder ---
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    # --- End API Key Check Placeholder ---

    try:
        companies_data = database.view_companies() # This returns a list of sqlite3.Row objects
        # Convert list of Row objects to list of dictionaries for JSON serialization
        companies_list = [dict(company) for company in companies_data]
        return jsonify(companies_list), 200
    except Exception as e:
        # Log the exception e for debugging
        print(f"Error in /api/companies: {e}") # Basic logging
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/companies/<int:company_id>', methods=['GET'])
# @require_api_key # Uncomment this line to protect this endpoint
def get_company(company_id):
    """
    API endpoint to retrieve a specific company by its ID.
    Future: Add API key check.
    """
    # --- API Key Check Placeholder ---
    # provided_key = request.headers.get('X-API-Key')
    # if not is_authenticated(provided_key):
    #     return jsonify({"error": "Unauthorized. API key is missing or invalid."}), 401
    # --- End API Key Check Placeholder ---

    try:
        company_data = database.get_company_by_id(company_id) # Returns a sqlite3.Row or None
        if company_data:
            return jsonify(dict(company_data)), 200
        else:
            return jsonify({"error": f"Company with ID {company_id} not found"}), 404
    except Exception as e:
        # Log the exception e for debugging
        print(f"Error in /api/companies/{company_id}: {e}") # Basic logging
        return jsonify({"error": "An internal server error occurred"}), 500

# Further endpoints will be added in subsequent steps.

if __name__ == '__main__':
    # Ensure database tables are created before running the app
    database.create_tables()
    # Note: For production, use a proper WSGI server like Gunicorn or Waitress
    # The Flask development server is not suitable for production.
    app.run(debug=True, host='0.0.0.0', port=5000) # debug=True for development
    # host='0.0.0.0' makes it accessible on your network, not just localhost
    # Change port if 5000 is in use.
