import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { paymentMockService } from '../services/paymentMockService';
import './PaymentsList.css';

interface PaymentsListProps {
  entryId: string;
}

const PaymentsList: React.FC<PaymentsListProps> = ({ entryId }) => {
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    paymentMockService.getByEntryId(entryId).then(setPayments);
  }, [entryId]);


  return (
    <div className="payments-list-container">
      <h2>Payments</h2>
      <ul className="payments-list">
        {payments.map(payment => (
          <li key={payment.id} className="payment-item">
            <span>{payment.paymentAmount} on {payment.paymentDate.toString()}</span>
            {/* womp */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentsList;
