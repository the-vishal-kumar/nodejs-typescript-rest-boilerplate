import Joi from 'joi';

const email = Joi.string().trim().lowercase().email().max(254).required();
// Length is checked on the raw value: passwords are not trimmed, a leading or
// trailing space is part of the secret.
const newPassword = Joi.string().min(8).max(128).required();

const signupSchema = {
  body: Joi.object({
    email,
    password: newPassword,
    firstName: Joi.string().trim().min(1).max(100).required(),
    lastName: Joi.string().trim().max(100),
  }),
};

const signinSchema = {
  body: Joi.object({
    email,
    password: Joi.string().max(128).required(),
  }),
};

const resetPasswordSchema = {
  body: Joi.object({
    currentPassword: Joi.string().max(128).required(),
    password: newPassword,
  }),
};

export { signupSchema, signinSchema, resetPasswordSchema };
