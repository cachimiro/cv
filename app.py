from flask import Flask, jsonify, request, render_template # Added render_template
import database # Your existing database.py
import os # For potential API key access
# from functools import wraps # For API key decorator if used later

# Initialize Flask app
app = Flask(__name__)

# Configuration for API Key (example - store your actual key securely, e.g., env variable)
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

@app.route('/')
def index(): # This will be our main page serving companies.html
    """Serves the main companies page."""
    return render_template('companies.html')

# --- API Endpoints ---

@app.route('/api/companies', methods=['GET'])
# @require_api_key
def get_all_companies():
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
# @require_api_key
def get_company(company_id):
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
