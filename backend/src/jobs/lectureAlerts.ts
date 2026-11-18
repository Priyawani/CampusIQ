import cron from "node-cron";
import prisma from "../lib/prisma.js";
import { transporter } from "../utils/mailer.js";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function currentDayOfWeek(): number | null {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day : null;
}

async function sendDailyLectureAlerts(): Promise<void> {
  console.log("[LectureAlerts] Starting daily lecture itinerary job...");

  const dayOfWeek = currentDayOfWeek();
  if (dayOfWeek === null) {
    console.log("[LectureAlerts] Weekend - no lectures scheduled");
    return;
  }

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    console.warn("[LectureAlerts] SMTP configuration missing, skipping itinerary emails");
    return;
  }

  const lectures = await prisma.timetable.findMany({
    where: { dayOfWeek },
    include: {
      faculty: { select: { name: true, email: true } },
      classGroup: { select: { name: true } },
      subject: { select: { name: true, code: true } },
    },
    orderBy: [{ facultyId: "asc" }, { startTime: "asc" }],
  });

  const byFaculty = new Map<number, typeof lectures>();
  for (const lecture of lectures) {
    const list = byFaculty.get(lecture.facultyId) ?? [];
    list.push(lecture);
    byFaculty.set(lecture.facultyId, list);
  }

  const dayName = DAY_NAMES[dayOfWeek];
  let sent = 0;

  for (const blocks of byFaculty.values()) {
    const faculty = blocks[0].faculty;
    const itinerary = blocks
      .map(
        (block) =>
          `${block.startTime} - ${block.endTime} | ${block.subject.name} (${block.subject.code}) | ${block.classGroup.name} | Room ${block.roomNumber}`
      )
      .join("\n");

    const subject = `Your ${dayName} class itinerary - CampusIQ`;
    const text = `Dear ${faculty.name ?? "Faculty"},\n\nHere are your classes for ${dayName}:\n\n${itinerary}\n\nRegards,\nCampusIQ Team`;

    try {
      await transporter.sendMail({
        from: process.env.SMTP_FROM || `"CampusIQ" <${process.env.SMTP_USER}>`,
        to: faculty.email,
        subject,
        text,
      });
      sent++;
    } catch (error) {
      console.error(`[LectureAlerts] Failed to email ${faculty.email}:`, error);
    }
  }

  console.log(`[LectureAlerts] Sent ${sent} itinerary email(s) for ${dayName}`);
}

export function initLectureAlerts(): void {
  cron.schedule("0 8 * * *", async () => {
    try {
      await sendDailyLectureAlerts();
    } catch (error) {
      console.error("[LectureAlerts] Critical error in cron job:", error);
    }
  });

  console.log("[LectureAlerts] Scheduled daily itinerary emails at 08:00");
}
