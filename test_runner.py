import unittest
import os
import database # Imports your database.py
import unittest.mock
import json
import requests # For requests.exceptions
import sys # For __main__ block

class TestCompanyDatabase(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Set up for all tests - use a temporary test database."""
        cls.db_name = "test_company_data.db"
        database.DATABASE_NAME = cls.db_name # Override database name for tests
        if os.path.exists(cls.db_name):
            os.remove(cls.db_name)
        database.create_tables()

    @classmethod
    def tearDownClass(cls):
        """Clean up after all tests."""
        if os.path.exists(cls.db_name):
            os.remove(cls.db_name)
        database.DATABASE_NAME = 'company_data.db'

    def setUp(self):
        """Clean up (empty) tables before each test method."""
        conn = database.get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM companies")
        conn.commit()
        conn.close()

    def test_1_add_company(self):
        print("Running test_1_add_company...")
        company_id = database.add_company("Test Co 1", "http://test1.com", "Tech")
        self.assertIsNotNone(company_id, "Should return an ID")
        companies = database.view_companies()
        self.assertEqual(len(companies), 1)
        self.assertEqual(companies[0]['name'], "Test Co 1")
        print("test_1_add_company PASSED")

    def test_2_add_duplicate_company(self):
        print("Running test_2_add_duplicate_company...")
        database.add_company("Test Co 2", "http://test2.com", "Tech")
        company_id_duplicate = database.add_company("Test Co 2", "http://test2-diff.com", "Other")
        self.assertIsNone(company_id_duplicate, "Should not add duplicate name, should return None")
        companies = database.view_companies()
        self.assertEqual(len(companies), 1)
        print("test_2_add_duplicate_company PASSED")

    def test_3_view_companies(self):
        print("Running test_3_view_companies...")
        database.add_company("View Co A", "http://view-a.com", "View A Ind")
        database.add_company("View Co B", "http://view-b.com", "View B Ind")
        companies = database.view_companies()
        self.assertEqual(len(companies), 2)
        names = sorted([c['name'] for c in companies])
        self.assertEqual(names, ["View Co A", "View Co B"])
        print("test_3_view_companies PASSED")

    def test_4_update_company(self):
        print("Running test_4_update_company...")
        company_id = database.add_company("Update Me", "http://updateme.com", "Old Industry")
        self.assertIsNotNone(company_id)
        updated = database.update_company(company_id, name="Updated Name", url="http://updated.com", industry="New Industry")
        self.assertTrue(updated)
        companies = database.view_companies()
        self.assertEqual(len(companies), 1)
        company = companies[0]
        self.assertEqual(company['name'], "Updated Name")
        self.assertEqual(company['url'], "http://updated.com")
        self.assertEqual(company['industry'], "New Industry")
        updated_partial = database.update_company(company_id, url="http://updated-again.com")
        self.assertTrue(updated_partial)
        companies = database.view_companies()
        self.assertEqual(companies[0]['url'], "http://updated-again.com")
        self.assertEqual(companies[0]['name'], "Updated Name")
        updated_non_existent = database.update_company(999, name="Ghost")
        self.assertFalse(updated_non_existent)
        print("test_4_update_company PASSED")

    def test_5_delete_company(self):
        print("Running test_5_delete_company...")
        id1 = database.add_company("Delete Co 1", "http://del1.com", "Delete Ind")
        id2 = database.add_company("Delete Co 2", "http://del2.com", "Delete Ind")
        self.assertIsNotNone(id1)
        self.assertIsNotNone(id2)
        deleted = database.delete_company(id1)
        self.assertTrue(deleted)
        companies = database.view_companies()
        self.assertEqual(len(companies), 1)
        self.assertEqual(companies[0]['name'], "Delete Co 2")
        deleted_non_existent = database.delete_company(999)
        self.assertFalse(deleted_non_existent)
        print("test_5_delete_company PASSED")

    def test_6_empty_view(self):
        print("Running test_6_empty_view...")
        companies = database.view_companies()
        self.assertEqual(len(companies), 0)
        print("test_6_empty_view PASSED")

    # --- Tests for Webhook Functionality ---
    @unittest.mock.patch('database.requests.post')
    def test_7_send_to_webhook_success(self, mock_post):
        print("Running test_7_send_to_webhook_success...")
        mock_response = unittest.mock.Mock()
        mock_response.status_code = 200
        mock_response.raise_for_status = unittest.mock.Mock()
        mock_post.return_value = mock_response
        payload = {"id": 1, "name": "Test Webhook Co", "url": "http://webhook.com", "industry": "Testing"}
        result = database.send_to_webhook(payload)
        self.assertTrue(result)
        self.assertEqual(mock_post.call_count, len(database.WEBHOOK_URLS))
        for url in database.WEBHOOK_URLS:
            mock_post.assert_any_call(
                url,
                data=json.dumps(payload),
                headers={'Content-Type': 'application/json'},
                timeout=10
            )
        print("test_7_send_to_webhook_success PASSED")

    @unittest.mock.patch('database.requests.post')
    def test_8_send_to_webhook_http_error(self, mock_post):
        print("Running test_8_send_to_webhook_http_error...")
        mock_error_response = unittest.mock.Mock()
        mock_error_response.status_code = 500
        mock_error_response.text = "Internal Server Error"
        mock_post_return_value = unittest.mock.Mock()
        mock_post_return_value.status_code = 500
        mock_post_return_value.text = "Internal Server Error"
        mock_post_return_value.raise_for_status.side_effect = requests.exceptions.HTTPError(response=mock_error_response)
        mock_post.return_value = mock_post_return_value
        payload = {"id": 2, "name": "Error Co", "url": "http://error.com", "industry": "Failure"}
        result = database.send_to_webhook(payload)
        self.assertFalse(result)
        self.assertEqual(mock_post.call_count, len(database.WEBHOOK_URLS))
        print("test_8_send_to_webhook_http_error PASSED")

    @unittest.mock.patch('database.requests.post')
    def test_9_send_to_webhook_timeout(self, mock_post):
        print("Running test_9_send_to_webhook_timeout...")
        mock_post.side_effect = requests.exceptions.Timeout
        payload = {"id": 3, "name": "Timeout Co", "url": "http://timeout.com", "industry": "Waiting"}
        result = database.send_to_webhook(payload)
        self.assertFalse(result)
        self.assertEqual(mock_post.call_count, len(database.WEBHOOK_URLS))
        print("test_9_send_to_webhook_timeout PASSED")

    def test_10_get_company_by_id(self):
        print("Running test_10_get_company_by_id...")
        company_id = database.add_company("Specific Co", "http://specific.com", "Lookup")
        self.assertIsNotNone(company_id, "Setup: Failed to add company for get_company_by_id test")
        company = database.get_company_by_id(company_id)
        self.assertIsNotNone(company, "Should retrieve the added company")
        self.assertEqual(company['id'], company_id)
        self.assertEqual(company['name'], "Specific Co")
        non_existent_company = database.get_company_by_id(9999)
        self.assertIsNone(non_existent_company, "Should return None for a non-existent company ID")
        print("test_10_get_company_by_id PASSED")

if __name__ == '__main__':
    print("Starting Company Database Tests...")
    loader = unittest.TestLoader()
    suite = loader.loadTestsFromTestCase(TestCompanyDatabase)
    runner = unittest.TextTestRunner(stream=sys.stdout, verbosity=2)
    print("\nRunning tests...\n")
    result = runner.run(suite)
    print("\nTests completed.")
    if not result.wasSuccessful():
        sys.exit(1)
