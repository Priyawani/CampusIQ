import { Response } from "express";
import prisma from "../lib/prisma.js";
import { AuthRequest } from "../middleware/auth.middleware.js";

function currentDayOfWeek(): number | null {
  const day = new Date().getDay();
  return day >= 1 && day <= 5 ? day : null;
}

export async function getMyDayTimetable(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const dayOfWeek = currentDayOfWeek();
    const date = new Date().toISOString().slice(0, 10);

    if (dayOfWeek === null) {
      return res.status(200).json({ date, dayOfWeek: null, count: 0, blocks: [] });
    }

    const blocks = await prisma.timetable.findMany({
      where: {
        facultyId: req.user.userId,
        dayOfWeek,
      },
      include: {
        classGroup: true,
        subject: true,
        lessonResources: true,
      },
      orderBy: { startTime: "asc" },
    });

    return res.status(200).json({
      date,
      dayOfWeek,
      count: blocks.length,
      blocks,
    });
  } catch (error) {
    console.error("Error fetching my-day timetable:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

export async function createSubstituteRequest(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const { timetableId, date, assignedFacultyId } = req.body ?? {};

    const parsedTimetableId = Number(timetableId);
    if (!Number.isInteger(parsedTimetableId) || parsedTimetableId <= 0) {
      return res.status(400).json({ message: "A valid timetableId is required" });
    }

    const requestedDate = new Date(date);
    if (!date || Number.isNaN(requestedDate.getTime())) {
      return res.status(400).json({ message: "A valid date is required" });
    }

    const timetable = await prisma.timetable.findUnique({
      where: { id: parsedTimetableId },
      select: { id: true },
    });
    if (!timetable) {
      return res.status(404).json({ message: "Timetable block not found" });
    }

    let parsedAssignedFacultyId: number | null = null;
    if (
      assignedFacultyId !== undefined &&
      assignedFacultyId !== null &&
      assignedFacultyId !== ""
    ) {
      parsedAssignedFacultyId = Number(assignedFacultyId);
      if (!Number.isInteger(parsedAssignedFacultyId) || parsedAssignedFacultyId <= 0) {
        return res.status(400).json({ message: "Invalid assignedFacultyId" });
      }

      const assignee = await prisma.user.findUnique({
        where: { id: parsedAssignedFacultyId },
        select: { id: true, role: true },
      });
      if (!assignee) {
        return res.status(404).json({ message: "Assigned faculty user not found" });
      }
      if (assignee.role !== "FACULTY") {
        return res.status(400).json({ message: "Assigned user must be a faculty member" });
      }
    }

    const substituteRequest = await prisma.substituteRequest.create({
      data: {
        timetableId: parsedTimetableId,
        requestingFacultyId: req.user.userId,
        assignedFacultyId: parsedAssignedFacultyId,
        status: "PENDING",
        date: requestedDate,
      },
      include: {
        timetable: { include: { classGroup: true, subject: true } },
        requestingFaculty: { select: { id: true, name: true, email: true } },
        assignedFaculty: { select: { id: true, name: true, email: true } },
      },
    });

    return res.status(201).json({
      message: "Substitute request created successfully",
      substituteRequest,
    });
  } catch (error) {
    console.error("Error creating substitute request:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

const RESOURCE_MANAGER_ROLES = ["FACULTY", "ADMIN", "DEPT_ADMIN", "SUPERADMIN"];

export async function createLessonResource(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const timetableId = Number(req.params.timetableId);
    if (!Number.isInteger(timetableId) || timetableId <= 0) {
      return res.status(400).json({ message: "A valid timetableId is required" });
    }

    const { resourceLink, title } = req.body ?? {};
    const link = typeof resourceLink === "string" ? resourceLink.trim() : "";
    if (!link) {
      return res.status(400).json({ message: "A resource link is required" });
    }

    let parsedLink: URL;
    try {
      parsedLink = new URL(link);
    } catch {
      return res.status(400).json({ message: "A valid resource URL is required" });
    }
    if (parsedLink.protocol !== "http:" && parsedLink.protocol !== "https:") {
      return res.status(400).json({ message: "A valid http(s) resource URL is required" });
    }

    const timetable = await prisma.timetable.findUnique({
      where: { id: timetableId },
      select: { id: true, facultyId: true },
    });
    if (!timetable) {
      return res.status(404).json({ message: "Timetable block not found" });
    }

    if (!RESOURCE_MANAGER_ROLES.includes(req.user.role)) {
      return res.status(403).json({ message: "You do not have permission to attach resources" });
    }
    if (req.user.role === "FACULTY" && timetable.facultyId !== req.user.userId) {
      return res.status(403).json({ message: "You can only attach resources to your own lectures" });
    }

    const resourceTitle =
      typeof title === "string" && title.trim() ? title.trim() : "Lesson resource";

    const resource = await prisma.lessonResource.create({
      data: { timetableId, resourceLink: link, title: resourceTitle },
    });

    return res.status(201).json({
      message: "Resource attached successfully",
      resource,
    });
  } catch (error) {
    console.error("Error attaching lesson resource:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function parsePositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function validTime(value: unknown): value is string {
  return typeof value === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function handleTimetableError(res: Response, error: unknown, context: string) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ message: error.message });
  }
  console.error(`Error ${context}:`, error);
  return res.status(500).json({ message: "Internal server error" });
}

/**
 * DEPT_ADMIN may manage any class in their department, SUPERADMIN any class,
 * and FACULTY only classes they are assigned to.
 */
async function requireClassGroupAccess(req: AuthRequest, classGroupId: number) {
  const classGroup = await prisma.classGroup.findUnique({
    where: { id: classGroupId },
    select: {
      id: true,
      departmentId: true,
      faculties: {
        where: { id: req.user?.userId ?? -1 },
        select: { id: true },
      },
    },
  });

  if (!classGroup) {
    throw new HttpError(404, "Class group not found");
  }

  const role = req.user?.role;
  if (role === "DEPT_ADMIN") {
    if (req.user?.departmentId == null) {
      throw new HttpError(403, "Department context required");
    }
    if (classGroup.departmentId !== req.user.departmentId) {
      throw new HttpError(403, "You can only manage classes in your department");
    }
  } else if (role === "FACULTY") {
    if (classGroup.faculties.length === 0) {
      throw new HttpError(403, "You can only access classes assigned to you");
    }
  } else if (role !== "SUPERADMIN") {
    throw new HttpError(403, "You do not have permission to access this timetable");
  }

  return classGroup;
}

async function requireBlockAccess(req: AuthRequest, blockId: number) {
  const block = await prisma.timetable.findUnique({
    where: { id: blockId },
    select: { id: true, classGroupId: true },
  });
  if (!block) {
    throw new HttpError(404, "Timetable block not found");
  }
  await requireClassGroupAccess(req, block.classGroupId);
  return block;
}

async function validateBlockPayload(req: AuthRequest, payload: Record<string, unknown>, departmentId: number) {
  const classGroupId = parsePositiveId(payload.classGroupId);
  const subjectId = parsePositiveId(payload.subjectId);
  const facultyId = parsePositiveId(payload.facultyId);
  const dayOfWeek = Number(payload.dayOfWeek);
  const roomNumber = typeof payload.roomNumber === "string" ? payload.roomNumber.trim() : "";

  if (classGroupId === null || subjectId === null || facultyId === null) {
    throw new HttpError(400, "classGroupId, subjectId and facultyId are required");
  }
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 5) {
    throw new HttpError(400, "dayOfWeek must be between 1 (Monday) and 5 (Friday)");
  }
  if (!validTime(payload.startTime) || !validTime(payload.endTime)) {
    throw new HttpError(400, "startTime and endTime must use HH:mm format");
  }
  if (payload.startTime >= payload.endTime) {
    throw new HttpError(400, "startTime must be earlier than endTime");
  }
  if (!roomNumber) {
    throw new HttpError(400, "roomNumber is required");
  }

  const subject = await prisma.subject.findUnique({
    where: { id: subjectId },
    select: { id: true, departmentId: true },
  });
  if (!subject) {
    throw new HttpError(404, "Subject not found");
  }
  if (subject.departmentId !== departmentId) {
    throw new HttpError(400, "Subject must belong to the selected class department");
  }

  const faculty = await prisma.user.findUnique({
    where: { id: facultyId },
    select: {
      id: true,
      role: true,
      departmentId: true,
      faculty: { select: { departmentId: true } },
    },
  });
  if (!faculty || faculty.role !== "FACULTY") {
    throw new HttpError(404, "Faculty member not found");
  }
  if (req.user?.role === "DEPT_ADMIN") {
    const facultyDepartmentId = faculty.faculty?.departmentId ?? faculty.departmentId;
    if (facultyDepartmentId !== departmentId) {
      throw new HttpError(400, "Faculty member must belong to the selected class department");
    }
  }

  return {
    classGroupId,
    subjectId,
    facultyId,
    dayOfWeek,
    startTime: payload.startTime,
    endTime: payload.endTime,
    roomNumber,
  };
}

const timetableInclude = {
  classGroup: {
    select: { id: true, name: true, year: true, departmentId: true },
  },
  subject: { select: { id: true, code: true, name: true } },
  faculty: { select: { id: true, name: true, email: true } },
  lessonResources: true,
} as const;

/** GET /timetable/blocks?classGroupId=:id — weekly view for one division. */
export async function getDepartmentTimetable(req: AuthRequest, res: Response) {
  try {
    const classGroupId = parsePositiveId(req.query.classGroupId);
    if (classGroupId === null) {
      return res.status(400).json({ message: "A valid classGroupId is required" });
    }
    const classGroup = await requireClassGroupAccess(req, classGroupId);

    const blocks = await prisma.timetable.findMany({
      where: { classGroupId: classGroup.id },
      include: timetableInclude,
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    });
    return res.status(200).json({ classGroupId: classGroup.id, count: blocks.length, blocks });
  } catch (error) {
    return handleTimetableError(res, error, "fetching department timetable");
  }
}

/** GET /timetable/faculty-options — faculty members assignable by an admin. */
export async function getFacultyOptions(req: AuthRequest, res: Response) {
  try {
    if (req.user?.role === "DEPT_ADMIN" && req.user.departmentId == null) {
      return res.status(403).json({ message: "Department context required" });
    }
    const adminDepartmentId =
      req.user?.role === "DEPT_ADMIN" ? req.user.departmentId : null;
    const departmentFilter =
      adminDepartmentId !== null
        ? {
            OR: [
              { departmentId: adminDepartmentId },
              { faculty: { departmentId: adminDepartmentId } },
            ],
          }
        : undefined;

    const faculty = await prisma.user.findMany({
      where: { role: "FACULTY", ...departmentFilter },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    });
    return res.status(200).json(faculty);
  } catch (error) {
    return handleTimetableError(res, error, "fetching faculty options");
  }
}

/** POST /timetable — create a slot for any class in the admin's department. */
export async function createTimetableBlock(req: AuthRequest, res: Response) {
  try {
    const payload = (req.body ?? {}) as Record<string, unknown>;
    const classGroupId = parsePositiveId(payload.classGroupId);
    if (classGroupId === null) {
      return res.status(400).json({ message: "A valid classGroupId is required" });
    }
    const classGroup = await requireClassGroupAccess(req, classGroupId);
    const data = await validateBlockPayload(req, payload, classGroup.departmentId);

    const block = await prisma.timetable.create({
      data,
      include: timetableInclude,
    });
    return res.status(201).json({ message: "Timetable slot created", block });
  } catch (error) {
    return handleTimetableError(res, error, "creating timetable block");
  }
}

/** PUT /timetable/:id — edit or reassign an existing lecture block. */
export async function updateTimetableBlock(req: AuthRequest, res: Response) {
  try {
    const blockId = parsePositiveId(req.params.id);
    if (blockId === null) {
      return res.status(400).json({ message: "A valid timetable block id is required" });
    }
    const existing = await requireBlockAccess(req, blockId);
    const payload = (req.body ?? {}) as Record<string, unknown>;
    const classGroupId = parsePositiveId(payload.classGroupId ?? existing.classGroupId);
    if (classGroupId === null) {
      return res.status(400).json({ message: "A valid classGroupId is required" });
    }

    const fullBlock = await prisma.timetable.findUnique({
      where: { id: blockId },
      select: {
        facultyId: true,
        subjectId: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true,
        roomNumber: true,
      },
    });
    if (!fullBlock) {
      return res.status(404).json({ message: "Timetable block not found" });
    }

    const classGroup = await requireClassGroupAccess(req, classGroupId);
    const data = await validateBlockPayload(
      req,
      {
        ...fullBlock,
        ...payload,
        classGroupId,
      },
      classGroup.departmentId
    );

    const block = await prisma.timetable.update({
      where: { id: blockId },
      data,
      include: timetableInclude,
    });
    return res.status(200).json({ message: "Timetable slot updated", block });
  } catch (error) {
    return handleTimetableError(res, error, "updating timetable block");
  }
}

/** DELETE /timetable/:id — remove a lecture block. */
export async function deleteTimetableBlock(req: AuthRequest, res: Response) {
  try {
    const blockId = parsePositiveId(req.params.id);
    if (blockId === null) {
      return res.status(400).json({ message: "A valid timetable block id is required" });
    }
    await requireBlockAccess(req, blockId);
    await prisma.timetable.delete({ where: { id: blockId } });
    return res.status(200).json({ message: "Timetable slot deleted" });
  } catch (error) {
    return handleTimetableError(res, error, "deleting timetable block");
  }
}

export async function getClassLessonResources(req: AuthRequest, res: Response) {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const rawClassGroupId = req.query.classGroupId;
    let classGroupId: number | null = null;
    if (rawClassGroupId !== undefined && rawClassGroupId !== "") {
      classGroupId = Number(rawClassGroupId);
      if (!Number.isInteger(classGroupId) || classGroupId <= 0) {
        return res.status(400).json({ message: "A valid classGroupId is required" });
      }
    }

    if (classGroupId === null && req.user.role === "STUDENT") {
      const student = await prisma.student.findUnique({
        where: { userId: req.user.userId },
        select: { classGroupId: true },
      });
      classGroupId = student?.classGroupId ?? null;
    }

    const resources = await prisma.lessonResource.findMany({
      where:
        classGroupId !== null
          ? { timetable: { classGroupId } }
          : { timetable: { facultyId: req.user.userId } },
      include: {
        timetable: {
          select: {
            id: true,
            subject: { select: { id: true, code: true, name: true } },
            classGroup: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { id: "desc" },
    });

    return res.status(200).json(
      resources.map((resource) => ({
        id: resource.id,
        timetableId: resource.timetableId,
        title: resource.title,
        resourceLink: resource.resourceLink,
        subjectId: resource.timetable.subject?.id ?? null,
        subjectCode: resource.timetable.subject?.code ?? null,
        subjectName: resource.timetable.subject?.name ?? null,
        className: resource.timetable.classGroup?.name ?? null,
      }))
    );
  } catch (error) {
    console.error("Error fetching lesson resources:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}
