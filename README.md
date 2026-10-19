# AI-Based Training Centre Compliance & Monitoring System

A realistic, full-stack government monitoring prototype designed for government-funded vocational skilling schemes.

The platform provides verified oversight of training-centre **attendance** and **infrastructure compliance** across two training centres using:
1. **Manual Attendance & Infrastructure Reports** filed by Training Centre Officials.
2. **AI-Driven Camera Surveillance & Analytics** (Anonymous YOLO person tracking & headcount without biometric identification).
3. **Government Official Oversight Dashboard** for cross-centre audits, discrepancy detection, and issue tracking.

---

## 👥 User Roles & Demo Credentials

The system operates strictly with **two user roles** across **two training centres**:

| Role | Training Centre | Demo User ID | Password | Scope & Access Permissions |
|---|---|---|---|---|
| **Training Centre Official** | Training Centre 1 (`TC1`) | `TC1OFF001` | `demo123` | Centre 1 only: Mark & lock attendance, register students, file equipment defect reports. |
| **Training Centre Official** | Training Centre 2 (`TC2`) | `TC2OFF001` | `demo123` | Centre 2 only: Mark & lock attendance, register students, file equipment defect reports. |
| **Government Official** | National Directorate | `GOV001` | `demo123` | Both Centres: Multi-centre switcher, read-only audit attendance, live camera footage with AI headcount, central equipment log. |

---

## 🔐 2-Step Login Portal (Initial Screen)

When the application opens at `http://127.0.0.1:5000`, the **Login Portal is the mandatory first screen**:

1. **Step 1 ("Who are you?")**:
   - Two large interactive cards: `[ Government Official ]` and `[ Training Centre Official ]`.
   - Selecting a role activates the `NEXT` button (no credentials asked on the first screen).
2. **Step 2 (Credentials)**:
   - Displays User ID and Password fields with convenient 1-click credential auto-fill buttons for demo evaluation.
   - Enforces role verification so credentials match the selected role.
3. **Immediate Profile Page**:
   - Upon successful login, the user's **Official Profile Page** is displayed immediately with portrait photo, personal details, qualification, ID, and assigned training centre (for TC officials).
   - A direct action button or sidebar navigation routes the user to their respective operational dashboard.

---

## 📋 Feature Specifications & Workflow

### 1. Training Centre Official Experience
- **Operations Dashboard**: Summary metrics showing registered trainees, attendance status, and isolated centre boundaries.
- **Dynamic Attendance Marking**:
  - Live checkbox roster of registered trainees with a dynamic counter: `X / Total Students Present`.
  - **Permanent Attendance Lock**: Clicking `SUBMIT ATTENDANCE` permanently locks the session (`🔒 Attendance locked after submission.`). Checkboxes are permanently disabled and the edit option is removed.
- **Register New Student**:
  - Enrollment form capturing Name, Roll Number, Date of Birth, Gender, Phone, Email, Address, Course/Trade, Batch, and Qualification.
  - Adding a trainee immediately updates the centre roster and future attendance sheets without affecting the other centre.
- **Equipment / Issues Reporting**:
  - Structured filing form for damaged, broken, or missing machinery (Equipment Name, Issue Type, Date, Comments, and Evidence photo upload).
  - Displays centre-specific issue history.

### 2. Government Official Experience
- **Centre Scope Selector**: Top navigation dropdown (`Training Centre 1` / `Training Centre 2`) allowing seamless inspection while maintaining data isolation.
- **Dual-Centre Overview Dashboard**: Real-time cross-centre comparison cards showing official attendance vs AI camera count, headcount difference, open equipment issues, and camera surveillance status.
- **Read-Only Attendance Audit**: Displays locked, submitted attendance logs with student-level `Present` / `Absent` badges.
- **Footage & AI Surveillance**:
  - Prominent `● CAMERA ON` pulse indicator and `DEMO CAMERA FEED` badge.
  - Anonymous YOLO Person Detection displaying bounding boxes labeled `STU01`, `STU02`, ..., `STU26` (zero facial recognition or biometric data).
  - Prominent metric banner: `X / Total Students Visible` (e.g. `26 / 30 Students Visible`).
  - Attendance vs Camera Discrepancy reconciliation banner flagging attendance gaps with advisory notices.
- **Equipment & Comments Repository**:
  - Chronological repository of all defect reports submitted by both training centres.
  - Multi-parameter filtering by Training Centre (`All`, `TC1`, `TC2`) and Issue Type (`Damaged`, `Not Working`, `Missing`, `Maintenance Required`).

---

## 🛠️ Verification & Test Suite

The system includes an automated end-to-end Python test script verifying all 14 workflow steps:

```powershell
& "C:\Users\anish\AppData\Local\Programs\Thonny\python.exe" test_system.py
```

### Verified Test Matrix:
1. `[PASS]` Step 1-3: TC1 Official Login with role matching verification.
2. `[PASS]` Step 5: Dynamic attendance fetching & student list loading.
3. `[PASS]` Step 7: New student registration (`Student 31`) & roll allocation.
4. `[PASS]` Strict Isolation: TC1 has 31 students, while TC2 remains isolated with 28 students.
5. `[PASS]` Step 8: Equipment defect report submission.
6. `[PASS]` Step 9: Government Official authentication.
7. `[PASS]` Step 10 & 17: Multi-centre dashboard overview with dual-centre metrics.
8. `[PASS]` Step 12: Camera surveillance online (`● CAMERA ON`), anonymous `STU01` labels, headcount and discrepancy flag.
9. `[PASS]` Step 13: Central equipment repository reflecting submitted TC1 reports.

---

## 🚀 Running the Prototype Locally

The application runs using Python 3.14 + Flask + OpenCV + Ultralytics:

```powershell
# Navigate to project directory
cd C:\Users\anish\.gemini\antigravity\scratch\skilling-compliance-system

# Start server
& "C:\Users\anish\AppData\Local\Programs\Thonny\python.exe" server.py
```

Open your web browser and navigate to:
**http://127.0.0.1:5000**
