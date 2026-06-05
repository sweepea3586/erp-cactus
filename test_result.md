#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: |
  Cactus Light & Sound için Türkçe arayüzlü, tam kapsamlı bir ERP sistemi.
  Modüller: Auth (admin/staff rolleri), Dashboard, Ürünler, Müşteriler, Satışlar (fatura+otomatik stok düşüşü+otomatik bakiye), Stok hareketleri, Tedarikçi/Alım, Cari hesap, Raporlar, Ayarlar.
  Veritabanı şu an MongoDB (template kaynaklı). Supabase schema dosyası ayrıca /app/supabase/schema.sql olarak teslim edilmiştir; Supabase anahtarları kullanıcı tarafından daha sonra eklenecek.

backend:
  - task: "Authentication (login/logout/me with cookie session)"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "PBKDF2 hashed password, signed HMAC cookie 'cls_session'. Default users seeded: admin/admin123 and personel/personel123. Endpoints: POST /api/auth/login, POST /api/auth/logout, GET /api/auth/me."
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED. Wrong credentials return 401. Login with admin/admin123 returns 200 with user object and sets cls_session cookie. GET /auth/me with cookie returns 200 with user. Without cookie returns 401. Protected endpoints (e.g., /products) return 401 without cookie. Logout clears session correctly."

  - task: "Dashboard stats endpoint"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET /api/dashboard/stats returns totalStockValue, totalProducts, totalCustomers, monthlySales, totalReceivables, lowStockCount, lowStock list, recentSales, series (30 days)."
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED. GET /dashboard/stats returns all required fields: totalStockValue, totalProducts, totalCustomers, monthlySales, totalReceivables, lowStockCount, lowStock array, recentSales array, and series array with exactly 30 day buckets."

  - task: "Products CRUD + categories + stock adjust + movements"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST /api/products, GET/PUT/DELETE /api/products/[id], GET /api/products/[id]/movements, GET /api/categories, POST /api/categories, POST /api/stock/adjust (in/out/adjust with audit log), GET /api/stock/movements. Search via ?q="
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED. Categories: GET returns 7 seeded categories, POST creates new category. Products: GET returns 4 seeded products, search with ?q=JBL filters correctly, POST creates product with initial stock movement, GET/PUT/DELETE work correctly, movements tracked. Stock adjust: IN/OUT/ADJUST all work, negative stock prevented (returns 400), movements logged correctly."

  - task: "Customers CRUD + payments + transactions"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/POST /api/customers, GET/PUT/DELETE /api/customers/[id], GET /api/customers/[id]/transactions, POST /api/payments (updates balance and creates ledger entry)."
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED. GET returns 3 seeded customers. POST creates customer successfully. GET/PUT/DELETE work correctly. POST /payments updates customer balance correctly (decreases by payment amount). Customer transactions endpoint returns payment entries."

  - task: "Sales create with auto stock deduction + balance update"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "POST /api/sales validates stock per item, creates sale with invoice number (CLS-YYYY-#####), updates products stock, logs stock movements, updates customer balance by 'due', creates customer_transactions entry, optionally records payment. GET /api/sales lists, GET /api/sales/[id] returns sale+customer+settings."
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED (CRITICAL FEATURE). POST /sales creates sale with correct invoice format (CLS-2026-01001). Product stock decreases automatically by quantity sold. Customer balance increases by 'due' amount (total - paid). Stock movements logged with type='out'. Customer transactions has 'sale' entry. GET /sales lists all sales. GET /sales/[id] returns sale+customer+settings. Validation working: insufficient stock returns 400, missing customer_id returns 400, empty items returns 400."

  - task: "Settings get/update"
    implemented: true
    working: true
    file: "app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: "NA"
        agent: "main"
        comment: "GET/PUT /api/settings - company info, invoice prefix/counter."
      - working: true
        agent: "testing"
        comment: "✅ ALL TESTS PASSED. GET /settings returns company_name and other settings. PUT /settings updates successfully. Changes verified by subsequent GET request."

frontend:
  - task: "Login page"
    implemented: true
    working: true
    file: "app/login/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Confirmed visually working - login form renders, admin/admin123 credentials work, redirects to dashboard."

  - task: "Dashboard page"
    implemented: true
    working: true
    file: "app/(app)/dashboard/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "Visually verified: stat cards, low stock list, sales chart, recent sales rendered correctly with seed data."

  - task: "Products page (CRUD + stock movement modal)"
    implemented: true
    working: "NA"
    file: "app/(app)/urunler/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Create/edit/delete products, stock in/out/adjust modal."

  - task: "Customers page (CRUD + payments)"
    implemented: true
    working: "NA"
    file: "app/(app)/musteriler/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true

  - task: "New sale page + invoice view/print"
    implemented: true
    working: "NA"
    file: "app/(app)/satislar/yeni/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus: []
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: |
      İlk MVP sürümü tamamlandı. Lütfen tüm backend uç noktalarını test edin.
      
      Login akışı: POST /api/auth/login {username: "admin", password: "admin123"} -> set-cookie 'cls_session', returns user. Tüm diğer endpoint'ler bu cookie olmadan 401 dönmeli.
      
      ÖNEMLİ test senaryoları:
      1) Auth: Yanlış şifre 401, doğru şifre 200 + cookie. /api/auth/me cookie ile 200, olmadan 401.
      2) Products CRUD: yeni ürün ekle, listele, ?q= ile ara, güncelle, sil. Stock adjust (in/out/adjust) ile stok değişsin ve /api/stock/movements'a kayıt düşsün.
      3) Customers CRUD aynı şekilde + POST /api/payments ile bakiye azalmalı.
      4) Sales: POST /api/sales ile çoklu kalem fatura oluştur; ürün stokları azalsın, müşteri bakiyesi total-paid kadar artsın, /api/stock/movements'a 'out' hareket eklensin, /api/sales listesinde görünsün, GET /api/sales/[id] sale+customer+settings döndürsün. Stok yetersizse 400 hatası ver.
      5) Stok negatife düşmesin: POST /api/stock/adjust ile type=out ve stoktan fazla istersek 400 vermeli.
      6) Dashboard: /api/dashboard/stats response'unda totalStockValue, totalProducts, lowStock, recentSales, series alanları olmalı.
      
      Test scriptini cookie tabanlı (cookie jar) yapın, requests.Session() kullanın.
