<div align="center">
  
# 🎓🤖 CampusIQ
**An Enterprise AI-Driven Student Intelligence Platform**

[![React](https://img.shields.io/badge/React-18-blue.svg?style=flat&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-Bundler-646CFF.svg?style=flat&logo=vite)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933.svg?style=flat&logo=node.js)](https://nodejs.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-Python-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Prisma-4169E1.svg?style=flat&logo=postgresql)](https://www.postgresql.org/)
[![CatBoost](https://img.shields.io/badge/CatBoost-ML-FFCC00.svg?style=flat)](https://catboost.ai/)

CampusIQ is a full-stack, 3-tier SaaS application designed to modernize university administration. It combines real-time academic telemetry, role-based dashboards, and a live Machine Learning microservice to predict student performance and flag academic risks using live data.

</div>

---

## ✨ Key Features

* **Live AI Inference Pipeline:** Evaluates real-time attendance and grade metrics from PostgreSQL, feeding them into a Python/FastAPI microservice running a trained CatBoost classification model.
* **Role-Based Access Control (RBAC):** Strict JWT-secured data boundaries. Administrators see campus-wide trends and ML predictions, while students receive personalized, read-only academic dashboards.
* **Interactive Analytics:** High-performance, interactive data visualization utilizing Recharts and React Query for instant, cached navigation.
* **Production-Grade UI:** Fully upgraded with Shadcn UI Data Tables (searchable, sortable) and elegant Toast notifications to replace legacy browser alerts.
* **Cloud-Ready DevOps:** Containerized backend and ML microservices using Docker, with environment routing configured for seamless edge deployment.

## 📸 Screenshots

*(Add your UI screenshots here to make your repository stand out!)*

| Admin Dashboard (Recharts) | AI Prediction Engine | Student Directory (Shadcn) |
| :---: | :---: | :---: |
| <img src="https://via.placeholder.com/400x250.png?text=Admin+Dashboard" width="400"/> | <img src="https://via.placeholder.com/400x250.png?text=AI+Predictions" width="400"/> | <img src="https://via.placeholder.com/400x250.png?text=Student+Table" width="400"/> |

## 🏗️ System Architecture

CampusIQ utilizes a modern 3-tier microservice architecture to separate the user interface, business logic, and heavy machine learning computation.

### 1. Frontend (Client Tier)
* **Framework:** React 18 (Vite)
* **State & Caching:** TanStack React Query
* **Styling:** Tailwind CSS + Shadcn UI
* **Visualization:** Recharts

### 2. Backend (API & Business Logic)
* **Framework:** Node.js with Express.js
* **Database:** PostgreSQL
* **ORM:** Prisma
* **Authentication:** JWT (JSON Web Tokens) & bcrypt

### 3. Machine Learning (AI Microservice)
* **Framework:** Python + FastAPI
* **Model:** CatBoost (Gradient Boosting) + SHAP Explainability
* **Data Processing:** Pandas, Scikit-learn

## 🧠 How the AI Pipeline Works

CampusIQ does not rely on static CSV files for its predictions. The ML pipeline is fully dynamic:

1. **Trigger:** An Administrator requests a batch inference or individual analysis via the React UI.
2. **Aggregation:** The Node.js server queries PostgreSQL via Prisma, mathematically rolling up the student's raw marks and attendance records into live telemetry ratios (e.g., `attendanceRate`, `averageScore`).
3. **Inference:** Node.js securely POSTs this minimal live payload to the FastAPI microservice.
4. **Prediction:** FastAPI processes the tensor, passes it through the pre-trained CatBoost pipeline, extracts SHAP determining factors, and returns a confidence score and `RISK_LEVEL` (LOW, MEDIUM, HIGH).
5. **Visualization:** The React frontend caches the response and maps it to a colored alert card and a Recharts impact graph.

## 📂 Repository Structure

```text
CampusIQ/
├── frontend/                # React / Vite Client
│   ├── src/
│   │   ├── components/      # Shadcn UI & Layouts
│   │   ├── pages/           # Role-based Dashboard, Directory, AI Predictor
│   │   └── services/        # Axios API instances & Interceptors
├── backend/                 # Node.js / Express Server
│   ├── prisma/              # PostgreSQL Schema & Migrations
│   ├── src/
│   │   ├── controllers/     # API Logic (Auth, Academic Data, ML Bridge)
│   │   ├── middleware/      # JWT & RBAC Auth Verification
│   │   └── routes/          # API routing
│   └── Dockerfile           
└── ml/                      # Python / FastAPI Microservice
    ├── models/              # Pre-trained CatBoost & Pipeline binaries
    ├── src/
    │   └── api.py           # FastAPI endpoints & inference logic
    ├── requirements.txt     
    └── Dockerfile

<h2>⚙️ Local Development Setup</h2>
    <p>To run CampusIQ locally, you will need to run three separate servers concurrently. Ensure you have Node.js (v18+), Python (3.10+), and PostgreSQL installed.</p>

    <h3>Step 1: Database &amp; Backend</h3>
<pre><code>cd backend
npm install
cp .env.example .env 
# Update DATABASE_URL and JWT_SECRET in .env

npx prisma db push
npx prisma generate
npm run dev # Starts on port 5000</code></pre>

    <h3>Step 2: Machine Learning Microservice</h3>
<pre><code>cd ml
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn src.api:app --reload # Starts on port 8000</code></pre>

    <h3>Step 3: Frontend Client</h3>
<pre><code>cd frontend
npm install
cp .env.example .env
# Set VITE_API_URL=http://localhost:5000/api in .env

npm run dev # Starts on port 5173</code></pre>

    <hr>

    <h2>👨‍💻 Author</h2>
    <p><strong>Priyadarshini Wani</strong><br>
    <em>B.Tech Computer Science and Engineering (Artificial Intelligence and Analytics)</em><br>
    <a href="https://linkedin.com/in/yourprofile">LinkedIn</a> | <a href="https://github.com/yourusername">GitHub</a></p>

    <h2>📄 License</h2>
    <p>This project is open-source and available under the MIT License.</p>

</body>
</html>
