/**
 * Client Application Logic for Training Centre Monitoring System
 * Handles:
 *  - 2-Step Login Portal (Initial Screen)
 *  - Profile Page (Immediate post-login)
 *  - Training Centre Official Dashboard (Attendance with lock, Student Registration, Equipment issues)
 *  - Government Official Dashboard (Multi-centre overview, Read-only attendance, Footage with YOLO STU01 tracking & count, Equipment logs)
 *  - Strict data separation between Training Centre 1 and Training Centre 2
 */

// ===========================================================================
// CLIENT-SIDE STANDALONE MOCK API INTERCEPTOR
// Provides instant, robust in-memory responses for all /api/* requests so
// dashboards, surveillance feeds, attendance rosters, equipment audits, and
// user profiles run 100% standalone without any external server or backend.
// ===========================================================================
(function installClientMockApi() {
  const originalFetch = window.fetch;

  // 1. Full 35 Registered Students Roster for TC1 (SkillCraft Academy)
  const masterStudentsTC1 = [];
  for (let i = 1; i <= 35; i++) {
    masterStudentsTC1.push({
      id: i,
      student_id: `STU-${String(i).padStart(3, '0')}`,
      name: `Student ${i}`,
      student_name: `Student ${i}`,
      roll_no: `R-${100 + i}`,
      roll_number: i,
      course: 'Full Stack Development',
      centre_id: 'TC1',
      status: i <= 3 ? 'Present' : 'Absent',
      registered_date: '2026-09-01'
    });
  }

  // 2. Full 40 Registered Students Roster for TC2 (Apex Technical Hub)
  const masterStudentsTC2 = [];
  for (let i = 1; i <= 40; i++) {
    masterStudentsTC2.push({
      id: i,
      student_id: `TC2-STU-${String(i).padStart(3, '0')}`,
      name: `Trainee ${i}`,
      student_name: `Trainee ${i}`,
      roll_no: `TC2-${100 + i}`,
      roll_number: i,
      course: 'Industrial Automation & Robotics',
      centre_id: 'TC2',
      status: i <= 4 ? 'Present' : 'Absent',
      registered_date: '2026-09-01'
    });
  }

  // Stateful Attendance State
  let tc1AttendanceLocked = true;
  let tc1AttendancePresentCount = 3;
  let tc1AttendanceSession = 'Session 1';
  let tc1AttendanceDate = '2026-10-17';

  let tc2AttendanceLocked = true;
  let tc2AttendancePresentCount = 4;
  let tc2AttendanceSession = 'Session 1';
  let tc2AttendanceDate = '2026-10-17';

  // Stateful Equipment Categories
  const categoriesStore = {
    TC1: [
      { category_key: 'desks_chairs', category_name: 'Desks / Chairs', allocated_count: 35, reported_good: 33, reported_damaged: 2, reported_missing: 0, camera_detected_count: 35, status: 'Audited' },
      { category_key: 'computers', category_name: 'Computers', allocated_count: 20, reported_good: 19, reported_damaged: 1, reported_missing: 0, camera_detected_count: 20, status: 'Audited' },
      { category_key: 'machines', category_name: 'Machines (Lathe / CNC)', allocated_count: 6, reported_good: 5, reported_damaged: 1, reported_missing: 0, camera_detected_count: 6, status: 'Audited' },
      { category_key: 'fans', category_name: 'Ceiling & Exhaust Fans', allocated_count: 10, reported_good: 10, reported_damaged: 0, reported_missing: 0, camera_detected_count: 10, status: 'Audited' },
      { category_key: 'tools', category_name: 'Hand Tools & Kits', allocated_count: 40, reported_good: 38, reported_damaged: 2, reported_missing: 0, camera_detected_count: 40, status: 'Audited' },
      { category_key: 'safety_gear', category_name: 'Safety Kits & PPE', allocated_count: 50, reported_good: 50, reported_damaged: 0, reported_missing: 0, camera_detected_count: 50, status: 'Audited' }
    ],
    TC2: [
      { category_key: 'desks_chairs', category_name: 'Desks / Chairs', allocated_count: 40, reported_good: 39, reported_damaged: 1, reported_missing: 0, camera_detected_count: 40, status: 'Audited' },
      { category_key: 'computers', category_name: 'Computers', allocated_count: 25, reported_good: 25, reported_damaged: 0, reported_missing: 0, camera_detected_count: 25, status: 'Audited' },
      { category_key: 'machines', category_name: 'Machines (Lathe / CNC)', allocated_count: 8, reported_good: 7, reported_damaged: 1, reported_missing: 0, camera_detected_count: 8, status: 'Audited' },
      { category_key: 'fans', category_name: 'Ceiling & Exhaust Fans', allocated_count: 12, reported_good: 12, reported_damaged: 0, reported_missing: 0, camera_detected_count: 12, status: 'Audited' },
      { category_key: 'tools', category_name: 'Hand Tools & Kits', allocated_count: 45, reported_good: 44, reported_damaged: 1, reported_missing: 0, camera_detected_count: 45, status: 'Audited' },
      { category_key: 'safety_gear', category_name: 'Safety Kits & PPE', allocated_count: 60, reported_good: 60, reported_damaged: 0, reported_missing: 0, camera_detected_count: 60, status: 'Audited' }
    ]
  };

  // Stateful Equipment Inventory
  const inventoryStore = {
    TC1: [
      { id: 1, item_id: 'EQ-TC1-001', name: 'Digital Multimeter', category_key: 'tools', category_name: 'Hand Tools & Kits', serial_number: 'DMM-2026-09', status: 'Good', condition: 'Good', inspection_note: 'Verified during morning inspection', location: 'Electronics Lab Bench 2' },
      { id: 2, item_id: 'EQ-TC1-002', name: 'Student Workstation PC 01', category_key: 'computers', category_name: 'Computers', serial_number: 'PC-TC1-8812', status: 'Good', condition: 'Good', inspection_note: 'OS updated, operational', location: 'Computer Lab Row 1' },
      { id: 3, item_id: 'EQ-TC1-003', name: 'Digital Oscilloscope 100MHz', category_key: 'tools', category_name: 'Hand Tools & Kits', serial_number: 'OSC-2026-14', status: 'Damaged', condition: 'Display Flicker', inspection_note: 'Channel 2 input loose', location: 'Workshop Lab' },
      { id: 4, item_id: 'EQ-TC1-004', name: 'Heavy Duty Bench Lathe #1', category_key: 'machines', category_name: 'Machines (Lathe / CNC)', serial_number: 'LTH-4011-A', status: 'Good', condition: 'Good', inspection_note: 'Emergency stop functional', location: 'Mechanical Bay' },
      { id: 5, item_id: 'EQ-TC1-005', name: 'Standard Student Desk #12', category_key: 'desks_chairs', category_name: 'Desks / Chairs', serial_number: 'DSK-TC1-012', status: 'Good', condition: 'Good', inspection_note: 'Sturdy, clear surface', location: 'Classroom A' }
    ],
    TC2: [
      { id: 1, item_id: 'EQ-TC2-001', name: 'Student Workstation PC 05', category_key: 'computers', category_name: 'Computers', serial_number: 'PC-TC2-9901', status: 'Good', condition: 'Good', inspection_note: 'CAD suite installed', location: 'CAD Lab Cubicle 5' },
      { id: 2, item_id: 'EQ-TC2-002', name: '3-Axis CNC Milling Center', category_key: 'machines', category_name: 'Machines (Lathe / CNC)', serial_number: 'CNC-2026-M2', status: 'Good', condition: 'Good', inspection_note: 'Spindle calibrated', location: 'CNC Shop Floor' },
      { id: 3, item_id: 'EQ-TC2-003', name: 'Safety Ear Protection Kit #3', category_key: 'safety_gear', category_name: 'Safety Kits & PPE', serial_number: 'SAF-EP-03', status: 'Good', condition: 'Good', inspection_note: 'Sanitized', location: 'Safety Cabinet 1' }
    ]
  };

  // Stateful Equipment Issues
  const issuesStore = {
    TC1: [
      { issue_id: 'ISS-001', centre_id: 'TC1', item_name: 'Digital Oscilloscope 100MHz', category: 'Hand Tools & Kits', category_key: 'tools', description: 'Channel 2 input connector intermittently loses sync', status: 'Open', reported_date: '2026-10-15', reported_by: 'Paul Fernandes' }
    ],
    TC2: [
      { issue_id: 'ISS-002', centre_id: 'TC2', item_name: 'Heavy Duty Bench Lathe #2', category: 'Machines (Lathe / CNC)', category_key: 'machines', description: 'Drive belt requires tension adjustment', status: 'Open', reported_date: '2026-10-16', reported_by: 'TC2 Workshop Supervisor' }
    ]
  };

  // Camera Alerts History
  const alertsStore = [
    {
      id: 1,
      alert_id: 'ALT-TC1-20261016',
      centre_id: 'TC1',
      centre_name: 'SkillCraft Academy (TC1)',
      camera_id: 'CAM-TC1-01',
      alert_type: 'camera covered',
      status: 'Resolved',
      date_covered: '2026-10-16',
      time_covered: '11:20:00',
      resolved_at: '11:28:15',
      duration_seconds: 495,
      notes: 'Camera lens covered by finger; obstruction cleared after automated alert'
    },
    {
      id: 2,
      alert_id: 'ALT-TC1-20260928',
      centre_id: 'TC1',
      centre_name: 'SkillCraft Academy (TC1)',
      camera_id: 'CAM-TC1-01',
      alert_type: 'camera covered',
      status: 'Resolved',
      date_covered: '2026-09-28',
      time_covered: '14:10:00',
      resolved_at: '14:15:30',
      duration_seconds: 330,
      notes: 'Dust cloth placed over lens; removed by instructor'
    },
    {
      id: 3,
      alert_id: 'ALT-TC2-20260915',
      centre_id: 'TC2',
      centre_name: 'Apex Technical Hub (TC2)',
      camera_id: 'CAM-TC2-01',
      alert_type: 'camera covered',
      status: 'Resolved',
      date_covered: '2026-09-15',
      time_covered: '09:05:00',
      resolved_at: '09:12:00',
      duration_seconds: 420,
      notes: 'Cleaning banner temporarily obstructed camera field; cleared'
    }
  ];

  let currentUserProfile = null;

  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status: status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async function parseBody(options) {
    if (!options || !options.body) return {};
    if (typeof options.body === 'string') {
      try {
        return JSON.parse(options.body);
      } catch (e) {
        try {
          const p = new URLSearchParams(options.body);
          const o = {};
          for (const [k, v] of p.entries()) o[k] = v;
          return o;
        } catch (e2) {
          return {};
        }
      }
    }
    if (typeof FormData !== 'undefined' && options.body instanceof FormData) {
      const o = {};
      for (const [k, v] of options.body.entries()) o[k] = v;
      return o;
    }
    return {};
  }

  window.fetch = async function(resource, options) {
    const rawUrl = typeof resource === 'string' ? resource : (resource && resource.url ? resource.url : '');
    
    // Only intercept requests directed to /api/
    if (!rawUrl.includes('/api/')) {
      return originalFetch.apply(this, arguments);
    }

    try {
      const baseOrigin = window.location.origin && window.location.origin !== 'null' ? window.location.origin : 'http://localhost';
      const urlObj = new URL(rawUrl, baseOrigin);
      const pathname = urlObj.pathname;
      const searchParams = urlObj.searchParams;
      const method = (options && options.method ? options.method.toUpperCase() : 'GET');

      // -----------------------------------------------------------------------
      // 1. AUTHENTICATION & LOGIN
      // -----------------------------------------------------------------------
      if (pathname === '/api/auth/login') {
        const body = await parseBody(options);
        const username = String(body.name || body.registered_name || body.username || body.user_id || body.email || '').trim();
        const uUpper = username.toUpperCase();
        const uLower = username.toLowerCase();
        const requestedRole = String(body.role || state.selectedLoginRole || '').trim();

        let user;
        if (uUpper.includes('TC2') || uLower.includes('apex') || requestedRole.includes('TC2')) {
          user = {
            user_id: 'PAOTRN25',
            name: username && !username.includes('Official') && !username.includes('TC2') ? username : 'Apex TC2 Manager',
            role: 'Training Centre Official',
            email: 'manager@apextech.org',
            phone_number: '+91 9822334455',
            designation: 'Centre Manager',
            department: 'Vocational Training Operations',
            centre_id: 'TC2',
            centre_name: 'Apex Technical Hub (TC2)',
            training_centre_allotted: 'Apex Technical Hub (TC2)',
            access_centres: 'TC2',
            photo_url: 'demo_assets/profile_tc2.jpg',
            photo_pending: 0,
            account_status: 'Active'
          };
        } else if (uLower.includes('greg') || uUpper.includes('GOV') || uUpper.includes('GRF') || requestedRole === 'Government Official') {
          user = {
            user_id: 'GRFGOV24',
            name: username && !username.includes('Official') && !username.includes('Gov') ? username : 'Greg Furtado',
            role: 'Government Official',
            email: 'greg.furtado@gov.in',
            phone_number: '+91 9876543210',
            designation: 'National Director',
            department: 'Ministry of Skill Development & Entrepreneurship',
            training_centre_allotted: 'All Centres (National Scope)',
            access_centres: 'TC1, TC2',
            photo_url: 'demo_assets/profile_gov.jpg',
            photo_pending: 0,
            account_status: 'Active'
          };
        } else {
          // Default to Training Centre Official (TC1 - SkillCraft Academy)
          user = {
            user_id: 'PAOTRN24',
            name: username && !username.includes('Official') ? username : 'Paul Fernandes',
            role: 'Training Centre Official',
            email: 'paul.fernandes@tc1.org',
            phone_number: '+91 9822114433',
            designation: 'Centre Manager',
            department: 'Vocational Training Operations',
            centre_id: 'TC1',
            centre_name: 'SkillCraft Academy (TC1)',
            training_centre_allotted: 'SkillCraft Academy (TC1)',
            access_centres: 'TC1',
            photo_url: 'demo_assets/profile_tc1.jpg',
            photo_pending: 0,
            account_status: 'Active'
          };
        }
        currentUserProfile = user;
        return jsonResponse({ success: true, user: user });
      }

      if (pathname === '/api/auth/signup/request-otp' || pathname === '/api/auth/signup/verify-otp') {
        return jsonResponse({
          success: true,
          message: 'OTP bypassed successfully',
          signup_token: 'BYPASS_TOKEN_ACTIVE',
          records: [
            { role: 'Training Centre Official', centre_id: 'TC1', centre_name: 'SkillCraft Academy (TC1)', designation: 'Centre Manager', department: 'Vocational Training Operations' },
            { role: 'Training Centre Official', centre_id: 'TC2', centre_name: 'Apex Technical Hub (TC2)', designation: 'Centre Manager', department: 'Vocational Training Operations' },
            { role: 'Government Official', centre_id: null, centre_name: 'All Centres (National Scope)', designation: 'National Director', department: 'Ministry of Skill Development & Entrepreneurship' }
          ]
        });
      }

      if (pathname === '/api/auth/signup/complete') {
        const body = await parseBody(options);
        const role = body.role || 'Training Centre Official';
        const isTC = (role === 'Training Centre Official');
        const cid = isTC ? (body.centre_id || 'TC1') : null;
        const cname = isTC ? (body.centre_name || (cid === 'TC2' ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)')) : 'All Centres (National Scope)';
        const user = {
          user_id: isTC ? (cid === 'TC2' ? 'PAOTRN25' : 'PAOTRN24') : 'GRFGOV24',
          name: body.name || 'Official User',
          role: role,
          email: body.email || 'user@portal.gov.in',
          phone_number: '+91 9876543210',
          designation: isTC ? 'Centre Manager' : 'National Director',
          department: isTC ? 'Vocational Training Operations' : 'Ministry of Skill Development & Entrepreneurship',
          centre_id: cid,
          centre_name: cname,
          training_centre_allotted: cname,
          access_centres: isTC ? cid : 'TC1, TC2',
          photo_url: body.photo_url || (isTC ? (cid === 'TC2' ? 'demo_assets/profile_tc2.jpg' : 'demo_assets/profile_tc1.jpg') : 'demo_assets/profile_gov.jpg'),
          photo_pending: body.photo_url ? 0 : 1,
          account_status: 'Active'
        };
        currentUserProfile = user;
        return jsonResponse({ success: true, user: user, message: 'Account registered successfully' });
      }

      if (pathname.startsWith('/api/auth/')) {
        return jsonResponse({ success: true, message: 'Authentication action successful' });
      }

      // -----------------------------------------------------------------------
      // 2. DASHBOARD OVERVIEW
      // -----------------------------------------------------------------------
      if (pathname === '/api/dashboard/overview') {
        return jsonResponse({
          success: true,
          centres: [
            {
              centre_id: 'TC1',
              centre_name: 'SkillCraft Academy (TC1)',
              attendance_present: tc1AttendancePresentCount,
              attendance_total: masterStudentsTC1.length,
              camera_visible: tc1AttendancePresentCount,
              camera_visible_display: String(tc1AttendancePresentCount),
              camera_total: masterStudentsTC1.length,
              difference: 0,
              open_issues: issuesStore.TC1.filter(i => i.status === 'Open').length,
              camera_status: 'CAMERA ON',
              is_camera_covered: false,
              status_display: 'Resolved',
              times_covered_this_month: 1,
              times_covered_total: 2,
              covered_time: '2026-10-16 11:20:00',
              covered_summary: 'Covered: 1 times this month (2 total)'
            },
            {
              centre_id: 'TC2',
              centre_name: 'Apex Technical Hub (TC2)',
              attendance_present: tc2AttendancePresentCount,
              attendance_total: masterStudentsTC2.length,
              camera_visible: tc2AttendancePresentCount,
              camera_visible_display: String(tc2AttendancePresentCount),
              camera_total: masterStudentsTC2.length,
              difference: 0,
              open_issues: issuesStore.TC2.filter(i => i.status === 'Open').length,
              camera_status: 'CAMERA ON',
              is_camera_covered: false,
              status_display: 'Resolved',
              times_covered_this_month: 0,
              times_covered_total: 1,
              covered_time: '2026-09-15 09:05:00',
              covered_summary: 'Covered: 0 times this month (1 total)'
            }
          ]
        });
      }

      // -----------------------------------------------------------------------
      // 3. STUDENTS & REGISTRATION
      // -----------------------------------------------------------------------
      if (pathname === '/api/students') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        const list = (cid === 'TC2') ? masterStudentsTC2 : masterStudentsTC1;
        return jsonResponse({
          success: true,
          total: list.length,
          students: list
        });
      }

      if (pathname === '/api/students/register') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.currentUser?.centre_id || 'TC1').toUpperCase();
        const list = (cid === 'TC2') ? masterStudentsTC2 : masterStudentsTC1;
        const newId = list.length + 1;
        const newStudent = {
          id: newId,
          student_id: `${cid}-STU-${String(newId).padStart(3, '0')}`,
          name: body.name || `Student ${newId}`,
          student_name: body.name || `Student ${newId}`,
          roll_no: body.roll_no || `${cid === 'TC2' ? 'TC2' : 'R'}-${100 + newId}`,
          roll_number: newId,
          course: body.course || 'Vocational Skills',
          centre_id: cid,
          status: 'Absent',
          registered_date: new Date().toISOString().substring(0, 10)
        };
        list.push(newStudent);
        return jsonResponse({ success: true, message: 'Student registered successfully', student: newStudent });
      }

      // -----------------------------------------------------------------------
      // 4. ATTENDANCE & ATTENDANCE SUBMISSION
      // -----------------------------------------------------------------------
      if (pathname === '/api/attendance') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        const isTC2 = (cid === 'TC2');
        const list = isTC2 ? masterStudentsTC2 : masterStudentsTC1;
        const locked = isTC2 ? tc2AttendanceLocked : tc1AttendanceLocked;
        const presCount = isTC2 ? tc2AttendancePresentCount : tc1AttendancePresentCount;
        const effDate = searchParams.get('date') || (isTC2 ? tc2AttendanceDate : tc1AttendanceDate);
        const effSession = searchParams.get('session_name') || (isTC2 ? tc2AttendanceSession : tc1AttendanceSession);

        const records = list.map((s, idx) => ({
          id: s.id,
          roll_number: s.roll_number,
          student_name: s.student_name || s.name,
          name: s.student_name || s.name,
          status: idx < presCount ? 'Present' : 'Absent',
          present: idx < presCount
        }));

        return jsonResponse({
          success: true,
          centre_id: cid,
          centre_name: isTC2 ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
          date: effDate,
          session_name: effSession,
          is_locked: locked,
          present_count: presCount,
          total_students: list.length,
          registered_students: records,
          records: records
        });
      }

      if (pathname === '/api/attendance/submit') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.currentUser?.centre_id || 'TC1').toUpperCase();
        const isTC2 = (cid === 'TC2');
        if (body.records && Array.isArray(body.records)) {
          const pCount = body.records.filter(r => r.present || r.status === 'Present').length;
          if (isTC2) {
            tc2AttendanceLocked = true;
            tc2AttendancePresentCount = pCount;
          } else {
            tc1AttendanceLocked = true;
            tc1AttendancePresentCount = pCount;
          }
        } else {
          if (isTC2) tc2AttendanceLocked = true;
          else tc1AttendanceLocked = true;
        }
        return jsonResponse({ success: true, message: 'Attendance locked and submitted successfully' });
      }

      // -----------------------------------------------------------------------
      // 5. ATTENDANCE HISTORY & AUDIT
      // -----------------------------------------------------------------------
      if (pathname === '/api/attendance-history' || pathname === '/api/inspect-scope') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        const monthKey = searchParams.get('month') || '2026-10';
        const isTC2 = (cid === 'TC2');
        const historyList = [
          { date: '2026-10-17', session_name: 'Session 1', official_present: isTC2 ? 4 : 3, total_students: isTC2 ? 40 : 35, ai_detected: isTC2 ? 4 : 3, gap: 0, difference: 0, discrepancy: false, status: 'Reconciled', verified: true, remarks: isTC2 ? 'YOLO CCTV detected 4 trainees (STU01-STU04)' : 'Verified live camera headcount matches submitted roster' },
          { date: '2026-10-16', session_name: 'Session 1', official_present: isTC2 ? 4 : 3, total_students: isTC2 ? 40 : 35, ai_detected: isTC2 ? 4 : 3, gap: 0, difference: 0, discrepancy: false, status: 'Reconciled', verified: true, remarks: 'Submitted on time, verified' },
          { date: '2026-10-15', session_name: 'Session 1', official_present: isTC2 ? 4 : 3, total_students: isTC2 ? 40 : 35, ai_detected: isTC2 ? 4 : 3, gap: 0, difference: 0, discrepancy: false, status: 'Reconciled', verified: true, remarks: 'Audit clear' },
          { date: '2026-10-14', session_name: 'Session 1', official_present: isTC2 ? 4 : 3, total_students: isTC2 ? 40 : 35, ai_detected: isTC2 ? 4 : 3, gap: 0, difference: 0, discrepancy: false, status: 'Reconciled', verified: true, remarks: 'Audit clear' },
          { date: '2026-10-13', session_name: 'Session 1', official_present: isTC2 ? 4 : 3, total_students: isTC2 ? 40 : 35, ai_detected: isTC2 ? 4 : 3, gap: 0, difference: 0, discrepancy: false, status: 'Reconciled', verified: true, remarks: 'Audit clear' }
        ];
        return jsonResponse({
          success: true,
          centre_id: cid,
          centre_name: isTC2 ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
          month: monthKey,
          records: historyList
        });
      }

      // -----------------------------------------------------------------------
      // 6. FOOTAGE & SURVEILLANCE
      // -----------------------------------------------------------------------
      if (pathname === '/api/footage') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        const isTC2 = (cid === 'TC2');
        return jsonResponse({
          success: true,
          centre_id: cid,
          centre_name: isTC2 ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
          feed_type: isTC2 ? 'video' : 'webcam',
          video_url: isTC2 ? 'uploads/tc2_uploaded_footage.mp4' : null,
          official_attendance: isTC2 ? tc2AttendancePresentCount : tc1AttendancePresentCount,
          official_attendance_count: isTC2 ? tc2AttendancePresentCount : tc1AttendancePresentCount,
          total_students: isTC2 ? masterStudentsTC2.length : masterStudentsTC1.length,
          camera_status: 'CAMERA ON',
          is_camera_covered: false,
          times_covered_this_month: isTC2 ? 0 : 1,
          times_covered_total: isTC2 ? 1 : 2,
          status_display: 'Resolved'
        });
      }

      if (pathname === '/api/camera/footage_timeline') {
        try {
          const tr = await originalFetch('uploads/tc2_face_timeline.json');
          if (tr.ok) {
            const timeline = await tr.json();
            return jsonResponse({ success: true, timeline: timeline });
          }
        } catch (e) {}
        return jsonResponse({ success: true, timeline: [] });
      }

      if (pathname === '/api/alerts/footage') {
        const cid = searchParams.get('centre_id');
        let filtered = alertsStore;
        if (cid && cid !== 'ALL') {
          filtered = alertsStore.filter(a => a.centre_id.toUpperCase() === cid.toUpperCase());
        }
        const ongoing = filtered.filter(a => a.status === 'Ongoing').length;
        const resolved = filtered.filter(a => a.status === 'Resolved').length;
        const thisMonth = filtered.filter(a => a.date_covered && a.date_covered.startsWith('2026-10')).length;
        return jsonResponse({
          success: true,
          alerts: filtered,
          total_alerts: filtered.length,
          total_count: filtered.length,
          this_month_count: thisMonth,
          ongoing_count: ongoing,
          resolved_count: resolved
        });
      }

      // -----------------------------------------------------------------------
      // 7. EQUIPMENT CATEGORIES, INVENTORY & ISSUES
      // -----------------------------------------------------------------------
      if (pathname === '/api/equipment/categories') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        const cats = categoriesStore[cid] || categoriesStore.TC1;
        const totalAllotted = cats.reduce((sum, c) => sum + (c.allocated_count || 0), 0);
        const totalGood = cats.reduce((sum, c) => sum + (c.reported_good || 0), 0);
        const totalDamaged = cats.reduce((sum, c) => sum + (c.reported_damaged || 0), 0);
        const totalMissing = cats.reduce((sum, c) => sum + (c.reported_missing || 0), 0);
        const totalCam = cats.reduce((sum, c) => sum + (c.camera_detected_count || 0), 0);
        return jsonResponse({
          success: true,
          centre_id: cid,
          centre_name: cid === 'TC2' ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
          categories: cats,
          summary: {
            total_allotted: totalAllotted,
            total_good: totalGood,
            total_damaged: totalDamaged,
            total_missing: totalMissing,
            total_camera_detected: totalCam,
            overall_status: totalDamaged > 0 ? 'Attention Needed' : 'Audited'
          }
        });
      }

      if (pathname === '/api/equipment/categories/allocate') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.govSelectedCentreId || 'TC1').toUpperCase();
        const cats = categoriesStore[cid] || categoriesStore.TC1;
        if (body.allocations) {
          for (const [k, v] of Object.entries(body.allocations)) {
            const found = cats.find(c => c.category_key.toLowerCase() === k.toLowerCase());
            if (found) found.allocated_count = parseInt(v, 10) || 0;
          }
        }
        return jsonResponse({ success: true, message: 'Allocations updated successfully' });
      }

      if (pathname === '/api/equipment/categories/report-condition') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.currentUser?.centre_id || 'TC1').toUpperCase();
        const cats = categoriesStore[cid] || categoriesStore.TC1;
        const found = cats.find(c => c.category_key.toLowerCase() === (body.category_key || '').toLowerCase());
        if (found) {
          if (body.reported_good !== undefined) found.reported_good = parseInt(body.reported_good, 10) || 0;
          if (body.reported_damaged !== undefined) found.reported_damaged = parseInt(body.reported_damaged, 10) || 0;
          if (body.reported_missing !== undefined) found.reported_missing = parseInt(body.reported_missing, 10) || 0;
        }
        return jsonResponse({ success: true, message: 'Condition reported successfully' });
      }

      if (pathname === '/api/equipment/inventory') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        return jsonResponse({
          success: true,
          centre_id: cid,
          items: inventoryStore[cid] || inventoryStore.TC1
        });
      }

      if (pathname === '/api/equipment/inventory/item') {
        const cid = (searchParams.get('centre_id') || state.govSelectedCentreId || 'TC1').toUpperCase();
        const inv = inventoryStore[cid] || inventoryStore.TC1;
        if (method === 'DELETE') {
          const id = searchParams.get('id') || searchParams.get('item_id');
          const idx = inv.findIndex(i => i.id == id || i.item_id == id);
          if (idx !== -1) inv.splice(idx, 1);
          return jsonResponse({ success: true, message: 'Item deleted' });
        }
        const body = await parseBody(options);
        const newId = inv.length + 1;
        const newItem = {
          id: newId,
          item_id: `EQ-${cid}-${String(newId).padStart(3, '0')}`,
          name: body.name || 'New Item',
          category_key: body.category_key || 'tools',
          category_name: body.category_name || 'Hand Tools & Kits',
          serial_number: body.serial_number || `SN-${newId}`,
          status: body.status || 'Good',
          condition: body.condition || 'Good',
          inspection_note: body.inspection_note || 'Logged via portal',
          location: body.location || 'Workshop'
        };
        inv.push(newItem);
        return jsonResponse({ success: true, item: newItem });
      }

      if (pathname === '/api/equipment/inventory/inspect') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.govSelectedCentreId || 'TC1').toUpperCase();
        const inv = inventoryStore[cid] || inventoryStore.TC1;
        const found = inv.find(i => i.id == body.id || i.item_id == body.item_id);
        if (found) {
          if (body.status) found.status = body.status;
          if (body.condition) found.condition = body.condition;
          if (body.inspection_note) found.inspection_note = body.inspection_note;
        }
        return jsonResponse({ success: true, message: 'Inspection saved' });
      }

      if (pathname === '/api/equipment/inventory/fix-item') {
        const body = await parseBody(options);
        const cid = (body.centre_id || state.govSelectedCentreId || 'TC1').toUpperCase();
        const inv = inventoryStore[cid] || inventoryStore.TC1;
        const found = inv.find(i => i.id == body.id || i.item_id == body.item_id);
        if (found) {
          found.status = 'Good';
          found.condition = 'Good';
          found.inspection_note = 'Repaired & verified functional';
        }
        return jsonResponse({ success: true, message: 'Item marked as fixed' });
      }

      if (pathname === '/api/equipment/issues') {
        const cid = (searchParams.get('centre_id') || 'TC1').toUpperCase();
        if (method === 'POST') {
          const body = await parseBody(options);
          const postCid = (body.centre_id || state.currentUser?.centre_id || cid).toUpperCase();
          const list = issuesStore[postCid] || issuesStore.TC1;
          const newIssue = {
            issue_id: `ISS-${postCid}-${String(list.length + 1).padStart(3, '0')}`,
            centre_id: postCid,
            item_name: body.item_name || 'Equipment Unit',
            category: body.category || 'General',
            category_key: body.category_key || 'tools',
            description: body.description || body.comments || 'Defect reported',
            status: 'Open',
            reported_date: new Date().toISOString().substring(0, 10),
            reported_by: state.currentUser?.name || 'Training Centre Official'
          };
          list.push(newIssue);
          return jsonResponse({ success: true, issue: newIssue });
        }
        return jsonResponse({
          success: true,
          centre_id: cid,
          issues: issuesStore[cid] || issuesStore.TC1
        });
      }

      // -----------------------------------------------------------------------
      // 8. USER PROFILE & SETTINGS
      // -----------------------------------------------------------------------
      if (pathname === '/api/profile') {
        return jsonResponse({
          success: true,
          user: currentUserProfile || state.currentUser
        });
      }

      if (pathname === '/api/profile/upload-photo') {
        const body = await parseBody(options);
        const photoUrl = body.photo_base64 || 'demo_assets/profile_gov.jpg';
        if (currentUserProfile) {
          currentUserProfile.photo_url = photoUrl;
          currentUserProfile.photo_pending = 0;
        }
        if (state.currentUser) {
          state.currentUser.photo_url = photoUrl;
          state.currentUser.photo_pending = 0;
        }
        return jsonResponse({ success: true, photo_url: photoUrl });
      }

      if (pathname === '/api/profile/change-password') {
        return jsonResponse({ success: true, message: 'Password updated successfully' });
      }

      // Catch-all for any other /api/* endpoints
      return jsonResponse({ success: true, message: 'Operation successful' });
    } catch (mockErr) {
      console.warn('Mock API handler exception:', mockErr);
      return jsonResponse({ success: true });
    }
  };
})();

// Application State
const state = {
  currentUser: null,           // Authenticated user object
  selectedLoginRole: null,     // Selected on login step 1
  activeView: 'dashboard',     // Initial view after login is 'dashboard'
  govSelectedCentreId: 'TC1',  // Selected centre for Government Official
  attendanceHistoryMonth: '2026-10', // Active month for attendance history audit
  inspectScopeMonth: '2026-10',
  cachedCentres: [],
  cachedStudents: [],
  attendanceRecords: [],
  attendanceLocked: false,
  equipmentIssues: [],
  cameraData: null,
  // Real Laptop Webcam & YOLO State
  webcamStream: null,
  webcamStatus: 'OFF',         // 'ON', 'OFF', 'PERMISSION_REQUIRED'
  webcamInterval: null,
  isDetecting: false,
  cameraErrorMsg: null,
  latestDetections: [],
  latestLiveCount: 0,
  cachedTotalStudents: 35,
  cachedOfficialAttendance: 0,
  faceTracks: [],
  nextFaceTrackId: 1,
  govEquipmentSubTab: 'allocations', // 'allocations' | 'inventory' | 'audit' | 'damaged'
  tcEquipmentSubTab: 'allocated'     // 'allocated' | 'verification' | 'comments'
};

// ---------------------------------------------------------------------------
// THEME MANAGEMENT (Dark / Light Mode)
// ---------------------------------------------------------------------------
function initAppTheme() {
  let savedTheme = 'light';
  try {
    savedTheme = localStorage.getItem('skilling_app_theme') || 'light';
  } catch (e) {}
  applyAppTheme(savedTheme);
}

function applyAppTheme(theme) {
  const isDark = (theme === 'dark');
  if (isDark) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
  updateThemeToggleUI();
}

function updateThemeToggleUI() {
  const isDark = document.documentElement.classList.contains('dark');
  const iconEl = document.getElementById('themeToggleIcon');
  const btnEl = document.getElementById('themeToggleBtn');
  if (iconEl) {
    iconEl.textContent = isDark ? '☀️' : '🌙';
  }
  if (btnEl) {
    btnEl.title = isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode';
    btnEl.setAttribute('aria-label', btnEl.title);
  }
}

window.toggleThemeMode = function() {
  const isCurrentlyDark = document.documentElement.classList.contains('dark');
  const newTheme = isCurrentlyDark ? 'light' : 'dark';
  try {
    localStorage.setItem('skilling_app_theme', newTheme);
  } catch (e) {
    console.warn('localStorage error:', e);
  }
  applyAppTheme(newTheme);
};

// ---------------------------------------------------------------------------
// 1. INITIALIZATION ON PAGE LOAD
// ---------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
  initAppTheme();
  // Ensure the Login Portal is ALWAYS the first screen (Section 1)
  showLoginPortal();
});

function showLoginPortal() {
  document.getElementById('loginPortalContainer').classList.remove('hidden');
  document.getElementById('authenticatedApp').classList.add('hidden');
  goToLoginStep1();
}

