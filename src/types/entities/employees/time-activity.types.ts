/**
 * Time Activity entity types
 */

import { z } from 'zod';
import type { QBOBaseEntity } from '../common/base.types.js';
import type {
  QBOEmployeeRef,
  QBOVendorRef,
  QBOCustomerRef,
  QBOItemRef,
  QBOClassRef,
  QBODepartmentRef
} from '../common/reference.types.js';

/**
 * Time activity name types
 */
export type QBOTimeActivityNameType = 'Employee' | 'Vendor' | 'Other';

/**
 * QuickBooks Time Activity entity
 */
export interface QBOTimeActivity extends QBOBaseEntity {
  TxnDate: string;
  NameOf: QBOTimeActivityNameType;
  EmployeeRef?: QBOEmployeeRef;
  VendorRef?: QBOVendorRef;
  CustomerRef?: QBOCustomerRef;
  ItemRef?: QBOItemRef;
  ClassRef?: QBOClassRef;
  DepartmentRef?: QBODepartmentRef;
  BillableStatus?: 'Billable' | 'NotBillable' | 'HasBeenBilled';
  Taxable?: boolean;
  HourlyRate?: number;
  Hours?: number;
  Minutes?: number;
  BreakHours?: number;
  BreakMinutes?: number;
  StartTime?: string;
  EndTime?: string;
  Description?: string;
  TransactionLocationType?: string;
  CostRate?: number;
}

/**
 * Time activity input for create/update
 */
export interface QBOTimeActivityInput {
  TxnDate: string;
  NameOf: QBOTimeActivityNameType;
  EmployeeRef?: { value: string };
  VendorRef?: { value: string };
  CustomerRef?: { value: string };
  ItemRef?: { value: string };
  ClassRef?: { value: string };
  DepartmentRef?: { value: string };
  BillableStatus?: 'Billable' | 'NotBillable';
  Taxable?: boolean;
  HourlyRate?: number;
  Hours?: number;
  Minutes?: number;
  BreakHours?: number;
  BreakMinutes?: number;
  StartTime?: string;
  EndTime?: string;
  Description?: string;
}

// ============================================================================
// Zod Schemas for Validation
// ============================================================================

export const GetTimeActivitiesSchema = z.object({
  employeeName: z.string().optional().describe('Filter by employee'),
  vendorName: z.string().optional().describe('Filter by vendor'),
  customerName: z.string().optional().describe('Filter by customer'),
  billableStatus: z.enum(['Billable', 'NotBillable', 'HasBeenBilled', 'all'])
    .optional().describe('Filter by billable status'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
  limit: z.number().max(1000).optional().describe('Maximum results'),
});

export const CreateTimeActivitySchema = z.object({
  date: z.string().describe('Activity date'),
  nameType: z.enum(['Employee', 'Vendor']).describe('Worker type'),
  employeeName: z.string().optional().describe('Employee name (if nameType is Employee)'),
  vendorName: z.string().optional().describe('Vendor/contractor name (if nameType is Vendor)'),
  customerName: z.string().optional().describe('Customer/project'),
  serviceName: z.string().optional().describe('Service item'),
  hours: z.number().min(0).max(24).describe('Hours worked'),
  minutes: z.number().min(0).max(59).optional().describe('Minutes worked'),
  hourlyRate: z.number().positive().optional().describe('Hourly rate'),
  description: z.string().optional().describe('Description of work'),
  billable: z.boolean().optional().describe('Is billable'),
  classId: z.string().optional().describe('Class ID'),
  departmentId: z.string().optional().describe('Department ID'),
  startTime: z.string().optional().describe('Start time (HH:MM)'),
  endTime: z.string().optional().describe('End time (HH:MM)'),
  breakHours: z.number().min(0).optional().describe('Break hours'),
  breakMinutes: z.number().min(0).max(59).optional().describe('Break minutes'),
});

export const UpdateTimeActivitySchema = z.object({
  timeActivityId: z.string().describe('Time Activity ID'),
  date: z.string().optional().describe('Activity date'),
  hours: z.number().min(0).max(24).optional().describe('Hours'),
  minutes: z.number().min(0).max(59).optional().describe('Minutes'),
  hourlyRate: z.number().positive().optional().describe('Hourly rate'),
  description: z.string().optional().describe('Description'),
  billable: z.boolean().optional().describe('Is billable'),
});

export const DeleteTimeActivitySchema = z.object({
  timeActivityId: z.string().describe('Time Activity ID to delete'),
});

export const GetBillableTimeSchema = z.object({
  customerName: z.string().optional().describe('Filter by customer'),
  employeeName: z.string().optional().describe('Filter by employee'),
  dateFrom: z.string().optional().describe('Start date'),
  dateTo: z.string().optional().describe('End date'),
});

export type GetTimeActivitiesParams = z.infer<typeof GetTimeActivitiesSchema>;
export type CreateTimeActivityParams = z.infer<typeof CreateTimeActivitySchema>;
export type UpdateTimeActivityParams = z.infer<typeof UpdateTimeActivitySchema>;
export type DeleteTimeActivityParams = z.infer<typeof DeleteTimeActivitySchema>;
export type GetBillableTimeParams = z.infer<typeof GetBillableTimeSchema>;
