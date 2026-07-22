export const MessagingService = {
  getWhatsAppLink: (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanPhone.startsWith('91') ? cleanPhone : '91' + cleanPhone}?text=${encodedMessage}`;
  },
  
  getSmsLink: (phone, message) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const encodedMessage = encodeURIComponent(message);
    return `sms:${cleanPhone}?body=${encodedMessage}`;
  },

  sendInvoiceWhatsApp: (customerName, phone, invoiceNumber, total) => {
    const message = `Hello ${customerName}, thank you for your purchase from Billing360. Your invoice ${invoiceNumber} for ₹${total.toLocaleString()} is recorded.`;
    window.open(MessagingService.getWhatsAppLink(phone, message), '_blank');
  },

  sendPaymentReminder: (customerName, phone, balance) => {
    const message = `Hi ${customerName}, this is a friendly reminder that an outstanding payment of ₹${balance.toLocaleString()} is due in your account. Please settle soon. Thank you!`;
    window.open(MessagingService.getWhatsAppLink(phone, message), '_blank');
  }
};