function showAuthenticatedApp() {
  document.getElementById('loginPortalContainer').classList.add('hidden');
  document.getElementById('authenticatedApp').classList.remove('hidden');

  updateHeaderProfile();
  renderSidebar();

  // Dashboard is the first page shown after login
  navigateTo('dashboard');
}

// ---------------------------------------------------------------------------
// 2. LOGIN PORTAL LOGIC (SECTIONS 1 & 2)
// ---------------------------------------------------------------------------
function goToLoginStep1() {
  showLoginForm();
}

function showLoginForm() {
  const step2 = document.getElementById('loginStep2');
  if (step2) step2.classList.remove('hidden');
  const err = document.getElementById('loginErrorMsg');
  if (err) err.classList.add('hidden');
  const emailWrap = document.getElementById('loginEmailWrapper');
  if (emailWrap) emailWrap.classList.add('hidden');
}

function goToLoginStep2() {
  showLoginForm();
}

function selectLoginRole(role) {
  state.selectedLoginRole = role;
}

function fillCredentials(name, password) {
  const nameEl = document.getElementById('loginName');
  if (nameEl) nameEl.value = name;
  const pwEl = document.getElementById('loginPassword');
  if (pwEl) pwEl.value = password;
}

window.onLoginRoleSelectChange = function(val) {
  state.selectedLoginRole = val.includes('Government') ? 'Government Official' : 'Training Centre Official';
  const nameEl = document.getElementById('loginName');
  const pwEl = document.getElementById('loginPassword');
  if (val === 'Training Centre Official') {
    if (nameEl) nameEl.value = 'Paul Fernandes';
    if (pwEl) pwEl.value = 'tc123';
  } else if (val === 'Training Centre Official TC2') {
    if (nameEl) nameEl.value = 'Apex TC2 Official';
    if (pwEl) pwEl.value = 'tc123';
  } else if (val === 'Government Official') {
    if (nameEl) nameEl.value = 'Greg Furtado';
    if (pwEl) pwEl.value = 'gov123';
  }
};

async function handleFormLogin(e) {
  e.preventDefault();
  const name = (document.getElementById('loginName')?.value || '').trim();
  const password = (document.getElementById('loginPassword')?.value || '').trim();
  const emailInput = (document.getElementById('loginEmail')?.value || '').trim().toLowerCase();
  const roleSelect = document.getElementById('loginRoleSelect')?.value || state.selectedLoginRole || '';
  const errorMsg = document.getElementById('loginErrorMsg');
  const emailWrap = document.getElementById('loginEmailWrapper');
  if (errorMsg) errorMsg.classList.add('hidden');

  if (!name || !password) {
    if (errorMsg) {
      errorMsg.textContent = 'Please enter both Registered Name and Password.';
      errorMsg.classList.remove('hidden');
    }
    return;
  }

  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name,
        username: name,
        registered_name: name,
        role: roleSelect,
        password: password,
        email: emailInput
      })
    });
    const data = await res.json();

    if (data.success) {
      state.currentUser = data.user;
      state.selectedLoginRole = data.user.role;
      state.govSelectedCentreId = data.user.centre_id === 'TC2' ? 'TC2' : 'TC1';
      // Pre-warm client face detector immediately upon login
      tfAI.init().catch(() => {});
      showToast(`Login successful as ${data.user.name}`, 'success');
      showAuthenticatedApp();
    } else {
      if (data.requires_email) {
        if (emailWrap) emailWrap.classList.remove('hidden');
        document.getElementById('loginEmail')?.focus();
      }
      if (errorMsg) {
        errorMsg.textContent = data.message || 'Invalid Registered Name or Password.';
        errorMsg.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errorMsg) {
      errorMsg.textContent = 'Server connection error. Please try again.';
      errorMsg.classList.remove('hidden');
    }
  }
}

function handleLogout() {
  if (typeof footageAlertsState !== 'undefined' && footageAlertsState.pollTimer) {
    clearInterval(footageAlertsState.pollTimer);
    footageAlertsState.pollTimer = null;
  }
  stopLaptopCamera();
  state.currentUser = null;
  state.selectedLoginRole = null;
  state.activeView = 'dashboard';
  showLoginPortal();
  switchPortalMode('login');
  showToast('Logged out successfully.', 'info');
}

// ---------------------------------------------------------------------------
// 2A. PORTAL MODE TOGGLE: LOGIN vs SIGN UP
// ---------------------------------------------------------------------------
function switchPortalMode(mode) {
  const tabLogin = document.getElementById('tabBtnLogin');
  const tabSignup = document.getElementById('tabBtnSignup');
  const loginModeContainer = document.getElementById('loginModeContainer');
  const signupModeContainer = document.getElementById('signupModeContainer');

  setAuthCardExpanded(false);

  if (mode === 'signup') {
    tabSignup.className = 'flex-1 py-3 border-b-2 border-blue-600 text-blue-700 bg-white transition flex items-center justify-center space-x-1.5 font-bold';
    tabLogin.className = 'flex-1 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center justify-center space-x-1.5 font-bold';
    loginModeContainer.classList.add('hidden');
    signupModeContainer.classList.remove('hidden');
    goToSignupStep1();
  } else {
    tabLogin.className = 'flex-1 py-3 border-b-2 border-blue-600 text-blue-700 bg-white transition flex items-center justify-center space-x-1.5 font-bold';
    tabSignup.className = 'flex-1 py-3 border-b-2 border-transparent text-slate-500 hover:text-slate-800 transition flex items-center justify-center space-x-1.5 font-bold';
    signupModeContainer.classList.add('hidden');
    loginModeContainer.classList.remove('hidden');
    goToLoginStep1();
  }
}

// Helper to expand portal card for spacious Profile Registration form (Requirement 2)
function setAuthCardExpanded(expanded) {
  const wrapper = document.getElementById('authCardWrapper');
  if (!wrapper) return;
  if (expanded) {
    wrapper.classList.remove('max-w-md');
    wrapper.classList.add('max-w-4xl');
  } else {
    wrapper.classList.remove('max-w-4xl', 'max-w-3xl');
    wrapper.classList.add('max-w-md');
  }
}

// ---------------------------------------------------------------------------
// 2B. SIGN UP WORKFLOW (VERIFICATION & OTP)
// ---------------------------------------------------------------------------
let signupState = {
  email: '',
  records: [],
  selectedRecord: null,
  signupToken: '',
  photoBase64: null,
  registeredUser: null
};

let signupTimerInterval = null;

function goToSignupStep1() {
  if (signupTimerInterval) clearInterval(signupTimerInterval);
  setAuthCardExpanded(false);
  document.getElementById('signupStep1').classList.remove('hidden');
  document.getElementById('signupStep2').classList.add('hidden');
  document.getElementById('signupStep3').classList.add('hidden');
  document.getElementById('signupStepSuccess').classList.add('hidden');
  const err = document.getElementById('signupEmailError');
  if (err) err.classList.add('hidden');
}

async function handleSignupResendOtp() {
  const emailVal = signupState.email;
  const otpErr = document.getElementById('signupOtpError');
  const resendBtn = document.getElementById('btnSignupResendOtp');
  if (!emailVal) {
    goToSignupStep1();
    return;
  }
  if (otpErr) otpErr.classList.add('hidden');
  if (resendBtn) {
    resendBtn.disabled = true;
    resendBtn.textContent = 'Sending...';
  }

  try {
    const res = await fetch('/api/auth/signup/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('signupOtpInput').value = '';
      startSignupTimer();
      showToast('New 4-digit OTP dispatched to your email address.', 'success');
      if (resendBtn) {
        resendBtn.textContent = 'Resend OTP';
      }
    } else {
      if (otpErr) {
        otpErr.textContent = data.message || 'Failed to resend OTP.';
        otpErr.classList.remove('hidden');
      }
      showToast(data.message || 'Failed to resend OTP.', 'error');
      if (resendBtn) {
        resendBtn.disabled = false;
        resendBtn.textContent = 'Resend OTP';
      }
    }
  } catch (errExp) {
    if (otpErr) {
      otpErr.textContent = 'Failed to connect to verification service.';
      otpErr.classList.remove('hidden');
    }
    if (resendBtn) {
      resendBtn.disabled = false;
      resendBtn.textContent = 'Resend OTP';
    }
  }
}

function startSignupTimer() {
  if (signupTimerInterval) clearInterval(signupTimerInterval);
  const timerDisplay = document.getElementById('signupTimerDisplay');
  const resendBtn = document.getElementById('btnSignupResendOtp');
  if (timerDisplay) {
    timerDisplay.textContent = '';
  }
  if (resendBtn) {
    resendBtn.disabled = false;
    resendBtn.className = 'text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline';
  }
}

async function handleSignupRequestOtp() {
  const emailInput = document.getElementById('signupEmailInput');
  // Strip leading/trailing whitespace, non-breaking spaces, and internal text-extraction spaces
  const rawInput = emailInput ? emailInput.value : '';
  const emailVal = rawInput.replace(/[\s\u00a0\u200b\u200c\u200d]+/g, '').trim().toLowerCase();
  const err = document.getElementById('signupEmailError');
  const btn = document.getElementById('btnSignupRequestOtp');

  if (!emailVal) {
    if (err) {
      err.textContent = 'Please enter your approved email address.';
      err.classList.remove('hidden');
    }
    return;
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(emailVal)) {
    if (err) {
      err.textContent = 'Please enter a valid email address.';
      err.classList.remove('hidden');
    }
    return;
  }

  if (err) err.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'VERIFYING & DISPATCHING OTP...';
  }

  try {
    const res = await fetch('/api/auth/signup/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: emailVal })
    });
    const data = await res.json();
    if (data.success) {
      signupState.email = emailVal;
      signupState.signupToken = data.signup_token || 'BYPASS_TOKEN';
      signupState.records = (data.records && data.records.length > 0) ? data.records : [
        { role: 'Training Centre Official', centre_id: 'TC1', centre_name: 'SkillCraft Academy (TC1)', designation: 'Centre Manager', department: 'Vocational Training Operations' },
        { role: 'Training Centre Official', centre_id: 'TC2', centre_name: 'Apex Technical Hub (TC2)', designation: 'Centre Manager', department: 'Vocational Training Operations' },
        { role: 'Government Official', centre_id: null, centre_name: 'All Centres (National Scope)', designation: 'National Director', department: 'Ministry of Skill Development & Entrepreneurship' }
      ];

      // Bypass OTP Step 2: Transition directly to Step 3 Profile Registration
      setAuthCardExpanded(true);
      document.getElementById('signupStep1').classList.add('hidden');
      document.getElementById('signupStep2').classList.add('hidden');
      document.getElementById('signupStep3').classList.remove('hidden');

      // Initialize DOB max date (No future date allowed)
      const dobInput = document.getElementById('signupDob');
      if (dobInput) {
        dobInput.max = new Date().toISOString().split('T')[0];
      }

      removeSignupPhoto();

      // Populate Role selector from authorised records (Includes TC1, TC2 & Government)
      const roleSelect = document.getElementById('signupRoleSelect');
      if (roleSelect) {
        roleSelect.innerHTML = signupState.records.map((r, i) =>
          `<option value="${i}">${r.role}${r.centre_name ? ' — ' + r.centre_name : ''}</option>`
        ).join('');
        signupState.selectedRecord = signupState.records[0];
      }

      updateSignupRecordDisplay();

      // Reset password inputs for new registration
      const p1Input = document.getElementById('signupNewPassword');
      if (p1Input) p1Input.value = '';
      const p2Input = document.getElementById('signupConfirmPassword');
      if (p2Input) p2Input.value = '';
      checkSignupPasswordMatch();

      showToast('OTP bypassed. Proceeding to official profile details.', 'success');
    } else {
      if (err) {
        err.textContent = data.message || 'This email ID cannot be signed in.';
        err.classList.remove('hidden');
      }
    }
  } catch (errExp) {
    if (err) {
      err.textContent = 'Failed to connect to verification service.';
      err.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'CONTINUE TO REGISTRATION (OTP BYPASSED)';
    }
  }
}

async function handleSignupVerifyOtp() {
  let otpVal = document.getElementById('signupOtpInput').value.trim();
  const otpErr = document.getElementById('signupOtpError');
  const btn = document.getElementById('btnSignupVerifyOtp');

  if (!otpVal) {
    otpVal = '1234';
    document.getElementById('signupOtpInput').value = '1234';
  }
  if (otpErr) otpErr.classList.add('hidden');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'VERIFYING...';
  }

  try {
    const res = await fetch('/api/auth/signup/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: signupState.email, otp: otpVal })
    });
    const data = await res.json();
    if (data.success) {
      if (signupTimerInterval) clearInterval(signupTimerInterval);
      signupState.signupToken = data.signup_token;
      signupState.records = data.records || [];

      // Expand card to spacious professional width (Requirement 2)
      setAuthCardExpanded(true);

      document.getElementById('signupStep2').classList.add('hidden');
      document.getElementById('signupStep3').classList.remove('hidden');

      // Initialize DOB max date (No future date allowed - Requirement 3)
      const dobInput = document.getElementById('signupDob');
      if (dobInput) {
        dobInput.max = new Date().toISOString().split('T')[0];
      }

      // Initialize photo preview with neutral placeholder and "Photo Pending"
      removeSignupPhoto();

      // Populate Role selector from authorised records
      const roleSelect = document.getElementById('signupRoleSelect');
      if (roleSelect) {
        if (signupState.records.length > 0) {
          roleSelect.innerHTML = signupState.records.map((r, i) =>
            `<option value="${i}">${r.role}${r.centre_name ? ' — ' + r.centre_name : ''}</option>`
          ).join('');
          signupState.selectedRecord = signupState.records[0];
        } else {
          roleSelect.innerHTML = `<option value="0">Government Official</option>`;
          signupState.selectedRecord = {
            role: 'Government Official',
            centre_id: null,
            centre_name: null,
            name: '',
            year_joined: '2024',
            qualification: ''
          };
        }
      }

      updateSignupRecordDisplay();

      // Reset password inputs for new registration
      const p1Input = document.getElementById('signupNewPassword');
      if (p1Input) p1Input.value = '';
      const p2Input = document.getElementById('signupConfirmPassword');
      if (p2Input) p2Input.value = '';
      checkSignupPasswordMatch();

      showToast('Email verified successfully.', 'success');
    } else {
      if (otpErr) {
        otpErr.textContent = data.message || 'Invalid OTP code. Please check and try again.';
        otpErr.classList.remove('hidden');
      }
    }
  } catch (e) {
    if (otpErr) {
      otpErr.textContent = 'Verification server error.';
      otpErr.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'VERIFY OTP';
    }
  }
}

function onSignupScopeChanged() {
  const roleSelect = document.getElementById('signupRoleSelect');
  if (!roleSelect) return;
  const idx = parseInt(roleSelect.value, 10);
  if (signupState.records[idx]) {
    signupState.selectedRecord = signupState.records[idx];
    updateSignupRecordDisplay();
  }
}

function updateSignupRecordDisplay() {
  const rec = signupState.selectedRecord || {};
  const emailDisplay = document.getElementById('signupEmailDisplay');
  if (emailDisplay) emailDisplay.value = signupState.email;

  const nameInput = document.getElementById('signupFullName');
  if (nameInput && rec.name) {
    nameInput.value = rec.name;
  }

  const yrInput = document.getElementById('signupYearJoined');
  if (yrInput && rec.year_joined) {
    yrInput.value = rec.year_joined;
  }

  const qualInput = document.getElementById('signupQualification');
  if (qualInput && rec.qualification && !qualInput.value) {
    qualInput.value = rec.qualification;
  }

  // Conditional field: Training Centre (Requirement 3: display only when role is Training Centre Official)
  const centreContainer = document.getElementById('signupCentreContainer');
  const centreInput = document.getElementById('signupCentreDisplayInput');
  if (rec.role === 'Training Centre Official') {
    if (centreContainer) centreContainer.classList.remove('hidden');
    if (centreInput) centreInput.value = rec.centre_name || (rec.centre_id === 'TC2' ? 'Training Centre 2' : 'Training Centre 1');
  } else {
    if (centreContainer) centreContainer.classList.add('hidden');
    if (centreInput) centreInput.value = '';
  }
}

function previewSignupPhoto(input) {
  const img = document.getElementById('signupPhotoPreviewImg');
  const pendingBadge = document.getElementById('signupPhotoPendingBadge');
  const removeBtn = document.getElementById('btnRemoveSignupPhoto');
  const label = document.getElementById('signupPhotoUploadLabel');

  if (input.files && input.files[0]) {
    const file = input.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      signupState.photoBase64 = e.target.result;
      if (img) img.src = e.target.result;
      if (pendingBadge) pendingBadge.classList.add('hidden'); // Remove "Photo Pending" text
      if (removeBtn) removeBtn.classList.remove('hidden');
      if (label) label.textContent = 'Change Photo';
    };
    reader.readAsDataURL(file);
  } else {
    removeSignupPhoto();
  }
}

function removeSignupPhoto() {
  const DEFAULT_AVATAR_PATH = 'demo_assets/default_avatar.svg';
  signupState.photoBase64 = null;
  const fileInput = document.getElementById('signupPhotoFile');
  if (fileInput) fileInput.value = '';
  const img = document.getElementById('signupPhotoPreviewImg');
  if (img) {
    img.onerror = null;
    img.src = DEFAULT_AVATAR_PATH;
  }
  const pendingBadge = document.getElementById('signupPhotoPendingBadge');
  if (pendingBadge) pendingBadge.classList.remove('hidden'); // Display exact text "Photo Pending"
  const removeBtn = document.getElementById('btnRemoveSignupPhoto');
  if (removeBtn) removeBtn.classList.add('hidden');
  const label = document.getElementById('signupPhotoUploadLabel');
  if (label) label.textContent = 'Choose Photo';
}

const PASSWORD_EYE_OPEN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-slate-400 hover:text-slate-600 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;
const PASSWORD_EYE_OFF_SVG = `<svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-blue-600 hover:text-blue-700 transition" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`;

function togglePasswordVisibility(inputId, btn) {
  const input = document.getElementById(inputId);
  if (!input) return;
  if (input.type === 'password') {
    input.type = 'text';
    btn.innerHTML = PASSWORD_EYE_OFF_SVG;
    btn.title = 'Hide password';
    btn.setAttribute('aria-label', 'Hide password');
  } else {
    input.type = 'password';
    btn.innerHTML = PASSWORD_EYE_OPEN_SVG;
    btn.title = 'Show password';
    btn.setAttribute('aria-label', 'Show password');
  }
}

function checkSignupPasswordMatch() {
  const p1 = (document.getElementById('signupNewPassword')?.value || '').trim();
  const p2 = (document.getElementById('signupConfirmPassword')?.value || '').trim();
  const statusEl = document.getElementById('signupPasswordMatchStatus');
  const btn = document.getElementById('btnSignupSubmit');

  if (!p1 && !p2) {
    if (statusEl) {
      statusEl.textContent = 'Both password fields are mandatory and must match.';
      statusEl.className = 'text-xs font-semibold text-slate-400';
    }
    if (btn) btn.disabled = true;
    return false;
  }

  if (p1.length < 6) {
    if (statusEl) {
      statusEl.textContent = 'Password must be at least 6 characters long.';
      statusEl.className = 'text-xs font-semibold text-amber-600';
    }
    if (btn) btn.disabled = true;
    return false;
  }

  if (p1 === p2) {
    if (statusEl) {
      statusEl.textContent = '✓ Passwords match.';
      statusEl.className = 'text-xs font-semibold text-emerald-600';
    }
    if (btn) btn.disabled = false;
    return true;
  } else {
    if (statusEl) {
      statusEl.textContent = '✗ Passwords do not match.';
      statusEl.className = 'text-xs font-semibold text-red-600';
    }
    if (btn) btn.disabled = true;
    return false;
  }
}

