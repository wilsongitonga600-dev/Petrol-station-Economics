⛽ Shift Reconciliation System

A cloud-based shift reconciliation and reporting system built for Shell petrol stations. The application replaces manual paper reconciliation with a secure, multi-user web application that records shift data, generates reports, and provides real-time station analytics.

🚀 Live Demo

🌐 Demo: https://wilsongitonga600-dev.github.io/Petrol-station-Economics/shift-app/

«🔒 Note: The live application requires a valid user account to sign in. Public registration is disabled because the system uses secure role-based authentication for petrol station staff.»

---

📖 Overview

The system allows petrol station attendants to record end-of-shift fuel sales using pump meter readings, reconcile those sales against money collected, and securely save every shift to a centralized Supabase database.

Managers have access to station-wide dashboards, reports, user management, and analytics, while attendants can access only their own shifts.

The application is hosted on GitHub Pages and uses Supabase for authentication, database storage, and security.

---

✨ Features

🔐 Secure Authentication

- Email & password login
- Role-based access control (Admin & Attendant)
- Protected application pages
- Secure logout
- Automatic session management

---

⛽ Shift Reconciliation

Record complete shift information including:

Fuel Sales

- Diesel
- V-Power
- Unleaded (Petrol)

Each fuel grade supports:

- Pump A opening & closing readings
- Pump B opening & closing readings
- Automatic litres calculation
- Automatic sales calculation

---

💰 Payment Recording

Supports all common station payment methods:

- M-Pesa
- Cash Drop
- Card (PDQ)
- Shell Card
- Invoices

The application automatically calculates:

- Total Fuel Sales
- Total Money Collected
- Variance
- Balanced / Short / Over status

---

📝 Shift Management

- Save shifts
- Edit saved shifts
- Delete shifts
- Cloud synchronization
- Personal shift history

---

👷 Attendant Dashboard

Each attendant has a personal dashboard showing:

- Total shifts worked
- Total fuel sales
- Total litres sold
- Total shortages
- Total excess
- Date-range filtering
- Historical performance

Attendants can only access their own records.

---

📊 Admin Dashboard

Managers can access:

- Station-wide statistics
- Total station sales
- Fuel sales summaries
- Litres sold by fuel grade
- Date-range filtering
- Combined data from all attendants

---

👥 User Management

Administrators can:

- Create attendant accounts
- Activate attendants
- Deactivate attendants
- Manage user access

Account creation is handled securely through a Supabase Edge Function.

---

🛡️ Security

The application uses Supabase Authentication together with PostgreSQL Row-Level Security (RLS).

Security features include:

- Secure login
- Protected routes
- Role-based permissions
- User data isolation
- Admin-only management pages
- Server-side account creation

Attendants can access only their own reconciliation records.

Administrators can access station-wide information.

---

🛠️ Technology Stack

Frontend

- HTML5
- CSS3
- Vanilla JavaScript

Backend

- Supabase Authentication
- PostgreSQL Database
- Row-Level Security (RLS)
- Supabase Edge Functions

Hosting

- GitHub Pages

---

📂 Project Structure

shift-app/

│── index.html
│── reconciliation.html
│── attendant-dashboard.html
│── admin-dashboard.html
│── admin-users.html
│── auth-guard.js
│── shift-data.js
│── supabase-client.js
│── schema.sql
│── QUERIES.sql
│── ARCHITECTURE.md
│── SETUP.md
└── CASE_STUDY.md

---

⚙️ How It Works

1. 🔑 User logs in.
2. ✅ The system verifies the user's role.
3. ⛽ Fuel meter readings are entered.
4. 🧮 Fuel sales are calculated automatically.
5. 💵 Payment totals are entered.
6. 📈 Variance is calculated automatically.
7. ☁️ The reconciliation is saved securely in Supabase.
8. 📊 Dashboards and reports update automatically.

---

✅ Current Capabilities

- Multi-user authentication
- Cloud database storage
- Real-time synchronization
- Shift creation
- Shift editing
- Shift deletion
- Date-range reporting
- Fuel-grade analytics
- Station-wide reporting
- Personal dashboards
- Admin dashboards
- Secure role-based access
- User account management

---

🚧 Planned Features

The project is actively being developed. Planned enhancements include:

- Password reset workflow
- Pump assignment management
- Tank dip recording
- Fuel delivery tracking
- Inventory management
- Audit log interface
- Offline synchronization
- Notifications
- Android APK
- Multi-branch support

---

🎯 Why This Project?

This project was built to modernize the reconciliation process used in petrol stations by replacing paper records with a secure cloud-based solution.

The goals are to:

- Reduce reconciliation errors
- Improve accountability
- Simplify reporting
- Provide real-time station analytics
- Enable secure multi-user access
- Create a scalable platform for future station management features

---

👨‍💻 Author

Wilson Gitonga

Designed and developed as a real-world software solution for petrol station operations and as a full-stack software engineering portfolio project.
