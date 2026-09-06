/**
 * Validation utilities for PeoplePay360
 * Centralized business & field validation rules matching backend schemas.
 */

export const validateEmail = (email: string): string | null => {
  if (!email || !email.trim()) {
    return 'Email address is required';
  }
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(email.trim())) {
    return 'Please enter a valid email address';
  }
  return null;
};

export const validateRequired = (value: string | number | null | undefined, fieldName: string): string | null => {
  if (value === null || value === undefined) {
    return `${fieldName} is required`;
  }
  if (typeof value === 'string' && !value.trim()) {
    return `${fieldName} is required`;
  }
  return null;
};

export const validateMinLength = (value: string, minLength: number, fieldName: string): string | null => {
  if (!value || value.trim().length < minLength) {
    return `${fieldName} must be at least ${minLength} characters`;
  }
  return null;
};

export const validatePositiveNumber = (value: number | string, fieldName: string, allowZero = false): string | null => {
  const num = typeof value === 'number' ? value : Number(value);
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`;
  }
  if (allowZero ? num < 0 : num <= 0) {
    return `${fieldName} must be ${allowZero ? 'greater than or equal to 0' : 'greater than 0'}`;
  }
  return null;
};

export const validateDateRange = (
  startDate: string,
  endDate: string | null | undefined,
  startLabel = 'Start date',
  endLabel = 'End date'
): string | null => {
  if (!startDate) {
    return `${startLabel} is required`;
  }
  if (endDate && new Date(endDate) < new Date(startDate)) {
    return `${endLabel} cannot be earlier than ${startLabel.toLowerCase()}`;
  }
  return null;
};

export const validateTimeRange = (
  startTime: string,
  endTime: string,
  startLabel = 'Start time',
  endLabel = 'End time'
): string | null => {
  if (!startTime) return `${startLabel} is required`;
  if (!endTime) return `${endLabel} is required`;
  const [startH, startM] = startTime.split(':').map(Number);
  const [endH, endM] = endTime.split(':').map(Number);
  const startMin = startH * 60 + startM;
  const endMin = endH * 60 + endM;
  if (endMin <= startMin) {
    return `${endLabel} must be after ${startLabel.toLowerCase()}`;
  }
  return null;
};

export const validateSalaryRuleCode = (code: string): string | null => {
  if (!code || !code.trim()) {
    return 'Rule code is required';
  }
  const cleanCode = code.trim().toUpperCase();
  if (!/^[A-Z0-9_]+$/.test(cleanCode)) {
    return 'Rule code must contain only uppercase letters, numbers, and underscores';
  }
  if (cleanCode.length < 2 || cleanCode.length > 20) {
    return 'Rule code must be between 2 and 20 characters';
  }
  return null;
};

export const validatePhone = (phone?: string | null, isRequired = false): string | null => {
  if (!phone || !phone.trim()) {
    return isRequired ? 'Phone number is required' : null;
  }
  const cleanPhone = phone.trim();
  const phonePattern = /^\+?[0-9\s\-().]{7,20}$/;
  if (!phonePattern.test(cleanPhone)) {
    return 'Please enter a valid phone number (e.g. +91 9876543210 or 9876543210)';
  }
  const digits = cleanPhone.replace(/[^0-9]/g, '');
  if (digits.length < 7 || digits.length > 15) {
    return 'Phone number must contain between 7 and 15 digits';
  }
  return null;
};

export const validateIfsc = (ifsc: string): string | null => {
  if (!ifsc || !ifsc.trim()) return null; // Optional
  const clean = ifsc.trim().toUpperCase();
  if (!/^[A-Z0-9]{4,11}$/.test(clean)) {
    return 'IFSC code must be between 4 and 11 alphanumeric characters';
  }
  return null;
};