async function handleSignupSubmit(e) {
  e.preventDefault();
  const formErr = document.getElementById('signupFormError');
  const btn = document.getElementById('btnSignupSubmit');
  if (formErr) formErr.classList.add('hidden');

  const rec = signupState.selectedRecord || {};
  const fullName = document.getElementById('signupFullName').value.trim();
  const dob = document.getElementById('signupDob').value;
  const yearJoined = document.getElementById('signupYearJoined').value;
  const qualification = document.getElementById('signupQualification').value.trim();
  const password = (document.getElementById('signupNewPassword')?.value || '').trim();
  const confirmPassword = (document.getElementById('signupConfirmPassword')?.value || '').trim();

  if (!fullName) {
    if (formErr) {
      formErr.textContent = 'Please enter your full name.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  if (!dob) {
    if (formErr) {
      formErr.textContent = 'Please select your Date of Birth.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  const todayStr = new Date().toISOString().split('T')[0];
  if (dob > todayStr) {
    if (formErr) {
      formErr.textContent = 'Date of Birth cannot be a future date.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  const yrVal = parseInt(yearJoined, 10);
  const currentYear = new Date().getFullYear();
  if (!yrVal || yrVal < 1980 || yrVal > currentYear) {
    if (formErr) {
      formErr.textContent = `Joining Year must be a reasonable year between 1980 and ${currentYear}.`;
      formErr.classList.remove('hidden');
    }
    return;
  }

  if (!qualification) {
    if (formErr) {
      formErr.textContent = 'Please enter your qualification.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  // Validate passwords
  if (!password || !confirmPassword) {
    if (formErr) {
      formErr.textContent = 'Both password fields are mandatory.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  if (password.length < 6) {
    if (formErr) {
      formErr.textContent = 'Password must be at least 6 characters long.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  if (password !== confirmPassword) {
    if (formErr) {
      formErr.textContent = 'Passwords do not match.';
      formErr.classList.remove('hidden');
    }
    return;
  }

  if (btn) {
    btn.disabled = true;
    btn.textContent = 'REGISTERING ACCOUNT...';
  }

  try {
    const payload = {
      signup_token: signupState.signupToken,
      email: signupState.email,
      name: fullName,
      dob: dob,
      year_joined: String(yrVal),
      qualification: qualification,
      role: rec.role || 'Government Official',
      centre_id: rec.centre_id || null,
      centre_name: rec.centre_name || null,
      photo_url: signupState.photoBase64 || null,
      password: password,
      confirm_password: confirmPassword
    };

    const res = await fetch('/api/auth/signup/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      signupState.registeredUser = data.user;

      // Reset card expansion back to standard size for confirmation
      setAuthCardExpanded(false);

      document.getElementById('signupStep3').classList.add('hidden');
      document.getElementById('signupStepSuccess').classList.remove('hidden');

      document.getElementById('successOfficialName').textContent = data.user.name;
      document.getElementById('successOfficialRole').textContent = data.user.role;
      document.getElementById('successLoginId').textContent = data.user.user_id;

      showToast(`Account created for ${data.user.name}!`, 'success');
    } else {
      if (formErr) {
        formErr.textContent = data.message || 'Registration failed.';
        formErr.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (formErr) {
      formErr.textContent = 'Server communication error during registration.';
      formErr.classList.remove('hidden');
    }
  } finally {
    if (btn) {
      btn.textContent = 'CONFIRM PASSWORD';
      checkSignupPasswordMatch();
    }
  }
}

function handleSuccessLoginToDashboard() {
  if (!signupState.registeredUser) {
    switchPortalMode('login');
    return;
  }
  state.currentUser = signupState.registeredUser;
  state.selectedLoginRole = state.currentUser.role;
  state.govSelectedCentreId = state.currentUser.centre_id === 'TC2' ? 'TC2' : 'TC1';
  showToast(`Welcome, ${state.currentUser.name}! Opening Dashboard...`, 'success');
  showAuthenticatedApp();
}

// ---------------------------------------------------------------------------
// 2C. FORGOT PASSWORD & OTP FLOW (4-DIGIT 30s OTP)
// ---------------------------------------------------------------------------
let fpState = {
  identifier: '',
  userId: '',
  resetToken: ''
};
let fpTimerInterval = null;
let fpTimerSeconds = 30;

function openForgotPasswordFlow() {
  document.getElementById('loginStep2').classList.add('hidden');
  document.getElementById('forgotPasswordFlow').classList.remove('hidden');
  resetFpSteps();
  document.getElementById('fpStepIdentifier').classList.remove('hidden');
  document.getElementById('fpIdentifier').value = '';
}

function closeForgotPasswordFlow() {
  if (fpTimerInterval) clearInterval(fpTimerInterval);
  document.getElementById('forgotPasswordFlow').classList.add('hidden');
  document.getElementById('loginStep2').classList.remove('hidden');
  resetFpSteps();
}

function resetFpSteps() {
  if (fpTimerInterval) clearInterval(fpTimerInterval);
  document.getElementById('fpStepIdentifier').classList.add('hidden');
  document.getElementById('fpStepOtp').classList.add('hidden');
  document.getElementById('fpStepNewPassword').classList.add('hidden');
  document.getElementById('fpStepSuccess').classList.add('hidden');

  hideMsg('fpMsgIdentifier');
  hideMsg('fpMsgOtp');
  hideMsg('fpMsgReset');
}

function startFpTimer() {
  if (fpTimerInterval) clearInterval(fpTimerInterval);
  const timerDisplay = document.getElementById('fpTimerDisplay');
  const resendBtn = document.getElementById('btnFpResendOtp');
  if (timerDisplay) {
    timerDisplay.textContent = '';
  }
  if (resendBtn) {
    resendBtn.disabled = false;
    resendBtn.className = 'text-xs text-blue-600 hover:text-blue-800 font-semibold cursor-pointer underline';
  }
}

function hideMsg(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('hidden');
}

function showMsg(id, text, isError = true) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `p-2.5 rounded-lg text-xs ${isError ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-emerald-50 border border-emerald-200 text-emerald-700'}`;
  el.classList.remove('hidden');
}

async function submitForgotPasswordIdentifier() {
  const ident = document.getElementById('fpIdentifier').value.trim();
  if (!ident) {
    showMsg('fpMsgIdentifier', 'Please enter your registered Email ID.');
    return;
  }
  hideMsg('fpMsgIdentifier');
  const btn = document.getElementById('btnSendOtp');
  btn.disabled = true;
  btn.textContent = 'Sending OTP...';

  try {
    const res = await fetch('/api/auth/forgot-password/request-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: ident })
    });
    const data = await res.json();
    if (data.success) {
      fpState.identifier = ident;
      fpState.userId = data.user_id;
      document.getElementById('fpMaskedEmailText').textContent = `4-digit OTP dispatched to: ${data.masked_email}.`;
      document.getElementById('fpStepIdentifier').classList.add('hidden');
      document.getElementById('fpStepOtp').classList.remove('hidden');
      document.getElementById('fpOtpInput').value = '';
      startFpTimer();
      showToast('4-digit OTP sent successfully.', 'success');
    } else {
      showMsg('fpMsgIdentifier', data.message || 'Unable to request OTP.');
    }
  } catch (err) {
    showMsg('fpMsgIdentifier', 'Failed to communicate with the verification server.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'SEND OTP';
  }
}

async function submitVerifyOtp() {
  const otpVal = document.getElementById('fpOtpInput').value.trim();
  if (!otpVal || otpVal.length !== 4) {
    showMsg('fpMsgOtp', 'Please enter the valid 4-digit OTP.');
    return;
  }
  hideMsg('fpMsgOtp');
  const btn = document.getElementById('btnVerifyOtp');
  btn.disabled = true;
  btn.textContent = 'Verifying...';

  try {
    const res = await fetch('/api/auth/forgot-password/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: fpState.userId, otp: otpVal })
    });
    const data = await res.json();
    if (data.success) {
      if (fpTimerInterval) clearInterval(fpTimerInterval);
      fpState.resetToken = data.reset_token;
      document.getElementById('fpStepOtp').classList.add('hidden');
      document.getElementById('fpStepNewPassword').classList.remove('hidden');
      document.getElementById('fpNewPass').value = '';
      document.getElementById('fpConfirmPass').value = '';
      checkPasswordMatch();
      showToast('OTP verified. Set your new password.', 'success');
    } else {
      showMsg('fpMsgOtp', data.message || 'Invalid or expired OTP.');
    }
  } catch (err) {
    showMsg('fpMsgOtp', 'Verification failed due to a network or server error.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'VERIFY OTP';
  }
}

function checkPasswordMatch() {
  const p1 = document.getElementById('fpNewPass').value;
  const p2 = document.getElementById('fpConfirmPass').value;
  const statusEl = document.getElementById('fpPasswordMatchStatus');
  const btn = document.getElementById('btnConfirmPassword');

  if (!p1 && !p2) {
    statusEl.textContent = 'Passwords must match to proceed.';
    statusEl.className = 'text-xs font-semibold text-slate-400';
    btn.disabled = true;
    return;
  }

  if (p1.length < 6) {
    statusEl.textContent = 'Password must be at least 6 characters.';
    statusEl.className = 'text-xs font-semibold text-amber-600';
    btn.disabled = true;
    return;
  }

  if (p1 === p2) {
    statusEl.textContent = '✓ Passwords match.';
    statusEl.className = 'text-xs font-semibold text-emerald-600';
    btn.disabled = false;
  } else {
    statusEl.textContent = '✗ Passwords do not match.';
    statusEl.className = 'text-xs font-semibold text-red-600';
    btn.disabled = true;
  }
}

async function submitConfirmNewPassword() {
  const p1 = document.getElementById('fpNewPass').value;
  const p2 = document.getElementById('fpConfirmPass').value;
  if (p1 !== p2) {
    showMsg('fpMsgReset', 'Passwords do not match.');
    return;
  }
  if (p1.length < 6) {
    showMsg('fpMsgReset', 'Password must be at least 6 characters long.');
    return;
  }
  hideMsg('fpMsgReset');
  const btn = document.getElementById('btnConfirmPassword');
  btn.disabled = true;
  btn.textContent = 'Updating Password...';

  try {
    const res = await fetch('/api/auth/forgot-password/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: fpState.userId,
        reset_token: fpState.resetToken,
        new_password: p1,
        confirm_password: p2
      })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('fpStepNewPassword').classList.add('hidden');
      document.getElementById('fpStepSuccess').classList.remove('hidden');
      showToast('Password updated successfully.', 'success');
    } else {
      showMsg('fpMsgReset', data.message || 'Failed to update password.');
    }
  } catch (err) {
    showMsg('fpMsgReset', 'Password reset failed due to server error.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'CONFIRM PASSWORD';
  }
}

// ---------------------------------------------------------------------------
// 3. HEADER & SIDEBAR LOGIC (SECTIONS 4, 5, 10, 19)
// ---------------------------------------------------------------------------
function updateHeaderProfile() {
  const user = state.currentUser;
  if (!user) return;

  document.getElementById('headerUserName').textContent = user.name;
  const headerUserRole = document.getElementById('headerUserRole');
  if (headerUserRole) {
    headerUserRole.textContent = user.role || 'Government Official';
    headerUserRole.className = `text-[10px] font-medium ${user.role === 'Training Centre Official' ? 'text-amber-400' : 'text-blue-400'}`;
  }
  const DEFAULT_AVATAR_PATH = 'demo_assets/default_avatar.svg';
  const headerPhoto = document.getElementById('headerUserPhoto');
  if (headerPhoto) {
    headerPhoto.onerror = function() { this.onerror = null; this.src = DEFAULT_AVATAR_PATH; };
    headerPhoto.src = (user.photo_url && user.photo_pending !== 1 && String(user.photo_url).trim()) ? user.photo_url : DEFAULT_AVATAR_PATH;
  }

  const govSelectorWrapper = document.getElementById('govCentreSelectorWrapper');
  const govSelector = document.getElementById('govActiveCentreSelect') || document.getElementById('govCentreSelector');
  if (govSelector) {
    govSelector.value = state.govSelectedCentreId;
  }
  updateThemeToggleUI();

  if (user.role === 'Government Official') {
    // Hide Centre Switcher from Government Dashboard, Profile, Attendance History, AND Footage Alerts
    if (state.activeView === 'dashboard' || state.activeView === 'profile' || state.activeView === 'attendance_history' || state.activeView === 'inspect_scope' || state.activeView === 'footage_alerts') {
      govSelectorWrapper.classList.add('hidden');
    } else {
      govSelectorWrapper.classList.remove('hidden');
    }
    document.getElementById('headerSubTitle').textContent = 'National Oversight Directorate';
    document.getElementById('sidebarScopeTitle').textContent = state.govSelectedCentreId === 'TC1' ? 'Training Centre 1' : 'Training Centre 2';
    document.getElementById('sidebarScopeSub').textContent = 'All Centres Monitored';
  } else {
    govSelectorWrapper.classList.add('hidden');
    document.getElementById('headerSubTitle').textContent = user.centre_name;
    document.getElementById('sidebarScopeTitle').textContent = user.centre_name;
    document.getElementById('sidebarScopeSub').textContent = `Official: ${user.user_id}`;
  }

  // Update Role Switcher Button in Header
  const switcherIcon = document.getElementById('roleSwitcherIcon');
  const switcherLabel = document.getElementById('roleSwitcherLabel');
  const switcherBtn = document.getElementById('btnHeaderRoleSwitcher');
  if (switcherBtn) {
    if (user.role === 'Government Official') {
      if (switcherIcon) switcherIcon.textContent = '🏢';
      if (switcherLabel) switcherLabel.textContent = 'Switch to TC Dashboard';
      switcherBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-slate-800 text-amber-300 border-amber-500/40 hover:bg-slate-700 shadow-xs';
    } else {
      if (switcherIcon) switcherIcon.textContent = '🏛️';
      if (switcherLabel) switcherLabel.textContent = 'Switch to Gov Dashboard';
      switcherBtn.className = 'px-2.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 border cursor-pointer bg-slate-800 text-blue-300 border-blue-500/40 hover:bg-slate-700 shadow-xs';
    }
  }
}

window.toggleRoleScope = function() {
  if (!state.currentUser) return;
  if (state.currentUser.role === 'Government Official') {
    const targetCid = state.govSelectedCentreId === 'TC2' ? 'TC2' : 'TC1';
    state.currentUser = {
      user_id: targetCid === 'TC2' ? 'PAOTRN25' : 'PAOTRN24',
      name: targetCid === 'TC2' ? 'Apex TC2 Manager' : 'Paul Fernandes',
      role: 'Training Centre Official',
      email: targetCid === 'TC2' ? 'manager@apextech.org' : 'paul.fernandes@tc1.org',
      phone_number: '+91 9822114433',
      designation: 'Centre Manager',
      department: 'Vocational Training Operations',
      centre_id: targetCid,
      centre_name: targetCid === 'TC2' ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
      training_centre_allotted: targetCid === 'TC2' ? 'Apex Technical Hub (TC2)' : 'SkillCraft Academy (TC1)',
      access_centres: targetCid,
      photo_url: targetCid === 'TC2' ? 'demo_assets/profile_tc2.jpg' : 'demo_assets/profile_tc1.jpg',
      photo_pending: 0,
      account_status: 'Active'
    };
    state.activeView = 'dashboard';
    showToast(`Switched to ${state.currentUser.centre_name} Dashboard`, 'info');
  } else {
    state.currentUser = {
      user_id: 'GRFGOV24',
      name: 'Greg Furtado',
      role: 'Government Official',
      email: 'greg.furtado@gov.in',
      phone_number: '+91 9876543210',
      designation: 'National Director',
      department: 'Ministry of Skill Development & Entrepreneurship',
      training_centre_allotted: 'All Centres (National Scope)',
      access_centres: 'TC1, TC2',
      photo_url: 'demo_assets/profile_gov.jpg',
      photo_pending: 0,
      account_status: 'Active'
    };
    state.activeView = 'dashboard';
    showToast('Switched to Government National Monitoring Dashboard', 'info');
  }
  updateHeaderProfile();
  renderSidebar();
  navigateTo('dashboard');
};

window.quickLogin = function(roleType) {
  const nameEl = document.getElementById('loginName');
  const pwEl = document.getElementById('loginPassword');
  const roleEl = document.getElementById('loginRoleSelect');
  if (roleType === 'TC1') {
    if (nameEl) nameEl.value = 'Paul Fernandes';
    if (pwEl) pwEl.value = 'tc123';
    if (roleEl) roleEl.value = 'Training Centre Official';
    state.selectedLoginRole = 'Training Centre Official';
  } else if (roleType === 'TC2') {
    if (nameEl) nameEl.value = 'Apex TC2 Official';
    if (pwEl) pwEl.value = 'tc123';
    if (roleEl) roleEl.value = 'Training Centre Official TC2';
    state.selectedLoginRole = 'Training Centre Official';
  } else {
    if (nameEl) nameEl.value = 'Greg Furtado';
    if (pwEl) pwEl.value = 'gov123';
    if (roleEl) roleEl.value = 'Government Official';
    state.selectedLoginRole = 'Government Official';
  }
  const form = document.getElementById('credentialsForm');
  if (form) {
    handleFormLogin(new Event('submit'));
  }
};

function handleGovCentreChange(centreId) {
  stopLaptopCamera();
  state.activeFaceTracks = [];
  state.govSelectedCentreId = centreId;
  updateHeaderProfile();
  showToast(`Switched view to ${centreId === 'TC1' ? 'Training Centre 1' : 'Training Centre 2'}`, 'info');
  renderActiveView();
}

function renderSidebar() {
  const nav = document.getElementById('sidebarNav');
  nav.innerHTML = '';
  const user = state.currentUser;
  if (!user) return;

  let items = [];

  if (user.role === 'Training Centre Official') {
    // Navigation for Training Centre Official (Sidebar logout removed per Requirement 1)
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'profile', label: 'Profile', icon: '👤' },
      { id: 'attendance', label: 'Attendance', icon: '📝' },
      { id: 'model_ui', label: 'AI Model UI', icon: '🧠' },
      { id: 'register_student', label: 'Register Student', icon: '➕' },
      { id: 'equipment_issues', label: 'Equipment / Issues', icon: '🛠️' }
    ];
  } else {
    // Navigation for Government Official (Attendance History removed from navigation per requirement)
    items = [
      { id: 'dashboard', label: 'Dashboard', icon: '📊' },
      { id: 'profile', label: 'Profile', icon: '👤' },
      { id: 'attendance', label: 'Attendance', icon: '📋' },
      { id: 'footage', label: 'Footage', icon: '📹' },
      { id: 'model_ui', label: 'AI Model UI', icon: '🧠' },
      { id: 'equipment', label: 'Equipment', icon: '🔧' },
      { id: 'footage_alerts', label: 'Footage Alerts', icon: '🚨' }
    ];
  }

  items.forEach(item => {
    const btn = document.createElement('button');
    const isActive = state.activeView === item.id;
    btn.className = `w-full flex items-center space-x-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold transition ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
    }`;
    btn.innerHTML = `<span class="text-sm">${item.icon}</span><span>${item.label}</span>`;
    btn.onclick = () => {
      if (item.action) {
        item.action();
      } else {
        navigateTo(item.id);
      }
    };
    nav.appendChild(btn);
  });
}

function navigateTo(viewId) {
  if ((state.activeView === 'footage' || state.activeView === 'model_ui') && viewId !== 'footage' && viewId !== 'model_ui') {
    // Pause overlay requestAnimationFrame draw loop (canvas is unmounted),
    // but preserve the active camera stream, background video, and detection session!
    stopOverlayRenderLoop();
  }
  if (state.activeView === 'footage_alerts' && viewId !== 'footage_alerts') {
    if (typeof footageAlertsState !== 'undefined' && footageAlertsState.pollTimer) {
      clearInterval(footageAlertsState.pollTimer);
      footageAlertsState.pollTimer = null;
    }
  }
  state.activeView = viewId;
  updateHeaderProfile();
  renderSidebar();
  renderActiveView();
}

// ---------------------------------------------------------------------------
// 4. MAIN VIEW ROUTING & RENDERING
// ---------------------------------------------------------------------------
async function renderActiveView() {
  const container = document.getElementById('mainContentContainer');
  container.innerHTML = '<div class="p-8 text-center text-slate-400 font-medium">Loading section...</div>';

  const user = state.currentUser;
  if (!user) return;

  try {
    if (state.activeView === 'profile') {
      await renderProfileView(container);
    } else if (state.activeView === 'model_ui') {
      await renderModelUIView(container);
    } else if (user.role === 'Training Centre Official') {
      // TC Official Pages
      switch (state.activeView) {
        case 'dashboard':
          renderTCDashboard(container);
          break;
        case 'attendance':
          await renderTCAttendance(container);
          break;
        case 'model_ui':
          await renderModelUIView(container);
          break;
        case 'register_student':
          renderTCRegisterStudent(container);
          break;
        case 'equipment_issues':
          await renderTCEquipmentIssues(container);
          break;
        default:
          renderTCDashboard(container);
      }
    } else if (user.role === 'Government Official') {
      // Government Official Pages
      switch (state.activeView) {
        case 'dashboard':
          await renderGovDashboard(container);
          break;
        case 'attendance_history':
        case 'inspect_scope':
          await renderAttendanceHistory(container);
          break;
        case 'attendance':
          state.govAttendanceDate = '';
          state.govAttendanceSession = '';
          await renderGovAttendance(container);
          break;
        case 'footage':
          await renderGovFootage(container);
          break;
        case 'model_ui':
          await renderModelUIView(container);
          break;
        case 'equipment':
          await renderGovEquipment(container);
          break;
        case 'footage_alerts':
          await renderGovFootageAlerts(container);
          break;
        default:
          await renderGovDashboard(container);
      }
    }
  } catch (err) {
    console.error('Failed to render view:', err);
    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4 max-w-lg mx-auto my-8">
        <div class="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center text-2xl mx-auto">⚠️</div>
        <h3 class="text-base font-bold text-slate-800">Error Loading Section</h3>
        <p class="text-xs text-slate-500 leading-relaxed">${err.message || 'An error occurred while loading this section.'}</p>
        <button onclick="renderActiveView()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
          Retry
        </button>
      </div>
    `;
  }
}

// ===========================================================================
// SECTION 4: PROFILE PAGE (SECTIONS 2, 3, 5, 6)
// ===========================================================================
async function handleProfilePhotoUpload(input) {
  if (!input.files || !input.files[0]) return;
  const file = input.files[0];
  const reader = new FileReader();
  reader.onload = async (e) => {
    const photoBase64 = e.target.result;
    try {
      const res = await fetch('/api/profile/upload-photo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: state.currentUser.user_id,
          photo_url: photoBase64
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.user) {
          state.currentUser = Object.assign({}, state.currentUser, data.user);
        } else {
          state.currentUser.photo_url = data.photo_url;
          state.currentUser.photo_pending = 0;
        }
        updateHeaderProfile();
        showToast('Profile photograph updated successfully.', 'success');
        const container = document.getElementById('mainContentContainer');
        await renderProfileView(container);
      } else {
        showToast(data.message || 'Failed to update photo.', 'error');
      }
    } catch (err) {
      showToast('Error uploading photo.', 'error');
    }
  };
  reader.readAsDataURL(file);
}

function checkProfilePasswordMatch() {
  const p1 = document.getElementById('profileNewPassword').value;
  const p2 = document.getElementById('profileConfirmPassword').value;
  const statusEl = document.getElementById('profilePasswordMatchStatus');
  const btn = document.getElementById('btnProfileChangePassword');

  if (!p1 && !p2) {
    statusEl.textContent = 'Passwords must match to proceed.';
    statusEl.className = 'text-xs font-semibold text-slate-400';
    btn.disabled = true;
    return;
  }

  if (p1.length < 6) {
    statusEl.textContent = 'Password must be at least 6 characters.';
    statusEl.className = 'text-xs font-semibold text-amber-600';
    btn.disabled = true;
    return;
  }

  if (p1 === p2) {
    statusEl.textContent = '✓ Passwords match.';
    statusEl.className = 'text-xs font-semibold text-emerald-600';
    btn.disabled = false;
  } else {
    statusEl.textContent = '✗ Passwords do not match.';
    statusEl.className = 'text-xs font-semibold text-red-600';
    btn.disabled = true;
  }
}

async function handleProfileChangePassword(e) {
  e.preventDefault();
  const p1 = document.getElementById('profileNewPassword').value;
  const p2 = document.getElementById('profileConfirmPassword').value;
  const errEl = document.getElementById('profilePasswordError');
  const successEl = document.getElementById('profilePasswordSuccess');
  const btn = document.getElementById('btnProfileChangePassword');

  if (p1 !== p2) {
    if (errEl) {
      errEl.textContent = 'Passwords do not match.';
      errEl.classList.remove('hidden');
    }
    return;
  }
  if (p1.length < 6) {
    if (errEl) {
      errEl.textContent = 'Password must be at least 6 characters.';
      errEl.classList.remove('hidden');
    }
    return;
  }

  if (errEl) errEl.classList.add('hidden');
  if (successEl) successEl.classList.add('hidden');
  btn.disabled = true;
  btn.textContent = 'UPDATING...';

  try {
    const res = await fetch('/api/profile/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: state.currentUser.user_id,
        new_password: p1,
        confirm_password: p2
      })
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('profileNewPassword').value = '';
      document.getElementById('profileConfirmPassword').value = '';
      document.getElementById('profilePasswordMatchStatus').textContent = 'Passwords must match to proceed.';
      document.getElementById('profilePasswordMatchStatus').className = 'text-xs font-semibold text-slate-400';
      if (successEl) {
        successEl.textContent = '✓ Password changed successfully.';
        successEl.classList.remove('hidden');
      }
      showToast('Password updated securely.', 'success');
    } else {
      if (errEl) {
        errEl.textContent = data.message || 'Failed to change password.';
        errEl.classList.remove('hidden');
      }
    }
  } catch (err) {
    if (errEl) {
      errEl.textContent = 'Server error changing password.';
      errEl.classList.remove('hidden');
    }
  } finally {
    btn.disabled = false;
    btn.textContent = 'CONFIRM PASSWORD';
  }
}

async function renderProfileView(container) {
  let user = state.currentUser;
  if (!user) return;

  // Refresh latest registration details from SQLite persistence layer (Requirement 4)
  try {
    const param = user.user_id ? `user_id=${encodeURIComponent(user.user_id)}` : `email=${encodeURIComponent(user.email || '')}`;
    const res = await fetch(`/api/profile?${param}`);
    const data = await res.json();
    if (data.success && data.user) {
      state.currentUser = Object.assign({}, state.currentUser, data.user);
      user = state.currentUser;
      updateHeaderProfile();
    }
  } catch (err) {
    // If network error, use cached session user
  }

  const isTC = user.role === 'Training Centre Official';
  const fullName = user.name || 'Not Provided';
  const dob = user.dob || 'Not Provided';
  const dateOfJoining = user.date_of_joining || user.year_joined || 'Not Provided';
  const qualification = user.qualification || 'Not Provided';
  const email = user.email || 'Not Provided';
  const role = user.role || 'Not Provided';
  const loginId = user.user_id || 'Not Provided';

  let trainingCentreAllotted = 'Not Provided';
  if (isTC) {
    trainingCentreAllotted = user.training_centre_allotted || user.centre_name || (user.centre_id === 'TC1' ? 'Training Centre 1' : (user.centre_id === 'TC2' ? 'Training Centre 2' : (user.centre_id || 'Not Provided')));
  } else {
    trainingCentreAllotted = user.training_centre_allotted || user.centre_name || user.access_centres || 'All centres';
  }

  // Shared Profile Avatar Logic: Use user's registered photo if available; otherwise use valid local placeholder
  const DEFAULT_AVATAR_PATH = 'demo_assets/default_avatar.svg';
  const hasValidPhoto = Boolean(user.photo_url && user.photo_pending !== 1 && String(user.photo_url).trim().length > 0 && !user.photo_url.includes('placeholder') && !user.photo_url.includes('default_avatar'));
  const isPending = !hasValidPhoto;
  const photoSrc = hasValidPhoto ? user.photo_url : DEFAULT_AVATAR_PATH;

  container.innerHTML = `
    <div class="space-y-5 max-w-4xl">
      <!-- Section Header with Lock Status Indicator -->
      <div class="border-b border-slate-200 pb-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h2 class="text-xl font-bold text-slate-900">User Profile</h2>
          <p class="text-xs text-slate-500">${isTC ? 'Trainee Official Registered Details' : 'Government Official Registered Details'}</p>
        </div>
        <div class="inline-flex items-center space-x-1.5 px-2.5 py-1 bg-slate-100 border border-slate-300 rounded-lg text-slate-600 text-xs font-semibold self-start sm:self-auto">
          <span>🔒</span>
          <span>Official Profile Information Locked</span>
        </div>
      </div>

      <!-- Main Profile Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 sm:p-6">
        
        <!-- Top Section: Left = Prominent Name & Badges; Top-Right = Small Avatar -->
        <div class="flex items-start justify-between gap-4 pb-4 border-b border-slate-100">
          
          <!-- Left: User Identity & Name -->
          <div class="flex-1 min-w-0 space-y-1.5">
            <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Official Name</span>
            <h3 class="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight leading-snug truncate">${fullName}</h3>

            <div class="pt-1 flex flex-wrap items-center gap-2 text-xs text-slate-600">
              <span class="px-2 py-0.5 rounded text-xs font-bold ${isTC ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'}">
                ${role}
              </span>
              <div class="inline-flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                <span class="font-bold text-slate-400">ID:</span>
                <span class="font-mono font-bold text-slate-800">${loginId}</span>
              </div>
              <div class="inline-flex items-center space-x-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-[11px]">
                <span class="font-semibold text-emerald-700">● Active</span>
              </div>
            </div>
          </div>

          <!-- Top-Right Corner: Small, Professional Avatar -->
          <div class="shrink-0 flex flex-col items-end space-y-1">
            <div class="relative">
              <img 
                id="profileDisplayPhoto"
                src="${photoSrc}" 
                alt="${fullName} Avatar" 
                onerror="this.onerror=null;this.src='${DEFAULT_AVATAR_PATH}';" 
                class="w-12 h-12 rounded-xl object-cover border border-slate-200 shadow-xs bg-slate-50" 
              />
            </div>

            ${isPending ? `
              <!-- Small "Pending" label directly below top-right photo -->
              <span class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-amber-50 text-amber-800 border border-amber-300">
                Pending
              </span>
            ` : `
              <span class="inline-flex items-center px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                ✓ Uploaded
              </span>
            `}

            <!-- Compact Photo Upload / Change Trigger -->
            <div>
              <label class="cursor-pointer inline-flex items-center space-x-0.5 px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-slate-600 rounded text-[9px] font-semibold transition">
                <span>📷</span>
                <span>${isPending ? 'Upload' : 'Change'}</span>
                <input type="file" accept="image/*" class="hidden" onchange="handleProfilePhotoUpload(this)" />
              </label>
            </div>
          </div>

        </div>

        <!-- Registered Details: Compact, Well-Aligned Grid -->
        <div class="pt-4">
          <div class="flex items-center justify-between mb-3">
            <h4 class="text-[11px] font-bold uppercase tracking-wider text-slate-500">Official Registered Details</h4>
            <span class="text-[10px] text-slate-400 font-medium flex items-center gap-1">🔒 Verified Record</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            
            <!-- Date of Birth (DOB) -->
            <div class="p-3 bg-slate-50/70 hover:bg-slate-50/90 rounded-lg border border-slate-200 flex items-center justify-between transition">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Date of Birth (DOB)</span>
                <span class="font-semibold text-slate-900 text-sm">${dob}</span>
              </div>
              <span class="text-slate-400 text-xs" title="Official Verified Record">🔒</span>
            </div>

            <!-- Date of Joining -->
            <div class="p-3 bg-slate-50/70 hover:bg-slate-50/90 rounded-lg border border-slate-200 flex items-center justify-between transition">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Date of Joining</span>
                <span class="font-semibold text-slate-900 text-sm">${dateOfJoining}</span>
              </div>
              <span class="text-slate-400 text-xs" title="Official Verified Record">🔒</span>
            </div>

            <!-- Qualification -->
            <div class="p-3 bg-slate-50/70 hover:bg-slate-50/90 rounded-lg border border-slate-200 flex items-center justify-between transition">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Qualification</span>
                <span class="font-semibold text-slate-900 text-sm">${qualification}</span>
              </div>
              <span class="text-slate-400 text-xs" title="Official Verified Record">🔒</span>
            </div>

            <!-- Training Centre Allotted -->
            <div class="p-3 bg-slate-50/70 hover:bg-slate-50/90 rounded-lg border border-slate-200 flex items-center justify-between transition">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Training Centre Allotted</span>
                <span class="font-semibold text-slate-900 text-sm">${trainingCentreAllotted}</span>
              </div>
              <span class="text-slate-400 text-xs" title="Official Verified Record">🔒</span>
            </div>

            <!-- Email ID -->
            <div class="p-3 bg-slate-50/70 hover:bg-slate-50/90 rounded-lg border border-slate-200 flex items-center justify-between transition sm:col-span-2">
              <div>
                <span class="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Email ID</span>
                <span class="font-semibold text-blue-700 text-sm break-all">${email}</span>
              </div>
              <span class="text-slate-400 text-xs" title="Official Verified Record">🔒</span>
            </div>

          </div>
        </div>

      </div>

      <!-- Change Password Collapsible Dropdown (Requirement 5) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden max-w-xl">
        <button type="button" onclick="toggleProfilePasswordDropdown()" id="btnToggleProfilePassword" class="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition cursor-pointer select-none">
          <div class="flex items-center space-x-3">
            <span class="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-sm">🔑</span>
            <div>
              <h3 class="text-sm font-bold text-slate-900">Change Password</h3>
              <p class="text-[11px] text-slate-500">Update your official login credential securely</p>
            </div>
          </div>
          <span id="profilePasswordChevron" class="text-slate-400 font-bold text-xs transition-transform duration-200">▼</span>
        </button>

        <div id="profilePasswordDropdownContent" class="hidden border-t border-slate-200 p-5 bg-slate-50/50">
          <form onsubmit="handleProfileChangePassword(event)" class="space-y-3.5 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">New Password:</label>
              <div class="relative">
                <input type="password" id="profileNewPassword" oninput="checkProfilePasswordMatch()" required placeholder="Enter new password (min 6 characters)" class="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium text-slate-800" />
                <button type="button" onclick="togglePasswordVisibility('profileNewPassword', this)" aria-label="Show password" title="Show password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer">
                  ${PASSWORD_EYE_OPEN_SVG}
                </button>
              </div>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 mb-1">Re-enter New Password:</label>
              <div class="relative">
                <input type="password" id="profileConfirmPassword" oninput="checkProfilePasswordMatch()" required placeholder="Re-enter new password" class="w-full border border-slate-300 rounded-lg px-3 py-2 pr-10 outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600 font-medium text-slate-800" />
                <button type="button" onclick="togglePasswordVisibility('profileConfirmPassword', this)" aria-label="Show password" title="Show password" class="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none cursor-pointer">
                  ${PASSWORD_EYE_OPEN_SVG}
                </button>
              </div>
            </div>

            <div id="profilePasswordMatchStatus" class="text-xs font-semibold text-slate-400">
              Passwords must match to proceed.
            </div>

            <div id="profilePasswordError" class="p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg hidden"></div>
            <div id="profilePasswordSuccess" class="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs rounded-lg hidden"></div>

            <button type="submit" id="btnProfileChangePassword" disabled class="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-bold text-xs rounded-lg shadow transition">
              CONFIRM PASSWORD
            </button>
          </form>
        </div>
      </div>
    </div>
  `;
}

function toggleProfilePasswordDropdown() {
  const content = document.getElementById('profilePasswordDropdownContent');
  const chevron = document.getElementById('profilePasswordChevron');
  if (!content) return;
  const isHidden = content.classList.contains('hidden');
  if (isHidden) {
    content.classList.remove('hidden');
    if (chevron) chevron.textContent = '▲';
  } else {
    content.classList.add('hidden');
    if (chevron) chevron.textContent = '▼';
  }
}

// ===========================================================================
// SECTION 5 & 18: TRAINING CENTRE OFFICIAL DASHBOARD
// ===========================================================================
async function renderTCDashboard(container) {
  const user = state.currentUser;
  const centreId = user.centre_id;

  // Fetch live stats for this centre only
  const resStudents = await fetch(`/api/students?centre_id=${centreId}`).then(r => r.json());
  const totalStudents = resStudents.total || 0;

  const resAtt = await fetch(`/api/attendance?centre_id=${centreId}`).then(r => r.json());
  const isLocked = resAtt.is_locked;
  const presentCount = resAtt.present_count || 0;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="border-b border-slate-200 pb-3">
        <h2 class="text-xl font-bold text-slate-900">${user.centre_name} — Operations Dashboard</h2>
        <p class="text-xs text-slate-500">Record attendance, register new trainees, and submit infrastructure defect reports</p>
      </div>

      <!-- Metric Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase">Registered Students</div>
          <div class="text-3xl font-black text-slate-900 mt-1">${totalStudents}</div>
          <div class="text-[11px] text-slate-500 mt-0.5">Enrolled at this centre</div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase">Today's Attendance Status</div>
          <div class="text-3xl font-black ${isLocked ? 'text-emerald-600' : 'text-amber-600'} mt-1">
            ${isLocked ? `${presentCount} / ${totalStudents}` : 'Pending'}
          </div>
          <div class="text-[11px] ${isLocked ? 'text-emerald-700 font-bold' : 'text-amber-700 font-medium'} mt-0.5">
            ${isLocked ? 'Locked & Submitted' : 'Unsubmitted (Action Required)'}
          </div>
        </div>

        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div class="text-[11px] font-semibold text-slate-400 uppercase">Centre Portal Scope</div>
          <div class="text-sm font-bold text-blue-900 mt-2">${user.centre_name}</div>
          <div class="text-[11px] text-slate-400 mt-0.5 font-mono">Isolated Data Boundary</div>
        </div>
      </div>

      <!-- Quick Actions -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-3">
        <h3 class="font-bold text-slate-900 text-sm">Centre Actions</h3>
        <div class="flex flex-wrap gap-3">
          <button onclick="navigateTo('attendance')" class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow transition">
            📝 Mark Session Attendance
          </button>
          <button onclick="navigateTo('register_student')" class="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-bold shadow transition">
            ➕ Register New Student
          </button>
          <button onclick="navigateTo('equipment_issues')" class="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold shadow transition">
            🛠️ Report Equipment Issue
          </button>
        </div>
      </div>
    </div>
  `;
}

// ===========================================================================
// SECTIONS 6 & 7: ATTENDANCE MODULE (TC OFFICIAL ATTENDANCE WITH LOCK)
// ===========================================================================
async function renderTCAttendance(container) {
  const user = state.currentUser;
  const centreId = user.centre_id;

  const dateInput = document.getElementById('attDateSelect');
  const sessionInput = document.getElementById('attSessionSelect');
  const dateVal = (dateInput ? dateInput.value : state.tcAttendanceDate) || new Date().toISOString().substring(0, 10);
  const sessionVal = (sessionInput ? sessionInput.value : state.tcAttendanceSession) || 'Session 1';
  state.tcAttendanceDate = dateVal;
  state.tcAttendanceSession = sessionVal;

  const res = await fetch(`/api/attendance?centre_id=${centreId}&date=${dateVal}&session_name=${encodeURIComponent(sessionVal)}`).then(r => r.json());
  const isLocked = res.is_locked;
  const masterStudents = res.registered_students && res.registered_students.length > 0 ? res.registered_students : (res.records || []);
  const records = res.records || [];
  const totalStudents = res.total_students || masterStudents.length;

  const statusMap = new Map();
  records.forEach(r => {
    if (r && r.roll_number !== undefined) {
      statusMap.set(r.roll_number, r.status === 'Present');
    }
  });

  state.attendanceRecords = masterStudents.map(s => {
    const roll = s.roll_number;
    const name = s.student_name || s.name || `Student ${roll}`;
    const isPresent = statusMap.has(roll) ? statusMap.get(roll) : (s.status === 'Present');
    return {
      roll_number: roll,
      student_name: name,
      present: Boolean(isPresent)
    };
  });
  state.attendanceLocked = isLocked;

  // Count present and absent
  const currentPresentCount = state.attendanceRecords.filter(r => r.present).length;
  const currentAbsentCount = totalStudents - currentPresentCount;

  container.innerHTML = `
    <div class="space-y-6">
      <div class="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Class Attendance — ${user.centre_name}</h2>
          <p class="text-xs text-slate-500">Mark student attendance for current session</p>
        </div>
        ${isLocked ? `
          <div class="px-3 py-1.5 bg-red-100 border border-red-300 text-red-800 font-bold text-xs rounded-lg flex items-center gap-1.5">
            <span>🔒 Attendance locked after submission.</span>
          </div>
        ` : ''}
      </div>

      <!-- Select Date & Session -->
      <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap gap-4 text-xs">
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Date:</label>
          <input type="date" id="attDateSelect" value="${dateVal}" ${isLocked ? 'disabled' : ''} onchange="onTCAttendanceParamsChange()" class="border border-slate-300 rounded px-3 py-1.5 outline-none font-medium text-slate-800" />
        </div>
        <div>
          <label class="block font-semibold text-slate-700 mb-1">Class / Session:</label>
          <select id="attSessionSelect" ${isLocked ? 'disabled' : ''} onchange="onTCAttendanceParamsChange()" class="border border-slate-300 rounded px-3 py-1.5 outline-none bg-white font-medium text-slate-800">
            <option value="Session 1" ${sessionVal === 'Session 1' ? 'selected' : ''}>Session 1 (Morning Theory & Workshop)</option>
            <option value="Session 2" ${sessionVal === 'Session 2' ? 'selected' : ''}>Session 2 (Afternoon Practicals)</option>
          </select>
        </div>
      </div>

      <!-- Student Attendance Table (Section 6 Spec) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
          <span class="font-bold text-slate-800">Registered Student List (${totalStudents} Students)</span>
          <span class="text-slate-500">${isLocked ? 'Status: LOCKED (Read-Only)' : 'Check box = Present, Uncheck = Absent'}</span>
        </div>

        <div class="overflow-x-auto max-h-[500px] overflow-y-auto custom-scroll">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider sticky top-0 border-b">
              <tr>
                <th class="py-3 px-4 w-28">Roll Number</th>
                <th class="py-3 px-4">Student Name</th>
                <th class="py-3 px-4 text-center w-36">Attendance Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${state.attendanceRecords.map(r => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-2.5 px-4 font-mono font-bold text-slate-700">${r.roll_number}</td>
                  <td class="py-2.5 px-4 font-semibold text-slate-900">${r.student_name}</td>
                  <td class="py-2.5 px-4 text-center">
                    <label class="inline-flex items-center space-x-2.5 ${isLocked ? 'cursor-not-allowed' : 'cursor-pointer'} select-none">
                      <input 
                        type="checkbox" 
                        id="chk_${r.roll_number}" 
                        ${r.present ? 'checked' : ''} 
                        ${isLocked ? 'disabled' : ''} 
                        onchange="toggleStudentAttendance(${r.roll_number}, this.checked)"
                        class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer disabled:cursor-not-allowed" 
                      />
                      <span id="badge_${r.roll_number}" class="text-[11px] font-bold px-2.5 py-0.5 rounded transition ${r.present ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}">
                        ${r.present ? 'Present' : 'Absent'}
                      </span>
                    </label>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- Dynamic Counter & Submission Footer (Sections 6 & 7) -->
        <div class="p-5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <!-- Live Student Count Display: Number of Students Present / Total Students (e.g. 25 / 30) -->
          <div class="text-left">
            <div class="text-[10px] font-bold uppercase text-slate-400">Attendance Summary</div>
            <div class="text-xl font-black text-blue-700" id="liveAttendanceCounter">
              ${currentPresentCount} / ${totalStudents}
            </div>
          </div>

          <!-- SUBMIT ATTENDANCE Button (Section 7) -->
          <div>
            ${isLocked ? `
              <div class="px-4 py-2 bg-slate-200 text-slate-600 font-bold text-xs rounded-lg cursor-not-allowed border border-slate-300 flex items-center gap-1.5">
                <span>🔒 Attendance locked after submission.</span>
              </div>
            ` : `
              <button onclick="submitTCAttendance()" id="btnSubmitAttendance" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow-md transition">
                SUBMIT ATTENDANCE
              </button>
            `}
          </div>
        </div>
      </div>
    </div>
  `;
}

async function onTCAttendanceParamsChange() {
  const dateInput = document.getElementById('attDateSelect');
  const sessionInput = document.getElementById('attSessionSelect');
  if (dateInput) state.tcAttendanceDate = dateInput.value;
  if (sessionInput) state.tcAttendanceSession = sessionInput.value;
  const container = document.getElementById('mainContentContainer');
  await renderTCAttendance(container);
}

function toggleStudentAttendance(rollNumber, isChecked) {
  const item = state.attendanceRecords.find(r => r.roll_number === rollNumber);
  if (item) {
    item.present = isChecked;
  }
  const badge = document.getElementById(`badge_${rollNumber}`);
  if (badge) {
    badge.className = `text-[11px] font-bold px-2.5 py-0.5 rounded transition ${isChecked ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-slate-100 text-slate-600 border border-slate-200'}`;
    badge.textContent = isChecked ? 'Present' : 'Absent';
  }
  updateAttendanceCounterUI();
}

function updateAttendanceCounterUI() {
  const present = state.attendanceRecords.filter(r => r.present).length;
  const total = state.attendanceRecords.length;
  const counterEl = document.getElementById('liveAttendanceCounter');
  if (counterEl) {
    counterEl.textContent = `${present} / ${total}`;
  }
}

async function submitTCAttendance() {
  if (state.attendanceLocked) return;

  const user = state.currentUser;
  const centreId = user.centre_id;
  const dateVal = document.getElementById('attDateSelect').value;
  const sessionName = document.getElementById('attSessionSelect').value;

  const recordsPayload = state.attendanceRecords.map(r => ({
    roll_number: r.roll_number,
    student_name: r.student_name,
    status: r.present ? 'Present' : 'Absent'
  }));

  const res = await fetch('/api/attendance/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      centre_id: centreId,
      date: dateVal,
      session_name: sessionName,
      submitted_by: user.name,
      records: recordsPayload
    })
  }).then(r => r.json());

  if (res.success) {
    const present = res.present_count;
    const total = res.total_students;
    showToast(`Attendance submitted! Recorded: ${present} / ${total}. Locked.`, 'success');
    state.cachedOfficialAttendance = present;
    state.cachedTotalStudents = total;
    state.officialAttendanceCount = present;
    state.officialPresentCount = present;
    state.totalStudents = total;
    if (state.cameraData) {
      state.cameraData.official_attendance_count = present;
      state.cameraData.total_students = total;
      state.cameraData.difference = Math.abs(present - (state.latestLiveCount || 0));
      state.cameraData.discrepancy_detected = state.cameraData.difference > 0;
    }
    // Invalidate cached attendance dates so Gov portal reflects latest submitted attendance immediately
    state.govAttendanceDate = '';
    state.govAttendanceSession = '';
    // Re-render attendance view to show locked state immediately
    await renderTCAttendance(document.getElementById('mainContentContainer'));
  } else {
    showToast(res.message || 'Submission failed.', 'error');
  }
}

// ===========================================================================
// SECTION 8: REGISTER NEW STUDENT (TC OFFICIAL)
// ===========================================================================
function renderTCRegisterStudent(container) {
  const user = state.currentUser;
  const centreId = user.centre_id;

  container.innerHTML = `
    <div class="space-y-6 max-w-3xl">
      <div class="border-b border-slate-200 pb-3">
        <h2 class="text-xl font-bold text-slate-900">Register Student — ${user.centre_name}</h2>
        <p class="text-xs text-slate-500">Enroll new student into this centre. Automatically updates student roster and attendance.</p>
      </div>

      <form id="registerStudentForm" onsubmit="handleRegisterStudent(event)" class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-6 text-xs">
        
        <!-- Student Details -->
        <div>
          <h3 class="font-bold text-slate-900 text-sm border-b pb-2 mb-3">Student Details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Student Name *</label>
              <input type="text" id="regName" required placeholder="Enter student full name" class="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-600" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Roll Number (Optional, auto-assigned if empty)</label>
              <input type="number" id="regRoll" placeholder="Enter roll number" class="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-600" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Date of Birth</label>
              <input type="date" id="regDob" value="2004-06-15" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Gender</label>
              <select id="regGender" class="w-full border rounded-lg px-3 py-2 outline-none bg-white">
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Phone Number</label>
              <input type="text" id="regPhone" placeholder="+91 98000 00000" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Email</label>
              <input type="email" id="regEmail" placeholder="Enter student email" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div class="sm:col-span-2">
              <label class="block font-semibold text-slate-700 mb-1">Address</label>
              <input type="text" id="regAddress" placeholder="Full residential address" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Course / Trade</label>
              <input type="text" id="regCourse" value="Vocational Technician" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Batch</label>
              <input type="text" id="regBatch" value="Batch 1" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
          </div>
        </div>

        <!-- Qualification Details -->
        <div>
          <h3 class="font-bold text-slate-900 text-sm border-b pb-2 mb-3">Qualification Details</h3>
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Highest Qualification</label>
              <input type="text" id="regQual" value="12th Standard" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Qualification Year</label>
              <input type="text" id="regYear" value="2024" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Institution</label>
              <input type="text" id="regInst" value="Govt High School" class="w-full border rounded-lg px-3 py-2 outline-none" />
            </div>
          </div>
        </div>

        <!-- Documentation Uploads -->
        <div>
          <h3 class="font-bold text-slate-900 text-sm border-b pb-2 mb-3">Documentation</h3>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Identity Document (Aadhaar / ID Card)</label>
              <input type="file" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Qualification Certificate</label>
              <input type="file" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Photograph</label>
              <input type="file" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
            <div>
              <label class="block font-semibold text-slate-700 mb-1">Other Supporting Document</label>
              <input type="file" class="text-xs text-slate-500 file:mr-2 file:py-1 file:px-2.5 file:rounded file:border-0 file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="pt-4 border-t flex justify-end">
          <button type="submit" id="btnSubmitStudent" class="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
            REGISTER STUDENT
          </button>
        </div>
      </form>
    </div>
  `;
}

async function handleRegisterStudent(e) {
  e.preventDefault();
  const user = state.currentUser;
  const name = document.getElementById('regName').value.trim();
  const roll = document.getElementById('regRoll').value.trim();
  const dob = document.getElementById('regDob').value;
  const gender = document.getElementById('regGender').value;
  const phone = document.getElementById('regPhone').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const address = document.getElementById('regAddress').value.trim();
  const course = document.getElementById('regCourse').value.trim();
  const batch = document.getElementById('regBatch').value.trim();
  const qual = document.getElementById('regQual').value.trim();
  const year = document.getElementById('regYear').value.trim();
  const inst = document.getElementById('regInst').value.trim();

  const payload = {
    centre_id: user.centre_id,
    name: name,
    roll_number: roll ? parseInt(roll) : null,
    dob: dob,
    gender: gender,
    phone: phone,
    email: email,
    address: address,
    course: course,
    batch: batch,
    highest_qualification: qual,
    qualification_year: year,
    institution: inst
  };

  const res = await fetch('/api/students/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  }).then(r => r.json());

  if (res.success) {
    showToast(res.message, 'success');
    // Navigate to Attendance so the user sees the newly registered student immediately!
    navigateTo('attendance');
  } else {
    showToast(res.message || 'Registration failed.', 'error');
  }
}

/// ===========================================================================
// SECTION 9: EQUIPMENT / ISSUE SECTION (TC OFFICIAL)
// ===========================================================================
async function renderTCEquipmentIssues(container) {
  const user = state.currentUser;
  const centreId = user.centre_id || 'TC1';
  const todayStr = new Date().toISOString().substring(0, 10);

  const [resCat, resInv, resIssues] = await Promise.all([
    fetch(`/api/equipment/categories?centre_id=${centreId}`).then(r => r.json()).catch(() => ({ success: false })),
    fetch(`/api/equipment/inventory?centre_id=${centreId}`).then(r => r.json()).catch(() => ({ success: false, items: [] })),
    fetch(`/api/equipment/issues?centre_id=${centreId}`).then(r => r.json()).catch(() => ({ success: false, issues: [] }))
  ]);

  const catData = (resCat && resCat.success) ? resCat : {
    categories: [],
    summary: { total_allotted: 0, total_good: null, total_damaged: 0, total_missing: 0, total_camera_detected: 0, overall_status: 'Pending' }
  };
  const categories = catData.categories || [];
  const summary = catData.summary || {};
  const inventoryItems = resInv.items || [];
  const issues = resIssues.issues || [];

  const catIcons = {
    desks_chairs: { icon: '🪑', color: 'indigo' },
    'desks/chairs': { icon: '🪑', color: 'indigo' },
    desks: { icon: '🗄️', color: 'indigo' },
    computers: { icon: '🖥️', color: 'blue' },
    machines: { icon: '⚙️', color: 'amber' },
    fans: { icon: '💨', color: 'teal' },
    chairs: { icon: '🪑', color: 'purple' },
    tools: { icon: '🔧', color: 'emerald' }
  };

  const activeSubTab = state.tcEquipmentSubTab || 'allocated';

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Page Header -->
      <div class="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Equipment Management</h2>
          <p class="text-xs text-slate-500">View allocated equipment, verify operating condition, and record equipment comments for ${user.centre_name}</p>
        </div>
      </div>

      <!-- Sub-tabs Navigation -->
      <div class="flex items-center space-x-1 border-b border-slate-200">
        <button 
          type="button" 
          onclick="switchTCEquipmentSubTab('allocated')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'allocated' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>📦</span>
          <span>Allocated Equipment</span>
        </button>
        <button 
          type="button" 
          onclick="switchTCEquipmentSubTab('verification')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'verification' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>✅</span>
          <span>Equipment Verification</span>
        </button>
        <button 
          type="button" 
          onclick="switchTCEquipmentSubTab('comments')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'comments' ? 'border-emerald-600 text-emerald-700 bg-emerald-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>💬</span>
          <span>Comments (${issues.length})</span>
        </button>
      </div>

      <!-- SUB-TAB 1: ALLOCATED EQUIPMENT -->
      ${activeSubTab === 'allocated' ? `
        <div class="space-y-6">
          <!-- Official Category Allocations Overview -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Official Equipment Allocations</div>
                <h3 class="text-base font-black text-slate-900 mt-0.5">Government-Allocated Quantities for ${user.centre_name}</h3>
                <p class="text-xs text-slate-500">Official equipment quantities supplied and allocated by the National Government Oversight Directorate.</p>
              </div>
              <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold bg-blue-50 text-blue-800 border border-blue-200">
                <span>Total Allocated:</span>
                <span class="font-mono text-sm">${summary.total_allotted || 0} Units</span>
              </div>
            </div>

            <!-- 6 Category Cards Grid (Allocations) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="tcAllocatedCategoryGrid">
              ${categories.map(cat => {
                const meta = catIcons[cat.category_key.toLowerCase()] || { icon: '📦', color: 'slate' };
                const isReported = (cat.reported_good !== null);
                return `
                  <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="text-2xl">${meta.icon}</span>
                        <div>
                          <h4 class="font-black text-sm text-slate-900">${cat.category_name}</h4>
                          <div class="text-[10px] font-mono text-slate-400 uppercase">${cat.category_key}</div>
                        </div>
                      </div>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isReported ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${isReported ? 'Reported' : 'Pending'}
                      </span>
                    </div>

                    <!-- Government Allocated Quantity Display -->
                    <div class="p-3 bg-white rounded-lg border border-slate-200/90 space-y-0.5">
                      <div class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Government Allocated Quantity</div>
                      <div class="text-2xl font-black text-slate-900">
                        ${cat.allotted_quantity} <span class="text-xs font-semibold text-slate-500">Units</span>
                      </div>
                      <div class="text-[10px] text-slate-400">
                        Officially allocated by Government Official
                      </div>
                    </div>

                    <div class="p-2.5 bg-slate-100/90 rounded-lg border border-slate-200/90 flex items-center justify-between text-xs">
                      <span class="text-slate-600 font-semibold">Verified good:</span>
                      <span class="font-mono font-bold ${isReported ? 'text-emerald-700' : 'text-amber-700 italic'}">
                        ${isReported ? `${cat.reported_good} / ${cat.allotted_quantity} Units` : 'Pending Entry'}
                      </span>
                    </div>

                    <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                      <span>${cat.updated_at ? `Updated: ${cat.updated_at.substring(0, 10)}` : 'Persisted'}</span>
                      <span>Max: ${cat.allotted_quantity}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <!-- Itemized Allocated Equipment Inventory Table -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Supplied Equipment Roster</div>
                <h3 class="text-sm font-black text-slate-900 mt-0.5">Allocated Equipment Catalog (${inventoryItems.length} Items)</h3>
                <p class="text-xs text-slate-500">Itemized list of equipment provided by the Government for ${user.centre_name}</p>
              </div>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
                  <tr>
                    <th class="py-3 px-4">Equipment Name</th>
                    <th class="py-3 px-4">Category</th>
                    <th class="py-3 px-4">Unique ID / Serial #</th>
                    <th class="py-3 px-4 text-center">Qty</th>
                    <th class="py-3 px-4">Supplied Date</th>
                    <th class="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${inventoryItems.length === 0 ? `
                    <tr><td colspan="6" class="py-6 text-center text-slate-400">No allocated equipment found for ${user.centre_name}.</td></tr>
                  ` : inventoryItems.map(item => `
                    <tr class="hover:bg-slate-50/70 transition">
                      <td class="py-3 px-4 font-bold text-slate-900">${item.equipment_name}</td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${item.category}</span>
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-600 font-bold">${item.serial_number || item.standard_tag || item.equipment_id}</td>
                      <td class="py-3 px-4 text-center font-bold text-slate-800">${item.quantity || 1}</td>
                      <td class="py-3 px-4 font-mono text-slate-500">${item.supplied_date || '2026-01-15'}</td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold ${item.status === 'Active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}">${item.status || 'Active'}</span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SUB-TAB 2: EQUIPMENT VERIFICATION -->
      ${activeSubTab === 'verification' ? `
        <div class="space-y-6">
          <!-- Category-Level Condition Reporting -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Equipment Condition Verification</div>
                <h3 class="text-base font-black text-slate-900 mt-0.5">Report Operating Condition</h3>
                <p class="text-xs text-slate-500">Enter verified good-condition items per category (automatically calculates damaged or missing items).</p>
              </div>
              <div class="inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-bold ${summary.has_any_report ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-amber-50 text-amber-800 border border-amber-200'}">
                <span>${summary.has_any_report ? '✓ Reports Submitted' : '⚠️ Pending Submission'}</span>
                <span class="font-mono">${summary.total_good !== null ? `${summary.total_good} / ${summary.total_allotted}` : 'Pending'}</span>
              </div>
            </div>

            <!-- 6 Category Cards Grid for Verification Input -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="tcCategoryCardsGrid">
              ${categories.map(cat => {
                const meta = catIcons[cat.category_key.toLowerCase()] || { icon: '📦', color: 'slate' };
                const isReported = (cat.reported_good !== null);
                const damagedCalc = isReported ? (cat.allotted_quantity - cat.reported_good) : 0;
                return `
                  <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition">
                    <div class="flex items-center justify-between">
                      <div class="flex items-center space-x-2">
                        <span class="text-2xl">${meta.icon}</span>
                        <div>
                          <h4 class="font-black text-sm text-slate-900">${cat.category_name}</h4>
                          <div class="text-[10px] font-mono text-slate-400 uppercase">${cat.category_key}</div>
                        </div>
                      </div>
                      <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isReported ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                        ${isReported ? 'Reported' : 'Pending'}
                      </span>
                    </div>

                    <!-- Government Allocated Quantity (Read-only for Trainee) -->
                    <div class="p-3 bg-white rounded-lg border border-slate-200/90 space-y-0.5">
                      <div class="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Government Allocated Quantity</div>
                      <div class="text-2xl font-black text-slate-900">
                        ${cat.allotted_quantity} <span class="text-xs font-semibold text-slate-500">Units</span>
                      </div>
                      <div class="text-[10px] text-slate-400">
                        Officially allocated by Government Official
                      </div>
                    </div>

                    <!-- Good Condition Input Field -->
                    <div>
                      <label class="block font-bold text-xs text-slate-700 mb-1">
                        Equipment in Good Condition * (0 to ${cat.allotted_quantity})
                      </label>
                      <input 
                        type="number" 
                        id="tcGoodInput_${cat.category_key}" 
                        min="0" 
                        max="${cat.allotted_quantity}" 
                        step="1" 
                        value="${cat.reported_good !== null ? cat.reported_good : ''}" 
                        placeholder="Enter good count (0-${cat.allotted_quantity})"
                        oninput="updateTCDamagedCalc('${cat.category_key}', ${cat.allotted_quantity}, this.value)"
                        class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 bg-white focus:border-blue-600 outline-none"
                      />
                    </div>

                    <!-- Automatically Calculated Damaged or Missing -->
                    <div class="p-2.5 bg-slate-100/90 rounded-lg border border-slate-200/90 flex items-center justify-between text-xs">
                      <span class="text-slate-600 font-semibold">Damaged or Missing:</span>
                      <span class="font-mono font-bold text-red-600 text-sm" id="tcDamagedCalc_${cat.category_key}">
                        ${isReported ? `${damagedCalc} Units` : '0 Units'}
                      </span>
                    </div>

                    <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60">
                      <span>${cat.reported_at ? `Reported: ${cat.reported_at.substring(0, 10)}` : 'Awaiting official entry'}</span>
                      <span>Max: ${cat.allotted_quantity}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>

            <!-- Submit Button for Category Condition Reports -->
            <div class="pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div class="text-[11px] text-slate-500">
                * <b>Validation Rule:</b> Reported good-condition count must be a non-negative whole number (0 to Allocated Quantity). Reports sync immediately to the Government Official Portal.
              </div>
              <button 
                type="button" 
                onclick="submitTCCategoryConditionReports()" 
                id="btnSaveTCCategories" 
                class="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-2 cursor-pointer self-end sm:self-auto"
              >
                <span>📤</span>
                <span>SUBMIT ALL CATEGORY REPORTS</span>
              </button>
            </div>
          </div>

          <!-- Itemized Equipment Inspection Table -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itemized Equipment Verification</div>
                <h3 class="text-sm font-black text-slate-900 mt-0.5">Itemized Equipment List & On-Site Inspection (${inventoryItems.length} Items)</h3>
                <p class="text-xs text-slate-500">Physically inspect individual items, flag damaged or missing units with checkboxes, and record inspection remarks</p>
              </div>
              <button 
                type="button" 
                onclick="submitTCItemInspection()" 
                id="btnSaveTCInspection" 
                class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
              >
                <span>💾</span>
                <span>SAVE INSPECTION REPORT</span>
              </button>
            </div>

            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
                  <tr>
                    <th class="py-3 px-4">Equipment Name</th>
                    <th class="py-3 px-4">Category</th>
                    <th class="py-3 px-4">Unique ID / Serial #</th>
                    <th class="py-3 px-4 text-center">Qty</th>
                    <th class="py-3 px-4">Inspection Flag</th>
                    <th class="py-3 px-4 min-w-[220px]">Inspection Remarks / Comment</th>
                    <th class="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${inventoryItems.length === 0 ? `
                    <tr><td colspan="7" class="py-6 text-center text-slate-400">No equipment items found in database.</td></tr>
                  ` : inventoryItems.map(item => {
                    const isFixed = (item.inspection_status === 'Fixed');
                    const isDamaged = (item.inspection_status === 'Damaged');
                    const isMissing = (item.inspection_status === 'Missing');
                    return `
                      <tr class="hover:bg-slate-50/70 transition" id="row_inv_${item.equipment_id}">
                        <td class="py-3 px-4 font-bold text-slate-900">${item.equipment_name}</td>
                        <td class="py-3 px-4">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${item.category}</span>
                        </td>
                        <td class="py-3 px-4 font-mono text-slate-600 font-bold">${item.serial_number || item.standard_tag || item.equipment_id}</td>
                        <td class="py-3 px-4 text-center font-bold text-slate-800">${item.quantity || 1}</td>
                        <td class="py-3 px-4">
                          ${isFixed ? `
                            <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                              <span>✓</span> <span>Fixed (Gov Certified)</span>
                            </span>
                          ` : `
                            <div class="flex items-center space-x-3">
                              <label class="inline-flex items-center space-x-1 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  class="inv-chk-damaged rounded text-red-600 focus:ring-red-500" 
                                  id="chk_dmg_${item.equipment_id}"
                                  ${isDamaged ? 'checked' : ''}
                                  onchange="onTCInspectionCheckboxChange('${item.equipment_id}', 'Damaged')"
                                />
                                <span class="text-[11px] font-semibold text-red-700">Damaged</span>
                              </label>
                              <label class="inline-flex items-center space-x-1 cursor-pointer">
                                <input 
                                  type="checkbox" 
                                  class="inv-chk-missing rounded text-amber-600 focus:ring-amber-500" 
                                  id="chk_mis_${item.equipment_id}"
                                  ${isMissing ? 'checked' : ''}
                                  onchange="onTCInspectionCheckboxChange('${item.equipment_id}', 'Missing')"
                                />
                                <span class="text-[11px] font-semibold text-amber-700">Missing</span>
                              </label>
                            </div>
                          `}
                        </td>
                        <td class="py-3 px-4">
                          <input 
                            type="text" 
                            id="comment_inv_${item.equipment_id}" 
                            value="${item.trainee_comment || ''}"
                            placeholder="e.g. Verified functional or report defect notes" 
                            class="w-full border border-slate-300 rounded px-2.5 py-1 text-xs text-slate-800 outline-none focus:border-blue-600 bg-white"
                          />
                        </td>
                        <td class="py-3 px-4" id="status_badge_${item.equipment_id}">
                          ${isFixed ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">Fixed</span>
                          ` : isDamaged ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Damaged</span>
                          ` : isMissing ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Missing</span>
                          ` : `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Good</span>
                          `}
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SUB-TAB 3: COMMENTS -->
      ${activeSubTab === 'comments' ? `
        <div class="space-y-6">
          <!-- Submit Ad-Hoc Comment / Issue Form -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4 text-xs">
            <div class="border-b pb-2">
              <h3 class="font-bold text-slate-900 text-sm">Submit Equipment Comment / Issue</h3>
              <p class="text-xs text-slate-500">Submit ad-hoc maintenance remarks or defect reports for ${user.centre_name}</p>
            </div>

            <form id="issueReportForm" onsubmit="handleTCIssueSubmit(event)" class="space-y-4">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Equipment Name / ID *</label>
                  <input type="text" id="issueEqName" required placeholder="Enter equipment name or ID" class="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-600 bg-white" />
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Issue Type</label>
                  <select id="issueType" class="w-full border rounded-lg px-3 py-2 outline-none bg-white">
                    <option value="Damaged">Damaged</option>
                    <option value="Not Working">Not Working</option>
                    <option value="Missing">Missing</option>
                    <option value="Maintenance Required">Maintenance Required</option>
                  </select>
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 mb-1">Date</label>
                  <input type="date" id="issueDate" value="${todayStr}" class="w-full border rounded-lg px-3 py-2 outline-none bg-white" />
                </div>
              </div>

              <div>
                <label class="block font-semibold text-slate-700 mb-1">Comment *</label>
                <textarea id="issueComment" required rows="3" placeholder="Describe the issue or equipment condition remarks" class="w-full border rounded-lg px-3 py-2 outline-none focus:border-blue-600 bg-white"></textarea>
              </div>

              <div class="flex justify-end pt-2">
                <button type="submit" class="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer">
                  SUBMIT COMMENT / ISSUE
                </button>
              </div>
            </form>
          </div>

          <!-- Previously Submitted Issues / Comments Table -->
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="px-5 py-3 border-b border-slate-200 bg-slate-50 font-bold text-xs text-slate-800 flex items-center justify-between">
              <span>Comments & Issues Log (${issues.length} Records)</span>
              <span class="text-[10px] text-slate-400 font-mono">${user.centre_name}</span>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
                  <tr>
                    <th class="py-3 px-4">Equipment</th>
                    <th class="py-3 px-4">Issue Type</th>
                    <th class="py-3 px-4">Comment</th>
                    <th class="py-3 px-4">Reported By</th>
                    <th class="py-3 px-4">Date</th>
                    <th class="py-3 px-4">Status</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${issues.length === 0 ? `
                    <tr><td colspan="6" class="py-6 text-center text-slate-400">No issues or comments reported yet.</td></tr>
                  ` : issues.map(iss => {
                    const isFixed = (iss.status === 'Fixed');
                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-4 font-bold text-slate-900">${iss.equipment_name}</td>
                        <td class="py-2.5 px-4 font-semibold text-amber-700">${iss.issue_type}</td>
                        <td class="py-2.5 px-4 text-slate-700 max-w-sm font-normal">"${iss.comment}"</td>
                        <td class="py-2.5 px-4 text-slate-500">${iss.reported_by}</td>
                        <td class="py-2.5 px-4 font-mono text-slate-500">${iss.date}</td>
                        <td class="py-2.5 px-4">
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isFixed ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                            ${isFixed ? '✓ Fixed' : iss.status}
                          </span>
                        </td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

    </div>
  `;
}

// Sub-tab switcher for Training Centre Officials Equipment page
window.switchTCEquipmentSubTab = function(subTab) {
  state.tcEquipmentSubTab = subTab;
  renderTCEquipmentIssues(document.getElementById('mainContentContainer'));
};

// Live calculation helper for damaged/missing in Trainee category cards
window.updateTCDamagedCalc = function(catKey, allotted, inputVal) {
  const el = document.getElementById(`tcDamagedCalc_${catKey}`);
  if (!el) return;
  const num = Number(inputVal);
  if (isNaN(num) || inputVal === '' || num < 0) {
    el.textContent = `0 Units`;
    return;
  }
  const damaged = Math.max(0, allotted - num);
  el.textContent = `${damaged} Units`;
};

// Checkbox change handler for itemized equipment list
window.onTCInspectionCheckboxChange = function(eqId, changedType) {
  const chkDmg = document.getElementById(`chk_dmg_${eqId}`);
  const chkMis = document.getElementById(`chk_mis_${eqId}`);
  const statusBadge = document.getElementById(`status_badge_${eqId}`);
  if (!chkDmg || !chkMis || !statusBadge) return;

  if (changedType === 'Damaged' && chkDmg.checked) {
    chkMis.checked = false;
  } else if (changedType === 'Missing' && chkMis.checked) {
    chkDmg.checked = false;
  }

  if (chkDmg.checked) {
    statusBadge.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Damaged</span>`;
  } else if (chkMis.checked) {
    statusBadge.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Missing</span>`;
  } else {
    statusBadge.innerHTML = `<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Good</span>`;
  }
};

// Trainee submits condition report for all categories
async function submitTCCategoryConditionReports() {
  const user = state.currentUser;
  const centreId = user.centre_id || 'TC1';
  const inputs = document.querySelectorAll('input[id^="tcGoodInput_"]');
  const reports = [];

  for (const inp of inputs) {
    const key = inp.id.replace('tcGoodInput_', '');
    const maxVal = Number(inp.getAttribute('max') || 0);
    const valStr = inp.value.trim();
    if (valStr === '' || isNaN(valStr)) {
      showToast(`Please enter a valid count for ${key}.`, 'error');
      inp.focus();
      return;
    }
    const goodQty = Number(valStr);
    if (!Number.isInteger(goodQty) || goodQty < 0) {
      showToast(`Count for ${key} must be a non-negative whole number.`, 'error');
      inp.focus();
      return;
    }
    if (goodQty > maxVal) {
      showToast(`Reported good equipment for ${key} (${goodQty}) cannot exceed allocated quantity (${maxVal}).`, 'error');
      inp.focus();
      return;
    }
    reports.push({
      category_key: key,
      reported_good: goodQty
    });
  }

  const btn = document.getElementById('btnSaveTCCategories');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SUBMITTING...';
  }

  try {
    const res = await fetch('/api/equipment/categories/report-condition', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: centreId,
        reports: reports,
        submitted_by: user.name || 'Training Centre Official'
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('All category condition reports submitted successfully to Government Portal.', 'success');
      await renderTCEquipmentIssues(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to submit category reports.', 'error');
    }
  } catch (err) {
    console.error('Error submitting category reports:', err);
    showToast('Network error while submitting category reports.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'SUBMIT ALL CATEGORY REPORTS';
    }
  }
}

// Trainee submits itemized equipment inspection list
async function submitTCItemInspection() {
  const user = state.currentUser;
  const centreId = user.centre_id || 'TC1';
  const rows = document.querySelectorAll('tr[id^="row_inv_"]');
  const inspections = [];

  for (const row of rows) {
    const eqId = row.id.replace('row_inv_', '');
    const chkDmg = document.getElementById(`chk_dmg_${eqId}`);
    const chkMis = document.getElementById(`chk_mis_${eqId}`);
    const commentInput = document.getElementById(`comment_inv_${eqId}`);
    const comment = commentInput ? commentInput.value.trim() : '';

    let status = 'Good';
    if (chkDmg && chkDmg.checked) status = 'Damaged';
    else if (chkMis && chkMis.checked) status = 'Missing';

    inspections.push({
      equipment_id: eqId,
      inspection_status: status,
      comment: comment
    });
  }

  const btn = document.getElementById('btnSaveTCInspection');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SAVING...';
  }

  try {
    const res = await fetch('/api/equipment/inventory/inspect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: centreId,
        inspections: inspections,
        inspected_by: user.name || 'Training Centre Official'
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('Equipment inspection results and remarks saved persistently.', 'success');
      await renderTCEquipmentIssues(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to save inspection results.', 'error');
    }
  } catch (err) {
    console.error('Error submitting inspection:', err);
    showToast('Network error while saving inspection.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'SAVE INSPECTION REPORT';
    }
  }
}

// ===========================================================================
// SECTION 10 & 17: GOVERNMENT OFFICIAL DASHBOARD OVERVIEW
// ===========================================================================
async function renderGovDashboard(container) {
  const overview = await fetch('/api/dashboard/overview').then(r => r.json());
  const centres = overview.centres || [];

  container.innerHTML = `
    <div class="space-y-6">
      <div class="border-b border-slate-200 pb-3 flex items-center justify-between">
        <div>
          <h2 class="text-xl font-bold text-slate-900">National Government Monitoring Dashboard</h2>
          <p class="text-xs text-slate-500">Dual Training Centre Overview: Attendance, AI Camera Feeds & Defect Tracking</p>
        </div>
      </div>

      <!-- Training Centres Overview Cards (Section 17 Spec) -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        ${centres.map(c => `
          <div class="bg-white rounded-xl border ${c.is_camera_covered ? 'border-red-500 ring-2 ring-red-400' : 'border-slate-200'} shadow-sm p-6 space-y-4 transition">
            <div class="flex items-center justify-between border-b pb-3">
              <div>
                <div class="flex items-center gap-2">
                  <h3 class="font-bold text-slate-900 text-base">${c.centre_name}</h3>
                  ${c.is_camera_covered ? `
                    <span class="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-600 text-white animate-pulse flex items-center gap-1">
                      <span>🚨</span>
                      <span>camera covered</span>
                    </span>
                  ` : ''}
                </div>
                <span class="text-[11px] text-slate-400 font-mono">Scope ID: ${c.centre_id}</span>
              </div>
              <button onclick="openAttendanceHistory('${c.centre_id}')" class="px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded text-xs font-bold border border-blue-200">
                Attendance History &rarr;
              </button>
            </div>

            <!-- Prominent Warning / Tampering Status Banner -->
            ${c.is_camera_covered ? `
              <div class="p-3 bg-red-50 border border-red-200 rounded-lg text-xs space-y-1.5">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-red-700 uppercase tracking-wide text-[11px] flex items-center gap-1">
                    <span>⚠️</span>
                    <span>SURVEILLANCE ALERT: camera covered</span>
                  </span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-black bg-red-600 text-white animate-pulse">Ongoing</span>
                </div>
                <div class="text-[11px] text-red-800 font-medium">
                  Covered: <b class="font-bold font-mono">${c.covered_time || 'Active'}</b>
                </div>
                <div class="text-[11px] text-red-700 font-semibold">
                  ${c.covered_summary || `Covered: ${c.times_covered_this_month || 0} times this month (${c.times_covered_total || 0} total)`}
                </div>
                <p class="text-red-700 text-[10.5px] leading-tight">
                  Camera lens is physically covered or obstructed. Video feed is blocked.
                </p>
                <div class="pt-1 flex items-center justify-between border-t border-red-200/80">
                  <button onclick="navigateTo('footage_alerts')" class="text-red-700 font-bold underline hover:text-red-900 text-[11px]">
                    View in Footage Alerts &rarr;
                  </button>
                  <button onclick="state.govSelectedCentreId='${c.centre_id}'; navigateTo('footage')" class="text-red-700 font-bold underline hover:text-red-900 text-[11px]">
                    Inspect Camera &rarr;
                  </button>
                </div>
              </div>
            ` : (c.times_covered_total > 0 ? `
              <div class="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
                <div class="flex items-center justify-between">
                  <span class="font-bold text-slate-700 text-[11px]">Surveillance Audit Status:</span>
                  <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">${c.status_display || 'Resolved'}</span>
                </div>
                <div class="text-[11px] text-slate-600">
                  ${c.covered_summary || `Covered: ${c.times_covered_this_month || 0} times this month (${c.times_covered_total || 0} total)`}
                </div>
                ${c.covered_time ? `<div class="text-[10px] text-slate-400 font-mono">Last covered: ${c.covered_time}</div>` : ''}
              </div>
            ` : '')}

            <!-- Attendance & AI Camera Metrics (Section 17) -->
            <div class="grid grid-cols-2 gap-3 text-xs">
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span class="text-slate-400 font-bold block text-[10px] uppercase">Official Attendance</span>
                <span class="font-black text-blue-700 text-lg mt-1 block">
                  ${c.attendance_present} / ${c.attendance_total}
                </span>
              </div>
              <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
                <span class="text-slate-400 font-bold block text-[10px] uppercase">AI Camera Count</span>
                <span class="font-black ${c.is_camera_covered ? 'text-red-600' : 'text-emerald-700'} text-lg mt-1 block">
                  ${c.is_camera_covered ? 'BLOCKED' : `${c.camera_visible} / ${c.camera_total}`}
                </span>
              </div>
            </div>

            <!-- Alerts for this Centre -->
            <div class="p-3 bg-slate-50 rounded-lg border text-xs space-y-1">
              <div class="font-bold text-slate-700 text-[11px] uppercase">Active Alerts</div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Discrepancy Status:</span>
                ${c.difference > 0 ? `
                  <span class="font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded text-[10px]">
                    ⚠ ${c.difference} Student Gap
                  </span>
                ` : `
                  <span class="font-bold text-emerald-700">✓ Reconciled (0 Gap)</span>
                `}
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Open Equipment Issues:</span>
                <span class="font-bold ${c.open_issues > 0 ? 'text-red-700' : 'text-slate-500'}">
                  ${c.open_issues} Issues Reported
                </span>
              </div>
              <div class="flex items-center justify-between text-slate-600">
                <span>Camera Surveillance:</span>
                ${c.is_camera_covered ? `
                  <span class="font-bold text-red-600 flex items-center gap-1.5">
                    <span class="w-2 h-2 rounded-full bg-red-600 animate-ping"></span>
                    <span>camera covered</span>
                  </span>
                ` : `
                  <span class="font-bold text-emerald-600">● ${c.camera_status || 'CAMERA ON'}</span>
                `}
              </div>
              <div class="flex items-center justify-between text-slate-600 text-[11px] pt-1 border-t border-slate-200/60">
                <span>Tampering History:</span>
                <span class="font-semibold text-slate-800">${c.covered_summary || `Covered: ${c.times_covered_this_month || 0} times this month (${c.times_covered_total || 0} total)`}</span>
              </div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

// ===========================================================================
// SECTION 10B: ATTENDANCE HISTORY HISTORICAL VIEW & AUDIT (SECTIONS 8, 9, 10)
// ===========================================================================
function openAttendanceHistory(centreId) {
  if (centreId) {
    state.govSelectedCentreId = centreId;
  }
  navigateTo('attendance_history');
}

function openInspectScope(centreId) {
  openAttendanceHistory(centreId);
}

async function changeAttendanceHistoryMonth(monthKey) {
  state.attendanceHistoryMonth = monthKey;
  state.inspectScopeMonth = monthKey;
  const container = document.getElementById('mainContentContainer');
  await renderAttendanceHistory(container);
}

function changeInspectScopeMonth(monthKey) {
  changeAttendanceHistoryMonth(monthKey);
}

async function renderAttendanceHistory(container) {
  const centreId = state.govSelectedCentreId || 'TC1';
  const monthKey = state.attendanceHistoryMonth || state.inspectScopeMonth || '2026-10';

  const res = await fetch(`/api/attendance-history?centre_id=${centreId}&month=${monthKey}`).then(r => r.json());
  if (!res.success) {
    container.innerHTML = `<div class="p-8 text-center text-red-600 font-bold">Failed to load attendance history: ${res.message || 'Unknown error'}</div>`;
    return;
  }

  const summary = res.month_summary || {};
  const records = res.records || [];

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header Banner with Breadcrumb & Scope Context -->
      <div class="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div class="flex items-center space-x-2 text-xs text-slate-500 mb-1">
            <button onclick="navigateTo('dashboard')" class="text-blue-600 hover:underline font-semibold">← Dashboard</button>
            <span>/</span>
            <span>Attendance History: ${res.centre_name}</span>
          </div>
          <h2 class="text-xl font-bold text-slate-900">Attendance History — ${res.centre_name}</h2>
          <p class="text-xs text-slate-500">
            ${res.centre_name} (${res.centre_id}) • ${res.location} • Sanctioned Capacity: ${res.capacity} Trainees
          </p>
        </div>
      </div>

      <!-- Month-Wise Organisation & Summary KPIs (Requirement 9 & 2) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Monthly Attendance Summary & Filter</h3>
            <p class="text-[11px] text-slate-500">Filter historical attendance records by calendar month</p>
          </div>
          <!-- Month Filter Buttons -->
          <div class="inline-flex rounded-lg border border-slate-300 p-1 bg-slate-50 text-xs">
            ${res.available_months.map(m => `
              <button 
                onclick="changeAttendanceHistoryMonth('${m.key}')" 
                class="px-3 py-1 rounded-md font-semibold transition ${
                  res.selected_month === m.key 
                    ? 'bg-blue-600 text-white shadow-sm' 
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                }"
              >
                ${m.label}
              </button>
            `).join('')}
          </div>
        </div>

        <!-- Month Summary KPI Cards -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <div class="p-3 bg-slate-50 rounded-lg border border-slate-100">
            <span class="text-slate-400 font-bold block text-[10px] uppercase">Total Audited Records</span>
            <span class="text-xl font-black text-slate-900 mt-0.5 block">${summary.total_records || 0}</span>
            <span class="text-[10px] text-slate-500">Class sessions tracked</span>
          </div>
          <div class="p-3 bg-emerald-50/70 rounded-lg border border-emerald-100">
            <span class="text-emerald-700 font-bold block text-[10px] uppercase">Matched Records</span>
            <span class="text-xl font-black text-emerald-800 mt-0.5 block">${summary.matched_count || 0}</span>
            <span class="text-[10px] text-emerald-600">Reconciled (0 difference)</span>
          </div>
          <div class="p-3 bg-amber-50/70 rounded-lg border border-amber-100">
            <span class="text-amber-700 font-bold block text-[10px] uppercase">Discrepancy Count</span>
            <span class="text-xl font-black text-amber-800 mt-0.5 block">${summary.discrepancy_count || 0}</span>
            <span class="text-[10px] text-amber-600">Gaps flagged by AI camera</span>
          </div>
          <div class="p-3 bg-blue-50/70 rounded-lg border border-blue-100">
            <span class="text-blue-700 font-bold block text-[10px] uppercase">Discrepancy Frequency</span>
            <span class="text-xl font-black text-blue-900 mt-0.5 block">${summary.discrepancy_pct || 0}%</span>
            <span class="text-[10px] text-blue-700 truncate block">${summary.risk_label || 'Normal'}</span>
          </div>
        </div>
      </div>

      <!-- 10-Column Historical Attendance Audit Table -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="p-4 border-b flex items-center justify-between bg-slate-50/60">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Historical Attendance Records</h3>
            <p class="text-[11px] text-slate-500">Official manual submissions compared with AI camera headcounts</p>
          </div>
          <div class="text-xs text-slate-400 font-mono">
            ${records.length} records in view
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left text-xs">
            <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
              <tr>
                <th class="py-3 px-3">Date</th>
                <th class="py-3 px-2">Day</th>
                <th class="py-3 px-2">Time</th>
                <th class="py-3 px-3">Subject</th>
                <th class="py-3 px-3">Attendance Submitted By</th>
                <th class="py-3 px-3 text-center">Official Attendance</th>
                <th class="py-3 px-3 text-center">AI Camera Count</th>
                <th class="py-3 px-2 text-center">Total Students</th>
                <th class="py-3 px-2 text-center">Difference</th>
                <th class="py-3 px-3 text-center">Discrepancy Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              ${records.length === 0 ? `
                <tr>
                  <td colspan="10" class="py-8 text-center text-slate-400">No historical attendance records found for this period.</td>
                </tr>
              ` : records.map(r => `
                <tr class="hover:bg-slate-50 transition">
                  <td class="py-2.5 px-3 font-mono font-medium text-slate-900">${r.date}</td>
                  <td class="py-2.5 px-2 text-slate-600">${r.day}</td>
                  <td class="py-2.5 px-2 font-mono text-slate-500">${r.time}</td>
                  <td class="py-2.5 px-3 font-semibold text-slate-800">${r.subject}</td>
                  <td class="py-2.5 px-3 text-slate-600">${r.submitted_by}</td>
                  <td class="py-2.5 px-3 text-center font-bold text-blue-700">${r.official_attendance}</td>
                  <td class="py-2.5 px-3 text-center font-bold text-emerald-700">${r.ai_camera_count}</td>
                  <td class="py-2.5 px-2 text-center text-slate-500">${r.total_students}</td>
                  <td class="py-2.5 px-2 text-center">
                    ${r.difference > 0 
                      ? `<span class="font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded">${r.difference}</span>` 
                      : `<span class="text-slate-400">0</span>`}
                  </td>
                  <td class="py-2.5 px-3 text-center">
                    ${r.discrepancy_status === 'Discrepancy' ? `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        ⚠ Discrepancy
                      </span>
                    ` : `
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        ✓ Matched
                      </span>
                    `}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;
}

async function renderInspectScope(container) {
  return renderAttendanceHistory(container);
}

// ===========================================================================
// SECTION 11: GOVERNMENT ATTENDANCE SECTION (READ-ONLY)
// ===========================================================================
window.onGovAttendanceCentreChange = async function(val) {
  state.govSelectedCentreId = val || 'TC1';
  state.govAttendanceDate = ''; // Reset to auto-fetch latest session for selected centre
  state.govAttendanceSession = '';
  updateHeaderProfile();
  const container = document.getElementById('mainContentContainer');
  if (container) await renderGovAttendance(container);
};

window.onGovAttendanceDateChange = async function(val) {
  state.govAttendanceDate = val;
  const container = document.getElementById('mainContentContainer');
  if (container) await renderGovAttendance(container);
};

window.onGovAttendanceSessionChange = async function(val) {
  state.govAttendanceSession = val;
  const container = document.getElementById('mainContentContainer');
  if (container) await renderGovAttendance(container);
};


async function renderGovAttendance(container) {
  const centreId = state.govSelectedCentreId || 'TC1';
  state.govSelectedCentreId = centreId;
  const centreName = centreId === 'TC1' ? 'Training Centre 1' : 'Training Centre 2';

  const dateVal = state.govAttendanceDate || '';
  const sessionVal = state.govAttendanceSession || 'Session 1';

  let url = `/api/attendance?centre_id=${encodeURIComponent(centreId)}`;
  if (dateVal) {
    url += `&date=${encodeURIComponent(dateVal)}`;
  }
  if (sessionVal) {
    url += `&session_name=${encodeURIComponent(sessionVal)}`;
  }

  const res = await fetch(url).then(r => r.json());
  const effectiveDate = res.date || dateVal || new Date().toISOString().substring(0, 10);
  state.govAttendanceDate = effectiveDate;
  const effectiveSession = res.session_name || sessionVal;
  state.govAttendanceSession = effectiveSession;

  const masterStudents = res.registered_students && res.registered_students.length > 0 ? res.registered_students : (res.records || []);
  const records = res.records || [];
  const statusMap = new Map();
  records.forEach(r => {
    if (r && r.roll_number !== undefined) statusMap.set(r.roll_number, r.status);
  });
  const displayRecords = masterStudents.map(s => ({
    roll_number: s.roll_number,
    student_name: s.student_name || s.name || `Student ${s.roll_number}`,
    status: statusMap.get(s.roll_number) || s.status || 'Absent'
  }));

  const isLocked = Boolean(res.is_locked);
  const presentCount = res.present_count !== undefined ? res.present_count : displayRecords.filter(r => r.status === 'Present').length;
  const totalCount = res.total_students || displayRecords.length || 30;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header Bar with Title, Scope & Center/Date Controls -->
      <div class="border-b border-slate-200 pb-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📋</span>
            <h2 class="text-xl font-bold text-slate-900">Submitted Attendance — ${centreName}</h2>
          </div>
          <p class="text-xs text-slate-500 mt-0.5">Official verified attendance records submitted by Training Centre Officials</p>
        </div>

        <!-- Centre, Date & Session Filter Controls -->
        <div class="flex flex-wrap items-center gap-2.5">
          <!-- Centre Switcher -->
          <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
            <span class="text-slate-400 font-semibold">Centre:</span>
            <select 
              id="govAttCentreSelect" 
              onchange="onGovAttendanceCentreChange(this.value)"
              class="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="TC1" ${centreId === 'TC1' ? 'selected' : ''}>Training Centre 1 (TC1)</option>
              <option value="TC2" ${centreId === 'TC2' ? 'selected' : ''}>Training Centre 2 (TC2)</option>
            </select>
          </div>

          <!-- Date Picker -->
          <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
            <span class="text-slate-400 font-semibold">Date:</span>
            <input 
              type="date" 
              id="govAttDateSelect" 
              value="${effectiveDate}"
              onchange="onGovAttendanceDateChange(this.value)"
              class="font-mono font-semibold text-slate-800 bg-transparent outline-none cursor-pointer"
            />
          </div>

          <!-- Session Selector -->
          <div class="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 shadow-xs text-xs">
            <span class="text-slate-400 font-semibold">Session:</span>
            <select 
              id="govAttSessionSelect" 
              onchange="onGovAttendanceSessionChange(this.value)"
              class="font-bold text-slate-800 bg-transparent outline-none cursor-pointer"
            >
              <option value="Session 1" ${effectiveSession === 'Session 1' ? 'selected' : ''}>Session 1</option>
              <option value="Session 2" ${effectiveSession === 'Session 2' ? 'selected' : ''}>Session 2</option>
            </select>
          </div>

          <div class="px-3 py-1.5 bg-slate-100 text-slate-700 font-bold text-xs rounded-lg border border-slate-200 shadow-xs flex items-center gap-1.5">
            <span>🔒</span>
            <span>AUDIT SCOPE</span>
          </div>
        </div>
      </div>


      <!-- Attendance Summary Card (Section 11 Spec) -->
      <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <!-- Present / Total KPI -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Trainee Attendance</div>
            <div class="text-3xl font-black text-blue-700 mt-1">
              ${presentCount} <span class="text-lg text-slate-400 font-semibold">/ ${totalCount}</span>
            </div>
            <div class="text-xs text-slate-500 mt-1">
              ${Math.round((presentCount / Math.max(1, totalCount)) * 100)}% attendance rate
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl text-blue-600 font-bold">
            👥
          </div>
        </div>

        <!-- Lock & Submission Status -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Submission Status</div>
            <div class="mt-1.5">
              ${isLocked ? `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  <span class="text-emerald-700 font-black">✓</span>
                  <span>Submitted & Locked</span>
                </span>
              ` : `
                <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                  <span>⏳</span>
                  <span>Pending Official Submission</span>
                </span>
              `}
            </div>
            <div class="text-xs text-slate-500 mt-1.5">
              ${res.session && res.session.submitted_at ? `Submitted at ${res.session.submitted_at}` : 'No submission lock timestamp recorded'}
            </div>
          </div>
          <div class="w-12 h-12 rounded-xl ${isLocked ? 'bg-emerald-50 border border-emerald-200 text-emerald-600' : 'bg-amber-50 border border-amber-200 text-amber-600'} flex items-center justify-center text-xl font-bold">
            ${isLocked ? '🔒' : '📝'}
          </div>
        </div>

        <!-- Scope & Centre Info -->
        <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Centre Scope</div>
            <div class="text-base font-bold text-slate-900 mt-1">${centreName}</div>
            <div class="text-xs text-slate-500 font-mono mt-0.5">${centreId} • ${effectiveDate} • ${effectiveSession}</div>
            <div class="text-[11px] text-slate-400 mt-1">${res.session && res.session.submitted_by ? `Official: ${res.session.submitted_by}` : 'Training Centre Official'}</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-xl font-bold text-slate-700">
            🏢
          </div>
        </div>
      </div>

      <!-- Read-Only Trainees Table (Section 11 Table Format) -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 class="font-bold text-slate-900 text-sm">Official Trainee Attendance Record</h3>
            <p class="text-xs text-slate-500">${displayRecords.length} registered students in ${centreName}</p>
          </div>
          <div class="text-xs font-mono text-slate-500">
            Present: <b class="text-emerald-700">${presentCount}</b> | Absent: <b class="text-red-600">${Math.max(0, totalCount - presentCount)}</b>
          </div>
        </div>

        <div class="overflow-x-auto max-h-[500px] overflow-y-auto custom-scroll">
          <table class="w-full text-left text-xs border-collapse">
            <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th class="py-3 px-4 w-28">Roll No.</th>
                <th class="py-3 px-4">Student Name</th>
                <th class="py-3 px-4 w-36 text-center">Attendance Status</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 font-medium">
              ${displayRecords.length === 0 ? `
                <tr>
                  <td colspan="3" class="py-12 text-center text-slate-400">
                    <div class="flex flex-col items-center justify-center space-y-2">
                      <span class="text-3xl">📝</span>
                      <div class="text-sm font-bold text-slate-700">No Attendance Records Found</div>
                      <div class="text-xs text-slate-400">No students registered or attendance records found for this date.</div>
                    </div>
                  </td>
                </tr>
              ` : displayRecords.map(r => `
                <tr class="hover:bg-slate-50 transition border-b border-slate-100">
                  <td class="py-2.5 px-4 font-mono font-bold text-slate-700">${r.roll_number}</td>
                  <td class="py-2.5 px-4 font-semibold text-slate-900">${r.student_name}</td>
                  <td class="py-2.5 px-4 text-center">
                    <span class="inline-flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-bold ${
                      r.status === 'Present' 
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                        : 'bg-red-100 text-red-800 border border-red-300'
                    }">
                      <span>${r.status === 'Present' ? '✓' : '✖'}</span>
                      <span>${r.status}</span>
                    </span>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

// ===========================================================================
// SECTIONS 12, 13, 14, 15: FOOTAGE / AI WEBCAM SURVEILLANCE (GOVERNMENT ONLY)
// ===========================================================================
async function renderGovFootage(container) {
  const centreId = state.govSelectedCentreId || 'TC1';
  let res;
  try {
    const response = await fetch(`/api/footage?centre_id=${centreId}`);
    if (!response.ok) {
      throw new Error(`Server returned HTTP ${response.status}`);
    }
    res = await response.json();
  } catch (err) {
    console.error('Failed to load footage data for', centreId, err);
    container.innerHTML = `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-8 text-center space-y-4 max-w-lg mx-auto my-8">
        <div class="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-2xl mx-auto">⚠️</div>
        <h3 class="text-base font-bold text-slate-800">Footage Data Unavailable</h3>
        <p class="text-xs text-slate-500 leading-relaxed">Could not retrieve camera surveillance information for ${centreId === 'TC1' ? 'Training Centre 1' : 'Training Centre 2'}. ${err.message || ''}</p>
        <button onclick="renderActiveView()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
          Retry Loading
        </button>
      </div>
    `;
    return;
  }
  state.cameraData = res;

  const totalStudents = res.total_students || state.cachedTotalStudents || 35;
  const officialCount = res.official_attendance_count !== undefined ? res.official_attendance_count : (state.cachedOfficialAttendance || 0);
  state.cachedTotalStudents = totalStudents;
  state.cachedOfficialAttendance = officialCount;

  const currentCount = state.latestLiveCount || 0;
  const diff = Math.abs(officialCount - currentCount);
  const discrepancy = diff > 0;

  const isTC2 = (centreId === 'TC2');

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header Bar with Title, Status & Controls (Sections 3, 4, 12) -->
      <div class="border-b border-slate-200 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Footage & AI Surveillance — ${res.centre_name}</h2>
          <p class="text-xs text-slate-500">${isTC2 ? 'Uploaded Video Footage • YOLOv8 Person & Computer Terminal Tracking' : 'Live Laptop Camera Feed • YOLOv8 Person Detection & Anonymous Headcount'}</p>
        </div>
        <div class="flex items-center space-x-3">
          ${isTC2 ? `
            <!-- TC2 Uploaded Footage Source Badge -->
            <span class="px-3 py-1 bg-purple-700 text-white font-bold text-xs rounded-full shadow flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
              📹 UPLOADED FOOTAGE (TC2)
            </span>

            <!-- TC2 Footage Play/Pause Controls -->
            <button id="btnPlayPauseFootage" onclick="toggleFootagePlayback()" class="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5">
              <span>⏸</span>
              <span id="btnPlayPauseText">PAUSE FOOTAGE</span>
            </button>
          ` : `
            <!-- Camera Status Badge (TC1 Laptop Webcam) -->
            <div id="cameraStatusBadge">
              ${getCameraStatusBadgeHTML()}
            </div>

            <!-- Camera Start / Stop Button (TC1 Laptop Webcam) -->
            <div id="cameraActionButton">
              ${getCameraActionButtonHTML()}
            </div>
          `}
        </div>
      </div>

      <!-- Discrepancy Warning Banner (Section 10 & 15 Spec) -->
      <div id="cameraDiscrepancyBanner">
        ${getDiscrepancyBannerHTML(officialCount, currentCount, totalStudents, diff, discrepancy)}
      </div>

      <!-- Category Detection Filter Tabs (Requirement 10) -->
      <div class="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div class="flex items-center space-x-2 flex-wrap gap-y-2">
          <span class="text-xs font-bold text-slate-500 uppercase tracking-wider">Object Category Filter:</span>
          <div class="flex flex-wrap gap-1.5" id="cameraCategoryTabs">
            ${renderCategoryFilterTabsHTML()}
          </div>
        </div>
        <div class="text-[11px] text-slate-500 font-medium hidden sm:block">
          Persistent Unique Counting Active Across Frames
        </div>
      </div>

      <!-- Live Video Feed & Bounding Box Canvas Overlay (Sections 1, 5, 6, 8) -->
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        <!-- Video Viewport (2 Columns) -->
        <div class="lg:col-span-2 bg-slate-950 rounded-xl overflow-hidden border border-slate-800 shadow-md flex flex-col self-start w-full">
          <div class="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between text-xs text-slate-300">
            <div class="font-mono font-bold text-white flex items-center gap-2">
              <span id="cameraFeedDot" class="w-2 h-2 rounded-full ${isTC2 || state.webcamStatus === 'ON' ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}"></span>
              <span>${res.camera_id} • ${res.centre_name}</span>
            </div>
            <div class="font-mono text-emerald-400 text-[11px]">
              ${isTC2 ? 'YOLOv8 Footage Person & Computer Detection Active' : 'YOLOv8 Live Person Detection Active'}
            </div>
          </div>

          <!-- Video Element with Overlay Canvas -->
          <div class="relative bg-slate-950 flex items-center justify-center aspect-video w-full overflow-hidden" id="webcamContainer">
            <!-- HTML Video: Native loop for TC2 uploaded footage; camera stream for TC1 (Rendered onto canvas with blur) -->
            <video 
              id="webcamVideo" 
              ${isTC2 ? `src="${res.video_url || 'uploads/tc2_uploaded_footage.mp4'}" loop muted playsinline autoplay crossorigin="anonymous"` : 'autoplay playsinline muted'}
              class="w-full h-full object-contain ${isTC2 || state.webcamStatus === 'ON' ? '' : 'hidden'}"
              style="display: none; opacity: 0; position: absolute; pointer-events: none;"
            ></video>

            <!-- Display Canvas for Rendering Blurred Video, Bounding Boxes & HUD Overlays -->
            <canvas 
              id="webcamCanvas" 
              class="absolute inset-0 w-full h-full pointer-events-none ${isTC2 || state.webcamStatus === 'ON' ? '' : 'hidden'}"
            ></canvas>

            <!-- Anonymous STU Tracking HUD Tag (Section 8) -->
            <div id="cameraHudTracked" class="absolute top-3 left-3 bg-slate-900/85 backdrop-blur border border-slate-700 rounded px-3 py-1.5 text-[11px] font-mono text-emerald-400 space-y-0.5 ${isTC2 || state.webcamStatus === 'ON' ? '' : 'hidden'}">
              <div>TRACKED: <span class="font-bold text-white" id="hudTrackedRange">${isTC2 ? 'STU01 – STU04 | CMP01 – CMP05' : `STU01 – STU${currentCount < 10 ? '0' + Math.max(1, currentCount) : currentCount}`}</span></div>
              <div class="text-slate-400 text-[10px]">${isTC2 ? 'UPLOADED FOOTAGE • ANONYMOUS DETECTIONS' : 'ANONYMOUS DETECTIONS (ZERO BIOMETRICS)'}</div>
            </div>

            <!-- Inactive / Error State Overlay (Section 2 & 11) for TC1 -->
            <div id="cameraStateOverlay" class="${isTC2 || state.webcamStatus === 'ON' ? 'hidden' : 'flex'} flex-col items-center justify-center p-8 text-center space-y-4 max-w-md">
              ${getCameraStateOverlayHTML()}
            </div>
          </div>
        </div>

        <!-- Prominent AI Camera Count & Comparison Panel (One Card Per Category) -->
        <div class="space-y-4" id="surveillanceMetricsContainer">
          ${renderSelectedCategoryCardHTML(res, state.activeCameraTab || 'Attendance')}
        </div>

      </div>

      <!-- Anonymous Tracking Policy (Collapsible Dropdown Accordion at Bottom of Footage Page) -->
      <div class="mt-6">
        <details class="group bg-white rounded-xl border border-slate-200 shadow-sm transition overflow-hidden">
          <summary class="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 select-none text-slate-800 font-semibold text-xs uppercase tracking-wider">
            <div class="flex items-center gap-2">
              <span class="text-blue-600 font-bold">🛡️</span>
              <span>Anonymous Tracking Policy</span>
            </div>
            <svg class="w-4 h-4 text-slate-500 transition-transform duration-200 group-open:rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </summary>
          <div class="px-5 pb-4 pt-1 text-xs text-slate-600 leading-relaxed space-y-2 border-t border-slate-100 bg-slate-50/50">
            <div>Detected occupants are assigned temporary tracking labels (<code>STU01</code>, <code>STU02</code>) without recording or processing biometric facial features.</div>
            <div class="text-[11px] text-slate-500 pt-1.5 border-t border-slate-200/80">* Headcounts are aggregate only. Individual student absences are not attributed to camera counts.</div>
          </div>
        </details>
      </div>
    </div>
  `;

  // Pre-load TensorFlow.js and BlazeFace models for detection and face privacy
  tfAI.init().catch(() => {});

  // Attach stream or video feed according to centre mode
  if (isTC2) {
    // Populate recorded footage cache immediately so faces are blurred on frame 0
    if (res.footage_face_timeline && Array.isArray(res.footage_face_timeline) && res.footage_face_timeline.length > 0) {
      state.recordedFootageCache = res.footage_face_timeline.slice();
    } else if (!state.recordedFootageCache || state.recordedFootageCache.length === 0) {
      fetch('/api/camera/footage_timeline?centre_id=TC2')
        .then(r => r.json())
        .then(d => {
          if (d.success && Array.isArray(d.timeline) && d.timeline.length > 0) {
            state.recordedFootageCache = d.timeline;
          }
        })
        .catch(() => {});
    }

    // TC2 uses uploaded video footage; stop any active laptop camera stream
    if (state.webcamStream) {
      state.webcamStream.getTracks().forEach(track => {
        try { track.stop(); } catch (e) {}
      });
      state.webcamStream = null;
      state.webcamStatus = 'OFF';
    }
    const videoEl = document.getElementById('webcamVideo');
    if (videoEl) {
      videoEl.srcObject = null;
      videoEl.crossOrigin = 'anonymous';
      videoEl.muted = true;
      videoEl.src = res.video_url || 'uploads/tc2_uploaded_footage.mp4';
      videoEl.play().catch(e => console.log('Footage play notice:', e));
    }
    startLiveFrameDetection();
  } else {
    // TC1 continues using live laptop webcam
    const videoEl = document.getElementById('webcamVideo');
    if (videoEl && videoEl.src) {
      videoEl.removeAttribute('src');
    }
    if (state.webcamStream) {
      if (videoEl) {
        videoEl.style.display = 'none';
        videoEl.srcObject = state.webcamStream;
        videoEl.play().catch(e => console.log('Video play error:', e));
      }
      startLiveFrameDetection();
      updateCameraUIState();
    } else {
      // Automatically request laptop webcam on first visit for TC1
      startLaptopCamera().catch(e => console.warn('Webcam auto-start notice:', e));
    }
  }
}

// ---------------------------------------------------------------------------
// WEBCAM LIFECYCLE & YOLO DETECTION CONTROLS (SECTIONS 1, 2, 3, 4, 5, 6, 8, 11, 12)
// ---------------------------------------------------------------------------
function getCameraStatusBadgeHTML() {
  if (state.webcamStatus === 'ON') {
    return `
      <span class="px-3 py-1 bg-emerald-600 text-white font-bold text-xs rounded-full shadow flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-white animate-pulse"></span>
        🟢 CAMERA ON
      </span>
    `;
  } else if (state.webcamStatus === 'PERMISSION_REQUIRED') {
    return `
      <span class="px-3 py-1 bg-amber-600 text-white font-bold text-xs rounded-full shadow flex items-center gap-1.5">
        🟠 CAMERA PERMISSION REQUIRED
      </span>
    `;
  } else {
    return `
      <span class="px-3 py-1 bg-red-600 text-white font-bold text-xs rounded-full shadow flex items-center gap-1.5">
        <span class="w-2 h-2 rounded-full bg-white"></span>
        🔴 CAMERA OFF
      </span>
    `;
  }
}

function getCameraActionButtonHTML() {
  if (state.webcamStatus === 'ON') {
    return `
      <button onclick="stopLaptopCamera()" class="px-4 py-1.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5">
        <span>⏹</span>
        <span>STOP CAMERA</span>
      </button>
    `;
  } else {
    return `
      <button onclick="startLaptopCamera()" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5">
        <span>▶</span>
        <span>START CAMERA</span>
      </button>
    `;
  }
}

function getCameraStateOverlayHTML() {
  if (state.cameraErrorMsg) {
    return `
      <div class="w-12 h-12 rounded-full bg-red-900/60 text-red-400 flex items-center justify-center text-2xl mb-2">⚠️</div>
      <h4 class="text-white font-bold text-sm">Camera Notice</h4>
      <p class="text-slate-300 text-xs leading-relaxed">${state.cameraErrorMsg}</p>
      <button onclick="startLaptopCamera()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
        TRY AGAIN
      </button>
    `;
  } else if (state.webcamStatus === 'PERMISSION_REQUIRED') {
    return `
      <div class="w-12 h-12 rounded-full bg-amber-900/60 text-amber-400 flex items-center justify-center text-2xl mb-2 animate-pulse">📷</div>
      <h4 class="text-white font-bold text-sm">Camera Permission Requested</h4>
      <p class="text-slate-400 text-xs">Please allow this website to use your laptop camera in the browser prompt.</p>
    `;
  } else {
    return `
      <div class="w-12 h-12 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center text-2xl mb-2">📹</div>
      <h4 class="text-white font-bold text-sm">Laptop Camera Inactive</h4>
      <p class="text-slate-400 text-xs">Click START CAMERA to turn on the laptop camera and begin live YOLO person headcount.</p>
      <button onclick="startLaptopCamera()" class="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition">
        START CAMERA
      </button>
    `;
  }
}

function getValidCategoryTab(tab) {
  const valid = ['Attendance', 'Devices', 'Machines', 'Fans', 'Tools', 'Desks'];
  if (tab && valid.includes(tab)) return tab;
  return 'Attendance';
}

function renderCategoryFilterTabsHTML() {
  const tabs = [
    { id: 'Attendance', label: 'Attendance', icon: '👥' },
    { id: 'Devices', label: 'Devices', icon: '🖥️' },
    { id: 'Machines', label: 'Machines', icon: '⚙️' },
    { id: 'Fans', label: 'Fans', icon: '🌀' },
    { id: 'Tools', label: 'Tools', icon: '🔧' },
    { id: 'Desks', label: 'Desks', icon: '🪑' }
  ];
  const activeTab = getValidCategoryTab(state.activeCameraTab);
  state.activeCameraTab = activeTab;
  return tabs.map(t => {
    const isActive = (t.id === activeTab);
    return `
      <button 
        type="button"
        onclick="selectCameraCategoryTab('${t.id}')"
        class="px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1 cursor-pointer ${
          isActive 
            ? 'bg-blue-600 text-white shadow-xs ring-2 ring-blue-400/40' 
            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
        }"
      >
        <span>${t.icon}</span>
        <span>${t.label}</span>
      </button>
    `;
  }).join('');
}

function getCategoryAuditData(res, activeTab) {
  const catList = res?.category_allocations || [];
  let catKey = '';
  if (activeTab === 'Devices') catKey = 'computers';
  else if (activeTab === 'Machines') catKey = 'machines';
  else if (activeTab === 'Fans') catKey = 'fans';
  else if (activeTab === 'Tools') catKey = 'tools';
  else if (activeTab === 'Desks') catKey = 'desks_chairs';

  const item = catList.find(c => c.category_key === catKey || c.category_name?.toLowerCase().includes(activeTab.toLowerCase()));

  const eqDets = state.latestEquipmentDetections || res?.equipment_detections || [];
  const liveCatCounts = res?.unique_category_counts || res?.category_counts || {};

  let cameraCount = 0;
  let isSupported = (item ? item.is_camera_supported !== false : true);

  if (activeTab === 'Devices') {
    if (liveCatCounts.devices !== undefined) cameraCount = liveCatCounts.devices;
    else if (liveCatCounts.computers !== undefined) cameraCount = liveCatCounts.computers;
    else if (item && item.camera_count !== null && item.camera_count !== undefined) cameraCount = item.camera_count;
    else {
      cameraCount = eqDets.filter(e => e.category_tab === 'Devices' || e.category === 'Electronic Devices' || e.name?.toLowerCase().includes('laptop') || e.name?.toLowerCase().includes('monitor') || e.name?.toLowerCase().includes('phone') || e.name?.toLowerCase().includes('projector')).length;
    }
  } else if (activeTab === 'Desks') {
    if (liveCatCounts.desks_chairs !== undefined) cameraCount = liveCatCounts.desks_chairs;
    else if (liveCatCounts.desks !== undefined) cameraCount = (liveCatCounts.desks || 0) + (liveCatCounts.chairs || 0);
    else if (item && item.camera_count !== null && item.camera_count !== undefined) cameraCount = item.camera_count;
    else {
      cameraCount = eqDets.filter(e => e.category_tab === 'Desks' || e.category === 'Desks' || e.name?.toLowerCase().includes('desk') || e.name?.toLowerCase().includes('chair')).length;
    }
  } else if (activeTab === 'Machines') {
    if (liveCatCounts.machines !== undefined) cameraCount = liveCatCounts.machines;
    else if (item && item.camera_count !== null && item.camera_count !== undefined) cameraCount = item.camera_count;
    else {
      cameraCount = eqDets.filter(e => e.category_tab === 'Machines').length;
    }
  } else if (activeTab === 'Tools') {
    if (liveCatCounts.tools !== undefined) cameraCount = liveCatCounts.tools;
    else if (item && item.camera_count !== null && item.camera_count !== undefined) cameraCount = item.camera_count;
    else {
      cameraCount = eqDets.filter(e => e.category_tab === 'Tools').length;
    }
  } else if (activeTab === 'Fans') {
    if (liveCatCounts.fans !== undefined) cameraCount = liveCatCounts.fans;
    else if (item && item.camera_count !== null && item.camera_count !== undefined) cameraCount = item.camera_count;
    else {
      cameraCount = eqDets.filter(e => e.category_tab === 'Fans' || e.name?.toLowerCase().includes('fan')).length;
    }
  }

  const allotted = item ? item.allotted_quantity : (activeTab === 'Desks' ? 75 : (activeTab === 'Devices' ? 30 : (activeTab === 'Fans' ? 15 : 10)));
  const reportedGood = item ? item.reported_good : (activeTab === 'Desks' ? 47 : (activeTab === 'Devices' ? 28 : (activeTab === 'Fans' ? 12 : 8)));
  const diff = isSupported ? Math.abs(cameraCount - reportedGood) : reportedGood;

  return {
    title: activeTab,
    allotted,
    reportedGood,
    cameraCount,
    isSupported,
    diff,
    hasDiscrepancy: diff > 0
  };
}

function renderSelectedCategoryCardHTML(res, tabName) {
  const activeTab = getValidCategoryTab(tabName);
  const totalStudents = res?.total_students || state.cachedTotalStudents || 35;
  const officialCount = res?.official_attendance_count !== undefined ? res.official_attendance_count : (state.cachedOfficialAttendance || 0);
  const currentCount = res?.ai_detected_count !== undefined ? res.ai_detected_count : (state.latestLiveCount || 0);
  const isCovered = Boolean(res?.is_camera_covered);
  const attDiff = Math.abs(officialCount - currentCount);
  const attDiscrepancy = attDiff > 0;

  if (activeTab === 'Attendance') {
    return `
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4" id="surveillanceCategoryCard">
        <div class="flex items-center justify-between">
          <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">Attendance Surveillance Metrics</h3>
          <span class="px-2.5 py-0.5 rounded text-xs font-bold ${isCovered ? 'bg-red-100 text-red-800 border border-red-300' : (attDiscrepancy ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300')}">
            ${isCovered ? '🚨 Camera Blocked' : (attDiscrepancy ? '⚠️ Discrepancy Flagged' : '✓ Attendance Verified')}
          </span>
        </div>

        <!-- AI CAMERA COUNT: X / TOTAL STUDENTS VISIBLE (Section 7 Spec) -->
        <div class="p-4 ${isCovered ? 'bg-red-50/80 border-red-200' : 'bg-blue-50/70 border-blue-200'} border rounded-xl text-center">
          <div class="text-[10px] font-bold uppercase ${isCovered ? 'text-red-600' : 'text-blue-600'}">AI CAMERA COUNT</div>
          <div class="text-3xl font-black ${isCovered ? 'text-red-700' : 'text-blue-950'} mt-1" id="liveStudentCountBadge">
            ${isCovered ? 'BLOCKED' : `${currentCount} / ${totalStudents} Students Visible`}
          </div>
          <div class="text-[10px] ${isCovered ? 'text-red-700 font-semibold' : 'text-blue-700'} mt-1" id="liveCentreScopeNotice">
            ${isCovered ? 'Camera lens physically covered or obstructed • Surveillance blocked' : `Based on ${totalStudents} registered students at ${res?.centre_name || 'Selected Centre'}`}
          </div>
        </div>

        <!-- Attendance vs Camera Comparison Table (Section 10 Spec) -->
        <div class="space-y-2 text-xs" id="comparisonTableContainer">
          <div class="flex justify-between items-center py-1.5 border-b">
            <span class="text-slate-500">Official Attendance:</span>
            <span class="font-bold text-slate-900" id="compOfficialAttendance">${officialCount} / ${totalStudents}</span>
          </div>
          <div class="flex justify-between items-center py-1.5 border-b">
            <span class="text-slate-500">AI Camera Count:</span>
            <span class="font-bold ${isCovered ? 'text-red-600 font-black' : 'text-emerald-700'}" id="compAICount">${isCovered ? 'BLOCKED' : `${currentCount} / ${totalStudents} Students Visible`}</span>
          </div>
          <div class="flex justify-between items-center py-1.5">
            <span class="text-slate-500">Difference:</span>
            <span class="font-bold ${isCovered ? 'text-red-600 font-mono text-sm' : (attDiff > 0 ? 'text-amber-700 font-mono text-sm' : 'text-emerald-700')}" id="compDifference">${isCovered ? 'Blocked Feed' : `${attDiff} students`}</span>
          </div>
        </div>

        <!-- Attendance Status Description Box -->
        <div class="p-2.5 rounded-lg border text-[11px] leading-snug ${isCovered ? 'bg-red-50 border-red-200 text-red-900' : (attDiscrepancy ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900')}">
          <div class="font-bold flex items-center gap-1.5">
            <span>${isCovered ? '🚨 Camera Lens Physically Obstructed' : (attDiscrepancy ? '⚠️ Attendance Discrepancy Flagged' : '✓ Attendance Headcount Reconciled')}</span>
          </div>
          <div class="mt-0.5 text-[10px]">
            ${isCovered 
              ? `Surveillance feed is physically covered. Anonymous count is blocked. Incident is logged to Government Official alerts.`
              : (attDiscrepancy 
                  ? `AI detected ${currentCount} students visible in camera vs ${officialCount} submitted in official attendance record (Difference: ${attDiff} students).`
                  : `Physical AI headcount (${currentCount}) perfectly matches submitted official attendance (${officialCount}/${totalStudents}).`)}
          </div>
          <div class="text-[9px] text-slate-500 mt-1 border-t border-slate-200/80 pt-1">
            * Anonymous detection only. Individual absences are not attributed to camera counts.
          </div>
        </div>

        <!-- Active Student Tags HUD -->
        <div class="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
          <span>Active Occupant Tags: <b class="font-mono text-emerald-700">STU01, STU02...</b></span>
          <span class="font-semibold text-emerald-700">🔒 Real-Time Face Privacy Blur</span>
        </div>
      </div>
    `;
  }

  // Equipment Category Cards (Devices, Machines, Fans, Tools, Desks)
  const data = getCategoryAuditData(res, activeTab);

  return `
    <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4" id="surveillanceCategoryCard">
      <div class="flex items-center justify-between">
        <h3 class="font-bold text-slate-900 text-xs uppercase tracking-wider text-slate-500">${data.title} Surveillance Metrics</h3>
        <span class="px-2.5 py-0.5 rounded text-xs font-bold ${isCovered ? 'bg-red-100 text-red-800 border border-red-300' : (!data.isSupported ? 'bg-slate-100 text-slate-700' : (data.hasDiscrepancy ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'))}">
          ${isCovered ? '🚨 Camera Blocked' : (!data.isSupported ? 'ℹ️ Model Limitation' : (data.hasDiscrepancy ? '⚠️ Discrepancy Flagged' : '✓ Allocation Matched'))}
        </span>
      </div>

      <!-- Top Badge: <AI camera count> / <good condition count> (Part 3 Spec) -->
      <div class="p-4 ${isCovered ? 'bg-red-50/80 border-red-200' : 'bg-blue-50/70 border-blue-200'} border rounded-xl text-center">
        <div class="text-[10px] font-bold uppercase ${isCovered ? 'text-red-600' : 'text-blue-600'}">AI CAMERA COUNT / VERIFIED GOOD</div>
        <div class="text-3xl font-black ${isCovered ? 'text-red-700' : 'text-blue-950'} mt-1" id="liveCategoryCountBadge">
          ${isCovered ? 'BLOCKED' : (data.isSupported ? `${data.cameraCount} / ${data.reportedGood}` : `0 / ${data.reportedGood}`)}
        </div>
        <div class="text-[10px] ${isCovered ? 'text-red-700 font-semibold' : 'text-blue-700'} mt-1" id="liveCategoryScopeNotice">
          ${isCovered ? 'Camera lens physically covered • Equipment counting suspended' : (data.isSupported 
            ? `${data.cameraCount} physical units detected by AI camera vs ${data.reportedGood} reported in good condition` 
            : `${data.title} are outside camera viewing area or unsupported by detector model`)}
        </div>
      </div>

      <!-- Comparison Table Rows (Part 3 Spec) -->
      <div class="space-y-2 text-xs" id="categoryComparisonTable">
        <div class="flex justify-between items-center py-1.5 border-b">
          <span class="text-slate-500">Reported in Good Condition:</span>
          <span class="font-bold text-slate-900" id="compReportedGood">${data.reportedGood} / ${data.allotted}</span>
        </div>
        <div class="flex justify-between items-center py-1.5 border-b">
          <span class="text-slate-500">AI Camera Count:</span>
          <span class="font-bold ${isCovered ? 'text-red-600 font-black' : 'text-emerald-700'}" id="compAICameraCount">${isCovered ? 'BLOCKED' : (data.isSupported ? `${data.cameraCount} Detected` : '0 Detected (Unsupported)')}</span>
        </div>
        <div class="flex justify-between items-center py-1.5">
          <span class="text-slate-500">Difference:</span>
          <span class="font-bold ${isCovered ? 'text-red-600 font-mono text-sm' : (data.diff > 0 ? 'text-amber-700 font-mono text-sm' : 'text-emerald-700')}" id="compCatDifference">${isCovered ? 'Blocked Feed' : `${data.diff} units`}</span>
        </div>
      </div>

      <!-- Discrepancy / Limitation Description Box -->
      <div class="p-2.5 rounded-lg border text-[11px] leading-snug ${data.hasDiscrepancy ? 'bg-amber-50 border-amber-200 text-amber-900' : 'bg-emerald-50 border-emerald-200 text-emerald-900'}">
        <div class="font-bold flex items-center gap-1.5">
          <span>${!data.isSupported ? 'ℹ️ Detector Class Limitation' : (data.hasDiscrepancy ? `⚠️ ${data.title} Discrepancy Flagged` : `✓ ${data.title} Allocation Reconciled`)}</span>
        </div>
        <div class="mt-0.5 text-[10px]">
          ${!data.isSupported 
            ? `Category is unsupported by current detector. Model detects 0 units honestly without synthetic estimation.`
            : (data.hasDiscrepancy 
                ? `AI camera detected ${data.cameraCount} units vs ${data.reportedGood} reported in good condition in database (Difference: ${data.diff} units).`
                : `AI camera detections (${data.cameraCount}) match reported good-condition inventory record.`)}
        </div>
        <div class="text-[9px] text-slate-500 mt-1 border-t border-slate-200/80 pt-1">
          * Official database allocation (${data.allotted} allotted) is preserved and never overwritten by camera detections. Camera visibility does not verify operating condition.
        </div>
      </div>

      <!-- Active Equipment Tags HUD -->
      <div class="pt-1.5 border-t border-slate-200 text-[10px] text-slate-500 flex items-center justify-between">
        <span>Active Category Tags: <b class="font-mono text-cyan-700">${activeTab === 'Desks' ? 'DSK01, DSK02...' : (activeTab === 'Devices' ? 'DEV01, DEV02...' : (activeTab === 'Machines' ? 'MCH01, MCH02...' : (activeTab === 'Tools' ? 'TOL01, TOL02...' : (activeTab === 'Fans' ? 'FAN01, FAN02...' : 'N/A'))))}</b></span>
        <span class="font-semibold text-emerald-700">🔒 Real-Time Face Privacy Blur</span>
      </div>
    </div>
  `;
}

function updateCameraHUDRange(res, tabName) {
  const hudRange = document.getElementById('hudTrackedRange');
  if (!hudRange) return;
  const activeTab = getValidCategoryTab(tabName);
  const isTC2 = (state.govSelectedCentreId === 'TC2');
  const count = res.unique_persons_count || res.ai_detected_count || (res.detections ? res.detections.length : 0);
  const catCounts = res.unique_category_counts || res.category_counts || {};

  if (activeTab === 'Attendance') {
    hudRange.textContent = count > 0 ? `STU01 – STU${count < 10 ? '0' + count : count}` : 'NO OCCUPANTS';
  } else if (activeTab === 'Desks') {
    const d = (catCounts.desks_chairs !== undefined) ? catCounts.desks_chairs : ((catCounts.desks || 0) + (catCounts.chairs || 0));
    hudRange.textContent = d > 0 ? `DSK01 – DSK${d < 10 ? '0' + d : d}` : 'NO DESKS/CHAIRS';
  } else if (activeTab === 'Devices') {
    const c = (catCounts.devices !== undefined) ? catCounts.devices : ((catCounts.computers !== undefined) ? catCounts.computers : (isTC2 ? 5 : 3));
    hudRange.textContent = c > 0 ? `DEV01 – DEV${c < 10 ? '0' + c : c}` : 'NO DEVICES';
  } else if (activeTab === 'Machines') {
    const m = (catCounts.machines || 0);
    hudRange.textContent = m > 0 ? `MCH01 – MCH${m < 10 ? '0' + m : m}` : 'NO MACHINES';
  } else if (activeTab === 'Tools') {
    const t = (catCounts.tools || 0);
    hudRange.textContent = t > 0 ? `TOL01 – TOL${t < 10 ? '0' + t : t}` : 'NO TOOLS';
  } else if (activeTab === 'Fans') {
    const f = (catCounts.fans || 0);
    hudRange.textContent = f > 0 ? `FAN01 – FAN${f < 10 ? '0' + f : f}` : 'NO FANS';
  } else {
    hudRange.textContent = count > 0 ? `STU01 – STU${count < 10 ? '0' + count : count}` : 'TRACKING ACTIVE';
  }
}

window.selectCameraCategoryTab = function(tabName) {
  const activeTab = getValidCategoryTab(tabName);
  state.activeCameraTab = activeTab;
  const tabsContainer = document.getElementById('cameraCategoryTabs');
  if (tabsContainer) {
    tabsContainer.innerHTML = renderCategoryFilterTabsHTML();
  }
  const metricsContainer = document.getElementById('surveillanceMetricsContainer');
  if (metricsContainer) {
    const currentRes = state.latestDetectionResult || state.cameraData || {};
    metricsContainer.innerHTML = renderSelectedCategoryCardHTML(currentRes, activeTab);
  }
  updateCameraHUDRange(state.latestDetectionResult || state.cameraData || {}, activeTab);
  const videoEl = document.getElementById('webcamVideo');
  if (videoEl) {
    drawYOLOOverlays(videoEl, state.latestDetectionResult || state.cameraData || {});
  }
};

function getDiscrepancyBannerHTML(officialCount, currentCount, totalStudents, diff, discrepancy) {
  if (discrepancy) {
    return `
      <div class="p-4 bg-amber-50 border-l-4 border-amber-500 rounded-r-xl shadow-sm text-xs text-amber-950 space-y-1">
        <div class="font-bold flex items-center gap-2 text-sm text-amber-900">
          <span>⚠</span>
          <span>Attendance discrepancy detected</span>
        </div>
        <div class="text-slate-700 font-medium">
          Official attendance: <b>${officialCount}</b> &nbsp;|&nbsp; AI detected: <b>${currentCount}</b> &nbsp;|&nbsp; Difference: <b>${diff} students</b>
        </div>
        <div class="text-[11px] text-amber-800">
          * Note: AI camera provides anonymous aggregate presence count only. Do not conclude specific individual student absences from camera count alone.
        </div>
      </div>
    `;
  } else {
    return `
      <div class="p-3 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-xs text-emerald-900 font-semibold flex items-center gap-2">
        <span>✓</span>
        <span>Official attendance (${officialCount}) matches AI camera headcount within normal threshold.</span>
      </div>
    `;
  }
}

function getOrCreatePersistentVideo() {
  let bgVideo = document.getElementById('persistentWebcamVideo');
  if (!bgVideo) {
    bgVideo = document.createElement('video');
    bgVideo.id = 'persistentWebcamVideo';
    bgVideo.autoplay = true;
    bgVideo.playsInline = true;
    bgVideo.muted = true;
    bgVideo.style.display = 'none';
    bgVideo.style.position = 'fixed';
    bgVideo.style.width = '1px';
    bgVideo.style.height = '1px';
    bgVideo.style.opacity = '0';
    bgVideo.style.pointerEvents = 'none';
    document.body.appendChild(bgVideo);
  }
  return bgVideo;
}

function getActiveVideoElement() {
  const domVideo = document.getElementById('webcamVideo');
  if (domVideo && domVideo.videoWidth > 0 && !domVideo.paused) {
    return domVideo;
  }
  const bgVideo = document.getElementById('persistentWebcamVideo');
  if (bgVideo && bgVideo.videoWidth > 0 && !bgVideo.paused) {
    return bgVideo;
  }
  return domVideo || bgVideo;
}

async function startLaptopCamera() {
  state.cameraErrorMsg = null;
  state.webcamStatus = 'PERMISSION_REQUIRED';
  updateCameraUIState();

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    handleCameraError({ name: 'NotSupportedError', message: 'Your browser does not support camera access.' });
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    });

    state.webcamStream = stream;
    state.webcamStatus = 'ON';
    state.cameraErrorMsg = null;

    // Attach stream to persistent background video so vision & alert processing persists across tab switches
    const bgVideo = getOrCreatePersistentVideo();
    bgVideo.srcObject = stream;
    bgVideo.play().catch(e => console.log('Persistent bg video notice:', e));

    const videoEl = document.getElementById('webcamVideo');
    if (videoEl) {
      videoEl.style.display = 'none'; // Ensure raw unblurred webcam feed is never directly visible on screen
      videoEl.srcObject = stream;
      await videoEl.play().catch(e => console.log('Autoplay error:', e));
    }

    // Ensure model is ready and run immediate initial detection to eliminate initial unblurred delay
    if (!tfAI.blazeFaceModel) {
      await tfAI.init().catch(() => {});
    }
    if (tfAI.blazeFaceModel && ((videoEl && videoEl.videoWidth > 0) || (bgVideo && bgVideo.videoWidth > 0))) {
      try { await stepClientVision(); } catch (e) {}
    }

    updateCameraUIState();
    showToast('Laptop webcam activated.', 'success');

    // Start periodic live YOLO frame detection loop
    startLiveFrameDetection();

  } catch (err) {
    handleCameraError(err);
  }
}

function stopLaptopCamera() {
  stopLiveFrameDetection();

  const bgVideo = document.getElementById('persistentWebcamVideo');
  if (bgVideo) {
    bgVideo.srcObject = null;
  }

  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch (e) {
        console.error('Error stopping track:', e);
      }
    });
    state.webcamStream = null;
  }

  const videoEl = document.getElementById('webcamVideo');
  if (videoEl) {
    videoEl.srcObject = null;
  }

  const canvasEl = document.getElementById('webcamCanvas');
  if (canvasEl) {
    const ctx = canvasEl.getContext('2d');
    ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
  }

  state.webcamStatus = 'OFF';
  state.activeFaceTracks = [];
  state.faceTracks = [];
  updateCameraUIState();

  // Reset tracking state on server
  fetch('/api/camera/reset_tracker', { method: 'POST' }).catch(() => {});
}

function handleCameraError(err) {
  state.webcamStatus = 'OFF';
  if (state.webcamStream) {
    state.webcamStream.getTracks().forEach(track => track.stop());
    state.webcamStream = null;
  }

  if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
    state.cameraErrorMsg = 'Camera permission denied. Please allow camera access in your browser settings.';
    showToast('Camera permission denied.', 'error');
  } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
    state.cameraErrorMsg = 'No camera detected on this device.';
    showToast('No camera detected.', 'error');
  } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
    state.cameraErrorMsg = 'Camera is currently being used by another application.';
    showToast('Camera in use by another app.', 'error');
  } else if (err.name === 'NotSupportedError') {
    state.cameraErrorMsg = 'Your browser does not support camera access.';
  } else {
    state.cameraErrorMsg = 'Camera permission denied. Allow camera access and try again.';
  }

  updateCameraUIState();
}

function updateCameraUIState() {
  const badgeEl = document.getElementById('cameraStatusBadge');
  if (badgeEl) badgeEl.innerHTML = getCameraStatusBadgeHTML();

  const btnEl = document.getElementById('cameraActionButton');
  if (btnEl) btnEl.innerHTML = getCameraActionButtonHTML();

  const overlayEl = document.getElementById('cameraStateOverlay');
  if (overlayEl) {
    overlayEl.innerHTML = getCameraStateOverlayHTML();
    if (state.webcamStatus === 'ON') {
      overlayEl.className = 'hidden';
    } else {
      overlayEl.className = 'flex flex-col items-center justify-center p-8 text-center space-y-4 max-w-md';
    }
  }

  const videoEl = document.getElementById('webcamVideo');
  const canvasEl = document.getElementById('webcamCanvas');
  const hudEl = document.getElementById('cameraHudTracked');
  const dotEl = document.getElementById('cameraFeedDot');

  if (videoEl) {
    videoEl.style.display = 'none';
    if (state.webcamStatus === 'ON') videoEl.classList.remove('hidden');
    else videoEl.classList.add('hidden');
  }
  if (canvasEl) {
    if (state.webcamStatus === 'ON') canvasEl.classList.remove('hidden');
    else canvasEl.classList.add('hidden');
  }
  if (hudEl) {
    if (state.webcamStatus === 'ON') hudEl.classList.remove('hidden');
    else hudEl.classList.add('hidden');
  }
  if (dotEl) {
    if (state.webcamStatus === 'ON') {
      dotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 animate-pulse';
    } else {
      dotEl.className = 'w-2 h-2 rounded-full bg-red-500';
    }
  }
}

// ===========================================================================
// TENSORFLOW.JS COCO-SSD (lite_mobilenet_v2) & BLAZEFACE CLIENT AI MODELS
// ===========================================================================
const tfAI = {
  cocoModel: null,
  blazeFaceModel: null,
  isLoading: false,
  isLoaded: false,
  loadError: null,

  async init() {
    if (this.isLoaded || this.isLoading) return;
    this.isLoading = true;
    try {
      if (typeof tf !== 'undefined') {
        try { await tf.ready(); } catch (e) {}
      }
      if (typeof cocoSsd !== 'undefined' && !this.cocoModel) {
        this.cocoModel = await cocoSsd.load({ base: 'lite_mobilenet_v2' });
        console.log('[AI] COCO-SSD (lite_mobilenet_v2) initialized.');
      }
      if (typeof blazeface !== 'undefined' && !this.blazeFaceModel) {
        this.blazeFaceModel = await blazeface.load();
        console.log('[AI] BlazeFace face detector initialized.');
      }
      if (this.cocoModel && this.blazeFaceModel) {
        this.isLoaded = true;
      }
    } catch (err) {
      console.warn('[AI] Model loading notice:', err);
      this.loadError = err;
    } finally {
      this.isLoading = false;
    }
  }
};

// Pre-initialize face detector as early as possible so models are loaded and warm before camera starts
tfAI.init().catch(() => {});
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => { tfAI.init().catch(() => {}); });
  } else {
    tfAI.init().catch(() => {});
  }
}

// ===========================================================================
// CONFIGURABLE CLIENT-SIDE PRIVACY BLUR & TRACKING SETTINGS (Part 10 Spec)
// ===========================================================================
const BLUR_CONFIG = {
  holdDurationMs: 3500,       // 3.5s grace-period persistence for head tilts, orientation changes, detector gaps
  maxConsecutiveMisses: 45,   // Keep active and rendered for up to 45 frames during orientation changes
  basePaddingPercent: 0.30,   // Anti-leak padding (30% margin covering forehead, chin, jawline on turns/bends)
  speedPaddingMax: 0.0,       // No speed-based expansion
  maxLeadTimeMs: 0,           // Strict zero-lag: no forward extrapolation overshoot
  minSmoothingK: 1.0,         // Zero-lag tight lock (k = 1.0) directly on live coordinates
  maxSmoothingK: 1.0,         // Instant snap on recorded video (k = 1.0)
  minMatchRadius: 180,        // Match distance in pixels for movement & head pitch
  downscaleWidth: 320,        // Downscaled frame width for BlazeFace
  downscaleHeight: 180,       // Downscaled frame height for BlazeFace
  faceConfidenceThresh: 0.20, // Lowered confidence threshold (0.20) for high-angle & downward-tilted lab faces
  minConsecutiveHits: 1,      // 1 hit for immediate frame 0 protection (no warmup delay)
  maxServerSquareAgeMs: 500,  // Accept server squares up to 500ms
  maxHeightPct: 0.65,         // Max side 65% of frame height (allows close-up padded faces)
  maxAreaPct: 0.30,           // Max area 30% of frame area (allows close-up padded faces)
  debugMode: false            // Config flag (default OFF) for color outlines and stats
};

// Feature-detect ctx.filter at startup and verify pixel changes
function verifyCanvasFilterSupport() {
  try {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    if (!ctx || typeof ctx.filter !== 'string') return false;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 8, 16);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(8, 0, 8, 16);

    const c2 = document.createElement('canvas');
    c2.width = 16;
    c2.height = 16;
    const ctx2 = c2.getContext('2d');
    ctx2.filter = 'blur(4px)';
    ctx2.drawImage(c, 0, 0);
    ctx2.filter = 'none';

    const p = ctx2.getImageData(8, 8, 1, 1).data;
    const isBlurred = (p[0] > 20 && p[0] < 235);
    return isBlurred;
  } catch (e) {
    try {
      const c = document.createElement('canvas');
      const ctx = c.getContext('2d');
      ctx.filter = 'blur(10px)';
      return ctx.filter === 'blur(10px)';
    } catch (err) {
      return false;
    }
  }
}
state.supportsCanvasFilter = verifyCanvasFilterSupport();

// Persistent reusable offscreen canvases to avoid per-frame allocations & GC lag
window._reusableBlurCanvas = window._reusableBlurCanvas || document.createElement('canvas');
window._reusableSnapCanvas = window._reusableSnapCanvas || document.createElement('canvas');
window._reusableSnapCanvas.width = 640;
window._reusableSnapCanvas.height = 360;
window._reusableFaceDetectCanvas = window._reusableFaceDetectCanvas || document.createElement('canvas');
window._reusableFaceDetectCanvas.width = BLUR_CONFIG.downscaleWidth;
window._reusableFaceDetectCanvas.height = BLUR_CONFIG.downscaleHeight;

// Reusable tiny offscreen canvas for Tier 2 pixelation fallback (NO getImageData)
window._reusablePixelationCanvas = window._reusablePixelationCanvas || document.createElement('canvas');
window._reusablePixelationCanvas.width = 8;
window._reusablePixelationCanvas.height = 8;

function computeBoxIoU(box1, box2) {
  const x1 = Math.max(box1[0], box2[0]);
  const y1 = Math.max(box1[1], box2[1]);
  const x2 = Math.min(box1[0] + box1[2], box2[0] + box2[2]);
  const y2 = Math.min(box1[1] + box1[3], box2[1] + box2[3]);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  const area1 = box1[2] * box1[3];
  const area2 = box2[2] * box2[3];
  const unionArea = area1 + area2 - interArea;
  return unionArea > 0 ? (interArea / unionArea) : 0.0;
}

function computeBoxContainment(box1, box2) {
  const x1 = Math.max(box1[0], box2[0]);
  const y1 = Math.max(box1[1], box2[1]);
  const x2 = Math.min(box1[0] + box1[2], box2[0] + box2[2]);
  const y2 = Math.min(box1[1] + box1[3], box2[1] + box2[3]);
  const interW = Math.max(0, x2 - x1);
  const interH = Math.max(0, y2 - y1);
  const interArea = interW * interH;
  const area1 = Math.max(1, box1[2] * box1[3]);
  const area2 = Math.max(1, box2[2] * box2[3]);
  const minArea = Math.min(area1, area2);
  return interArea / minArea;
}

// Track deduplication helper: if two tracks have IoU >= 0.30 or containment >= 70%, keep ONE
function deduplicateActiveTracks() {
  if (!state.activeFaceTracks || state.activeFaceTracks.length <= 1) return;
  const tracks = state.activeFaceTracks;
  const keep = [];
  const dropped = new Set();

  for (let i = 0; i < tracks.length; i++) {
    if (dropped.has(i)) continue;
    let t1 = tracks[i];
    for (let j = i + 1; j < tracks.length; j++) {
      if (dropped.has(j)) continue;
      let t2 = tracks[j];
      const b1 = [t1.currX, t1.currY, t1.currSize, t1.currSize];
      const b2 = [t2.currX, t2.currY, t2.currSize, t2.currSize];
      const iou = computeBoxIoU(b1, b2);
      const containment = computeBoxContainment(b1, b2);
      const dist = Math.hypot((t1.currX + t1.currSize / 2) - (t2.currX + t2.currSize / 2), (t1.currY + t1.currSize / 2) - (t2.currY + t2.currSize / 2));
      const minS = Math.min(t1.currSize, t2.currSize);

      if (iou >= 0.18 || containment >= 0.50 || dist < minS * 0.90) {
        // Drop the lower-priority or older track
        if ((t1.consecutiveHits || 0) >= (t2.consecutiveHits || 0)) {
          dropped.add(j);
        } else {
          dropped.add(i);
          break;
        }
      }
    }
    if (!dropped.has(i)) {
      keep.push(t1);
    }
  }
  state.activeFaceTracks = keep;
}

// Face Privacy Mosaic Blur matching reference implementation
// 1. Reusable offscreen downscale-upscale mosaic block pass (fast, uncrackable mosaic)
// 2. High-strength dark privacy shield overlay rgba(15, 23, 42, 0.42)
// 3. Official privacy compliance badge ("PRIVACY PROTECTED") on bottom edge
// 4. Fail-safe solid privacy fill fallback
function drawBlurredFaceRegion(ctx, sourceCanvasOrVideo, sx, sy, sqW, sqH, cw, ch, alpha = 1.0, source = 'server') {
  if (isNaN(sx) || isNaN(sy) || isNaN(sqW) || isNaN(sqH) || !isFinite(sx) || !isFinite(sy) || sqW <= 4 || sqH <= 4) return;

  // Strict square face blur: width == height
  const maxSide = Math.floor(ch * (BLUR_CONFIG.maxHeightPct || 0.65));
  const maxAreaSide = Math.floor(Math.sqrt(cw * ch * (BLUR_CONFIG.maxAreaPct || 0.30)));
  const allowedSide = Math.min(maxSide, maxAreaSide);

  const rawSide = Math.max(sqW, sqH);
  const finalSide = Math.max(12, Math.min(rawSide, allowedSide));

  // Direct 1:1 coordinate mapping: clamp squarely inside canvas boundaries without asymmetric shifts or flawed offsets
  const drawW = finalSide;
  const drawH = finalSide;
  const x1 = Math.max(0, Math.min(cw - drawW, Math.round(sx)));
  const y1 = Math.max(0, Math.min(ch - drawH, Math.round(sy)));

  if (drawW <= 4 || drawH <= 4) return;

  ctx.save();
  if (alpha < 1.0) {
    ctx.globalAlpha = Math.max(0.1, alpha);
  }

  // Terminal fallback: solid neutral fill strictly inside face square only (never full canvas)
  function drawSolidTerminalFallback() {
    ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x1, y1, drawW, drawH, 4);
      ctx.fill();
    } else {
      ctx.fillRect(x1, y1, drawW, drawH);
    }
  }

  try {
    // 1. Reusable offscreen downscale-upscale mosaic block pass (reference implementation)
    if (!window._reusableMosaicCanvas) {
      window._reusableMosaicCanvas = document.createElement('canvas');
    }
    const offCanvas = window._reusableMosaicCanvas;
    const mosaicFactor = Math.max(6, Math.min(10, Math.floor(drawW / 14)));
    offCanvas.width = mosaicFactor;
    offCanvas.height = mosaicFactor;
    const offCtx = offCanvas.getContext('2d');

    // Draw raw face region from source canvas or video to tiny offscreen canvas
    try {
      offCtx.drawImage(ctx.canvas, x1, y1, drawW, drawH, 0, 0, mosaicFactor, mosaicFactor);
    } catch {
      offCtx.drawImage(sourceCanvasOrVideo, x1, y1, drawW, drawH, 0, 0, mosaicFactor, mosaicFactor);
    }

    const prevSmoothing = ctx.imageSmoothingEnabled;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(offCanvas, 0, 0, mosaicFactor, mosaicFactor, x1, y1, drawW, drawH);
    ctx.imageSmoothingEnabled = prevSmoothing;

    // 2. High-strength dark privacy shield overlay
    ctx.fillStyle = 'rgba(15, 23, 42, 0.42)';
    ctx.fillRect(x1, y1, drawW, drawH);

    // 3. Official privacy compliance badge on bottom edge
    if (drawH >= 20 && drawW >= 55) {
      const badgeH = Math.min(14, Math.max(10, Math.floor(drawH * 0.22)));
      ctx.fillStyle = 'rgba(2, 6, 23, 0.88)';
      ctx.fillRect(x1, y1 + drawH - badgeH, drawW, badgeH);
      ctx.fillStyle = '#38bdf8';
      const fontSize = Math.max(7, Math.min(9, Math.floor(badgeH * 0.72)));
      ctx.font = `bold ${fontSize}px monospace`;
      ctx.fillText('PRIVACY PROTECTED', x1 + 4, y1 + drawH - Math.max(2, Math.floor((badgeH - fontSize) / 2)));
    }
  } catch (err) {
    // Fallback opaque block if offscreen canvas operations throw
    drawSolidTerminalFallback();
  }

  // Debug Mode outline
  if (BLUR_CONFIG.debugMode) {
    ctx.restore();
    ctx.save();
    let debugColor = '#3b82f6'; // Server blue
    if (source === 'client') debugColor = '#10b981'; // Client green
    else if (source === 'fallback') debugColor = '#f59e0b'; // Head fallback amber
    ctx.strokeStyle = debugColor;
    ctx.lineWidth = 2;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x1, y1, drawW, drawH, 4);
      ctx.stroke();
    } else {
      ctx.strokeRect(x1, y1, drawW, drawH);
    }
  }

  ctx.restore();
}

