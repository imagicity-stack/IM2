import requests
import sys
import json
from datetime import datetime, timedelta

class ImagicityAPITester:
    def __init__(self, base_url="https://imagicity-manager.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.token = None
        self.user_id = None
        self.tests_run = 0
        self.tests_passed = 0
        self.created_resources = {
            'clients': [],
            'invoices': [],
            'expenses': []
        }

    def run_test(self, name, method, endpoint, expected_status, data=None, headers=None):
        """Run a single API test"""
        url = f"{self.base_url}/{endpoint}"
        test_headers = {'Content-Type': 'application/json'}
        if self.token:
            test_headers['Authorization'] = f'Bearer {self.token}'
        if headers:
            test_headers.update(headers)

        self.tests_run += 1
        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=test_headers, timeout=10)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=test_headers, timeout=10)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=test_headers, timeout=10)
            elif method == 'DELETE':
                response = requests.delete(url, headers=test_headers, timeout=10)

            success = response.status_code == expected_status
            if success:
                self.tests_passed += 1
                print(f"✅ Passed - Status: {response.status_code}")
                try:
                    return True, response.json() if response.content else {}
                except:
                    return True, {}
            else:
                print(f"❌ Failed - Expected {expected_status}, got {response.status_code}")
                print(f"   Response: {response.text[:200]}")
                return False, {}

        except Exception as e:
            print(f"❌ Failed - Error: {str(e)}")
            return False, {}

    def test_root_endpoint(self):
        """Test root API endpoint"""
        return self.run_test("Root API", "GET", "", 200)

    def test_signup(self, email, password, name):
        """Test user signup"""
        success, response = self.run_test(
            "User Signup",
            "POST",
            "auth/signup",
            200,
            data={"email": email, "password": password, "name": name}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_login(self, email, password):
        """Test user login"""
        success, response = self.run_test(
            "User Login",
            "POST",
            "auth/login",
            200,
            data={"email": email, "password": password}
        )
        if success and 'access_token' in response:
            self.token = response['access_token']
            self.user_id = response['user']['id']
            print(f"   Token obtained: {self.token[:20]}...")
            return True
        return False

    def test_get_me(self):
        """Test get current user"""
        return self.run_test("Get Current User", "GET", "auth/me", 200)

    def test_create_client(self, name, email=None, phone=None, gstin=None, address=None):
        """Test client creation"""
        client_data = {"name": name}
        if email:
            client_data["email"] = email
        if phone:
            client_data["phone"] = phone
        if gstin:
            client_data["gstin"] = gstin
        if address:
            client_data["address"] = address
            
        success, response = self.run_test(
            "Create Client",
            "POST",
            "clients",
            200,
            data=client_data
        )
        if success and 'id' in response:
            self.created_resources['clients'].append(response['id'])
            return response['id']
        return None

    def test_get_clients(self):
        """Test get all clients"""
        return self.run_test("Get Clients", "GET", "clients", 200)

    def test_get_client(self, client_id):
        """Test get single client"""
        return self.run_test("Get Single Client", "GET", f"clients/{client_id}", 200)

    def test_update_client(self, client_id, name):
        """Test update client"""
        return self.run_test(
            "Update Client",
            "PUT",
            f"clients/{client_id}",
            200,
            data={"name": name, "email": "updated@test.com"}
        )

    def test_create_invoice(self, client_id):
        """Test invoice creation"""
        invoice_date = datetime.now().strftime('%Y-%m-%d')
        due_date = (datetime.now() + timedelta(days=30)).strftime('%Y-%m-%d')
        
        invoice_data = {
            "client_id": client_id,
            "invoice_date": invoice_date,
            "due_date": due_date,
            "items": [
                {
                    "description": "Web Design Services",
                    "quantity": 1,
                    "rate": 50000,
                    "amount": 50000
                }
            ],
            "subtotal": 50000,
            "cgst": 4500,
            "sgst": 4500,
            "igst": 0,
            "total": 59000,
            "status": "pending",
            "invoice_type": "invoice",
            "is_recurring": False,
            "notes": "Test invoice"
        }
        
        success, response = self.run_test(
            "Create Invoice",
            "POST",
            "invoices",
            200,
            data=invoice_data
        )
        if success and 'id' in response:
            self.created_resources['invoices'].append(response['id'])
            return response['id']
        return None

    def test_get_invoices(self):
        """Test get all invoices"""
        return self.run_test("Get Invoices", "GET", "invoices", 200)

    def test_get_invoice(self, invoice_id):
        """Test get single invoice"""
        return self.run_test("Get Single Invoice", "GET", f"invoices/{invoice_id}", 200)

    def test_create_expense(self):
        """Test expense creation"""
        expense_data = {
            "date": datetime.now().strftime('%Y-%m-%d'),
            "description": "Office Supplies",
            "amount": 5000,
            "category": "Office"
        }
        
        success, response = self.run_test(
            "Create Expense",
            "POST",
            "expenses",
            200,
            data=expense_data
        )
        if success and 'id' in response:
            self.created_resources['expenses'].append(response['id'])
            return response['id']
        return None

    def test_get_expenses(self):
        """Test get all expenses"""
        return self.run_test("Get Expenses", "GET", "expenses", 200)

    def test_get_settings(self):
        """Test get settings"""
        return self.run_test("Get Settings", "GET", "settings", 200)

    def test_update_settings(self):
        """Test update settings"""
        settings_data = {
            "invoice_prefix": "INV",
            "invoice_counter": 1,
            "company_name": "IMAGICITY UPDATED"
        }
        return self.run_test(
            "Update Settings",
            "PUT",
            "settings",
            200,
            data=settings_data
        )

    def test_dashboard_stats(self):
        """Test dashboard statistics"""
        return self.run_test("Dashboard Stats", "GET", "dashboard/stats", 200)

    def cleanup_resources(self):
        """Clean up created test resources"""
        print("\n🧹 Cleaning up test resources...")
        
        # Delete expenses
        for expense_id in self.created_resources['expenses']:
            self.run_test(f"Delete Expense {expense_id}", "DELETE", f"expenses/{expense_id}", 200)
        
        # Delete invoices
        for invoice_id in self.created_resources['invoices']:
            self.run_test(f"Delete Invoice {invoice_id}", "DELETE", f"invoices/{invoice_id}", 200)
        
        # Delete clients
        for client_id in self.created_resources['clients']:
            self.run_test(f"Delete Client {client_id}", "DELETE", f"clients/{client_id}", 200)

def main():
    print("🚀 Starting Imagicity Invoice API Tests")
    print("=" * 50)
    
    tester = ImagicityAPITester()
    test_email = f"test_{datetime.now().strftime('%H%M%S')}@imagicity.com"
    test_password = "TestPass123!"
    test_name = "Test User"

    try:
        # Test root endpoint
        success, _ = tester.test_root_endpoint()
        if not success:
            print("❌ Root API endpoint failed, stopping tests")
            return 1

        # Test authentication flow
        print("\n📝 Testing Authentication...")
        if not tester.test_signup(test_email, test_password, test_name):
            print("❌ Signup failed, stopping tests")
            return 1

        # Test get current user
        success, _ = tester.test_get_me()
        if not success:
            print("❌ Get current user failed")

        # Test client management
        print("\n👥 Testing Client Management...")
        client_id = tester.test_create_client(
            "Test Client Ltd",
            "client@test.com",
            "+91-9876543210",
            "22AAAAA0000A1Z5",
            "123 Test Street, Test City"
        )
        if not client_id:
            print("❌ Client creation failed, stopping client tests")
        else:
            tester.test_get_clients()
            tester.test_get_client(client_id)
            tester.test_update_client(client_id, "Updated Test Client")

        # Test invoice management
        print("\n📄 Testing Invoice Management...")
        if client_id:
            invoice_id = tester.test_create_invoice(client_id)
            if invoice_id:
                tester.test_get_invoices()
                tester.test_get_invoice(invoice_id)

        # Test expense management
        print("\n💰 Testing Expense Management...")
        expense_id = tester.test_create_expense()
        if expense_id:
            tester.test_get_expenses()

        # Test settings
        print("\n⚙️ Testing Settings...")
        tester.test_get_settings()
        tester.test_update_settings()

        # Test dashboard
        print("\n📊 Testing Dashboard...")
        tester.test_dashboard_stats()

        # Cleanup
        tester.cleanup_resources()

        # Print results
        print("\n" + "=" * 50)
        print(f"📊 Test Results: {tester.tests_passed}/{tester.tests_run} passed")
        
        if tester.tests_passed == tester.tests_run:
            print("🎉 All tests passed!")
            return 0
        else:
            print(f"⚠️ {tester.tests_run - tester.tests_passed} tests failed")
            return 1

    except Exception as e:
        print(f"💥 Test suite crashed: {str(e)}")
        return 1

if __name__ == "__main__":
    sys.exit(main())