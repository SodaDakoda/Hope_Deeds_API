const prisma = require("../prisma");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      organizationId: user.organizationId,
      role: user.role,
      name: user.name,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// REGISTER ORGANIZATION
exports.registerOrganization = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const hashed = await bcrypt.hash(password, 10);

    const org = await prisma.organization.create({
      data: {
        name,
        contactEmail: email,
      },
    });

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashed,
        name,
        role: "admin",
        organizationId: org.id,
      },
    });

    const token = makeToken(user);

    res.json({
      success: true,
      token,
      organization: org,
      user,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Registration failed" });
  }
};

// LOGIN ORGANIZATION
exports.loginOrganization = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await prisma.user.findUnique({
      where: { email },
      include: { organization: true },
    });

    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = makeToken(user);

    res.json({
      success: true,
      token,
      user,
      organization: user.organization,
    });
  } catch (err) {
    console.error(err);
    res.status(400).json({ error: "Login failed" });
  }
};

// GET CURRENT USER
exports.getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      include: { organization: true },
    });

    if (!user) return res.status(400).json({ error: "User not found" });

    res.json({
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      organization: user.organization,
    });
  } catch (err) {
    res.status(400).json({ error: "Failed to load session" });
  }
};
