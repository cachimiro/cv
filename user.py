from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import database # To interact with the db

class User(UserMixin):
    def __init__(self, id, username, email=None, password_hash=None, is_active=True, is_admin=False):
        self.id = id
        self.username = username
        self.email = email
        self.password_hash = password_hash
        self.is_active = is_active # For Flask-Login
        self.is_admin = is_admin
        # UserMixin provides: is_authenticated, is_active, is_anonymous, get_id()

    def set_password(self, password):
        """Hashes and sets the user's password."""
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        """Checks if the provided password matches the hashed password."""
        if self.password_hash is None: # Should not happen for a persisted user
            return False
        return check_password_hash(self.password_hash, password)

    @staticmethod
    def get_by_id(user_id):
        """Flask-Login user_loader callback: Loads a user by ID."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, password_hash, is_active, is_admin FROM users WHERE id = ?", (user_id,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data:
            return User(id=user_data['id'],
                        username=user_data['username'],
                        email=user_data['email'],
                        password_hash=user_data['password_hash'],
                        is_active=bool(user_data['is_active']), # Ensure boolean
                        is_admin=bool(user_data['is_admin']))   # Ensure boolean
        return None

    @staticmethod
    def get_by_username(username):
        """Loads a user by username."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT id, username, email, password_hash, is_active, is_admin FROM users WHERE username = ?", (username,))
        user_data = cursor.fetchone()
        conn.close()
        if user_data:
            return User(id=user_data['id'],
                        username=user_data['username'],
                        email=user_data['email'],
                        password_hash=user_data['password_hash'],
                        is_active=bool(user_data['is_active']),
                        is_admin=bool(user_data['is_admin']))
        return None

    def save(self):
        """Saves a new user to the database or updates an existing one (by id)."""
        conn = database.get_db_connection()
        cursor = conn.cursor()

        # For simplicity, this save method assumes if self.id is None, it's a new user.
        # A more robust way for new users might be a dedicated create_user static method.
        # This example focuses on saving a new user instance that has had its password set.

        if self.id is None: # New user
            if not self.password_hash:
                raise ValueError("Password hash must be set for a new user before saving.")
            try:
                cursor.execute(
                    "INSERT INTO users (username, email, password_hash, is_active, is_admin) VALUES (?, ?, ?, ?, ?)",
                    (self.username, self.email, self.password_hash, self.is_active, self.is_admin)
                )
                self.id = cursor.lastrowid # Get the ID of the newly inserted user
                print(f"User {self.username} created with ID {self.id}")
            except database.sqlite3.IntegrityError as e:
                # This could be due to unique constraint on username or email
                print(f"Error creating user {self.username}: {e}")
                conn.rollback() # Rollback on error
                raise # Re-raise the exception to be handled by caller
            finally:
                conn.commit() # Commit if successful
                conn.close()
        else: # Update existing user (less common for User model, usually handled by specific update functions)
              # For now, we'll assume this User object's attributes are what we want to save.
            try:
                cursor.execute(
                    "UPDATE users SET username = ?, email = ?, password_hash = ?, is_active = ?, is_admin = ? WHERE id = ?",
                    (self.username, self.email, self.password_hash, self.is_active, self.is_admin, self.id)
                )
                print(f"User {self.username} (ID: {self.id}) updated.")
            except database.sqlite3.IntegrityError as e:
                print(f"Error updating user {self.username}: {e}")
                conn.rollback()
                raise
            finally:
                conn.commit()
                conn.close()
        return self # Return the instance, possibly with updated ID

    def __repr__(self):
        return f"<User {self.username} (ID: {self.id})>"

# Example of how a dedicated create function might look (optional addition)
# @staticmethod
# def create_new_user(username, password, email=None, is_active=True, is_admin=False):
#     """Creates a new user, hashes password, and saves to DB."""
#     existing_user = User.get_by_username(username)
#     if existing_user:
#         raise ValueError(f"Username '{username}' already exists.")
#     if email:
#         # Add check for existing email if desired
#         pass

#     new_user = User(id=None, username=username, email=email, is_active=is_active, is_admin=is_admin)
#     new_user.set_password(password)
#     try:
#         new_user.save() # This will insert and set the ID
#         return new_user
#     except database.sqlite3.IntegrityError:
#         # Handle cases like email already exists if that constraint is also strictly enforced by a separate check
#         raise ValueError(f"Could not create user. Username or email might be taken.")
#     return None
