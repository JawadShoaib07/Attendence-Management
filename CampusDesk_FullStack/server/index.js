const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5000;
const DATA_DIR = path.join(__dirname, "data");
const DATA_FILE = path.join(DATA_DIR, "students.json");
app.use(cors());
app.use(express.json({ limit: "1mb" }));

function readStudents() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) {
    const exampleFile = path.join(DATA_DIR, "students.example.json");
    fs.copyFileSync(exampleFile, DATA_FILE);
  }
  try { const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8")); return Array.isArray(data) ? data : []; }
  catch { return []; }
}
function writeStudents(rows) { fs.writeFileSync(DATA_FILE, JSON.stringify(rows, null, 2), "utf8"); }
const text = value => typeof value === "string" ? value.trim() : "";
function validate(input, rows, excludeId = null) {
  const name = text(input.name), email = text(input.email).toLowerCase(), degree = text(input.degree);
  const status = text(input.status || "Active"), semester = Number(input.semester), gpa = Number(input.gpa);
  const classesAttended = Number(input.classesAttended), totalClasses = Number(input.totalClasses), marks = Number(input.marks);
  if (name.length < 2 || name.length > 80) return "Name must be between 2 and 80 characters.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return "Enter a valid email address.";
  if (rows.some(s => s.email.toLowerCase() === email && s.id !== excludeId)) return "A student with this email already exists.";
  if (!degree) return "Please select a degree program.";
  if (!Number.isInteger(semester) || semester < 1 || semester > 12) return "Semester must be between 1 and 12.";
  if (!Number.isFinite(gpa) || gpa < 0 || gpa > 4) return "GPA must be between 0.00 and 4.00.";
  if (!Number.isInteger(totalClasses) || totalClasses < 1 || totalClasses > 500) return "Total classes must be between 1 and 500.";
  if (!Number.isInteger(classesAttended) || classesAttended < 0 || classesAttended > totalClasses) return "Classes attended must be between 0 and total classes.";
  if (!Number.isFinite(marks) || marks < 0 || marks > 100) return "Marks must be between 0 and 100.";
  if (!["Active", "Inactive", "Graduated"].includes(status)) return "Choose a valid status.";
  const attendancePercentage = Math.round((classesAttended / totalClasses) * 100);
  return { name, email, degree, semester, gpa: Number(gpa.toFixed(2)), status, classesAttended, totalClasses, attendancePercentage, marks: Number(marks.toFixed(2)) };
}
app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "CampusDesk API", timestamp: new Date().toISOString() }));
app.get("/api/students", (req, res) => {
  const q = text(req.query.q).toLowerCase(), status = text(req.query.status), degree = text(req.query.degree);
  let rows = readStudents();
  if (q) rows = rows.filter(s => [s.name, s.email, s.id, s.degree].some(v => String(v).toLowerCase().includes(q)));
  if (status && status !== "All statuses") rows = rows.filter(s => s.status === status);
  if (degree && degree !== "All programs") rows = rows.filter(s => s.degree === degree);
  rows = rows.map(s => ({ ...s, classesAttended: Number(s.classesAttended ?? 0), totalClasses: Number(s.totalClasses ?? 0), attendancePercentage: Number(s.totalClasses) > 0 ? Math.round((Number(s.classesAttended ?? 0) / Number(s.totalClasses)) * 100) : 0, marks: Number(s.marks ?? 0) }));
  rows.sort((a,b) => a.name.localeCompare(b.name));
  res.json({ data: rows, total: rows.length });
});
app.get("/api/students/:id", (req, res) => {
  const student = readStudents().find(s => s.id === req.params.id);
  if (!student) return res.status(404).json({ message: "Student not found." });
  res.json({ data: student });
});
app.post("/api/students", (req, res) => {
  const rows = readStudents(), result = validate(req.body || {}, rows);
  if (typeof result === "string") return res.status(400).json({ message: result });
  const student = { id: `STU-${crypto.randomBytes(3).toString("hex").toUpperCase()}`, ...result, createdAt: new Date().toISOString() };
  rows.push(student); writeStudents(rows);
  res.status(201).json({ message: "Student added successfully.", data: student });
});
app.put("/api/students/:id", (req, res) => {
  const rows = readStudents(), index = rows.findIndex(s => s.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Student not found." });
  const result = validate(req.body || {}, rows, req.params.id);
  if (typeof result === "string") return res.status(400).json({ message: result });
  rows[index] = { ...rows[index], ...result, updatedAt: new Date().toISOString() };
  writeStudents(rows); res.json({ message: "Student updated successfully.", data: rows[index] });
});
app.delete("/api/students/:id", (req, res) => {
  const rows = readStudents(), index = rows.findIndex(s => s.id === req.params.id);
  if (index < 0) return res.status(404).json({ message: "Student not found." });
  const [deleted] = rows.splice(index, 1); writeStudents(rows);
  res.json({ message: "Student deleted successfully.", data: deleted });
});
app.use((err, _req, res, _next) => { console.error(err); res.status(500).json({ message: "Unexpected server error." }); });
app.listen(PORT, () => console.log(`CampusDesk API running at http://localhost:${PORT}`));
