const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const prisma = require("../prisma");

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

function makeToken(user) {
  return jwt.sign(
    {
      id: user.id,
      role: user.role,
      organizationId: user.organizationId,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

// POST /api/auth/register
// body: { name, email, phone?, password, role?, organizationId }
async function registerUser(req, res, next) {
  try {
    const { name, email, phone, password, role, organizationId } = req.body;

    if (!name || !email || !password || !organizationId) {
      return res.status(400).json({
        error: "name, email, password, and organizationId are required",
      });
    }

    const existing = await prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        organizationId: Number(organizationId),
        passwordHash,
        role: role || "volunteer", // default
      },
    });

    const token = makeToken(user);

    res.status(201).json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/login
// body: { email, password }
async function loginUser(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const token = makeToken(user);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId,
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  registerUser,
  loginUser,
};
