const prisma = require("../prisma");

// helper: simple overlap check
function timesOverlap(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// POST /api/shifts
// body: { opportunityId, startTime, endTime, capacity? }
async function createShift(req, res, next) {
  try {
    const { opportunityId, startTime, endTime, capacity } = req.body;
    const orgId = req.user.organizationId;

    if (!opportunityId || !startTime || !endTime) {
      return res.status(400).json({
        error: "opportunityId, startTime, and endTime are required",
      });
    }

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id: Number(opportunityId),
        organizationId: orgId,
      },
    });

    if (!opportunity) {
      return res
        .status(404)
        .json({ error: "Opportunity not found in your organization" });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: "Invalid date format" });
    }

    if (start >= end) {
      return res
        .status(400)
        .json({ error: "startTime must be before endTime" });
    }

    const cap = capacity != null ? Number(capacity) : 999999;
    if (Number.isNaN(cap) || cap < 1) {
      return res
        .status(400)
        .json({ error: "capacity must be a positive number" });
    }

    const shift = await prisma.shift.create({
      data: {
        opportunityId: opportunity.id,
        startTime: start,
        endTime: end,
        capacity: cap,
      },
    });

    res.status(201).json(shift);
  } catch (err) {
    next(err);
  }
}

// GET /api/shifts/:id
async function getShiftDetails(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        opportunity: { organizationId: orgId },
      },
      include: {
        opportunity: true,
        _count: {
          select: { signups: true },
        },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    res.json(shift);
  } catch (err) {
    next(err);
  }
}

// PUT /api/shifts/:id
// body: { startTime?, endTime?, capacity? }
async function updateShift(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;
    const { startTime, endTime, capacity } = req.body;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        opportunity: { organizationId: orgId },
      },
      include: {
        _count: { select: { signups: true } },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const data = {};

    if (startTime) {
      const start = new Date(startTime);
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ error: "Invalid startTime" });
      }
      data.startTime = start;
    }

    if (endTime) {
      const end = new Date(endTime);
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: "Invalid endTime" });
      }
      data.endTime = end;
    }

    const finalStart = data.startTime || shift.startTime;
    const finalEnd = data.endTime || shift.endTime;
    if (finalStart >= finalEnd) {
      return res
        .status(400)
        .json({ error: "startTime must be before endTime" });
    }

    if (capacity != null) {
      const cap = Number(capacity);
      if (Number.isNaN(cap) || cap < 1) {
        return res
          .status(400)
          .json({ error: "capacity must be a positive number" });
      }
      if (cap < shift._count.signups) {
        return res.status(400).json({
          error: `Capacity (${cap}) cannot be less than current signups (${shift._count.signups})`,
        });
      }
      data.capacity = cap;
    }

    const updated = await prisma.shift.update({
      where: { id: shift.id },
      data,
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/shifts/:id
async function deleteShift(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        opportunity: { organizationId: orgId },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    await prisma.$transaction(async (tx) => {
      await tx.shiftSignup.deleteMany({
        where: { shiftId: shift.id },
      });

      await tx.shift.delete({
        where: { id: shift.id },
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// POST /api/shifts/:id/signup
async function signupForShift(req, res, next) {
  try {
    const shiftId = Number(req.params.id);
    const userId = req.user.id;
    const orgId = req.user.organizationId;

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    // Require background check & orientation
    if (!user.hasBackgroundCheck || !user.hasAttendedOrientation) {
      return res.status(400).json({
        error:
          "You must complete background check and orientation before signing up for shifts",
      });
    }

    const shift = await prisma.shift.findFirst({
      where: {
        id: shiftId,
        opportunity: { organizationId: orgId },
      },
      include: {
        signups: true,
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    if (shift.signups.length >= shift.capacity) {
      return res.status(400).json({ error: "Shift is full" });
    }

    // Check for overlapping shifts for this user
    const userSignups = await prisma.shiftSignup.findMany({
      where: {
        userId,
        shift: {
          opportunity: { organizationId: orgId },
        },
      },
      include: {
        shift: true,
      },
    });

    const start = shift.startTime;
    const end = shift.endTime;

    const hasOverlap = userSignups.some((signup) =>
      timesOverlap(start, end, signup.shift.startTime, signup.shift.endTime)
    );

    if (hasOverlap) {
      return res.status(400).json({
        error:
          "You are already signed up for another shift that overlaps this time",
      });
    }

    const signup = await prisma.shiftSignup.create({
      data: {
        shiftId: shift.id,
        userId,
      },
    });

    res.status(201).json(signup);
  } catch (err) {
    if (err.code === "P2002") {
      // unique constraint (already signed up)
      return res
        .status(400)
        .json({ error: "You are already signed up for this shift" });
    }
    next(err);
  }
}

// DELETE /api/shifts/:id/signup
async function cancelShiftSignup(req, res, next) {
  try {
    const shiftId = Number(req.params.id);
    const userId = req.user.id;

    await prisma.shiftSignup.deleteMany({
      where: {
        shiftId,
        userId,
      },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/shifts/:id/signups
async function listShiftSignups(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const shift = await prisma.shift.findFirst({
      where: {
        id,
        opportunity: { organizationId: orgId },
      },
    });

    if (!shift) {
      return res.status(404).json({ error: "Shift not found" });
    }

    const signups = await prisma.shiftSignup.findMany({
      where: { shiftId: id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            hasBackgroundCheck: true,
            hasAttendedOrientation: true,
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    res.json(signups);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createShift,
  getShiftDetails,
  updateShift,
  deleteShift,
  signupForShift,
  cancelShiftSignup,
  listShiftSignups,
};
