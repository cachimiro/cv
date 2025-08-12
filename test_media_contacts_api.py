import unittest
import os
import json
from app import app
from database import create_tables, get_db_connection

class MediaContactsApiTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        self.db_name = 'test_api_contacts.db'

        # Override the database name in the database module
        import database
        database.DATABASE_NAME = self.db_name

        # Create tables and populate with test data
        create_tables()
        self.populate_test_data()

    def tearDown(self):
        os.remove(self.db_name)

    def populate_test_data(self):
        conn = get_db_connection()
        cursor = conn.cursor()

        # Valid contacts
        cursor.execute("INSERT INTO journalists (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('John Smith', 'Test News', 'john.smith@example.com', 'Tech'))
        cursor.execute("INSERT INTO journalists (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('Jane Doe', 'Another Paper', 'jane.doe@example.com', 'Health,Wellness'))
        cursor.execute("INSERT INTO media_titles (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('Test Magazine', 'Test News', 'contact@testmagazine.com', 'Lifestyle'))

        # Contact for search
        cursor.execute("INSERT INTO journalists (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('Peter Jones', 'Search Weekly', 'peter.jones@search.com', 'SEO'))

        # Invalid email contacts
        cursor.execute("INSERT INTO journalists (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('Invalid Email', 'Bad Data Inc', 'invalid-email', ''))
        cursor.execute("INSERT INTO journalists (name, outletName, Email, Focus) VALUES (?, ?, ?, ?)", ('No Email', 'Null Times', None, ''))

        conn.commit()
        conn.close()

    def login(self):
        # Helper to log in a test user
        from user import User
        # Ensure user doesn't already exist from a previous run within the same test
        conn = get_db_connection()
        user_exists = conn.execute("SELECT id FROM users WHERE username = 'testuser'").fetchone()
        if not user_exists:
            user = User(username='testuser', is_admin=True)
            user.set_password('password')
            user.save()
        conn.close()

        return self.app.post('/login', data=dict(username='testuser', password='password'), follow_redirects=True)

    def test_get_media_contacts_success(self):
        self.login()
        response = self.app.get('/api/media-contacts')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertIn('items', data)
        self.assertIn('page', data)
        self.assertIn('pageSize', data)
        self.assertIn('total', data)
        # Should be 4 valid contacts
        self.assertEqual(data['total'], 4)
        self.assertEqual(len(data['items']), 4)

    def test_pagination(self):
        self.login()
        response = self.app.get('/api/media-contacts?page=1&page_size=2')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['page'], 1)
        self.assertEqual(data['pageSize'], 2)
        self.assertEqual(data['total'], 4)

        response = self.app.get('/api/media-contacts?page=2&page_size=2')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data['items']), 2)
        self.assertEqual(data['page'], 2)

    def test_search(self):
        self.login()
        response = self.app.get('/api/media-contacts?q=jones')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['total'], 1)
        self.assertEqual(len(data['items']), 1)
        self.assertEqual(data['items'][0]['contactName'], 'Peter Jones')

    def test_invalid_email_exclusion(self):
        self.login()
        # Fetch all valid contacts
        response = self.app.get('/api/media-contacts?page_size=100')
        data = json.loads(response.data)
        emails = [item['email'] for item in data['items']]

        # Check that none of the invalid emails are present
        self.assertNotIn('invalid-email', emails)

        # The total should only reflect valid contacts
        self.assertEqual(data['total'], 4)

if __name__ == '__main__':
    unittest.main()
