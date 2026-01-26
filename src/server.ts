import express, { Express } from 'express'
import oidc from './provider.js'

const app: Express = express()

app.use('/oauth2', oidc.callback())

export default app
