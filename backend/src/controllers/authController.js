const { register, login } = require('../services/authService');

const registerUser = async (req, res) => {
  try {
    const { email, password, first_name, last_name } = req.body;
    const result = await register({
      email,
      password,
      firstName: first_name,
      lastName: last_name
    });

    return res.status(201).json(result);
  } catch (error) {
    return res.status(400).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;
    const result = await login(email, password);
    return res.json(result);
  } catch (error) {
    return res.status(401).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser };