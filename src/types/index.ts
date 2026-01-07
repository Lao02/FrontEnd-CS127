// Enumerations
export enum TransactionType {
  STRAIGHT = 'STRAIGHT',
  INSTALLMENT = 'INSTALLMENT',
  GROUP = 'GROUP',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum PaymentAllocationStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum PaymentFrequency {
  MONTHLY = 'MONTHLY',
  WEEKLY = 'WEEKLY',
}

export enum InstallmentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
}

export interface InstallmentTerm {
  termId: number;
  termNumber: number;
  dueDate: Date;
  status: InstallmentStatus | string;
  notes?: string;
}

export interface Person {
  personID: number; 
  firstName: string;
  lastName: string;
  contact: string;
}

export interface Group {
  groupID: number;
  groupName: string;
  groupMembersList?: Person[]; 
}

export interface Payment {
  paymentId: number; 
  entryId: string; 
  paymentDate: Date; 
  paymentAmount: number; 
  payeeDto: Person; 
  termId?: number; 
  imageUrls?: string[]; 
  notes?: string;
}

export interface PaymentAllocation {
  allocationId: number; 
  groupExpenseEntryId: string;
  description: string; 
  groupMemberPersonId: number;
  borrowerGroupId: number;
  groupMemberDto: Person;
  amount: number; 
  amountPaid: number; 
  percent: number; 
  paymentAllocationStatus: PaymentAllocationStatus; 
  notes?: string;
}

export interface Entry {
  id: string; 
  entryName: string; 
  description?: string; 
  transactionType: TransactionType; 
  dateBorrowed?: Date; 
  dateFullyPaid?: Date; 
  borrowerId?: number; // For STRAIGHT and INSTALLMENT
  borrowerGroupId?: number; // For GROUP
  borrowerName: string;
  lenderId: number;
  lenderName: string;
  amountBorrowed: number; 
  amountRemaining: number; 
  status: PaymentStatus; 
  notes?: string;
  referenceId: string; 
  imageProofs?: Array<{id: number; imageUrl: string; imageName: string}>;
  payments?: Payment[]; 
  // Installment-specific fields
  startDate?: Date;
  paymentFrequency?: PaymentFrequency;
  paymentTerms?: number;
  paymentAmountPerTerm?: number;
  // Group-specific fields
  paymentAllocations?: PaymentAllocation[]; 
}

