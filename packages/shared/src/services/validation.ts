/** Indian mobile number: optional +91, followed by a valid 10-digit mobile prefix. */
export function isIndianMobileNumber(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '');
  return /^(?:\+91)?[6-9]\d{9}$/.test(compact);
}

export function formatIndianMobileNumber(value: string): string {
  const digits = value.replace(/\D/g, '').replace(/^91(?=\d{10}$)/, '');
  return digits.length === 10 ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : value;
}

/** Supports common state registration marks and Bharat-series registrations. */
export function isIndianVehicleRegistration(value: string): boolean {
  const compact = value.replace(/[\s-]/g, '').toUpperCase();
  return /^(?:[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}|\d{2}BH\d{4}[A-Z]{2})$/.test(compact);
}

export function formatVehicleRegistration(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}
