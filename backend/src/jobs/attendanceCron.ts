import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { sendParentEmail } from "../utils/mailer.js";

function getPreviousMonthRange(): { start: Date; end: Date; monthName: string } {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const start = new Date(prevMonth.getFullYear(), prevMonth.getMonth(), 1);
  const end = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0, 23, 59, 59, 999);
  const monthName = prevMonth.toLocaleString("default", { month: "long", year: "numeric" });
  return { start, end, monthName };
}

async function sendMonthlyAttendanceReports(): Promise<void> {
  console.log("[AttendanceCron] Starting monthly attendance report job...");

  const { start, end, monthName } = getPreviousMonthRange();
  console.log(`[AttendanceCron] Reporting period: ${start.toISOString()} to ${end.toISOString()}`);

  const students = await prisma.student.findMany({
    where: {
      parentEmail: { not: null },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      parentEmail: true,
    },
  });

  console.log(`[AttendanceCron] Found ${students.length} students with parent emails`);

  for (const student of students) {
    const attendances = await prisma.attendance.findMany({
      where: {
        enrollment: {
          studentId: student.id,
        },
        date: {
          gte: start,
          lte: end,
        },
      },
      select: {
        status: true,
      },
    });

    const totalClasses = attendances.length;
    if (totalClasses === 0) {
      console.log(`[AttendanceCron] Skipping ${student.firstName} ${student.lastName} - no classes in ${monthName}`);
      continue;
    }

    const presentCount = attendances.filter((a) => a.status === "PRESENT").length;
    const percentage = Math.round((presentCount / totalClasses) * 100);

    const subject = `Monthly Attendance Report - ${monthName} - ${student.firstName} ${student.lastName}`;
    const text = `Dear Parent,\n\nHere is the monthly attendance report for ${student.firstName} ${student.lastName} for the month of ${monthName}.\n\nTotal Classes: ${totalClasses}\nAttended: ${presentCount}\nPercentage: ${percentage}%\n\nRegards,\nCampusIQ Team`;

    try {
      await sendParentEmail(student.parentEmail!, subject, text);
      console.log(`[AttendanceCron] Email sent to ${student.parentEmail} for ${student.firstName} ${student.lastName}`);
    } catch (error) {
      console.error(`[AttendanceCron] Failed to send email to ${student.parentEmail}:`, error);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("[AttendanceCron] Monthly attendance report job completed");
}

export function initAttendanceCron(): void {
  // CRON DISABLED - Emergency rollback to stop email spam
  // cron.schedule('0 9 1 * *', async () => {
  //   try {
  //     await sendMonthlyAttendanceReports();
  //   } catch (error) {
  //     console.error("[AttendanceCron] Critical error in cron job:", error);
  //   }
  // });

  // console.log("[AttendanceCron] Scheduled to run on the 1st of every month at 9:00 AM");
}