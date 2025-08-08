import unittest
import os
import json
from app import app
from database import create_tables, get_db_connection

class FollowUpEmailTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        # Point to a test-specific database
        self.db_name = 'test_follow_up_email.db'
        # Override the database name in the database module
        import database
        database.DATABASE_NAME = self.db_name
        # Create tables in the test database
        create_tables()

        # Create a test user
        from user import User
        user = User(username='testuser', is_admin=True)
        user.set_password('password')
        user.save()

        # Log in the user
        self.app.post('/login', data=dict(
            username='testuser',
            password='password'
        ), follow_redirects=True)

    def tearDown(self):
        # Clean up the test database
        os.remove(self.db_name)

    def test_add_and_get_follow_up_email(self):
        # Add a follow-up email
        response = self.app.post('/api/follow-up-emails',
                                 data=json.dumps(dict(name='Test Subject',
                                                      content='Test Content',
                                                      outlet_name='Test Outlet',
                                                      city='Test City')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        self.assertIn('id', data)
        email_id = data['id']

        # Get the follow-up email and check its contents
        response = self.app.get(f'/api/follow-up-email/{email_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Test Subject')
        self.assertEqual(data['content'], 'Test Content')
        self.assertEqual(data['outlet_name'], 'Test Outlet')
        self.assertEqual(data['city'], 'Test City')

    def test_update_follow_up_email(self):
        # Add a follow-up email
        response = self.app.post('/api/follow-up-emails',
                                 data=json.dumps(dict(name='Test Subject',
                                                      content='Test Content',
                                                      outlet_name='Test Outlet',
                                                      city='Test City')),
                                 content_type='application/json')
        self.assertEqual(response.status_code, 201)
        data = json.loads(response.data)
        email_id = data['id']

        # Update the follow-up email
        response = self.app.put(f'/api/follow-up-email/{email_id}',
                                data=json.dumps(dict(name='Updated Subject',
                                                     content='Updated Content',
                                                     outlet_name='Updated Outlet',
                                                     city='Updated City')),
                                content_type='application/json')
        self.assertEqual(response.status_code, 200)

        # Get the follow-up email and check its updated contents
        response = self.app.get(f'/api/follow-up-email/{email_id}')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(data['name'], 'Updated Subject')
        self.assertEqual(data['content'], 'Updated Content')
        self.assertEqual(data['outlet_name'], 'Updated Outlet')
        self.assertEqual(data['city'], 'Updated City')

    def test_get_all_cities(self):
        # Add some data to the journalists and media_titles tables
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO journalists (City) VALUES ('City A')")
        cursor.execute("INSERT INTO journalists (City) VALUES ('City B')")
        cursor.execute("INSERT INTO media_titles (City) VALUES ('City C')")
        cursor.execute("INSERT INTO media_titles (City) VALUES ('City A')")
        conn.commit()
        conn.close()

        # Get the cities
        response = self.app.get('/api/cities/all')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 3)
        self.assertIn('City A', data)
        self.assertIn('City B', data)
        self.assertIn('City C', data)

    def test_search_field(self):
        # Add some data to the journalists table
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("INSERT INTO journalists (outletName) VALUES ('Test Outlet 1')")
        cursor.execute("INSERT INTO journalists (outletName) VALUES ('Test Outlet 2')")
        cursor.execute("INSERT INTO journalists (outletName) VALUES ('Another Outlet')")
        conn.commit()
        conn.close()

        # Search for an outlet
        response = self.app.get('/api/search/outletName?q=Test')
        self.assertEqual(response.status_code, 200)
        data = json.loads(response.data)
        self.assertEqual(len(data), 2)
        self.assertIn('Test Outlet 1', data)
        self.assertIn('Test Outlet 2', data)

if __name__ == '__main__':
    unittest.main()
