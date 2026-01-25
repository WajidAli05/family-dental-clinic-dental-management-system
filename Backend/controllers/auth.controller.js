import jwt from "jsonwebtoken";
import User from "../models/User.model.js";

export const login = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email, enabled: true }).select("+passwordHash");
  if (!user) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const ok = await user.verifyPassword(password);
  if (!ok) {
    return res.status(401).json({ success: false, message: "Invalid credentials" });
  }

  const token = jwt.sign(
    {
      id: user._id,
      publicId: user.publicId,
      role: user.role,
    },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return res.json({
    success: true,
    data: {
      token,
      user: {
        publicId: user.publicId,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    },
  });
};