import database

def print_companies(companies):
    """Helper function to print company details."""
    if not companies:
        print("No companies found.")
        return
    print("\n--- Companies ---")
    for company in companies:
        print(f"ID: {company['id']}, Name: {company['name']}, URL: {company['url']}, Industry: {company['industry']}")
    print("-----------------")

def get_int_input(prompt):
    """Helper function to get integer input from the user."""
    while True:
        try:
            return int(input(prompt))
        except ValueError:
            print("Invalid input. Please enter a number.")

def main_menu():
    """Displays the main menu and handles user choices."""
    database.create_tables() # Ensure tables exist

    while True:
        print("\nCompany Database Menu:")
        print("1. Add New Company")
        print("2. View All Companies")
        print("3. Update Company")
        print("4. Delete Company")
        print("5. Push Company to Webhook")
        print("6. Push All Companies to Webhook")
        print("7. Exit")

        choice = input("Enter your choice (1-7): ")

        if choice == '1':
            print("\n--- Add New Company ---")
            name = input("Enter company name: ")
            url = input("Enter company URL: ")
            industry = input("Enter company industry: ")
            if name: # Basic validation: name is required
                database.add_company(name, url, industry)
            else:
                print("Company name cannot be empty.")

        elif choice == '2':
            companies = database.view_companies()
            print_companies(companies)

        elif choice == '3':
            print("\n--- Update Company ---")
            company_id = get_int_input("Enter ID of the company to update: ")
            print("Enter new details (leave blank to keep current value):")
            name = input(f"New name (current: leave blank): ")
            url = input(f"New URL (current: leave blank): ")
            industry = input(f"New industry (current: leave blank): ")

            update_args = {}
            if name:
                update_args['name'] = name
            if url:
                update_args['url'] = url
            if industry:
                update_args['industry'] = industry

            if update_args:
                database.update_company(company_id, **update_args)
            else:
                print("No changes specified.")

        elif choice == '4':
            print("\n--- Delete Company ---")
            company_id = get_int_input("Enter ID of the company to delete: ")
            # Confirmation step
            confirm = input(f"Are you sure you want to delete company ID {company_id}? (yes/no): ").lower()
            if confirm == 'yes':
                database.delete_company(company_id)
            else:
                print("Deletion cancelled.")

        elif choice == '5':
            print("\n--- Push Company to Webhook ---")
            company_id = get_int_input("Enter ID of the company to push: ")
            company = database.get_company_by_id(company_id)
            if company:
                print(f"Pushing company: {dict(company)}")
                if database.send_to_webhook(dict(company)):
                    print("Company data sent successfully.")
                else:
                    print("Failed to send company data to webhook.")
            else:
                print(f"Company with ID {company_id} not found.")

        elif choice == '6':
            print("\n--- Push All Companies to Webhook ---")
            companies = database.view_companies()
            if not companies:
                print("No companies to push.")
            else:
                confirm = input(f"Are you sure you want to push all {len(companies)} companies to the webhook? (yes/no): ").lower()
                if confirm == 'yes':
                    success_count = 0
                    fail_count = 0
                    for company_row in companies:
                        company_dict = dict(company_row)
                        print(f"Pushing company: {company_dict['name']} (ID: {company_dict['id']})")
                        if database.send_to_webhook(company_dict):
                            success_count += 1
                        else:
                            fail_count += 1
                    print(f"\nWebhook push summary: {success_count} succeeded, {fail_count} failed.")
                else:
                    print("Pushing all companies cancelled.")

        elif choice == '7':
            print("Exiting program.")
            break

        else:
            print("Invalid choice. Please enter a number between 1 and 7.")

if __name__ == '__main__':
    main_menu()
