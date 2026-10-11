CampusIQ 🎓🤖
An Enterprise AI-Driven Student Intelligence Platform

CampusIQ is a full-stack, 3-tier SaaS application designed to modernize university administration. It combines real-time academic telemetry, role-based dashboards, and a live Machine Learning microservice to predict student performance and flag academic risks using live data.

🚀 Key Features
Live AI Inference Pipeline: Evaluates real-time attendance and grade metrics from PostgreSQL, feeding them into a Python/FastAPI microservice running a trained CatBoost classification model.

Role-Based Access Control (RBAC): Strict JWT-secured data boundaries. Administrators see campus-wide trends and ML predictions, while students receive personalized, read-only academic dashboards.

Interactive Analytics: High-performance, interactive data visualization utilizing Recharts and React Query for instant, cached navigation.

Production-Grade UI: Fully upgraded with Shadcn UI Data Tables (searchable, sortable) and elegant Toast notifications to replace legacy browser alerts.

Cloud-Ready DevOps: Containerized backend and ML microservices using Docker, with environment routing configured for seamless edge deployment.

🏗️ System Architecture
CampusIQ utilizes a modern 3-tier microservice architecture to separate the user interface, business logic, and heavy machine learning computation.

1. Frontend (Client Tier)
Framework: React 18 (Vite)

Language: TypeScript

State & Caching: TanStack React Query

Styling: Tailwind CSS + Shadcn UI

Visualization: Recharts

2. Backend (API & Business Logic)
Framework: Node.js with Express.js

Database: PostgreSQL

ORM: Prisma

Authentication: JWT (JSON Web Tokens) & bcrypt

3. Machine Learning (AI Microservice)
Framework: Python + FastAPI

Model: CatBoost (Gradient Boosting) + SHAP Explainability

Data Processing: Pandas, Scikit-learn

Server: Uvicorn

⚙️ Local Development Setup
To run CampusIQ locally, you will need to run three separate servers concurrently.

Prerequisites
Node.js (v18+)

Python (3.10+)

PostgreSQL (Running locally or via cloud like Neon/Supabase)

Step 1: Database & Backend Setup
cd backend
npm install

# Configure your environment variables
cp .env.example .env 
# Update DATABASE_URL with your PostgreSQL connection string
# Update JWT_SECRET with a secure random string

# Push the schema to the database and generate Prisma Client
npx prisma db push
npx prisma generate

# Start the Node.js API server (Runs on port 5000)
npm run dev

Step 2: Machine Learning Microservice

cd ml
# Create a virtual environment (optional but recommended)
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install ML dependencies
pip install -r requirements.txt

# Start the FastAPI Uvicorn server (Runs on port 8000)

Step 3: Frontend Client
cd frontend
npm install

# Configure environment variables
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api

# Start the Vite development server (Runs on port 5173)
npm run dev

🧠 How the AI Pipeline Works
CampusIQ does not rely on static CSV files for its predictions. The ML pipeline is fully dynamic:

Trigger: An Administrator requests a batch inference or individual analysis via the React UI.

Aggregation: The Node.js server queries PostgreSQL via Prisma, mathematically rolling up the student's raw marks and attendance records into live telemetry ratios (e.g., attendanceRate, averageScore).

Inference: Node.js securely POSTs this minimal live payload to the FastAPI microservice.

Prediction: FastAPI processes the tensor, passes it through the pre-trained CatBoost pipeline, extracts SHAP determining factors, and returns a confidence score and RISK_LEVEL (LOW, MEDIUM, HIGH).

Visualization: The React frontend caches the response and maps it to a colored alert card and a Recharts impact graph.
uvicorn src.api:app --reload
