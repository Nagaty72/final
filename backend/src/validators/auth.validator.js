import Joi from 'joi';

/**
 * Register — matches schema: users( email, full_name, role_id )
 */
export const registerSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .pattern(/[^A-Za-z0-9]/, 'special character')
    .required()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.name': 'Password must include at least one {#name}',
      'any.required': 'Password is required',
    }),
  full_name: Joi.string().min(2).max(100).required().messages({
    'string.min': 'Full name must be at least 2 characters long',
    'any.required': 'Full name is required',
  }),
  role: Joi.string()
    .valid('super_admin', 'decision_maker', 'normal_user')
    .default('normal_user')
    .messages({
      'any.only': 'Role must be super_admin, decision_maker, or normal_user',
    }),
});

/**
 * Login
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

/**
 * Refresh token
 */
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string().required().messages({
    'any.required': 'Refresh token is required',
  }),
});

/**
 * Update Profile
 */
export const updateUserSchema = Joi.object({
  email: Joi.string().email().optional().messages({
    'string.email': 'Please provide a valid email address',
  }),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/[A-Z]/, 'uppercase')
    .pattern(/[0-9]/, 'number')
    .pattern(/[^A-Za-z0-9]/, 'special character')
    .optional()
    .messages({
      'string.min': 'Password must be at least 8 characters long',
      'string.pattern.name': 'Password must include at least one {#name}',
    }),
  full_name: Joi.string().min(2).max(100).optional().messages({
    'string.min': 'Full name must be at least 2 characters long',
  }),
});

/**
 * Generic validation middleware factory.
 */
export const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const messages = error.details.map((d) => d.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: messages,
      });
    }

    req.body = value;
    next();
  };
};
