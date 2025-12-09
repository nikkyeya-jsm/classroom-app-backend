import { aj } from './lib/arcjet.js';
import { slidingWindow } from '@arcjet/node';

const middleware = async (req: any, res: any, next: any) => {
  // If NODE_ENV is TEST, skip security middleware
  if (process.env.NODE_ENV === 'test') {
    return next();
  }

  console.log('Arcjet middleware invoked');

  try {
    const role = req.user?.role || 'student';

    let limit;
    let message;

    switch (role) {
      case 'admin':
        limit = 20;
        message = 'Admin request limit exceeded (100 per minute). Slow down!';
        break;
      case 'teacher':
        limit = 10;
        message =
          'Teacher request limit exceeded (100 per minute). Please wait.';
        break;
      default:
        limit = 5;
        message =
          'Guest request limit exceeded (50 per minute). Please sign up for higher limits.';
        break;
    }

    const client = aj.withRule(
      slidingWindow({
        mode: 'LIVE',
        interval: '1m',
        max: limit,
      })
    );

    const decision = await client.protect(req);

    if (decision.isDenied() && decision.reason.isBot()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Automated requests are not allowed',
      });
    }

    if (decision.isDenied() && decision.reason.isShield()) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Request blocked by security policy',
      });
    }

    if (decision.isDenied() && decision.reason.isRateLimit()) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message,
      });
    }

    next();
  } catch (error) {
    console.error('Arcjet middleware error:', error);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'Something went wrong with the security middleware.',
    });
  }
};

export default middleware;
