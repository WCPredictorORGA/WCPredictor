const { body, param, validationResult } = require('express-validator');

// Retourne 400 si des erreurs de validation existent
const handle = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            errors: errors.array().map(e => ({ field: e.path, message: e.msg })),
        });
    }
    next();
};

const rules = {
    register: [
        body('username')
            .trim()
            .isLength({ min: 3, max: 30 }).withMessage('Le pseudo doit contenir entre 3 et 30 caractères')
            .matches(/^[a-zA-Z0-9_\-éèêëàâùûüîïôçœæ]+$/).withMessage('Caractères non autorisés dans le pseudo'),

        body('email')
            .trim().normalizeEmail()
            .isEmail().withMessage('Adresse email invalide')
            .isLength({ max: 254 }).withMessage('Email trop long'),

        body('password')
            .isLength({ min: 8, max: 128 }).withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
            .matches(/[A-Z]/).withMessage('Au moins une majuscule requise')
            .matches(/[a-z]/).withMessage('Au moins une minuscule requise')
            .matches(/[0-9]/).withMessage('Au moins un chiffre requis'),
    ],

    login: [
        body('email')
            .trim().normalizeEmail()
            .isEmail().withMessage('Email invalide'),
        body('password')
            .notEmpty().withMessage('Mot de passe requis')
            .isLength({ max: 128 }).withMessage('Mot de passe trop long'),
    ],

    prediction: [
        body('match_id')
            .isInt({ min: 1 }).withMessage('match_id invalide').toInt(),
        body('pred_home')
            .isInt({ min: 0, max: 99 }).withMessage('Score domicile invalide (0–99)').toInt(),
        body('pred_away')
            .isInt({ min: 0, max: 99 }).withMessage('Score extérieur invalide (0–99)').toInt(),
    ],

    verifyReset: [
        body('username').trim().notEmpty().withMessage("Nom d'utilisateur requis"),
        body('email').trim().normalizeEmail().isEmail().withMessage('Adresse email invalide'),
    ],

    resetPassword: [
        body('username').trim().notEmpty().withMessage("Nom d'utilisateur requis"),
        body('email').trim().normalizeEmail().isEmail().withMessage('Adresse email invalide'),
        body('new_password')
            .isLength({ min: 8, max: 128 }).withMessage('Le mot de passe doit contenir entre 8 et 128 caractères')
            .matches(/[A-Z]/).withMessage('Au moins une majuscule requise')
            .matches(/[a-z]/).withMessage('Au moins une minuscule requise')
            .matches(/[0-9]/).withMessage('Au moins un chiffre requis'),
    ],

    matchResult: [
        param('id')
            .isInt({ min: 1 }).withMessage('ID de match invalide').toInt(),
        body('home_score')
            .isInt({ min: 0, max: 99 }).withMessage('Score domicile invalide (0–99)').toInt(),
        body('away_score')
            .isInt({ min: 0, max: 99 }).withMessage('Score extérieur invalide (0–99)').toInt(),
    ],
};

module.exports = { rules, handle };
