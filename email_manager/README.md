# Email Manager

This is a small Flask application that stores contact information in a local SQLite database and exposes a simple REST API. It is designed for small email marketing workflows and can integrate with [Make.com](https://www.make.com/) using webhooks.

## Setup

1. Install dependencies:

```bash
pip install -r requirements.txt
```

2. Start the server:

```bash
python app.py
```

By default the API runs on `http://localhost:5000`.

## API Endpoints

- `GET /contacts` – List all active contacts.
- `GET /contacts/<id>` – Retrieve a single contact.
- `POST /contacts` – Create or update a contact. Provide JSON with fields such as `name`, `title`, `company`, `industry`, `email`, `last_contact_date`, `response_status`, `campaign_stage` and `active` (1 or 0).
- `PUT /contacts/<id>` – Update a contact using JSON payload.
- `POST /webhook` – Convenience endpoint for Make.com webhooks. It accepts the same payload as `POST /contacts`.

## Using with Make.com

Create a "Custom webhook" in Make.com that sends a POST request to one of the API endpoints above. For example, when a new lead is captured you can send a JSON payload to `https://your-server.example.com/webhook`:

```json
{
  "name": "Jane Doe",
  "title": "Marketing Director",
  "company": "Example Co",
  "industry": "F&B",
  "email": "jane@example.com",
  "last_contact_date": "2025-07-04",
  "response_status": 0,
  "campaign_stage": 1
}
```

The application will store the record in `app.db`. You can then use other Make.com modules to query or update the data via the same endpoints.

