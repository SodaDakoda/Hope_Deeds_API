const prisma = require("../prisma");

// GET /api/opportunities
async function listOpportunitiesForOrg(req, res, next) {
  try {
    const orgId = req.user.organizationId;

    const opportunities = await prisma.opportunity.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { shifts: true },
        },
      },
    });

    res.json(opportunities);
  } catch (err) {
    next(err);
  }
}

// GET /api/opportunities/:id
async function getOpportunityDetails(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const opportunity = await prisma.opportunity.findFirst({
      where: {
        id,
        organizationId: orgId,
      },
      include: {
        shifts: {
          orderBy: { startTime: "asc" },
          include: {
            _count: { select: { signups: true } },
          },
        },
      },
    });

    if (!opportunity) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    res.json(opportunity);
  } catch (err) {
    next(err);
  }
}

// POST /api/opportunities
// body: { title, description?, location? }
async function createOpportunity(req, res, next) {
  try {
    const orgId = req.user.organizationId;
    const { title, description, location } = req.body;

    if (!title) {
      return res.status(400).json({ error: "Title is required" });
    }

    const opportunity = await prisma.opportunity.create({
      data: {
        title,
        description,
        location,
        organizationId: orgId,
      },
    });

    res.status(201).json(opportunity);
  } catch (err) {
    next(err);
  }
}

// PUT /api/opportunities/:id
// body: { title?, description?, location? }
async function updateOpportunity(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;
    const { title, description, location } = req.body;

    const existing = await prisma.opportunity.findFirst({
      where: { id, organizationId: orgId },
    });

    if (!existing) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    const updated = await prisma.opportunity.update({
      where: { id },
      data: {
        title: title ?? existing.title,
        description: description ?? existing.description,
        location: location ?? existing.location,
      },
    });

    res.json(updated);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/opportunities/:id
// Also deletes shifts and signups for that opportunity
async function deleteOpportunity(req, res, next) {
  try {
    const id = Number(req.params.id);
    const orgId = req.user.organizationId;

    const existing = await prisma.opportunity.findFirst({
      where: { id, organizationId: orgId },
      include: { shifts: true },
    });

    if (!existing) {
      return res.status(404).json({ error: "Opportunity not found" });
    }

    await prisma.$transaction(async (tx) => {
      // delete signups connected to shifts of this opportunity
      await tx.shiftSignup.deleteMany({
        where: {
          shift: {
            opportunityId: id,
          },
        },
      });

      // delete shifts
      await tx.shift.deleteMany({
        where: { opportunityId: id },
      });

      // delete opportunity
      await tx.opportunity.delete({
        where: { id },
      });
    });

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listOpportunitiesForOrg,
  getOpportunityDetails,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
};
