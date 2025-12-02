const prisma = require("../prisma");

// ------------------------------
// HELPERS
// ------------------------------
function calculateHours(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  const hours = ms / 1000 / 60 / 60;
  return Number(hours.toFixed(2));
}

// ------------------------------
// CHECK-IN
// ------------------------------
async function checkIn(req, res, next) {
  try {
    const userId = req.user.id;
    const { shiftId } = req.body;

    if (!shiftId) {
      return res.status(400).json({ error: "shiftId required" });
    }

    // ensure shift belongs to same org
    const shift = await prisma.shift.findFirst({
      where: {
        id: Number(shiftId),
        opportunity: { organizationId: req.user.organizationId },
      },
    });

    if (!shift) return res.status(404).json({ error: "Shift not found" });

    // ensure signup exists
    const existingSignup = await prisma.shiftSignup.findFirst({
      where: { userId, shiftId: shift.id },
    });

    if (!existingSignup) {
      return res.status(400).json({
        error: "You are not signed up for this shift",
      });
    }

    // close any open attendance session
    const openSession = await prisma.attendance.findFirst({
      where: {
        userId,
        checkOut: null,
      },
    });

    if (openSession) {
      // auto checkout
      const hours = calculateHours(openSession.checkIn, new Date());

      await prisma.$transaction(async (tx) => {
        await tx.attendance.update({
          where: { id: openSession.id },
          data: { checkOut: new Date() },
        });

        await tx.volunteerHour.create({
          data: {
            userId,
            amount: hours,
            description: `Auto-checkout from shift ${openSession.shiftId}`,
          },
        });
      });
    }

    // create new attendance record
    const attend = await prisma.attendance.create({
      data: {
        userId,
        shiftId: shift.id,
      },
    });

    res.status(201).json(attend);
  } catch (err) {
    next(err);
  }
}

// ------------------------------
// CHECK-OUT
// ------------------------------
async function checkOut(req, res, next) {
  try {
    const userId = req.user.id;

    // find open attendance session
    const openSession = await prisma.attendance.findFirst({
      where: {
        userId,
        checkOut: null,
      },
    });

    if (!openSession) {
      return res.status(400).json({
        error: "You are not currently checked in",
      });
    }

    const hours = calculateHours(openSession.checkIn, new Date());

    // close session + log hours
    await prisma.$transaction(async (tx) => {
      await tx.attendance.update({
        where: { id: openSession.id },
        data: { checkOut: new Date() },
      });

      await tx.volunteerHour.create({
        data: {
          userId,
          amount: hours,
          description: `Shift ${openSession.shiftId} attendance`,
        },
      });
    });

    res.json({ success: true, hours });
  } catch (err) {
    next(err);
  }
}

// ------------------------------
// ADMIN: GET ATTENDANCE FOR USER
// ------------------------------
async function getAttendanceForUser(req, res, next) {
  try {
    const { id } = req.params;
    const orgId = req.user.organizationId;

    const user = await prisma.user.findFirst({
      where: { id: Number(id), organizationId: orgId },
    });

    if (!user) return res.status(404).json({ error: "User not found" });

    const data = await prisma.attendance.findMany({
      where: { userId: user.id },
      include: {
        shift: true,
      },
      orderBy: { checkIn: "desc" },
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

// ------------------------------
// ADMIN: GET ATTENDANCE FOR SHIFT
// ------------------------------
async function getAttendanceForShift(req, res, next) {
  try {
    const shiftId = Number(req.params.id);
    const orgId = req.user.organizationId;

    const shift = await prisma.shift.findFirst({
      where: { id: shiftId, opportunity: { organizationId: orgId } },
    });

    if (!shift) return res.status(404).json({ error: "Shift not found" });

    const records = await prisma.attendance.findMany({
      where: { shiftId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { checkIn: "asc" },
    });

    res.json(records);
  } catch (err) {
    next(err);
  }
}

// ------------------------------
// ADMIN: EDIT ATTENDANCE
// ------------------------------
async function adminEditAttendance(req, res, next) {
  try {
    const { id } = req.params;
    const { checkIn, checkOut } = req.body;

    const newData = {};

    if (checkIn) newData.checkIn = new Date(checkIn);
    if (checkOut) newData.checkOut = new Date(checkOut);

    const updated = await prisma.attendance.update({
      where: { id: Number(id) },
      data: newData,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  checkIn,
  checkOut,
  getAttendanceForUser,
  getAttendanceForShift,
  adminEditAttendance,
};