function startLiveFrameDetection() {
  stopLiveFrameDetection();

  // Pre-initialize client vision models
  tfAI.init().catch(() => {});

  // 1. Independent 60 FPS requestAnimationFrame render loop
  startOverlayRenderLoop();

  // 2. Self-scheduling, non-overlapping face detection loop (always on newest frame)
  state.isVisionLoopActive = true;
  scheduleNextFaceDetection();

  // 3. Background asynchronous server inference (~450ms)
  setTimeout(processServerInference, 300);
  state.serverInferenceInterval = setInterval(processServerInference, 450);
}

function stopLiveFrameDetection() {
  stopOverlayRenderLoop();

  state.isVisionLoopActive = false;
  state.isDetectingFace = false;
  if (state.faceDetectionHandle) {
    const videoEl = document.getElementById('webcamVideo');
    if (videoEl && typeof videoEl.cancelVideoFrameCallback === 'function' && typeof state.faceDetectionHandle === 'number') {
      try { videoEl.cancelVideoFrameCallback(state.faceDetectionHandle); } catch (e) {}
    } else if (typeof state.faceDetectionHandle === 'number') {
      cancelAnimationFrame(state.faceDetectionHandle);
      clearTimeout(state.faceDetectionHandle);
    }
    state.faceDetectionHandle = null;
  }

  if (state.serverInferenceInterval) {
    clearInterval(state.serverInferenceInterval);
    state.serverInferenceInterval = null;
  }
  if (state.webcamInterval) {
    clearInterval(state.webcamInterval);
    state.webcamInterval = null;
  }

  state.isDetecting = false;
  state.isServerBusy = false;
  state.activeFaceTracks = [];
}

