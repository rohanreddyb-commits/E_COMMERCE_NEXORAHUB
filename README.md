# E_COMMERCE_NEXORAHUB


A full-stack e-commerce application featuring a modern Next.js frontend and a robust Node.js/Express backend.

## Tech Stack

### Frontend
- **Framework:** Next.js (React 19)
- **Styling:** Tailwind CSS
- **Charts & Maps:** ApexCharts, React-jvectormap
- **UI Components:** FullCalendar, Flatpickr, Swiper, React DnD
- **Language:** TypeScript

### Backend
- **Framework:** Node.js with Express
- **Database:** Microsoft SQL Server (MSSQL)
- **Authentication:** JSON Web Tokens (JWT) & bcrypt
- **Validation:** Yup
- **File Uploads:** Multer
- **Logging & Security:** Winston, Helmet, Express Rate Limit, CORS
- **Language:** TypeScript

## Project Structure

- `/Frontend`: Contains the Next.js web application and admin dashboard.
- `/backend`: Contains the Node.js Express API services.
- `/Docx`: Contains project documentation and related files.

## How to Run Locally

### Prerequisites
- Node.js (v18 or higher)
- Microsoft SQL Server (MSSQL)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Set up your environment variables. Ensure you have your MSSQL credentials configured in a `.env` file in the `backend` directory.
4. Run the development server:
   ```bash
   npm run dev
   ```
   *(This starts the server using nodemon for hot-reloading)*

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
   *(This will start the Next.js development server)*

## Documentation
Please refer to the `/Docx` directory for detailed project guidelines, requirements, and additional documentation.
