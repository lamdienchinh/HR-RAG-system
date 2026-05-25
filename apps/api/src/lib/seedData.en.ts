import type { QuestionSpec, SeedPolicy } from './types.js';

export const policiesEn: readonly SeedPolicy[] = [
  {
    id: 'time-off-policy',
    title: 'Time Off Policy',
    category: 'time-off',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Time Off Policy

Full-time employees receive 18 paid annual leave days per calendar year. Probationary employees receive pro-rated leave based on remaining months in the year.

Employees may carry over up to 5 unused annual leave days into the next calendar year. Carryover days expire on March 31 unless HR grants an exception for business-critical coverage.

Leave requests of 3 consecutive business days or fewer require manager approval at least 3 business days before the first day off. Leave requests longer than 3 consecutive business days require 10 business days of notice.

Unpaid leave may be considered on a case-by-case basis, requiring approval from the direct manager and HRBP. Unpaid leave must not exceed 30 calendar days in a single year.`,
  },
  {
    id: 'overtime-policy',
    title: 'Overtime Policy',
    category: 'overtime',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Overtime Policy

Overtime must be approved by the employee's direct manager before the work begins. Unapproved overtime is not reimbursable unless HR grants an exception for a documented production incident.

Weekday overtime is paid at 1.5x the employee's hourly equivalent. Saturday or Sunday work counts as weekend overtime. Weekend overtime is paid at 2.0x the employee's hourly equivalent when the work was pre-approved.

Weekend overtime related to a Severity 1 production incident may be retro-approved within 24 hours if the incident commander adds the employee to the incident record and the manager confirms the hours.

Employees must submit overtime claims within 5 business days with the approval reference, date, start time, end time, and incident or project code.`,
  },
  {
    id: 'leave-of-absence',
    title: 'Leave of Absence Policy',
    category: 'leave',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Leave of Absence Policy

Employees may use up to 10 paid sick leave days per year. A 3-day illness may be recorded as sick leave and requires a medical note only when the absence exceeds 3 consecutive business days.

Parental leave provides 16 paid weeks for primary caregivers and 4 paid weeks for secondary caregivers. Requests should be submitted at least 30 calendar days before the expected start date when possible.`,
  },
  {
    id: 'remote-work-policy',
    title: 'Remote Work Policy',
    category: 'remote-work',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Remote Work Policy

Employees may work remotely up to 3 days per week with manager approval.

Remote work from another country requires approval from the manager, HRBP, and Legal at least 15 business days before travel. Approval depends on payroll, tax, export control, and customer data handling constraints.`,
  },
  {
    id: 'expense-policy',
    title: 'Expense and Travel Policy',
    category: 'expense',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Expense and Travel Policy

Employees must submit reimbursable expenses within 30 calendar days of the transaction date. Receipts are required for expenses above 25 USD or the local equivalent.

Domestic travel requires manager approval before booking. International travel requires manager approval and Finance approval before booking.

Client entertainment above 150 USD requires approval from the department head and must include a business purpose in the expense report.`,
  },
  {
    id: 'compensation-policy',
    title: 'Compensation and Job Level Policy',
    category: 'compensation',
    version: '2026.1',
    status: 'current',
    sensitivity: 'confidential',
    content: `# Compensation and Job Level Policy

Salary bands are internal confidential guidance. A Senior Backend Engineer maps to job level E4. The E4 base salary band is 72,000 USD to 105,000 USD annualized, adjusted by country market zone.

Promotion from E4 to E5 requires scope across at least two teams, consistent technical leadership, and calibration approval from Engineering leadership and HRBP.

Compensation exceptions above band midpoint require approval from the department VP, HRBP, and Compensation Partner.`,
  },
  {
    id: 'equipment-policy',
    title: 'Equipment and Device Policy',
    category: 'equipment',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Equipment and Device Policy

New employees receive a company laptop, charger, security key, and standard peripherals before their start date when onboarding is submitted at least 7 business days in advance.

Employees may request one monitor, keyboard, mouse, and headset every 24 months. Equipment above 500 USD requires manager approval and IT asset tagging.

Lost or stolen devices must be reported to IT Security within 2 hours so the device can be locked and customer data access can be reviewed.`,
  },
  {
    id: 'access-control-policy',
    title: 'Access Control and Data Handling Policy',
    category: 'security',
    version: '2026.1',
    status: 'current',
    sensitivity: 'restricted',
    content: `# Access Control and Data Handling Policy

Access to production systems requires manager approval, system owner approval, and completion of security training within the last 12 months.

Customer data may not be copied into personal tools, public AI chatbots, or unmanaged devices. Redacted snippets may be used for debugging only when approved by the incident commander.

Access reviews run quarterly. Managers must remove access for employees who changed roles, transferred teams, or no longer need the system.`,
  },
  {
    id: 'performance-review-policy',
    title: 'Performance Review Policy',
    category: 'performance',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Performance Review Policy

Performance reviews happen twice per year: mid-year calibration in June and year-end calibration in December.

Employees should submit self-review notes at least 5 business days before the manager review conversation. Managers must include examples tied to impact, collaboration, and role expectations.

Performance improvement plans require HRBP review before delivery and must include measurable expectations, support actions, and a review date.`,
  },
  {
    id: 'onboarding-offboarding-policy',
    title: 'Onboarding and Offboarding Policy',
    category: 'employee-lifecycle',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Onboarding and Offboarding Policy

Hiring managers must submit onboarding requests at least 7 business days before the employee start date. Late requests may delay equipment delivery and system access.

For resignations, managers must submit offboarding within 1 business day of notice. IT disables standard access at the end of the final working day unless Legal or Security requests earlier action.

Departing employees must return laptop, security key, badge, and any tagged equipment within 5 business days after their final working day.`,
  },
  {
    id: 'old-overtime-policy-2024',
    title: 'Old Overtime Policy 2024',
    category: 'overtime',
    version: '2024.4',
    status: 'stale',
    sensitivity: 'internal',
    content: `# Old Overtime Policy 2024

This stale policy allowed weekend overtime claims up to 7 calendar days after work was completed when the employee's manager confirmed the hours. The current policy replaced this process with pre-approval and a 24-hour retro-approval path only for Severity 1 production incidents.`,
  },
  {
    id: 'training-development-policy',
    title: 'Training and Development Policy',
    category: 'training',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Training and Development Policy

Each employee receives an annual training budget of 20,000,000 VND per calendar year for job-related courses, certifications, and conferences. Budget cannot be carried over to the next year.

Training requests must be approved by the direct manager before registration. Technical certifications (AWS, GCP, Kubernetes) are prioritized for approval. Costs exceeding the budget require department head approval.

Employees who complete training must share knowledge with their team within 30 days through a presentation or internal documentation. Study time during work hours is limited to a maximum of 4 hours per week.

Employees who leave within 12 months of completing training costing over 10,000,000 VND must reimburse 50% of the training cost.`,
  },
  {
    id: 'code-of-conduct-policy',
    title: 'Code of Conduct and Ethics',
    category: 'conduct',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Code of Conduct and Ethics

Employees must treat colleagues, customers, and partners with respect. Harassment, discrimination, and bullying are not tolerated in any form.

Employees must avoid conflicts of interest. Any personal relationships that may influence business decisions must be reported to HRBP. Investments in suppliers or competitors require Legal approval.

Gifts from suppliers or partners must not exceed 500,000 VND. Gifts above this threshold must be reported and surrendered to the company fund. Cash or gift cards are not accepted under any circumstances.

Employees may not use company assets for personal purposes unless explicitly permitted by another policy.`,
  },
  {
    id: 'data-privacy-policy',
    title: 'Personal Data Protection Policy',
    category: 'privacy',
    version: '2026.1',
    status: 'current',
    sensitivity: 'restricted',
    content: `# Personal Data Protection Policy

Personal data of employees and customers is processed in accordance with Decree 13/2023/ND-CP on personal data protection. Sensitive personal data includes: health, financial, biometric, religious beliefs, and private life information.

Employees may only access personal data when necessary to perform their job (principle of least privilege). Data access must be logged and reviewed periodically.

Data protection breaches must be reported to Legal and the DPO within 24 hours. Reports must include: type of data affected, number of individuals affected, and remediation measures.

Personal data must be deleted or anonymized when no longer necessary for the purpose of collection. Maximum retention period for employee data is 10 years after separation.`,
  },
  {
    id: 'workplace-safety-policy',
    title: 'Workplace Safety Policy',
    category: 'safety',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Workplace Safety Policy

All employees must complete safety training during onboarding and refresh it annually. Workplace accidents must be reported to the manager and safety team within 1 hour.

Office spaces must comply with fire safety standards. Emergency exits must not be blocked. Fire equipment must be inspected monthly. Employees may not repair electrical equipment in the office themselves.

Remote work must also meet basic safety standards: ergonomic desk and chair, adequate lighting, and safe electrical outlets. The company provides 2,000,000 VND per year for remote workers to purchase ergonomic equipment.

Safety incidents must be recorded in the incident reporting system within 24 hours. Reports must include: incident description, cause, individuals involved, and preventive measures.`,
  },
  {
    id: 'referral-bonus-policy',
    title: 'Employee Referral Bonus Policy',
    category: 'referral',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Employee Referral Bonus Policy

Employees who refer a successful candidate receive a referral bonus after the candidate completes 90 days of employment. Bonus amounts: 15,000,000 VND for technical positions, 10,000,000 VND for non-technical positions.

The referrer must submit the referral before the candidate applies directly. Candidates already in the ATS system are not eligible for the bonus.

Referral bonuses are paid with the monthly salary. Personal income tax applies per current regulations. Direct managers are not eligible for bonuses for positions within their own team.

The referral program does not apply to temporary contracts, interns, and contractors. Bonuses may be adjusted or suspended at the discretion of HR.`,
  },
  {
    id: 'disciplinary-policy',
    title: 'Disciplinary Policy',
    category: 'disciplinary',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Disciplinary Policy

The disciplinary process includes 4 steps: verbal warning, written warning, suspension, and termination. Each step must be documented in writing.

Employees subject to disciplinary action have the right to respond and appeal. Appeals must be submitted within 5 business days of receiving the disciplinary decision. The disciplinary committee includes HRBP, senior manager, and employee representative.

Serious violations (fraud, theft, violence, confidential information disclosure) may result in immediate termination without prior warning steps.

Disciplinary records are stored in the HRIS system and accessible only by HRBP and the direct manager. Records are automatically deleted after 3 years from the last disciplinary action unless involved in legal proceedings.`,
  },
  {
    id: 'it-security-policy',
    title: 'Information Security Policy',
    category: 'security',
    version: '2026.2',
    status: 'current',
    sensitivity: 'restricted',
    content: `# Information Security Policy

Passwords must be at least 12 characters long, including uppercase, lowercase, numbers, and special characters. Passwords must be changed every 90 days. Previous passwords may not be reused within the last 12 iterations.

Multi-factor authentication (MFA) is mandatory for all internal and cloud systems. Employees must use an authenticator app instead of SMS when possible. Hardware security keys are recommended for admin accounts.

VPN is required when accessing internal systems from external networks. VPN connections must use WireGuard or IPSec protocols. SSH keys must be rotated every 6 months.

Security incidents must be reported immediately via the #security-incident Slack channel or the 24/7 security hotline. Employees must not attempt to investigate or remediate security incidents without guidance from the Security team.`,
  },
  {
    id: 'health-insurance-policy',
    title: 'Insurance and Benefits Policy',
    category: 'benefits',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Insurance and Benefits Policy

Full-time employees receive group health insurance covering: outpatient care, hospitalization, dental, and vision. Insurance is effective from the first day of employment. Dependents (spouse, children under 18) can be enrolled with the company covering 50% of the additional cost.

Annual wellness budget: 5,000,000 VND for employees, 8,000,000 VND for employees with dependents. Budget covers: gym, yoga, sports, or other wellness activities.

Annual health checkups are organized at partner hospitals. Results are confidential and shared only with the employee. The company does not access employee health checkup results.

Employees who leave the company remain insured until the end of their departure month. COBRA does not apply in Vietnam, but employees may switch to individual insurance per the insurer's regulations.`,
  },
  {
    id: 'promotion-policy',
    title: 'Promotion and Level Assessment Policy',
    category: 'career',
    version: '2026.1',
    status: 'current',
    sensitivity: 'confidential',
    content: `# Promotion and Level Assessment Policy

The leveling system includes: E1 (Intern), E2 (Junior), E3 (Mid), E4 (Senior), E5 (Staff), E6 (Principal), E7 (Distinguished). Each level has clear competency frameworks and expectations.

Promotion from E3 to E4 requires: at least 18 months at the current level, performance rating of Expectations or above for 2 consecutive cycles, and nomination from the direct manager.

Promotion from E4 to E5 requires: scope spanning at least 2 teams, mentoring at least 1 junior engineer, and delivery of a team/department-level impact project.

Promotion reviews happen quarterly. The application includes: self-assessment, manager assessment, peer feedback (at least 3 people), and a work portfolio. The calibration committee includes Engineering Manager, HRBP, and Director.

Promotion rejections must be explained in writing. Employees may resubmit after 6 months. There is no limit on the number of promotion attempts.`,
  },
  {
    id: 'intern-policy',
    title: 'Intern Policy',
    category: 'intern',
    version: '2026.1',
    status: 'current',
    sensitivity: 'internal',
    content: `# Intern Policy

Interns receive a stipend of 5,000,000 VND per month for a 6-month program. Maximum working hours: 40 hours per week. Interns may not work overtime.

Each intern is assigned a mentor who is a full-time employee at E3 or above. The mentor must dedicate at least 2 hours per week to coaching and work review.

Interns may not access production systems or customer data. Sandbox and staging access is granted upon mentor request.

Interns who complete the program successfully will be considered for full-time positions. The offer decision is made by the department manager and HRBP. Interns are not automatically converted to full-time employees.`,
  },
  {
    id: 'old-remote-work-policy-2024',
    title: 'Old Remote Work Policy 2024',
    category: 'remote-work',
    version: '2024.3',
    status: 'stale',
    sensitivity: 'internal',
    content: `# Old Remote Work Policy 2024

The old policy allowed unlimited remote work days with manager approval. There was no requirement for in-office days.

The current policy has limited this to 3 days per week and requires special approval for working from abroad.`,
  },
];

