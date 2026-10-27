# CampusDesk — Student Management System

A responsive student management dashboard built with React + Vite, an Express REST API, and a Postman collection.

## Features
- Responsive professional dashboard and status colours
- Student CRUD: create, read, update, delete
- Search by name, email, ID, or degree
- Filters by status and degree program
- GPA and marks indicators, automatically calculated attendance percentage, validation, duplicate email protection
- CSV export and JSON-file persistence
- Postman collection for API testing
- `npm run dev` starts frontend and API together

## Requirements
Install Node.js 18+ (Node.js 20 LTS recommended), npm, and optionally Postman.

## Run in VS Code
1. Extract this ZIP and open the `CampusDesk_FullStack` folder in VS Code.
2. Open Terminal → New Terminal.
3. Run `npm install`.
4. Run `npm run dev`.
5. Open `http://localhost:5173` in Chrome. API: `http://localhost:5000/api/health`.
6. Keep the terminal open while testing; press Ctrl+C to stop.

## Postman
Import `postman/CampusDesk.postman_collection.json` into Postman. Run the app first, then use the collection. Available routes:
- GET `/api/health`
- GET `/api/students` (supports `?q=ayesha`, `?status=Active`, `?degree=BS%20Software%20Engineering`)
- GET `/api/students/:id`
- POST `/api/students`
- PUT `/api/students/:id`
- DELETE `/api/students/:id`

POST/PUT JSON example:
```json
{
  "name": "Test Student",
  "email": "test.student@example.com",
  "degree": "BS Software Engineering",
  "semester": 2,
  "gpa": 3.5,
  "marks": 86,
  "classesAttended": 18,
  "totalClasses": 20,
  "status": "Active"
}
```

## Storage
This assignment version uses `server/data/students.json` instead of a database to keep local setup simple. On first run, the server copies the safe sample dataset from `server/data/students.example.json`; your runtime data file is ignored by Git to avoid committing local student data.

## Project structure
```text
CampusDesk_FullStack/
├── client/src/App.jsx
├── client/src/main.jsx
├── client/src/styles.css
├── server/index.js
├── server/data/students.json (created locally)
├── server/data/students.example.json
├── postman/CampusDesk.postman_collection.json
├── index.html
├── package.json
└── vite.config.js
```

## Upload to GitHub
Create an empty repository on GitHub first, then replace the URL below with your real repository URL:
```bash
git init
git add .
git commit -m "Build CampusDesk student management system"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/YOUR-REPOSITORY.git
git push -u origin main
```
A real repository link should only be added to the assignment report after GitHub confirms the repository exists.
