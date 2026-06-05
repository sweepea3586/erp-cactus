#!/usr/bin/env python3
"""
Comprehensive backend API test for Cactus Light & Sound ERP
Tests all endpoints with cookie-based authentication
"""
import requests
import json
import sys

# Base URL from .env: NEXT_PUBLIC_BASE_URL + /api
BASE_URL = "https://erp-cactus.preview.emergentagent.com/api"

# Test credentials
ADMIN_USER = "admin"
ADMIN_PASS = "admin123"
STAFF_USER = "personel"
STAFF_PASS = "personel123"

# Global session for cookie persistence
session = requests.Session()

def print_test(name):
    print(f"\n{'='*60}")
    print(f"TEST: {name}")
    print('='*60)

def print_result(success, message):
    status = "✅ PASS" if success else "❌ FAIL"
    print(f"{status}: {message}")
    return success

def test_auth_flow():
    """Test 1: Authentication flow"""
    print_test("1. Authentication Flow")
    
    # Test wrong credentials
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", json={"username": "wrong", "password": "wrong"})
        if resp.status_code == 401:
            print_result(True, "Wrong credentials returns 401")
        else:
            print_result(False, f"Wrong credentials should return 401, got {resp.status_code}")
            print(f"Response: {resp.text}")
    except Exception as e:
        print_result(False, f"Login with wrong credentials failed: {e}")
    
    # Test correct login
    try:
        resp = session.post(f"{BASE_URL}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data and data['user'].get('username') == ADMIN_USER:
                # Check for cookie
                if 'cls_session' in session.cookies:
                    print_result(True, f"Login successful with user {ADMIN_USER}, cookie set")
                else:
                    print_result(False, "Login successful but cls_session cookie not found")
                    print(f"Cookies: {session.cookies}")
            else:
                print_result(False, f"Login response missing user object: {data}")
        else:
            print_result(False, f"Login failed with status {resp.status_code}: {resp.text}")
    except Exception as e:
        print_result(False, f"Login request failed: {e}")
        return False
    
    # Test /auth/me with cookie
    try:
        resp = session.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 200:
            data = resp.json()
            if 'user' in data:
                print_result(True, f"GET /auth/me with cookie returns user: {data['user'].get('username')}")
            else:
                print_result(False, f"GET /auth/me response missing user: {data}")
        else:
            print_result(False, f"GET /auth/me failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /auth/me failed: {e}")
    
    # Test /auth/me without cookie
    try:
        resp = requests.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 401:
            print_result(True, "GET /auth/me without cookie returns 401")
        else:
            print_result(False, f"GET /auth/me without cookie should return 401, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"GET /auth/me without cookie failed: {e}")
    
    # Test protected endpoint without cookie
    try:
        resp = requests.get(f"{BASE_URL}/products")
        if resp.status_code == 401:
            print_result(True, "GET /products without cookie returns 401")
        else:
            print_result(False, f"GET /products without cookie should return 401, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"GET /products without cookie failed: {e}")
    
    return True

def test_categories():
    """Test 2: Categories"""
    print_test("2. Categories")
    
    # GET categories
    try:
        resp = session.get(f"{BASE_URL}/categories")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) >= 7:
                print_result(True, f"GET /categories returns {len(data)} categories (expected >= 7)")
            else:
                print_result(False, f"GET /categories should return at least 7 categories, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /categories failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /categories failed: {e}")
    
    # POST new category
    try:
        resp = session.post(f"{BASE_URL}/categories", json={"name": "Test Kategori"})
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data and 'name' in data and data['name'] == "Test Kategori":
                print_result(True, f"POST /categories created category with id: {data['id']}")
                return data['id']
            else:
                print_result(False, f"POST /categories response missing id or name: {data}")
        else:
            print_result(False, f"POST /categories failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"POST /categories failed: {e}")
    
    return None

def test_products(category_id):
    """Test 3: Products CRUD"""
    print_test("3. Products CRUD")
    
    # GET products
    try:
        resp = session.get(f"{BASE_URL}/products")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) >= 4:
                print_result(True, f"GET /products returns {len(data)} products (expected >= 4 seeded)")
            else:
                print_result(False, f"GET /products should return at least 4 products, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /products failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /products failed: {e}")
    
    # Search products
    try:
        resp = session.get(f"{BASE_URL}/products?q=JBL")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list):
                print_result(True, f"GET /products?q=JBL returns {len(data)} filtered results")
            else:
                print_result(False, f"GET /products?q=JBL should return list, got {type(data)}")
        else:
            print_result(False, f"GET /products?q=JBL failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /products?q=JBL failed: {e}")
    
    # POST new product
    product_id = None
    try:
        product_data = {
            "sku": "TST-001",
            "name": "Test Ürün",
            "brand": "TestMarka",
            "purchase_price": 100,
            "selling_price": 200,
            "stock": 10,
            "min_stock": 2,
            "category_id": category_id
        }
        resp = session.post(f"{BASE_URL}/products", json=product_data)
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data and data.get('name') == "Test Ürün":
                product_id = data['id']
                print_result(True, f"POST /products created product with id: {product_id}")
            else:
                print_result(False, f"POST /products response missing id or name: {data}")
        else:
            print_result(False, f"POST /products failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"POST /products failed: {e}")
    
    if not product_id:
        print_result(False, "Cannot continue product tests without product_id")
        return None
    
    # GET single product
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('id') == product_id and data.get('name') == "Test Ürün":
                print_result(True, f"GET /products/{product_id} returns correct product")
            else:
                print_result(False, f"GET /products/{product_id} returned wrong data: {data}")
        else:
            print_result(False, f"GET /products/{product_id} failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /products/{product_id} failed: {e}")
    
    # PUT update product
    try:
        update_data = {
            "sku": "TST-001",
            "name": "Test Ürün Güncellendi",
            "brand": "TestMarka",
            "purchase_price": 120,
            "selling_price": 250,
            "min_stock": 3,
            "category_id": category_id
        }
        resp = session.put(f"{BASE_URL}/products/{product_id}", json=update_data)
        if resp.status_code == 200:
            print_result(True, f"PUT /products/{product_id} updated successfully")
        else:
            print_result(False, f"PUT /products/{product_id} failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"PUT /products/{product_id} failed: {e}")
    
    # Verify update
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('name') == "Test Ürün Güncellendi":
                print_result(True, "Product name updated correctly")
            else:
                print_result(False, f"Product name not updated: {data.get('name')}")
        else:
            print_result(False, f"GET /products/{product_id} after update failed: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Verify update failed: {e}")
    
    # GET product movements
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}/movements")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) >= 1:
                print_result(True, f"GET /products/{product_id}/movements returns {len(data)} movements (expected >= 1 for initial stock)")
            else:
                print_result(False, f"GET /products/{product_id}/movements should return at least 1 movement, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /products/{product_id}/movements failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /products/{product_id}/movements failed: {e}")
    
    # DELETE product (will do later after stock tests)
    return product_id

def test_stock_adjustments(product_id):
    """Test 4: Stock adjustments"""
    print_test("4. Stock Adjustments")
    
    # Get current stock
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}")
        if resp.status_code == 200:
            current_stock = resp.json().get('stock', 0)
            print(f"Current stock: {current_stock}")
        else:
            print_result(False, f"Cannot get current stock: {resp.status_code}")
            return
    except Exception as e:
        print_result(False, f"Cannot get current stock: {e}")
        return
    
    # Stock IN
    try:
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": product_id,
            "type": "in",
            "quantity": 3,
            "reason": "Test giriş"
        })
        if resp.status_code == 200:
            data = resp.json()
            expected_stock = current_stock + 3
            if data.get('stock') == expected_stock:
                print_result(True, f"Stock IN: stock increased from {current_stock} to {data.get('stock')}")
                current_stock = expected_stock
            else:
                print_result(False, f"Stock IN: expected {expected_stock}, got {data.get('stock')}")
        else:
            print_result(False, f"Stock IN failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"Stock IN failed: {e}")
    
    # Stock OUT
    try:
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": product_id,
            "type": "out",
            "quantity": 2,
            "reason": "Test çıkış"
        })
        if resp.status_code == 200:
            data = resp.json()
            expected_stock = current_stock - 2
            if data.get('stock') == expected_stock:
                print_result(True, f"Stock OUT: stock decreased from {current_stock} to {data.get('stock')}")
                current_stock = expected_stock
            else:
                print_result(False, f"Stock OUT: expected {expected_stock}, got {data.get('stock')}")
        else:
            print_result(False, f"Stock OUT failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"Stock OUT failed: {e}")
    
    # Negative stock test
    try:
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": product_id,
            "type": "out",
            "quantity": 999,
            "reason": "Negatif test"
        })
        if resp.status_code == 400:
            print_result(True, "Stock OUT with excessive quantity returns 400 (prevents negative stock)")
        else:
            print_result(False, f"Stock OUT with excessive quantity should return 400, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"Negative stock test failed: {e}")
    
    # Stock ADJUST
    try:
        resp = session.post(f"{BASE_URL}/stock/adjust", json={
            "product_id": product_id,
            "type": "adjust",
            "quantity": 50,
            "reason": "Sayım"
        })
        if resp.status_code == 200:
            data = resp.json()
            if data.get('stock') == 50:
                print_result(True, f"Stock ADJUST: stock set to 50")
                current_stock = 50
            else:
                print_result(False, f"Stock ADJUST: expected 50, got {data.get('stock')}")
        else:
            print_result(False, f"Stock ADJUST failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"Stock ADJUST failed: {e}")
    
    # GET stock movements
    try:
        resp = session.get(f"{BASE_URL}/stock/movements")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                print_result(True, f"GET /stock/movements returns {len(data)} movements")
            else:
                print_result(False, f"GET /stock/movements should return movements, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /stock/movements failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /stock/movements failed: {e}")

def test_customers():
    """Test 5: Customers CRUD"""
    print_test("5. Customers CRUD")
    
    # GET customers
    try:
        resp = session.get(f"{BASE_URL}/customers")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                print_result(True, f"GET /customers returns {len(data)} customers (seeded)")
            else:
                print_result(False, f"GET /customers should return seeded customers, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /customers failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /customers failed: {e}")
    
    # POST new customer
    customer_id = None
    try:
        customer_data = {
            "company_name": "Test Firma",
            "contact_person": "Ali Veli",
            "phone": "555-1234",
            "email": "test@firma.com",
            "tax_office": "Test Vergi Dairesi",
            "tax_number": "1234567890"
        }
        resp = session.post(f"{BASE_URL}/customers", json=customer_data)
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data and data.get('company_name') == "Test Firma":
                customer_id = data['id']
                print_result(True, f"POST /customers created customer with id: {customer_id}")
            else:
                print_result(False, f"POST /customers response missing id or company_name: {data}")
        else:
            print_result(False, f"POST /customers failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"POST /customers failed: {e}")
    
    if not customer_id:
        print_result(False, "Cannot continue customer tests without customer_id")
        return None
    
    # GET single customer
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('id') == customer_id:
                print_result(True, f"GET /customers/{customer_id} returns correct customer")
            else:
                print_result(False, f"GET /customers/{customer_id} returned wrong data: {data}")
        else:
            print_result(False, f"GET /customers/{customer_id} failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /customers/{customer_id} failed: {e}")
    
    # PUT update customer
    try:
        update_data = {
            "company_name": "Test Firma Güncellendi",
            "contact_person": "Veli Ali",
            "phone": "555-1234",
            "email": "test@firma.com",
            "tax_office": "Test Vergi Dairesi",
            "tax_number": "1234567890"
        }
        resp = session.put(f"{BASE_URL}/customers/{customer_id}", json=update_data)
        if resp.status_code == 200:
            print_result(True, f"PUT /customers/{customer_id} updated successfully")
        else:
            print_result(False, f"PUT /customers/{customer_id} failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"PUT /customers/{customer_id} failed: {e}")
    
    # Get balance before payment
    balance_before = 0
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}")
        if resp.status_code == 200:
            balance_before = resp.json().get('balance', 0)
            print(f"Balance before payment: {balance_before}")
        else:
            print_result(False, f"Cannot get balance: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot get balance: {e}")
    
    # POST payment
    try:
        resp = session.post(f"{BASE_URL}/payments", json={
            "customer_id": customer_id,
            "amount": 500,
            "notes": "Test tahsilat"
        })
        if resp.status_code == 200:
            print_result(True, "POST /payments created payment")
        else:
            print_result(False, f"POST /payments failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"POST /payments failed: {e}")
    
    # Verify balance updated
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}")
        if resp.status_code == 200:
            data = resp.json()
            balance_after = data.get('balance', 0)
            expected_balance = balance_before - 500
            if balance_after == expected_balance:
                print_result(True, f"Customer balance updated correctly: {balance_before} -> {balance_after}")
            else:
                print_result(False, f"Customer balance incorrect: expected {expected_balance}, got {balance_after}")
        else:
            print_result(False, f"GET /customers/{customer_id} after payment failed: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Verify balance failed: {e}")
    
    # GET customer transactions
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}/transactions")
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) >= 1:
                print_result(True, f"GET /customers/{customer_id}/transactions returns {len(data)} transactions")
            else:
                print_result(False, f"GET /customers/{customer_id}/transactions should return at least 1 transaction, got {len(data) if isinstance(data, list) else 'not a list'}")
        else:
            print_result(False, f"GET /customers/{customer_id}/transactions failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /customers/{customer_id}/transactions failed: {e}")
    
    # DELETE customer (will do later)
    return customer_id

def test_sales(customer_id, product_id):
    """Test 6: Sales (CRITICAL)"""
    print_test("6. Sales (CRITICAL - Core Feature)")
    
    # Get a product with stock
    product_stock_before = 0
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}")
        if resp.status_code == 200:
            product_stock_before = resp.json().get('stock', 0)
            print(f"Product stock before sale: {product_stock_before}")
        else:
            print_result(False, f"Cannot get product stock: {resp.status_code}")
            return
    except Exception as e:
        print_result(False, f"Cannot get product stock: {e}")
        return
    
    # Get customer balance before sale
    customer_balance_before = 0
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}")
        if resp.status_code == 200:
            customer_balance_before = resp.json().get('balance', 0)
            print(f"Customer balance before sale: {customer_balance_before}")
        else:
            print_result(False, f"Cannot get customer balance: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot get customer balance: {e}")
    
    # Create sale
    sale_id = None
    sale_total = 0
    sale_due = 0
    try:
        sale_data = {
            "customer_id": customer_id,
            "items": [
                {
                    "product_id": product_id,
                    "quantity": 2,
                    "unit_price": 100,
                    "discount": 10
                }
            ],
            "tax_rate": 20,
            "paid": 100,
            "notes": "Test fatura"
        }
        resp = session.post(f"{BASE_URL}/sales", json=sale_data)
        if resp.status_code == 200:
            data = resp.json()
            if 'id' in data and 'invoice_number' in data:
                sale_id = data['id']
                sale_total = data.get('total', 0)
                sale_due = data.get('due', 0)
                invoice_number = data.get('invoice_number')
                print_result(True, f"POST /sales created sale with invoice: {invoice_number}, total: {sale_total}, due: {sale_due}")
                
                # Verify invoice number format (CLS-YYYY-#####)
                if invoice_number.startswith('CLS-') and len(invoice_number.split('-')) == 3:
                    print_result(True, f"Invoice number format correct: {invoice_number}")
                else:
                    print_result(False, f"Invoice number format incorrect: {invoice_number}")
            else:
                print_result(False, f"POST /sales response missing id or invoice_number: {data}")
        else:
            print_result(False, f"POST /sales failed: {resp.status_code} - {resp.text}")
            return
    except Exception as e:
        print_result(False, f"POST /sales failed: {e}")
        return
    
    # Verify product stock decreased
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}")
        if resp.status_code == 200:
            product_stock_after = resp.json().get('stock', 0)
            expected_stock = product_stock_before - 2
            if product_stock_after == expected_stock:
                print_result(True, f"Product stock decreased correctly: {product_stock_before} -> {product_stock_after}")
            else:
                print_result(False, f"Product stock incorrect: expected {expected_stock}, got {product_stock_after}")
        else:
            print_result(False, f"Cannot verify product stock: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot verify product stock: {e}")
    
    # Verify customer balance increased
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}")
        if resp.status_code == 200:
            customer_balance_after = resp.json().get('balance', 0)
            expected_balance = customer_balance_before + sale_due
            if customer_balance_after == expected_balance:
                print_result(True, f"Customer balance increased correctly: {customer_balance_before} -> {customer_balance_after} (due: {sale_due})")
            else:
                print_result(False, f"Customer balance incorrect: expected {expected_balance}, got {customer_balance_after}")
        else:
            print_result(False, f"Cannot verify customer balance: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot verify customer balance: {e}")
    
    # Verify stock movements
    try:
        resp = session.get(f"{BASE_URL}/products/{product_id}/movements")
        if resp.status_code == 200:
            movements = resp.json()
            out_movements = [m for m in movements if m.get('type') == 'out']
            if len(out_movements) > 0:
                print_result(True, f"Stock movements has 'out' entries for sale")
            else:
                print_result(False, f"Stock movements missing 'out' entries for sale")
        else:
            print_result(False, f"Cannot verify stock movements: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot verify stock movements: {e}")
    
    # Verify customer transactions
    try:
        resp = session.get(f"{BASE_URL}/customers/{customer_id}/transactions")
        if resp.status_code == 200:
            transactions = resp.json()
            sale_transactions = [t for t in transactions if t.get('type') == 'sale']
            if len(sale_transactions) > 0:
                print_result(True, f"Customer transactions has 'sale' entry")
            else:
                print_result(False, f"Customer transactions missing 'sale' entry")
        else:
            print_result(False, f"Cannot verify customer transactions: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Cannot verify customer transactions: {e}")
    
    # GET sales list
    try:
        resp = session.get(f"{BASE_URL}/sales")
        if resp.status_code == 200:
            sales = resp.json()
            if isinstance(sales, list) and any(s.get('id') == sale_id for s in sales):
                print_result(True, f"GET /sales includes the new sale")
            else:
                print_result(False, f"GET /sales does not include the new sale")
        else:
            print_result(False, f"GET /sales failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /sales failed: {e}")
    
    # GET single sale
    try:
        resp = session.get(f"{BASE_URL}/sales/{sale_id}")
        if resp.status_code == 200:
            data = resp.json()
            if 'sale' in data and 'customer' in data and 'settings' in data:
                print_result(True, f"GET /sales/{sale_id} returns sale, customer, and settings")
            else:
                print_result(False, f"GET /sales/{sale_id} missing required fields: {data.keys()}")
        else:
            print_result(False, f"GET /sales/{sale_id} failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /sales/{sale_id} failed: {e}")
    
    # Test insufficient stock
    try:
        resp = session.post(f"{BASE_URL}/sales", json={
            "customer_id": customer_id,
            "items": [{"product_id": product_id, "quantity": 9999}],
            "tax_rate": 20,
            "paid": 0
        })
        if resp.status_code == 400:
            print_result(True, "POST /sales with insufficient stock returns 400")
        else:
            print_result(False, f"POST /sales with insufficient stock should return 400, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"Insufficient stock test failed: {e}")
    
    # Test missing customer_id
    try:
        resp = session.post(f"{BASE_URL}/sales", json={
            "items": [{"product_id": product_id, "quantity": 1}],
            "tax_rate": 20
        })
        if resp.status_code == 400:
            print_result(True, "POST /sales without customer_id returns 400")
        else:
            print_result(False, f"POST /sales without customer_id should return 400, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"Missing customer_id test failed: {e}")
    
    # Test empty items
    try:
        resp = session.post(f"{BASE_URL}/sales", json={
            "customer_id": customer_id,
            "items": [],
            "tax_rate": 20
        })
        if resp.status_code == 400:
            print_result(True, "POST /sales with empty items returns 400")
        else:
            print_result(False, f"POST /sales with empty items should return 400, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"Empty items test failed: {e}")

def test_dashboard():
    """Test 7: Dashboard"""
    print_test("7. Dashboard Stats")
    
    try:
        resp = session.get(f"{BASE_URL}/dashboard/stats")
        if resp.status_code == 200:
            data = resp.json()
            required_fields = ['totalStockValue', 'totalProducts', 'totalCustomers', 'monthlySales', 
                             'totalReceivables', 'lowStockCount', 'lowStock', 'recentSales', 'series']
            missing_fields = [f for f in required_fields if f not in data]
            if not missing_fields:
                print_result(True, f"GET /dashboard/stats returns all required fields")
                
                # Verify series has 30 days
                if isinstance(data.get('series'), list) and len(data['series']) == 30:
                    print_result(True, f"Dashboard series has 30 day buckets")
                else:
                    print_result(False, f"Dashboard series should have 30 days, got {len(data.get('series', []))}")
            else:
                print_result(False, f"GET /dashboard/stats missing fields: {missing_fields}")
        else:
            print_result(False, f"GET /dashboard/stats failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /dashboard/stats failed: {e}")

def test_settings():
    """Test 8: Settings"""
    print_test("8. Settings")
    
    # GET settings
    original_company_name = None
    try:
        resp = session.get(f"{BASE_URL}/settings")
        if resp.status_code == 200:
            data = resp.json()
            if 'company_name' in data:
                original_company_name = data.get('company_name')
                print_result(True, f"GET /settings returns company_name: {original_company_name}")
            else:
                print_result(False, f"GET /settings missing company_name: {data}")
        else:
            print_result(False, f"GET /settings failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"GET /settings failed: {e}")
    
    # PUT settings
    try:
        resp = session.put(f"{BASE_URL}/settings", json={"company_name": "Cactus Test Güncellendi"})
        if resp.status_code == 200:
            print_result(True, "PUT /settings updated successfully")
        else:
            print_result(False, f"PUT /settings failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"PUT /settings failed: {e}")
    
    # Verify update
    try:
        resp = session.get(f"{BASE_URL}/settings")
        if resp.status_code == 200:
            data = resp.json()
            if data.get('company_name') == "Cactus Test Güncellendi":
                print_result(True, "Settings company_name updated correctly")
            else:
                print_result(False, f"Settings company_name not updated: {data.get('company_name')}")
        else:
            print_result(False, f"GET /settings after update failed: {resp.status_code}")
    except Exception as e:
        print_result(False, f"Verify settings update failed: {e}")
    
    # Restore original
    if original_company_name:
        try:
            session.put(f"{BASE_URL}/settings", json={"company_name": original_company_name})
        except:
            pass

def test_logout():
    """Test 9: Logout"""
    print_test("9. Logout")
    
    # Logout
    try:
        resp = session.post(f"{BASE_URL}/auth/logout")
        if resp.status_code == 200:
            print_result(True, "POST /auth/logout successful")
        else:
            print_result(False, f"POST /auth/logout failed: {resp.status_code} - {resp.text}")
    except Exception as e:
        print_result(False, f"POST /auth/logout failed: {e}")
    
    # Verify /auth/me returns 401 after logout
    try:
        resp = session.get(f"{BASE_URL}/auth/me")
        if resp.status_code == 401:
            print_result(True, "GET /auth/me after logout returns 401")
        else:
            print_result(False, f"GET /auth/me after logout should return 401, got {resp.status_code}")
    except Exception as e:
        print_result(False, f"GET /auth/me after logout failed: {e}")

def cleanup(product_id, customer_id):
    """Cleanup test data"""
    print_test("Cleanup")
    
    # Re-login for cleanup
    try:
        session.post(f"{BASE_URL}/auth/login", json={"username": ADMIN_USER, "password": ADMIN_PASS})
    except:
        pass
    
    # Delete product
    if product_id:
        try:
            resp = session.delete(f"{BASE_URL}/products/{product_id}")
            if resp.status_code == 200:
                print_result(True, f"Deleted test product {product_id}")
            else:
                print_result(False, f"Failed to delete product: {resp.status_code}")
        except Exception as e:
            print_result(False, f"Failed to delete product: {e}")
    
    # Delete customer
    if customer_id:
        try:
            resp = session.delete(f"{BASE_URL}/customers/{customer_id}")
            if resp.status_code == 200:
                print_result(True, f"Deleted test customer {customer_id}")
            else:
                print_result(False, f"Failed to delete customer: {resp.status_code}")
        except Exception as e:
            print_result(False, f"Failed to delete customer: {e}")

def main():
    print("\n" + "="*60)
    print("CACTUS LIGHT & SOUND ERP - BACKEND API TEST")
    print("="*60)
    print(f"Base URL: {BASE_URL}")
    print(f"Test User: {ADMIN_USER}")
    print("="*60)
    
    # Run all tests in order
    test_auth_flow()
    category_id = test_categories()
    product_id = test_products(category_id)
    if product_id:
        test_stock_adjustments(product_id)
    customer_id = test_customers()
    if customer_id and product_id:
        test_sales(customer_id, product_id)
    test_dashboard()
    test_settings()
    test_logout()
    
    # Cleanup
    if product_id or customer_id:
        cleanup(product_id, customer_id)
    
    print("\n" + "="*60)
    print("BACKEND API TESTING COMPLETE")
    print("="*60)

if __name__ == "__main__":
    main()
