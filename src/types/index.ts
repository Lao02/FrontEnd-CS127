export interface InstallmentTerm {
  termNumber: number;
  dueDate: Date;
  status: InstallmentStatus;
  paymentDate?: Date;
  skipped?: boolean;
  delinquent?: boolean;
  notes?: string; // Editable notes for each term
}
// Enumerations
export enum TransactionType {
  STRAIGHT_EXPENSE = 'Straight Expense',
  INSTALLMENT_EXPENSE = 'Installment Expense',
  GROUP_EXPENSE = 'Group Expense',
}

export enum PaymentStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum InstallmentStatus {
  NOT_STARTED = 'NOT_STARTED',
  UNPAID = 'UNPAID',
  PAID = 'PAID',
  SKIPPED = 'SKIPPED',
  DELINQUENT = 'DELINQUENT',
}

export enum PaymentAllocationStatus {
  UNPAID = 'UNPAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
}

export enum PaymentFrequency {
  MONTHLY = 'Monthly',
  WEEKLY = 'Weekly',
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
  id: number; 
  entryId: string; 
  paymentDate: Date; 
  paymentAmount: number; 
  payee: Person; 
  termNumber?: number; 
  proof?: Blob; 
  imageUrls?: string[]; 
  notes?: string;
  createdAt?: Date; 
  updatedAt?: Date; 
}

export interface InstallmentDetails {
  id: string; 
  entryId: string;
  startDate: Date; 
  paymentFrequency: PaymentFrequency;
  paymentTerms: number; 
  paymentAmountPerTerm: number; 
  terms: InstallmentTerm[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentAllocation {
  id: string; 
  entryId: string;
  description: string; 
  payee: Person;
  amount: number; 
  amountPaid: number; 
  percentageOfTotal: number; 
  status: PaymentAllocationStatus; 
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Entry {
  id: string; 
  entryName: string; 
  description?: string; 
  transactionType: TransactionType; 
  dateBorrowed?: Date; 
  dateFullyPaid?: Date; 
  borrower: Person | Group; 
  lender: Person;
  amountBorrowed: number; 
  amountRemaining: number; 
  status: PaymentStatus; 
  notes?: string;
  paymentNotes?: string; 
  proofOfLoan?: Blob; 
  referenceId: string; 
  payments?: Payment[]; 
  installmentDetails?: InstallmentDetails; 
  paymentAllocations?: PaymentAllocation[]; 
  createdAt: Date;
  updatedAt: Date;
}

