BEGIN;

INSERT INTO departments (id, name, campus_location, description) VALUES
  ('10000000-0000-0000-0000-000000000001', 'Library Services', 'Nancy Thompson Library', 'Public-facing student services, circulation desk support, and quiet study operations.'),
  ('10000000-0000-0000-0000-000000000002', 'IT Help Desk', 'Technology Building', 'Low-friction technical support for students, faculty, and classroom labs.'),
  ('10000000-0000-0000-0000-000000000003', 'Student Success Center', 'CAS Building', 'Peer tutoring, student intake, and appointment coordination.'),
  ('10000000-0000-0000-0000-000000000004', 'Campus Recreation', 'Harwood Arena', 'Front desk operations, equipment checkout, and event support.')
ON CONFLICT (id) DO NOTHING;

INSERT INTO managers (id, department_id, first_name, last_name, email, role_title) VALUES
  ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001', 'Maya', 'Rivera', 'maya.rivera@kean.example', 'Library Operations Manager'),
  ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000002', 'Sam', 'Patel', 'sam.patel@kean.example', 'IT Support Supervisor'),
  ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000003', 'Grace', 'Chen', 'grace.chen@kean.example', 'Student Success Coordinator'),
  ('20000000-0000-0000-0000-000000000004', '10000000-0000-0000-0000-000000000004', 'Jordan', 'Brooks', 'jordan.brooks@kean.example', 'Recreation Desk Lead')
ON CONFLICT (id) DO NOTHING;

