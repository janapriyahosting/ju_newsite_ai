/**
 * Shared validation functions for all frontend forms.
 */

export function cleanPhone(p: string): string {
  let cleaned = p.replace(/\D/g, "");
  if (cleaned.startsWith("91") && cleaned.length === 12) cleaned = cleaned.slice(2);
  else if (cleaned.startsWith("0") && cleaned.length === 11) cleaned = cleaned.slice(1);
  return cleaned;
}

export function isValidPhone(p: string): boolean {
  return /^[6-9]\d{9}$/.test(cleanPhone(p));
}

export function isValidEmail(e: string): boolean {
  if (!e) return true; // optional
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(e.trim());
}

export function isValidName(n: string): boolean {
  const trimmed = n.trim();
  return trimmed.length >= 2 && trimmed.length <= 255;
}

export function isValidAadhar(v: string): boolean {
  if (!v) return true; // optional
  return /^\d{12}$/.test(v.replace(/\s/g, ""));
}

export function isValidPan(v: string): boolean {
  if (!v) return true; // optional
  return /^[A-Z]{5}[0-9]{4}[A-Z]$/.test(v.toUpperCase().trim());
}

export function isValidPincode(v: string): boolean {
  if (!v) return true; // optional
  return /^\d{6}$/.test(v.replace(/\s/g, ""));
}

export function isValidDob18Plus(v: string): boolean {
  if (!v) return true; // optional
  const dob = new Date(v);
  if (isNaN(dob.getTime())) return false;
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 18 && age <= 120;
}

export function isPositiveNumber(v: string | number): boolean {
  if (!v && v !== 0) return true; // optional
  return Number(v) > 0;
}

// ── KYC Step Validators ──────────────────────────────────────────────────────

export function validateKycStep1(kyc: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!kyc.corr_address?.trim()) e.corr_address = "Correspondence address is required";
  if (!kyc.corr_city?.trim()) e.corr_city = "City is required";
  if (!kyc.corr_state?.trim()) e.corr_state = "State is required";
  if (!kyc.corr_pincode) e.corr_pincode = "Pincode is required";
  else if (!isValidPincode(kyc.corr_pincode)) e.corr_pincode = "Pincode must be exactly 6 digits";
  if (!kyc.perm_same_as_corr) {
    if (!kyc.perm_address?.trim()) e.perm_address = "Permanent address is required";
    if (!kyc.perm_city?.trim()) e.perm_city = "City is required";
    if (!kyc.perm_pincode) e.perm_pincode = "Pincode is required";
    else if (!isValidPincode(kyc.perm_pincode)) e.perm_pincode = "Pincode must be exactly 6 digits";
  }
  return e;
}

export function validateKycStep2(kyc: any): Record<string, string> {
  const e: Record<string, string> = {};
  // All optional, but validate format if provided
  if (kyc.co_applicant_phone && !isValidPhone(kyc.co_applicant_phone)) e.co_applicant_phone = "Invalid 10-digit mobile number";
  if (kyc.co_applicant_email && !isValidEmail(kyc.co_applicant_email)) e.co_applicant_email = "Invalid email format";
  if (kyc.co_applicant_aadhar && !isValidAadhar(kyc.co_applicant_aadhar)) e.co_applicant_aadhar = "Aadhar must be exactly 12 digits";
  if (kyc.co_applicant_pan && !isValidPan(kyc.co_applicant_pan)) e.co_applicant_pan = "PAN format: ABCDE1234F";
  if (kyc.co_applicant_name && kyc.co_applicant_name.trim().length < 2) e.co_applicant_name = "Name must be at least 2 characters";
  return e;
}

export function validateKycStep3(kyc: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (kyc.monthly_salary && !isPositiveNumber(kyc.monthly_salary)) e.monthly_salary = "Salary must be a positive number";
  if (kyc.has_existing_loans) {
    if (kyc.existing_loan_amount && !isPositiveNumber(kyc.existing_loan_amount)) e.existing_loan_amount = "Loan amount must be positive";
    if (kyc.existing_loan_emi && !isPositiveNumber(kyc.existing_loan_emi)) e.existing_loan_emi = "EMI must be a positive number";
  }
  return e;
}

export function validateKycStep4(kyc: any): Record<string, string> {
  const e: Record<string, string> = {};
  if (!kyc.aadhar_number) e.aadhar_number = "Aadhar number is required";
  else if (!isValidAadhar(kyc.aadhar_number)) e.aadhar_number = "Aadhar must be exactly 12 digits";
  if (!kyc.aadhar_name?.trim()) e.aadhar_name = "Name as per Aadhar is required";
  else if (kyc.aadhar_name.trim().length < 2) e.aadhar_name = "Name must be at least 2 characters";
  if (!kyc.pan_number) e.pan_number = "PAN number is required";
  else if (!isValidPan(kyc.pan_number)) e.pan_number = "PAN format: ABCDE1234F";
  if (!kyc.pan_name?.trim()) e.pan_name = "Name as per PAN is required";
  else if (kyc.pan_name.trim().length < 2) e.pan_name = "Name must be at least 2 characters";
  if (!kyc.date_of_birth) e.date_of_birth = "Date of birth is required";
  else if (!isValidDob18Plus(kyc.date_of_birth)) e.date_of_birth = "Must be at least 18 years old";
  return e;
}
