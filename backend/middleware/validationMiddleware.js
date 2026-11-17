import mongoose from 'mongoose';
import { validationResult, body } from 'express-validator';

/**
 * Middleware to check validation results from express-validator
 */
export const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const errorMessages = errors.array().map(err => err.msg);
        return res.status(400).json({
            success: false,
            message: errorMessages[0],
            errors: errorMessages
        });
    }
    next();
};

/**
 * Validate MongoDB ObjectId for specified param names
 */
export const validateObjectId = (paramNames = ['id']) => {
    return (req, res, next) => {
        const paramsToCheck = Array.isArray(paramNames) ? paramNames : [paramNames];
        for (const param of paramsToCheck) {
            const id = req.params[param];
            if (id && !mongoose.Types.ObjectId.isValid(id)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid ID format for parameter '${param}'`
                });
            }
        }
        next();
    };
};

/**
 * Validation rules for registration
 */
export const registerValidationRules = [
    body('name')
        .trim()
        .notEmpty().withMessage('Name is required')
        .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required')
        .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('phone')
        .optional({ checkFalsy: true })
        .trim(),
    body('location')
        .optional({ checkFalsy: true })
        .trim(),
    validate
];

/**
 * Validation rules for login
 */
export const loginValidationRules = [
    body('email')
        .trim()
        .notEmpty().withMessage('Email is required')
        .isEmail().withMessage('Please provide a valid email address')
        .normalizeEmail(),
    body('password')
        .notEmpty().withMessage('Password is required'),
    validate
];

/**
 * Validation rules for NGO Registration
 */
export const ngoRegisterValidationRules = [
    body('ngoName')
        .trim()
        .notEmpty().withMessage('NGO Name is required')
        .isLength({ min: 2, max: 150 }).withMessage('NGO name must be between 2 and 150 characters'),
    body('registrationNumber')
        .trim()
        .notEmpty().withMessage('Official Registration Number is required'),
    body('address')
        .trim()
        .notEmpty().withMessage('Office address is required'),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required'),
    validate
];

/**
 * Validation rules for Requirement creation
 */
export const requirementValidationRules = [
    body('title')
        .trim()
        .notEmpty().withMessage('Requirement title is required')
        .isLength({ min: 3, max: 200 }).withMessage('Title must be between 3 and 200 characters'),
    body('category')
        .trim()
        .notEmpty().withMessage('Category is required')
        .custom((val) => {
            const allowed = ['Clothes', 'Books', 'Food', 'Toys', 'Medicine', 'School Supplies', 'Electronics', 'Other'];
            const list = typeof val === 'string'
                ? val.split(',').map(s => s.trim()).filter(Boolean)
                : (Array.isArray(val) ? val : []);
            if (list.length === 0) return false;
            return list.every(c => allowed.includes(c));
        })
        .withMessage('Invalid category specified'),
    body('quantity')
        .notEmpty().withMessage('Quantity is required')
        .isInt({ min: 1 }).withMessage('Quantity must be an integer of at least 1'),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required'),
    body('description')
        .trim()
        .notEmpty().withMessage('Description is required'),
    validate
];

/**
 * Validation rules for Donation creation
 */
export const donationValidationRules = [
    body('requirementId')
        .notEmpty().withMessage('Requirement ID is required')
        .custom((val) => mongoose.Types.ObjectId.isValid(val)).withMessage('Invalid Requirement ID'),
    body('quantity')
        .notEmpty().withMessage('Donation quantity is required')
        .isInt({ min: 1 }).withMessage('Donation quantity must be a positive integer'),
    body('pickupAddress')
        .trim()
        .notEmpty().withMessage('Pickup address is required'),
    body('city')
        .trim()
        .notEmpty().withMessage('City is required'),
    validate
];