INSERT INTO applicants (
  id,
  student_number,
  first_name,
  last_name,
  email,
  phone,
  preferred_contact,
  major,
  year_level,
  public_summary,
  access_needs,
  max_weekly_hours
) VALUES
  (
    '30000000-0000-0000-0000-000000000001',
    'K10001',
    'Alex',
    'Morgan',
    'alex.morgan@student.example',
    '555-0101',
    'email',
    'Computer Science',
    'junior',
    'Reliable with basic tech support, front desk, and peer mentoring experience.',
    'Prefers clear written instructions and lightweight pages that load on older hardware.',
    12
  ),
  (
    '30000000-0000-0000-0000-000000000002',
    'K10002',
    'Nina',
    'Lopez',
    'nina.lopez@student.example',
    '555-0102',
    'text',
    'Psychology',
    'sophomore',
    'Friendly communicator with tutoring and scheduling experience.',
    'Needs predictable steps and visible save confirmations.',
    10
  ),
  (
    '30000000-0000-0000-0000-000000000003',
    'K10003',
    'Chris',
    'Kim',
    'chris.kim@student.example',
    '555-0103',
    'email',
    'Information Technology',
    'senior',
    'Experienced with troubleshooting, classroom technology, and ticket notes.',
    'Works best with text-first interfaces and low network usage.',
    15
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO applicant_skills (applicant_id, skill) VALUES
  ('30000000-0000-0000-0000-000000000001', 'customer service'),
  ('30000000-0000-0000-0000-000000000001', 'basic troubleshooting'),
  ('30000000-0000-0000-0000-000000000001', 'data entry'),
  ('30000000-0000-0000-0000-000000000002', 'tutoring'),
  ('30000000-0000-0000-0000-000000000002', 'scheduling'),
  ('30000000-0000-0000-0000-000000000002', 'customer service'),
  ('30000000-0000-0000-0000-000000000003', 'technical support'),
  ('30000000-0000-0000-0000-000000000003', 'basic troubleshooting'),
  ('30000000-0000-0000-0000-000000000003', 'documentation')
ON CONFLICT (applicant_id, skill) DO NOTHING;

INSERT INTO availability_blocks (id, applicant_id, day_of_week, start_time, end_time, note) VALUES
  ('40000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', 2, '08:00', '12:00', 'Free before afternoon classes'),
  ('40000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000001', 4, '13:00', '17:00', 'Available after lab'),
  ('40000000-0000-0000-0000-000000000003', '30000000-0000-0000-0000-000000000002', 1, '10:00', '14:00', 'Available around tutoring block'),
  ('40000000-0000-0000-0000-000000000004', '30000000-0000-0000-0000-000000000002', 3, '09:00', '12:00', 'Morning availability'),
  ('40000000-0000-0000-0000-000000000005', '30000000-0000-0000-0000-000000000003', 2, '09:00', '13:00', 'Can cover morning help desk'),
  ('40000000-0000-0000-0000-000000000006', '30000000-0000-0000-0000-000000000003', 5, '12:00', '16:00', 'Afternoon shift preferred')
ON CONFLICT (id) DO NOTHING;

INSERT INTO jobs (
  id,
  department_id,
  manager_id,
  title,
  description,
  location,
  hourly_rate,
  min_hours_per_week,
  max_hours_per_week,
  remote_possible,
  low_bandwidth_friendly
) VALUES
  (
    '50000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    '20000000-0000-0000-0000-000000000001',
    'Library Circulation Assistant',
    'Check out books, answer basic student questions, and keep the front desk organized.',
    'Nancy Thompson Library',
    15.50,
    6,
    12,
    FALSE,
    TRUE
  ),
  (
    '50000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    '20000000-0000-0000-0000-000000000002',
    'IT Help Desk Aide',
    'Assist students with password resets, lab printers, basic troubleshooting, and ticket notes.',
    'Technology Building',
    16.25,
    8,
    15,
    TRUE,
    TRUE
  ),
  (
    '50000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    '20000000-0000-0000-0000-000000000003',
    'Peer Tutoring Intake Assistant',
    'Welcome students, schedule tutoring sessions, and document intake needs.',
    'Student Success Center',
    15.75,
    5,
    10,
    FALSE,
    TRUE
  ),
  (
    '50000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    '20000000-0000-0000-0000-000000000004',
    'Recreation Front Desk Assistant',
    'Handle check-ins, equipment checkout, and event setup support.',
    'Harwood Arena',
    15.25,
    6,
    12,
    FALSE,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO job_required_skills (job_id, skill, required) VALUES
  ('50000000-0000-0000-0000-000000000001', 'customer service', TRUE),
  ('50000000-0000-0000-0000-000000000001', 'data entry', FALSE),
  ('50000000-0000-0000-0000-000000000002', 'basic troubleshooting', TRUE),
  ('50000000-0000-0000-0000-000000000002', 'technical support', FALSE),
  ('50000000-0000-0000-0000-000000000002', 'documentation', FALSE),
  ('50000000-0000-0000-0000-000000000003', 'tutoring', TRUE),
  ('50000000-0000-0000-0000-000000000003', 'scheduling', TRUE),
  ('50000000-0000-0000-0000-000000000004', 'customer service', TRUE),
  ('50000000-0000-0000-0000-000000000004', 'scheduling', FALSE)
ON CONFLICT (job_id, skill) DO NOTHING;

INSERT INTO job_shifts (id, job_id, day_of_week, start_time, end_time, open_slots) VALUES
  ('60000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 2, '09:00', '12:00', 2),
  ('60000000-0000-0000-0000-000000000002', '50000000-0000-0000-0000-000000000001', 4, '13:00', '16:00', 1),
  ('60000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 2, '09:00', '13:00', 2),
  ('60000000-0000-0000-0000-000000000004', '50000000-0000-0000-0000-000000000002', 5, '12:00', '16:00', 1),
  ('60000000-0000-0000-0000-000000000005', '50000000-0000-0000-0000-000000000003', 1, '10:00', '13:00', 1),
  ('60000000-0000-0000-0000-000000000006', '50000000-0000-0000-0000-000000000003', 3, '09:00', '12:00', 1),
  ('60000000-0000-0000-0000-000000000007', '50000000-0000-0000-0000-000000000004', 2, '08:00', '11:00', 1),
  ('60000000-0000-0000-0000-000000000008', '50000000-0000-0000-0000-000000000004', 4, '14:00', '17:00', 1)
ON CONFLICT (id) DO NOTHING;

INSERT INTO applications (id, applicant_id, job_id, status, applicant_note, manager_note) VALUES
  ('70000000-0000-0000-0000-000000000001', '30000000-0000-0000-0000-000000000001', '50000000-0000-0000-0000-000000000001', 'submitted', 'Interested in quiet morning shifts.', 'Strong availability fit.'),
  ('70000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003', '50000000-0000-0000-0000-000000000002', 'reviewing', 'Can help with lab printer and account questions.', 'Good technical profile.')
ON CONFLICT (id) DO NOTHING;

COMMIT;
