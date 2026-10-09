const { Payment } = require('../models');

class PaymentService {
  constructor() {
    this.payments = new Map();
  }

  /**
   * Process a payment transaction.
   * Can accept simulateStatus = 'SUCCESS' | 'FAILED' for testing failure flows.
   */
  async processPayment({ bookingId, amount, currency = 'USD', method = 'CREDIT_CARD', simulateStatus = 'SUCCESS' }) {
    // Artificial slight latency to simulate real payment gateway call
    await new Promise(resolve => setTimeout(resolve, 350));

    if (simulateStatus === 'FAILED') {
      return {
        success: false,
        error: 'PAYMENT_DECLINED',
        message: 'The card was declined or insufficient funds were detected by the payment processor.'
      };
    }

    const paymentId = `pay_${Math.random().toString(36).substring(2, 10)}`;
    const transactionRef = `TXN-${Math.floor(10000000 + Math.random() * 90000000)}`;

    const payment = new Payment({
      id: paymentId,
      bookingId,
      amount,
      currency,
      method,
      status: 'SUCCESS',
      transactionRef
    });

    this.payments.set(paymentId, payment);

    return {
      success: true,
      paymentId,
      transactionRef,
      amount,
      currency,
      timestamp: payment.timestamp
    };
  }

  /**
   * Process a refund for a cancelled booking
   */
  async processRefund({ paymentId, refundAmount, reason = 'Booking cancellation' }) {
    await new Promise(resolve => setTimeout(resolve, 200));

    const refundId = `ref_${Math.random().toString(36).substring(2, 10)}`;
    const refundRef = `RFD-${Math.floor(10000000 + Math.random() * 90000000)}`;

    return {
      success: true,
      refundId,
      refundRef,
      refundAmount,
      reason,
      status: 'REFUNDED',
      processedAt: new Date().toISOString()
    };
  }
}

module.exports = new PaymentService();
