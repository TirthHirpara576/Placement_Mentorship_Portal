# Placement Mentorship Portal (PMP)

A comprehensive full-stack web application designed to streamline and manage the campus placement process. The platform provides dedicated dashboards for System Administrators and Placement Coordinators, enabling efficient management of student data, placement drives, company profiles, and interview experiences.

## 🚀 Features

### Public Portal
- **Company Profiles:** Browse detailed information about recruiting companies.
- **Placement Statistics:** View analytical data regarding student placements across different branches and years.
- **Resources & Experiences:** Access interview experiences and preparation resources shared by placed students.
- **Coordinator Directory:** Find contact details for placement coordinators.

### Admin Dashboard
- **Data Management:** Add and manage academic years, branches, and student intake capacities.
- **Student Records:** Bulk import student data via Excel files (.xlsx).
- **Coordinator Management:** Add new coordinators, assign branches/years, and activate/deactivate accounts.
- **Email Campaigns:** Send broadcast emails to students of specific branches with attachments.
- **System Audit:** Track and monitor activities performed by coordinators across the portal.

### Coordinator Dashboard
- **Placement Drives:** Schedule placement sessions, record rounds, and manage recruitment procedures.
- **Student Placements:** Track and record data of students successfully placed in companies.
- **Company Management:** Add new recruiting companies along with their logos and descriptions.
- **Knowledge Base:** Upload and manage student interview experiences and preparation resources.

## 💻 Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** PostgreSQL
- **Frontend / Templating:** HTML, CSS, JavaScript (Vanilla), EJS (Embedded JavaScript templates)
- **Authentication:** JSON Web Tokens (JWT) & cookie-parser
- **File Uploads:** Multer (for handling image uploads and Excel sheets)
- **Emails:** Nodemailer (for automated email distribution)

## 🛠️ Installation & Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/TirthHirpara576/Placement_Mentorship_Portal.git
   cd Placement_Mentorship_Portal
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Create a `.env` file in the root directory and configure the following:
   ```env
   PORT=3000
   DB_HOST=localhost
   DB_USER=your_postgres_user
   DB_PASS=your_postgres_password
   DB_NAME=pmp_database
   DB_PORT=5432
   JWT_SECRET=your_jwt_secret_key
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_app_password
   ```

4. **Database Setup:**
   Run the initial SQL scripts to create the required tables for branches, years, students, coordinators, companies, etc.

5. **Start the application:**
   ```bash
   npm run dev
   # or
   npm start
   ```
   The server will start running at `http://localhost:3000`.

## 🤝 Contribution
Contributions, issues, and feature requests are welcome! Feel free to check the issues page if you want to contribute.
