const prisma = require("../prisma");

// helper: find user by email or phone within org
async function findVolunteerByContact(orgId, emailOrPhone) {
  return prisma.user.findFirst({
    where: {
      organizationId: orgId,
      OR: [{ email: emailOrPhone }, { phone: emailOrPhone }],
    },
  });
}

// helper: calculate hours between two dates, round to 2 decimals
function calculateHours(start, end) {
  const ms = end.getTime() - start.getTime();
  if (ms <= 0) return 0;
  const hours = ms / (1000 * 60 * 60);
  return Math.round(hours * 100) / 100;
}

// -------------------------
// KIOSK CHECK-IN
// -------------------------
async function kioskCheckIn(req, res, next) {
  try {
    const { emailOrPhone } = req.body;
    const orgId = req.user.organizationId;

    if (!emailOrPhone) {
      return res.status(400).json({ error: "emailOrPhone is required" });
    }

    const user = await findVolunteerByContact(orgId, emailOrPhone);

    if (!user) {
      return res
        .status(404)
        .json({ error: "Volunteer not found in your organization" });
    }

    const now = new Date();

    // find active shift where this volunteer is signed up and current time is between start/end
    const activeShift = await prisma.shift.findFirst({
      where: {
        opportunity: { organizationId: orgId },
        startTime: { lte: now },
        endTime: { gte: now },
        signups: {
          some: { userId: user.id },
        },
      },
      orderBy: { startTime: "asc" },
    });

    if (!activeShift) {
      return res.status(400).json({
        error: "No active shift found for this volunteer at this time",
      });
    }

    // check if already checked in to THIS shift
    const existingAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        shiftId: activeShift.id,
        checkOut: null,
      },
    });

    if (existingAttendance) {
      return res.status(400).json({
        error: "Volunteer is already checked in to this shift",
      });
    }

    // check if checked in to some other shift; if so, auto-checkout + log hours
    const otherOpenAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        checkOut: null,
        shift: {
          opportunity: { organizationId: orgId },
        },
      },
      include: {
        shift: {
          include: {
            opportunity: true,
          },
        },
      },
    });

    if (otherOpenAttendance) {
      const hours = calculateHours(otherOpenAttendance.checkIn, now);

      await prisma.$transaction(async (tx) => {
        await tx.attendance.update({
          where: { id: otherOpenAttendance.id },
          data: { checkOut: now },
        });

        if (hours > 0) {
          await tx.volunteerHour.create({
            data: {
              userId: user.id,
              amount: hours,
              description: `Auto checkout from shift ${otherOpenAttendance.shift.id} (${otherOpenAttendance.shift.opportunity.title})`,
            },
          });
        }
      });
    }

    // now create new attendance for the active shift
    const attendance = await prisma.attendance.create({
      data: {
        userId: user.id,
        shiftId: activeShift.id,
        checkIn: now,
      },
      include: {
        shift: {
          include: {
            opportunity: true,
          },
        },
      },
    });

    res.status(201).json({
      message: "Check-in successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      shift: {
        id: activeShift.id,
        startTime: activeShift.startTime,
        endTime: activeShift.endTime,
        opportunityTitle: attendance.shift.opportunity.title,
      },
      attendance,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------
// KIOSK CHECK-OUT
// -------------------------
async function kioskCheckOut(req, res, next) {
  try {
    const { emailOrPhone } = req.body;
    const orgId = req.user.organizationId;

    if (!emailOrPhone) {
      return res.status(400).json({ error: "emailOrPhone is required" });
    }

    const user = await findVolunteerByContact(orgId, emailOrPhone);

    if (!user) {
      return res
        .status(404)
        .json({ error: "Volunteer not found in your organization" });
    }

    const now = new Date();

    // Find open attendance (no checkout yet)
    const openAttendance = await prisma.attendance.findFirst({
      where: {
        userId: user.id,
        checkOut: null,
        shift: {
          opportunity: { organizationId: orgId },
        },
      },
      include: {
        shift: {
          include: {
            opportunity: true,
          },
        },
      },
    });

    if (!openAttendance) {
      return res.status(400).json({
        error: "Volunteer is not currently checked in to any shift",
      });
    }

    const hours = calculateHours(openAttendance.checkIn, now);

    const result = await prisma.$transaction(async (tx) => {
      const updatedAttendance = await tx.attendance.update({
        where: { id: openAttendance.id },
        data: { checkOut: now },
      });

      let hourRecord = null;
      if (hours > 0) {
        hourRecord = await tx.volunteerHour.create({
          data: {
            userId: user.id,
            amount: hours,
            description: `Kiosk checkout from shift ${openAttendance.shift.id} (${openAttendance.shift.opportunity.title})`,
          },
        });
      }

      return { updatedAttendance, hourRecord, hours };
    });

    res.json({
      message: "Checkout successful",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
      shift: {
        id: openAttendance.shift.id,
        startTime: openAttendance.shift.startTime,
        endTime: openAttendance.shift.endTime,
        opportunityTitle: openAttendance.shift.opportunity.title,
      },
      attendance: result.updatedAttendance,
      hoursAdded: result.hours,
      volunteerHour: result.hourRecord,
    });
  } catch (err) {
    next(err);
  }
}

// -------------------------
// CURRENT ROSTER
// -------------------------
async function kioskCurrentRoster(req, res, next) {
  try {
    const orgId = req.user.organizationId;

    const openAttendances = await prisma.attendance.findMany({
      where: {
        checkOut: null,
        shift: {
          opportunity: { organizationId: orgId },
        },
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        shift: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkIn: "asc",
      },
    });

    res.json(openAttendances);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  kioskCheckIn,
  kioskCheckOut,
  kioskCurrentRoster,
};
