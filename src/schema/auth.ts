import Joi from 'joi';

const signupSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().trim().required(),
});

const signinSchema = Joi.object({
  email: Joi.string().trim().email().required(),
  password: Joi.string().trim().required(),
});

const resetPasswordSchema = Joi.object({
  password: Joi.string().trim().required(),
});

export { signupSchema, signinSchema, resetPasswordSchema };
