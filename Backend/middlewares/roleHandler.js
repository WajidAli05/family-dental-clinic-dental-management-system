import rateLimit from "express-rate-limit";

const rateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: {
    status: false,
    message: 'Too many requests from this IP. Please try again later.',
  },
  standardHeaders: true,  // Adds RateLimit-* headers
  legacyHeaders: false,   // Disable deprecated headers
});

export default rateLimiter;