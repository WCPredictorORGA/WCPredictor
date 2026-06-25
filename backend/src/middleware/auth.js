const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    // Priorité au cookie httpOnly, fallback sur Authorization header (clients API)
    const token = req.cookies?.token
        || (req.headers.authorization?.startsWith('Bearer ')
            ? req.headers.authorization.split(' ')[1]
            : null);

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch {
        return res.status(401).json({ error: 'Token invalide' });
    }
}

module.exports = authenticate;
