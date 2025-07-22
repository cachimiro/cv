import unittest
import os
import io
from app import app
from database import create_tables, get_db_connection

class EmailTemplatesTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        self.app = app.test_client()
        # Point to a test-specific database
        self.db_name = 'test_company_data.db'
        # Override the database name in the database module
        import database
        database.DATABASE_NAME = self.db_name
        # Create tables in the test database
        create_tables()

    def tearDown(self):
        # Clean up the test database
        os.remove(self.db_name)

    def test_upload_docx_invalid(self):
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

        # Create a valid docx file on disk
        from docx import Document
        document = Document()
        document.add_paragraph("This is a test document.")
        document.save('test.docx')

        with open('test.docx', 'rb') as f:
            data = {
                'file': (f, 'test.docx')
            }
            response = self.app.post('/api/upload-template', content_type='multipart/form-data', data=data)

        os.remove('test.docx')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], 'File uploaded and processed successfully')

    def test_upload_pdf_invalid(self):
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

        # Create a valid pdf file on disk
        from PyPDF2 import PdfWriter, PageObject
        writer = PdfWriter()
        writer.add_page(PageObject.create_blank_page(None, 612, 792)) # Standard letter size
        with open('test.pdf', 'wb') as f:
            writer.write(f)

        with open('test.pdf', 'rb') as f:
            data = {
                'file': (f, 'test.pdf')
            }
            response = self.app.post('/api/upload-template', content_type='multipart/form-data', data=data)

        os.remove('test.pdf')
        self.assertEqual(response.status_code, 200)
        json_data = response.get_json()
        self.assertEqual(json_data['message'], 'File uploaded and processed successfully')

if __name__ == '__main__':
    unittest.main()
