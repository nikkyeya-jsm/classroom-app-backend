import { isSpoofedBot } from '@arcjet/inspect';
import { aj } from './lib/arcjet';

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
        message = 'Admin request limit exceeded (20 per minute). Slow down!';
        break;
      case 'teacher':
        limit = 10;
        message = 'Teacher request limit exceeded (10 per minute). Please wait.';
        break;
      default:
        limit = 5;
        message =
          'Guest request limit exceeded (5 per minute). Please sign up for higher limits.';
        break;
    }

    const decision = await aj.protect(req as any, { requested: 5 });

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


  const decision = await aj.protect(req as any, { requested: 2 }); // Deduct 2 tokens from the bucket

  if (decision.isDenied()) {
    if (decision.reason.isRateLimit()) {
      res.writeHead(429, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Too Many Requests' }));
    } else if (decision.reason.isBot()) {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'No bots allowed' }));
    } else {
      res.writeHead(403, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Forbidden' }));
    }
  } else if (decision.ip.isHosting()) {
    // Requests from hosting IPs are likely from bots, so they can usually be
    // blocked. However, consider your use case - if this is an API endpoint
    // then hosting IPs might be legitimate.
    // https://docs.arcjet.com/blueprints/vpn-proxy-detection
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
  } else if (decision.results.some(isSpoofedBot)) {
    // Paid Arcjet accounts include additional verification checks using IP data.
    // Verification isn't always possible, so we recommend checking the decision
    // separately.
    // https://docs.arcjet.com/bot-protection/reference#bot-verification
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Forbidden' }));
  } else {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ message: 'Backend server is running!' }));
  }
};


export default middleware;