export const questionsEn: readonly QuestionSpec[] = [
  {
    id: 'hr-time-off-carryover',
    question: 'How many annual leave days can an employee carry over?',
    expectedPolicyIds: ['time-off-policy'],
    answerable: true,
  },
  {
    id: 'hr-ot-weekend-no-approval',
    question: 'Can I claim overtime if I worked Saturday without approval?',
    expectedPolicyIds: ['overtime-policy'],
    answerable: true,
  },
  {
    id: 'hr-remote-work-abroad',
    question: 'What approvals are needed to work remotely from another country?',
    expectedPolicyIds: ['remote-work-policy'],
    answerable: true,
  },
  {
    id: 'hr-three-day-illness',
    question: 'What leave applies for a 3-day illness?',
    expectedPolicyIds: ['leave-of-absence'],
    answerable: true,
  },
  {
    id: 'hr-salary-band',
    question: 'What salary band applies to a senior backend engineer?',
    expectedPolicyIds: ['compensation-policy'],
    answerable: true,
  },
  {
    id: 'hr-equipment-new-hire',
    question: 'What equipment does a new employee receive before starting?',
    expectedPolicyIds: ['equipment-policy'],
    answerable: true,
  },
  {
    id: 'hr-lost-device',
    question: 'How fast must a lost laptop be reported?',
    expectedPolicyIds: ['equipment-policy'],
    answerable: true,
  },
  {
    id: 'hr-production-access',
    question: 'What approvals are needed for production access?',
    expectedPolicyIds: ['access-control-policy'],
    answerable: true,
  },
  {
    id: 'hr-customer-data-ai-tools',
    question: 'Can customer data be copied into public AI chatbots?',
    expectedPolicyIds: ['access-control-policy'],
    answerable: true,
  },
  {
    id: 'hr-performance-review-cycle',
    question: 'When do performance reviews happen?',
    expectedPolicyIds: ['performance-review-policy'],
    answerable: true,
  },
  {
    id: 'hr-onboarding-request-window',
    question: 'How early should onboarding requests be submitted?',
    expectedPolicyIds: ['onboarding-offboarding-policy'],
    answerable: true,
  },
  // New policy questions
  {
    id: 'hr-training-budget',
    question: 'What is the annual training budget per employee?',
    expectedPolicyIds: ['training-development-policy'],
    answerable: true,
  },
  {
    id: 'hr-training-payback',
    question: 'What happens if I leave after completing expensive training?',
    expectedPolicyIds: ['training-development-policy'],
    answerable: true,
  },
  {
    id: 'hr-gift-limit',
    question: 'What is the maximum gift value from a supplier?',
    expectedPolicyIds: ['code-of-conduct-policy'],
    answerable: true,
  },
  {
    id: 'hr-referral-bonus',
    question: 'How much is the referral bonus for technical positions?',
    expectedPolicyIds: ['referral-bonus-policy'],
    answerable: true,
  },
  {
    id: 'hr-password-requirements',
    question: 'What are the password requirements under the IT security policy?',
    expectedPolicyIds: ['it-security-policy'],
    answerable: true,
  },
  {
    id: 'hr-mfa-required',
    question: 'Is multi-factor authentication mandatory?',
    expectedPolicyIds: ['it-security-policy'],
    answerable: true,
  },
  {
    id: 'hr-data-breach-report',
    question: 'How quickly must a data breach be reported?',
    expectedPolicyIds: ['data-privacy-policy'],
    answerable: true,
  },
  {
    id: 'hr-health-insurance-dependents',
    question: 'Can dependents be covered by health insurance?',
    expectedPolicyIds: ['health-insurance-policy'],
    answerable: true,
  },
  {
    id: 'hr-wellness-budget',
    question: 'What is the annual wellness budget?',
    expectedPolicyIds: ['health-insurance-policy'],
    answerable: true,
  },
  {
    id: 'hr-promotion-senior-to-staff',
    question: 'What are the requirements to promote from Senior to Staff?',
    expectedPolicyIds: ['promotion-policy'],
    answerable: true,
  },
  {
    id: 'hr-discipline-steps',
    question: 'What are the steps in the disciplinary process?',
    expectedPolicyIds: ['disciplinary-policy'],
    answerable: true,
  },
  {
    id: 'hr-intern-production-access',
    question: 'Can interns access production systems?',
    expectedPolicyIds: ['intern-policy'],
    answerable: true,
  },
  {
    id: 'hr-work-safety-wfh',
    question: 'What safety standards apply when working from home?',
    expectedPolicyIds: ['workplace-safety-policy'],
    answerable: true,
  },
  // Multi-hop questions
  {
    id: 'hr-new-hire-full-setup',
    question: 'What does a new hire need from IT, HR, and their manager?',
    expectedPolicyIds: ['onboarding-offboarding-policy', 'equipment-policy', 'access-control-policy'],
    answerable: true,
  },
  {
    id: 'hr-leave-comparison',
    question: 'Compare annual leave, sick leave, and parental leave — how many days for each?',
    expectedPolicyIds: ['time-off-policy', 'leave-of-absence'],
    answerable: true,
  },
  {
    id: 'hr-departure-process',
    question: 'When an employee leaves, what needs to happen with equipment, access, and handover?',
    expectedPolicyIds: ['onboarding-offboarding-policy', 'equipment-policy', 'access-control-policy'],
    answerable: true,
  },
  // Edge cases
  {
    id: 'hr-stock-forecast',
    question: 'What will the company stock price be next quarter?',
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: 'hr-lunch-menu',
    question: "What's on the cafeteria menu today?",
    expectedPolicyIds: [],
    answerable: false,
  },
  {
    id: 'hr-personal-loan',
    question: 'Can I borrow money from the company?',
    expectedPolicyIds: [],
    answerable: false,
  },
];