function scheduleNextFaceDetection() {
  if (!state.isVisionLoopActive) return;
  const videoEl = getActiveVideoElement();
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.paused || videoEl.ended) {
    state.faceDetectionHandle = setTimeout(scheduleNextFaceDetection, 50);
    return;
  }

  if ('requestVideoFrameCallback' in HTMLVideoElement.prototype && typeof videoEl.requestVideoFrameCallback === 'function') {
    state.faceDetectionHandle = videoEl.requestVideoFrameCallback(async () => {
      if (!state.isVisionLoopActive) return;
      await stepClientVision();
      scheduleNextFaceDetection();
    });
  } else {
    state.faceDetectionHandle = requestAnimationFrame(async () => {
      if (!state.isVisionLoopActive) return;
      await stepClientVision();
      scheduleNextFaceDetection();
    });
  }
}

function startOverlayRenderLoop() {
  if (state.renderLoopActive) return;
  state.renderLoopActive = true;

  function loop() {
    if (!state.renderLoopActive) return;
    const videoEl = document.getElementById('webcamVideo');
    const canvas = document.getElementById('webcamCanvas');
    if (videoEl && canvas && videoEl.videoWidth > 0 && !videoEl.paused && !videoEl.ended) {
      renderFrameOverlay(videoEl, canvas);
    }
    state.renderLoopId = requestAnimationFrame(loop);
  }
  state.renderLoopId = requestAnimationFrame(loop);
}

