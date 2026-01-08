import React, { useState, useEffect } from 'react';
import { Payment } from '../types';
import { useApp } from '../context/AppContext';
import './PaymentsList.css';

interface PaymentsListProps {
  entryId: string;
}

const PaymentsList: React.FC<PaymentsListProps> = ({ entryId }) => {
  const { getPaymentsByEntryId } = useApp();
  const [payments, setPayments] = useState<Payment[]>([]);

  useEffect(() => {
    getPaymentsByEntryId(entryId).then(setPayments).catch(() => setPayments([]));
  }, [entryId, getPaymentsByEntryId]);


  return (
    <div className="payments-list-container">
      <h2>Payments</h2>
      <ul className="payments-list">
        {payments.map(payment => (
          <li key={payment.paymentId} className="payment-item">
            <span>{payment.paymentAmount} on {payment.paymentDate.toString()}</span>
            {/* womp */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default PaymentsList;
