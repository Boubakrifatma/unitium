#!/usr/bin/env python3
"""
Insert HIGH RISK churn prediction for hemdenminyar@gmail.com
"""

import mysql.connector
from datetime import datetime, date
import uuid
import hashlib
import bcrypt
import sys

# Database configuration
DB_CONFIG = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Empty password
    'database': 'pakip'  # Correct database name
}

def hash_password(password):
    """Hash password using bcrypt"""
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode(), salt).decode()

def insert_hemden_data():
    """Insert HIGH RISK organization and churn prediction"""

    try:
        # Connect to database
        print("[*] Connecting to database...")
        conn = mysql.connector.connect(**DB_CONFIG)
        cursor = conn.cursor()

        print("[+] Connected to database")
        print("")

        # Step 1: Delete existing data (clean slate)
        print("[*] Cleaning up existing data...")
        cursor.execute("""
            DELETE FROM ml_churn_predictions
            WHERE org_id IN (
                SELECT o.id FROM organizations o
                JOIN users u ON o.owner_id = u.id
                WHERE u.email = 'hemdenminyar@gmail.com'
            )
        """)

        cursor.execute("""
            DELETE FROM subscriptions
            WHERE organization_id IN (
                SELECT id FROM organizations
                WHERE owner_id IN (
                    SELECT id FROM users WHERE email = 'hemdenminyar@gmail.com'
                )
            )
        """)

        cursor.execute("""
            DELETE FROM organizations
            WHERE owner_id IN (
                SELECT id FROM users WHERE email = 'hemdenminyar@gmail.com'
            )
        """)

        cursor.execute("DELETE FROM users WHERE email = 'hemdenminyar@gmail.com'")
        conn.commit()
        print("[+] Cleaned up")
        print("")

        # Step 2: Create User
        print("[*] Creating user...")
        password_hash = "$2a$10$QXwqWVwHb0w7wBq.6w6Qq.cS4F2Iy6.2pGTxJuJZGvWpCzIy7fBk2"  # Password: Test@123
        now = datetime.now()

        cursor.execute("""
            INSERT INTO users (email, full_name, password_hash, is_verified, is_active, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, ('hemdenminyar@gmail.com', 'Hemden Minyar', password_hash, 1, 1, now, now))

        # Get the user_id that was just created
        cursor.execute("SELECT id FROM users WHERE email = 'hemdenminyar@gmail.com'")
        user_id = cursor.fetchone()[0]
        conn.commit()
        print(f"[+] User created: {user_id}")
        print("")

        # Step 3: Create Organization
        print("[*] Creating organization...")
        org_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO organizations (id, name, slug, owner_id, org_type, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (org_id, 'Hemden Digital Solutions', 'hemden-digital-solutions', user_id, 'ENTERPRISE', now, now))
        conn.commit()
        print(f"[+] Organization created: {org_id}")
        print("")

        # Step 4: Get a Plan ID (PRO plan)
        print("[*] Finding plan...")
        cursor.execute("SELECT id FROM plans WHERE name LIKE '%Pro%' LIMIT 1")
        plan_result = cursor.fetchone()
        if not plan_result:
            print("[-] No PRO plan found. Using first available plan...")
            cursor.execute("SELECT id FROM plans LIMIT 1")
            plan_result = cursor.fetchone()

        plan_id = plan_result[0] if plan_result else None
        if not plan_id:
            print("[-] No plans found in database!")
            return False
        print(f"[+] Plan found: {plan_id}")
        print("")

        # Step 5: Create Subscription
        print("[*] Creating subscription...")
        subscription_id = str(uuid.uuid4())
        cursor.execute("""
            INSERT INTO subscriptions (id, organization_id, plan_id, billing_cycle, status, created_at, updated_at)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (subscription_id, org_id, plan_id, 'MONTHLY', 'ACTIVE', now, now))
        conn.commit()
        print(f"[+] Subscription created: {subscription_id}")
        print("")

        # Step 6: Insert HIGH RISK Churn Prediction
        print("[!] Creating HIGH RISK churn prediction...")
        prediction_id = str(uuid.uuid4())
        today = date.today()

        cursor.execute("""
            INSERT INTO ml_churn_predictions (
                id, org_id, subscription_id, prediction_date, churn_probability,
                risk_segment, wau_ratio, ml_usage_rate, support_ticket_count,
                last_login_delta_days, plan_utilization_pct, payment_failures_count,
                tenure_months, action_triggered, action_triggered_at, model_version, created_at
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            prediction_id, org_id, subscription_id, today, 0.7500,
            'HIGH_RISK', 0.5200, 0.4300, 2,
            22, 82.50, 2,
            14, 'EMAIL', now, 'telco-xgb-v1', now
        ))
        conn.commit()
        print(f"[+] Churn prediction created: {prediction_id}")
        print("")

        # Summary
        print("=" * 50)
        print("[+] SETUP COMPLETE!")
        print("=" * 50)
        print("")
        print("[*] Created Data Summary:")
        print(f"  • User: hemdenminyar@gmail.com")
        print(f"  • Organization: Hemden Digital Solutions")
        print(f"  • Subscription: ACTIVE (Plan ID: {plan_id})")
        print(f"  • Churn Score: 75% [HIGH RISK]")
        print(f"  • Risk Level: HIGH_RISK")
        print(f"  • Action: EMAIL (Retention email)")
        print("")
        print("[*] Login Credentials:")
        print(f"  • Email: hemdenminyar@gmail.com")
        print(f"  • Password: Test@123")
        print("")
        print("[*] Dashboard: http://localhost:4200/app/churn-dashboard")
        print("=" * 50)

        cursor.close()
        conn.close()
        return True

    except mysql.connector.Error as err:
        print(f"[-] Database Error: {err}")
        return False
    except Exception as e:
        print(f"[-] Error: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = insert_hemden_data()
    sys.exit(0 if success else 1)