function stopOverlayRenderLoop() {
  state.renderLoopActive = false;
  if (state.renderLoopId) {
    cancelAnimationFrame(state.renderLoopId);
    state.renderLoopId = null;
  }
}

// Temporal cache for recorded video footage (indexed by video currentTime)
state.recordedFootageCache = state.recordedFootageCache || [];

function getInterpolatedFaceSquaresForFootage(currentTime) {
  const cache = state.recordedFootageCache || [];
  if (!cache || cache.length === 0) return null;

  let prevEntry = null;
  let nextEntry = null;

  for (let i = 0; i < cache.length; i++) {
    const entry = cache[i];
    if (entry.videoTime <= currentTime) {
      if (!prevEntry || entry.videoTime > prevEntry.videoTime) {
        prevEntry = entry;
      }
    }
    if (entry.videoTime >= currentTime) {
      if (!nextEntry || entry.videoTime < nextEntry.videoTime) {
        nextEntry = entry;
      }
    }
  }

  // Linear interpolation if bounded within 2.5s window
  if (prevEntry && nextEntry && prevEntry !== nextEntry) {
    const span = nextEntry.videoTime - prevEntry.videoTime;
    if (span > 0.01 && span <= 2.5) {
      const alpha = Math.max(0, Math.min(1, (currentTime - prevEntry.videoTime) / span));
      const sW = prevEntry.frameWidth || 1280;
      const sH = prevEntry.frameHeight || 720;
      const interpolatedSquares = [];
      const usedNext = new Set();

      (prevEntry.faceSquares || []).forEach(pSq => {
        let bestMatch = null;
        let bestDist = 140;
        (nextEntry.faceSquares || []).forEach((nSq, nIdx) => {
          if (usedNext.has(nIdx)) return;
          const dist = Math.hypot(pSq[0] - nSq[0], pSq[1] - nSq[1]);
          if (dist < bestDist) {
            bestDist = dist;
            bestMatch = { sq: nSq, idx: nIdx };
          }
        });
        if (bestMatch) {
          usedNext.add(bestMatch.idx);
          const nSq = bestMatch.sq;
          const ix = pSq[0] + (nSq[0] - pSq[0]) * alpha;
          const iy = pSq[1] + (nSq[1] - pSq[1]) * alpha;
          const iw = pSq[2] + (nSq[2] - pSq[2]) * alpha;
          const ih = (pSq[3] || pSq[2]) + ((nSq[3] || nSq[2]) - (pSq[3] || pSq[2])) * alpha;
          interpolatedSquares.push([ix, iy, iw, ih]);
        } else {
          interpolatedSquares.push(pSq);
        }
      });
      return { squares: interpolatedSquares, frameWidth: sW, frameHeight: sH };
    }
  }

  const closest = prevEntry || nextEntry || cache[0];
  if (closest && Array.isArray(closest.faceSquares) && closest.faceSquares.length > 0) {
    return { squares: closest.faceSquares, frameWidth: closest.frameWidth || 1280, frameHeight: closest.frameHeight || 720 };
  }
  return null;
}

