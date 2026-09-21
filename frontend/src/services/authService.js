import api from './api'

export const login = (identifier, password) =>
  api.post('/auth/login', {
    username: identifier,
    email: identifier,
    password,
  })

export const registerUser = (data) =>
api.post('/auth/register', data).then(res => res.data)

export const refresh = () =>
  api.post('/auth/refresh')