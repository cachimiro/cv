# Press Release Outreach Workflow

This document outlines the refactored outreach process for Press Releases, focusing on the new contact selection UI, backend API, and data payload structure.

## 1. User Experience (UX) Flow

The new workflow is designed to be more intuitive and data-driven, moving from broad category selection to specific contact selection.

1.  **Navigate to Outreach:** The user starts on the main "Press Releases" page and clicks the "Outreach" button for a specific press release.
2.  **Select Staff Member:** The user is presented with a list of staff members to choose from for the outreach campaign.
3.  **Select Media Contacts:** Once a staff member is selected, a new UI appears for selecting media contacts. This UI includes:
    -   A **search bar** to filter contacts by name, email, or outlet.
    -   A **paginated list** of contacts from the Media List, displaying their name, outlet, and email. Each contact has a checkbox for selection.
    -   **Pagination controls** to navigate through the list of contacts.
    -   A **page size selector** (25, 50, 100) to control how many contacts are shown per page.
4.  **Confirm Selections:** As contacts are selected, a summary chip (e.g., "15 contacts selected") updates in real-time. The user's selections are preserved even if they navigate between pages of contacts.
5.  **Preview Payload:** After selecting the desired contacts, the user clicks the "Confirm Selections" button. This generates a final, deduplicated list of contacts and displays it as a JSON object in a collapsible preview panel.
6.  **Future: Send Webhook:** The final payload is ready to be sent to a webhook. This functionality is currently stubbed and controlled by a feature flag.

## 2. Backend API

To support this new UI, a new API endpoint has been created.

### `GET /api/media-contacts`

This endpoint provides a paginated and searchable list of all contacts from the `journalists` and `media_titles` tables.

**Query Parameters:**

-   `q` (string, optional): A search term to filter contacts. It searches across `contact_name`, `email`, and `outlet_name`.
-   `page` (integer, optional, default: `1`): The page number to retrieve.
-   `page_size` (integer, optional, default: `50`): The number of items per page. Min: `1`, Max: `200`.

**Success Response (200 OK):**

The endpoint returns a JSON object with the list of contacts and pagination details.

```json
{
  "items": [
    {
      "id": "journalist_101",
      "contactName": "John Smith",
      "email": "john.smith@example.com",
      "outletName": "The Daily News",
      "categories": ["Technology", "Startups"]
    }
  ],
  "page": 1,
  "pageSize": 50,
  "total": 1234
}
```

**Behavior:**

-   The endpoint only returns contacts that have a valid, non-empty email address.
-   The `total` field represents the total number of contacts matching the search query, not just the number in the current page.
-   The `id` for each contact is a string prefixed with its source table (`journalist_` or `media_title_`) to ensure uniqueness.

## 3. Frontend Payload

After the user confirms their selection, the frontend constructs the following JSON payload.

```json
{
  "pressReleaseId": "pr_123",
  "selectedContacts": [
    {
      "contactId": "journalist_101",
      "contactName": "John Smith",
      "email": "john.smith@example.com",
      "outletName": "The Daily News",
      "categories": ["Technology", "Startups"]
    },
    {
      "contactId": "media_title_55",
      "contactName": "Editor",
      "email": "editor@tech-weekly.com",
      "outletName": "Tech Weekly"
    }
  ],
  "total": 2
}
```

**Key Features of the Payload:**

-   **Deduplication:** The `selectedContacts` array is deduplicated based on a normalized (trimmed, lowercase) email address.
-   **`categories` key:** This key is only included in a contact object if the contact has categories associated with them. If not, the key is omitted.
-   **`total`:** This is the final count of unique contacts in the `selectedContacts` array.

## 4. Feature Flag

The actual sending of the payload to a webhook is controlled by a feature flag on the frontend.

-   **Flag:** `window.OUTREACH_WEBHOOK_ENABLED`
-   **Default Value:** `false`

When this flag is `false`, the `sendToWebhook()` function is stubbed and will simply log the payload to the console without making a network request. This allows for safe testing and development of the UI without triggering external services. To enable sending, this flag must be manually set to `true` in the browser console or via a script.