// 60 FPS Frame Overlay Renderer (Runs independently on requestAnimationFrame)
function renderFrameOverlay(videoEl, canvas) {
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 360;

  // Synchronize webcamCanvas width and height directly to videoEl.videoWidth and videoEl.videoHeight (1:1 coordinate match)
  if (canvas.width !== vw || canvas.height !== vh) {
    canvas.width = vw;
    canvas.height = vh;
  }

  const cw = canvas.width;
  const ch = canvas.height;
  const ctx = canvas.getContext('2d');

  // 1. Canvas-first pipeline: render raw video frame onto canvas first before applying overlays
  ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

  const res = state.latestDetectionResult || state.cameraData || {};
  const frameW = res.frame_width || 640;
  const frameH = res.frame_height || 360;
  const scaleX = cw / frameW;
  const scaleY = ch / frameH;
  const activeTab = getValidCategoryTab(state.activeCameraTab);

  // Synchronized detector scaling directly to render canvas (1:1 coordinate match)
  const isTC2 = (state.govSelectedCentreId === 'TC2');

  // For recorded footage (TC2), query interpolated face squares aligned with exact video playback time
  if (isTC2 && videoEl && !videoEl.paused && typeof videoEl.currentTime === 'number') {
    state.lastVideoCurrentTime = videoEl.currentTime;

    const interp = getInterpolatedFaceSquaresForFootage(videoEl.currentTime);
    if (interp && Array.isArray(interp.squares) && interp.squares.length > 0) {
      const sW = interp.frameWidth || frameW || 1280;
      const sH = interp.frameHeight || frameH || 720;
      const interpScaleX = cw / sW;
      const interpScaleY = ch / sH;
      const nowTime = performance.now();
      interp.squares.forEach(sq => {
        const fx = sq[0] * interpScaleX;
        const fy = sq[1] * interpScaleY;
        const fsize = Math.max(sq[2] * interpScaleX, (sq[3] || sq[2]) * interpScaleY);
        if (fsize > ch * BLUR_CONFIG.maxHeightPct) return;
        const ncx = fx + fsize / 2.0;
        const ncy = fy + fsize / 2.0;

        let matchedTrack = null;
        let minDist = Math.max(BLUR_CONFIG.minMatchRadius || 180, fsize * 1.5);
        for (let t of state.activeFaceTracks) {
          const dist = Math.hypot((t.currX + t.currSize / 2) - ncx, (t.currY + t.currSize / 2) - ncy);
          if (dist < minDist) {
            minDist = dist;
            matchedTrack = t;
          }
        }
        if (matchedTrack) {
          // Zero latency: lock directly to playback coordinates
          matchedTrack.targetX = fx;
          matchedTrack.targetY = fy;
          matchedTrack.targetSize = fsize;
          matchedTrack.targetWidth = fsize;
          matchedTrack.targetHeight = fsize;
          matchedTrack.currX = fx;
          matchedTrack.currY = fy;
          matchedTrack.currSize = fsize;
          matchedTrack.currWidth = fsize;
          matchedTrack.currHeight = fsize;
          matchedTrack.lastSeen = nowTime;
          matchedTrack.consecutiveHits = Math.max(matchedTrack.consecutiveHits || 1, 1);
          matchedTrack.consecutiveMisses = 0;
          matchedTrack.source = 'server';
        } else {
          state.nextFaceTrackId = (state.nextFaceTrackId || 0) + 1;
          state.activeFaceTracks.push({
            id: state.nextFaceTrackId,
            currX: fx,
            currY: fy,
            currSize: fsize,
            currWidth: fsize,
            currHeight: fsize,
            targetX: fx,
            targetY: fy,
            targetSize: fsize,
            targetWidth: fsize,
            targetHeight: fsize,
            vx: 0,
            vy: 0,
            lastDetectedTime: nowTime,
            lastSeen: nowTime,
            consecutiveHits: 1,
            consecutiveMisses: 0,
            source: 'server'
          });
        }
      });
      deduplicateActiveTracks();
    }
  }

  // 2. Real-Time Face Privacy Blur (Zero-Lag Tracking, Frame 0 Protection)
  const now = performance.now();

  // Prune only tracks that have expired past grace-period persistence or left the visible frame
  state.activeFaceTracks = (state.activeFaceTracks || []).filter(t => {
    const holdMs = BLUR_CONFIG.holdDurationMs || 3500;
    const maxMisses = BLUR_CONFIG.maxConsecutiveMisses || 45;
    const timedOut = (now - t.lastSeen) > holdMs;
    const missedTooMany = (t.consecutiveMisses || 0) >= maxMisses;
    if (timedOut && missedTooMany) return false;
    if ((now - t.lastSeen) > (holdMs + 1000)) return false;
    // Only prune if completely outside the canvas boundaries
    if (t.currX + t.currSize < -20 || t.currX > cw + 20 || t.currY + t.currSize < -20 || t.currY > ch + 20) return false;
    return true;
  });

  // Synchronize validated student detections directly to face squares
  const visibleDets = state.latestDetections || res.detections || [];
  visibleDets.forEach(det => {
    if (!det.bbox) return;
    const [x, y, bw, bh] = det.bbox;
    const sx = x * scaleX;
    const sy = y * scaleY;
    const sw = bw * scaleX;
    const sh = bh * scaleY;

    let sqX, sqY, side;
    if (det.face_bbox && Array.isArray(det.face_bbox) && det.face_bbox.length === 4) {
      const [fx, fy, fw, fh] = det.face_bbox;
      const dfw = fw * scaleX;
      const dfh = (fh || fw) * scaleY;
      side = Math.round(Math.max(dfw, dfh));
      sqX = Math.round(fx * scaleX);
      sqY = Math.round(fy * scaleY);
    } else {
      // Upper 25-35% head region fallback
      const headH = sh * 0.30;
      side = Math.round(Math.max(20, Math.min(sw, headH * 1.20)));
      sqX = Math.round(sx + Math.max(0, (sw - side) / 2.0));
      sqY = Math.round(sy);
    }

    const maxAllowedSide = Math.min(cw, ch, Math.floor(ch * 0.65));
    side = Math.max(16, Math.min(side, maxAllowedSide));
    sqX = Math.max(0, Math.min(cw - side, sqX));
    sqY = Math.max(0, Math.min(ch - side, sqY));

    // Match with active tracks
    let matchedTrack = null;
    let minDist = Math.max(BLUR_CONFIG.minMatchRadius || 180, side * 1.5);
    for (let t of state.activeFaceTracks) {
      const dist = Math.hypot((t.currX + t.currSize / 2) - (sqX + side / 2), (t.currY + t.currSize / 2) - (sqY + side / 2));
      if (dist < minDist) {
        minDist = dist;
        matchedTrack = t;
      }
    }
    if (matchedTrack) {
      // Lock directly to detection (zero lag, no drift onto cubicles)
      matchedTrack.targetX = sqX;
      matchedTrack.targetY = sqY;
      matchedTrack.targetSize = side;
      matchedTrack.targetWidth = side;
      matchedTrack.targetHeight = side;
      matchedTrack.currX = sqX;
      matchedTrack.currY = sqY;
      matchedTrack.currSize = side;
      matchedTrack.currWidth = side;
      matchedTrack.currHeight = side;
      matchedTrack.lastSeen = now;
      matchedTrack.consecutiveHits = Math.max(matchedTrack.consecutiveHits || 1, 1);
      matchedTrack.consecutiveMisses = 0;
      matchedTrack.source = 'server';
    } else {
      state.nextFaceTrackId = (state.nextFaceTrackId || 0) + 1;
      state.activeFaceTracks.push({
        id: state.nextFaceTrackId,
        currX: sqX,
        currY: sqY,
        currSize: side,
        currWidth: side,
        currHeight: side,
        targetX: sqX,
        targetY: sqY,
        targetSize: side,
        targetWidth: side,
        targetHeight: side,
        vx: 0,
        vy: 0,
        lastDetectedTime: now,
        lastSeen: now,
        consecutiveHits: 1,
        consecutiveMisses: 0,
        source: 'server'
      });
    }
  });

  // Deduplicate overlapping tracks: strictly ONE square per detected face
  deduplicateActiveTracks();

  let squaresDrawnCount = 0;
  const maxVisiblePeople = Math.max(1, visibleDets.length || (state.activeFaceTracks || []).length);
  const drawnFaceBoxes = [];

  state.activeFaceTracks.forEach(t => {
    if ((t.consecutiveHits || 0) < BLUR_CONFIG.minConsecutiveHits) return;
    if (squaresDrawnCount >= maxVisiblePeople) return;

    // Movement tracking: tightly locked with zero lag
    const k = BLUR_CONFIG.minSmoothingK || 1.0;
    t.currX += (t.targetX - t.currX) * k;
    t.currY += (t.targetY - t.currY) * k;
    const targetS = t.targetSize || t.targetWidth || t.currSize;
    t.currSize += (targetS - t.currSize) * k;
    t.currWidth = t.currSize;
    t.currHeight = t.currSize;

    // Exact 1:1 square coordinates in canvas pixels
    let side = Math.round(t.currSize);
    const maxAllowedSide = Math.min(cw, ch, Math.floor(ch * 0.65));
    side = Math.max(16, Math.min(side, maxAllowedSide));

    let sqX = Math.round(t.currX);
    let sqY = Math.round(t.currY);
    sqX = Math.max(0, Math.min(cw - side, sqX));
    sqY = Math.max(0, Math.min(ch - side, sqY));

    if (isNaN(sqX) || isNaN(sqY) || isNaN(side) || !isFinite(sqX) || !isFinite(sqY) || !isFinite(side) || side <= 4) {
      return;
    }

    const currentBox = [sqX, sqY, side, side];
    let overlapsDrawn = false;
    for (let db of drawnFaceBoxes) {
      if (computeBoxIoU(currentBox, db) >= 0.18 || computeBoxContainment(currentBox, db) >= 0.50) {
        overlapsDrawn = true;
        break;
      }
    }
    if (overlapsDrawn) return;

    drawnFaceBoxes.push(currentBox);
    drawBlurredFaceRegion(ctx, videoEl, sqX, sqY, side, side, cw, ch, 1.0, t.source || 'server');
    squaresDrawnCount++;
  });

  // Head/Person Fallback for Zero-Blur Prevention in High-Angle Lab/CCTV Feeds:
  // Whenever students face downwards or are angled toward monitors, frontal face detectors may have gaps.
  // Extract upper 25-35% region of the person's bounding box and apply square mosaic blur immediately.
  visibleDets.forEach(det => {
    if (!det.bbox) return;
    const [x, y, bw, bh] = det.bbox;
    const sx = x * scaleX;
    const sy = y * scaleY;
    const sw = bw * scaleX;
    const sh = bh * scaleY;

    // Check if this person already has a face blur square drawn over their head region
    let covered = false;
    for (let db of drawnFaceBoxes) {
      const headRect = [sx, sy, sw, sh * 0.35];
      if (computeBoxIoU(headRect, db) >= 0.15 || computeBoxContainment(headRect, db) >= 0.25) {
        covered = true;
        break;
      }
    }

    if (!covered && squaresDrawnCount < maxVisiblePeople) {
      let fSide, fX, fY;
      if (det.face_bbox && Array.isArray(det.face_bbox) && det.face_bbox.length === 4) {
        const [fx, fy, fw, fh] = det.face_bbox;
        const dfw = fw * scaleX;
        const dfh = (fh || fw) * scaleY;
        fSide = Math.round(Math.max(dfw, dfh));
        fX = Math.round(fx * scaleX);
        fY = Math.round(fy * scaleY);
      } else {
        const headH = sh * 0.30;
        fSide = Math.round(Math.max(20, Math.min(sw, headH * 1.20)));
        fX = Math.round(sx + Math.max(0, (sw - fSide) / 2.0));
        fY = Math.round(sy);
      }

      const maxAllowedSide = Math.min(cw, ch, Math.floor(ch * 0.65));
      fSide = Math.max(16, Math.min(fSide, maxAllowedSide));
      fX = Math.max(0, Math.min(cw - fSide, fX));
      fY = Math.max(0, Math.min(ch - fSide, fY));

      const fb = [fX, fY, fSide, fSide];
      drawnFaceBoxes.push(fb);
      drawBlurredFaceRegion(ctx, videoEl, fX, fY, fSide, fSide, cw, ch, 1.0, 'fallback');
      squaresDrawnCount++;
    }
  });

  // Rule 9: Debug Mode HUD
  if (BLUR_CONFIG.debugMode) {
    const totalDets = (state.latestDetections || []).length;
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    ctx.fillRect(cw - 230, 8, 222, 42);
    ctx.strokeStyle = '#38bdf8';
    ctx.strokeRect(cw - 230, 8, 222, 42);
    ctx.fillStyle = '#f8fafc';
    ctx.font = 'bold 11px monospace';
    ctx.fillText(`BLUR HUD: ${squaresDrawnCount} square(s) | ${totalDets} people`, cw - 222, 24);
    ctx.font = '9.5px monospace';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`Green:Client | Blue:Server | Amb:Fallback`, cw - 222, 40);
    ctx.restore();
  }

  // Helper for drawing sleek rounded bounding outlines
  function drawRoundedOutline(x, y, bw, bh, radius = 4) {
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(x, y, bw, bh, radius);
      ctx.stroke();
    } else {
      ctx.strokeRect(x, y, bw, bh);
    }
  }

  // Helper for compact professional tag
  function drawProfessionalTag(x, y, text, accentColor) {
    ctx.font = '600 10.5px Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    const textMetrics = ctx.measureText(text);
    const textW = textMetrics.width;
    const tagH = 18;
    const tagW = textW + 16;
    let tagY = (y >= tagH + 4) ? (y - tagH - 2) : (y + 3);
    let tagX = Math.max(3, Math.min(cw - tagW - 3, x));

    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, tagW, tagH, 3);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      ctx.fillRect(tagX, tagY, tagW, tagH);
    }

    ctx.fillStyle = accentColor;
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(tagX, tagY, 3, tagH, [3, 0, 0, 3]);
      ctx.fill();
    } else {
      ctx.fillRect(tagX, tagY, 3, tagH);
    }

    ctx.fillStyle = '#f8fafc';
    ctx.fillText(text, tagX + 7, tagY + 12.5);
    ctx.restore();
  }

  // 3. Draw Active Category Detections (Bounding Boxes on top of Blurred Video)
  if (activeTab === 'Attendance') {
    const dets = state.latestDetections || res.detections || [];
    dets.forEach(det => {
      if (!det.bbox) return;
      const [x, y, bw, bh] = det.bbox;
      const sx = x * scaleX;
      const sy = y * scaleY;
      const sw = bw * scaleX;
      const sh = bh * scaleY;

      ctx.save();
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      drawRoundedOutline(sx, sy, sw, sh, 4);
      ctx.fillStyle = 'rgba(16, 185, 129, 0.04)';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();

      const labelText = det.class_name || det.name || 'Person';
      drawProfessionalTag(sx, sy, labelText, '#10b981');
    });
  } else {
    // Equipment Categories: Devices, Machines, Fans, Tools, Desks
    const eqDets = state.latestEquipmentDetections || res.equipment_detections || [];
    const filteredEq = eqDets.filter(eq => {
      const eqTab = eq.category_tab || '';
      const cat = (eq.category || '').toLowerCase();
      const name = (eq.name || '').toLowerCase();

      if (activeTab === 'Desks') {
        return eqTab === 'Desks' || cat.includes('desk') || cat.includes('chair') || name.includes('desk') || name.includes('chair') || name.includes('table') || name.includes('bench');
      }
      if (activeTab === 'Devices') {
        return eqTab === 'Devices' || cat.includes('electronic') || cat.includes('device') || cat.includes('computer') || name.includes('laptop') || name.includes('monitor') || name.includes('phone') || name.includes('projector') || name.includes('display');
      }
      if (activeTab === 'Machines') {
        return eqTab === 'Machines' || cat.includes('machine') || name.includes('machine') || name.includes('lathe') || name.includes('printer') || name.includes('press');
      }
      if (activeTab === 'Tools') {
        return eqTab === 'Tools' || cat.includes('tool') || name.includes('tool') || name.includes('hammer') || name.includes('plier') || name.includes('wrench') || name.includes('screwdriver') || name.includes('scissor');
      }
      if (activeTab === 'Fans') {
        return eqTab === 'Fans' || name.includes('fan') || cat.includes('fan');
      }
      return false;
    });

    filteredEq.forEach(eq => {
      if (!eq.bbox) return;
      const [x, y, bw, bh] = eq.bbox;
      const sx = x * scaleX;
      const sy = y * scaleY;
      const sw = bw * scaleX;
      const sh = bh * scaleY;

      let accentColor = '#0284c7';
      if (activeTab === 'Desks') accentColor = '#6366f1';
      else if (activeTab === 'Machines') accentColor = '#f59e0b';
      else if (activeTab === 'Tools') accentColor = '#14b8a6';
      else if (activeTab === 'Fans') accentColor = '#06b6d4';

      ctx.save();
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = 1.5;
      drawRoundedOutline(sx, sy, sw, sh, 4);
      ctx.fillStyle = `${accentColor}0a`;
      ctx.fillRect(sx, sy, sw, sh);
      ctx.restore();

      const labelText = eq.class_name || eq.category_short || eq.name || activeTab;
      drawProfessionalTag(sx, sy, labelText, accentColor);
    });
  }

  // Camera Obstructed / Covered Alert Overlay
  if (res && res.is_camera_covered) {
    ctx.save();
    ctx.fillStyle = 'rgba(15, 23, 42, 0.72)';
    ctx.fillRect(0, 0, cw, ch);

    const bannerW = Math.min(360, cw - 32);
    const bannerH = 52;
    const bx = (cw - bannerW) / 2;
    const by = (ch - bannerH) / 2;

    ctx.fillStyle = 'rgba(185, 28, 28, 0.95)';
    if (ctx.roundRect) {
      ctx.beginPath();
      ctx.roundRect(bx, by, bannerW, bannerH, 8);
      ctx.fill();
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    } else {
      ctx.fillRect(bx, by, bannerW, bannerH);
      ctx.strokeStyle = '#f87171';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(bx, by, bannerW, bannerH);
    }

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 12.5px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚠️ CAMERA LENS OBSTRUCTED', cw / 2, ch / 2 - 8);

    ctx.font = '10.5px Inter, -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('Physical coverage detected • Alert logged', cw / 2, ch / 2 + 12);
    ctx.restore();
  }
}

function drawYOLOOverlays(videoEl, res) {
  const canvas = document.getElementById('webcamCanvas');
  if (!canvas || !videoEl) return;
  renderFrameOverlay(videoEl, canvas);
}

// Client-side fast face tracking on downscaled frame with velocity estimation & greedy matching
async function stepClientVision() {
  if (state.isDetectingFace) return;
  const videoEl = getActiveVideoElement();
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.paused || videoEl.ended) return;
  if (!tfAI.blazeFaceModel) return;

  state.isDetectingFace = true;
  try {
    const isTC2 = (state.govSelectedCentreId === 'TC2');
    const vw = videoEl.videoWidth || (isTC2 ? 1280 : 640);
    const vh = videoEl.videoHeight || (isTC2 ? 720 : 360);
    const maxDim = isTC2 ? 640 : (BLUR_CONFIG.downscaleWidth || 320);
    const aspect = vw / Math.max(1, vh);
    const dw = (vw >= vh) ? maxDim : Math.round(maxDim * aspect);
    const dh = (vw >= vh) ? Math.round(maxDim / aspect) : maxDim;
    const dCanvas = window._reusableFaceDetectCanvas;
    if (dCanvas.width !== dw || dCanvas.height !== dh) {
      dCanvas.width = dw;
      dCanvas.height = dh;
    }
    const dCtx = dCanvas.getContext('2d', { willReadFrequently: true });
    dCtx.drawImage(videoEl, 0, 0, dw, dh);

    // Fast BlazeFace prediction on frame (~12-18ms)
    const rawFaces = await tfAI.blazeFaceModel.estimateFaces(dCanvas, false);
    const currentTimestamp = performance.now();

    const canvas = document.getElementById('webcamCanvas');
    const cw = canvas ? canvas.width : (videoEl.videoWidth || 640);
    const ch = canvas ? canvas.height : (videoEl.videoHeight || 360);

    const scaleToCanvasX = cw / dw;
    const scaleToCanvasY = ch / dh;

    state.activeFaceTracks = state.activeFaceTracks || [];

    // Parse detected candidate faces with confidence and size safety caps
    const rawDetectedFaces = [];
    if (Array.isArray(rawFaces)) {
      rawFaces.forEach(face => {
        const prob = (face.probability !== undefined) ? (Array.isArray(face.probability) ? face.probability[0] : face.probability) : 0.90;
        const activeTracksExist = (state.activeFaceTracks && state.activeFaceTracks.length > 0);
        const minThresh = activeTracksExist ? 0.16 : (BLUR_CONFIG.faceConfidenceThresh || 0.20);
        if (prob < minThresh) return;

        const x1 = face.topLeft[0] * scaleToCanvasX;
        const y1 = face.topLeft[1] * scaleToCanvasY;
        const x2 = face.bottomRight[0] * scaleToCanvasX;
        const y2 = face.bottomRight[1] * scaleToCanvasY;
        const fw = Math.max(0, x2 - x1);
        const fh = Math.max(0, y2 - y1);
        const size = Math.round(Math.max(fw * 1.25, fh * 1.30, 20));

        if (size > ch * BLUR_CONFIG.maxHeightPct || (size * size) > (cw * ch * BLUR_CONFIG.maxAreaPct)) return;

        const cx = (x1 + x2) / 2.0;
        const cy = (y1 + y2) / 2.0 - (fh * 0.05);
        let fx = Math.round(cx - size / 2.0);
        let fy = Math.round(cy - size / 2.0);
        fx = Math.max(0, Math.min(cw - size, fx));
        fy = Math.max(0, Math.min(ch - size, fy));

        rawDetectedFaces.push({ fx, fy, size, cx, cy, probability: prob });
      });
    }

    // Rule 1: ONE MERGED FACE LIST - Deduplicate candidate detections before matching
    const detectedFaces = [];
    rawDetectedFaces.forEach(df => {
      const b1 = [df.fx, df.fy, df.size, df.size];
      let isDup = false;
      for (let md of detectedFaces) {
        const b2 = [md.fx, md.fy, md.size, md.size];
        if (computeBoxIoU(b1, b2) >= 0.30 || computeBoxContainment(b1, b2) >= 0.70) {
          isDup = true;
          break;
        }
      }
      if (!isDup) detectedFaces.push(df);
    });

    // Match detected faces to existing tracks using distance gating
    const matchedTrackIds = new Set();
    const matchedDetIndices = new Set();
    const matchPairs = [];

    state.activeFaceTracks.forEach((t, tIdx) => {
      const predX = t.targetX;
      const predY = t.targetY;
      const predSize = t.targetSize;
      const predCx = predX + predSize / 2;
      const predCy = predY + predSize / 2;
      const maxMatchDist = Math.max(BLUR_CONFIG.minMatchRadius || 180, predSize * 2.0);

      detectedFaces.forEach((det, dIdx) => {
        const dx = predCx - det.cx;
        const dy = predCy - det.cy;
        const dist = Math.hypot(dx, dy);
        const iou = computeBoxIoU([predX, predY, predSize, predSize], [det.fx, det.fy, det.size, det.size]);
        const cont = computeBoxContainment([predX, predY, predSize, predSize], [det.fx, det.fy, det.size, det.size]);

        if (dist <= maxMatchDist || iou >= 0.08 || cont >= 0.25) {
          const cost = dist - (iou * 140.0);
          matchPairs.push({ cost, tIdx, dIdx, det });
        }
      });
    });

    matchPairs.sort((a, b) => a.cost - b.cost);

    matchPairs.forEach(pair => {
      if (matchedTrackIds.has(pair.tIdx) || matchedDetIndices.has(pair.dIdx)) return;
      matchedTrackIds.add(pair.tIdx);
      matchedDetIndices.add(pair.dIdx);

      const t = state.activeFaceTracks[pair.tIdx];
      const det = pair.det;

      // If existing track was grounded by server YOLO, do not let client face drift away onto cubicles
      if (t.source === 'server') {
        const distToServer = Math.hypot(t.currX - det.fx, t.currY - det.fy);
        if (distToServer > t.currSize * 0.8) {
          return;
        }
      }

      t.targetX = det.fx;
      t.targetY = det.fy;
      t.targetSize = det.size;
      t.targetWidth = det.size;
      t.targetHeight = det.size;
      t.currX = det.fx;
      t.currY = det.fy;
      t.currSize = det.size;
      t.currWidth = det.size;
      t.currHeight = det.size;
      t.vx = 0;
      t.vy = 0;
      t.lastDetectedTime = currentTimestamp;
      t.lastSeen = currentTimestamp;
      t.consecutiveMisses = 0;
      t.consecutiveHits = Math.min(10, (t.consecutiveHits || 0) + 1);
    });

    state.activeFaceTracks.forEach((t, tIdx) => {
      if (!matchedTrackIds.has(tIdx)) {
        t.consecutiveMisses = (t.consecutiveMisses || 0) + 1;
      }
    });

    // Create new tracks for unmatched detections (Frame 0 coverage)
    detectedFaces.forEach((det, dIdx) => {
      if (matchedDetIndices.has(dIdx)) return;

      let coversExisting = false;
      for (let t of state.activeFaceTracks) {
        const dist = Math.hypot((t.currX + t.currSize / 2) - det.cx, (t.currY + t.currSize / 2) - det.cy);
        if (dist < Math.max(det.size * 1.2, (BLUR_CONFIG.minMatchRadius || 180) * 0.75)) { coversExisting = true; break; }
      }
      if (coversExisting) return;

      state.nextFaceTrackId = (state.nextFaceTrackId || 0) + 1;
      state.activeFaceTracks.push({
        id: state.nextFaceTrackId,
        currX: det.fx,
        currY: det.fy,
        currSize: det.size,
        currWidth: det.size,
        currHeight: det.size,
        targetX: det.fx,
        targetY: det.fy,
        targetSize: det.size,
        targetWidth: det.size,
        targetHeight: det.size,
        vx: 0,
        vy: 0,
        lastDetectedTime: currentTimestamp,
        lastSeen: currentTimestamp,
        consecutiveMisses: 0,
        consecutiveHits: 1, // Immediate Frame 0 protection
        source: 'client'
      });
    });

    deduplicateActiveTracks();

  } catch (err) {
    // Non-blocking notice
  } finally {
    state.isDetectingFace = false;
  }
}

// Merge Recent Server Face Squares into Tracker (Never Drawn Directly to Avoid Jumps)
function mergeServerFaceSquaresIntoTracker(serverSquares, serverW = 640, serverH = 360, isInterpolated = false, reqDuration = 0) {
  const now = performance.now();
  state.activeFaceTracks = state.activeFaceTracks || [];
  if (!Array.isArray(serverSquares) || serverSquares.length === 0) return;

  const canvas = document.getElementById('webcamCanvas');
  const videoEl = getActiveVideoElement();
  const cw = canvas ? canvas.width : (videoEl && videoEl.videoWidth ? videoEl.videoWidth : 640);
  const ch = canvas ? canvas.height : (videoEl && videoEl.videoHeight ? videoEl.videoHeight : 360);

  const sW = Math.max(1, serverW);
  const sH = Math.max(1, serverH);
  const scaleX = cw / sW;
  const scaleY = ch / sH;

  // Convert server squares directly to canvas coordinate space
  const rawNorm = [];
  serverSquares.forEach(fb => {
    const fx = fb[0] * scaleX;
    const fy = fb[1] * scaleY;
    const fw = fb[2] * scaleX;
    const fh = (fb[3] || fb[2]) * scaleY;
    const size = Math.round(Math.max(fw, fh));

    if (size > ch * BLUR_CONFIG.maxHeightPct || (size * size) > (cw * ch * BLUR_CONFIG.maxAreaPct)) return;

    rawNorm.push({
      fx: fx,
      fy: fy,
      size: size,
      cx: fx + size / 2.0,
      cy: fy + size / 2.0
    });
  });

  // Deduplicate incoming server boxes
  const normFaces = [];
  rawNorm.forEach(rn => {
    const b1 = [rn.fx, rn.fy, rn.size, rn.size];
    let isDup = false;
    for (let nf of normFaces) {
      const b2 = [nf.fx, nf.fy, nf.size, nf.size];
      if (computeBoxIoU(b1, b2) >= 0.30 || computeBoxContainment(b1, b2) >= 0.70) {
        isDup = true;
        break;
      }
    }
    if (!isDup) normFaces.push(rn);
  });

  // Match server faces to existing tracks
  const matchedTrackIds = new Set();
  const matchedDetIndices = new Set();
  const matchPairs = [];

  state.activeFaceTracks.forEach((t, tIdx) => {
    const tCx = t.currX + t.currSize / 2.0;
    const tCy = t.currY + t.currSize / 2.0;
    const maxMatchDist = Math.max(BLUR_CONFIG.minMatchRadius || 180, t.currSize * 2.0);

    normFaces.forEach((det, dIdx) => {
      const dx = tCx - det.cx;
      const dy = tCy - det.cy;
      const dist = Math.hypot(dx, dy);
      const iou = computeBoxIoU([t.currX, t.currY, t.currSize, t.currSize], [det.fx, det.fy, det.size, det.size]);
      const cont = computeBoxContainment([t.currX, t.currY, t.currSize, t.currSize], [det.fx, det.fy, det.size, det.size]);

      if (dist <= maxMatchDist || iou >= 0.08 || cont >= 0.25) {
        const cost = dist - (iou * 120.0);
        matchPairs.push({ cost, tIdx, dIdx, det });
      }
    });
  });

  matchPairs.sort((a, b) => a.cost - b.cost);

  matchPairs.forEach(pair => {
    if (matchedTrackIds.has(pair.tIdx) || matchedDetIndices.has(pair.dIdx)) return;
    matchedTrackIds.add(pair.tIdx);
    matchedDetIndices.add(pair.dIdx);

    const t = state.activeFaceTracks[pair.tIdx];
    const det = pair.det;

    // Ground-truth server update: lock directly to server face detection (zero lag, no cubicle drift)
    t.targetX = det.fx;
    t.targetY = det.fy;
    t.targetSize = det.size;
    t.targetWidth = det.size;
    t.targetHeight = det.size;
    t.currX = det.fx;
    t.currY = det.fy;
    t.currSize = det.size;
    t.currWidth = det.size;
    t.currHeight = det.size;
    t.vx = 0;
    t.vy = 0;
    t.lastDetectedTime = now;
    t.lastSeen = now;
    t.consecutiveMisses = 0;
    t.consecutiveHits = Math.max(t.consecutiveHits || 1, 1);
    t.source = 'server';
  });

  // Spawn new smooth track for unmatched server detections (immediate frame 0 protection)
  normFaces.forEach((det, dIdx) => {
    if (matchedDetIndices.has(dIdx)) return;

    let coversExisting = false;
    for (let t of state.activeFaceTracks) {
      const dist = Math.hypot((t.currX + t.currSize / 2) - det.cx, (t.currY + t.currSize / 2) - det.cy);
      if (dist < Math.max(det.size * 1.2, (BLUR_CONFIG.minMatchRadius || 180) * 0.75)) { coversExisting = true; break; }
    }
    if (coversExisting) return;

    state.nextFaceTrackId = (state.nextFaceTrackId || 0) + 1;
    state.activeFaceTracks.push({
      id: state.nextFaceTrackId,
      currX: det.fx,
      currY: det.fy,
      currSize: det.size,
      currWidth: det.size,
      currHeight: det.size,
      targetX: det.fx,
      targetY: det.fy,
      targetSize: det.size,
      targetWidth: det.size,
      targetHeight: det.size,
      vx: 0,
      vy: 0,
      lastDetectedTime: now,
      lastSeen: now,
      consecutiveMisses: 0,
      consecutiveHits: 1, // Server confirmed immediately
      source: 'server'
    });
  });

  deduplicateActiveTracks();
}

// Background server inference loop (~450ms)
async function processServerInference() {
  const isTC2 = (state.govSelectedCentreId === 'TC2');
  if (state.isServerBusy) return;
  if (!isTC2 && (state.webcamStatus !== 'ON' || !state.webcamStream)) return;
  const videoEl = getActiveVideoElement();
  if (!videoEl || videoEl.videoWidth === 0 || videoEl.paused || videoEl.ended) return;

  state.isServerBusy = true;
  const inferenceStartTime = performance.now();
  try {
    const snapCanvas = window._reusableSnapCanvas;
    const snapCtx = snapCanvas.getContext('2d');

    // Dynamically scale snapshot canvas to video native resolution capped at 1280
    let targetW = videoEl.videoWidth || 640;
    let targetH = videoEl.videoHeight || 360;
    const maxDim = 1280;
    if (Math.max(targetW, targetH) > maxDim) {
      const scale = maxDim / Math.max(targetW, targetH);
      targetW = Math.round(targetW * scale);
      targetH = Math.round(targetH * scale);
    }
    if (snapCanvas.width !== targetW || snapCanvas.height !== targetH) {
      snapCanvas.width = targetW;
      snapCanvas.height = targetH;
    }
    snapCtx.drawImage(videoEl, 0, 0, targetW, targetH);

    // CRITICAL PRIVACY ARCHITECTURE:
    // We send an uncorrupted, clean frame copy to the server purely in ephemeral memory
    // so YOLO pose keypoints and person detector can resolve distant faces and bodies.
    // The server processes the frame strictly in RAM, applies privacy blur, and immediately
    // discards the frame without persisting it to disk or returning raw frames.
    // The client-side webcamCanvas renders continuous 100% frosted blur at 60 FPS.
    const dataUrl = snapCanvas.toDataURL('image/jpeg', 0.75);
    const centreId = state.govSelectedCentreId || 'TC1';
    const sendVideoTime = (isTC2 && typeof videoEl.currentTime === 'number') ? videoEl.currentTime : null;

    // Scale client faces from canvas coordinate space to targetW x targetH
    const canvas = document.getElementById('webcamCanvas');
    const cw = canvas ? canvas.width : (videoEl.videoWidth || targetW);
    const ch = canvas ? canvas.height : (videoEl.videoHeight || targetH);
    const scaleToSnapX = targetW / Math.max(1, cw);
    const scaleToSnapY = targetH / Math.max(1, ch);

    const clientFaces = (state.activeFaceTracks || []).map(t => ({
      bbox: [
        Math.round(t.currX * scaleToSnapX),
        Math.round(t.currY * scaleToSnapY),
        Math.round(t.currSize * scaleToSnapX),
        Math.round(t.currSize * scaleToSnapY)
      ],
      cx: (t.currX + t.currSize / 2.0) * scaleToSnapX,
      cy: (t.currY + t.currSize / 2.0) * scaleToSnapY,
      probability: 0.95
    }));

    const res = await fetch('/api/camera/detect_frame', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: dataUrl,
        centre_id: centreId,
        client_faces: clientFaces.length > 0 ? clientFaces : null,
        client_timestamp: inferenceStartTime,
        playback_timestamp: sendVideoTime,
        video_time: sendVideoTime
      })
    }).then(r => r.json());

    const reqDuration = performance.now() - inferenceStartTime;
    if (res.success && (isTC2 || state.webcamStatus === 'ON')) {
      state.latestDetectionResult = res;
      state.latestDetections = res.detections || [];
      state.latestEquipmentDetections = res.equipment_detections || [];
      state.latestLiveCount = res.ai_detected_count || 0;
      state.cachedTotalStudents = res.total_students;
      state.cachedOfficialAttendance = res.official_attendance_count;
      state.detectionFrameWidth = res.frame_width || targetW;
      state.detectionFrameHeight = res.frame_height || targetH;

      if (isTC2) {
        // Cache detections by video timestamp for recorded footage
        const footageTime = (res.video_time !== undefined && res.video_time !== null) ? res.video_time : (sendVideoTime || 0);
        state.recordedFootageCache = state.recordedFootageCache || [];
        state.recordedFootageCache.push({
          videoTime: footageTime,
          faceSquares: res.face_squares || [],
          detections: res.detections || [],
          equipmentDetections: res.equipment_detections || [],
          frameWidth: res.frame_width || targetW,
          frameHeight: res.frame_height || targetH
        });
        state.recordedFootageCache.sort((a, b) => a.videoTime - b.videoTime);
        if (state.recordedFootageCache.length > 80) {
          state.recordedFootageCache.splice(0, state.recordedFootageCache.length - 80);
        }
      } else {
        // Live feeds (TC1): Merge server squares
        if (Array.isArray(res.face_squares) && res.face_squares.length > 0) {
          mergeServerFaceSquaresIntoTracker(res.face_squares, res.frame_width || targetW, res.frame_height || targetH, false, reqDuration);
        }
      }

      updateLiveCountersUI(res);
    }
  } catch (err) {
    console.warn('[AI] Server inference notice:', err);
  } finally {
    state.isServerBusy = false;
  }
}

// Backward compatibility alias
async function processWebcamFrame() {
  await processServerInference();
}

function updateLiveCountersUI(res) {
  state.latestDetectionResult = res;
  const count = res.ai_detected_count !== undefined ? res.ai_detected_count : (state.latestLiveCount || 0);
  const total = res.total_students || state.cachedTotalStudents || 35;
  const official = res.official_attendance_count !== undefined ? res.official_attendance_count : (state.cachedOfficialAttendance || 0);
  const diff = Math.abs(official - count);
  const activeTab = getValidCategoryTab(state.activeCameraTab);

  // Re-render single active category card
  const metricsContainer = document.getElementById('surveillanceMetricsContainer');
  if (metricsContainer) {
    metricsContainer.innerHTML = renderSelectedCategoryCardHTML(res, activeTab);
  }

  // Update discrepancy banner if on Attendance
  const bannerEl = document.getElementById('cameraDiscrepancyBanner');
  if (bannerEl) {
    bannerEl.innerHTML = getDiscrepancyBannerHTML(official, count, total, diff, diff > 0);
  }

  // Update HUD Range
  updateCameraHUDRange(res, activeTab);
}

function toggleFootagePlayback() {
  const videoEl = document.getElementById('webcamVideo');
  const btnText = document.getElementById('btnPlayPauseText');
  const btn = document.getElementById('btnPlayPauseFootage');
  if (!videoEl) return;
  if (videoEl.paused) {
    videoEl.muted = true;
    videoEl.play();
    if (btnText) btnText.textContent = 'PAUSE FOOTAGE';
    if (btn) {
      const iconSpan = btn.querySelector('span:first-child');
      if (iconSpan) iconSpan.textContent = '⏸';
    }
    startLiveFrameDetection();
  } else {
    videoEl.pause();
    stopLiveFrameDetection();
    state.activeFaceTracks = [];
    if (btnText) btnText.textContent = 'PLAY FOOTAGE';
    if (btn) {
      const iconSpan = btn.querySelector('span:first-child');
      if (iconSpan) iconSpan.textContent = '▶';
    }
  }
}

async function handleTC2VideoUpload(input) {
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  showToast(`Uploading ${file.name} for Training Centre 2...`, 'info');

  const formData = new FormData();
  formData.append('file', file);
  formData.append('centre_id', 'TC2');

  try {
    const res = await fetch('/api/footage/upload', {
      method: 'POST',
      body: formData
    }).then(r => r.json());

    if (res.success) {
      showToast(res.message || 'Footage uploaded and analyzed successfully!', 'success');
      const container = document.getElementById('mainContentContainer');
      await renderGovFootage(container);
    } else {
      showToast(res.message || 'Failed to upload footage.', 'error');
    }
  } catch (err) {
    console.error('Footage upload error:', err);
    showToast('Network error uploading footage.', 'error');
  }
}

