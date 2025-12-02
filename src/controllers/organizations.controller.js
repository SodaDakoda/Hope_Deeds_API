const prisma = require("../prisma");

// POST /api/organizations
// body: { name, contactEmail?, contactPhone? }
async function createOrganization(req, res, next) {
  try {
    const { name, contactEmail, contactPhone } = req.body;

    if (!name) {
      return res.status(400).json({ error: "Organization name is required" });
    }

    const org = await prisma.organization.create({
      data: {
        name,
        contactEmail,
        contactPhone,
      },
    });

    res.status(201).json(org);
  } catch (err) {
    next(err);
  }
}

// GET /api/organizations/:id
async function getOrganizationById(req, res, next) {
  try {
    const id = Number(req.params.id);

    const org = await prisma.organization.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Optional: enforce org scoping: only allow same org
    if (
      req.user &&
      req.user.organizationId !== org.id &&
      req.user.role !== "admin"
    ) {
      return res
        .status(403)
        .json({ error: "Forbidden: different organization" });
    }

    res.json(org);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  createOrganization,
  getOrganizationById,
};
