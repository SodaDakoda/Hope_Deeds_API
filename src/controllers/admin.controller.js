const prisma = require("../prisma");

// Helper: start of current month
function getStartOfMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
}

// GET /api/admin/overview
// High-level stats for current org (volunteers, hours, shifts, etc.)
async function getOrgOverview(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const startOfMonth = getStartOfMonth();

    // Volunteers
    const [
      totalVolunteers,
      activeVolunteers,
      pendingBackground,
      pendingOrientation,
    ] = await Promise.all([
      prisma.user.count({
        where: { organizationId: orgId, role: "volunteer" },
      }),
      prisma.user.count({
        where: {
          organizationId: orgId,
          role: "volunteer",
          hasBackgroundCheck: true,
          hasAttendedOrientation: true,
        },
      }),
      prisma.user.count({
        where: {
          organizationId: orgId,
          role: "volunteer",
          hasBackgroundCheck: false,
        },
      }),
      prisma.user.count({
        where: {
          organizationId: orgId,
          role: "volunteer",
          hasBackgroundCheck: true,
          hasAttendedOrientation: false,
        },
      }),
    ]);

    // Opportunities & shifts
    const [totalOpportunities, totalShifts, upcomingShifts] = await Promise.all(
      [
        prisma.opportunity.count({
          where: { organizationId: orgId },
        }),
        prisma.shift.count({
          where: {
            opportunity: { organizationId: orgId },
          },
        }),
        prisma.shift.count({
          where: {
            opportunity: { organizationId: orgId },
            startTime: { gte: new Date() },
          },
        }),
      ]
    );

    // Volunteer hours
    const [hoursAllTime, hoursThisMonth] = await Promise.all([
      prisma.volunteerHour.aggregate({
        where: {
          user: { organizationId: orgId },
        },
        _sum: { amount: true },
      }),
      prisma.volunteerHour.aggregate({
        where: {
          user: { organizationId: orgId },
          createdAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      volunteers: {
        total: totalVolunteers,
        active: activeVolunteers,
        pendingBackground,
        pendingOrientation,
      },
      opportunities: {
        total: totalOpportunities,
        totalShifts,
        upcomingShifts,
      },
      hours: {
        allTime: hoursAllTime._sum.amount || 0,
        thisMonth: hoursThisMonth._sum.amount || 0,
      },
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/upcoming-shifts?limit=20
async function getUpcomingShifts(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const limit = req.query.limit ? Number(req.query.limit) : 20;

    const now = new Date();

    const shifts = await prisma.shift.findMany({
      where: {
        opportunity: { organizationId: orgId },
        startTime: { gte: now },
      },
      include: {
        opportunity: {
          select: {
            id: true,
            title: true,
            location: true,
          },
        },
        _count: {
          select: { signups: true },
        },
      },
      orderBy: { startTime: "asc" },
      take: limit,
    });

    const transformed = shifts.map((shift) => ({
      id: shift.id,
      startTime: shift.startTime,
      endTime: shift.endTime,
      capacity: shift.capacity,
      signedUp: shift._count.signups,
      remainingSpots: shift.capacity - shift._count.signups,
      opportunity: shift.opportunity,
    }));

    res.json(transformed);
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/recent-attendance?limit=50
async function getRecentAttendance(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const limit = req.query.limit ? Number(req.query.limit) : 50;

    const records = await prisma.attendance.findMany({
      where: {
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
          },
        },
        shift: {
          include: {
            opportunity: {
              select: {
                id: true,
                title: true,
                location: true,
              },
            },
          },
        },
      },
      orderBy: {
        checkIn: "desc",
      },
      take: limit,
    });

    res.json(
      records.map((rec) => ({
        id: rec.id,
        user: rec.user,
        shift: {
          id: rec.shift.id,
          startTime: rec.shift.startTime,
          endTime: rec.shift.endTime,
          opportunity: rec.shift.opportunity,
        },
        checkIn: rec.checkIn,
        checkOut: rec.checkOut,
      }))
    );
  } catch (err) {
    next(err);
  }
}

// GET /api/admin/pending-volunteers
async function getPendingVolunteers(req, res, next) {
  try {
    const orgId = req.user.organizationId;

    const volunteers = await prisma.user.findMany({
      where: {
        organizationId: orgId,
        role: "volunteer",
        OR: [{ hasBackgroundCheck: false }, { hasAttendedOrientation: false }],
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        hasBackgroundCheck: true,
        hasAttendedOrientation: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    res.json(volunteers);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getOrgOverview,
  getUpcomingShifts,
  getRecentAttendance,
  getPendingVolunteers,
};
