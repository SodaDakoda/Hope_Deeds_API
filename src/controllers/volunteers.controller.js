const prisma = require("../prisma");

// GET /api/volunteers
async function listVolunteers(req, res, next) {
  try {
    const orgId = req.user.organizationId;

    const volunteers = await prisma.user.findMany({
      where: { organizationId: orgId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        hasBackgroundCheck: true,
        hasAttendedOrientation: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });

    res.json(volunteers);
  } catch (err) {
    next(err);
  }
}

// GET /api/volunteers/:id
async function getVolunteerDetails(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const volunteer = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
      include: {
        shiftSignups: {
          include: {
            shift: true,
          },
        },
      },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    res.json(volunteer);
  } catch (err) {
    next(err);
  }
}

// PUT /api/volunteers/:id
async function updateVolunteer(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const { name, email, phone, role } = req.body;

    const volunteer = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    // Only admins can promote someone to manager/admin
    if (role && req.user.role !== "admin") {
      return res.status(403).json({ error: "Only admin can change roles" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        name: name ?? volunteer.name,
        email: email ?? volunteer.email,
        phone: phone ?? volunteer.phone,
        role: role ?? volunteer.role,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/volunteers/:id/background-check
async function approveBackgroundCheck(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const volunteer = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { hasBackgroundCheck: true },
    });

    res.json({ success: true, updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/volunteers/:id/orientation
async function approveOrientation(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const volunteer = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { hasAttendedOrientation: true },
    });

    res.json({ success: true, updated });
  } catch (err) {
    next(err);
  }
}

// PATCH /api/volunteers/:id/deactivate
async function deactivateVolunteer(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const volunteer = await prisma.user.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { role: "inactive" },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

// GET /api/volunteers/:id/hours
async function listHours(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const orgId = req.user.organizationId;

    const volunteer = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const hours = await prisma.volunteerHour.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });

    res.json(hours);
  } catch (err) {
    next(err);
  }
}

// POST /api/volunteers/:id/hours/add
async function addHours(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const orgId = req.user.organizationId;
    const { amount, description } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ error: "Hours must be positive" });
    }

    const volunteer = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    const hourLog = await prisma.volunteerHour.create({
      data: {
        userId,
        amount: Number(amount),
        description: description ?? null,
      },
    });

    res.status(201).json(hourLog);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/volunteers/:id/hours/:hourId
async function deleteHour(req, res, next) {
  try {
    const userId = Number(req.params.id);
    const hourId = Number(req.params.hourId);
    const orgId = req.user.organizationId;

    // Ensure volunteer exists
    const volunteer = await prisma.user.findFirst({
      where: { id: userId, organizationId: orgId },
    });

    if (!volunteer) {
      return res.status(404).json({ error: "Volunteer not found" });
    }

    await prisma.volunteerHour.deleteMany({
      where: { id: hourId, userId },
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listVolunteers,
  getVolunteerDetails,
  updateVolunteer,
  approveBackgroundCheck,
  approveOrientation,
  deactivateVolunteer,
  listHours,
  addHours,
  deleteHour,
};
