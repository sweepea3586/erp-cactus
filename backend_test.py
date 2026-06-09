#!/usr/bin/env python3
"""
Comprehensive backend API test for Cactus Light & Sound ERP - Supabase Edition
Tests all endpoints with Supabase cookie-based authentication
"""
import requests
import json
import sys
from time import time

# Base URL from .env: NEXT_PUBLIC_BASE_URL + /api
BASE_URL = "https://erp-cactus.preview.emergentagent.com/api"

# Global session for cookie persistence (Supabase uses sb-* cookies)
session = requests.Session()

# Test user credentials (will be created fresh each run)
TEST_EMAIL = f"test{int(time())}@cactus.local"
TEST_PASSWORD = "test123456"  # >= 6 chars
TEST_FULL_NAME = "Test User"

# Global variables to store created resources
created_product_id = None
created_customer_id = None
created_sale_id = None
created_category_id = None

def print_test(name):
    print(f"\n{'='*70}")
    print(f"TEST: {name}")
    print('='*70)

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

def print_error(resp):
    """Print detailed error information"""
    print(f"  Status: {resp.status_code}")
    print(f"  Response: {resp.text[:500]}")

# ============== TEST 1: AUTH ==============
def test_auth():
    """Test 1: Authentication with Supabase"""
    print_test("1. Authentication (Supabase)")
    
    all_passed = True
    
    # 1.1: Signup with unique email
    try:
        print(f"\n1.1: POST /auth/signup with email={TEST_EMAIL}")
        resp = session.post(f"{BASE_URL}/auth/signup", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD,
            "full_name": TEST_FULL_NAME
        })
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                print_result(True, f"Signup successful: {data['user'].get('email')}")
            else:
                print_result(False, f"Signup response missing user: {data}")
                all_passed = False
        else:
            print_result(False, f"Signup failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"Signup request failed: {e}")
        all_passed = False
    
    # 1.2: Login with wrong password
    try:
        print(f"\n1.2: POST /auth/login with wrong password")
        resp = requests.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": "wrongpassword"
        })
        if resp.status_code == 401:
            print_result(True, "Wrong password returns 401")
        else:
            print_result(False, f"Wrong password should return 401, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"Login with wrong password failed: {e}")
        all_passed = False
    
    # 1.3: Login with correct credentials
    try:
        print(f"\n1.3: POST /auth/login with correct credentials")
        resp = session.post(f"{BASE_URL}/auth/login", json={
            "email": TEST_EMAIL,
            "password": TEST_PASSWORD
        })
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                # Check for Supabase cookies (sb-*)
                cookie_names = list(session.cookies.keys())
                has_sb_cookies = any('sb' in name for name in cookie_names)
                if has_sb_cookies or len(cookie_names) > 0:
                    print_result(True, f"Login successful, cookies set: {cookie_names}")
                else:
                    print_result(True, f"Login successful (no cookies detected)")
            else:
                print_result(False, f"Login response missing user: {data}")
                all_passed = False
        else:
            print_result(False, f"Login failed")
            print_error(resp)
            all_passed = False
            return False  # Can't continue without auth
    except Exception as e:
        print_result(False, f"Login request failed: {e}")
        all_passed = False
        return False
    
    # 1.4: GET /auth/me with session
    try:
        print(f"\n1.4: GET /auth/me with session")
        resp = session.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                print_result(True, f"GET /auth/me returns user: {data['user'].get('email')}")
            else:
                print_result(False, f"GET /auth/me response missing user: {data}")
                all_passed = False
        else:
            print_result(False, f"GET /auth/me failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /auth/me failed: {e}")
        all_passed = False
    
    # 1.5: GET /auth/me without session
    try:
        print(f"\n1.5: GET /auth/me without session")
        resp = requests.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 401:
            print_result(True, "GET /auth/me without session returns 401")
        else:
            print_result(False, f"Should return 401, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /auth/me without session failed: {e}")
        all_passed = False
    
    # 1.6: GET /products without session (protected endpoint)
    try:
        print(f"\n1.6: GET /products without session")
        resp = requests.get(f"{BASE_URL}/products")
        if resp.status_code == 401:
            print_result(True, "GET /products without session returns 401")
        else:
            print_result(False, f"Should return 401, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products without session failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 2: CATEGORIES ==============
def test_categories():
    """Test 2: Categories"""
    print_test("2. Categories")
    
    global created_category_id
    all_passed = True
    
    # 2.1: GET /categories
    try:
        print(f"\n2.1: GET /categories")
        resp = session.get(f"{BASE_URL}/categories")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                # Check for default categories
                expected = ["Aydınlatma", "Ses Sistemi", "Mikser", "Mikrofon", "Hoparlör", "Anfi", "Kablo & Aksesuar"]
                found = [c.get('name') for c in data]
                missing = [e for e in expected if e not in found]
                if len(missing) == 0:
                    print_result(True, f"GET /categories returns {len(data)} categories including all 7 defaults")
                else:
                    print_result(False, f"Missing default categories: {missing}")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /categories failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /categories failed: {e}")
        all_passed = False
    
    # 2.2: POST /categories
    try:
        print(f"\n2.2: POST /categories")
        ts = int(time())
        resp = session.post(f"{BASE_URL}/categories", json={"name": f"Test Kat {ts}"})
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data and 'name' in data:
                created_category_id = data['id']
                print_result(True, f"POST /categories created: {data['name']} (id={data['id']})")
            else:
                print_result(False, f"Response missing id or name: {data}")
                all_passed = False
        else:
            print_result(False, f"POST /categories failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /categories failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 3: PRODUCTS CRUD ==============
def test_products():
    """Test 3: Products CRUD"""
    print_test("3. Products CRUD")
    
    global created_product_id
    all_passed = True
    ts = int(time())
    
    # 3.1: POST /products
    try:
        print(f"\n3.1: POST /products")
        product_data = {
            "sku": f"TST-{ts}",
            "name": "Test Ürün",
            "brand": "TestBrand",
            "purchase_price": 100,
            "selling_price": 200,
            "stock": 10,
            "min_stock": 2
        }
        resp = session.post(f"{BASE_URL}/products", json=product_data)
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data:
                created_product_id = data['id']
                print_result(True, f"POST /products created: {data['name']} (id={data['id']}, stock={data.get('stock')})")
            else:
                print_result(False, f"Response missing id: {data}")
                all_passed = False
        else:
            print_result(False, f"POST /products failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /products failed: {e}")
        all_passed = False
    
    # 3.2: GET /products
    try:
        print(f"\n3.2: GET /products")
        resp = session.get(f"{BASE_URL}/products")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                found = any(p.get('id') == created_product_id for p in data)
                if found:
                    print_result(True, f"GET /products returns array containing new product")
                else:
                    print_result(False, f"New product not found in list")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /products failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products failed: {e}")
        all_passed = False
    
    # 3.3: GET /products?q=Test
    try:
        print(f"\n3.3: GET /products?q=Test")
        resp = session.get(f"{BASE_URL}/products?q=Test")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                found = any(p.get('id') == created_product_id for p in data)
                if found:
                    print_result(True, f"GET /products?q=Test filters correctly")
                else:
                    print_result(False, f"Search didn't find test product")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /products?q=Test failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products?q=Test failed: {e}")
        all_passed = False
    
    # 3.4: GET /products/{id}
    try:
        print(f"\n3.4: GET /products/{created_product_id}")
        resp = session.get(f"{BASE_URL}/products/{created_product_id}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('id') == created_product_id:
                print_result(True, f"GET /products/{{id}} returns product: {data.get('name')}")
            else:
                print_result(False, f"Wrong product returned: {data}")
                all_passed = False
        else:
            print_result(False, f"GET /products/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products/{{id}} failed: {e}")
        all_passed = False
    
    # 3.5: PUT /products/{id}
    try:
        print(f"\n3.5: PUT /products/{created_product_id}")
        update_data = {
            "sku": f"TST-{ts}",
            "name": "Test Updated",
            "brand": "TestBrand",
            "purchase_price": 120,
            "selling_price": 250,
            "min_stock": 3
        }
        resp = session.put(f"{BASE_URL}/products/{created_product_id}", json=update_data)
        if resp.status_code == 200:
            print_result(True, f"PUT /products/{{id}} updated successfully")
        else:
            print_result(False, f"PUT /products/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"PUT /products/{{id}} failed: {e}")
        all_passed = False
    
    # 3.6: GET /products/{id}/movements
    try:
        print(f"\n3.6: GET /products/{created_product_id}/movements")
        resp = session.get(f"{BASE_URL}/products/{created_product_id}/movements")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                # Should have at least 1 'in' movement from initial stock
                in_movements = [m for m in data if m.get('type') == 'in']
                if len(in_movements) >= 1:
                    print_result(True, f"GET /products/{{id}}/movements returns {len(data)} movements (including initial stock)")
                else:
                    print_result(False, f"No 'in' movement found for initial stock")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /products/{{id}}/movements failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products/{{id}}/movements failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 4: STOCK ADJUSTMENTS ==============
def test_stock_adjustments():
    """Test 4: Stock adjustments"""
    print_test("4. Stock Adjustments")
    
    all_passed = True
    ts = int(time())
    
    # Create a test product with stock=5
    test_product_id = None
    try:
        print(f"\n4.0: Create test product with stock=5")
        resp = session.post(f"{BASE_URL}/products", json={
            "sku": f"STK-{ts}",
            "name": "Stock Test Product",
            "brand": "Test",
            "purchase_price": 50,
            "selling_price": 100,
            "stock": 5,
            "min_stock": 1
        })
        if resp.status_code == 200:
            data = resp.json()
            test_product_id = data['id']
            print_result(True, f"Created test product with stock=5 (id={test_product_id})")
        else:
            print_result(False, f"Failed to create test product")
            print_error(resp)
            return False
    except Exception as e:
        print_result(False, f"Failed to create test product: {e}")
        return False
    
    # 4.1: Stock IN (+3)
    try:
        print(f"\n4.1: POST /stock/adjust (type=in, quantity=3)")
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": test_product_id,
            "type": "in",
            "quantity": 3,
            "reason": "Test giriş"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get('stock') == 8:
                print_result(True, f"Stock IN: 5 + 3 = {data.get('stock')}")
            else:
                print_result(False, f"Expected stock=8, got {data.get('stock')}")
                all_passed = False
        else:
            print_result(False, f"POST /stock/adjust (in) failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /stock/adjust (in) failed: {e}")
        all_passed = False
    
    # 4.2: Stock OUT (-2)
    try:
        print(f"\n4.2: POST /stock/adjust (type=out, quantity=2)")
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": test_product_id,
            "type": "out",
            "quantity": 2,
            "reason": "Test çıkış"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get('stock') == 6:
                print_result(True, f"Stock OUT: 8 - 2 = {data.get('stock')}")
            else:
                print_result(False, f"Expected stock=6, got {data.get('stock')}")
                all_passed = False
        else:
            print_result(False, f"POST /stock/adjust (out) failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /stock/adjust (out) failed: {e}")
        all_passed = False
    
    # 4.3: Stock OUT with insufficient quantity (should fail)
    try:
        print(f"\n4.3: POST /stock/adjust (type=out, quantity=999) - should fail")
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": test_product_id,
            "type": "out",
            "quantity": 999,
            "reason": "Test negatif"
        })
        if resp.status_code == 400:
            print_result(True, f"Stock OUT with insufficient quantity returns 400")
        else:
            print_result(False, f"Should return 400, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /stock/adjust (out 999) failed: {e}")
        all_passed = False
    
    # 4.4: Stock ADJUST (set to 50)
    try:
        print(f"\n4.4: POST /stock/adjust (type=adjust, quantity=50)")
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": test_product_id,
            "type": "adjust",
            "quantity": 50,
            "reason": "Test sayım"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get('stock') == 50:
                print_result(True, f"Stock ADJUST: set to {data.get('stock')}")
            else:
                print_result(False, f"Expected stock=50, got {data.get('stock')}")
                all_passed = False
        else:
            print_result(False, f"POST /stock/adjust (adjust) failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /stock/adjust (adjust) failed: {e}")
        all_passed = False
    
    # 4.5: GET /stock/movements
    try:
        print(f"\n4.5: GET /stock/movements")
        resp = session.get(f"{BASE_URL}/stock/movements")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                # Check for our test movements
                test_movements = [m for m in data if m.get('product_id') == test_product_id]
                types = [m.get('type') for m in test_movements]
                if 'in' in types and 'out' in types and 'adjust' in types:
                    print_result(True, f"GET /stock/movements returns movements with correct types")
                else:
                    print_result(False, f"Missing movement types: {types}")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /stock/movements failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /stock/movements failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 5: CUSTOMERS CRUD ==============
def test_customers():
    """Test 5: Customers CRUD + payments"""
    print_test("5. Customers CRUD + Payments")
    
    global created_customer_id
    all_passed = True
    ts = int(time())
    
    # 5.1: POST /customers
    try:
        print(f"\n5.1: POST /customers")
        customer_data = {
            "company_name": f"Test Firma {ts}",
            "contact_person": "Ali",
            "phone": "555",
            "email": "a@b.com",
            "tax_office": "X",
            "tax_number": "12345"
        }
        resp = session.post(f"{BASE_URL}/customers", json=customer_data)
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data:
                created_customer_id = data['id']
                print_result(True, f"POST /customers created: {data['company_name']} (id={data['id']})")
            else:
                print_result(False, f"Response missing id: {data}")
                all_passed = False
        else:
            print_result(False, f"POST /customers failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /customers failed: {e}")
        all_passed = False
    
    # 5.2: GET /customers
    try:
        print(f"\n5.2: GET /customers")
        resp = session.get(f"{BASE_URL}/customers")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                found = any(c.get('id') == created_customer_id for c in data)
                if found:
                    print_result(True, f"GET /customers returns array containing new customer")
                else:
                    print_result(False, f"New customer not found in list")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /customers failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers failed: {e}")
        all_passed = False
    
    # 5.3: GET /customers/{id}
    try:
        print(f"\n5.3: GET /customers/{created_customer_id}")
        resp = session.get(f"{BASE_URL}/customers/{created_customer_id}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('id') == created_customer_id:
                initial_balance = data.get('balance', 0)
                print_result(True, f"GET /customers/{{id}} returns customer (balance={initial_balance})")
            else:
                print_result(False, f"Wrong customer returned: {data}")
                all_passed = False
        else:
            print_result(False, f"GET /customers/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers/{{id}} failed: {e}")
        all_passed = False
    
    # 5.4: PUT /customers/{id}
    try:
        print(f"\n5.4: PUT /customers/{created_customer_id}")
        update_data = {
            "company_name": "Test Firma 2",
            "contact_person": "Ali",
            "phone": "555",
            "email": "a@b.com"
        }
        resp = session.put(f"{BASE_URL}/customers/{created_customer_id}", json=update_data)
        if resp.status_code == 200:
            print_result(True, f"PUT /customers/{{id}} updated successfully")
        else:
            print_result(False, f"PUT /customers/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"PUT /customers/{{id}} failed: {e}")
        all_passed = False
    
    # 5.5: POST /payments
    try:
        print(f"\n5.5: POST /payments (amount=500)")
        resp = session.post(f"{BASE_URL}/payments", json={
            "customer_id": created_customer_id,
            "amount": 500,
            "notes": "test"
        })
        if resp.status_code == 200:
            print_result(True, f"POST /payments created payment")
        else:
            print_result(False, f"POST /payments failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /payments failed: {e}")
        all_passed = False
    
    # 5.6: GET /customers/{id} - verify balance decreased
    try:
        print(f"\n5.6: GET /customers/{created_customer_id} - verify balance")
        resp = session.get(f"{BASE_URL}/customers/{created_customer_id}")
        if resp.status_code == 200:
            data = resp.json()
            balance = data.get('balance', 0)
            # Payment should reduce balance (customer owes less)
            # Initial balance was 0, payment of 500 should make it -500
            if balance == -500:
                print_result(True, f"Balance updated correctly: {balance} (payment reduces balance)")
            else:
                print_result(False, f"Expected balance=-500, got {balance}")
                all_passed = False
        else:
            print_result(False, f"GET /customers/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers/{{id}} failed: {e}")
        all_passed = False
    
    # 5.7: GET /customers/{id}/transactions
    try:
        print(f"\n5.7: GET /customers/{created_customer_id}/transactions")
        resp = session.get(f"{BASE_URL}/customers/{created_customer_id}/transactions")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                payment_entries = [t for t in data if t.get('type') == 'payment']
                if len(payment_entries) >= 1:
                    print_result(True, f"GET /customers/{{id}}/transactions returns payment entry")
                else:
                    print_result(False, f"No payment entry found in transactions")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /customers/{{id}}/transactions failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers/{{id}}/transactions failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 6: SALES (CRITICAL) ==============
def test_sales():
    """Test 6: Sales with auto stock deduction + balance update (CRITICAL)"""
    print_test("6. Sales (CRITICAL - Supabase triggers)")
    
    global created_sale_id
    all_passed = True
    ts = int(time())
    
    # Create test product with stock=20
    test_product_id = None
    try:
        print(f"\n6.0: Create test product with stock=20")
        resp = session.post(f"{BASE_URL}/products", json={
            "sku": f"SALE-{ts}",
            "name": "Sale Test Product",
            "brand": "Test",
            "purchase_price": 50,
            "selling_price": 100,
            "stock": 20,
            "min_stock": 1
        })
        if resp.status_code == 200:
            data = resp.json()
            test_product_id = data['id']
            print_result(True, f"Created test product with stock=20 (id={test_product_id})")
        else:
            print_result(False, f"Failed to create test product")
            print_error(resp)
            return False
    except Exception as e:
        print_result(False, f"Failed to create test product: {e}")
        return False
    
    # Create test customer with balance=0
    test_customer_id = None
    try:
        print(f"\n6.0: Create test customer with balance=0")
        resp = session.post(f"{BASE_URL}/customers", json={
            "company_name": f"Sale Test Customer {ts}",
            "contact_person": "Test",
            "phone": "555"
        })
        if resp.status_code == 200:
            data = resp.json()
            test_customer_id = data['id']
            print_result(True, f"Created test customer (id={test_customer_id})")
        else:
            print_result(False, f"Failed to create test customer")
            print_error(resp)
            return False
    except Exception as e:
        print_result(False, f"Failed to create test customer: {e}")
        return False
    
    # 6.1: POST /sales
    try:
        print(f"\n6.1: POST /sales")
        sale_data = {
            "customer_id": test_customer_id,
            "items": [{
                "product_id": test_product_id,
                "quantity": 2,
                "unit_price": 100,
                "discount": 10
            }],
            "tax_rate": 20,
            "paid": 50,
            "notes": "Test"
        }
        resp = session.post(f"{BASE_URL}/sales", json=sale_data)
        if resp.status_code == 200:
            data = resp.json()
            created_sale_id = data.get('id')
            
            # Verify calculations
            # subtotal = 100 * 2 * (1 - 10/100) = 180
            # tax = 180 * 0.20 = 36
            # total = 180 + 36 = 216
            # paid = 50
            # due = 216 - 50 = 166
            
            checks = []
            checks.append(("invoice_number format", data.get('invoice_number', '').startswith('CLS-2026-')))
            checks.append(("subtotal=180", data.get('subtotal') == 180))
            checks.append(("tax=36", data.get('tax') == 36))
            checks.append(("total=216", data.get('total') == 216))
            checks.append(("paid=50", data.get('paid') == 50))
            checks.append(("due=166", data.get('due') == 166))
            
            failed_checks = [c[0] for c in checks if not c[1]]
            if len(failed_checks) == 0:
                print_result(True, f"POST /sales created sale with correct calculations (invoice={data.get('invoice_number')})")
            else:
                print_result(False, f"Sale created but calculations wrong: {failed_checks}")
                print(f"  Data: {data}")
                all_passed = False
        else:
            print_result(False, f"POST /sales failed")
            print_error(resp)
            all_passed = False
            return False
    except Exception as e:
        print_result(False, f"POST /sales failed: {e}")
        all_passed = False
        return False
    
    # 6.2: Verify product stock decreased
    try:
        print(f"\n6.2: Verify product stock decreased (20 -> 18)")
        resp = session.get(f"{BASE_URL}/products/{test_product_id}")
        if resp.status_code == 200:
            data = resp.json()
            stock = data.get('stock')
            if stock == 18:
                print_result(True, f"Product stock decreased correctly: 20 - 2 = {stock}")
            else:
                print_result(False, f"Expected stock=18, got {stock}")
                all_passed = False
        else:
            print_result(False, f"GET /products/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products/{{id}} failed: {e}")
        all_passed = False
    
    # 6.3: Verify customer balance increased
    try:
        print(f"\n6.3: Verify customer balance increased (0 -> 166)")
        resp = session.get(f"{BASE_URL}/customers/{test_customer_id}")
        if resp.status_code == 200:
            data = resp.json()
            balance = data.get('balance')
            # Balance should be: 0 + 216 (sale total) - 50 (payment) = 166
            if balance == 166:
                print_result(True, f"Customer balance updated correctly: {balance}")
            else:
                print_result(False, f"Expected balance=166, got {balance}")
                all_passed = False
        else:
            print_result(False, f"GET /customers/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers/{{id}} failed: {e}")
        all_passed = False
    
    # 6.4: Verify stock movement logged
    try:
        print(f"\n6.4: Verify stock movement logged (type=out, quantity=2)")
        resp = session.get(f"{BASE_URL}/products/{test_product_id}/movements")
        if resp.status_code == 200:
            data = resp.json()
            out_movements = [m for m in data if m.get('type') == 'out' and m.get('quantity') == 2]
            if len(out_movements) >= 1:
                print_result(True, f"Stock movement logged correctly")
            else:
                print_result(False, f"No 'out' movement with quantity=2 found")
                all_passed = False
        else:
            print_result(False, f"GET /products/{{id}}/movements failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /products/{{id}}/movements failed: {e}")
        all_passed = False
    
    # 6.5: Verify customer transaction logged
    try:
        print(f"\n6.5: Verify customer transaction logged (type=sale)")
        resp = session.get(f"{BASE_URL}/customers/{test_customer_id}/transactions")
        if resp.status_code == 200:
            data = resp.json()
            sale_entries = [t for t in data if t.get('type') == 'sale']
            if len(sale_entries) >= 1:
                print_result(True, f"Customer transaction logged correctly")
            else:
                print_result(False, f"No 'sale' transaction found")
                all_passed = False
        else:
            print_result(False, f"GET /customers/{{id}}/transactions failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /customers/{{id}}/transactions failed: {e}")
        all_passed = False
    
    # 6.6: GET /sales
    try:
        print(f"\n6.6: GET /sales")
        resp = session.get(f"{BASE_URL}/sales")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                found = any(s.get('id') == created_sale_id for s in data)
                if found:
                    print_result(True, f"GET /sales returns array containing new sale")
                else:
                    print_result(False, f"New sale not found in list")
                    all_passed = False
            else:
                print_result(False, f"Expected array, got: {type(data)}")
                all_passed = False
        else:
            print_result(False, f"GET /sales failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /sales failed: {e}")
        all_passed = False
    
    # 6.7: GET /sales/{id}
    try:
        print(f"\n6.7: GET /sales/{created_sale_id}")
        resp = session.get(f"{BASE_URL}/sales/{created_sale_id}")
        if resp.status_code == 200:
            data = resp.json()
            if 'sale' in data and 'customer' in data and 'settings' in data:
                print_result(True, f"GET /sales/{{id}} returns sale+customer+settings")
            else:
                print_result(False, f"Response missing required fields: {list(data.keys())}")
                all_passed = False
        else:
            print_result(False, f"GET /sales/{{id}} failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /sales/{{id}} failed: {e}")
        all_passed = False
    
    # 6.8: POST /sales with insufficient stock (should fail)
    try:
        print(f"\n6.8: POST /sales with quantity exceeding stock - should fail")
        resp = session.post(f"{BASE_URL}/sales", json={
            "customer_id": test_customer_id,
            "items": [{
                "product_id": test_product_id,
                "quantity": 999,
                "unit_price": 100
            }],
            "tax_rate": 20,
            "paid": 0
        })
        if resp.status_code == 400:
            print_result(True, f"POST /sales with insufficient stock returns 400")
        else:
            print_result(False, f"Should return 400, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /sales with insufficient stock failed: {e}")
        all_passed = False
    
    # 6.9: POST /sales without customer_id (should fail)
    try:
        print(f"\n6.9: POST /sales without customer_id - should fail")
        resp = session.post(f"{BASE_URL}/sales", json={
            "items": [{
                "product_id": test_product_id,
                "quantity": 1,
                "unit_price": 100
            }],
            "tax_rate": 20,
            "paid": 0
        })
        if resp.status_code == 400:
            print_result(True, f"POST /sales without customer_id returns 400")
        else:
            print_result(False, f"Should return 400, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /sales without customer_id failed: {e}")
        all_passed = False
    
    # 6.10: POST /sales with empty items (should fail)
    try:
        print(f"\n6.10: POST /sales with empty items - should fail")
        resp = session.post(f"{BASE_URL}/sales", json={
            "customer_id": test_customer_id,
            "items": [],
            "tax_rate": 20,
            "paid": 0
        })
        if resp.status_code == 400:
            print_result(True, f"POST /sales with empty items returns 400")
        else:
            print_result(False, f"Should return 400, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /sales with empty items failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 7: DASHBOARD ==============
def test_dashboard():
    """Test 7: Dashboard stats"""
    print_test("7. Dashboard Stats")
    
    all_passed = True
    
    try:
        print(f"\n7.1: GET /dashboard/stats")
        resp = session.get(f"{BASE_URL}/dashboard/stats")
        if resp.status_code == 200:
            data = resp.json()
            
            # Check required fields
            required_fields = [
                'totalStockValue', 'totalProducts', 'totalCustomers',
                'monthlySales', 'totalReceivables', 'lowStockCount',
                'lowStock', 'recentSales', 'series'
            ]
            missing = [f for f in required_fields if f not in data]
            
            if len(missing) == 0:
                # Verify series has 30 days
                if isinstance(data['series'], list) and len(data['series']) == 30:
                    print_result(True, f"GET /dashboard/stats returns all required fields with 30-day series")
                else:
                    print_result(False, f"Series should have 30 days, got {len(data.get('series', []))}")
                    all_passed = False
            else:
                print_result(False, f"Missing required fields: {missing}")
                all_passed = False
        else:
            print_result(False, f"GET /dashboard/stats failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /dashboard/stats failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 8: SETTINGS ==============
def test_settings():
    """Test 8: Settings get/update"""
    print_test("8. Settings")
    
    all_passed = True
    
    # 8.1: GET /settings
    try:
        print(f"\n8.1: GET /settings")
        resp = session.get(f"{BASE_URL}/settings")
        if resp.status_code == 200:
            data = resp.json()
            if 'company_name' in data or 'id' in data:
                print_result(True, f"GET /settings returns settings")
            else:
                print_result(False, f"Settings response unexpected: {data}")
                all_passed = False
        else:
            print_result(False, f"GET /settings failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /settings failed: {e}")
        all_passed = False
    
    # 8.2: PUT /settings
    try:
        print(f"\n8.2: PUT /settings")
        resp = session.put(f"{BASE_URL}/settings", json={
            "company_name": "Cactus Test",
            "invoice_prefix": "CLS"
        })
        if resp.status_code == 200:
            print_result(True, f"PUT /settings updated successfully")
        else:
            print_result(False, f"PUT /settings failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"PUT /settings failed: {e}")
        all_passed = False
    
    # 8.3: GET /settings - verify update
    try:
        print(f"\n8.3: GET /settings - verify update")
        resp = session.get(f"{BASE_URL}/settings")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('company_name') == 'Cactus Test':
                print_result(True, f"Settings update verified")
            else:
                print_result(False, f"Settings not updated: company_name={data.get('company_name')}")
                all_passed = False
        else:
            print_result(False, f"GET /settings failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /settings failed: {e}")
        all_passed = False
    
    return all_passed

# ============== TEST 9: LOGOUT ==============
def test_logout():
    """Test 9: Logout"""
    print_test("9. Logout")
    
    all_passed = True
    
    # 9.1: POST /auth/logout
    try:
        print(f"\n9.1: POST /auth/logout")
        resp = session.post(f"{BASE_URL}/auth/logout")
        if resp.status_code == 200:
            print_result(True, f"POST /auth/logout successful")
        else:
            print_result(False, f"POST /auth/logout failed")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"POST /auth/logout failed: {e}")
        all_passed = False
    
    # 9.2: GET /auth/me after logout (should fail)
    try:
        print(f"\n9.2: GET /auth/me after logout - should fail")
        resp = session.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 401:
            print_result(True, f"GET /auth/me after logout returns 401")
        else:
            print_result(False, f"Should return 401, got {resp.status_code}")
            print_error(resp)
            all_passed = False
    except Exception as e:
        print_result(False, f"GET /auth/me after logout failed: {e}")
        all_passed = False
    
    return all_passed

# ============== MAIN ==============
def main():
    print("\n" + "="*70)
    print("CACTUS LIGHT & SOUND ERP - BACKEND API TEST (SUPABASE)")
    print("="*70)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {TEST_EMAIL}")
    print("="*70)
    
    results = {}
    
    # Run all tests
    results['1. Auth'] = test_auth()
    results['2. Categories'] = test_categories()
    results['3. Products CRUD'] = test_products()
    results['4. Stock Adjustments'] = test_stock_adjustments()
    results['5. Customers CRUD + Payments'] = test_customers()
    results['6. Sales (CRITICAL)'] = test_sales()
    results['7. Dashboard'] = test_dashboard()
    results['8. Settings'] = test_settings()
    results['9. Logout'] = test_logout()
    
    # Summary
    print("\n" + "="*70)
    print("TEST SUMMARY")
    print("="*70)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print("="*70)
    print(f"TOTAL: {passed}/{total} tests passed")
    print("="*70)
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    sys.exit(main())
