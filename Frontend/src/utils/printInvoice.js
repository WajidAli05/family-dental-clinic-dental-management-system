export const printInvoice = (invoice) => {
  if (!invoice) return;

  const totalPaid = invoice.payments.reduce(
    (sum, p) => sum + p.amount,
    0
  );

  const balance = invoice.totalAmount - totalPaid;

  const html = `
    <html>
      <head>
        <title>Invoice ${invoice.id}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 40px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #000;
            padding-bottom: 10px;
            margin-bottom: 20px;
          }
          .header h1 {
            margin: 0;
          }
          .meta {
            margin-bottom: 20px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
          }
          th, td {
            border: 1px solid #ccc;
            padding: 8px;
            text-align: left;
          }
          th {
            background: #f5f5f5;
          }
          .summary {
            margin-top: 20px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Family Dental Clinic</h1>
          <p>Harley Street, Saddar, Rawalpindi</p>
        </div>

        <div class="meta">
          <p><strong>Invoice ID:</strong> ${invoice.id}</p>
          <p><strong>Patient:</strong> ${invoice.patientName}</p>
          <p><strong>Date:</strong> ${invoice.date}</p>
          <p><strong>Status:</strong> ${invoice.status}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>Payment Date</th>
              <th>Mode</th>
              <th>Amount (PKR)</th>
            </tr>
          </thead>
          <tbody>
            ${invoice.payments
              .map(
                (p) => `
              <tr>
                <td>${p.date}</td>
                <td>${p.mode}</td>
                <td>${p.amount}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>

        <div class="summary">
          <p><strong>Total Amount:</strong> PKR ${invoice.totalAmount}</p>
          <p><strong>Total Paid:</strong> PKR ${totalPaid}</p>
          <p><strong>Balance:</strong> PKR ${balance}</p>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open("", "_blank");
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.focus();
  printWindow.print();
  printWindow.close();
};