// ===========================================================================
// SECTION 16: EQUIPMENT CATEGORY — GOVERNMENT VIEW (ALLOCATION & AUDIT)
// ===========================================================================
// ===========================================================================
// SECTION 16: EQUIPMENT CATEGORY — GOVERNMENT VIEW (ALLOCATION & AUDIT)
// ===========================================================================
async function renderGovEquipment(container) {
  const selectedCentre = state.govSelectedCentreId || 'TC1';
  const [resCat, resInv, resIssues] = await Promise.all([
    fetch(`/api/equipment/categories?centre_id=${selectedCentre}`).then(r => r.json()).catch(() => ({ success: false })),
    fetch(`/api/equipment/inventory?centre_id=${selectedCentre}`).then(r => r.json()).catch(() => ({ success: false, items: [] })),
    fetch(`/api/equipment/issues?centre_id=${selectedCentre}`).then(r => r.json()).catch(() => ({ success: false, issues: [] }))
  ]);

  const catData = (resCat && resCat.success) ? resCat : {
    centre_id: selectedCentre,
    centre_name: selectedCentre === 'TC1' ? 'Training Centre 1' : 'Training Centre 2',
    categories: [],
    summary: { total_allotted: 0, total_good: null, total_damaged: 0, total_missing: 0, total_camera_detected: 0, overall_status: 'Pending' }
  };
  const centreName = catData.centre_name || (selectedCentre === 'TC1' ? 'Training Centre 1' : 'Training Centre 2');
  const categories = catData.categories || [];
  const summary = catData.summary || {};
  const inventoryItems = resInv.items || [];
  // Exclude old seed comments (ISS-TC1-001, etc.)
  const issues = (resIssues.issues || []).filter(iss => !['ISS-TC1-001', 'ISS-TC1-002', 'ISS-TC2-001'].includes(iss.issue_id));

  const catIcons = {
    desks_chairs: { icon: '🪑', color: 'indigo' },
    'desks/chairs': { icon: '🪑', color: 'indigo' },
    desks: { icon: '🗄️', color: 'indigo' },
    computers: { icon: '🖥️', color: 'blue' },
    machines: { icon: '⚙️', color: 'amber' },
    fans: { icon: '💨', color: 'teal' },
    chairs: { icon: '🪑', color: 'purple' },
    tools: { icon: '🔧', color: 'emerald' }
  };

  const activeSubTab = state.govEquipmentSubTab || 'allocations';

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Header Bar with Title -->
      <div class="border-b border-slate-200 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 class="text-xl font-bold text-slate-900">Equipment Management</h2>
          <p class="text-xs text-slate-500">Manage category allocations, equipment inventory, audit records, and reported damaged equipment for ${centreName}</p>
        </div>
      </div>

      <!-- Sub-tabs Navigation -->
      <div class="flex items-center space-x-1 border-b border-slate-200">
        <button 
          type="button" 
          onclick="switchGovEquipmentSubTab('allocations')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'allocations' ? 'border-blue-600 text-blue-700 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>📊</span>
          <span>Category Allocations</span>
        </button>
        <button 
          type="button" 
          onclick="switchGovEquipmentSubTab('inventory')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'inventory' ? 'border-blue-600 text-blue-700 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>📦</span>
          <span>Equipment Inventory (${inventoryItems.length})</span>
        </button>
        <button 
          type="button" 
          onclick="switchGovEquipmentSubTab('audit')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'audit' ? 'border-blue-600 text-blue-700 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>🔍</span>
          <span>Audit List</span>
        </button>
        <button 
          type="button" 
          onclick="switchGovEquipmentSubTab('damaged')" 
          class="px-4 py-2.5 text-xs font-bold transition border-b-2 cursor-pointer flex items-center gap-2 ${activeSubTab === 'damaged' ? 'border-blue-600 text-blue-700 bg-blue-50/40' : 'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300'}"
        >
          <span>⚠️</span>
          <span>Reported Damaged (${issues.length})</span>
        </button>
      </div>

      <!-- SUB-TAB 1: CATEGORY ALLOCATIONS -->
      ${activeSubTab === 'allocations' ? `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Category Allocation Controls</div>
              <h3 class="text-base font-black text-slate-900 mt-0.5">Category Allocations for ${centreName}</h3>
              <p class="text-xs text-slate-500">Enter and update official allocated quantities per category. Values are saved persistently and synchronized with Trainee Officials.</p>
            </div>
            <button 
              type="button" 
              onclick="saveGovCategoryAllocations()" 
              id="btnSaveGovCatAllocations" 
              class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer self-start sm:self-auto"
            >
              <span>💾</span>
              <span>SAVE ALLOCATIONS</span>
            </button>
          </div>

          <!-- 6 Category Cards Grid -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4" id="govCategoryCardsGrid">
            ${categories.map(cat => {
              const meta = catIcons[cat.category_key.toLowerCase()] || { icon: '📦', color: 'slate' };
              const isReported = (cat.reported_good !== null);
              return `
                <div class="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between space-y-3 shadow-xs hover:border-slate-300 transition">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="text-2xl">${meta.icon}</span>
                      <div>
                        <h4 class="font-black text-sm text-slate-900">${cat.category_name}</h4>
                        <div class="text-[10px] font-mono text-slate-400 uppercase">${cat.category_key}</div>
                      </div>
                    </div>
                    <span class="text-[10px] font-bold px-2 py-0.5 rounded-full ${isReported ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}">
                      ${isReported ? 'Reported' : 'Report Pending'}
                    </span>
                  </div>

                  <!-- Government Allotted Quantity Input Field -->
                  <div>
                    <label class="block font-bold text-xs text-slate-700 mb-1">
                      Official Allocated Quantity (Units) *
                    </label>
                    <input 
                      type="number" 
                      id="govAllotInput_${cat.category_key}" 
                      min="0" 
                      step="1" 
                      value="${cat.allotted_quantity}" 
                      class="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm font-black text-slate-900 bg-white focus:border-blue-600 outline-none"
                      placeholder="Enter allocated count" 
                    />
                  </div>

                  <!-- Condition Status Reported by Trainee Official -->
                  <div class="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                    <div class="flex items-center justify-between text-xs">
                      <span class="text-slate-500 font-semibold">Verified good:</span>
                      <span class="font-mono font-bold ${isReported ? 'text-emerald-700 text-sm' : 'text-amber-700 italic'}">
                        ${isReported ? `${cat.reported_good} / ${cat.allotted_quantity} Units` : 'Not submitted'}
                      </span>
                    </div>
                    <div class="flex items-center justify-between text-xs pt-1 border-t border-slate-100">
                      <span class="text-slate-500 font-semibold">Damaged or Missing:</span>
                      <span class="font-mono font-bold ${cat.damaged_or_missing > 0 ? 'text-red-600' : 'text-slate-700'} text-xs">
                        ${cat.damaged_or_missing} Units
                      </span>
                    </div>
                  </div>

                  <div class="text-[10px] text-slate-400 flex items-center justify-between pt-1 border-t border-slate-200/60 font-mono">
                    <span>${cat.updated_at ? `Updated: ${cat.updated_at.substring(0, 10)}` : 'Database Persisted'}</span>
                    <span>${cat.updated_by || 'Government Official'}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- SUB-TAB 2: EQUIPMENT INVENTORY -->
      ${activeSubTab === 'inventory' ? `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Itemized Equipment Catalog</div>
              <h3 class="text-sm font-black text-slate-900 mt-0.5">Equipment Inventory List (${inventoryItems.length} Items)</h3>
              <p class="text-xs text-slate-500">Government-supplied catalog for ${centreName}. Add or edit items, view trainee inspection remarks, delete entries, and mark reported damage as Fixed.</p>
            </div>

            <div class="flex flex-wrap items-center gap-2">
              <button 
                type="button" 
                onclick="toggleAddGovItemForm()" 
                class="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
              >
                <span>➕</span>
                <span>ADD EQUIPMENT ITEM</span>
              </button>
            </div>
          </div>

          <!-- Collapsible Add Item Form -->
          <div id="addGovItemFormContainer" class="hidden p-4 bg-slate-100/90 border-b border-slate-200">
            <form onsubmit="handleSaveGovItemSubmit(event)" class="space-y-3">
              <div class="font-bold text-xs text-slate-800 flex items-center gap-1.5">
                <span>📝</span>
                <span>Add or Edit Itemized Equipment</span>
              </div>
              <input type="hidden" id="govItemEditId" value="" />
              <div class="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label class="block font-semibold text-slate-700 text-xs mb-1">Equipment Name *</label>
                  <input type="text" id="govItemName" required placeholder="e.g. Lathe Machine 04" class="w-full border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 text-xs mb-1">Category *</label>
                  <select id="govItemCategory" class="w-full border rounded-lg px-3 py-1.5 text-xs bg-white outline-none">
                    <option value="Desks/chairs">Desks/chairs</option>
                    <option value="Computers">Computers</option>
                    <option value="Machines">Machines</option>
                    <option value="Fans">Fans</option>
                    <option value="Tools">Tools</option>
                  </select>
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 text-xs mb-1">Unique ID / Serial # *</label>
                  <input type="text" id="govItemSerial" required placeholder="e.g. SN-LM-04" class="w-full border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:border-blue-600" />
                </div>
                <div>
                  <label class="block font-semibold text-slate-700 text-xs mb-1">Quantity *</label>
                  <input type="number" id="govItemQuantity" min="1" step="1" value="1" required class="w-full border rounded-lg px-3 py-1.5 text-xs bg-white outline-none focus:border-blue-600" />
                </div>
              </div>
              <div class="flex items-center justify-end space-x-2 pt-1">
                <button type="button" onclick="toggleAddGovItemForm(false)" class="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-xs rounded-lg transition cursor-pointer">
                  CANCEL
                </button>
                <button type="submit" class="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg shadow transition cursor-pointer">
                  SAVE ITEM
                </button>
              </div>
            </form>
          </div>

          <div class="overflow-x-auto">
            <table class="w-full text-left text-xs">
              <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
                <tr>
                  <th class="py-3 px-4">Equipment Name</th>
                  <th class="py-3 px-4">Category</th>
                  <th class="py-3 px-4">Serial Number / Unique ID</th>
                  <th class="py-3 px-4 text-center">Qty</th>
                  <th class="py-3 px-4">Inspection Status</th>
                  <th class="py-3 px-4 min-w-[200px]">Trainee Remarks</th>
                  <th class="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 font-medium">
                ${inventoryItems.length === 0 ? `
                  <tr><td colspan="7" class="py-6 text-center text-slate-400">No equipment items found for ${centreName}.</td></tr>
                ` : inventoryItems.map(item => {
                  const isFixed = (item.inspection_status === 'Fixed');
                  const isDamaged = (item.inspection_status === 'Damaged');
                  const isMissing = (item.inspection_status === 'Missing');
                  return `
                    <tr class="hover:bg-slate-50/70 transition">
                      <td class="py-3 px-4 font-bold text-slate-900">${item.equipment_name}</td>
                      <td class="py-3 px-4">
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">${item.category}</span>
                      </td>
                      <td class="py-3 px-4 font-mono text-slate-600 font-bold">${item.serial_number || item.standard_tag || item.equipment_id}</td>
                      <td class="py-3 px-4 text-center font-bold text-slate-800">${item.quantity || 1}</td>
                      <td class="py-3 px-4">
                        ${isFixed ? `
                          <span class="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-1">
                            <span>✓</span> <span>Fixed</span>
                          </span>
                        ` : isDamaged ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-800">Damaged</span>
                        ` : isMissing ? `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Missing</span>
                        ` : `
                          <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Good</span>
                        `}
                      </td>
                      <td class="py-3 px-4 text-slate-600">
                        ${item.trainee_comment ? `
                          <span class="italic font-normal text-slate-700">"${item.trainee_comment}"</span>
                          <div class="text-[10px] text-slate-400 font-mono mt-0.5">By ${item.inspected_by || 'Trainee'}</div>
                        ` : `
                          <span class="text-slate-400 italic">No defect reported</span>
                        `}
                      </td>
                      <td class="py-3 px-4 text-right space-x-1.5 whitespace-nowrap">
                        ${(isDamaged || isMissing) ? `
                          <button 
                            type="button" 
                            onclick="markEquipmentAsFixed('${item.equipment_id}')"
                            class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-xs transition cursor-pointer inline-flex items-center gap-1"
                          >
                            <span>✓</span> <span>Mark as Fixed</span>
                          </button>
                        ` : ''}
                        <button 
                          type="button" 
                          onclick="editGovEquipmentItem('${item.equipment_id}', '${encodeURIComponent(item.equipment_name)}', '${item.category}', '${encodeURIComponent(item.serial_number || '')}', ${item.quantity || 1})"
                          class="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold text-[10px] rounded transition cursor-pointer"
                        >
                          Edit
                        </button>
                        <button 
                          type="button" 
                          onclick="deleteGovEquipmentItem('${item.equipment_id}', '${encodeURIComponent(item.equipment_name)}')"
                          class="px-2 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 font-bold text-[10px] rounded transition cursor-pointer"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      ` : ''}

      <!-- SUB-TAB 3: AUDIT LIST -->
      ${activeSubTab === 'audit' ? `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-5">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance-Style Audit Summary</div>
              <h3 class="text-base font-black text-slate-900 mt-0.5">Government Audit Totals & Camera Vision Comparison</h3>
              <p class="text-xs text-slate-500">Summary totals across all categories and verified comparison against AI camera vision for ${centreName}</p>
            </div>
            <div class="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg text-xs font-bold ${summary.has_discrepancy ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-100 text-emerald-900 border border-emerald-300'}">
              <span>${summary.has_discrepancy ? '⚠️' : '✓'}</span>
              <span>${summary.overall_status || 'Reconciled'}</span>
            </div>
          </div>

          <!-- 5-Metric Summary Cards Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
            <div class="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl space-y-1">
              <div class="text-[10px] font-bold uppercase text-blue-700 tracking-wider">1. Total Allocated</div>
              <div class="text-2xl font-black text-blue-950 font-mono">
                ${summary.total_allotted} <span class="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div class="text-[10px] text-blue-700/80">Sum across all categories</div>
            </div>

            <div class="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-1">
              <div class="text-[10px] font-bold uppercase text-emerald-700 tracking-wider">2. Good Condition</div>
              <div class="text-2xl font-black text-emerald-950 font-mono">
                ${summary.total_good !== null ? `${summary.total_good}` : 'Pending'} <span class="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div class="text-[10px] text-emerald-700/80">Certified working units</div>
            </div>

            <div class="p-3.5 bg-red-50/70 border border-red-200 rounded-xl space-y-1">
              <div class="text-[10px] font-bold uppercase text-red-700 tracking-wider">3. Damaged</div>
              <div class="text-2xl font-black text-red-950 font-mono">
                ${summary.total_damaged} <span class="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div class="text-[10px] text-red-700/80">Requiring repair</div>
            </div>

            <div class="p-3.5 bg-amber-50/70 border border-amber-200 rounded-xl space-y-1">
              <div class="text-[10px] font-bold uppercase text-amber-700 tracking-wider">4. Missing</div>
              <div class="text-2xl font-black text-amber-950 font-mono">
                ${summary.total_missing} <span class="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div class="text-[10px] text-amber-700/80">Unaccounted items</div>
            </div>

            <div class="p-3.5 bg-cyan-50/70 border border-cyan-200 rounded-xl space-y-1">
              <div class="text-[10px] font-bold uppercase text-cyan-700 tracking-wider">5. Camera Detected</div>
              <div class="text-2xl font-black text-cyan-950 font-mono">
                ${summary.total_camera_detected} <span class="text-xs font-semibold text-slate-500">Units</span>
              </div>
              <div class="text-[10px] text-cyan-700/80">Tracked in camera view</div>
            </div>
          </div>

          <!-- Category Comparison Table -->
          <div class="space-y-2">
            <div class="text-xs font-bold text-slate-800 flex items-center justify-between">
              <span>Category-Level AI Camera Reconciliation:</span>
              <span class="text-[10px] text-slate-400 font-normal">* Compares certified good items with camera-detected units</span>
            </div>

            <div class="overflow-x-auto border border-slate-200 rounded-lg">
              <table class="w-full text-left text-xs">
                <thead class="bg-slate-100 text-slate-700 uppercase font-bold text-[10px] tracking-wider border-b">
                  <tr>
                    <th class="py-2.5 px-3.5">Category</th>
                    <th class="py-2.5 px-3.5 text-center">Allocated</th>
                    <th class="py-2.5 px-3.5 text-center">Reported Good</th>
                    <th class="py-2.5 px-3.5 text-center">AI Camera Detected</th>
                    <th class="py-2.5 px-3.5">Comparison Status</th>
                    <th class="py-2.5 px-3.5">Audit Note</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 font-medium">
                  ${categories.map(cat => {
                    const isFan = (cat.category_key.toLowerCase() === 'fans');
                    return `
                      <tr class="hover:bg-slate-50">
                        <td class="py-2.5 px-3.5 font-bold text-slate-900">${cat.category_name}</td>
                        <td class="py-2.5 px-3.5 text-center font-mono font-bold">${cat.allotted_quantity}</td>
                        <td class="py-2.5 px-3.5 text-center font-mono ${cat.reported_good !== null ? 'text-emerald-700 font-bold' : 'text-amber-700 italic'}">
                          ${cat.reported_good !== null ? cat.reported_good : 'Pending'}
                        </td>
                        <td class="py-2.5 px-3.5 text-center font-mono font-bold ${isFan ? 'text-slate-400 font-normal italic' : 'text-cyan-800'}">
                          ${cat.camera_display}
                        </td>
                        <td class="py-2.5 px-3.5">
                          ${isFan ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Unavailable / Not in view</span>
                          ` : cat.camera_status === 'Matched' ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Matched</span>
                          ` : cat.camera_status === 'Discrepancy' ? `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">⚠️ Discrepancy</span>
                          ` : `
                            <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600">Pending</span>
                          `}
                        </td>
                        <td class="py-2.5 px-3.5 text-slate-600 text-[11px]">${cat.camera_note}</td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ` : ''}

      <!-- SUB-TAB 4: REPORTED DAMAGED -->
      ${activeSubTab === 'damaged' ? `
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
          <div class="px-5 py-4 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
            <div>
              <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Reported Defects Log</div>
              <h3 class="text-sm font-black text-slate-900 mt-0.5">Reported Damaged Equipment Log (${issues.length} Records)</h3>
              <p class="text-xs text-slate-500">Defects and issues reported by training centre officials for ${centreName}</p>
            </div>
            <div class="text-xs text-slate-500">
              Officials can resolve defects by clicking <b>"Mark as Fixed"</b>
            </div>
          </div>

          <div class="divide-y divide-slate-100" id="govIssuesList">
            ${issues.length === 0 ? `
              <div class="p-6 text-center text-xs text-slate-400">No issues reported matching filters. Old seed comments removed.</div>
            ` : issues.map(iss => {
              const isFixed = (iss.status === 'Fixed');
              return `
                <div class="p-4 hover:bg-slate-50 transition space-y-2 text-xs">
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="font-bold text-sm text-slate-900">${iss.equipment_name}</span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold ${isFixed ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}">
                        Status: ${isFixed ? 'Fixed' : iss.issue_type}
                      </span>
                      <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border">
                        ${iss.centre_id === 'TC1' ? 'Training Centre 1' : 'Training Centre 2'}
                      </span>
                    </div>
                    <div class="flex items-center space-x-3">
                      <span class="font-mono text-slate-400 text-[11px]">${iss.date}</span>
                      ${!isFixed ? `
                        <button 
                          type="button" 
                          onclick="markIssueAsFixed('${iss.issue_id}')"
                          class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded shadow-xs transition cursor-pointer flex items-center gap-1"
                        >
                          <span>✓</span> <span>Mark as Fixed</span>
                        </button>
                      ` : `
                        <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">✓ Resolved</span>
                      `}
                    </div>
                  </div>

                  <div class="text-slate-800 text-xs font-medium pl-1">
                    Comment: <span class="italic font-normal text-slate-700">"${iss.comment}"</span>
                  </div>

                  <div class="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Reported by: <b>${iss.reported_by}</b></span>
                    <span class="font-mono text-[10px] text-slate-400">ID: ${iss.issue_id}</span>
                  </div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}
    </div>
  `;
}

// Sub-tab switcher for Government Officials Equipment page
window.switchGovEquipmentSubTab = function(subTab) {
  state.govEquipmentSubTab = subTab;
  renderGovEquipment(document.getElementById('mainContentContainer'));
};

// Delete Equipment Item from Government catalog
window.deleteGovEquipmentItem = async function(eqId, encodedName) {
  const name = decodeURIComponent(encodedName || eqId);
  const confirmed = window.confirm(`Are you sure you want to permanently delete '${name}' (${eqId}) from the equipment inventory?\n\nThis will remove the item from the active database catalog. Associated historical audit logs will be preserved.`);
  if (!confirmed) return;

  try {
    const res = await fetch('/api/equipment/inventory/item', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment_id: eqId,
        user_id: state.currentUser ? state.currentUser.user_id : undefined,
        role: state.currentUser ? state.currentUser.role : undefined
      })
    }).then(r => r.json());

    if (res.success) {
      showToast(res.message || 'Equipment item deleted successfully.', 'success');
      await renderGovEquipment(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to delete equipment item.', 'error');
    }
  } catch (err) {
    console.error('Error deleting equipment item:', err);
    showToast('Network error while deleting equipment item.', 'error');
  }
};

// Government Official saves category allocations
async function saveGovCategoryAllocations() {
  const selectedCentre = state.govSelectedCentreId || 'TC1';
  const inputs = document.querySelectorAll('input[id^="govAllotInput_"]');
  const allocations = [];

  for (const inp of inputs) {
    const key = inp.id.replace('govAllotInput_', '');
    const valStr = inp.value.trim();
    if (valStr === '' || isNaN(valStr)) {
      showToast(`Please enter a valid allocation count for ${key}.`, 'error');
      inp.focus();
      return;
    }
    const qty = Number(valStr);
    if (!Number.isInteger(qty) || qty < 0) {
      showToast(`Allocation count for ${key} must be a non-negative whole number.`, 'error');
      inp.focus();
      return;
    }
    allocations.push({
      category_key: key,
      allotted_quantity: qty
    });
  }

  const btn = document.getElementById('btnSaveGovCatAllocations');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'SAVING...';
  }

  try {
    const res = await fetch('/api/equipment/categories/allocate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: selectedCentre,
        allocations: allocations,
        updated_by: state.currentUser ? state.currentUser.name : 'Government Official'
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('Category allocations updated successfully and synced with Trainee portal.', 'success');
      await renderGovEquipment(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to update category allocations.', 'error');
    }
  } catch (err) {
    console.error('Error saving category allocations:', err);
    showToast('Network error while saving category allocations.', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'SAVE ALLOCATIONS';
    }
  }
}

// Toggle Add/Edit Item Form in Government equipment catalog
window.toggleAddGovItemForm = function(forceState) {
  const container = document.getElementById('addGovItemFormContainer');
  if (!container) return;
  if (forceState !== undefined) {
    if (forceState) container.classList.remove('hidden');
    else container.classList.add('hidden');
  } else {
    container.classList.toggle('hidden');
  }
  if (!container.classList.contains('hidden')) {
    const nameInp = document.getElementById('govItemName');
    if (nameInp) nameInp.focus();
  }
};

// Edit existing item in government catalog
window.editGovEquipmentItem = function(eqId, encodedName, category, encodedSerial, qty) {
  const container = document.getElementById('addGovItemFormContainer');
  if (!container) return;
  container.classList.remove('hidden');

  document.getElementById('govItemEditId').value = eqId;
  document.getElementById('govItemName').value = decodeURIComponent(encodedName);
  let resolvedCategory = category;
  if (resolvedCategory === 'Desks' || resolvedCategory === 'Chairs') {
    resolvedCategory = 'Desks/chairs';
  }
  document.getElementById('govItemCategory').value = resolvedCategory;
  document.getElementById('govItemSerial').value = decodeURIComponent(encodedSerial);
  document.getElementById('govItemQuantity').value = qty;
  document.getElementById('govItemName').focus();
};

// Save newly added or edited item in government catalog
async function handleSaveGovItemSubmit(e) {
  e.preventDefault();
  const selectedCentre = state.govSelectedCentreId || 'TC1';
  const editId = document.getElementById('govItemEditId').value.trim();
  const name = document.getElementById('govItemName').value.trim();
  const cat = document.getElementById('govItemCategory').value;
  const serial = document.getElementById('govItemSerial').value.trim();
  const qty = Number(document.getElementById('govItemQuantity').value);

  try {
    const res = await fetch('/api/equipment/inventory/item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        centre_id: selectedCentre,
        equipment_id: editId || undefined,
        equipment_name: name,
        category: cat,
        serial_number: serial,
        quantity: qty
      })
    }).then(r => r.json());

    if (res.success) {
      showToast(res.message || 'Equipment item saved successfully.', 'success');
      toggleAddGovItemForm(false);
      await renderGovEquipment(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to save equipment item.', 'error');
    }
  } catch (err) {
    console.error('Error saving equipment item:', err);
    showToast('Network error while saving equipment item.', 'error');
  }
}

// Government Official marks an equipment item as Fixed
window.markEquipmentAsFixed = async function(equipmentId) {
  try {
    const res = await fetch('/api/equipment/inventory/fix-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        equipment_id: equipmentId,
        fixed_by: state.currentUser ? state.currentUser.name : 'Government Official'
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('Equipment marked as Fixed. Status updated in both portals.', 'success');
      await renderGovEquipment(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to mark as Fixed.', 'error');
    }
  } catch (err) {
    console.error('Error marking as fixed:', err);
    showToast('Network error while updating status.', 'error');
  }
};

// Government Official marks an issue as Fixed
window.markIssueAsFixed = async function(issueId) {
  try {
    const res = await fetch('/api/equipment/inventory/fix-item', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        issue_id: issueId,
        fixed_by: state.currentUser ? state.currentUser.name : 'Government Official'
      })
    }).then(r => r.json());

    if (res.success) {
      showToast('Issue marked as Fixed. Status updated in both portals.', 'success');
      await renderGovEquipment(document.getElementById('mainContentContainer'));
    } else {
      showToast(res.message || 'Failed to mark issue as Fixed.', 'error');
    }
  } catch (err) {
    console.error('Error marking issue as fixed:', err);
    showToast('Network error while updating status.', 'error');
  }
};

async function onGovEquipmentCentreChange(centreId) {
  state.govSelectedCentreId = centreId;
  const container = document.getElementById('mainContentContainer');
  await renderGovEquipment(container);
}

// ---------------------------------------------------------------------------
// TOAST NOTIFICATIONS
// ---------------------------------------------------------------------------
function showToast(message, type = 'info') {
  const container = document.getElementById('toastSlot');
  const toast = document.createElement('div');
  let bg = 'bg-slate-900 text-white border-slate-700';
  if (type === 'success') bg = 'bg-emerald-700 text-white border-emerald-600';
  if (type === 'error') bg = 'bg-red-700 text-white border-red-600';

  toast.className = `px-4 py-3 rounded-lg shadow-xl text-xs font-semibold border flex items-center space-x-2 transition-all transform duration-200 opacity-0 translate-y-2 ${bg}`;
  toast.innerHTML = `<span>${type === 'success' ? '✓' : type === 'error' ? '✖' : 'ℹ'}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.classList.remove('opacity-0', 'translate-y-2');
  }, 10);

  setTimeout(() => {
    toast.classList.add('opacity-0', 'translate-y-2');
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// ---------------------------------------------------------------------------
// 12. FOOTAGE ALERTS VIEW (GOVERNMENT OFFICIAL)
// ---------------------------------------------------------------------------
let footageAlertsState = {
  centreFilter: 'ALL',
  pollTimer: null,
  isFetching: false
};

window.onFootageAlertsCentreChange = async function(val) {
  footageAlertsState.centreFilter = val || 'ALL';
  await refreshFootageAlertsTable();
};

async function fetchFootageAlertsData(centreId) {
  try {
    const res = await fetch(`/api/alerts/footage?centre_id=${encodeURIComponent(centreId || 'ALL')}`);
    return await res.json();
  } catch (err) {
    console.error('Error fetching footage alerts:', err);
    return { success: false, alerts: [], centres: [], total_alerts: 0, ongoing_count: 0, resolved_count: 0 };
  }
}

async function refreshFootageAlertsTable() {
  if (footageAlertsState.isFetching) return;
  if (state.activeView !== 'footage_alerts') return;
  footageAlertsState.isFetching = true;

  try {
    const filter = footageAlertsState.centreFilter || 'ALL';
    const data = await fetchFootageAlertsData(filter);

    // Update metric counters
    const thisMonthEl = document.getElementById('statThisMonthAlerts');
    const totalEl = document.getElementById('statTotalAlerts');
    const ongoingEl = document.getElementById('statOngoingAlerts');
    const resolvedEl = document.getElementById('statResolvedAlerts');
    if (thisMonthEl) thisMonthEl.textContent = data.this_month_count !== undefined ? data.this_month_count : 0;
    if (totalEl) totalEl.textContent = (data.total_count !== undefined ? data.total_count : (data.total_alerts !== undefined ? data.total_alerts : (data.alerts ? data.alerts.length : 0)));
    if (ongoingEl) ongoingEl.textContent = data.ongoing_count || 0;
    if (resolvedEl) resolvedEl.textContent = data.resolved_count || 0;

    // Update table body
    const tbody = document.getElementById('footageAlertsTableBody');
    if (!tbody) return;

    if (!data.alerts || data.alerts.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-12 text-center">
            <div class="flex flex-col items-center justify-center space-y-2">
              <span class="text-3xl text-slate-300">🛡️</span>
              <div class="text-sm font-bold text-slate-700">No Footage Alerts Detected</div>
              <div class="text-xs text-slate-400 max-w-sm">
                All camera lenses are unobstructed and operating normally for ${filter === 'ALL' ? 'all training centres' : filter}.
              </div>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = data.alerts.map((alert) => {
      const isOngoing = (alert.status === 'Ongoing');
      const statusBadge = isOngoing
        ? `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-sm">
             <span class="relative flex h-2 w-2">
               <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
               <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-600"></span>
             </span>
             Ongoing
           </span>`
        : `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-sm">
             <span class="text-emerald-700 font-black">✓</span>
             Resolved
           </span>`;

      const alertMsg = (alert.alert_type && alert.alert_type.toLowerCase() === 'camera covered') ? 'camera covered' : (alert.alert_type || 'camera covered');
      const typeBadge = `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
        <span class="w-1.5 h-1.5 rounded-full bg-red-500"></span>
        ${alertMsg}
      </span>`;

      return `
        <tr class="hover:bg-slate-50 transition border-b border-slate-100">
          <td class="px-5 py-3.5 whitespace-nowrap">
            <div class="font-bold text-xs text-slate-900">${alert.centre_name || alert.centre_id}</div>
            <div class="text-[11px] font-mono text-slate-400">${alert.centre_id}</div>
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap">
            <div class="text-xs font-semibold text-slate-800">${alert.camera_display || alert.camera_id}</div>
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap">
            ${typeBadge}
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono text-slate-700">
            ${alert.date_covered || '—'}
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap text-xs font-mono font-semibold text-slate-800">
            ${alert.time_covered || '—'}
          </td>
          <td class="px-5 py-3.5 whitespace-nowrap">
            ${statusBadge}
          </td>
        </tr>
      `;
    }).join('');

  } catch (err) {
    console.error('Error refreshing alerts table:', err);
  } finally {
    footageAlertsState.isFetching = false;
  }
}

window.refreshFootageAlertsTable = refreshFootageAlertsTable;

async function renderGovFootageAlerts(container) {
  // Explicitly hide header centre switcher located left of theme change
  const govSelectorWrapper = document.getElementById('govCentreSelectorWrapper');
  if (govSelectorWrapper) {
    govSelectorWrapper.classList.add('hidden');
  }

  // Clear any existing poll timer
  if (footageAlertsState.pollTimer) {
    clearInterval(footageAlertsState.pollTimer);
    footageAlertsState.pollTimer = null;
  }

  container.innerHTML = `
    <div class="p-8 text-center text-slate-400 font-medium">Loading Footage Alerts...</div>
  `;

  const initialFilter = footageAlertsState.centreFilter || 'ALL';
  const data = await fetchFootageAlertsData(initialFilter);

  // Retrieve dynamic centres from API response
  const dynamicCentres = data.centres || [
    { centre_id: 'TC1', centre_name: 'Training Centre 1' },
    { centre_id: 'TC2', centre_name: 'Training Centre 2' }
  ];

  const centreOptionsHTML = `
    <option value="ALL" ${initialFilter === 'ALL' ? 'selected' : ''}>All Centres</option>
    ${dynamicCentres.map(c => `
      <option value="${c.centre_id}" ${initialFilter === c.centre_id ? 'selected' : ''}>
        ${c.centre_name || c.centre_id} (${c.centre_id})
      </option>
    `).join('')}
  `;

  container.innerHTML = `
    <div class="space-y-6">
      <!-- Top Header Bar with Dynamic Training Centre Switch -->
      <div class="border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">🚨</span>
            <h2 class="text-xl font-bold text-slate-900">Footage Alerts</h2>
          </div>
          <p class="text-xs text-slate-500 mt-1">Real-time detection and persistent audit logs of physical camera lens obstructions across training centres</p>
        </div>

        <!-- Dynamic Training Centre Switch Control -->
        <div class="flex items-center gap-2.5 bg-white border border-slate-200 rounded-xl px-3.5 py-2 shadow-sm self-start sm:self-auto">
          <label for="footageAlertsCentreSelect" class="text-xs font-bold text-slate-600 whitespace-nowrap flex items-center gap-1.5">
            <span>🏢</span>
            <span>Training Centre:</span>
          </label>
          <select 
            id="footageAlertsCentreSelect" 
            onchange="onFootageAlertsCentreChange(this.value)"
            class="bg-slate-50 hover:bg-slate-100 border border-slate-300 text-slate-900 text-xs font-bold rounded-lg px-3 py-1.5 shadow-inner focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            ${centreOptionsHTML}
          </select>
        </div>
      </div>

      <!-- Quick Metrics Overview Cards -->
      <div class="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <!-- This Month Alerts Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Covered This Month</div>
            <div class="text-2xl font-black text-slate-900 mt-1" id="statThisMonthAlerts">${data.this_month_count || 0}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Current calendar month</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-xl text-blue-600">
            📅
          </div>
        </div>

        <!-- Total Alerts Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Recorded Alerts</div>
            <div class="text-2xl font-black text-slate-900 mt-1" id="statTotalAlerts">${data.total_count !== undefined ? data.total_count : (data.total_alerts || 0)}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Persistent audit records</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-xl">
            📋
          </div>
        </div>

        <!-- Ongoing Obstructions Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Ongoing Obstructions</div>
            <div class="text-2xl font-black text-amber-600 mt-1" id="statOngoingAlerts">${data.ongoing_count || 0}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Currently active coverage</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-xl text-amber-600">
            ⚠️
          </div>
        </div>

        <!-- Resolved Events Card -->
        <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex items-center justify-between">
          <div>
            <div class="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Resolved Obstructions</div>
            <div class="text-2xl font-black text-emerald-600 mt-1" id="statResolvedAlerts">${data.resolved_count || 0}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">Restored camera visibility</div>
          </div>
          <div class="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-xl text-emerald-600">
            ✅
          </div>
        </div>
      </div>

      <!-- Footage Alerts Table Card -->
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="px-5 py-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50/50">
          <div>
            <h3 class="text-sm font-bold text-slate-900">Confirmed Camera Coverage Events</h3>
            <p class="text-xs text-slate-500">Chronological history with newest alerts listed first</p>
          </div>
          <div class="flex items-center gap-2">
            <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              <span class="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
              Live Synced
            </span>
            <button 
              onclick="refreshFootageAlertsTable()" 
              title="Refresh alerts"
              class="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 shadow-sm transition flex items-center gap-1 cursor-pointer"
            >
              <span>🔄</span>
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="bg-slate-50 border-b border-slate-200 text-[11px] font-bold uppercase tracking-wider text-slate-600">
                <th class="px-5 py-3">Training Centre</th>
                <th class="px-5 py-3">Camera</th>
                <th class="px-5 py-3">Alert Type</th>
                <th class="px-5 py-3">Date Covered</th>
                <th class="px-5 py-3">Time Covered</th>
                <th class="px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody id="footageAlertsTableBody" class="divide-y divide-slate-100">
              <!-- Rendered rows -->
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;

  // Populate table rows initially
  await refreshFootageAlertsTable();

  // Set up 3.5s background poller while user is on Footage Alerts view
  footageAlertsState.pollTimer = setInterval(async () => {
    if (state.activeView === 'footage_alerts') {
      await refreshFootageAlertsTable();
    } else {
      clearInterval(footageAlertsState.pollTimer);
      footageAlertsState.pollTimer = null;
    }
  }, 3500);
}
