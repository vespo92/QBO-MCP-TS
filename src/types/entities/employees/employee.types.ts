/**
 * Employee entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity, QBOEmailAddress, QBOPhoneNumber } from '../common/base.types.js';
import type { QBOPhysicalAddress } from '../common/address.types.js';

/**
 * QuickBooks Employee entity
 */
export interface QBOEmployee extends QBOBaseEntity {
  DisplayName: string;
  Title?: string;
  GivenName?: string;
  MiddleName?: string;
  FamilyName?: string;
  Suffix?: string;
  PrintOnCheckName?: string;
  Active?: boolean;
  PrimaryPhone?: QBOPhoneNumber;
  Mobile?: QBOPhoneNumber;
  PrimaryEmailAddr?: QBOEmailAddress;
  PrimaryAddr?: QBOPhysicalAddress;
  EmployeeNumber?: string;
  SSN?: string;
  BillableTime?: boolean;
  BillRate?: number;
  HiredDate?: string;
  ReleasedDate?: string;
  Gender?: 'Male' | 'Female';
  BirthDate?: string;
  CostRate?: number;
  Organization?: boolean;
  V4IDPseudonym?: string;
}

/**
 * Employee input for create/update
 */
export interface QBOEmployeeInput {
  DisplayName?: string;
  GivenName: string;
  FamilyName: string;
  MiddleName?: string;
  Title?: string;
  Suffix?: string;
  PrintOnCheckName?: string;
  PrimaryPhone?: QBOPhoneNumber;
  Mobile?: QBOPhoneNumber;
  PrimaryEmailAddr?: QBOEmailAddress;
  PrimaryAddr?: QBOPhysicalAddress;
  EmployeeNumber?: string;
  SSN?: string;
  BillableTime?: boolean;
  BillRate?: number;
  HiredDate?: string;
  Gender?: 'Male' | 'Female';
  BirthDate?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetEmployeesSchema = z.object({
  active: z.boolean().optional().describe('Filter by active status'),
  nameContains: z.string().optional().describe('Filter by name'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateEmployeeSchema = z.object({
  firstName: z.string().describe('First name'),
  lastName: z.string().describe('Last name'),
  middleName: z.string().optional().describe('Middle name'),
  displayName: z.string().optional().describe('Display name'),
  email: z.string().email().optional().describe('Email address'),
  phone: z.string().optional().describe('Phone number'),
  mobile: z.string().optional().describe('Mobile number'),
  address: z.object({
    line1: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    postalCode: z.string().optional(),
    country: z.string().optional(),
  }).optional().describe('Address'),
  employeeNumber: z.string().optional().describe('Employee number'),
  hiredDate: z.string().optional().describe('Hire date'),
  birthDate: z.string().optional().describe('Birth date'),
  gender: z.enum(['Male', 'Female']).optional().describe('Gender'),
  billableTime: z.boolean().optional().describe('Track billable time'),
  billRate: z.number().positive().optional().describe('Bill rate per hour'),
});

export const UpdateEmployeeSchema = z.object({
  employeeId: z.string().describe('Employee ID'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  email: z.string().email().optional().describe('Email'),
  phone: z.string().optional().describe('Phone'),
  mobile: z.string().optional().describe('Mobile'),
  active: z.boolean().optional().describe('Active status'),
  billRate: z.number().positive().optional().describe('Bill rate'),
  releasedDate: z.string().optional().describe('Termination date'),
});

export type GetEmployeesParams = z.infer<typeof GetEmployeesSchema>;
export type CreateEmployeeParams = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeParams = z.infer<typeof UpdateEmployeeSchema>;
