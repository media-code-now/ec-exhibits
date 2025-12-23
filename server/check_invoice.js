import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkInvoices() {
  const invoices = await prisma.invoice.findMany({
    select: {
      id: true,
      fileName: true,
      fileUrl: true,
      projectId: true
    }
  });
  
  console.log('Invoices in database:');
  invoices.forEach(inv => {
    console.log('ID:', inv.id);
    console.log('FileName:', inv.fileName);
    console.log('FileUrl:', inv.fileUrl);
    console.log('ProjectId:', inv.projectId);
    console.log('---');
  });
  
  await prisma.$disconnect();
}

checkInvoices().catch(console.error);
