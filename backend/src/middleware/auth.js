const jwt = require('jsonwebtoken');

function authenticate(req, res, next) {
    const header = req.headers.authorization;

    if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token manquant' });
    }

    const token = header.split(' ')[1];

    try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload;          // on attache l'utilisateur à la requête
    next();                      // on laisse passer vers la vraie route
    } catch (err) {
    return res.status(401).json({ error: 'Token invalide' });
    }
}

module.exports = authenticate;